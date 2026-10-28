import { GameMap, type CartSpot, type Face, type PropKind, type Structure } from './Map';
import type { TileType } from './Tile';

/**
 * Small authoring API for neighbourhood layouts: roads automatically get
 * sidewalks, crossings are generated where sidewalks meet roads, and lanes are
 * registered for edge-to-edge roads so traffic can drive through.
 *
 * `at(ox, oy)` shifts every later coordinate, so a block can be authored in
 * its own local grid and placed anywhere in a larger world. Roads whose start
 * or end is omitted always run to the edge of the whole map.
 */
export class MapBuilder {
  readonly map: GameMap;
  private readonly hRoads: { y: number; x0: number; x1: number }[] = [];
  private readonly vRoads: { x: number; y0: number; y1: number }[] = [];
  private ox = 0;
  private oy = 0;

  constructor(width: number, height: number, fill: TileType = 'grass') {
    this.map = new GameMap(width, height, fill);
  }

  get w(): number {
    return this.map.width;
  }
  get h(): number {
    return this.map.height;
  }

  /** Sets the origin for all following coordinates (in tiles). */
  at(ox: number, oy: number): this {
    this.ox = ox;
    this.oy = oy;
    return this;
  }

  /** Tile at local coordinates (respects `at`). */
  tileAt(x: number, y: number) {
    return this.map.tile(x + this.ox, y + this.oy);
  }

  private setAbs(x: number, y: number, type: TileType, road?: 'h' | 'v' | 'x'): void {
    const t = this.map.tile(x, y);
    if (t) {
      t.type = type;
      t.road = road;
    }
  }

  set(x: number, y: number, type: TileType, road?: 'h' | 'v' | 'x'): this {
    this.setAbs(x + this.ox, y + this.oy, type, road);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, type: TileType): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, type);
    return this;
  }

  /** Paints `type` only on tiles that currently have type `onlyOn`. */
  paintOver(x: number, y: number, w: number, h: number, type: TileType, onlyOn: TileType[]): this {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) {
        const t = this.tileAt(i, j);
        if (t && onlyOn.includes(t.type)) this.set(i, j, type);
      }
    return this;
  }

  private road(x: number, y: number, dir: 'h' | 'v'): void {
    const t = this.map.tile(x, y);
    if (!t) return;
    const isRoad = t.type === 'road' || t.type === 'cross';
    this.setAbs(x, y, 'road', isRoad && t.road !== dir ? 'x' : dir);
  }

  private walk(x: number, y: number): void {
    const t = this.map.tile(x, y);
    if (t && t.type !== 'road' && t.type !== 'cross') this.setAbs(x, y, 'walk');
  }

  /**
   * Two-lane road along x on rows y and y+1, with sidewalks on rows y-1 and y+2.
   * Omitted ends run to the map edge.
   */
  hRoad(yLocal: number, x0Local?: number, x1Local?: number, sidewalks: { top?: boolean; bottom?: boolean } = {}): this {
    const y = yLocal + this.oy;
    const x0 = x0Local === undefined ? 0 : x0Local + this.ox;
    const x1 = x1Local === undefined ? this.w - 1 : x1Local + this.ox;
    this.hRoads.push({ y, x0, x1 });
    for (let x = x0; x <= x1; x++) {
      this.road(x, y, 'h');
      this.road(x, y + 1, 'h');
    }
    for (let x = x0; x <= x1; x++) {
      if (sidewalks.top !== false) this.walk(x, y - 1);
      if (sidewalks.bottom !== false) this.walk(x, y + 2);
    }
    if (x0 === 0 && x1 === this.w - 1) {
      this.map.lanes.push({ axis: 'x', at: y + 0.5, dir: -1, from: x1 + 1, to: x0 - 1 });
      this.map.lanes.push({ axis: 'x', at: y + 1.5, dir: 1, from: x0 - 1, to: x1 + 1 });
    }
    return this;
  }

  /** Two-lane road along y on columns x and x+1, with sidewalks on columns x-1 and x+2. Omitted ends run to the map edge. */
  vRoad(xLocal: number, y0Local?: number, y1Local?: number, sidewalks: { left?: boolean; right?: boolean } = {}): this {
    const x = xLocal + this.ox;
    const y0 = y0Local === undefined ? 0 : y0Local + this.oy;
    const y1 = y1Local === undefined ? this.h - 1 : y1Local + this.oy;
    this.vRoads.push({ x, y0, y1 });
    for (let y = y0; y <= y1; y++) {
      this.road(x, y, 'v');
      this.road(x + 1, y, 'v');
    }
    for (let y = y0; y <= y1; y++) {
      if (sidewalks.left !== false) this.walk(x - 1, y);
      if (sidewalks.right !== false) this.walk(x + 2, y);
    }
    if (y0 === 0 && y1 === this.h - 1) {
      this.map.lanes.push({ axis: 'y', at: x + 0.5, dir: 1, from: y0 - 1, to: y1 + 1 });
      this.map.lanes.push({ axis: 'y', at: x + 1.5, dir: -1, from: y1 + 1, to: y0 - 1 });
    }
    return this;
  }

  /** Explicit zebra crossing over road tiles in a rectangle. */
  zebra(x: number, y: number, w: number, h: number, run: 'h' | 'v'): this {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) {
        const t = this.tileAt(i, j);
        if (t && (t.type === 'road' || t.type === 'cross')) this.set(i, j, 'cross', run);
      }
    return this;
  }

  /**
   * Adds zebra crossings around every junction: across the vertical road on
   * the horizontal road's sidewalk rows, and across the horizontal road on the
   * vertical road's sidewalk columns (only where both ends are walkable).
   */
  autoCross(): this {
    const m = this.map;
    const isRoad = (x: number, y: number) => {
      const t = m.tile(x, y);
      return !!t && (t.type === 'road' || t.type === 'cross');
    };
    const isWalk = (x: number, y: number) => m.tile(x, y)?.type === 'walk';
    for (const h of this.hRoads)
      for (const v of this.vRoads) {
        const meets = v.x + 1 >= h.x0 && v.x <= h.x1 && h.y + 1 >= v.y0 - 1 && h.y <= v.y1 + 1;
        if (!meets) continue;
        for (const row of [h.y - 1, h.y + 2])
          if (isRoad(v.x, row) && isRoad(v.x + 1, row) && isWalk(v.x - 1, row) && isWalk(v.x + 2, row)) this.zebraAbs(v.x, row, 2, 1, 'h');
        for (const col of [v.x - 1, v.x + 2])
          if (isRoad(col, h.y) && isRoad(col, h.y + 1) && isWalk(col, h.y - 1) && isWalk(col, h.y + 2)) this.zebraAbs(col, h.y, 1, 2, 'v');
      }
    return this;
  }

  private zebraAbs(x: number, y: number, w: number, h: number, run: 'h' | 'v'): void {
    const ox = this.ox;
    const oy = this.oy;
    this.at(0, 0).zebra(x, y, w, h, run).at(ox, oy);
  }

  structure(s: Partial<Structure> & Pick<Structure, 'kind' | 'x' | 'y' | 'w' | 'h'>): this {
    this.map.structures.push({
      height: 28,
      wall: '#e8dcc4',
      roof: '#b5523b',
      roofStyle: 'gable',
      face: 'left',
      ...s,
      x: s.x + this.ox,
      y: s.y + this.oy,
    });
    return this;
  }

  house(x: number, y: number, w: number, h: number, face: Face, wall: string, roof: string, roofStyle: Structure['roofStyle'] = 'gable'): this {
    return this.structure({ kind: 'house', x, y, w, h, face, wall, roof, roofStyle, height: 26 });
  }

  prop(kind: PropKind, x: number, y: number, color?: string): this {
    this.map.props.push({ kind, x: x + this.ox, y: y + this.oy, color });
    return this;
  }

  props(kind: PropKind, points: [number, number][], color?: string): this {
    for (const [x, y] of points) this.prop(kind, x, y, color);
    return this;
  }

  /** Adds a pedestrian spawn/exit point (e.g. a doorway). */
  door(x: number, y: number): this {
    this.map.spawns.push({ x: x + this.ox, y: y + this.oy });
    return this;
  }

  /** Adds points of interest pedestrians may route through. */
  poi(...points: [number, number][]): this {
    for (const [x, y] of points) this.map.pois.push({ x: x + this.ox, y: y + this.oy });
    return this;
  }

  cart(spot: CartSpot): this {
    this.map.cart = { ...spot, x: spot.x + this.ox, y: spot.y + this.oy, serveX: spot.serveX + this.ox, serveY: spot.serveY + this.oy };
    return this;
  }

  build(background: string): GameMap {
    this.map.background = background;
    this.map.finalize();
    const c = this.map.cart;
    if (!this.map.walkable(c.serveX, c.serveY)) console.warn('Cart serve tile is not walkable', c);
    for (const p of this.map.pois) if (!this.map.walkable(p.x, p.y)) console.warn('POI not walkable', p);
    return this.map;
  }
}
