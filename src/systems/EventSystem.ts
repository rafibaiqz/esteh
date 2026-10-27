import type { CustomerTypeId } from '../data/customers';
import { EVENTS, EVENT_BY_ID, NEUTRAL_HEADLINES, type EventEffect, type NewsEventDef } from '../data/events';
import { LOCATIONS } from '../data/locations';
import type { ActiveEvent, GameState, Ingredient, LocationId } from '../game/types';
import { dayOfMonth, dayOfWeek } from '../util/calendar';
import { mulberry32, weightedPick } from '../util/rng';

export interface ResolvedEffect {
  traffic: number;
  thirst: number;
  budget: number;
  priceSensitivity: number;
  competition: number;
  sugarPref: number;
  segments: CustomerTypeId[] | null;
  segmentTraffic: number;
  supply: Partial<Record<Ingredient, number>>;
  popularityGain: number;
}

const NONE: ResolvedEffect = {
  traffic: 1,
  thirst: 1,
  budget: 1,
  priceSensitivity: 1,
  competition: 0,
  sugarPref: 0,
  segments: null,
  segmentTraffic: 1,
  supply: {},
  popularityGain: 1,
};

/** Picks today's headline. Deterministic per save seed and day; never all-good. */
export function rollEvent(s: GameState): ActiveEvent {
  const rng = mulberry32((s.rngSeed ^ Math.imul(s.day, 2246822519) ^ 0x5eed) >>> 0);
  const ctx = { weather: s.weather, dayOfWeek: dayOfWeek(s.day), dayOfMonth: dayOfMonth(s.day) };
  const eligible = EVENTS.filter((e) => !e.when || e.when(ctx));
  const def = weightedPick(
    eligible.map((e) => ({ value: e, weight: e.weight })),
    rng(),
  );
  let locationId: LocationId | null = null;
  if (def.scope === 'random') {
    const pool = s.unlockedLocations;
    locationId = pool[Math.floor(rng() * pool.length)];
  } else if (def.scope !== 'all') locationId = def.scope;
  let headline = def.headline;
  if (def.id === 'biasa') headline = NEUTRAL_HEADLINES[Math.floor(rng() * NEUTRAL_HEADLINES.length)];
  else if (def.scope === 'random' && locationId) headline = `${def.headline} (${LOCATIONS[locationId].name})`;
  return { id: def.id, locationId, headline };
}

export function eventDef(s: GameState): NewsEventDef {
  return EVENT_BY_ID[s.event?.id] ?? EVENT_BY_ID.biasa;
}

export function eventAppliesTo(s: GameState, locationId: LocationId): boolean {
  const def = eventDef(s);
  if (def.scope === 'all') return true;
  return s.event.locationId === locationId;
}

/** The effect of today's event at a location (neutral if it doesn't apply there). */
export function eventEffect(s: GameState, locationId: LocationId = s.locationId): ResolvedEffect {
  const def = eventDef(s);
  if (!eventAppliesTo(s, locationId)) return NONE;
  const e: EventEffect = { ...def.effect, ...(def.byLocation?.[locationId] ?? {}) };
  return {
    traffic: e.traffic ?? 1,
    thirst: e.thirst ?? 1,
    budget: e.budget ?? 1,
    priceSensitivity: e.priceSensitivity ?? 1,
    competition: e.competition ?? 0,
    sugarPref: e.sugarPref ?? 0,
    segments: e.segments ?? null,
    segmentTraffic: e.segmentTraffic ?? 1,
    supply: e.supply ?? {},
    popularityGain: e.popularityGain ?? 1,
  };
}

/** Budget multiplier for one customer type (segment events only touch their segments). */
export function eventBudgetFor(e: ResolvedEffect, type: CustomerTypeId): number {
  if (e.segments && !e.segments.includes(type)) return 1;
  return e.budget;
}

/** Crowd-weight multiplier for one customer type. */
export function eventCrowdWeight(e: ResolvedEffect, type: CustomerTypeId): number {
  return e.segments && e.segments.includes(type) ? e.segmentTraffic : 1;
}

/** Supplier price multiplier today (supply events apply city-wide). */
export function eventSupplyMult(s: GameState, id: Ingredient): number {
  const def = eventDef(s);
  return def.effect.supply?.[id] ?? 1;
}

export function eventScopeText(s: GameState): string {
  const def = eventDef(s);
  if (def.id === 'biasa') return '';
  if (def.scope === 'all') return def.byLocation ? 'Berlaku di semua lokasi (dampak berbeda tiap lokasi)' : 'Berlaku di semua lokasi';
  return s.event.locationId ? `Berlaku di ${LOCATIONS[s.event.locationId].name}` : '';
}
