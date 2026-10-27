import { BALANCE } from '../data/balance';
import { CAMPAIGNS, STAFF } from '../data/business';
import { BASE_CLOSE_HOUR, LOCATIONS } from '../data/locations';
import { CARTS } from '../data/carts';
import type { GameState, Ingredient, LocationId } from '../game/types';

/** Seconds (simulated) to prepare one cup with the basic cart and no help. */
export const BASE_SERVICE_TIME = BALANCE.service.baseTime;

/**
 * Every gameplay parameter influenced by carts, equipment and staff, computed
 * in one place so that UI, simulation and tooltips always agree.
 */
export interface Modifiers {
  capacity: Record<Ingredient, number>;
  serviceTime: number;
  queueCapacity: number;
  attraction: number;
  viewRadius: number;
  tasteBonus: number;
  coldBonus: number;
  satBonus: number;
  shadeBonus: number;
  rainResist: number;
  /** Brewing consistency / freshness bonus to satisfaction (see BALANCE.satisfaction). */
  consistency: number;
  hasDispenser: boolean;
  hasIceStorage: boolean;
  hasCooler: boolean;
  /** Multiplier on tip probability from attentive service. */
  tipService: number;
  iceMelt: number;
  lemonSpoil: number;
  closeHour: number;
  popGainMult: number;
  popDecay: number;
  patienceMult: number;
  budgetMult: number;
  maintenance: number;
  wages: number;
  /** Multipliers on joining / visiting as a regular customer. */
  regularJoinMult: number;
  regularVisitMult: number;
  /** True when the active cart has its own roof (umbrella/tarp not used). */
  roofed: boolean;
}

export function getModifiers(s: GameState): Modifiers {
  const cart = CARTS[s.activeCart] ?? CARTS.gerobak;
  const has = (u: GameState['upgrades'][number]) => s.upgrades.includes(u);
  const staff = (r: GameState['staff'][number]) => s.staff.includes(r);
  // A supervisor amplifies the other staff effects by 10%.
  const amp = staff('supervisor') ? 1.1 : 1;
  const loc = LOCATIONS[s.locationId];
  // Umbrella and tarp only make sense on open carts; roofed carts have built-in shelter.
  const open = !cart.roofed;
  const umbrella = open && has('payung');

  let service = BASE_SERVICE_TIME * cart.serviceMult;
  if (has('dispenser')) service *= 0.8;
  if (has('mejaRacik')) service *= 0.9;
  if (has('qris')) service *= 0.85;
  if (has('seduh')) service *= 0.9;
  if (has('wadahTeh')) service *= 0.95;
  if (has('dispenserGula')) service *= 0.95;
  if (has('rakGelas')) service *= 0.95;
  if (staff('peracik')) service *= 1 - 0.25 * amp;
  if (staff('kasir')) service *= 1 - 0.15 * amp;

  let attraction = cart.attraction;
  if (umbrella) attraction *= 1.1;
  if (has('papanNama')) attraction *= 1.15;
  if (has('papanMenu')) attraction *= 1.05;
  if (has('lampuHias')) attraction *= 1.08;
  if (staff('penjual')) attraction *= 1 + 0.12 * amp;

  const capacity = { ...cart.capacity };
  if (has('cooler')) capacity.ice = Math.round(capacity.ice * 1.5);
  if (has('wadahTeh')) capacity.tea = Math.round(capacity.tea * 1.4);
  if (has('dispenserGula')) capacity.sugar = Math.round(capacity.sugar * 1.3);
  if (has('rakGelas')) capacity.cups = Math.round(capacity.cups * 1.5);

  const baseMelt = has('cooler') ? BALANCE.spoilage.iceMelt.cooler : has('kotakEs') ? BALANCE.spoilage.iceMelt.kotakEs : BALANCE.spoilage.iceMelt.none;
  const rain = (umbrella ? 0.3 : 0) + (open && has('terpal') ? 0.25 : 0) + (cart.roofed ? (cart.look.kind === 'truck' ? 0.45 : 0.4) : 0);

  return {
    capacity,
    serviceTime: service,
    queueCapacity: cart.queue + (has('mejaRacik') ? 2 : 0) + (staff('kasir') ? 2 : 0) + (has('tiangAntre') ? 3 : 0),
    attraction,
    viewRadius: 4 + (has('papanNama') ? 2 : 0) + cart.viewBonus,
    tasteBonus: cart.tasteBonus + (has('dispenser') ? 5 : 0) + (has('takaran') ? 3 : 0) + (has('seduh') ? 2 : 0) + (has('dispenserGula') ? 1 : 0) + (has('kontrolMutu') ? 1 : 0),
    coldBonus: has('cooler') ? 4 : 0,
    satBonus: (staff('supervisor') ? 4 : 0) + (has('kontrolMutu') ? 2 : 0),
    // Shade on sunny days: an umbrella on open carts, the roof on kiosks/trucks.
    shadeBonus: umbrella || cart.roofed ? 4 : 0,
    rainResist: Math.min(0.6, rain),
    consistency: has('dispenser') ? BALANCE.satisfaction.dispenserConsistency : 0,
    hasDispenser: has('dispenser'),
    hasIceStorage: has('kotakEs') || has('cooler') || cart.iceMelt < 1,
    hasCooler: has('cooler'),
    tipService:
      1 +
      (staff('penjual') ? BALANCE.tips.service.penjual : 0) +
      (staff('supervisor') ? BALANCE.tips.service.supervisor : 0) +
      (has('qris') ? BALANCE.tips.service.qris : 0),
    iceMelt: baseMelt * cart.iceMelt,
    lemonSpoil: has('cooler') ? BALANCE.spoilage.lemonWilt.cooler : BALANCE.spoilage.lemonWilt.none,
    closeHour: has('lampu') ? 21 : BASE_CLOSE_HOUR,
    popGainMult: (has('papanNama') ? 1.2 : 1) * (loc.bonus.popGain ?? 1) * cart.popGain,
    popDecay: staff('supervisor') ? BALANCE.popularity.decaySupervisor : BALANCE.popularity.decay,
    patienceMult: (staff('penjual') ? 1 + 0.15 * amp : 1) * (has('tiangAntre') ? 1.15 : 1) * (loc.patienceMult ?? 1),
    budgetMult: (has('qris') ? 1.05 : 1) * (has('papanMenu') ? 1.04 : 1),
    maintenance: Math.round(cart.maintenance * (has('rodaKaret') ? 0.6 : 1)),
    wages: s.staff.reduce((sum, r) => sum + STAFF[r].wage, 0),
    regularJoinMult: has('kartuStempel') ? 1.4 : 1,
    regularVisitMult: has('kartuStempel') ? 1.2 : 1,
    roofed: cart.roofed,
  };
}

export interface AdEffect {
  awareness: number;
  interestMult: number;
  trafficMult: number;
  active: number;
}

/**
 * Marketing has diminishing returns: awareness points saturate following
 * 1 - e^(-A/35), so stacking campaigns helps less and less.
 */
export function adEffect(s: GameState, locationId: LocationId = s.locationId): AdEffect {
  const active = s.campaigns.filter((c) => c.locationId === locationId && c.daysLeft > 0);
  const awareness = active.reduce((sum, c) => sum + CAMPAIGNS[c.id].awareness, 0);
  const sat = 1 - Math.exp(-awareness / 35);
  return { awareness, interestMult: 1 + 0.6 * sat, trafficMult: 1 + 0.35 * sat, active: active.length };
}
