import { WALKABLE, type Tile } from './Tile';

export type StructureKind =
  | 'house'
  | 'shop'
  | 'office'
  | 'school'
  | 'hall'
  | 'stall'
  | 'warung'
  | 'rival'
  | 'fountain'
  | 'gazebo'
  | 'busstop'
  | 'pos'
  | 'playground'
  | 'tower'
  | 'pendopo'
  | 'lifeguard';

export type Face = 'left' | 'right';

/** A box-shaped object occupying a rectangular footprint of tiles. */
export interface Structure {
  kind: StructureKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Wall height in pixels. */
  height: number;
  wall: string;
  roof: string;
  roofStyle: 'gable' | 'hip' | 'flat';
  /** Which visible face carries the door / shop front. */
  face: Face;
  sign?: string;
  awning?: string;
  /** Second accent colour (stripes, trim). */
  accent?: string;
  /** Number of storeys, used for window rows. */
  floors?: number;
}

export type PropKind =
  | 'tree'
  | 'palm'
  | 'pine'
  | 'bush'
  | 'flowers'
  | 'lamp'
  | 'bench'
  | 'fenceX'
  | 'fenceY'
  | 'hydrant'
  | 'bin'
  | 'motor'
  | 'car'
  | 'flag'
  | 'pole'
  | 'rock'
  | 'umbrella'
  | 'crate'
  | 'pot'
  | 'banyan'
  | 'bus'
  | 'beachChair'
  | 'planter';

/** A small decoration anchored to a tile (offset in tile units). */
export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  color?: string;
}

export interface Lane {
  axis: 'x' | 'y';
  /** Coordinate of the lane centre on the other axis. */
  at: number;
  dir: 1 | -1;
  from: number;
  to: number;
}

export interface CartSpot {
  /** Tile the cart stands on (not walkable). */
  x: number;
  y: number;
  /** Walkable tile where the customer being served stands. */
  serveX: number;
  serveY: number;
  /** Direction (unit tile vector) along which the queue grows from the serve tile. */
  qdx: number;
  qdy: number;
  /** Which way the cart's service side faces (for drawing). */
  face: Face;
}

export interface Point {
  x: number;
  y: number;
}

export class GameMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: Tile[];
  readonly structures: Structure[] = [];
  readonly props: Prop[] = [];
  readonly lanes: Lane[] = [];
  /** Tiles where pedestrians appear/disappear (map edges, doorways). */
  readonly spawns: Point[] = [];
  /** Points of interest pedestrians like to pass through (plazas, shop fronts, gates). */
  readonly pois: Point[] = [];
  /** Tiles blocked by structures or the cart. */
  readonly blocked: Uint8Array;
  cart: CartSpot = { x: 0, y: 0, serveX: 1, serveY: 0, qdx: 0, qdy: 1, face: 'left' };
  background = '#3f7d3a';

  constructor(width: number, height: number, fill: Tile['type']) {
    this.width = width;
    this.height = height;
    this.tiles = Array.from({ length: width * height }, (_, i) => ({ type: fill, n: hashNoise(i) }));
    this.blocked = new Uint8Array(width * height);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  tile(x: number, y: number): Tile | undefined {
    return this.inBounds(x, y) ? this.tiles[y * this.width + x] : undefined;
  }

  walkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const i = y * this.width + x;
    return WALKABLE[this.tiles[i].type] && !this.blocked[i];
  }

  /** Recomputes blocking after structures and cart are placed. */
  finalize(): void {
    this.blocked.fill(0);
    for (const s of this.structures) {
      for (let y = s.y; y < s.y + s.h; y++)
        for (let x = s.x; x < s.x + s.w; x++) if (this.inBounds(x, y)) this.blocked[y * this.width + x] = 1;
    }
    this.blocked[this.cart.y * this.width + this.cart.x] = 1;
    // Edge spawns: walkable tiles on the border of the map.
    const seen = new Set(this.spawns.map((p) => `${p.x},${p.y}`));
    for (let i = 0; i < this.width; i++) {
      for (const [x, y] of [
        [i, 0],
        [i, this.height - 1],
        [0, i],
        [this.width - 1, i],
      ]) {
        const k = `${x},${y}`;
        if (!seen.has(k) && this.walkable(x, y) && this.tile(x, y)!.type !== 'cross') {
          seen.add(k);
          this.spawns.push({ x, y });
        }
      }
    }
  }
}

function hashNoise(i: number): number {
  let h = (i * 2654435761) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h % 1000) / 1000;
}
