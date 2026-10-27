import type { Structure } from '../world/Map';
import { P, box, boxShaded, circle, ellipse, faceQuad, faceText, flat, poly, shade, type Ctx } from './draw';

/** Draws windows evenly along a face. */
const EDGE = 'rgba(42,26,16,0.5)';

function windows(ctx: Ctx, s: Structure, face: 'left' | 'right', z0: number, rows: number, rowH: number, glass: string, skipMiddle: boolean): void {
  const len = face === 'left' ? s.w : s.h;
  const start = face === 'left' ? s.x : s.y;
  const fixed = (face === 'left' ? s.y + s.h : s.x + s.w) + 0.002;
  const per = len >= 4 ? 2 : 1;
  const count = Math.max(1, Math.round(len * per));
  const step = len / count;
  const mid = Math.floor(count / 2);
  const frame = shade(s.wall, 0.35);
  const sill = shade(s.wall, -0.3);
  const shadowGlass = shade(glass, -0.25);
  for (let r = 0; r < rows; r++) {
    const z = z0 + r * rowH;
    const h = rowH * 0.55;
    for (let i = 0; i < count; i++) {
      if (skipMiddle && r === 0 && s.face === face && i === mid) continue;
      const a = start + i * step + step * 0.25;
      const b = start + i * step + step * 0.75;
      // Frame, glass (darker upper half = reflection band), mullion and sill.
      faceQuad(ctx, face, fixed, a - 0.03, b + 0.03, z - 0.8, z + h + 0.8, frame, EDGE);
      faceQuad(ctx, face, fixed, a, b, z, z + h, glass);
      faceQuad(ctx, face, fixed, a, b, z + h * 0.55, z + h, shadowGlass);
      faceQuad(ctx, face, fixed, (a + b) / 2 - 0.01, (a + b) / 2 + 0.01, z, z + h, frame);
      faceQuad(ctx, face, fixed, a - 0.05, b + 0.05, z - 1.6, z - 0.6, sill);
    }
  }
}
function door(ctx: Ctx, s: Structure, h = 13, color = '#6b4226'): void {
  const len = s.face === 'left' ? s.w : s.h;
  const start = s.face === 'left' ? s.x : s.y;
  const fixed = (s.face === 'left' ? s.y + s.h : s.x + s.w) + 0.003;
  const count = Math.max(1, Math.round(len * (len >= 4 ? 2 : 1)));
  const step = len / count;
  const mid = Math.floor(count / 2);
  const c = start + mid * step + step / 2;
  faceQuad(ctx, s.face, fixed, c - 0.22, c + 0.22, 0, h + 1.5, shade(s.wall, 0.3), EDGE);
  faceQuad(ctx, s.face, fixed, c - 0.17, c + 0.17, 0, h, color, shade(color, -0.4));
  faceQuad(ctx, s.face, fixed, c - 0.17, c + 0.17, h * 0.55, h * 0.6, shade(color, -0.25));
  faceQuad(ctx, s.face, fixed, c + 0.1, c + 0.13, h * 0.42, h * 0.5, '#e7b65c');
  // Doorstep
  faceQuad(ctx, s.face, fixed, c - 0.27, c + 0.27, 0, 2, '#c9bfae', EDGE);
}

function roof(ctx: Ctx, s: Structure): void {
  const { x, y, w, h } = s;
  const x1 = x + w;
  const y1 = y + h;
  const z = s.height;
  const rh = 8 + Math.min(w, h) * 4;
  const o = 0.12; // eave overhang
  const c = s.roof;
  if (s.roofStyle === 'flat') {
    flat(ctx, x, y, x1, y1, z, shade(c, 0.05));
    // Parapet rim
    box(ctx, x, y1 - 0.08, x1, y1, z, 3, { top: shade(c, 0.25), left: shade(c, -0.05), right: shade(c, -0.2) });
    box(ctx, x1 - 0.08, y, x1, y1, z, 3, { top: shade(c, 0.25), left: shade(c, -0.05), right: shade(c, -0.2) });
    return;
  }
  if (s.roofStyle === 'hip') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const apex = P(cx, cy, z + rh);
    const ridge = w > h ? [P(x + h / 2, cy, z + rh), P(x1 - h / 2, cy, z + rh)] : [P(cx, y + w / 2, z + rh), P(cx, y1 - w / 2, z + rh)];
    const a = P(x - o, y - o, z);
    const b = P(x1 + o, y - o, z);
    const cc = P(x1 + o, y1 + o, z);
    const d = P(x - o, y1 + o, z);
    if (w === h) {
      poly(ctx, [a, b, apex], shade(c, -0.3));
      poly(ctx, [a, d, apex], shade(c, -0.15));
      poly(ctx, [d, cc, apex], c);
      poly(ctx, [b, cc, apex], shade(c, -0.22));
    } else if (w > h) {
      poly(ctx, [a, b, ridge[1], ridge[0]], shade(c, -0.3));
      poly(ctx, [a, d, ridge[0]], shade(c, -0.15));
      poly(ctx, [d, cc, ridge[1], ridge[0]], c);
      poly(ctx, [b, cc, ridge[1]], shade(c, -0.22));
    } else {
      poly(ctx, [a, b, ridge[0]], shade(c, -0.3));
      poly(ctx, [a, d, ridge[1], ridge[0]], shade(c, -0.15));
      poly(ctx, [d, cc, ridge[1]], c);
      poly(ctx, [b, cc, ridge[1], ridge[0]], shade(c, -0.22));
    }
    return;
  }
  // Gable: ridge along the longer side.
  if (w >= h) {
    const ym = y + h / 2;
    poly(ctx, [P(x - o, y - o, z), P(x1 + o, y - o, z), P(x1 + o, ym, z + rh), P(x - o, ym, z + rh)], shade(c, -0.3));
    // Visible gable end at x1
    poly(ctx, [P(x1, y, z), P(x1, y1, z), P(x1, ym, z + rh)], shade(s.wall, -0.2));
    poly(ctx, [P(x - o, ym, z + rh), P(x1 + o, ym, z + rh), P(x1 + o, y1 + o, z), P(x - o, y1 + o, z)], c, shade(c, -0.35));
    // Tile rows
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      poly(ctx, [P(x - o, ym + (y1 + o - ym) * t, z + rh * (1 - t)), P(x1 + o, ym + (y1 + o - ym) * t, z + rh * (1 - t))], undefined, shade(c, -0.18));
    }
  } else {
    const xm = x + w / 2;
    poly(ctx, [P(x - o, y - o, z), P(xm, y - o, z + rh), P(xm, y1 + o, z + rh), P(x - o, y1 + o, z)], shade(c, -0.15));
    poly(ctx, [P(x, y1, z), P(x1, y1, z), P(xm, y1, z + rh)], s.wall);
    poly(ctx, [P(xm, y - o, z + rh), P(x1 + o, y - o, z), P(x1 + o, y1 + o, z), P(xm, y1 + o, z + rh)], shade(c, -0.22), shade(c, -0.4));
  }
}

function walls(ctx: Ctx, s: Structure, h = s.height): void {
  box(ctx, s.x, s.y, s.x + s.w, s.y + s.h, 0, h, { top: shade(s.wall, 0.1), left: s.wall, right: shade(s.wall, -0.18), outline: EDGE });
  // Foundation plinth
  faceQuad(ctx, 'left', s.y + s.h + 0.002, s.x, s.x + s.w, 0, 2.5, shade(s.wall, -0.38));
  faceQuad(ctx, 'right', s.x + s.w + 0.002, s.y, s.y + s.h, 0, 2.5, shade(s.wall, -0.48));
  // Shadow under the eaves for pitched roofs.
  if (s.roofStyle !== 'flat') {
    faceQuad(ctx, 'left', s.y + s.h + 0.002, s.x, s.x + s.w, h - 2.5, h, 'rgba(42,26,16,0.22)');
    faceQuad(ctx, 'right', s.x + s.w + 0.002, s.y, s.y + s.h, h - 2.5, h, 'rgba(42,26,16,0.28)');
  }
}

function signBoard(ctx: Ctx, s: Structure, z: number, bg: string, fg: string): void {
  if (!s.sign) return;
  const fixed = s.face === 'left' ? s.y + s.h + 0.02 : s.x + s.w + 0.02;
  const len = s.face === 'left' ? s.w : s.h;
  const start = s.face === 'left' ? s.x : s.y;
  const half = Math.min(len * 0.42, 0.18 + s.sign.length * 0.11);
  const c = start + len / 2;
  faceQuad(ctx, s.face, fixed, c - half, c + half, z, z + 8, bg, shade(bg, -0.4));
  faceText(ctx, s.face, fixed, c, z + 4, s.sign, fg, 6, half * 32);
}

export function drawStructure(ctx: Ctx, s: Structure, t: number): void {
  switch (s.kind) {
    case 'house':
      walls(ctx, s);
      windows(ctx, s, 'left', 9, 1, 10, '#9fd3e8', true);
      windows(ctx, s, 'right', 9, 1, 10, '#86bcd2', s.face === 'right');
      door(ctx, s);
      roof(ctx, s);
      // Chimney on some pitched roofs (deterministic per house).
      if (s.roofStyle === 'gable' && (s.x * 7 + s.y * 3) % 3 === 0) {
        const rh = 8 + Math.min(s.w, s.h) * 4;
        const cxh = s.x + s.w * 0.72;
        const cyh = s.y + s.h * 0.3;
        boxShaded(ctx, cxh - 0.13, cyh - 0.13, cxh + 0.13, cyh + 0.13, s.height + rh * 0.45, rh * 0.75, '#a0583a', shade('#a0583a', 0.2), 'rgba(42,26,16,0.5)');
      }
      break;
    case 'shop':
    case 'warung':
      walls(ctx, s);
      windows(ctx, s, 'left', 6, Math.max(1, Math.floor(s.height / 16)), 13, '#bfe3f0', true);
      windows(ctx, s, 'right', 6, Math.max(1, Math.floor(s.height / 16)), 13, '#a8d0e0', s.face === 'right');
      door(ctx, s, 12, '#3d5a6b');
      awning(ctx, s);
      roof(ctx, s);
      signBoard(ctx, s, s.height - 9, '#fff8dc', '#5a2d0c');
      break;
    case 'office':
      walls(ctx, s);
      windows(ctx, s, 'left', 6, s.floors ?? 4, (s.height - 8) / (s.floors ?? 4), '#7fb6d9', true);
      windows(ctx, s, 'right', 6, s.floors ?? 4, (s.height - 8) / (s.floors ?? 4), '#5f93b5', false);
      door(ctx, s, 10, '#2c3e50');
      roof(ctx, s);
      boxShaded(ctx, s.x + 0.4, s.y + 0.4, s.x + 1.1, s.y + 1.0, s.height, 5, '#95a5a6');
      if (s.sign) signBoard(ctx, s, 12, '#1f2d3a', '#f4d03f');
      break;
    case 'school':
      walls(ctx, s);
      windows(ctx, s, 'left', 6, s.floors ?? 2, 13, '#a9dcef', true);
      windows(ctx, s, 'right', 6, s.floors ?? 2, 13, '#8cc3d8', false);
      // Coloured stripe between floors
      faceQuad(ctx, 'left', s.y + s.h, s.x, s.x + s.w, 17, 19, s.accent ?? '#2e86de');
      faceQuad(ctx, 'right', s.x + s.w, s.y, s.y + s.h, 17, 19, shade(s.accent ?? '#2e86de', -0.2));
      door(ctx, s, 13, '#5d4037');
      roof(ctx, s);
      signBoard(ctx, s, s.height - 9, '#1e5aa8', '#ffffff');
      break;
    case 'hall':
      walls(ctx, s, s.height);
      // Wide open front
      faceQuad(ctx, 'left', s.y + s.h, s.x + 1, s.x + s.w - 1, 0, 16, '#3b2a1e');
      for (let i = s.x + 1; i <= s.x + s.w - 1; i += 1.4) faceQuad(ctx, 'left', s.y + s.h + 0.01, i - 0.05, i + 0.05, 0, 16, shade(s.wall, -0.1));
      windows(ctx, s, 'right', 18, 1, 10, '#c7a87a', false);
      roof(ctx, { ...s, roofStyle: 'hip' });
      signBoard(ctx, s, 21, s.accent ?? '#2e7d32', '#ffffff');
      break;
    case 'stall':
      stall(ctx, s);
      break;
    case 'rival':
      rival(ctx, s, t);
      break;
    case 'fountain':
      fountain(ctx, s, t);
      break;
    case 'gazebo':
      gazebo(ctx, s);
      break;
    case 'busstop':
      busstop(ctx, s);
      break;
    case 'pos':
      pos(ctx, s);
      break;
    case 'playground':
      playground(ctx, s);
      break;
    case 'tower':
      tower(ctx, s);
      break;
    case 'pendopo':
      pendopo(ctx, s);
      break;
    case 'lifeguard':
      lifeguard(ctx, s, t);
      break;
  }
}

/** Joglo-style open pavilion: stone platform, wooden pillars and a two-tier roof. */
function pendopo(ctx: Ctx, s: Structure): void {
  const { x, y } = s;
  const x1 = x + s.w;
  const y1 = y + s.h;
  box(ctx, x, y, x1, y1, 0, 4, { top: '#d9c9a8', left: '#b9a382', right: '#9f8a6a', outline: EDGE });
  for (let i = 0; i <= 4; i++) {
    for (const py of [y + 0.2, y1 - 0.2]) {
      const [a, b] = P(x + 0.2 + ((s.w - 0.4) * i) / 4, py, 4);
      ctx.fillStyle = '#5b3a22';
      ctx.fillRect(a - 1, b - 18, 2.5, 18);
    }
  }
  roof(ctx, { ...s, roofStyle: 'hip', height: 22 });
  roof(ctx, { ...s, roofStyle: 'hip', height: 30, x: x + s.w * 0.3, y: y + 0.25, w: s.w * 0.4, h: s.h - 0.5, roof: shade(s.roof, 0.1) });
  if (s.sign) signBoard(ctx, s, 6, '#6b4226', '#e7b65c');
}

/** Lifeguard tower on stilts with a striped flag. */
function lifeguard(ctx: Ctx, s: Structure, t: number): void {
  const { x, y } = s;
  for (const [px, py] of [
    [x + 0.15, y + 0.85],
    [x + 0.85, y + 0.85],
    [x + 0.85, y + 0.15],
  ]) {
    const [a, b] = P(px, py);
    ctx.fillStyle = '#7a5638';
    ctx.fillRect(a - 1, b - 18, 2, 18);
  }
  box(ctx, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 18, 9, { top: '#f5e6c8', left: '#b9473e', right: '#8f342d', outline: EDGE });
  faceQuad(ctx, 'left', y + 0.91, x + 0.25, x + 0.75, 21, 25, '#f5f5f0');
  box(ctx, x, y, x + 1, y + 1, 27, 2, { top: '#c98a32', left: '#a86f22', right: '#8a5a1b', outline: EDGE });
  const [fx, fy] = P(x + 0.9, y + 0.1, 29);
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(fx, fy - 12, 1, 12);
  const wv = Math.sin(t * 4) * 1.2;
  poly(ctx, [[fx + 1, fy - 12], [fx + 9, fy - 11 + wv], [fx + 9, fy - 8 + wv], [fx + 1, fy - 9]], '#b9473e');
  poly(ctx, [[fx + 1, fy - 9], [fx + 9, fy - 8 + wv], [fx + 9, fy - 5 + wv], [fx + 1, fy - 6]], '#f1c40f');
}

function awning(ctx: Ctx, s: Structure): void {
  if (!s.awning) return;
  const fixed = s.face === 'left' ? s.y + s.h : s.x + s.w;
  const len = s.face === 'left' ? s.w : s.h;
  const start = s.face === 'left' ? s.x : s.y;
  const stripes = Math.max(4, Math.round(len * 3));
  const z0 = 15;
  const z1 = 20;
  const out = 0.35;
  for (let i = 0; i < stripes; i++) {
    const a = start + (i / stripes) * len;
    const b = start + ((i + 1) / stripes) * len;
    const col = i % 2 ? s.awning : (s.accent ?? '#ffffff');
    if (s.face === 'left') poly(ctx, [P(a, fixed, z1), P(b, fixed, z1), P(b, fixed + out, z0), P(a, fixed + out, z0)], col);
    else poly(ctx, [P(fixed, a, z1), P(fixed, b, z1), P(fixed + out, b, z0), P(fixed + out, a, z0)], col);
  }
}

function stall(ctx: Ctx, s: Structure): void {
  const { x, y } = s;
  const x1 = x + s.w;
  const y1 = y + s.h;
  // Table with goods
  boxShaded(ctx, x + 0.15, y + 0.2, x1 - 0.15, y1 - 0.1, 0, 7, s.wall);
  const goods = ['#e74c3c', '#f39c12', '#27ae60', '#8e44ad', '#f1c40f', '#d35400'];
  let k = Math.floor(x * 3 + y);
  for (let i = x + 0.35; i < x1 - 0.2; i += 0.42)
    for (let j = y + 0.4; j < y1 - 0.2; j += 0.45) {
      const [sx, sy] = P(i, j, 8);
      ellipse(ctx, sx, sy, 3, 2, goods[k++ % goods.length]);
    }
  // Poles
  for (const [px, py] of [
    [x + 0.1, y1 - 0.05],
    [x1 - 0.05, y1 - 0.05],
    [x1 - 0.05, y + 0.1],
  ]) {
    const [a, b] = P(px, py);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(a - 0.5, b - 18, 1.5, 18);
  }
  // Striped canopy, slightly sloped towards the front.
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const a = x - 0.1 + ((x1 + 0.1 - (x - 0.1)) * i) / stripes;
    const b = x - 0.1 + ((x1 + 0.1 - (x - 0.1)) * (i + 1)) / stripes;
    poly(ctx, [P(a, y - 0.1, 22), P(b, y - 0.1, 22), P(b, y1 + 0.15, 17), P(a, y1 + 0.15, 17)], i % 2 ? s.roof : (s.accent ?? '#fff'));
  }
  poly(ctx, [P(x1 + 0.1, y - 0.1, 22), P(x1 + 0.1, y1 + 0.15, 17), P(x1 + 0.1, y1 + 0.15, 15), P(x1 + 0.1, y - 0.1, 20)], shade(s.roof, -0.3));
}

function rival(ctx: Ctx, s: Structure, t: number): void {
  const { x, y } = s;
  const [sx, sy] = P(x + 0.5, y + 0.5);
  ellipse(ctx, sx, sy + 2, 14, 6, 'rgba(0,0,0,0.25)');
  boxShaded(ctx, x + 0.2, y + 0.25, x + 0.85, y + 0.75, 3, 10, s.wall);
  circle(ctx, ...P(x + 0.3, y + 0.8, 3), 3, '#333');
  circle(ctx, ...P(x + 0.75, y + 0.8, 3), 3, '#333');
  // Vendor
  const [vx, vy] = P(x + 0.3, y + 0.15);
  ctx.fillStyle = '#5d6d7e';
  ctx.fillRect(vx - 2, vy - 14, 5, 8);
  ctx.fillStyle = '#e0ac85';
  ctx.fillRect(vx - 2, vy - 19, 5, 5);
  // Canopy and sign
  const bob = Math.sin(t * 2) * 0.5;
  boxShaded(ctx, x + 0.1, y + 0.15, x + 0.95, y + 0.85, 24 + bob, 2, s.roof);
  ctx.fillStyle = '#555';
  const [p1, p2] = P(x + 0.9, y + 0.8);
  ctx.fillRect(p1, p2 - 24, 1, 22);
  if (s.sign) {
    const [tx, ty] = P(x + 0.5, y + 0.5, 32);
    ctx.font = 'bold 6px "Trebuchet MS", Verdana, sans-serif';
    const w = ctx.measureText(s.sign).width + 6;
    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(Math.round(tx - w / 2), Math.round(ty - 5), Math.round(w), 9);
    ctx.strokeStyle = shade(s.wall, -0.3);
    ctx.strokeRect(Math.round(tx - w / 2) + 0.5, Math.round(ty - 5) + 0.5, Math.round(w) - 1, 8);
    ctx.fillStyle = shade(s.wall, -0.4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.sign, tx, ty);
  }
}

function fountain(ctx: Ctx, s: Structure, t: number): void {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const [sx, sy] = P(cx, cy);
  const rx = s.w * 13;
  const ry = s.h * 6.5;
  ellipse(ctx, sx, sy + 3, rx + 2, ry + 1, shade(s.wall, -0.35));
  ellipse(ctx, sx, sy, rx + 2, ry + 1, s.wall);
  ellipse(ctx, sx, sy - 1, rx - 3, ry - 2, '#4a9ad6');
  ellipse(ctx, sx - 6, sy - 3, 8, 2, 'rgba(255,255,255,0.35)');
  ctx.fillStyle = shade(s.wall, -0.15);
  ctx.fillRect(sx - 3, sy - 16, 6, 15);
  ellipse(ctx, sx, sy - 16, 8, 3, s.wall);
  // Animated water jets
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + t;
    const ph = (t * 1.5 + i * 0.37) % 1;
    const jx = sx + Math.cos(a) * 9 * ph;
    const jy = sy - 20 + Math.sin(a) * 3 * ph - Math.sin(ph * Math.PI) * 8 + ph * 12;
    ctx.fillStyle = 'rgba(200,235,255,0.85)';
    ctx.fillRect(jx, jy, 1.5, 1.5);
  }
  ellipse(ctx, sx, sy - 22 - Math.sin(t * 6), 2, 4, 'rgba(210,240,255,0.9)');
}

function gazebo(ctx: Ctx, s: Structure): void {
  const { x, y } = s;
  const x1 = x + s.w;
  const y1 = y + s.h;
  boxShaded(ctx, x, y, x1, y1, 0, 3, '#c8b89a');
  for (const [px, py] of [
    [x + 0.15, y + 0.15],
    [x1 - 0.15, y + 0.15],
    [x + 0.15, y1 - 0.15],
    [x1 - 0.15, y1 - 0.15],
  ]) {
    const [a, b] = P(px, py, 3);
    ctx.fillStyle = s.wall;
    ctx.fillRect(a - 1, b - s.height, 2, s.height);
  }
  roof(ctx, { ...s, roofStyle: 'hip', height: s.height + 3, x: x - 0.05, y: y - 0.05, w: s.w + 0.1, h: s.h + 0.1 });
}

function busstop(ctx: Ctx, s: Structure): void {
  const { x, y } = s;
  const x1 = x + s.w;
  const y1 = y + s.h;
  boxShaded(ctx, x + 0.1, y + 0.6, x1 - 0.1, y1 - 0.1, 0, 5, '#7f8c8d');
  faceQuad(ctx, 'left', y + 0.3, x + 0.1, x1 - 0.1, 0, s.height, 'rgba(180,220,240,0.45)', '#7f8c8d');
  boxShaded(ctx, x - 0.05, y + 0.1, x1 + 0.05, y1 + 0.05, s.height, 2, s.roof);
  const [a, b] = P(x1 - 0.1, y1 - 0.1);
  ctx.fillStyle = '#555';
  ctx.fillRect(a, b - s.height, 1.5, s.height);
  faceText(ctx, 'left', y1 + 0.06, x + s.w / 2, s.height + 1, 'HALTE', '#fff', 5);
}

function pos(ctx: Ctx, s: Structure): void {
  const { x, y } = s;
  const x1 = x + s.w;
  const y1 = y + s.h;
  for (const [px, py] of [
    [x + 0.1, y1 - 0.1],
    [x1 - 0.1, y1 - 0.1],
    [x1 - 0.1, y + 0.1],
  ]) {
    const [a, b] = P(px, py);
    ctx.fillStyle = '#6d4c2f';
    ctx.fillRect(a - 1, b - 22, 2, 22);
  }
  boxShaded(ctx, x, y, x1, y1, 6, 3, s.wall);
  faceQuad(ctx, 'left', y + 0.2, x, x1, 9, 18, shade(s.wall, -0.25));
  roof(ctx, { ...s, height: 22, roofStyle: 'gable' });
  // Kentongan (wooden alarm drum)
  const [kx, ky] = P(x1 - 0.1, y1 - 0.4, 12);
  ctx.fillStyle = '#8d5524';
  ctx.fillRect(kx, ky, 3, 7);
  faceText(ctx, 'right', x1 + 0.02, y + s.h / 2, 13, s.sign ?? '', '#fff', 5);
}

function playground(ctx: Ctx, s: Structure): void {
  const { x, y } = s;
  // Slide: ladder + slope
  boxShaded(ctx, x + 0.1, y + 0.1, x + 0.5, y + 0.5, 0, 18, s.wall);
  poly(ctx, [P(x + 0.5, y + 0.15, 18), P(x + 1.6, y + 0.15, 1), P(x + 1.6, y + 0.45, 1), P(x + 0.5, y + 0.45, 18)], s.roof, shade(s.roof, -0.3));
  // Swing frame
  const [a, b] = P(x + 0.4, y + 1.6);
  const [c, d] = P(x + 1.6, y + 1.6);
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a, b);
  ctx.lineTo(a, b - 20);
  ctx.lineTo(c, d - 20);
  ctx.lineTo(c, d);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#7f8c8d';
  for (const k of [0.33, 0.66]) {
    const mx = a + (c - a) * k;
    const my = b + (d - b) * k - 20;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx, my + 13);
    ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(mx - 2, my + 13, 5, 2);
  }
}

function tower(ctx: Ctx, s: Structure): void {
  const { x, y } = s;
  const x1 = x + s.w;
  const y1 = y + s.h;
  boxShaded(ctx, x, y, x1, y1, 0, 6, '#bdc3c7');
  boxShaded(ctx, x + 0.3, y + 0.3, x1 - 0.3, y1 - 0.3, 6, 6, '#d0d3d4');
  boxShaded(ctx, x + 0.65, y + 0.65, x1 - 0.65, y1 - 0.65, 12, s.height - 20, s.wall);
  const cx = x + s.w / 2;
  const cy = y + s.h / 2;
  const [tx, ty] = P(cx, cy, s.height - 8);
  ctx.fillStyle = s.roof;
  ctx.beginPath();
  ctx.moveTo(tx, ty - 12);
  ctx.lineTo(tx + 4, ty);
  ctx.lineTo(tx - 4, ty);
  ctx.closePath();
  ctx.fill();
  circle(ctx, tx, ty - 13, 2.5, '#f7dc6f');
}
