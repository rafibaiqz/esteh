import type { Look } from '../entities/Customer';
import { shade, type Ctx } from './draw';

/**
 * Pixel-art character sprites. Every person in the game (customers, seller,
 * staff, title-screen extras) is drawn by this one renderer so proportions,
 * outline and lighting match. Sprites are rendered once per look/pose into a
 * small canvas (with a dark outline and side shading) and cached.
 */

export type Facing = 'front' | 'back';
export type Act = 'none' | 'wave' | 'serve' | 'pour';

export interface Pose {
  facing: Facing;
  /** Mirror horizontally (face screen-left). */
  flip: boolean;
  /** Walk frame 0..3, or -1 when standing still. */
  frame: number;
  cup?: boolean;
  act?: Act;
  /** 0..1 animation phase for wave/serve/pour. */
  actPhase?: number;
  apron?: string;
  /** Idle breathing offset (0 or 1 px). */
  breathe?: number;
}

const W = 24;
const H = 38;
const AX = 12;
const AY = 35;
const OUTLINE = '#2a1a10';

const cache = new Map<string, HTMLCanvasElement>();

export function lookKey(l: Look): string {
  return `${l.skin}${l.hair}${l.shirt}${l.pants}${l.accessory}${l.child ? 'c' : 'a'}${l.hairStyle ?? ''}`;
}

function px(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  c.fillStyle = color;
  c.fillRect(AX + x, AY + y, w, h);
}

/** Draws the unoutlined body, facing screen-right, feet at (AX, AY). */
function paint(c: Ctx, l: Look, p: Pose): void {
  const child = l.child;
  const legH = child ? 4 : 6;
  const torsoH = child ? 6 : 8;
  const top = -(2 + legH + torsoH); // y of shoulders
  const walk = p.frame >= 0;
  const stride = walk ? [1, 0, -1, 0][p.frame % 4] : 0;
  const b = p.breathe ?? 0;
  const pantsD = shade(l.pants, -0.25);
  const shirtD = shade(l.shirt, -0.22);
  const shirtL = shade(l.shirt, 0.18);
  const skinD = shade(l.skin, -0.18);
  const shoe = '#3a2a20';
  const back = p.facing === 'back';

  // Legs & shoes (front leg drawn lighter, back leg darker)
  px(c, -3 + stride, -2 - legH, 2, legH, pantsD);
  px(c, 1 - stride, -2 - legH, 2, legH, l.pants);
  px(c, -3 + stride, -2, 2 + (stride > 0 ? 1 : 0), 2, shoe);
  px(c, 1 - stride, -2, 2 + (stride < 0 ? 1 : 0), 2, shoe);

  // Backpack behind the body when seen from the front.
  if (l.accessory === 'backpack' && !back) px(c, -6, top + 1, 2, 5, '#a8322b');

  // Torso with side shading and collar
  const ty = top + b;
  px(c, -4, ty, 8, torsoH, l.shirt);
  px(c, 2, ty, 2, torsoH, shirtD);
  px(c, -4, ty, 8, 1, shirtL);
  if (!back) px(c, -1, ty, 2, 1, l.skin);
  if (p.apron && !back) {
    px(c, -3, ty + 2, 6, torsoH - 2, p.apron);
    px(c, 1, ty + 2, 2, torsoH - 2, shade(p.apron, -0.18));
  }
  if (l.accessory === 'backpack' && back) {
    px(c, -3, ty + 1, 6, 6, '#a8322b');
    px(c, -3, ty + 1, 6, 1, '#c94a3f');
  }
  if (l.accessory === 'bag' && !back) px(c, -5, ty + 4, 2, 3, '#7a3f8a');

  // Arms: swing with the stride; acting arm raised for wave/serve/pour.
  const armY = ty + 1;
  const armH = torsoH - 1;
  px(c, -5, armY - stride, 1, armH, shirtD);
  px(c, -5, armY - stride + armH, 1, 1, skinD);
  const act = p.act ?? 'none';
  const ph = p.actPhase ?? 0;
  if (act === 'wave') {
    const up = ph % 1 < 0.5 ? 0 : 1;
    px(c, 4, armY - 5 - up, 1, 5, l.shirt);
    px(c, 4, armY - 7 - up, 2, 2, l.skin);
  } else if (act === 'serve') {
    // Arm stretched forward handing over a cup.
    px(c, 4, armY + 1, 3, 1, l.shirt);
    px(c, 7, armY, 1, 2, l.skin);
    px(c, 7, armY - 3, 3, 4, '#eef6f9');
    px(c, 7, armY - 2, 3, 3, '#a8561e');
  } else if (act === 'pour') {
    // Lifting a jug over the counter.
    const lift = Math.round(Math.sin(ph * Math.PI) * 2);
    px(c, 4, armY - 1 - lift, 2, 3, l.shirt);
    px(c, 5, armY - 5 - lift, 3, 4, '#d6eaf8');
    px(c, 5, armY - 4 - lift, 3, 3, '#9c4f12');
  } else {
    px(c, 4, armY + stride, 1, armH, l.shirt);
    px(c, 4, armY + stride + armH, 1, 1, l.skin);
  }

  // Held items
  if (p.cup && act === 'none') {
    px(c, 5, armY + armH - 3, 3, 4, '#eef6f9');
    px(c, 5, armY + armH - 2, 3, 3, '#a8561e');
    px(c, 6, armY + armH - 5, 1, 2, '#c0392b');
  } else if (l.accessory === 'basket' && act === 'none') {
    px(c, 4, armY + armH - 1, 4, 3, '#b8874f');
    px(c, 4, armY + armH - 1, 4, 1, '#d4a76a');
  } else if (l.accessory === 'briefcase' && act === 'none') {
    px(c, 4, armY + armH, 4, 3, '#3e2723');
  }

  // Head
  const hy = ty - 6;
  px(c, -3, hy, 6, 6, l.skin);
  px(c, 2, hy + 1, 1, 5, skinD);
  const hair = l.hair;
  const hairD = shade(hair, -0.2);
  if (l.accessory === 'hijab') {
    const hj = shade(l.shirt, -0.08);
    px(c, -4, hy - 1, 8, 2, hj);
    px(c, -4, hy, 2, 7, hj);
    px(c, 2, hy, 2, 7, shade(hj, -0.15));
    px(c, -3, hy + 6, 6, 1, hj);
    if (back) px(c, -3, hy, 6, 6, hj);
  } else {
    const style = l.hairStyle ?? 'short';
    px(c, -3, hy - 1, 6, 2, hair);
    px(c, -4, hy, 1, back ? 5 : 3, hairD);
    if (back) px(c, -3, hy, 6, style === 'long' ? 7 : 5, hair);
    else if (style === 'long') {
      px(c, -4, hy, 1, 6, hair);
      px(c, 3, hy, 1, 5, hairD);
    } else if (style === 'bun') px(c, -2, hy - 3, 3, 2, hair);
    if (l.accessory === 'cap') {
      px(c, -3, hy - 2, 6, 2, '#c0392b');
      px(c, back ? -6 : 2, hy - 1, 4, 1, '#962d22');
    } else if (l.accessory === 'helmet') {
      px(c, -4, hy - 2, 8, 3, '#e5b81e');
    } else if (l.accessory === 'peci') {
      px(c, -3, hy - 2, 6, 2, '#1f1f24');
    }
  }
  if (!back) {
    // Eyes look towards the facing side; tiny blush and mouth.
    px(c, 0, hy + 2, 1, 1, '#1b120c');
    px(c, 2, hy + 2, 1, 1, '#1b120c');
    px(c, 1, hy + 4, 1, 1, shade(l.skin, -0.35));
    px(c, -2, hy + 3, 1, 1, shade(l.skin, 0.12));
  }
}

function build(l: Look, p: Pose): HTMLCanvasElement {
  const body = document.createElement('canvas');
  body.width = W;
  body.height = H;
  const bc = body.getContext('2d')!;
  if (p.flip) {
    bc.translate(W, 0);
    bc.scale(-1, 1);
  }
  paint(bc, l, p);

  // Outline: dark silhouette stamped around the body.
  const sil = document.createElement('canvas');
  sil.width = W;
  sil.height = H;
  const sc = sil.getContext('2d')!;
  sc.drawImage(body, 0, 0);
  sc.globalCompositeOperation = 'source-in';
  sc.fillStyle = OUTLINE;
  sc.fillRect(0, 0, W, H);

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const oc = out.getContext('2d')!;
  oc.globalAlpha = 0.85;
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    oc.drawImage(sil, dx, dy);
  oc.globalAlpha = 1;
  oc.drawImage(body, 0, 0);
  return out;
}

export function getSprite(l: Look, p: Pose): HTMLCanvasElement {
  const key = `${l.key ?? (l.key = lookKey(l))}|${p.facing}|${p.flip ? 1 : 0}|${p.frame}|${p.cup ? 1 : 0}|${p.act ?? ''}|${Math.round((p.actPhase ?? 0) * 4)}|${p.apron ?? ''}|${p.breathe ?? 0}`;
  let spr = cache.get(key);
  if (!spr) {
    // Evict the oldest quarter instead of dropping everything, so a busy street never rebuilds all sprites at once.
    if (cache.size > 6000) {
      let n = 1500;
      for (const k of cache.keys()) {
        cache.delete(k);
        if (--n <= 0) break;
      }
    }
    spr = build(l, p);
    cache.set(key, spr);
  }
  return spr;
}

/** Draws a character standing on screen point (sx, sy), with a ground shadow. */
export function drawCharacter(ctx: Ctx, sx: number, sy: number, l: Look, p: Pose, shadow = true): void {
  if (shadow) {
    ctx.fillStyle = 'rgba(30,18,8,0.28)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, l.child ? 4 : 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.drawImage(getSprite(l, p), Math.round(sx) - AX, Math.round(sy) - AY);
}

/** Converts a world movement direction into a sprite facing. */
export function facingFor(dirX: number, dirY: number): { facing: Facing; flip: boolean } {
  const sdx = dirX - dirY;
  const sdy = dirX + dirY;
  return { facing: sdy < -0.2 ? 'back' : 'front', flip: sdx < 0 };
}

/** Selectable appearances for the stall owner (seller). */
export const SELLER_LOOKS: Record<string, Look & { label: string; apron: string }> = {
  ujang: { label: 'Bang Ujang', skin: '#c68a62', hair: '#1d1612', shirt: '#6b4226', pants: '#2f3e5c', accessory: 'cap', child: false, scale: 1, apron: '#e7b65c' },
  sari: { label: 'Mbak Sari', skin: '#e0ac85', hair: '#2b1d14', shirt: '#c98a32', pants: '#4a3b2a', accessory: 'hijab', child: false, scale: 1, apron: '#fff8e9' },
  darto: { label: 'Pak Darto', skin: '#a86e4b', hair: '#d8d8d8', shirt: '#f5e6c8', pants: '#3b3b3b', accessory: 'peci', child: false, scale: 1, apron: '#c98a32' },
  rara: { label: 'Neng Rara', skin: '#f1c9a5', hair: '#3b2a1e', shirt: '#b9473e', pants: '#38271d', accessory: 'none', child: false, scale: 1, hairStyle: 'long', apron: '#e7b65c' },
};

export const DEFAULT_SELLER = 'ujang';
