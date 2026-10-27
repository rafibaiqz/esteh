export type TileType =
  | 'grass'
  | 'lawn'
  | 'road'
  | 'cross'
  | 'walk'
  | 'path'
  | 'plaza'
  | 'water'
  | 'field'
  | 'market'
  | 'parking'
  | 'sand'
  | 'garden'
  | 'dirt'
  | 'beach'
  | 'deck';

/** Tiles pedestrians may walk on (structures on top still block them). */
export const WALKABLE: Record<TileType, boolean> = {
  grass: false,
  lawn: false,
  road: false,
  cross: true,
  walk: true,
  path: true,
  plaza: true,
  water: false,
  field: false,
  market: true,
  parking: false,
  sand: false,
  garden: false,
  dirt: false,
  beach: true,
  deck: true,
};

export interface Tile {
  type: TileType;
  /** Road lane orientation, used for markings: horizontal (along x), vertical (along y) or intersection. */
  road?: 'h' | 'v' | 'x';
  /** Small deterministic noise value for texture variation. */
  n: number;
}

/** Isometric tile size in canvas pixels. */
export const TW = 32;
export const TH = 16;

export function isoToScreen(x: number, y: number): { sx: number; sy: number } {
  return { sx: ((x - y) * TW) / 2, sy: ((x + y) * TH) / 2 };
}

export function screenToIso(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (TW / 2);
  const b = sy / (TH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
