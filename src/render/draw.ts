import { TH, TW } from '../world/Tile';

export type Ctx = CanvasRenderingContext2D;

/** Screen position of an iso point (tile coords) lifted by z pixels. */
export function P(x: number, y: number, z = 0): [number, number] {
  return [((x - y) * TW) / 2, ((x + y) * TH) / 2 - z];
}

const shadeCache = new Map<string, string>();

/** Lightens (amt > 0) or darkens (amt < 0) a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const key = hex + amt;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  const out = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  shadeCache.set(key, out);
  return out;
}

export function poly(ctx: Ctx, pts: [number, number][], fill?: string, stroke?: string, lw = 1): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Flat diamond on the ground covering [x0,x1]×[y0,y1] at height z. */
export function flat(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, z: number, fill: string, stroke?: string): void {
  poly(ctx, [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], fill, stroke);
}

export interface BoxColors {
  top: string;
  left: string;
  right: string;
  outline?: string;
}

/** Iso box: footprint [x0,x1]×[y0,y1], from height z to z+h. Only visible faces are drawn. */
export function box(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, z: number, h: number, c: BoxColors): void {
  // Left face (y = y1)
  poly(ctx, [P(x0, y1, z), P(x1, y1, z), P(x1, y1, z + h), P(x0, y1, z + h)], c.left, c.outline);
  // Right face (x = x1)
  poly(ctx, [P(x1, y0, z), P(x1, y1, z), P(x1, y1, z + h), P(x1, y0, z + h)], c.right, c.outline);
  // Top
  poly(ctx, [P(x0, y0, z + h), P(x1, y0, z + h), P(x1, y1, z + h), P(x0, y1, z + h)], c.top, c.outline);
}

export function boxShaded(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, z: number, h: number, color: string, top?: string, outline?: string): void {
  box(ctx, x0, y0, x1, y1, z, h, { top: top ?? shade(color, 0.15), left: color, right: shade(color, -0.2), outline });
}

/**
 * Quad drawn on a vertical face. For the left face (y = yf) `a`/`b` are x
 * positions along it; for the right face (x = xf) they are y positions.
 */
export function faceQuad(ctx: Ctx, face: 'left' | 'right', fixed: number, a: number, b: number, z0: number, z1: number, fill: string, stroke?: string): void {
  if (face === 'left') poly(ctx, [P(a, fixed, z0), P(b, fixed, z0), P(b, fixed, z1), P(a, fixed, z1)], fill, stroke);
  else poly(ctx, [P(fixed, a, z0), P(fixed, b, z0), P(fixed, b, z1), P(fixed, a, z1)], fill, stroke);
}

/** Draws text skewed onto a vertical face so it looks painted on the wall. */
export function faceText(ctx: Ctx, face: 'left' | 'right', fixed: number, center: number, z: number, text: string, color: string, size = 7, maxWidth?: number): void {
  const [sx, sy] = face === 'left' ? P(center, fixed, z) : P(fixed, center, z);
  ctx.save();
  // Left face runs along +x (screen 1, 0.5); right face read left→right runs along −y (screen 1, −0.5).
  ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([1, face === 'left' ? 0.5 : -0.5, 0, 1, sx, sy])));
  ctx.font = `bold ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0, maxWidth);
  ctx.restore();
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function circle(ctx: Ctx, cx: number, cy: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function shadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.25): void {
  const [sx, sy] = P(x, y);
  ellipse(ctx, sx, sy, rx, ry, `rgba(0,0,0,${alpha})`);
}
