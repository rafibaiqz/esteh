import type { GameMap, Point } from './Map';
import type { Pathfinder } from './Pathfinding';

/** Share of pedestrians who stroll via a point of interest instead of going straight. */
export const POI_ROUTE_SHARE = 0.6;

export interface Route {
  from: Point;
  to: Point;
  path: Point[];
}

/**
 * Picks a pedestrian route: between two spawn points at least 8 tiles apart,
 * often passing a point of interest. Shared by the live simulation and the
 * forecast's exposure sampling so both see the same street behaviour.
 */
export function pickRoute(map: GameMap, pf: Pathfinder, rng: () => number, via?: Point): Route | null {
  const spawns = map.spawns;
  if (spawns.length < 2) return null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const a = spawns[Math.floor(rng() * spawns.length)];
    const b = spawns[Math.floor(rng() * spawns.length)];
    if (a === b || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 8) continue;
    let path = pf.find(a, b);
    const poi = via ?? (map.pois.length && rng() < POI_ROUTE_SHARE ? map.pois[Math.floor(rng() * map.pois.length)] : null);
    if (path && poi) {
      const p1 = pf.find(a, poi);
      const p2 = pf.find(poi, b);
      if (p1 && p2) path = p1.concat(p2.slice(1));
    }
    if (!path || path.length < 4) continue;
    return { from: a, to: b, path };
  }
  return null;
}

export interface Exposure {
  /** Path index where the customer evaluates the cart. */
  decideAt: number;
  /** 1 when walking right past the cart, fading to 0.4 at the edge of view. */
  proximity: number;
}

/** Where along a path the cart comes into view, or null if it never does. */
export function routeExposure(map: GameMap, path: Point[], viewRadius: number): Exposure | null {
  const cart = map.cart;
  const sx = cart.serveX + 0.5;
  const sy = cart.serveY + 0.5;
  let best = Infinity;
  let bestI = -1;
  let firstNear = -1;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const dd = Math.hypot(p.x + 0.5 - sx, p.y + 0.5 - sy);
    if (dd < best) {
      best = dd;
      bestI = i;
    }
    if (firstNear < 0 && dd <= 3) firstNear = i;
  }
  if (best > viewRadius) return null;
  return {
    decideAt: Math.max(1, firstNear >= 0 ? firstNear : bestI),
    proximity: best <= 2.5 ? 1 : 1 - ((best - 2.5) / Math.max(0.5, viewRadius - 2.5)) * 0.6,
  };
}
