import { isoToScreen } from '../world/Tile';

export const ZOOM_LEVELS = [1, 1.5, 2, 3];

/**
 * Camera over the iso world. (cx, cy) is the iso-pixel point shown at the
 * centre of the view. Zoom is applied by rendering into a smaller buffer and
 * scaling it up with nearest-neighbour filtering (crisp pixel art).
 */
export class Camera {
  cx = 0;
  cy = 0;
  zoomIndex = 1;
  private bounds = { left: -400, right: 400, top: 0, bottom: 400 };

  get zoom(): number {
    return ZOOM_LEVELS[this.zoomIndex];
  }

  setBounds(b: { left: number; right: number; top: number; bottom: number }): void {
    this.bounds = b;
  }

  centerOnTile(x: number, y: number): void {
    const p = isoToScreen(x, y);
    this.cx = p.sx;
    this.cy = p.sy - 10;
  }

  /** Pan by screen pixels of the display canvas. */
  pan(dx: number, dy: number): void {
    this.cx -= dx / this.zoom;
    this.cy -= dy / this.zoom;
    this.clamp();
  }

  zoomBy(step: number): void {
    this.zoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, this.zoomIndex + step));
    this.clamp();
  }

  clamp(): void {
    const b = this.bounds;
    this.cx = Math.max(b.left + 40, Math.min(b.right - 40, this.cx));
    this.cy = Math.max(b.top - 40, Math.min(b.bottom - 20, this.cy));
  }
}
