import { BALANCE } from '../data/balance';
import { CUSTOMER_TYPES } from '../data/customers';
import { LOCATIONS, OPEN_HOUR, SECONDS_PER_HOUR } from '../data/locations';
import { SUPPLIES, recipeUsage } from '../data/supplies';
import { WEATHER } from '../data/weather';
import type { GameState, Ingredient, LocationId, WeatherId } from '../game/types';
import { dailyFixedCosts, demand, satisfactionFor, tipChance, type DemandBreakdown } from './EconomySystem';
import { eventBudgetFor, eventCrowdWeight } from './EventSystem';
import { exposureFor, trafficScale } from './ExposureSystem';
import { activeIngredients, costPerCup, cupsPossible, packPrice } from './InventorySystem';
import { adEffect, type Modifiers } from './Modifiers';

// ------------------------------------------------------------------ helpers

/** Standard normal CDF (Abramowitz–Stegun approximation). */
function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/** Share of customers whose budget (normal around `mean`) is at least `price`. */
export function acceptShare(price: number, mean: number): number {
  const sd = Math.max(1, mean * BALANCE.demand.budgetSpread);
  return 1 - phi((price - mean) / sd);
}

// ------------------------------------------------------------------ day estimate

export interface EstimateOpts {
  locationId?: LocationId;
  price?: number;
  /** Weather before / after 13:00. */
  weatherId?: WeatherId;
  laterWeatherId?: WeatherId;
  /** Estimate only from this time (minutes). Defaults to now while open, else opening time. */
  fromTime?: number;
}

export interface DayEstimate {
  locationId: LocationId;
  price: number;
  pedestrians: number;
  passersby: number;
  /** Customers who want a drink at this price (before service capacity). */
  demandCups: number;
  /** Uncapped market-demand index (pedestrians × interest) for comparing days. */
  demandIndex: number;
  /** Expected cups sold from `fromTime` until closing (not limited by current stock). */
  cups: number;
  /** Cups already sold today + expected remaining cups. */
  cupsTotal: number;
  /** True when the estimate covers only the rest of a day already in progress. */
  partial: boolean;
  capacity: number;
  capacityLimited: boolean;
  stockCups: number;
  stockLimited: boolean;
  regularCups: number;
  priceRejects: number;
  interest: number;
  fairPrice: number;
  satisfaction: number;
  revenue: number;
  tips: number;
  ingredientCost: number;
  fixedCosts: number;
  advertising: number;
  profit: number;
  use: Record<Ingredient, number>;
}

const estimateCache = new Map<string, DayEstimate>();

function signature(s: GameState, mods: Modifiers, loc: LocationId, price: number, w1: WeatherId, w2: WeatherId): string {
  const p = s.locations[loc];
  const r = s.recipe;
  return [
    loc, price, w1, w2, s.temperature, s.day, s.event.id, s.event.locationId,
    Math.round(p.popularity * 2), Math.round(p.quality), Math.round(p.regulars), `${r.tea}${r.sugar}${r.ice}${r.lemon}`,
    mods.serviceTime.toFixed(2), mods.attraction.toFixed(2), mods.viewRadius, mods.closeHour, mods.budgetMult, mods.rainResist,
    adEffect(s, loc).awareness, cupsPossible(s), Math.round(costPerCup(s)), s.today.advertising, s.phase,
    s.phase === 'open' ? Math.floor(s.timeMin / 15) : 0, s.today.cupsSold,
  ].join('|');
}

/**
 * Expected full-day result with the current settings, using the same demand
 * formula, route exposure, budget distribution and service capacity as the
 * live simulation. Purely informational — it never changes the game state.
 */
export function estimateDay(s: GameState, mods: Modifiers, opts: EstimateOpts = {}): DayEstimate {
  const locationId = opts.locationId ?? s.locationId;
  const price = opts.price ?? s.price;
  const w1 = opts.weatherId ?? s.weather;
  const w2 = opts.laterWeatherId ?? (opts.weatherId ? opts.weatherId : s.weatherLater);
  const partial = opts.fromTime !== undefined ? opts.fromTime > OPEN_HOUR * 60 : s.phase === 'open' && locationId === s.locationId;
  const fromTime = opts.fromTime ?? (partial ? s.timeMin : OPEN_HOUR * 60);
  const key = signature(s, mods, locationId, price, w1, w2) + `|${Math.floor(fromTime / 15)}`;
  const hit = estimateCache.get(key);
  if (hit) return hit;

  const loc = LOCATIONS[locationId];
  const prog = s.locations[locationId];
  const exp = exposureFor(locationId, mods.viewRadius);
  const scale = trafficScale(locationId);
  const meanHour = loc.hourCurve.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  const capacityPerHour = (SECONDS_PER_HOUR / mods.serviceTime) * BALANCE.service.efficiency;

  let pedestrians = 0;
  let passersby = 0;
  let demandCups = 0;
  let demandIndex = 0;
  let cups = 0;
  let regularCups = 0;
  let priceRejects = 0;
  let interestSum = 0;
  let capacityLimited = false;
  let first: DemandBreakdown | null = null;
  let qwSum = 0;
  let psSum = 0;
  let tipSum = 0;
  let premSum = 0;

  const startHour = Math.floor(fromTime / 60);
  for (let h = OPEN_HOUR; h < mods.closeHour; h++) {
    const wId = h >= 13 ? w2 : w1;
    const d = demand(s, mods, { locationId, weatherId: wId, price, timeMin: h * 60 + 30 });
    // Profile averages are computed on the first hour; hours already past contribute nothing.
    const share = h < startHour ? 0 : h === startHour ? 1 - (fromTime % 60) / 60 : 1;
    if (!first) first = d;
    const peds = d.traffic * scale;
    const exposed = peds * exp.share;
    let buyers = 0;
    let rejects = 0;
    let crowdW = 0;
    for (const c of loc.crowd) crowdW += c.weight * eventCrowdWeight(d.event, c.type);
    let accAvg = 0;
    for (const c of loc.crowd) {
      const type = CUSTOMER_TYPES[c.type];
      const share = (c.weight * eventCrowdWeight(d.event, c.type)) / crowdW;
      const interested = exposed * share * Math.min(BALANCE.demand.maxInterest, d.interest * type.thirst * exp.prox);
      const acc = acceptShare(price, d.budgetBase * type.budgetMult * eventBudgetFor(d.event, c.type));
      buyers += interested * acc;
      rejects += interested * (1 - acc);
      accAvg += share * acc;
      if (h === OPEN_HOUR) {
        qwSum += share * type.qualityWeight;
        psSum += share * type.priceSensitivity;
        tipSum += share * type.tipMult;
        premSum += share * (type.premium ? 1 : 0);
      }
    }
    const busy = d.traffic / Math.max(0.01, loc.traffic * meanHour);
    const regBuyers = ((prog.regulars * BALANCE.regulars.visitShare * mods.regularVisitMult * busy) / 12) * Math.min(0.95, BALANCE.regulars.interest * Math.min(1.2, d.thirst)) * accAvg;
    const want = buyers + regBuyers;
    const sold = Math.min(want, capacityPerHour);
    if (share > 0 && want > capacityPerHour * 1.02) capacityLimited = true;
    pedestrians += peds * share;
    passersby += exposed * share;
    demandCups += want * share;
    demandIndex += peds * d.rawInterest * share;
    cups += sold * share;
    regularCups += want > 0 ? ((regBuyers * sold) / want) * share : 0;
    priceRejects += rejects * share;
    interestSum += d.interest;
  }

  const hours = Math.max(1, mods.closeHour - OPEN_HOUR);
  const d0 = first!;
  // Satisfaction estimate for an average customer with an average wait.
  const sat = satisfactionFor({
    taste: d0.quality,
    price,
    fair: d0.fairPrice,
    budget: d0.typicalBudget,
    waited: 0,
    patience: 1,
    type: { priceSensitivity: psSum || 1, waitSensitivity: 1, qualityWeight: qwSum || 1 },
    service: mods.satBonus + mods.consistency,
  }).value;
  const tipPerCup = tipChance(sat, tipSum || 1, mods.tipService) * price * 0.16 * (1 + (BALANCE.tips.premiumMult - 1) * premSum);
  const roundedCups = Math.round(cups);
  const use = {} as Record<Ingredient, number>;
  const usage = recipeUsage(s.recipe);
  for (const i of Object.keys(usage) as Ingredient[]) use[i] = roundedCups * usage[i];
  const fixed = dailyFixedCosts(s, mods, locationId).total;
  const revenue = roundedCups * price;
  const tips = roundedCups * tipPerCup;
  const ingredientCost = roundedCups * costPerCup(s);
  const stockCups = cupsPossible(s);
  // While trading, the projection = today's actual result so far + the expected rest of the day.
  const l = s.today;
  const soFar = partial ? l.revenue + l.tips + l.bonus - l.ingredientCost - l.wasteCost - (l.rent + l.wages + l.maintenance + l.advertising + l.hiring) : -fixed - l.advertising;
  const est: DayEstimate = {
    locationId,
    price,
    pedestrians,
    passersby,
    demandCups,
    demandIndex,
    cups: roundedCups,
    cupsTotal: roundedCups + (partial ? l.cupsSold : 0),
    partial,
    capacity: capacityPerHour * hours,
    capacityLimited,
    stockCups,
    stockLimited: stockCups < roundedCups,
    regularCups,
    priceRejects,
    interest: interestSum / hours,
    fairPrice: d0.fairPrice,
    satisfaction: sat,
    revenue,
    tips,
    ingredientCost,
    fixedCosts: fixed,
    advertising: s.today.advertising,
    profit: soFar + revenue + tips - ingredientCost,
    use,
  };
  if (estimateCache.size > 300) estimateCache.clear();
  estimateCache.set(key, est);
  return est;
}

/** Estimate for tomorrow at the current location using the published forecast (news unknown). */
export function estimateTomorrow(s: GameState, mods: Modifiers): DayEstimate {
  const f = s.forecast;
  const clone: GameState = {
    ...s,
    day: s.day + 1,
    weather: f.weather,
    weatherLater: f.weather,
    temperature: Math.round((f.tempLo + f.tempHi) / 2),
    event: { id: 'biasa', locationId: null, headline: '' },
    phase: 'prep',
    today: { ...s.today, advertising: 0 },
  };
  return estimateDay(clone, mods);
}

export type DemandLevel = { label: string; level: number; ratio: number };

/** Compares an estimate with a plain "cerah berawan, no news" day at the same location and price. */
export function demandLevel(s: GameState, mods: Modifiers, est: DayEstimate, day = s.day): DemandLevel {
  const base: GameState = {
    ...s,
    day,
    weather: 'cerahBerawan',
    weatherLater: 'cerahBerawan',
    temperature: Math.round((WEATHER.cerahBerawan.temp[0] + WEATHER.cerahBerawan.temp[1]) / 2),
    event: { id: 'biasa', locationId: null, headline: '' },
  };
  const ref = estimateDay(base, mods, { locationId: est.locationId, price: est.price });
  const ratio = ref.demandIndex > 0 ? est.demandIndex / ref.demandIndex : 1;
  if (ratio >= 1.3) return { label: 'Sangat tinggi', level: 5, ratio };
  if (ratio >= 1.1) return { label: 'Tinggi', level: 4, ratio };
  if (ratio >= 0.9) return { label: 'Normal', level: 3, ratio };
  if (ratio >= 0.65) return { label: 'Rendah', level: 2, ratio };
  return { label: 'Sangat rendah', level: 1, ratio };
}

// ------------------------------------------------------------------ price options

export interface PriceOption {
  price: number;
  cups: number;
  revenue: number;
  profit: number;
}

export function priceOptions(s: GameState, mods: Modifiers, deltas = [-1000, -500, 0, 500, 1000]): PriceOption[] {
  const out: PriceOption[] = [];
  for (const dlt of deltas) {
    const price = s.price + dlt;
    if (price < 500) continue;
    const e = estimateDay(s, mods, { price });
    out.push({ price, cups: e.cups, revenue: e.revenue + e.tips, profit: e.profit });
  }
  return out;
}

/** Price with the highest estimated profit today (scanned in Rp 500 steps). */
export function bestPrice(s: GameState, mods: Modifiers): PriceOption {
  const fair = estimateDay(s, mods).fairPrice;
  let best: PriceOption | null = null;
  const lo = 500;
  const hi = Math.max(fair * 2, s.price + 2000);
  for (let p = lo; p <= hi; p += 500) {
    const e = estimateDay(s, mods, { price: p });
    if (!best || e.profit > best.profit) best = { price: p, cups: e.cups, revenue: e.revenue + e.tips, profit: e.profit };
  }
  return best!;
}

// ------------------------------------------------------------------ stock plan

export interface PlanRow {
  id: Ingredient;
  stock: number;
  expectedUse: number;
  target: number;
  need: number;
  packs: number[];
  buyQty: number;
  cost: number;
  leftover: number;
  capacityShort: boolean;
}

export interface StockPlan {
  cups: number;
  rows: PlanRow[];
  totalCost: number;
  meltLoss: number;
  affordable: boolean;
}

/** Cheapest combination of packs giving at least `need` units without exceeding `room`. */
function cheapestPacks(s: GameState, id: Ingredient, need: number, room: number): { counts: number[]; qty: number; cost: number } {
  const packs = SUPPLIES[id].packs;
  const prices = packs.map((_, i) => packPrice(s, id, i));
  let best = { counts: [0, 0, 0], qty: 0, cost: 0 };
  if (need <= 0) return best;
  const goal = Math.min(need, room);
  let bestCost = Infinity;
  const max = packs.map((p) => Math.ceil(goal / p.qty) + 1);
  for (let c2 = 0; c2 <= Math.min(max[2], 30); c2++)
    for (let c1 = 0; c1 <= Math.min(max[1], 4); c1++)
      for (let c0 = 0; c0 <= Math.min(max[0], 6); c0++) {
        const qty = c0 * packs[0].qty + c1 * packs[1].qty + c2 * packs[2].qty;
        if (qty < goal || qty > room) continue;
        const cost = c0 * prices[0] + c1 * prices[1] + c2 * prices[2];
        if (cost < bestCost || (cost === bestCost && qty < best.qty)) {
          bestCost = cost;
          best = { counts: [c0, c1, c2], qty, cost };
        }
      }
  // If nothing fits exactly (room too small), buy as much as fits with small packs.
  if (bestCost === Infinity) {
    const n = Math.floor(room / packs[0].qty);
    best = { counts: [n, 0, 0], qty: n * packs[0].qty, cost: n * prices[0] };
  }
  return best;
}

/** Recommended purchases for the expected sales, using the actual recipe, stock and capacity. */
export function stockPlan(s: GameState, mods: Modifiers, est: DayEstimate): StockPlan {
  const usage = recipeUsage(s.recipe);
  const rows: PlanRow[] = [];
  let totalCost = 0;
  let meltLoss = 0;
  for (const id of activeIngredients(s)) {
    if (usage[id] <= 0) continue;
    const stock = s.inventory[id].qty;
    const expectedUse = est.cups * usage[id];
    const safety = id === 'ice' ? BALANCE.plan.iceSafety : BALANCE.plan.safety;
    const target = Math.ceil(expectedUse * safety);
    const need = Math.max(0, target - stock);
    const room = Math.max(0, mods.capacity[id] - stock);
    const pick = cheapestPacks(s, id, need, room);
    const leftover = Math.max(0, stock + pick.qty - expectedUse);
    if (id === 'ice') meltLoss += leftover * mods.iceMelt * s.inventory.ice.avgCost;
    if (id === 'lemon') meltLoss += leftover * mods.lemonSpoil * s.inventory.lemon.avgCost;
    totalCost += pick.cost;
    rows.push({ id, stock, expectedUse, target, need, packs: pick.counts, buyQty: pick.qty, cost: pick.cost, leftover, capacityShort: need > room });
  }
  return { cups: est.cups, rows, totalCost, meltLoss, affordable: s.cash >= totalCost };
}
