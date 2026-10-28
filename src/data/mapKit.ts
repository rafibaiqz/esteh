import type { Face, Structure } from '../world/Map';
import { MapBuilder } from '../world/MapBuilder';
import type { TileType } from '../world/Tile';

/**
 * Shared sizing for every neighbourhood. Each location keeps its original
 * 24×24 block (the area around the cart) at the centre of a 36×36 world and
 * gets its own new streets, buildings and landmarks in the 6-tile band around
 * it. x grows towards the lower-right of the screen, y towards the lower-left;
 * only the +x ("right") and +y ("left") faces of a structure are visible, so
 * doors always open onto a walkway south or east of a building.
 */
export const MAP_SIZE = 36;
/** Offset of the original neighbourhood block inside the larger world. */
export const CORE = 6;

/** A builder for a full-size map whose coordinates start at the original block. */
export function neighbourhood(fill: TileType): MapBuilder {
  return new MapBuilder(MAP_SIZE, MAP_SIZE, fill).at(CORE, CORE);
}

/** Ground that decorative walkways may be painted over (never roads or sidewalks). */
const OPEN_GROUND: TileType[] = ['grass', 'lawn', 'garden', 'field', 'dirt', 'sand', 'market', 'parking'];

/** Footpath/plaza/etc. painted only over open ground, so roads and sidewalks stay intact. */
export function lane(b: MapBuilder, x: number, y: number, w: number, h: number, type: TileType = 'path'): void {
  b.paintOver(x, y, w, h, type, OPEN_GROUND);
}

export type Look = [wall: string, roof: string, style?: Structure['roofStyle']];

/** Warm house palette shared by residential streets (wall, roof, roof style). */
export const HOUSE_LOOKS: Look[] = [
  ['#f3e3c3', '#c2553e'],
  ['#d9ecf2', '#3d6f9e', 'hip'],
  ['#f6d6d6', '#8e3b46'],
  ['#e9f0d0', '#5f7f3a', 'hip'],
  ['#fff2c7', '#b5523b'],
  ['#e8d6f2', '#6b3d8e', 'hip'],
  ['#f2e0c9', '#a0522d'],
  ['#dff2df', '#2f6e4a', 'hip'],
  ['#f9e6cf', '#c0392b'],
  ['#eadbc8', '#7b4b2a', 'hip'],
];

/**
 * Houses in a row along a walkway. `face: 'left'` puts the door on the south
 * side (walkway at y + h); `face: 'right'` on the east side (walkway at x + w).
 * Each item is [x, y]; looks cycle from `start` so neighbouring streets differ.
 */
export function houses(b: MapBuilder, spots: [number, number][], face: Face, start = 0, w = 3, h = 3): void {
  spots.forEach(([x, y], i) => {
    const [wall, roof, style] = HOUSE_LOOKS[(start + i * 3) % HOUSE_LOOKS.length];
    b.house(x, y, w, h, face, wall, roof, style ?? 'gable');
    if (face === 'left') b.door(x + Math.floor(w / 2), y + h);
    else b.door(x + w, y + Math.floor(h / 2));
  });
}

/** Any building with a door on its visible front (see `houses` for the door rule). */
export function building(b: MapBuilder, s: Partial<Structure> & Pick<Structure, 'kind' | 'x' | 'y' | 'w' | 'h'>, door = true): void {
  b.structure(s);
  if (!door) return;
  const face = s.face ?? 'left';
  if (face === 'left') b.door(s.x + Math.floor(s.w / 2), s.y + s.h);
  else b.door(s.x + s.w, s.y + Math.floor(s.h / 2));
}
