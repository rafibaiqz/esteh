/**
 * Unit tests for the core economic formulas. Uses Node's built-in test
 * runner (no extra dependencies). Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BALANCE } from '../src/data/balance';
import { CUSTOMER_TYPES } from '../src/data/customers';
import { Game } from '../src/game/Game';
import { createNewGame, emptyLedger, ledgerFor, sanitizeState } from '../src/game/GameState';
import type { GameState } from '../src/game/types';
import {
  adjustPopularity,
  cashFlow,
  demand,
  fairPrice,
  grossProfit,
  netProfit,
  priceFactor,
  satisfactionFor,
  tipAmount,
  tipChance,
} from '../src/systems/EconomySystem';
import { eventBudgetFor, eventEffect } from '../src/systems/EventSystem';
import { demandLevel, estimateDay, stockPlan } from '../src/systems/ForecastSystem';
import { buySupply, packPrice } from '../src/systems/InventorySystem';
import { getModifiers } from '../src/systems/Modifiers';
import { tasteScore } from '../src/systems/RecipeSystem';
import { advanceWeather } from '../src/systems/WeatherSystem';

const NO_BONUS = { tasteBonus: 0, coldBonus: 0 };
const NO_SHIFT = { ice: 0, sugar: 0 };

function fresh(seed = 42): GameState {
  const s = createNewGame(seed);
  s.weather = 'hangat';
  s.weatherLater = 'hangat';
  s.temperature = 31;
  s.event = { id: 'biasa', locationId: null, headline: '' };
  return s;
}

test('taste: a perfect match scores 100 and each unit away costs the configured weight', () => {
  const prefs = { tea: 2, sugar: 2, ice: 3, likesLemon: false };
  const recipe = { tea: 2, sugar: 2, ice: 3, lemon: 0 };
  assert.equal(tasteScore(recipe, prefs, NO_BONUS, NO_SHIFT).score, 100);
  assert.equal(tasteScore({ ...recipe, tea: 3 }, prefs, NO_BONUS, NO_SHIFT).score, 100 - BALANCE.taste.weights.tea);
  assert.equal(tasteScore({ ...recipe, sugar: 0 }, prefs, NO_BONUS, NO_SHIFT).complaint, 'sugarLow');
  // Weather shifts the customer's preferred ice, never the recipe.
  assert.equal(tasteScore(recipe, prefs, NO_BONUS, { ice: 1, sugar: 0 }).complaint, null);
  assert.ok(tasteScore(recipe, prefs, NO_BONUS, { ice: 1, sugar: 0 }).score < 100);
});

test('satisfaction: good taste does not survive an unfair price or a long queue', () => {
  const type = CUSTOMER_TYPES.warga;
  const base = { taste: 90, price: 3000, fair: 3000, budget: 4500, waited: 0, patience: 30, type, service: 0 };
  const ok = satisfactionFor(base).value;
  const pricey = satisfactionFor({ ...base, price: 4500 }).value;
  const slow = satisfactionFor({ ...base, waited: 30 }).value;
  assert.ok(ok >= 80, `fair price should satisfy (${ok})`);
  assert.ok(pricey < ok - 15, `1.5× fair price should hurt (${pricey})`);
  assert.ok(slow < ok - 15, `waiting the full patience should hurt (${slow})`);
  const extreme = satisfactionFor({ ...base, taste: 0, price: 50_000, waited: 300 }).value;
  assert.equal(extreme, 0);
  assert.ok(satisfactionFor({ ...base, taste: 100, price: 500, service: 50 }).value <= 100);
  // Price-sensitive students react more strongly than executives.
  const student = satisfactionFor({ ...base, price: 4500, type: CUSTOMER_TYPES.pelajar }).value;
  const exec = satisfactionFor({ ...base, price: 4500, type: CUSTOMER_TYPES.eksekutif }).value;
  assert.ok(student < exec);
});

test('tips: none for average or low satisfaction, rising for delighted customers, bounded amounts', () => {
  assert.equal(tipChance(50, 1, 1), 0);
  assert.equal(tipChance(BALANCE.tips.minSatisfaction - 1, 1, 1), 0);
  assert.ok(tipChance(85, 1, 1) < tipChance(95, 1, 1));
  assert.ok(tipChance(100, 1, 1) <= BALANCE.tips.maxChance + 1e-9);
  assert.ok(tipChance(100, 2, 1.35) <= 0.9);
  for (const price of [500, 3000, 5000, 9000, 20000]) {
    for (const r of [0, 0.5, 1]) {
      const t = tipAmount(price, true, r);
      assert.ok(t >= BALANCE.tips.minAmount && t % 100 === 0, `tip ${t} for ${price}`);
      assert.ok(t <= Math.max(BALANCE.tips.minAmount, price * BALANCE.tips.capShare), `tip ${t} exceeds cap for ${price}`);
      assert.ok(t <= BALANCE.tips.capAmount);
    }
  }
});

test('accounting: tips are separate from drink revenue; gross and net profit are consistent', () => {
  const l = emptyLedger(1, 'asri', 'hangat', 100_000);
  l.revenue = 5000;
  l.tips = 500;
  l.cupsSold = 1;
  l.ingredientCost = 1600;
  l.rent = 1000;
  l.wages = 2000;
  l.advertising = 300;
  l.maintenance = 100;
  l.hiring = 0;
  l.supplyPurchases = 4000;
  assert.equal(grossProfit(l), 5000 - 1600);
  assert.equal(netProfit(l), 5000 + 500 - 1600 - 1000 - 2000 - 300 - 100);
  assert.equal(cashFlow(l), 5000 + 500 - 4000 - 1000 - 2000 - 300 - 100);
});

test('pricing: higher price lowers demand; fair price depends on location', () => {
  assert.ok(priceFactor(2000, 3000, 1.3) > priceFactor(3000, 3000, 1.3));
  assert.ok(priceFactor(3000, 3000, 1.3) > priceFactor(4000, 3000, 1.3));
  const s = fresh();
  const mods = getModifiers(s);
  const asri = fairPrice(s, mods, 'asri');
  const sekolah = fairPrice(s, mods, 'sekolah');
  const premium = fairPrice(s, mods, 'premium');
  assert.ok(premium > asri && asri !== sekolah, `fair prices ${asri} / ${sekolah} / ${premium}`);
  s.price = 3000;
  const cheap = demand(s, mods, { price: 2000, timeMin: 720 }).interest;
  const dear = demand(s, mods, { price: 5000, timeMin: 720 }).interest;
  assert.ok(cheap > dear);
});

test('weather: hot days bring far more demand than storms', () => {
  const s = fresh();
  const mods = getModifiers(s);
  const order = ['terik', 'hangat', 'mendung', 'hujan', 'badai'] as const;
  const cups = order.map((w) => estimateDay({ ...s, weather: w, weatherLater: w, temperature: 30 }, mods, { weatherId: w, laterWeatherId: w }).demandCups);
  for (let i = 1; i < cups.length; i++) assert.ok(cups[i - 1] > cups[i], `${order[i - 1]} (${cups[i - 1]}) should beat ${order[i]} (${cups[i]})`);
  // Temperature matters within a weather type too.
  const hot = demand({ ...s, temperature: 36 }, mods, { weatherId: 'hangat', timeMin: 780 }).interest;
  const mild = demand({ ...s, temperature: 29 }, mods, { weatherId: 'hangat', timeMin: 780 }).interest;
  assert.ok(hot > mild);
});

test('demand indicator: reflects weather and news even when interest is saturated', () => {
  const s = fresh();
  s.upgrades = ['payung', 'papanNama', 'dispenser', 'qris'];
  s.staff = ['penjual'];
  s.locations.asri.popularity = 90;
  const mods = getModifiers(s);
  const hot = { ...s, weather: 'terik' as const, weatherLater: 'terik' as const, temperature: 37, event: { id: 'gelombangPanas', locationId: null, headline: '' } };
  const storm = { ...s, weather: 'badai' as const, weatherLater: 'badai' as const, temperature: 23 };
  assert.ok(demandLevel(hot, mods, estimateDay(hot, mods)).level >= 4);
  assert.ok(demandLevel(storm, mods, estimateDay(storm, mods)).level <= 2);
});

test('weather: advancing a day never changes the recipe and forecasts usually come true', () => {
  const s = fresh(7);
  s.recipe = { tea: 3, sugar: 1, ice: 5, lemon: 0 };
  let hits = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    const predicted = s.forecast.weather;
    s.day++;
    advanceWeather(s);
    if (s.weather === predicted) hits++;
  }
  assert.deepEqual(s.recipe, { tea: 3, sugar: 1, ice: 5, lemon: 0 });
  assert.ok(hits / N > 0.6 && hits / N < 0.9, `forecast accuracy ${hits / N}`);
});

test('events: effects apply only to their location / customer segment', () => {
  const s = fresh();
  s.event = { id: 'festivalKuliner', locationId: 'kota', headline: '' };
  assert.equal(eventEffect(s, 'kota').traffic, 1.5);
  assert.equal(eventEffect(s, 'asri').traffic, 1);
  s.event = { id: 'gajian', locationId: null, headline: '' };
  const e = eventEffect(s, 'kota');
  assert.equal(eventBudgetFor(e, 'pekerja'), 1.2);
  assert.equal(eventBudgetFor(e, 'pelajar'), 1);
  s.event = { id: 'gulaNaik', locationId: null, headline: '' };
  const normal = fresh();
  assert.ok(packPrice(s, 'sugar', 0) > packPrice(normal, 'sugar', 0));
  assert.equal(packPrice(s, 'tea', 0), packPrice(normal, 'tea', 0));
});

test('stock plan: recommendations follow the actual recipe and forecast', () => {
  const s = fresh();
  s.inventory.ice.qty = 0;
  const mods = getModifiers(s);
  s.recipe = { tea: 2, sugar: 2, ice: 2, lemon: 0 };
  const est = estimateDay(s, mods);
  const p1 = stockPlan(s, mods, est).rows.find((r) => r.id === 'ice')!;
  s.recipe = { tea: 2, sugar: 2, ice: 4, lemon: 0 };
  const p2 = stockPlan(s, mods, estimateDay(s, mods)).rows.find((r) => r.id === 'ice')!;
  assert.ok(p2.expectedUse > p1.expectedUse * 1.6, `${p1.expectedUse} → ${p2.expectedUse}`);
  assert.ok(p1.buyQty >= Math.min(p1.target, mods.capacity.ice));
  assert.ok(p2.buyQty <= mods.capacity.ice);
});

test('inventory: buying deducts cash and respects capacity', () => {
  const s = fresh();
  const mods = getModifiers(s);
  const cash = s.cash;
  const r = buySupply(s, 'tea', 0, mods);
  assert.ok(r.ok);
  assert.equal(s.cash, cash - packPrice(s, 'tea', 0));
  s.inventory.tea.qty = mods.capacity.tea;
  assert.equal(buySupply(s, 'tea', 0, mods).ok, false);
});

test('popularity: daily caps keep changes gradual', () => {
  const s = fresh();
  const start = s.locations.asri.popularity;
  for (let i = 0; i < 100; i++) adjustPopularity(s, 'asri', 1);
  assert.equal(s.locations.asri.popularity, start + BALANCE.popularity.maxGainPerDay);
  for (let i = 0; i < 100; i++) adjustPopularity(s, 'asri', -1);
  assert.ok(s.locations.asri.popularity >= start + BALANCE.popularity.maxGainPerDay - BALANCE.popularity.maxLossPerDay - 1e-9);
});

test('save migration: a v2 save loads with new fields and mapped weather', () => {
  const v2 = {
    version: 2,
    cash: 123456,
    day: 9,
    phase: 'prep',
    weather: 'cerah',
    weatherLater: 'panas',
    news: 'Berita lama',
    locationId: 'taman',
    unlockedLocations: ['asri', 'taman'],
    locations: { asri: { popularity: 40, satisfaction: 70, cupsSold: 100, revenue: 300000, daysOpen: 5 } },
    history: [{ day: 8, locationId: 'asri', weather: 'cerah', revenue: 1000, cupsSold: 1 }],
    today: { day: 9, revenue: 0 },
    totals: { cupsSold: 100 },
  };
  const s = sanitizeState(JSON.parse(JSON.stringify(v2)))!;
  assert.ok(s);
  assert.equal(s.version, 4);
  assert.ok(s.saveId.length > 4);
  assert.equal(s.ownerName, 'Juragan');
  assert.equal(s.businessName, 'ESTEH');
  assert.equal(s.weather, 'hangat');
  assert.equal(s.locationId, 'taman');
  assert.equal(s.locations.asri.popularity, 40);
  assert.equal(s.locations.asri.regulars, 0);
  assert.ok(s.locations.premium);
  assert.equal(s.event.headline, 'Berita lama');
  assert.ok(s.forecast && s.forecast.tempHi >= s.forecast.tempLo);
  assert.equal(s.today.tips, 0);
  assert.equal(s.history[0].weather, 'hangat');
  assert.equal(s.history[0].tips, 0);
  assert.equal(s.history[0].price, 1000);
  assert.equal(s.totals.tips, 0);
  assert.equal(sanitizeState({ nonsense: true }), null);
});

test('simulation: a full day keeps cash, revenue and tips consistent', () => {
  const s = createNewGame(99);
  s.today = ledgerFor(s);
  const game = new Game(s);
  game.events.on('toast', () => {});
  const start = game.state.cash;
  game.openDay();
  let guard = 0;
  while (game.state.phase === 'open' && guard++ < 60 * 400) game.update(1 / 60);
  const l = game.report!;
  assert.ok(l, 'day should end');
  assert.equal(l.revenue, l.cupsSold * l.price);
  assert.equal(l.cashStart, start);
  assert.ok(Math.abs(l.cashStart + cashFlow(l) - (l.cashEnd ?? 0)) < 1);
  for (const k of Object.keys(game.state.inventory) as (keyof GameState['inventory'])[]) assert.ok(game.state.inventory[k].qty >= 0);
});

test('carts & equipment: every cart and upgrade changes real parameters', async () => {
  const { CARTS, CART_ORDER } = await import('../src/data/carts');
  const { UPGRADE_ORDER } = await import('../src/data/upgrades');
  const base = fresh();
  const m0 = getModifiers(base);
  // Each cart differs from the starter in at least two numbers and none is best at everything.
  for (const id of CART_ORDER.filter((c) => c !== 'gerobak')) {
    const m = getModifiers({ ...base, activeCart: id });
    const diffs = [m.serviceTime !== m0.serviceTime, m.queueCapacity !== m0.queueCapacity, m.attraction !== m0.attraction, m.capacity.ice !== m0.capacity.ice, m.maintenance !== m0.maintenance].filter(Boolean).length;
    assert.ok(diffs >= 2, `${id} should change several parameters`);
  }
  const all = CART_ORDER.map((id) => CARTS[id]);
  const fastest = all.reduce((a, b) => (b.serviceMult < a.serviceMult ? b : a));
  const cheapestUpkeep = all.reduce((a, b) => (b.maintenance < a.maintenance ? b : a));
  assert.notEqual(fastest.id, cheapestUpkeep.id);
  // Each upgrade alone changes at least one modifier.
  const sig = (m: ReturnType<typeof getModifiers>) => JSON.stringify(m);
  for (const u of UPGRADE_ORDER) {
    // Upkeep reduction is tested on a cart that actually has upkeep.
    const cart = u === 'rodaKaret' ? 'gerobakPlus' : 'gerobak';
    const ref = getModifiers({ ...base, activeCart: cart });
    const m = getModifiers({ ...base, activeCart: cart, upgrades: [u] });
    assert.notEqual(sig(m), sig(ref), `${u} has no effect`);
  }
  // Umbrella/tarp do nothing on roofed carts (kiosk), but the roof itself shelters.
  const kios = getModifiers({ ...base, activeCart: 'kios' });
  const kiosUmbrella = getModifiers({ ...base, activeCart: 'kios', upgrades: ['payung', 'terpal'] });
  assert.equal(kiosUmbrella.rainResist, kios.rainResist);
  assert.ok(kios.rainResist > m0.rainResist);
});

test('identity: new games get unique save ids and keep the names', () => {
  const a = createNewGame(1, { ownerName: '  Budi ', businessName: 'Teh Budi', sellerLook: 'sari' });
  const b = createNewGame(1, { ownerName: 'Budi', businessName: 'Teh Budi', sellerLook: 'sari' });
  assert.notEqual(a.saveId, b.saveId);
  assert.equal(a.ownerName, 'Budi');
  assert.equal(a.businessName, 'Teh Budi');
  assert.equal(a.sellerLook, 'sari');
  const c = createNewGame(2, { ownerName: 'X', businessName: '', sellerLook: 'nope' });
  assert.equal(c.businessName, 'ESTEH');
  assert.equal(c.sellerLook, 'ujang');
});

test('names: owner name is required and validated', async () => {
  const { validateNames } = await import('../src/ui/TitleScreen');
  assert.ok(validateNames('', 'ESTEH'));
  assert.ok(validateNames('A', 'ESTEH'));
  assert.ok(validateNames('<script>', 'ESTEH'));
  assert.equal(validateNames('Budi Santoso', ''), null);
  assert.equal(validateNames("Siti Nur'aini", 'Es Teh Bu Siti & Co.'), null);
  assert.ok(validateNames('Budi', 'x'.repeat(40)));
});
