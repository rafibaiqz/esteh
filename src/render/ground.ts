import type { GameMap } from '../world/Map';
import { TH, TW, type Tile } from '../world/Tile';
import { P, poly, shade, type Ctx } from './draw';

const BASE: Record<Tile['type'], string> = {
  grass: '#5ea53f',
  lawn: '#67b347',
  road: '#4b4f55',
  cross: '#4b4f55',
  walk: '#d3ccbd',
  path: '#d9c08b',
  plaza: '#dccfb6',
  water: '#3f8fd2',
  field: '#cdb07a',
  market: '#b9ad99',
  parking: '#5d6066',
  sand: '#ead79c',
  garden: '#4c8c34',
  dirt: '#9b7b52',
  beach: '#f0dba2',
  deck: '#b78a58',
};

/** Thickness of the diorama-style earth slab under the map. */
export const SLAB = 10;

/** Pixel extents of a map's ground in iso space (origin = tile (0,0) top corner). */
export function groundBounds(map: GameMap) {
  const left = -map.height * (TW / 2);
  const right = map.width * (TW / 2);
  const bottom = (map.width + map.height) * (TH / 2) + SLAB;
  return { left, right, top: 0, bottom, width: right - left, height: bottom };
}

function tileColor(t: Tile, x: number, y: number): string {
  const base = BASE[t.type];
  switch (t.type) {
    case 'grass':
      return shade(base, (t.n - 0.5) * 0.12);
    case 'lawn':
      return (x + y) % 2 ? base : shade(base, -0.05);
    case 'plaza':
      return (x + y) % 2 ? base : shade(base, -0.06);
    case 'market':
      return shade(base, (t.n - 0.5) * 0.1);
    default:
      return base;
  }
}

/** Renders the static ground layer (tiles, markings, map slab) into a canvas. */
export function renderGround(map: GameMap): HTMLCanvasElement {
  const b = groundBounds(map);
  const c = document.createElement('canvas');
  c.width = Math.ceil(b.width);
  c.height = Math.ceil(b.height + 2);
  const ctx = c.getContext('2d')!;
  ctx.translate(-b.left, 0);

  // Earth slab along the two front edges.
  const W = map.width;
  const H = map.height;
  poly(ctx, [P(0, H), P(W, H), [P(W, H)[0], P(W, H)[1] + SLAB], [P(0, H)[0], P(0, H)[1] + SLAB]], '#6b4a2f');
  poly(ctx, [P(W, 0), P(W, H), [P(W, H)[0], P(W, H)[1] + SLAB], [P(W, 0)[0], P(W, 0)[1] + SLAB]], '#55391f');
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < W; i += 2) {
    const [sx, sy] = P(i, H);
    ctx.fillRect(sx + 4, sy + 4, 3, 2);
  }

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = map.tile(x, y)!;
      const col = tileColor(t, x, y);
      poly(ctx, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], col);
      detail(ctx, map, t, x, y, col);
    }
  shadows(ctx, map);
  return c;
}

/**
 * Soft cast shadows of buildings and trees, baked into the ground layer.
 * Light comes from the upper-left of the screen, so shadows fall towards +x
 * (lower-right) and slightly back (−y), proportional to the object's height.
 */
function shadows(ctx: Ctx, map: GameMap): void {
  ctx.fillStyle = 'rgba(40,24,10,0.2)';
  for (const st of map.structures) {
    if (st.kind === 'rival' || st.kind === 'fountain') continue;
    const h = st.kind === 'stall' ? 20 : st.height + (st.roofStyle === 'flat' ? 0 : 8 + Math.min(st.w, st.h) * 4);
    const o = Math.min(2.6, h / 26);
    const k = 0.35;
    const x0 = st.x;
    const y0 = st.y;
    const x1 = st.x + st.w;
    const y1 = st.y + st.h;
    poly(ctx, [P(x0, y0), P(x0 + o, y0 - k * o), P(x1 + o, y0 - k * o), P(x1 + o, y1 - k * o), P(x1, y1), P(x0, y1)], 'rgba(40,24,10,0.2)');
  }
  for (const p of map.props) {
    const big = p.kind === 'tree' || p.kind === 'pine' || p.kind === 'palm' || p.kind === 'banyan';
    if (!big) continue;
    const r = p.kind === 'banyan' ? 1.4 : 0.5;
    const [sx, sy] = P(p.x + r * 0.9, p.y - r * 0.3);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 16 * r * 1.3, 7 * r * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function detail(ctx: Ctx, map: GameMap, t: Tile, x: number, y: number, col: string): void {
  switch (t.type) {
    case 'grass':
    case 'lawn': {
      if (t.n > 0.55) {
        ctx.fillStyle = shade(col, 0.18);
        const [sx, sy] = P(x + 0.3 + t.n * 0.4, y + 0.6 - t.n * 0.3);
        ctx.fillRect(sx, sy, 1, 2);
        ctx.fillRect(sx + 2, sy + 1, 1, 2);
      }
      if (t.n < 0.08) {
        const [sx, sy] = P(x + 0.5, y + 0.5);
        ctx.fillStyle = ['#f7e15a', '#ffffff', '#f08fb5'][Math.floor(t.n * 37) % 3];
        ctx.fillRect(sx, sy, 2, 2);
      }
      break;
    }
    case 'walk': {
      // Paving slabs and a curb towards the road.
      poly(ctx, [P(x + 0.5, y), P(x + 0.5, y + 1)], undefined, 'rgba(0,0,0,0.08)');
      poly(ctx, [P(x, y + 0.5), P(x + 1, y + 0.5)], undefined, 'rgba(0,0,0,0.08)');
      curb(ctx, map, x, y);
      break;
    }
    case 'plaza': {
      poly(ctx, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], undefined, 'rgba(0,0,0,0.06)');
      break;
    }
    case 'path': {
      ctx.fillStyle = shade(col, -0.12);
      for (let i = 0; i < 3; i++) {
        const [sx, sy] = P(x + ((t.n * (i + 3) * 7) % 1), y + ((t.n * (i + 5) * 3) % 1));
        ctx.fillRect(sx, sy, 2, 1);
      }
      break;
    }
    case 'road':
      roadMarks(ctx, map, t, x, y);
      break;
    case 'cross':
      zebra(ctx, t, x, y);
      break;
    case 'water': {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      const [sx, sy] = P(x + 0.3 + t.n * 0.3, y + 0.5);
      ctx.fillRect(sx, sy, 5, 1);
      edgeOutline(ctx, map, x, y, 'water', '#2c6aa3');
      break;
    }
    case 'parking': {
      if (x % 2 === 0) poly(ctx, [P(x, y + 0.1), P(x, y + 0.9)], undefined, 'rgba(255,255,255,0.6)');
      break;
    }
    case 'field': {
      if (t.n > 0.7) {
        ctx.fillStyle = shade(col, -0.1);
        const [sx, sy] = P(x + 0.5, y + 0.4);
        ctx.fillRect(sx, sy, 3, 1);
      }
      break;
    }
    case 'garden': {
      const colors = ['#f25c78', '#ffd23f', '#ffffff', '#c86bfa'];
      for (let i = 0; i < 4; i++) {
        const [sx, sy] = P(x + 0.2 + ((i * 0.27 + t.n) % 0.7), y + 0.2 + ((i * 0.41 + t.n * 2) % 0.7));
        ctx.fillStyle = colors[(i + Math.floor(t.n * 10)) % 4];
        ctx.fillRect(sx, sy, 2, 2);
      }
      break;
    }
    case 'beach': {
      ctx.fillStyle = shade(col, -0.08);
      const [bx, by] = P(x + 0.3 + t.n * 0.4, y + 0.2 + ((t.n * 7) % 0.6));
      ctx.fillRect(bx, by, 1, 1);
      ctx.fillRect(bx + 4, by + 2, 1, 1);
      if (map.tile(x + 1, y)?.type === 'water' || map.tile(x, y + 1)?.type === 'water') {
        ctx.fillStyle = shade(col, -0.18);
        const [wx, wy] = P(x + 0.5, y + 0.5);
        ctx.fillRect(wx - 6, wy + 2, 12, 1);
      }
      break;
    }
    case 'deck': {
      // Wooden planks running across the walkway.
      for (const k of [0.25, 0.5, 0.75]) poly(ctx, [P(x + k, y), P(x + k, y + 1)], undefined, shade(col, -0.25));
      break;
    }
    case 'market': {
      if (t.n > 0.8) {
        ctx.fillStyle = 'rgba(70,50,30,0.15)';
        const [sx, sy] = P(x + 0.4, y + 0.5);
        ctx.fillRect(sx - 3, sy, 6, 2);
      }
      break;
    }
    default:
      break;
  }
}

function isRoadLike(map: GameMap, x: number, y: number): boolean {
  const t = map.tile(x, y);
  return !!t && (t.type === 'road' || t.type === 'cross');
}

function curb(ctx: Ctx, map: GameMap, x: number, y: number): void {
  // Raised curb: a light top edge plus a darker vertical face dropping to the road.
  ctx.lineWidth = 1;
  const top = '#efe7d6';
  const face = '#8f8678';
  if (isRoadLike(map, x, y + 1)) {
    poly(ctx, [P(x, y + 1), P(x + 1, y + 1)], undefined, top);
    poly(ctx, [P(x, y + 1), P(x + 1, y + 1), [P(x + 1, y + 1)[0], P(x + 1, y + 1)[1] + 2], [P(x, y + 1)[0], P(x, y + 1)[1] + 2]], face);
  }
  if (isRoadLike(map, x + 1, y)) {
    poly(ctx, [P(x + 1, y), P(x + 1, y + 1)], undefined, top);
    poly(ctx, [P(x + 1, y), P(x + 1, y + 1), [P(x + 1, y + 1)[0], P(x + 1, y + 1)[1] + 2], [P(x + 1, y)[0], P(x + 1, y)[1] + 2]], shade(face, -0.15));
  }
  if (isRoadLike(map, x, y - 1)) poly(ctx, [P(x, y), P(x + 1, y)], undefined, '#a39a8b');
  if (isRoadLike(map, x - 1, y)) poly(ctx, [P(x, y), P(x, y + 1)], undefined, '#a39a8b');
}

function edgeOutline(ctx: Ctx, map: GameMap, x: number, y: number, type: Tile['type'], color: string): void {
  const same = (i: number, j: number) => map.tile(i, j)?.type === type;
  if (!same(x, y - 1)) poly(ctx, [P(x, y), P(x + 1, y)], undefined, color);
  if (!same(x - 1, y)) poly(ctx, [P(x, y), P(x, y + 1)], undefined, color);
  if (!same(x, y + 1)) poly(ctx, [P(x, y + 1), P(x + 1, y + 1)], undefined, '#e6f3fb');
  if (!same(x + 1, y)) poly(ctx, [P(x + 1, y), P(x + 1, y + 1)], undefined, '#e6f3fb');
}

function roadMarks(ctx: Ctx, map: GameMap, t: Tile, x: number, y: number): void {
  ctx.lineWidth = 1;
  const walkAt = (i: number, j: number) => {
    const n = map.tile(i, j);
    return !!n && n.type !== 'road' && n.type !== 'cross';
  };
  // Solid edge lines a little inside the curb.
  const edge = 'rgba(240,236,224,0.55)';
  if (t.road === 'h') {
    if (walkAt(x, y - 1)) poly(ctx, [P(x, y + 0.12), P(x + 1, y + 0.12)], undefined, edge);
    if (walkAt(x, y + 1)) poly(ctx, [P(x, y + 0.88), P(x + 1, y + 0.88)], undefined, edge);
  } else if (t.road === 'v') {
    if (walkAt(x - 1, y)) poly(ctx, [P(x + 0.12, y), P(x + 0.12, y + 1)], undefined, edge);
    if (walkAt(x + 1, y)) poly(ctx, [P(x + 0.88, y), P(x + 0.88, y + 1)], undefined, edge);
  }
  if (t.road === 'h' && map.tile(x, y + 1)?.road === 'h') {
    // Dashed centre line on the boundary between the two lanes.
    poly(ctx, [P(x + 0.2, y + 1), P(x + 0.6, y + 1)], undefined, '#e8d36b');
  }
  if (t.road === 'v' && map.tile(x + 1, y)?.road === 'v') {
    poly(ctx, [P(x + 1, y + 0.2), P(x + 1, y + 0.6)], undefined, '#e8d36b');
  }
  // Subtle asphalt texture
  if (t.n > 0.85) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    const [sx, sy] = P(x + 0.5, y + 0.5);
    ctx.fillRect(sx - 2, sy, 3, 1);
  }
}

function zebra(ctx: Ctx, t: Tile, x: number, y: number): void {
  const stripes = [0.08, 0.36, 0.64];
  for (const s of stripes) {
    if (t.road === 'h') {
      // Walking along x across a road running along y: bars run with the traffic (along y).
      poly(ctx, [P(x + s, y + 0.1), P(x + s + 0.2, y + 0.1), P(x + s + 0.2, y + 0.9), P(x + s, y + 0.9)], '#eeeeee');
    } else {
      poly(ctx, [P(x + 0.1, y + s), P(x + 0.9, y + s), P(x + 0.9, y + s + 0.2), P(x + 0.1, y + s + 0.2)], '#eeeeee');
    }
  }
}
