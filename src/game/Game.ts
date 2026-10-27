import { CAMPAIGNS, FEATURES, MAX_ACTIVE_CAMPAIGNS, STAFF } from '../data/business';
import { LOCATIONS, OPEN_HOUR, SECONDS_PER_HOUR } from '../data/locations';
import { PRICE_LIMITS, RECIPE_LIMITS, SUPPLIES } from '../data/supplies';
import { CARTS } from '../data/carts';
import { UPGRADES } from '../data/upgrades';
import { World, type SimContext } from '../systems/CustomerSystem';
import { avgSatisfaction, dailyFixedCosts, netProfit, operatingExpenses, ingredientExpenses } from '../systems/EconomySystem';
import { buySupply, cupsPossible, limitingIngredient, lowStock, spoilOvernight, type ActionResult } from '../systems/InventorySystem';
import { getModifiers, type Modifiers } from '../systems/Modifiers';
import { announceNewUnlocks, checkGoals, checkRequirement, primeAnnouncements } from '../systems/ProgressionSystem';
import { getSettings, saveSlot } from '../systems/SaveSystem';
import { advanceWeather, SHIFT_HOUR } from '../systems/WeatherSystem';
import { WEATHER } from '../data/weather';
import { rollEvent } from '../systems/EventSystem';
import { BALANCE } from '../data/balance';
import { EventBus } from '../util/events';
import { rp } from '../util/format';
import { clamp } from '../util/rng';
import { ledgerFor } from './GameState';
import type { CampaignId, CartId, DayLedger, GameState, Ingredient, LocationId, Recipe, StaffRole, UpgradeId } from './types';

const AUTOSAVE_SECONDS = 8;

/**
 * Owns the authoritative GameState and the runtime World, advances the
 * simulation, and exposes every player action. The UI only reads state and
 * calls these methods.
 */
export class Game {
  state: GameState;
  world: World;
  mods: Modifiers;
  readonly events = new EventBus();
  private autosaveT = 0;
  private lowWarned = false;
  private emptyWarned = false;
  private uiNotify = 0;
  private satBand: 'low' | 'mid' | 'high' | null = null;
  /** Day whose afternoon weather change has already been announced. */
  private shiftAnnounced = -1;

  constructor(state: GameState) {
    this.state = state;
    this.mods = getModifiers(state);
    this.world = new World(state.locationId);
    this.world.warmUp(this.ctx);
    if (state.hintsSeen.length === 0) primeAnnouncements(state);
  }

  get ctx(): SimContext {
    return { state: this.state, mods: this.mods, events: this.events };
  }

  /** Recompute derived modifiers after anything that changes them. */
  private refresh(): void {
    this.mods = getModifiers(this.state);
    this.world.invalidateDemand();
    this.changed();
  }

  private changed(): void {
    this.uiNotify++;
    this.events.emit('stateChanged', undefined);
  }

  private toast(text: string, kind: 'info' | 'good' | 'bad' | 'warn' | 'unlock' = 'info'): void {
    this.events.emit('toast', { text, kind });
  }

  private result(r: ActionResult, goodKind: 'good' | 'unlock' = 'good'): ActionResult {
    this.toast(r.msg, r.ok ? goodKind : 'bad');
    if (r.ok) {
      this.afterProgress();
      this.save();
    }
    this.changed();
    return r;
  }

  // ------------------------------------------------------------------ loop

  update(dtReal: number): void {
    const s = this.state;
    const dt = s.paused ? 0 : Math.min(dtReal, 0.1) * s.speed;
    if (dt > 0) {
      this.world.update(this.ctx, dt);
      if (s.phase === 'open') {
        s.timeMin += (dt * 60) / SECONDS_PER_HOUR;
        this.stockWarnings();
        this.satisfactionFeedback();
        this.weatherShift();
        if (s.timeMin >= this.mods.closeHour * 60) {
          s.timeMin = this.mods.closeHour * 60;
          this.closeDay();
        }
      }
    }
    this.autosaveT += dtReal;
    if (this.autosaveT >= AUTOSAVE_SECONDS) {
      this.autosaveT = 0;
      this.save();
    }
  }

  private stockWarnings(): void {
    const low = lowStock(this.state);
    const possible = cupsPossible(this.state);
    if (possible === 0) {
      if (!this.emptyWarned) {
        this.emptyWarned = true;
        const id = limitingIngredient(this.state);
        this.toast(`${id ? SUPPLIES[id].name : 'Bahan'} habis! Beli di menu Bahan.`, 'bad');
      }
    } else this.emptyWarned = false;
    if (low.length && possible > 0) {
      if (!this.lowWarned) {
        this.lowWarned = true;
        this.toast(`${low.map((i) => SUPPLIES[i].name).join(', ')} menipis — sisa ${possible} gelas.`, 'warn');
      }
    } else if (!low.length) this.lowWarned = false;
  }

  /** Announces when the location's customer satisfaction moves between bands. */
  private satisfactionFeedback(): void {
    const sat = this.state.locations[this.state.locationId].satisfaction;
    const band = sat < 50 ? 'low' : sat >= 80 ? 'high' : 'mid';
    if (this.satBand && band !== this.satBand && this.state.today.customersServed > 0) {
      if (band === 'low') this.toast('Kepuasan turun di bawah 50%! Cek resep & harga.', 'warn');
      else if (band === 'high') this.toast('Pelanggan sangat puas! Kepuasan di atas 80%.', 'good');
      else if (this.satBand === 'low') this.toast('Kepuasan pelanggan membaik.', 'good');
    }
    this.satBand = band;
  }

  /** Announces the afternoon weather once, when it differs from the morning. */
  private weatherShift(): void {
    const s = this.state;
    if (this.shiftAnnounced === s.day || s.timeMin < SHIFT_HOUR * 60) return;
    this.shiftAnnounced = s.day;
    if (s.weatherLater === s.weather) return;
    this.events.emit('weatherShift', { from: s.weather, to: s.weatherLater });
    const a = WEATHER[s.weather];
    const b = WEATHER[s.weatherLater];
    const better = b.traffic * b.mood > a.traffic * a.mood;
    this.toast(`Cuaca berubah: ${b.name.toLowerCase()}. ${better ? 'Pembeli bakal makin ramai!' : 'Pembeli bakal berkurang.'}`, better ? 'good' : 'warn');
  }

  /** False for the title-screen demo game, which must never be written to a slot. */
  persistent = false;

  save(): boolean {
    if (!this.persistent) return false;
    return saveSlot(this.state);
  }

  /** Replaces the running game (new game, loaded slot, or the title-screen demo). */
  loadState(state: GameState, persistent: boolean): void {
    this.state = state;
    this.persistent = persistent;
    this.satBand = null;
    this.lowWarned = false;
    this.emptyWarned = false;
    this.autosaveT = 0;
    if (state.hintsSeen.length === 0) primeAnnouncements(state);
    this.mods = getModifiers(state);
    this.world = new World(state.locationId);
    this.world.warmUp(this.ctx);
    this.refresh();
    this.events.emit('locationChanged', { id: state.locationId });
    this.save();
  }

  // ------------------------------------------------------------------ time controls

  setSpeed(speed: number): void {
    this.state.speed = speed;
    this.state.paused = false;
    this.changed();
  }

  togglePause(): void {
    this.state.paused = !this.state.paused;
    this.changed();
  }

  // ------------------------------------------------------------------ day cycle

  fixedCosts() {
    return dailyFixedCosts(this.state, this.mods);
  }

  canOpen(): ActionResult {
    const s = this.state;
    if (s.phase !== 'prep') return { ok: false, msg: 'Lapak sudah buka.' };
    const costs = this.fixedCosts();
    if (s.cash < costs.total) return { ok: false, msg: `Butuh ${rp(costs.total)} untuk sewa, gaji & perawatan hari ini.` };
    return { ok: true, msg: '' };
  }

  openDay(): ActionResult {
    const s = this.state;
    const check = this.canOpen();
    if (!check.ok) {
      this.toast(check.msg, 'bad');
      return check;
    }
    const costs = this.fixedCosts();
    s.cash -= costs.total;
    s.today.rent += costs.rent;
    s.today.wages += costs.wages;
    s.today.maintenance += costs.maintenance;
    s.today.locationId = s.locationId;
    s.today.weather = s.weather;
    s.phase = 'open';
    s.paused = false;
    s.speed = getSettings().speed;
    s.timeMin = OPEN_HOUR * 60;
    const prog = s.locations[s.locationId];
    prog.daysOpen++;
    // Remember the settings the day opened with (for analytics).
    s.today.price = s.price;
    s.today.recipe = { ...s.recipe };
    s.today.eventId = s.event.id;
    s.today.popularityStart = prog.popularity;
    for (const c of s.campaigns) {
      if (c.locationId === s.locationId && c.startDay < s.day && c.daysLeft > 0) {
        prog.popularity = clamp(prog.popularity + CAMPAIGNS[c.id].popularityPerDay, 0, 100);
      }
    }
    this.lowWarned = false;
    this.emptyWarned = false;
    this.toast(`Lapak dibuka di ${LOCATIONS[s.locationId].name}! ${costs.total ? `Biaya harian ${rp(costs.total)} dibayar.` : ''}`, 'good');
    this.events.emit('dayStarted', { day: s.day });
    this.refresh();
    this.save();
    return { ok: true, msg: '' };
  }

  /** Takes the day off: no rent or wages, but stock still spoils and popularity fades. */
  skipDay(): void {
    const s = this.state;
    if (s.phase !== 'prep') return;
    s.phase = 'open';
    s.timeMin = this.mods.closeHour * 60;
    this.closeDay();
    this.toast('Hari ini libur. Tidak ada sewa atau gaji yang dibayar.', 'info');
  }

  closeDay(): void {
    const s = this.state;
    if (s.phase !== 'open') return;
    this.world.dismissQueue(this.ctx, 'queue');
    const l = s.today;
    // Overnight ice melt / lemon spoilage is a real ingredient loss.
    const spoil = spoilOvernight(s, this.mods);
    l.wasteCost += spoil.cost;
    l.meltedIce = spoil.ice;
    // Campaigns run for calendar days.
    for (const c of s.campaigns) c.daysLeft--;
    s.campaigns = s.campaigns.filter((c) => c.daysLeft > 0);
    l.popularityEnd = s.locations[l.locationId].popularity;
    // Popularity fades without fresh customers or promotion.
    for (const id of s.unlockedLocations) {
      const p = s.locations[id];
      // Popularity drifts back towards the neighbourhood's baseline; regulars slowly drift away.
      const baseline = LOCATIONS[id].startPopularity;
      p.popularity = clamp(p.popularity + (baseline - p.popularity) * this.mods.popDecay, 0, 100);
      p.regulars = Math.max(0, p.regulars * (1 - BALANCE.regulars.dailyDecay));
    }
    const sat = avgSatisfaction(l);
    const profit = netProfit(l);
    s.totals.daysPlayed++;
    s.totals.profit += profit;
    s.totals.ingredientCost += ingredientExpenses(l);
    s.totals.operatingCost += operatingExpenses(l);
    s.totals.bestDayProfit = Math.max(s.totals.bestDayProfit, profit);
    if (l.customersServed >= 10) s.totals.bestDaySatisfaction = Math.max(s.totals.bestDaySatisfaction, sat);
    checkGoals(s);
    for (const msg of announceNewUnlocks(s)) l.unlocks.push(msg);
    l.cashEnd = s.cash;
    s.history.push(JSON.parse(JSON.stringify(l)) as DayLedger);
    if (s.history.length > 30) s.history.shift();
    s.phase = 'report';
    this.events.emit('dayEnded', { day: s.day });
    this.refresh();
    this.save();
  }

  /** The finished day's ledger while the report is showing. */
  get report(): DayLedger | null {
    return this.state.phase === 'report' ? (this.state.history[this.state.history.length - 1] ?? null) : null;
  }

  nextDay(): void {
    const s = this.state;
    if (s.phase !== 'report') return;
    s.day++;
    s.phase = 'prep';
    s.timeMin = OPEN_HOUR * 60;
    advanceWeather(s);
    s.event = rollEvent(s);
    s.today = ledgerFor(s);
    this.refresh();
    this.save();
    const ev = s.event.id !== 'biasa' ? s.event.headline : '';
    if (ev) this.toast(`Berita hari ini: ${ev}`, 'info');
  }

  /** Detects a dead end: no stock for a single cup and not enough cash to buy it. */
  isBankrupt(): boolean {
    const s = this.state;
    if (s.phase !== 'prep' || cupsPossible(s) > 0) return false;
    const use = { tea: s.recipe.tea, sugar: s.recipe.sugar, ice: s.recipe.ice, lemon: s.recipe.lemon, cups: 1 };
    let need = 0;
    for (const i of Object.keys(use) as Ingredient[]) if (s.inventory[i].qty < use[i]) need += SUPPLIES[i].packs[0].price;
    return s.cash < need;
  }

  // ------------------------------------------------------------------ supplies & recipe

  buySupply(id: Ingredient, pack: number): ActionResult {
    const r = buySupply(this.state, id, pack, this.mods);
    if (r.ok) this.emptyWarned = false;
    return this.result(r);
  }

  /** Buys several packs in one go (used by the stock recommendation, after the player confirms). */
  buyPacks(items: { id: Ingredient; pack: number; count: number }[]): ActionResult {
    let spent = 0;
    let bought = 0;
    let failed = '';
    for (const it of items)
      for (let k = 0; k < it.count && !failed; k++) {
        const before = this.state.cash;
        const r = buySupply(this.state, it.id, it.pack, this.mods);
        if (!r.ok) failed = r.msg;
        else {
          spent += before - this.state.cash;
          bought++;
        }
      }
    if (bought) this.emptyWarned = false;
    return this.result({
      ok: bought > 0,
      msg: bought ? `Membeli ${bought} paket bahan seharga ${rp(spent)}.${failed ? ` Sebagian gagal: ${failed}` : ''}` : failed || 'Tidak ada yang perlu dibeli.',
    });
  }

  setRecipe(recipe: Recipe): void {
    const r = { ...recipe };
    for (const k of ['tea', 'sugar', 'ice', 'lemon'] as const) r[k] = clamp(Math.round(r[k]), RECIPE_LIMITS[k].min, RECIPE_LIMITS[k].max);
    if (!this.state.features.includes('lemon')) r.lemon = 0;
    this.state.recipe = r;
    this.world.invalidateDemand();
    this.changed();
  }

  setPrice(price: number): void {
    const p = clamp(Math.round(price / PRICE_LIMITS.step) * PRICE_LIMITS.step, PRICE_LIMITS.min, PRICE_LIMITS.max);
    this.state.price = p;
    this.world.invalidateDemand();
    this.changed();
  }

  unlockFeature(id: 'lemon'): ActionResult {
    const s = this.state;
    const f = FEATURES[id];
    if (s.features.includes(id)) return this.result({ ok: false, msg: 'Resep sudah dimiliki.' });
    if (!checkRequirement(s, f.req).ok) return this.result({ ok: false, msg: 'Syarat belum terpenuhi.' });
    if (s.cash < f.price) return this.result({ ok: false, msg: 'Uang tidak cukup.' });
    s.cash -= f.price;
    s.today.capex += f.price;
    s.features.push(id);
    return this.result({ ok: true, msg: `${f.name} terbuka! Beli Irisan Lemon di menu Bahan.` }, 'unlock');
  }

  // ------------------------------------------------------------------ locations

  unlockLocation(id: LocationId): ActionResult {
    const s = this.state;
    const def = LOCATIONS[id];
    if (s.unlockedLocations.includes(id)) return this.result({ ok: false, msg: 'Lokasi sudah terbuka.' });
    if (!checkRequirement(s, def.req).ok) return this.result({ ok: false, msg: 'Syarat lokasi belum terpenuhi.' });
    if (s.cash < def.unlockCost) return this.result({ ok: false, msg: 'Uang tidak cukup untuk izin lokasi.' });
    s.cash -= def.unlockCost;
    s.today.capex += def.unlockCost;
    s.unlockedLocations.push(id);
    s.today.unlocks.push(`Izin lokasi: ${def.name}`);
    return this.result({ ok: true, msg: `Izin berjualan di ${def.name} didapat!` }, 'unlock');
  }

  moveTo(id: LocationId): ActionResult {
    const s = this.state;
    if (!s.unlockedLocations.includes(id)) return this.result({ ok: false, msg: 'Lokasi belum terbuka.' });
    if (s.locationId === id) return { ok: true, msg: '' };
    if (s.phase !== 'prep') return this.result({ ok: false, msg: 'Pindah lokasi hanya saat persiapan (sebelum lapak dibuka).' });
    s.locationId = id;
    s.today.locationId = id;
    s.today.popularityStart = s.locations[id].popularity;
    this.satBand = null;
    this.world = new World(id);
    this.world.warmUp(this.ctx);
    this.events.emit('locationChanged', { id });
    this.refresh();
    this.save();
    this.toast(`Gerobak dipindah ke ${LOCATIONS[id].name}.`, 'good');
    return { ok: true, msg: '' };
  }

  // ------------------------------------------------------------------ carts & equipment

  buyUpgrade(id: UpgradeId): ActionResult {
    const s = this.state;
    const def = UPGRADES[id];
    if (s.upgrades.includes(id)) return this.result({ ok: false, msg: 'Sudah dimiliki.' });
    if (!checkRequirement(s, def.req).ok) return this.result({ ok: false, msg: 'Syarat belum terpenuhi.' });
    if (s.cash < def.price) return this.result({ ok: false, msg: 'Uang tidak cukup.' });
    s.cash -= def.price;
    s.today.capex += def.price;
    s.upgrades.push(id);
    this.refresh();
    this.events.emit('cartChanged', undefined);
    return this.result({ ok: true, msg: `${def.name} terpasang!` });
  }

  buyCart(id: CartId): ActionResult {
    const s = this.state;
    const def = CARTS[id];
    if (s.ownedCarts.includes(id)) return this.result({ ok: false, msg: 'Sudah dimiliki.' });
    if (!checkRequirement(s, def.req).ok) return this.result({ ok: false, msg: 'Syarat belum terpenuhi.' });
    if (s.cash < def.price) return this.result({ ok: false, msg: 'Uang tidak cukup.' });
    s.cash -= def.price;
    s.today.capex += def.price;
    s.ownedCarts.push(id);
    if (s.phase === 'prep') this.useCart(id, true);
    return this.result({ ok: true, msg: s.phase === 'prep' ? `${def.name} dibeli dan langsung dipakai!` : `${def.name} dibeli! Pakai saat persiapan hari berikutnya.` });
  }

  useCart(id: CartId, silent = false): ActionResult {
    const s = this.state;
    if (!s.ownedCarts.includes(id)) return this.result({ ok: false, msg: 'Belum dimiliki.' });
    if (s.phase !== 'prep') return this.result({ ok: false, msg: 'Ganti gerobak hanya saat persiapan.' });
    // Capacity of the target cart including storage equipment.
    const cap = getModifiers({ ...s, activeCart: id }).capacity;
    const over = (Object.keys(cap) as Ingredient[]).filter((i) => s.inventory[i].qty > cap[i]);
    if (over.length) return this.result({ ok: false, msg: `Stok ${over.map((i) => SUPPLIES[i].name).join(', ')} tidak muat di ${CARTS[id].name}.` });
    s.activeCart = id;
    this.refresh();
    this.events.emit('cartChanged', undefined);
    if (!silent) this.toast(`Sekarang memakai ${CARTS[id].name}.`, 'good');
    this.save();
    return { ok: true, msg: '' };
  }

  // ------------------------------------------------------------------ staff

  hire(role: StaffRole): ActionResult {
    const s = this.state;
    const def = STAFF[role];
    if (s.staff.includes(role)) return this.result({ ok: false, msg: `${def.name} sudah bekerja.` });
    if (!checkRequirement(s, def.req).ok) return this.result({ ok: false, msg: 'Syarat belum terpenuhi.' });
    if (s.cash < def.hireCost) return this.result({ ok: false, msg: 'Uang tidak cukup untuk biaya rekrut.' });
    s.cash -= def.hireCost;
    s.today.hiring += def.hireCost;
    s.staff.push(role);
    this.refresh();
    return this.result({ ok: true, msg: `${def.name} direkrut! Gaji ${rp(def.wage)}/hari dibayar saat lapak buka.` });
  }

  fire(role: StaffRole): ActionResult {
    const s = this.state;
    if (!s.staff.includes(role)) return this.result({ ok: false, msg: 'Tidak ada staf itu.' });
    s.staff = s.staff.filter((r) => r !== role);
    this.refresh();
    return this.result({ ok: true, msg: `${STAFF[role].name} diberhentikan.` });
  }

  // ------------------------------------------------------------------ marketing

  launchCampaign(id: CampaignId): ActionResult {
    const s = this.state;
    const def = CAMPAIGNS[id];
    if (s.phase === 'report') return this.result({ ok: false, msg: 'Mulai hari berikutnya dulu.' });
    if (!checkRequirement(s, def.req).ok) return this.result({ ok: false, msg: 'Syarat belum terpenuhi.' });
    const here = s.campaigns.filter((c) => c.locationId === s.locationId);
    if (here.length >= MAX_ACTIVE_CAMPAIGNS) return this.result({ ok: false, msg: `Maksimal ${MAX_ACTIVE_CAMPAIGNS} promosi aktif per lokasi.` });
    if (s.cash < def.cost) return this.result({ ok: false, msg: 'Uang tidak cukup.' });
    s.cash -= def.cost;
    s.today.advertising += def.cost;
    s.campaigns.push({ id, locationId: s.locationId, daysLeft: def.days, startDay: s.day });
    const prog = s.locations[s.locationId];
    prog.popularity = clamp(prog.popularity + def.popularityPerDay, 0, 100);
    this.refresh();
    return this.result({ ok: true, msg: `${def.name} berjalan ${def.days} hari di ${LOCATIONS[s.locationId].name}.` });
  }

  // ------------------------------------------------------------------ progression

  private afterProgress(): void {
    const s = this.state;
    const goals = checkGoals(s);
    for (const g of goals) this.toast(`🏆 Target tercapai: ${g.name}${g.reward ? ` (+${rp(g.reward)})` : ''}`, 'unlock');
    if (s.phase !== 'report') for (const msg of announceNewUnlocks(s)) this.toast(msg, 'unlock');
  }

  /** Called periodically by the UI so sales-driven unlocks are announced promptly. */
  checkProgress(): void {
    this.afterProgress();
  }


}
