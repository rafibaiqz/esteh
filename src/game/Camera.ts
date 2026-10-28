import { isoToScreen, screenToIso } from '../world/Tile';

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
  private mapW = 0;
  private mapH = 0;
  /** Point the camera is gliding towards (focus button), if any. */
  private target: { cx: number; cy: number } | null = null;

  get zoom(): number {
    return ZOOM_LEVELS[this.zoomIndex];
  }

  setBounds(b: { left: number; right: number; top: number; bottom: number }): void {
    this.bounds = b;
  }

  /** Map size in tiles: the view centre is kept over the map's diamond, not its empty corners. */
  setMapSize(w: number, h: number): void {
    this.mapW = w;
    this.mapH = h;
  }

  centerOnTile(x: number, y: number): void {
    const p = isoToScreen(x, y);
    this.cx = p.sx;
    this.cy = p.sy - 10;
    this.target = null;
  }

  /** Smoothly moves the view to a tile (used by the "back to cart" button). */
  glideToTile(x: number, y: number): void {
    const p = isoToScreen(x, y);
    this.target = { cx: p.sx, cy: p.sy - 10 };
  }

  /** Advances a glide; returns true while moving. */
  update(dt: number): boolean {
    if (!this.target) return false;
    const k = Math.min(1, dt * 7);
    this.cx += (this.target.cx - this.cx) * k;
    this.cy += (this.target.cy - this.cy) * k;
    if (Math.hypot(this.target.cx - this.cx, this.target.cy - this.cy) < 0.5) {
      this.cx = this.target.cx;
      this.cy = this.target.cy;
      this.target = null;
    }
    this.clamp();
    return true;
  }

  /** Pan by screen pixels of the display canvas. */
  pan(dx: number, dy: number): void {
    this.target = null;
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
    if (this.mapW && this.mapH) {
      // Keep the centre over the ground diamond. The closer the zoom, the further from the
      // edge it stays, so the view never fills up with the empty space around the map.
      const m = Math.min(this.mapW / 2, 2 + (this.zoom - 1) * 3);
      const t = screenToIso(this.cx, this.cy + 10);
      const tx = Math.max(m, Math.min(this.mapW - m, t.x));
      const ty = Math.max(m, Math.min(this.mapH - m, t.y));
      if (tx !== t.x || ty !== t.y) {
        const p = isoToScreen(tx, ty);
        this.cx = p.sx;
        this.cy = p.sy - 10;
      }
    }
  }
}
