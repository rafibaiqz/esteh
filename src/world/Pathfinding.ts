import type { GameMap, Point } from './Map';

/**
 * A* over walkable tiles with 8-way movement (diagonals only when both
 * adjacent orthogonal tiles are walkable, so nobody cuts through corners of
 * buildings). Results are cached per map since routes repeat constantly.
 */
export class Pathfinder {
  private cache = new Map<string, Point[] | null>();
  private readonly n: number;
  private g: Float32Array;
  private f: Float32Array;
  private from: Int32Array;
  private state: Uint8Array; // 0 = unseen, 1 = open, 2 = closed

  constructor(private readonly map: GameMap) {
    this.n = map.width * map.height;
    this.g = new Float32Array(this.n);
    this.f = new Float32Array(this.n);
    this.from = new Int32Array(this.n);
    this.state = new Uint8Array(this.n);
  }

  find(a: Point, b: Point): Point[] | null {
    const key = `${a.x},${a.y}>${b.x},${b.y}`;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit ? hit.slice() : null;
    const res = this.search(a, b);
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(key, res);
    return res ? res.slice() : null;
  }

  private search(a: Point, b: Point): Point[] | null {
    const m = this.map;
    const W = m.width;
    // Allow starting on a non-walkable tile (e.g. the queue spot) but not ending on one.
    if (!m.walkable(b.x, b.y)) return null;
    const start = a.y * W + a.x;
    const goal = b.y * W + b.x;
    this.state.fill(0);
    const open: number[] = [start];
    this.g[start] = 0;
    this.f[start] = heuristic(a.x, a.y, b.x, b.y);
    this.from[start] = -1;
    this.state[start] = 1;

    while (open.length) {
      // Linear scan is fine on a 24×24 grid.
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (this.f[open[i]] < this.f[open[bi]]) bi = i;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (cur === goal) return this.rebuild(goal);
      this.state[cur] = 2;
      const cx = cur % W;
      const cy = (cur - cx) / W;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (!m.walkable(nx, ny)) continue;
          if (dx && dy && (!m.walkable(cx + dx, cy) || !m.walkable(cx, cy + dy))) continue;
          const ni = ny * W + nx;
          if (this.state[ni] === 2) continue;
          const cost = this.g[cur] + (dx && dy ? 1.414 : 1);
          if (this.state[ni] === 1 && cost >= this.g[ni]) continue;
          this.g[ni] = cost;
          this.f[ni] = cost + heuristic(nx, ny, b.x, b.y);
          this.from[ni] = cur;
          if (this.state[ni] !== 1) {
            this.state[ni] = 1;
            open.push(ni);
          }
        }
    }
    return null;
  }

  private rebuild(goal: number): Point[] {
    const W = this.map.width;
    const out: Point[] = [];
    for (let i = goal; i !== -1; i = this.from[i]) out.push({ x: i % W, y: Math.floor(i / W) });
    return out.reverse();
  }
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
}
