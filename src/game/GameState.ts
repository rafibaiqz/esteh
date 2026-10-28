import { EVENT_BY_ID } from '../data/events';
import { LOCATIONS, LOCATION_ORDER, OPEN_HOUR } from '../data/locations';
import { baseUnitCost } from '../data/supplies';
import { migrateWeather } from '../data/weather';
import { initWeather, rollForecast } from '../systems/WeatherSystem';
import { DEFAULT_SELLER, SELLER_LOOKS } from '../render/characters';
import { CARTS } from '../data/carts';
import { UPGRADES } from '../data/upgrades';
import type { ActiveEvent, CartId, Complaint, DayLedger, GameState, LocationId, LocationProgress, LostReason, Recipe, UpgradeId } from './types';

/**
 * Save format version.
 *  2 — first release.
 *  3 — 10 weather types + forecast, news events, tips, regular customers,
 *      taste reputation, Kawasan Premium.
 *  4 — named save slots (saveId, owner & business name, seller look), new
 *      carts, equipment and locations. Older saves are migrated in sanitizeState.
 */
export const SAVE_VERSION = 4;

/** Unique id for a save slot (time + randomness; never derived from names). */
export function newSaveId(): string {
  return `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e8).toString(36)}`;
}

export interface NewGameSetup {
  ownerName: string;
  businessName: string;
  sellerLook: string;
}

export interface LedgerSetup {
  price: number;
  recipe: Recipe;
  eventId: string;
  popularityStart: number;
}

export function emptyLedger(day: number, locationId: LocationId, weather: GameState['weather'], cashStart: number, setup?: Partial<LedgerSetup>): DayLedger {
  const lost: Record<LostReason, number> = { price: 0, queue: 0, patience: 0, stock: 0 };
  const complaints: Record<Complaint, number> = {
    teaWeak: 0,
    teaStrong: 0,
    sugarLow: 0,
    sugarHigh: 0,
    iceLow: 0,
    iceHigh: 0,
    pricey: 0,
    slow: 0,
  };
  return {
    day,
    locationId,
    weather,
    cashStart,
    cupsSold: 0,
    revenue: 0,
    tips: 0,
    tipCount: 0,
    price: setup?.price ?? 0,
    recipe: setup?.recipe ?? { tea: 2, sugar: 2, ice: 3, lemon: 0 },
    eventId: setup?.eventId ?? 'biasa',
    popularityStart: setup?.popularityStart ?? 0,
    popGain: 0,
    popLoss: 0,
    regularsServed: 0,
    ingredientCost: 0,
    wasteCost: 0,
    rent: 0,
    wages: 0,
    maintenance: 0,
    advertising: 0,
    hiring: 0,
    bonus: 0,
    supplyPurchases: 0,
    capex: 0,
    assetSales: 0,
    passersby: 0,
    customersServed: 0,
    lost,
    satisfactionSum: 0,
    feedback: { happy: 0, neutral: 0, unhappy: 0 },
    complaints,
    unlocks: [],
    meltedIce: 0,
  };
}

/** Ledger for the current day of a state (used for new days and repairs). */
export function ledgerFor(s: GameState): DayLedger {
  return emptyLedger(s.day, s.locationId, s.weather, s.cash, {
    price: s.price,
    recipe: { ...s.recipe },
    eventId: s.event.id,
    popularityStart: s.locations[s.locationId].popularity,
  });
}

function freshLocation(id: LocationId): LocationProgress {
  return { popularity: LOCATIONS[id].startPopularity, satisfaction: 60, quality: 60, regulars: 0, cupsSold: 0, revenue: 0, daysOpen: 0 };
}

function freshLocations(): Record<LocationId, LocationProgress> {
  const out = {} as Record<LocationId, LocationProgress>;
  for (const id of LOCATION_ORDER) out[id] = freshLocation(id);
  return out;
}

export const STARTING_CASH = 60_000;
const WELCOME: ActiveEvent = { id: 'biasa', locationId: null, headline: 'Warga Perumahan Asri menyambut lapak es teh baru!' };

export function createNewGame(seed = Math.floor(Math.random() * 1e9), setup?: Partial<NewGameSetup>): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    saveId: newSaveId(),
    ownerName: setup?.ownerName?.trim() || 'Juragan',
    businessName: setup?.businessName?.trim() || 'ESTEH',
    sellerLook: setup?.sellerLook && SELLER_LOOKS[setup.sellerLook] ? setup.sellerLook : DEFAULT_SELLER,
    cash: STARTING_CASH,
    day: 1,
    phase: 'prep',
    timeMin: OPEN_HOUR * 60,
    speed: 1,
    paused: false,
    weather: 'hangat',
    weatherLater: 'hangat',
    temperature: 31,
    forecast: { weather: 'hangat', tempLo: 29, tempHi: 32, actual: 'hangat', actualTemp: 31 },
    event: { ...WELCOME },
    locationId: 'asri',
    unlockedLocations: ['asri'],
    locations: freshLocations(),
    inventory: {
      tea: { qty: 40, avgCost: baseUnitCost('tea') },
      sugar: { qty: 40, avgCost: baseUnitCost('sugar') },
      ice: { qty: 80, avgCost: baseUnitCost('ice') },
      cups: { qty: 50, avgCost: baseUnitCost('cups') },
      lemon: { qty: 0, avgCost: baseUnitCost('lemon') },
    },
    recipe: { tea: 2, sugar: 2, ice: 3, lemon: 0 },
    price: 3_000,
    ownedCarts: ['gerobak'],
    activeCart: 'gerobak',
    upgrades: [],
    assetCost: {},
    staff: [],
    campaigns: [],
    features: [],
    goalsDone: [],
    today: emptyLedger(1, 'asri', 'hangat', STARTING_CASH),
    history: [],
    totals: {
      cupsSold: 0,
      revenue: 0,
      tips: 0,
      profit: 0,
      customersServed: 0,
      lostCustomers: 0,
      daysPlayed: 0,
      bestDayProfit: 0,
      bestDaySatisfaction: 0,
      ingredientCost: 0,
      operatingCost: 0,
    },
    rngSeed: seed,
    hintsSeen: [],
  };
  initWeather(state);
  state.today = ledgerFor(state);
  return state;
}

/** Brings an older or partial ledger up to the current shape. */
function migrateLedger(raw: Partial<DayLedger> | undefined, fallback: DayLedger): DayLedger {
  const l = { ...fallback, ...(raw ?? {}) } as DayLedger;
  l.weather = migrateWeather(raw?.weather ?? fallback.weather);
  l.lost = { ...fallback.lost, ...(raw?.lost ?? {}) };
  l.complaints = { ...fallback.complaints, ...(raw?.complaints ?? {}) };
  l.feedback = { ...fallback.feedback, ...(raw?.feedback ?? {}) };
  l.recipe = { ...fallback.recipe, ...(raw?.recipe ?? {}) };
  if (!LOCATIONS[l.locationId]) l.locationId = 'asri';
  // v2 ledgers didn't store the price: derive it from revenue per cup.
  if (!raw?.price && l.cupsSold > 0) l.price = Math.round(l.revenue / l.cupsSold);
  return l;
}

/**
 * Validates a parsed save and fills any missing fields from a fresh game so
 * that older or partially corrupted saves still load. Returns null when the
 * data is unusable. v2 → v3: weather ids are mapped (cerah → hangat), a
 * forecast and a neutral news event are created, and new per-location and
 * ledger fields get defaults.
 */
export function sanitizeState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<GameState> & { news?: string };
  if (typeof r.cash !== 'number' || !Number.isFinite(r.cash) || typeof r.day !== 'number') return null;
  const base = createNewGame(typeof r.rngSeed === 'number' ? r.rngSeed : undefined);
  const s: GameState = { ...base, ...r, version: SAVE_VERSION } as GameState;
  delete (s as { news?: string }).news;

  s.weather = migrateWeather(r.weather ?? base.weather);
  s.weatherLater = migrateWeather(r.weatherLater ?? s.weather);
  if (typeof s.temperature !== 'number') s.temperature = base.temperature;

  s.locations = { ...base.locations };
  for (const id of LOCATION_ORDER) s.locations[id] = { ...freshLocation(id), ...(r.locations?.[id] ?? {}) };
  s.inventory = { ...base.inventory };
  for (const k of Object.keys(base.inventory) as (keyof GameState['inventory'])[]) {
    const it = r.inventory?.[k];
    s.inventory[k] = {
      qty: Math.max(0, Math.floor(Number(it?.qty ?? base.inventory[k].qty)) || 0),
      avgCost: Number(it?.avgCost) > 0 ? Number(it?.avgCost) : base.inventory[k].avgCost,
    };
  }
  s.recipe = { ...base.recipe, ...(r.recipe ?? {}) };
  s.totals = { ...base.totals, ...(r.totals ?? {}) };
  for (const key of ['unlockedLocations', 'ownedCarts', 'upgrades', 'staff', 'campaigns', 'features', 'goalsDone', 'hintsSeen'] as const) {
    if (!Array.isArray(s[key])) (s as unknown as Record<string, unknown>)[key] = base[key];
  }
  s.unlockedLocations = s.unlockedLocations.filter((id) => !!LOCATIONS[id]);
  s.ownedCarts = s.ownedCarts.filter((id) => !!CARTS[id]);
  s.upgrades = s.upgrades.filter((id) => !!UPGRADES[id]);
  // Purchase prices (resale basis). Missing entries fall back to the catalogue price; values
  // that could not have been paid (negative, above twice the catalogue price) are dropped.
  const costs = r.assetCost && typeof r.assetCost === 'object' ? (r.assetCost as Record<string, unknown>) : {};
  s.assetCost = {};
  for (const [key, v] of Object.entries(costs)) {
    const [kind, id] = key.split(':');
    const cat = kind === 'upgrade' && UPGRADES[id as UpgradeId] ? UPGRADES[id as UpgradeId].price : kind === 'cart' && CARTS[id as CartId] ? CARTS[id as CartId].price : null;
    const owned = kind === 'upgrade' ? s.upgrades.includes(id as UpgradeId) : s.ownedCarts.includes(id as CartId);
    if (cat !== null && owned && typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= cat * 2) s.assetCost[key] = v;
  }
  // Identity (v4). Old saves get a fresh id and default names.
  if (typeof s.saveId !== 'string' || !s.saveId) s.saveId = newSaveId();
  s.ownerName = typeof r.ownerName === 'string' && r.ownerName.trim() ? r.ownerName.trim().slice(0, 24) : 'Juragan';
  s.businessName = typeof r.businessName === 'string' && r.businessName.trim() ? r.businessName.trim().slice(0, 28) : 'ESTEH';
  if (!SELLER_LOOKS[s.sellerLook]) s.sellerLook = DEFAULT_SELLER;
  if (!LOCATIONS[s.locationId] || !s.unlockedLocations.includes(s.locationId)) s.locationId = 'asri';
  if (!s.unlockedLocations.includes('asri')) s.unlockedLocations.unshift('asri');
  if (!s.ownedCarts.includes(s.activeCart)) s.activeCart = s.ownedCarts[0] ?? 'gerobak';
  if (!s.ownedCarts.length) s.ownedCarts = ['gerobak'];
  if (!['prep', 'open', 'report'].includes(s.phase)) s.phase = 'prep';
  if (![1, 2, 4].includes(s.speed)) s.speed = 1;
  s.cash = Math.round(s.cash);

  // News event (v2 saves only had a headline string).
  const ev = r.event;
  s.event = ev && typeof ev.id === 'string' && EVENT_BY_ID[ev.id] ? { id: ev.id, locationId: ev.locationId && LOCATIONS[ev.locationId] ? ev.locationId : null, headline: ev.headline ?? '' } : { id: 'biasa', locationId: null, headline: r.news ?? WELCOME.headline };

  // Forecast
  const f = r.forecast;
  s.forecast =
    f && typeof f.tempLo === 'number'
      ? { weather: migrateWeather(f.weather), tempLo: f.tempLo, tempHi: f.tempHi, actual: migrateWeather(f.actual), actualTemp: Number(f.actualTemp) || f.tempHi }
      : rollForecast(s);

  const fallback = ledgerFor(s);
  s.today = migrateLedger(r.today, { ...fallback, cashStart: r.today?.cashStart ?? s.cash });
  s.history = Array.isArray(r.history) ? r.history.slice(-30).map((h) => migrateLedger(h, emptyLedger(h?.day ?? 0, h?.locationId ?? 'asri', 'hangat', h?.cashStart ?? 0))) : [];
  return s;
}
