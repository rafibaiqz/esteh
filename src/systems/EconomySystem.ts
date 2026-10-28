import { BALANCE } from '../data/balance';
import type { CustomerTypeDef, CustomerTypeId } from '../data/customers';
import { LOCATIONS, hourFactor, type LocationDef } from '../data/locations';
import { WEATHER } from '../data/weather';
import type { DayLedger, GameState, LocationId, WeatherId } from '../game/types';
import { isWeekend } from '../util/calendar';
import { clamp } from '../util/rng';
import { eventEffect, type ResolvedEffect } from './EventSystem';
import { adEffect, type Modifiers } from './Modifiers';
import { recipeInsight, type PrefShift } from './RecipeSystem';
import { currentWeatherId, temperatureAt, temperatureFactor } from './WeatherSystem';

// ------------------------------------------------------------------ Ledger maths

/** Other operating expenses: cart upkeep and hiring fees. */
export function otherExpenses(l: DayLedger): number {
  return l.maintenance + l.hiring;
}

/** Operating expenses: rent + wages + advertising + other operating expenses. */
export function operatingExpenses(l: DayLedger): number {
  return l.rent + l.wages + l.advertising + otherExpenses(l);
}

/** Ingredient costs: ingredients consumed in sold cups plus overnight spoilage. */
export function ingredientExpenses(l: DayLedger): number {
  return l.ingredientCost + l.wasteCost;
}

/** Gross profit = drink revenue − ingredient costs. */
export function grossProfit(l: DayLedger): number {
  return l.revenue - ingredientExpenses(l);
}

/** Net profit = drink revenue + tips − ingredient costs − operating expenses (+ goal bonuses). */
export function netProfit(l: DayLedger): number {
  return l.revenue + (l.tips ?? 0) + l.bonus - ingredientExpenses(l) - operatingExpenses(l);
}

/** Actual change in cash: everything received minus everything paid, including stock and investments. */
export function cashFlow(l: DayLedger): number {
  return l.revenue + (l.tips ?? 0) + l.bonus + (l.assetSales ?? 0) - l.supplyPurchases - operatingExpenses(l) - l.capex;
}

export function avgSatisfaction(l: DayLedger): number {
  return l.customersServed ? l.satisfactionSum / l.customersServed : 0;
}

export function lostTotal(l: DayLedger): number {
  return l.lost.price + l.lost.queue + l.lost.patience + l.lost.stock;
}

// ------------------------------------------------------------------ Fixed costs

export function dailyFixedCosts(s: GameState, mods: Modifiers, locationId: LocationId = s.locationId) {
  const rent = LOCATIONS[locationId].rent;
  return { rent, wages: mods.wages, maintenance: mods.maintenance, total: rent + mods.wages + mods.maintenance };
}

// ------------------------------------------------------------------ Quality & fair price

export const popularityFactor = (pop: number): number => 0.55 + 0.9 * (pop / 100);

/** Customers' preference shifts today at a location (weather ice, news sugar). */
export function prefShift(s: GameState, locationId: LocationId, weatherId: WeatherId = currentWeatherId(s)): PrefShift {
  return { ice: WEATHER[weatherId].iceShift, sugar: eventEffect(s, locationId).sugarPref };
}

/**
 * Perceived quality (0..100): mostly the current recipe's expected taste for
 * this crowd, partly the location's taste reputation from past sales.
 */
export function qualityScore(s: GameState, mods: Modifiers, locationId: LocationId = s.locationId, weatherId: WeatherId = currentWeatherId(s)): number {
  const expected = recipeInsight(s, s.recipe, mods, prefShift(s, locationId, weatherId), locationId).expectedTaste;
  const w = BALANCE.quality.recipeWeight;
  return w * expected + (1 - w) * s.locations[locationId].quality;
}

/** Share of a location's crowd belonging to the given segments. */
function crowdShare(loc: LocationDef, segments: CustomerTypeId[] | null): number {
  if (!segments) return 1;
  const total = loc.crowd.reduce((a, c) => a + c.weight, 0);
  return loc.crowd.filter((c) => segments.includes(c.type)).reduce((a, c) => a + c.weight, 0) / total;
}

/** Average budget multiplier of an event across the crowd. */
function eventBudgetAvg(loc: LocationDef, ev: ResolvedEffect): number {
  return 1 + (ev.budget - 1) * crowdShare(loc, ev.segments);
}

export function qualityPriceMult(loc: LocationDef, quality: number): number {
  const q = BALANCE.quality;
  return clamp(1 + (loc.qualityWeight * (quality - q.pricePivot)) / 100, q.priceMin, q.priceMax);
}

/**
 * Fair price: what locals consider reasonable today =
 *   location base × recipe quality × weather × news (purchasing power) × (1 + 10% × popularity).
 */
export function fairPrice(s: GameState, mods: Modifiers, locationId: LocationId = s.locationId, weatherId: WeatherId = currentWeatherId(s), quality?: number): number {
  const loc = LOCATIONS[locationId];
  const q = quality ?? qualityScore(s, mods, locationId, weatherId);
  const ev = eventEffect(s, locationId);
  const pop = s.locations[locationId].popularity;
  const raw = loc.refPrice * qualityPriceMult(loc, q) * WEATHER[weatherId].budget * eventBudgetAvg(loc, ev) * (1 + 0.1 * (pop / 100));
  return Math.round(raw / 100) * 100;
}

/** Demand response to price: (fair / price)^elasticity. Lower prices attract more buyers. */
export const priceFactor = (price: number, fair: number, elasticity: number): number =>
  clamp(Math.pow(fair / Math.max(1, price), elasticity), BALANCE.demand.priceFactorMin, BALANCE.demand.priceFactorMax);

// ------------------------------------------------------------------ Demand model

export interface DemandOpts {
  locationId?: LocationId;
  weatherId?: WeatherId;
  price?: number;
  timeMin?: number;
}

export interface DemandBreakdown {
  /** Pedestrians per game hour. */
  traffic: number;
  base: number;
  /** Weather and temperature this demand was computed for. */
  weatherId: WeatherId;
  temperature: number;
  thirst: number;
  popularity: number;
  attraction: number;
  marketing: number;
  quality: number;
  qualityFactor: number;
  fairPrice: number;
  elasticity: number;
  price: number;
  competition: number;
  locationBonus: number;
  weekend: number;
  shelter: number;
  event: ResolvedEffect;
  /** Probability that a passer-by right next to the cart wants a drink. */
  interest: number;
  /** Interest before the 95% cap (used to compare market conditions). */
  rawInterest: number;
  /** Typical price ceiling of a customer here right now (before type multipliers). */
  typicalBudget: number;
  /** Price ceiling before customer-type and news-segment multipliers. */
  budgetBase: number;
}

/**
 * Transparent demand formula shared by the simulation, forecasts and UI:
 *   interest = base × thirst(temperature, weather, news) × popularity × attraction × marketing
 *              × (fair/price)^elasticity × (1 − 0.4·competition) × quality × location bonus
 *   traffic  = location traffic × hour curve × weather (softened by shelter) × weekend × news
 *              × marketing reach × (0.85 + 0.3·popularity)
 */
export function demand(s: GameState, mods: Modifiers, opts: DemandOpts = {}): DemandBreakdown {
  const locationId = opts.locationId ?? s.locationId;
  const loc = LOCATIONS[locationId];
  const prog = s.locations[locationId];
  const timeMin = opts.timeMin ?? s.timeMin;
  const wId = opts.weatherId ?? currentWeatherId(s);
  const w = WEATHER[wId];
  const ev = eventEffect(s, locationId);
  const ad = adEffect(s, locationId);
  const temperature = temperatureAt(s, timeMin, wId);
  const shelter = w.rain > 0 ? clamp(loc.shelter + mods.rainResist, 0, BALANCE.weather.maxShelter) : 0;
  const weatherTraffic = w.traffic + (1 - w.traffic) * shelter;
  const mood = w.rain > 0 ? w.mood + (1 - w.mood) * mods.rainResist * 0.5 : w.mood;
  const thirst = temperatureFactor(temperature) * mood * ev.thirst;
  const hot = wId === 'terik' || wId === 'panas' || wId === 'hangat';
  const locationBonus = hot ? (loc.bonus.hotBonus ?? 1) : 1;
  const quality = qualityScore(s, mods, locationId, wId);
  const qualityFactor = BALANCE.quality.interestBase + (BALANCE.quality.interestSpan * quality) / 100;
  const fair = fairPrice(s, mods, locationId, wId, quality);
  const price = opts.price ?? s.price;
  const elasticity = loc.priceSensitivity * w.priceSensitivity * ev.priceSensitivity;
  const pf = priceFactor(price, fair, elasticity);
  const competition = 1 - BALANCE.demand.competitionWeight * clamp(loc.competition + ev.competition, 0, 0.9);
  const popularity = popularityFactor(prog.popularity);
  const rawInterest = loc.baseDemand * thirst * popularity * mods.attraction * ad.interestMult * pf * competition * locationBonus * qualityFactor;
  const interest = clamp(rawInterest, 0, BALANCE.demand.maxInterest);
  const weekend = isWeekend(s.day) ? loc.weekend : 1;
  const traffic = loc.traffic * hourFactor(loc, timeMin) * weatherTraffic * ad.trafficMult * (0.85 + 0.3 * (prog.popularity / 100)) * weekend * ev.traffic;
  const budgetBase = loc.budget * w.budget * (1 + 0.15 * (prog.popularity / 100)) * mods.budgetMult * qualityBudget(loc, quality);
  const typicalBudget = budgetBase * eventBudgetAvg(loc, ev);
  return {
    traffic,
    base: loc.baseDemand,
    weatherId: wId,
    temperature,
    thirst,
    popularity,
    attraction: mods.attraction,
    marketing: ad.interestMult,
    quality,
    qualityFactor,
    fairPrice: fair,
    elasticity,
    price: pf,
    competition,
    locationBonus,
    weekend,
    shelter,
    event: ev,
    interest,
    rawInterest,
    typicalBudget,
    budgetBase,
  };
}

/** Better drinks make customers willing to pay more (strongest where quality matters). */
export function qualityBudget(loc: LocationDef, quality: number): number {
  return clamp(1 + (loc.qualityWeight * (quality - BALANCE.quality.pricePivot)) / 200, 0.85, 1.2);
}

// ------------------------------------------------------------------ Satisfaction & tips

export interface SatisfactionInput {
  taste: number;
  price: number;
  fair: number;
  budget: number;
  waited: number;
  patience: number;
  type: Pick<CustomerTypeDef, 'priceSensitivity' | 'waitSensitivity' | 'qualityWeight'>;
  /** Service, comfort and consistency bonuses/penalties. */
  service: number;
}

export interface SatisfactionResult {
  value: number;
  tasteTerm: number;
  pricePenalty: number;
  valueBonus: number;
  waitPenalty: number;
  service: number;
}

/**
 * Satisfaction (0..100) = taste (weighted by how much this customer cares)
 *   − price above fair value (and near their budget) + value-for-money bonus
 *   − waiting beyond patience + service/consistency.
 */
export function satisfactionFor(i: SatisfactionInput): SatisfactionResult {
  const B = BALANCE.satisfaction;
  const tasteTerm = 50 + (i.taste - 50) * i.type.qualityWeight;
  const ratio = i.price / Math.max(1, i.fair);
  const pricePenalty = Math.max(0, ratio - B.priceFree) * B.pricePerUnit * i.type.priceSensitivity + Math.max(0, i.price / Math.max(1, i.budget) - B.budgetFree) * B.budgetPerUnit;
  const valueBonus = Math.min(B.valueMax, Math.max(0, B.valueBelow - ratio) * B.valuePerUnit);
  const waitPenalty = Math.max(0, i.waited / Math.max(1, i.patience) - B.waitFree) * B.waitPerUnit * i.type.waitSensitivity;
  const value = clamp(tasteTerm - pricePenalty + valueBonus - waitPenalty + i.service, 0, 100);
  return { value, tasteTerm, pricePenalty, valueBonus, waitPenalty, service: i.service };
}

/** Tip chance: zero below the threshold, rising steeply for delighted customers. */
export function tipChance(satisfaction: number, tipMult: number, tipService: number): number {
  const T = BALANCE.tips;
  if (satisfaction < T.minSatisfaction || tipMult <= 0) return 0;
  const x = (satisfaction - T.minSatisfaction) / (100 - T.minSatisfaction);
  return clamp(T.maxChance * Math.pow(x, T.curve) * tipMult * tipService, 0, 0.9);
}

/** Tip amount: a small share of the price, rounded to Rp 100, capped at 30% of the price and Rp 5.000. */
export function tipAmount(price: number, premium: boolean, r: number): number {
  const T = BALANCE.tips;
  const share = T.shareMin + (T.shareMax - T.shareMin) * r;
  const cap = Math.min(price * T.capShare, T.capAmount);
  const raw = Math.round((price * share * (premium ? T.premiumMult : 1)) / 100) * 100;
  return Math.max(T.minAmount, Math.min(Math.floor(cap / 100) * 100, raw));
}

/** Probability that a satisfied newcomer becomes a regular. */
export function repeatChance(satisfaction: number): number {
  const R = BALANCE.regulars;
  if (satisfaction < R.minSatisfaction) return 0;
  return R.joinBase + (R.joinSpan * (satisfaction - R.minSatisfaction)) / (100 - R.minSatisfaction);
}

/**
 * Applies a popularity change, respecting the daily caps so popularity moves
 * gradually. Returns the change actually applied.
 */
export function adjustPopularity(s: GameState, locationId: LocationId, delta: number): number {
  const P = BALANCE.popularity;
  const l = s.today;
  const prog = s.locations[locationId];
  let d = delta;
  if (d > 0) {
    d = Math.min(d, Math.max(0, P.maxGainPerDay - l.popGain));
    l.popGain += d;
  } else if (d < 0) {
    d = -Math.min(-d, Math.max(0, P.maxLossPerDay - l.popLoss));
    l.popLoss -= d;
  }
  const before = prog.popularity;
  prog.popularity = clamp(prog.popularity + d, 0, 100);
  return prog.popularity - before;
}
