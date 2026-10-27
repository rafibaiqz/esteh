import { buildMap } from '../data/maps';
import type { LocationId } from '../game/types';
import { groundBounds, renderGround } from './ground';
import { drawProp } from './props';
import { drawStructure } from './structures';

const cache = new Map<LocationId, string>();

/** Small static preview of a neighbourhood (ground, buildings, props) as a data URL. */
export function locationThumbnail(id: LocationId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const map = buildMap(id);
  const ground = renderGround(map);
  const b = groundBounds(map);
  const pad = 70;
  const c = document.createElement('canvas');
  c.width = ground.width;
  c.height = ground.height + pad;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = map.background;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(-b.left, pad);
  ctx.drawImage(ground, b.left, 0);
  const items: { d: number; draw: () => void }[] = [];
  for (const s of map.structures) items.push({ d: s.x + s.w + s.y + s.h - 1, draw: () => drawStructure(ctx, s, 0) });
  for (const p of map.props) items.push({ d: p.x + p.y, draw: () => drawProp(ctx, p, 0) });
  items.sort((a, z) => a.d - z.d);
  for (const it of items) it.draw();
  // Mark the cart spot.
  const cx = ((map.cart.x - map.cart.y) * 32) / 2;
  const cy = ((map.cart.x + map.cart.y + 1) * 16) / 2;
  ctx.fillStyle = '#f2c230';
  ctx.strokeStyle = '#1f3a17';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const out = document.createElement('canvas');
  out.width = Math.round(c.width / 3);
  out.height = Math.round(c.height / 3);
  const o = out.getContext('2d')!;
  o.imageSmoothingEnabled = true;
  o.drawImage(c, 0, 0, out.width, out.height);
  const url = out.toDataURL();
  cache.set(id, url);
  return url;
}
