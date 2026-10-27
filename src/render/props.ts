import type { Prop } from '../world/Map';
import { P, boxShaded, circle, ellipse, poly, shade, type Ctx } from './draw';

/** Screen-space height of each prop (for sorting/bounding). */
export const PROP_HEIGHT: Record<Prop['kind'], number> = {
  tree: 34,
  palm: 36,
  pine: 36,
  bush: 10,
  flowers: 4,
  lamp: 30,
  bench: 8,
  fenceX: 8,
  fenceY: 8,
  hydrant: 7,
  bin: 8,
  motor: 9,
  car: 14,
  flag: 40,
  pole: 40,
  rock: 5,
  umbrella: 22,
  crate: 6,
  pot: 10,
  banyan: 70,
  bus: 26,
  beachChair: 6,
  planter: 14,
};

const OUTLINE = 'rgba(30,40,18,0.85)';

/** Leafy blob with a dark outline, lit from the upper-left. */
function blob(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  circle(ctx, x, y, r + 1, OUTLINE);
  circle(ctx, x, y, r, color);
}

function canopy(ctx: Ctx, sx: number, sy: number, scale: number, g: string, sway: number): void {
  const parts: [number, number, number, number][] = [
    [-5, -15, 7, -0.18],
    [5, -16, 7, -0.24],
    [0, -22, 8.5, -0.05],
    [-3, -19, 6, 0.05],
  ];
  for (const [dx, dy, r] of parts) circle(ctx, sx + (dx + sway * 0.5) * scale, sy + dy * scale, (r + 1) * scale, OUTLINE);
  for (const [dx, dy, r, sh] of parts) circle(ctx, sx + (dx + sway * 0.5) * scale, sy + dy * scale, r * scale, shade(g, sh));
  circle(ctx, sx + (-3 + sway) * scale, sy - 25 * scale, 3.5 * scale, shade(g, 0.22));
  circle(ctx, sx + (-7 + sway * 0.5) * scale, sy - 17 * scale, 2 * scale, shade(g, 0.15));
}

let wind = 0;
/** Global wind strength (0..1) used to sway trees and flags. */
export function setWind(w: number): void {
  wind = w;
}

export function drawProp(ctx: Ctx, p: Prop, t: number): void {
  const [sx, sy] = P(p.x, p.y);
  const sway = Math.sin(t * (1.3 + wind * 2.5) + p.x * 0.7 + p.y) * 0.8 * (1 + wind * 3) + wind * 1.5;
  switch (p.kind) {
    case 'tree': {
      ellipse(ctx, sx + 1, sy + 0.5, 6, 2.5, 'rgba(30,18,8,0.25)');
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(sx - 2.5, sy - 13, 5, 13);
      ctx.fillStyle = '#6d4c2f';
      ctx.fillRect(sx - 1.5, sy - 12, 3, 12);
      ctx.fillStyle = '#8a6440';
      ctx.fillRect(sx - 1.5, sy - 12, 1, 12);
      canopy(ctx, sx, sy, 1, p.color ?? '#3f8a2e', sway);
      break;
    }
    case 'banyan': {
      // Huge beringin tree with hanging aerial roots (alun-alun landmark).
      ellipse(ctx, sx, sy, 14, 5, 'rgba(30,18,8,0.3)');
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(sx - 6, sy - 26, 12, 26);
      ctx.fillStyle = '#5b3f28';
      ctx.fillRect(sx - 5, sy - 25, 10, 25);
      ctx.fillStyle = '#7a5638';
      ctx.fillRect(sx - 5, sy - 25, 3, 25);
      canopy(ctx, sx, sy - 14, 2.1, '#2f6f2a', sway * 0.4);
      ctx.strokeStyle = 'rgba(74,52,30,0.8)';
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) {
        ctx.moveTo(sx + i * 7, sy - 40);
        ctx.lineTo(sx + i * 7 + sway * 0.4, sy - 22 + Math.abs(i) * 2);
      }
      ctx.stroke();
      break;
    }
    case 'pine': {
      ellipse(ctx, sx + 2, sy + 1, 8, 4, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(sx - 1, sy - 6, 2, 6);
      const g = '#2f6e3a';
      for (let i = 0; i < 3; i++) {
        const w = 9 - i * 2;
        const by = sy - 4 - i * 9;
        poly(ctx, [[sx - w + sway * 0.3 * i, by], [sx + w + sway * 0.3 * i, by], [sx + sway * 0.5 * i, by - 14]], i % 2 ? shade(g, 0.1) : g);
      }
      break;
    }
    case 'palm': {
      ctx.strokeStyle = '#8d6e46';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 4, sy - 18, sx + 2, sy - 32);
      ctx.stroke();
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + sway * 0.1;
        ellipse(ctx, sx + 2 + Math.cos(a) * 7, sy - 33 + Math.sin(a) * 3, 7, 2.5, '#3c9b3c');
      }
      break;
    }
    case 'bush': {
      ellipse(ctx, sx + 1, sy + 1, 8, 3, 'rgba(30,18,8,0.22)');
      blob(ctx, sx - 4, sy - 4, 4.5, '#3d7f2d');
      blob(ctx, sx + 4, sy - 4, 4.5, '#357426');
      blob(ctx, sx, sy - 7, 5, '#4a9637');
      circle(ctx, sx - 4, sy - 5, 4.5, '#3d7f2d');
      circle(ctx, sx + 4, sy - 4, 4.5, '#357426');
      circle(ctx, sx - 1, sy - 9, 2, '#6cbf4f');
      break;
    }
    case 'flowers': {
      ellipse(ctx, sx, sy, 8, 4, '#3f7f2e');
      const cols = ['#ff6f91', '#ffd23f', '#ffffff', '#b388ff'];
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = cols[i % 4];
        ctx.fillRect(sx - 6 + ((i * 5) % 12), sy - 3 + ((i * 3) % 5), 2, 2);
      }
      break;
    }
    case 'lamp': {
      ellipse(ctx, sx, sy, 3, 1.5, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = '#3b4148';
      ctx.fillRect(sx - 1, sy - 28, 2, 28);
      ctx.fillRect(sx - 1, sy - 28, 6, 2);
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(sx + 3, sy - 26, 3, 2);
      break;
    }
    case 'bench': {
      ellipse(ctx, sx, sy + 1, 8, 3, 'rgba(0,0,0,0.2)');
      boxShaded(ctx, p.x - 0.3, p.y - 0.1, p.x + 0.3, p.y + 0.1, 3, 2, '#a0662f');
      boxShaded(ctx, p.x - 0.3, p.y - 0.12, p.x + 0.3, p.y - 0.06, 5, 5, '#8a5526');
      ctx.fillStyle = '#333';
      const [a, b] = P(p.x - 0.25, p.y + 0.08);
      const [c, d] = P(p.x + 0.25, p.y + 0.08);
      ctx.fillRect(a, b - 3, 1, 3);
      ctx.fillRect(c, d - 3, 1, 3);
      break;
    }
    case 'fenceX':
    case 'fenceY': {
      const alongX = p.kind === 'fenceX';
      for (let i = -0.45; i <= 0.45; i += 0.15) {
        const [a, b] = alongX ? P(p.x + i, p.y) : P(p.x, p.y + i);
        ctx.fillStyle = '#f4f1e8';
        ctx.fillRect(a - 0.5, b - 7, 1.5, 7);
      }
      const r0 = alongX ? P(p.x - 0.5, p.y, 5) : P(p.x, p.y - 0.5, 5);
      const r1 = alongX ? P(p.x + 0.5, p.y, 5) : P(p.x, p.y + 0.5, 5);
      ctx.strokeStyle = '#d8d2c2';
      ctx.beginPath();
      ctx.moveTo(r0[0], r0[1]);
      ctx.lineTo(r1[0], r1[1]);
      ctx.stroke();
      break;
    }
    case 'hydrant': {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(sx - 2, sy - 7, 4, 7);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(sx - 3, sy - 5, 6, 2);
      circle(ctx, sx, sy - 7, 2, '#a93226');
      break;
    }
    case 'bin': {
      ellipse(ctx, sx, sy, 4, 2, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(sx - 3, sy - 8, 6, 8);
      ctx.fillStyle = '#1e8449';
      ctx.fillRect(sx - 3.5, sy - 9, 7, 2);
      break;
    }
    case 'motor':
      drawMotor(ctx, sx, sy, p.color ?? ['#c0392b', '#2c3e50', '#2980b9', '#7f8c8d'][Math.floor(p.x * 7 + p.y) % 4], true);
      break;
    case 'car':
      drawCarBox(ctx, p.x, p.y, 'x', p.color ?? '#c0392b', false);
      break;
    case 'flag': {
      ctx.fillStyle = '#ddd';
      ctx.fillRect(sx - 0.5, sy - 40, 1.5, 40);
      const w = Math.sin(t * 4) * 1.5;
      poly(ctx, [[sx + 1, sy - 40], [sx + 14, sy - 39 + w], [sx + 14, sy - 35 + w], [sx + 1, sy - 36]], '#e3242b');
      poly(ctx, [[sx + 1, sy - 36], [sx + 14, sy - 35 + w], [sx + 14, sy - 31 + w], [sx + 1, sy - 32]], '#ffffff');
      boxShaded(ctx, p.x - 0.2, p.y - 0.2, p.x + 0.2, p.y + 0.2, 0, 3, '#bdc3c7');
      break;
    }
    case 'pole': {
      ctx.fillStyle = '#6b6b6b';
      ctx.fillRect(sx - 1, sy - 40, 2.5, 40);
      ctx.fillRect(sx - 7, sy - 36, 15, 2);
      ctx.fillStyle = '#3d3d3d';
      ctx.fillRect(sx - 6, sy - 38, 2, 2);
      ctx.fillRect(sx + 5, sy - 38, 2, 2);
      break;
    }
    case 'rock': {
      ellipse(ctx, sx, sy - 1, 6, 3.5, '#8e9aa0');
      ellipse(ctx, sx - 1, sy - 2.5, 3, 1.5, '#b0bcc2');
      break;
    }
    case 'umbrella': {
      ctx.fillStyle = '#555';
      ctx.fillRect(sx, sy - 20, 1.5, 20);
      ellipse(ctx, sx, sy - 20, 16, 7, '#e74c3c');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        poly(ctx, [[sx, sy - 25], [sx + Math.cos(a) * 16, sy - 20 + Math.sin(a) * 7], [sx + Math.cos(a + 0.6) * 16, sy - 20 + Math.sin(a + 0.6) * 7]], '#ffffff');
      }
      break;
    }
    case 'crate': {
      boxShaded(ctx, p.x - 0.18, p.y - 0.15, p.x + 0.18, p.y + 0.15, 0, 5, '#b9853f');
      const cols = ['#e67e22', '#e74c3c', '#27ae60', '#f1c40f'];
      for (let i = 0; i < 3; i++) circle(ctx, sx - 3 + i * 3, sy - 6, 1.6, cols[(i + Math.floor(p.x)) % 4]);
      break;
    }
    case 'pot': {
      ellipse(ctx, sx, sy, 5, 2.5, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = '#a04000';
      ctx.fillRect(sx - 3, sy - 5, 6, 5);
      circle(ctx, sx, sy - 8, 4.5, '#2e8b57');
      circle(ctx, sx - 1, sy - 10, 2, '#58d68d');
      break;
    }
    case 'bus': {
      // Parked city bus along x.
      const L = 1.3;
      const col = p.color ?? '#2e86de';
      boxShaded(ctx, p.x - L, p.y - 0.36, p.x + L, p.y + 0.36, 2, 16, col, shade(col, 0.2), 'rgba(30,18,8,0.5)');
      for (let k = -L + 0.2; k < L - 0.1; k += 0.32) {
        const [a, b] = P(p.x + k, p.y + 0.37, 11);
        ctx.fillStyle = '#cfe8f3';
        ctx.fillRect(a, b - 3, 5, 4);
      }
      for (const k of [-L + 0.35, L - 0.35]) {
        const [wx, wy] = P(p.x + k, p.y + 0.37, 2);
        circle(ctx, wx, wy, 3, '#1b1b1b');
      }
      break;
    }
    case 'beachChair': {
      ctx.fillStyle = '#c98a32';
      ctx.fillRect(sx - 6, sy - 2, 12, 2);
      ctx.fillStyle = p.color ?? '#e74c3c';
      ctx.fillRect(sx - 6, sy - 4, 8, 2);
      ctx.fillRect(sx + 1, sy - 8, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 4, sy - 4, 2, 2);
      break;
    }
    case 'planter': {
      boxShaded(ctx, p.x - 0.3, p.y - 0.3, p.x + 0.3, p.y + 0.3, 0, 5, '#b9a68a', '#d4c4a8', 'rgba(30,18,8,0.4)');
      blob(ctx, sx - 3, sy - 9, 4, '#3d7f2d');
      blob(ctx, sx + 3, sy - 9, 4, '#357426');
      circle(ctx, sx - 3, sy - 9, 4, '#3d7f2d');
      circle(ctx, sx, sy - 12, 3, '#56a83f');
      break;
    }
  }
}

export function drawMotor(ctx: Ctx, sx: number, sy: number, color: string, flip: boolean): void {
  const f = flip ? -1 : 1;
  ellipse(ctx, sx, sy, 7, 2.5, 'rgba(0,0,0,0.25)');
  circle(ctx, sx - 4 * f, sy - 2, 2.2, '#222');
  circle(ctx, sx + 4 * f, sy - 2, 2.2, '#222');
  ctx.fillStyle = color;
  ctx.fillRect(sx - 4, sy - 6, 8, 3);
  ctx.fillStyle = '#222';
  ctx.fillRect(sx - 2, sy - 8, 4, 2);
  ctx.fillStyle = '#bbb';
  ctx.fillRect(sx + 3 * f, sy - 9, 1, 3);
}

/** A small car on the ground, oriented along x or y. */
export function drawCarBox(ctx: Ctx, x: number, y: number, axis: 'x' | 'y', color: string, angkot: boolean): void {
  const L = angkot ? 0.65 : 0.55;
  const Wd = 0.3;
  const [x0, x1, y0, y1] = axis === 'x' ? [x - L, x + L, y - Wd, y + Wd] : [x - Wd, x + Wd, y - L, y + L];
  const [sx, sy] = P(x, y);
  ellipse(ctx, sx, sy + 1, 18, 8, 'rgba(0,0,0,0.25)');
  boxShaded(ctx, x0, y0, x1, y1, 2, angkot ? 11 : 6, color);
  if (!angkot) {
    const [cx0, cx1, cy0, cy1] = axis === 'x' ? [x - L * 0.5, x + L * 0.4, y0 + 0.03, y1 - 0.03] : [x0 + 0.03, x1 - 0.03, y - L * 0.5, y + L * 0.4];
    boxShaded(ctx, cx0, cy0, cx1, cy1, 8, 5, '#a9d4e8', shade(color, 0.1));
  } else {
    // Windows strip
    poly(ctx, axis === 'x' ? [P(x0 + 0.1, y1, 7), P(x1 - 0.1, y1, 7), P(x1 - 0.1, y1, 11), P(x0 + 0.1, y1, 11)] : [P(x1, y0 + 0.1, 7), P(x1, y1 - 0.1, 7), P(x1, y1 - 0.1, 11), P(x1, y0 + 0.1, 11)], '#bfe0ee');
  }
  // Wheels
  for (const k of [-0.6, 0.6]) {
    const [wx, wy] = axis === 'x' ? P(x + k * L, y1, 2) : P(x1, y + k * L, 2);
    circle(ctx, wx, wy, 2.2, '#1b1b1b');
  }
}
