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
import { advanceWeather, weatherNow, weatherNowLabel } from '../src/systems/WeatherSystem';
import { hudHtml, prepMini, prepPopup } from '../src/ui/panels';
import { BASE_VIEW_RADIUS, exposureFor, trafficScale } from '../src/systems/ExposureSystem';
import { buildMap } from '../src/data/maps';
import { CARTS } from '../src/data/carts';
import { GOALS } from '../src/data/business';
import { hasSellableAssets, listAssets, resaleValue, type AssetRef } from '../src/systems/AssetSystem';
import { MAP_SIZE } from '../src/data/mapKit';
import { LOCATIONS } from '../src/data/locations';
import { Pathfinder } from '../src/world/Pathfinding';
import type { LocationId } from '../src/game/types';

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

test('maps: every neighbourhood is a larger, connected world with clean geometry', () => {
  const ids = Object.keys(LOCATIONS) as LocationId[];
  for (const id of ids) {
    const m = buildMap(id);
    const where = `${id}`;
    assert.equal(m.width, MAP_SIZE, `${where}: width`);
    assert.equal(m.height, MAP_SIZE, `${where}: height`);
    const pf = new Pathfinder(m);
    const serve = { x: m.cart.serveX, y: m.cart.serveY };
    assert.ok(m.walkable(serve.x, serve.y), `${where}: serve tile walkable`);
    // Queue room: the first slots behind the serve tile stay on walkable ground.
    for (let i = 1; i <= 3; i++) {
      const qx = Math.floor(serve.x + 0.5 + m.cart.qdx * i * 0.55);
      const qy = Math.floor(serve.y + 0.5 + m.cart.qdy * i * 0.55);
      assert.ok(m.walkable(qx, qy), `${where}: queue slot ${i} at ${qx},${qy}`);
    }
    // Entry points on several edges, and every spawn/door/POI can reach the cart.
    const edges = new Set(m.spawns.map((p) => (p.y === 0 ? 'N' : p.y === m.height - 1 ? 'S' : p.x === 0 ? 'W' : p.x === m.width - 1 ? 'E' : 'door')));
    assert.ok(['N', 'S', 'W', 'E'].filter((e) => edges.has(e)).length >= 3, `${where}: entries on ≥3 edges (${[...edges].join(',')})`);
    for (const p of [...m.spawns, ...m.pois]) {
      assert.ok(m.walkable(p.x, p.y), `${where}: point ${p.x},${p.y} is walkable`);
      assert.ok(pf.find(p, serve), `${where}: ${p.x},${p.y} can reach the cart`);
    }
    // Structures: inside the map, never overlapping each other or roads/sidewalks/crossings.
    const owner = new Int16Array(m.width * m.height).fill(-1);
    m.structures.forEach((s, si) => {
      assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= m.width && s.y + s.h <= m.height, `${where}: ${s.kind} ${s.sign ?? ''} in bounds`);
      for (let y = s.y; y < s.y + s.h; y++)
        for (let x = s.x; x < s.x + s.w; x++) {
          const i = y * m.width + x;
          assert.equal(owner[i], -1, `${where}: ${s.kind} ${s.sign ?? ''} overlaps another structure at ${x},${y}`);
          owner[i] = si;
          const t = m.tile(x, y)!.type;
          assert.ok(t !== 'road' && t !== 'cross' && t !== 'walk', `${where}: ${s.kind} ${s.sign ?? ''} sits on ${t} at ${x},${y}`);
        }
    });
    assert.equal(owner[m.cart.y * m.width + m.cart.x], -1, `${where}: cart tile is free`);
    // Props never stand on a road or inside a building.
    for (const p of m.props) {
      const tx = Math.floor(p.x);
      const ty = Math.floor(p.y);
      const t = m.tile(tx, ty);
      assert.ok(t, `${where}: ${p.kind} at ${p.x},${p.y} in bounds`);
      if (p.kind !== 'car' && p.kind !== 'bus') assert.ok(t!.type !== 'road' && t!.type !== 'cross', `${where}: ${p.kind} on the road at ${p.x},${p.y}`);
      assert.equal(owner[ty * m.width + tx], -1, `${where}: ${p.kind} inside a building at ${p.x},${p.y}`);
    }
    // No tiny road fragments: every road tile has a road neighbour.
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++) {
        const t = m.tile(x, y)!.type;
        if (t !== 'road' && t !== 'cross') continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => ['road', 'cross'].includes(m.tile(x + dx, y + dy)?.type ?? '')).length;
        assert.ok(n >= 1, `${where}: isolated road tile at ${x},${y}`);
      }
  }
});

test('maps: larger worlds keep each location’s customer flow', () => {
  for (const id of Object.keys(LOCATIONS) as LocationId[]) {
    const scale = trafficScale(id);
    const e = exposureFor(id, BASE_VIEW_RADIUS);
    // Arrivals × share who see the cart × proximity stays at the level the location was balanced for.
    const noticed = e.share * e.prox * scale;
    assert.ok(scale > 0.5 && scale < 4.5, `${id}: traffic scale ${scale.toFixed(2)}`);
    assert.ok(noticed > 0.35 && noticed < 0.9, `${id}: noticed ${noticed.toFixed(2)}`);
  }
});

test('weather: HUD, pre-opening card, minimized bar and demand all use the current weather', () => {
  const s = createNewGame(4242);
  s.weather = 'cerahBerawan';
  s.weatherLater = 'hujan';
  s.temperature = 30;
  const game = new Game(s);
  const hudTemp = () => Number(/class="pill wx"[^>]*>.*?<b>(-?\d+)°<\/b>/s.exec(hudHtml(game, 0))![1]);
  const cardLine = () => /class="pp-wx"[^>]*>.*?<b>([^<]+)<\/b>/s.exec(prepPopup(game, false))![1];
  const barTemp = () => Number(/(-?\d+)°C<\/span>/.exec(prepMini(game))![1]);

  // Before opening (07:00): cool morning, not the day's peak.
  let now = weatherNow(game.state);
  assert.equal(now.id, 'cerahBerawan');
  assert.equal(now.temperature, 26, 'morning temperature follows the daily curve');
  assert.equal(hudTemp(), now.temperature);
  assert.equal(cardLine(), weatherNowLabel(now));
  assert.equal(cardLine(), 'Cerah Berawan · 26°C');
  assert.equal(barTemp(), now.temperature);
  assert.ok(prepPopup(game, false).includes('puncak ±30°C'), 'the peak is shown only as a labelled forecast');
  let d = demand(game.state, game.mods);
  assert.equal(d.weatherId, now.id);
  assert.equal(d.temperature, now.temperature);

  // Trading in the afternoon: the weather has changed; HUD and demand follow it together.
  game.openDay();
  game.state.timeMin = 14 * 60;
  now = weatherNow(game.state);
  assert.equal(now.id, 'hujan');
  assert.equal(hudTemp(), now.temperature);
  d = demand(game.state, game.mods);
  assert.equal(d.weatherId, 'hujan');
  assert.equal(d.temperature, now.temperature);
});

test('pause: the whole simulation stands still and resumes without a jump', () => {
  const s = createNewGame(99);
  for (const k of ['tea', 'sugar', 'cups'] as const) s.inventory[k].qty = 80;
  s.inventory.ice.qty = 200;
  s.locations[s.locationId].popularity = 90;
  const game = new Game(s);
  game.events.on('toast', () => {});
  game.openDay();
  game.setSpeed(4);
  for (let i = 0; i < 600; i++) game.update(1 / 60);
  const snap = () =>
    JSON.stringify({
      people: game.world.customers.map((c) => [c.x, c.y, c.state, c.pathIndex]),
      cars: game.world.vehicles.map((v) => [v.x, v.y]),
      queue: game.world.queue.length,
      time: game.state.timeMin,
      cash: game.state.cash,
      inv: game.state.inventory,
      today: game.state.today,
      pour: game.world.cart.pour,
    });
  let events = 0;
  game.events.on('sale', () => events++);
  game.events.on('stockWarning', () => events++);
  for (const phase of ['open', 'prep'] as const) {
    if (phase === 'prep') {
      game.closeDay();
      game.nextDay();
    }
    game.setPaused(true);
    events = 0;
    const before = snap();
    for (let i = 0; i < 1200; i++) game.update(1 / 60); // 20 s of real time
    assert.equal(snap(), before, `${phase}: nothing changes while paused`);
    assert.equal(events, 0, `${phase}: no sales or warnings while paused`);
    game.setPaused(false);
    const people = game.world.customers.map((c) => [c.x, c.y]);
    game.update(1 / 60);
    const step = Math.max(0, ...game.world.customers.slice(0, people.length).map((c, i) => Math.hypot(c.x - people[i][0], c.y - people[i][1])));
    assert.ok(step < 0.2, `${phase}: first step after resuming is small (${step.toFixed(3)} tiles)`);
    for (let i = 0; i < 120; i++) game.update(1 / 60);
    assert.notEqual(snap(), before, `${phase}: the world moves again after resuming`);
  }
});

test('assets: equipment sells for 80% of what was paid, once, with its effects removed', () => {
  // The one price rule.
  assert.equal(resaleValue(100_000), 80_000);
  assert.equal(resaleValue(50_000), 40_000);
  assert.equal(resaleValue(25_000), 20_000);
  assert.equal(resaleValue(55_555), 44_444, 'rounded down');

  const s = createNewGame(7);
  s.cash = 1_000_000;
  s.totals.cupsSold = 5000;
  s.today = ledgerFor(s);
  const game = new Game(s);
  game.events.on('toast', () => {});
  const ice: AssetRef = { kind: 'upgrade', id: 'kotakEs' };

  // Not owned → refused, cash untouched.
  let cash = game.state.cash;
  assert.equal(game.sellAsset(ice).ok, false);
  assert.equal(game.state.cash, cash);

  // Buy (50 000), check the effect, sell (40 000) exactly once.
  assert.ok(game.buyUpgrade('kotakEs').ok);
  assert.equal(game.state.assetCost['upgrade:kotakEs'], 50_000);
  const meltWith = game.mods.iceMelt;
  cash = game.state.cash;
  let sales = 0;
  game.events.on('purchase', ({ kind }) => kind === 'sale' && sales++);
  const r = game.sellAsset(ice);
  assert.ok(r.ok, r.msg);
  assert.equal(game.state.cash, cash + 40_000);
  assert.equal(game.state.today.assetSales, 40_000);
  assert.ok(!game.state.upgrades.includes('kotakEs'));
  assert.ok(game.mods.iceMelt > meltWith, 'ice melts faster again without the ice box');
  assert.equal(game.sellAsset(ice).ok, false, 'cannot sell twice');
  assert.equal(game.state.cash, cash + 40_000, 'cash rose exactly once');
  assert.equal(sales, 1);
  assert.equal(game.state.cash, game.state.today.cashStart + cashFlow(game.state.today), 'cash flow still balances');

  // The recorded purchase price is used, not today's shop price.
  game.buyUpgrade('payung');
  game.state.assetCost['upgrade:payung'] = 30_000;
  cash = game.state.cash;
  game.sellAsset({ kind: 'upgrade', id: 'payung' });
  assert.equal(game.state.cash, cash + 24_000);

  // Storage that would leave stock without room cannot be sold until the stock is used.
  game.buyUpgrade('rakGelas');
  const cap = game.mods.capacity.cups;
  game.state.inventory.cups.qty = cap;
  assert.equal(game.sellAsset({ kind: 'upgrade', id: 'rakGelas' }).ok, false);
  game.state.inventory.cups.qty = 10;
  assert.ok(game.sellAsset({ kind: 'upgrade', id: 'rakGelas' }).ok);
  assert.ok(game.mods.capacity.cups < cap, 'capacity shrinks back');

  // Equipment another item is built on is sold last; the cart in use and the free starter cart never.
  game.buyUpgrade('kotakEs');
  game.buyUpgrade('cooler');
  assert.equal(game.sellAsset(ice).ok, false);
  assert.ok(game.sellAsset({ kind: 'upgrade', id: 'cooler' }).ok);
  assert.ok(game.sellAsset(ice).ok);
  assert.equal(game.sellAsset({ kind: 'cart', id: 'gerobak' }).ok, false);
  game.buyCart('mobile');
  assert.equal(game.state.activeCart, 'mobile');
  assert.ok(game.sellAsset({ kind: 'cart', id: 'gerobak' }).ok === false, 'starter cart has no resale value');
  assert.equal(game.sellAsset({ kind: 'cart', id: 'mobile' }).ok, false, 'the cart in use cannot be sold');
  game.useCart('gerobak');
  cash = game.state.cash;
  assert.ok(game.sellAsset({ kind: 'cart', id: 'mobile' }).ok);
  assert.equal(game.state.cash, cash + resaleValue(CARTS.mobile.price));
  // Ingredients are never assets.
  assert.ok(listAssets(game.state).every((a) => a.ref.kind === 'upgrade' || a.ref.kind === 'cart'));
});

test('assets: selling equipment funds a restock; no free money; sales survive save/load', () => {
  const s = createNewGame(11);
  s.totals.cupsSold = 5000;
  s.cash = 50_000;
  s.goalsDone = GOALS.map((g) => g.id); // goal rewards are a separate, existing mechanic
  s.today = ledgerFor(s);
  const game = new Game(s);
  game.events.on('toast', () => {});
  game.buyUpgrade('kotakEs'); // cash 0
  for (const k of ['tea', 'sugar', 'ice', 'cups', 'lemon'] as const) game.state.inventory[k].qty = 0;
  assert.equal(game.state.cash, 0);
  assert.ok(game.isBankrupt(), 'out of stock and cash');
  assert.equal(game.buySupply('tea', 0).ok, false, 'cannot restock with no cash');
  assert.ok(hasSellableAssets(game.state));
  // Time passing never adds money by itself (no loans, credit or handouts).
  for (let i = 0; i < 300; i++) game.update(1 / 60);
  assert.equal(game.state.cash, 0);
  assert.ok(game.sellAsset({ kind: 'upgrade', id: 'kotakEs' }).ok);
  assert.equal(game.state.cash, 40_000);
  assert.ok(game.buySupply('tea', 0).ok, 'the proceeds pay for ingredients');
  assert.ok(!hasSellableAssets(game.state));

  // Persist and reload.
  const loaded = sanitizeState(JSON.parse(JSON.stringify(game.state)))!;
  assert.ok(!loaded.upgrades.includes('kotakEs'));
  assert.equal(loaded.cash, game.state.cash);
  assert.equal(loaded.today.assetSales, 40_000);
  assert.equal(loaded.assetCost['upgrade:kotakEs'], undefined);

  // Saves from before this feature: no recorded price → catalogue price, never something odd.
  const old = JSON.parse(JSON.stringify(game.state));
  old.upgrades = ['payung'];
  delete old.assetCost;
  delete old.today.assetSales;
  const migrated = sanitizeState(old)!;
  assert.deepEqual(migrated.assetCost, {});
  assert.equal(migrated.today.assetSales, 0);
  assert.equal(listAssets(migrated)[0].price, resaleValue(35_000));
  const weird = JSON.parse(JSON.stringify(game.state));
  weird.upgrades = ['payung'];
  weird.assetCost = { 'upgrade:payung': 9_999_999, 'upgrade:notreal': 5, 'cart:truk': 1 };
  assert.deepEqual(sanitizeState(weird)!.assetCost, {}, 'impossible prices and unowned items are dropped');
});
