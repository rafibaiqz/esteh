import { buildMap } from '../data/maps';
import type { LocationId } from '../game/types';
import { mulberry32 } from '../util/rng';
import { Pathfinder } from '../world/Pathfinding';
import { pickRoute, routeExposure } from '../world/Routes';

export interface ExposureStats {
  /** Share of pedestrians whose route brings the cart into view. */
  share: number;
  /** Average proximity factor among them. */
  prox: number;
  /** Average route length in tiles (how long a walk across the neighbourhood takes). */
  avgPath: number;
}

/** View radius (tiles) of a plain cart without signboard or cart bonus. */
export const BASE_VIEW_RADIUS = 4;

/**
 * How strongly passers-by noticed the cart on the original 24×24
 * neighbourhoods: share who saw it × average proximity, at the base view
 * radius. Each location's traffic and prices were balanced against these
 * numbers, so the larger maps keep the same flow of potential customers by
 * scaling arrivals by reference ÷ measured. The extra pedestrians are the
 * ones who walk the new streets further away from the cart.
 */
const REFERENCE_EXPOSURE: Record<LocationId, number> = {
  asri: 0.869,
  sekolah: 0.714,
  kampus: 0.488,
  taman: 0.411,
  terminal: 0.388,
  kota: 0.567,
  alunalun: 0.596,
  perkantoran: 0.645,
  pasar: 0.609,
  pantai: 0.57,
  premium: 0.65,
};

const exposureCache = new Map<string, ExposureStats>();

/** How many passers-by see the cart, measured by sampling the same routes the simulation uses. */
export function exposureFor(locationId: LocationId, viewRadius: number): ExposureStats {
  const key = `${locationId}:${viewRadius}`;
  const hit = exposureCache.get(key);
  if (hit) return hit;
  const map = buildMap(locationId);
  const pf = new Pathfinder(map);
  const rng = mulberry32(0x51ed + viewRadius * 977 + locationId.length * 131);
  let seen = 0;
  let prox = 0;
  const N = 500;
  let n = 0;
  let len = 0;
  for (let i = 0; i < N; i++) {
    const r = pickRoute(map, pf, rng);
    if (!r) continue;
    n++;
    len += r.path.length;
    const e = routeExposure(map, r.path, viewRadius);
    if (e) {
      seen++;
      prox += e.proximity;
    }
  }
  const res = { share: n ? seen / n : 0, prox: seen ? prox / seen : 0, avgPath: n ? len / n : 20 };
  exposureCache.set(key, res);
  return res;
}

/**
 * Multiplier on pedestrian arrivals for a location so that, whatever the map
 * size, the same number of people pass within view of the cart as the
 * location's traffic figure was balanced for.
 */
export function trafficScale(locationId: LocationId): number {
  const e = exposureFor(locationId, BASE_VIEW_RADIUS);
  return REFERENCE_EXPOSURE[locationId] / Math.max(0.05, e.share * e.prox);
}
