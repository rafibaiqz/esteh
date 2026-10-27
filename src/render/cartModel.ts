import { STAFF } from '../data/business';
import { CARTS, type CartLook } from '../data/carts';
import type { Look } from '../entities/Customer';
import type { CartId, StaffRole, UpgradeId } from '../game/types';
import type { Face } from '../world/Map';
import { DEFAULT_SELLER, SELLER_LOOKS, drawCharacter, type Act } from './characters';
import { P, box as isoBox, circle, ellipse, faceQuad, faceText, poly, shade, type Ctx } from './draw';

/**
 * THE cart renderer. The game world, the cart shop previews and the title
 * screen all call drawCartModel() with the same CartLook, so a cart always
 * looks identical everywhere (only the camera scale differs).
 *
 * Carts are modelled in a local frame: u runs along the serving side, v points
 * from the back (where the seller stands) to the front (customers).
 */

export interface CartFrame {
  x: number;
  y: number;
  face: Face;
  /** Queue direction (world), used to place the side equipment and the seller's helper. */
  qdx: number;
  qdy: number;
}

export interface CartRenderOpts {
  upgrades: UpgradeId[];
  staff: StaffRole[];
  seller: string;
  /** Pour progress 0..1 while serving, −1 when idle. */
  pour: number;
  bounce: number;
  t: number;
  night: number;
  soldOut: boolean;
  open: boolean;
  price: string;
  /** World-only extras (queue posts) are skipped in previews. */
  preview?: boolean;
}

const OUT = 'rgba(42,26,16,0.55)';

interface Ops {
  W: (u: number, v: number) => [number, number];
  S: (u: number, v: number, z: number) => [number, number];
  box: (u0: number, u1: number, v0: number, v1: number, z: number, h: number, front: string, side: string, top: string, outline?: boolean) => void;
  front: (v: number, a: number, b: number, z0: number, z1: number, fill: string, stroke?: string) => void;
  side: (u: number, a: number, b: number, z0: number, z1: number, fill: string, stroke?: string) => void;
  frontText: (v: number, c: number, z: number, text: string, color: string, size: number, maxW?: number) => void;
}

function ops(ctx: Ctx, f: CartFrame): Ops {
  const cx = f.x + 0.5;
  const cy = f.y + 0.5;
  const left = f.face === 'left';
  const W = (u: number, v: number): [number, number] => (left ? [cx + u, cy + v] : [cx + v, cy + u]);
  return {
    W,
    S: (u, v, z) => {
      const [x, y] = W(u, v);
      return P(x, y, z);
    },
    box: (u0, u1, v0, v1, z, h, front, side, top, outline = true) => {
      if (left) isoBox(ctx, cx + u0, cy + v0, cx + u1, cy + v1, z, h, { top, left: front, right: side, outline: outline ? OUT : undefined });
      else isoBox(ctx, cx + v0, cy + u0, cx + v1, cy + u1, z, h, { top, left: side, right: front, outline: outline ? OUT : undefined });
    },
    front: (v, a, b, z0, z1, fill, stroke) => {
      if (left) faceQuad(ctx, 'left', cy + v, cx + a, cx + b, z0, z1, fill, stroke);
      else faceQuad(ctx, 'right', cx + v, cy + a, cy + b, z0, z1, fill, stroke);
    },
    side: (u, a, b, z0, z1, fill, stroke) => {
      if (left) faceQuad(ctx, 'right', cx + u, cy + a, cy + b, z0, z1, fill, stroke);
      else faceQuad(ctx, 'left', cy + u, cx + a, cx + b, z0, z1, fill, stroke);
    },
    frontText: (v, c, z, text, color, size, maxW) => {
      if (left) faceText(ctx, 'left', cy + v, cx + c, z, text, color, size, maxW);
      else faceText(ctx, 'right', cx + v, cy + c, z, text, color, size, maxW);
    },
  };
}

function staffLook(role: StaffRole): Look {
  const skins: Record<StaffRole, string> = { penjual: '#e0ac85', peracik: '#a86e4b', kasir: '#f1c9a5', supervisor: '#c68a62' };
  return { skin: skins[role], hair: '#2b1d14', shirt: STAFF[role].shirt, pants: '#3b3b3b', accessory: role === 'kasir' ? 'hijab' : 'none', child: false, scale: 1 };
}

/** Footprint of everything drawn for the cart, for depth sorting. */
export function cartBounds(f: CartFrame, look: CartLook): { x0: number; y0: number; x1: number; y1: number; h: number } {
  const L = look.length / 2 + 0.12;
  const D = look.depth / 2;
  const u0 = -L;
  const u1 = L;
  const v0 = -D - 0.3;
  const v1 = D + 0.15;
  const cx = f.x + 0.5;
  const cy = f.y + 0.5;
  return f.face === 'left'
    ? { x0: cx + u0, y0: cy + v0, x1: cx + u1, y1: cy + v1, h: look.canopyZ + 14 }
    : { x0: cx + v0, y0: cy + u0, x1: cx + v1, y1: cy + u1, h: look.canopyZ + 14 };
}

// ------------------------------------------------------------------ parts

function wheel(ctx: Ctx, sx: number, sy: number, r: number, color: string, kind: CartLook['wheels'], rubber: boolean): void {
  circle(ctx, sx, sy, r + 0.8, '#2a1a10');
  circle(ctx, sx, sy, r, rubber ? '#3a3a3e' : color);
  if (kind === 'spoke' || kind === 'wagon') {
    circle(ctx, sx, sy, r - 1.4, shade(color, 0.25));
    ctx.strokeStyle = rubber ? '#9a9aa0' : shade(color, -0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      ctx.moveTo(sx - Math.cos(a) * (r - 1.4), sy - Math.sin(a) * (r - 1.4));
      ctx.lineTo(sx + Math.cos(a) * (r - 1.4), sy + Math.sin(a) * (r - 1.4));
    }
    ctx.stroke();
    circle(ctx, sx, sy, 1.2, '#2a1a10');
  } else circle(ctx, sx, sy, 1, '#9a9aa0');
}

function counterGoods(ctx: Ctx, o: Ops, look: CartLook, L: number, D: number, z: number, opts: CartRenderOpts): void {
  const has = (u: UpgradeId) => opts.upgrades.includes(u);
  // Tea jars / dispenser at the far end (u1 side) so the seller stays visible in the middle.
  const ju = L * 0.62;
  if (has('dispenser')) {
    const [sx, sy] = o.S(ju, 0.02, z);
    ctx.fillStyle = 'rgba(214,234,248,0.85)';
    ctx.fillRect(sx - 4, sy - 13, 8, 13);
    const level = opts.pour >= 0 ? 1 - opts.pour * 0.1 : 1;
    ctx.fillStyle = '#9c4f12';
    ctx.fillRect(sx - 3, sy - 11 * level, 6, 11 * level);
    ctx.fillStyle = '#d7dbdd';
    ctx.fillRect(sx - 4, sy - 15, 8, 2);
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(sx + 3, sy - 3, 3, 2);
    ctx.strokeStyle = OUT;
    ctx.strokeRect(sx - 4.5, sy - 15.5, 9, 15);
  } else if (look.display === 'glass') {
    o.box(L * 0.3, L * 0.95, -D * 0.6, D * 0.5, z, 6, 'rgba(214,234,248,0.55)', 'rgba(190,220,236,0.55)', 'rgba(230,244,250,0.6)');
    for (const uu of [0.45, 0.65, 0.85]) {
      const [sx, sy] = o.S(L * uu, 0, z);
      ctx.fillStyle = '#a0521a';
      ctx.fillRect(sx - 1.5, sy - 4, 3, 4);
    }
  } else if (look.display === 'barrel') {
    const [sx, sy] = o.S(ju, 0, z);
    ellipse(ctx, sx, sy - 9, 5, 2.5, '#b07a43');
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(sx - 5, sy - 9, 10, 9);
    ctx.fillStyle = '#d4a24c';
    ctx.fillRect(sx - 5, sy - 7, 10, 1);
    ctx.fillRect(sx - 5, sy - 3, 10, 1);
    ellipse(ctx, sx, sy - 9, 4, 1.8, '#9c4f12');
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(sx - 6, sy - 4, 2, 2);
  } else {
    for (const [du, dv] of [
      [0.5, -0.05],
      [0.82, 0.08],
    ]) {
      const [sx, sy] = o.S(L * du, D * dv, z);
      ctx.fillStyle = 'rgba(230,245,250,0.85)';
      ctx.fillRect(sx - 3, sy - 9, 6, 9);
      ctx.fillStyle = '#a0521a';
      ctx.fillRect(sx - 2, sy - 7, 4, 7);
      ctx.fillStyle = '#e7b65c';
      ctx.fillRect(sx - 3, sy - 10, 6, 1);
    }
  }
  if (has('wadahTeh')) {
    const [sx, sy] = o.S(L * 0.32, -D * 0.25, z);
    ctx.fillStyle = 'rgba(230,245,250,0.9)';
    ctx.fillRect(sx - 3, sy - 8, 6, 8);
    ctx.fillStyle = '#6e3610';
    ctx.fillRect(sx - 2, sy - 6, 4, 6);
  }
  if (has('seduh')) {
    const [sx, sy] = o.S(L * 0.95, -D * 0.6, z);
    ellipse(ctx, sx, sy - 6, 4.5, 2, '#8c9aa3');
    ctx.fillStyle = '#9fadb5';
    ctx.fillRect(sx - 4.5, sy - 6, 9, 6);
    ctx.fillStyle = '#6c7a83';
    ctx.fillRect(sx - 4.5, sy - 1, 9, 1);
  }
  // Ice bucket and cup stack near the seller's hands (low, so the face stays visible).
  {
    const [sx, sy] = o.S(-L * 0.55, D * 0.15, z);
    ctx.fillStyle = '#5dade2';
    ctx.fillRect(sx - 3, sy - 4, 6, 4);
    ctx.fillStyle = '#eaf6fb';
    ctx.fillRect(sx - 2, sy - 6, 2, 2);
    ctx.fillRect(sx + 1, sy - 5, 2, 2);
  }
  {
    const [sx, sy] = o.S(-L * 0.82, -D * 0.1, z);
    const n = has('rakGelas') ? 7 : 4;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#f4f9fb' : '#dfeaef';
      ctx.fillRect(sx - 2, sy - 2 - i * 1.6, 4, 2);
    }
  }
  if (has('dispenserGula')) {
    const [sx, sy] = o.S(-L * 0.25, -D * 0.45, z);
    ctx.fillStyle = '#f7f7f2';
    ctx.fillRect(sx - 2, sy - 6, 4, 6);
    ctx.fillStyle = '#c0c6c9';
    ctx.fillRect(sx - 2, sy - 7, 4, 1);
  }
  if (has('qris')) {
    const [sx, sy] = o.S(-L * 0.35, D * 0.45, z);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 3, sy - 7, 6, 7);
    ctx.fillStyle = '#111';
    ctx.fillRect(sx - 2, sy - 6, 2, 2);
    ctx.fillRect(sx + 1, sy - 6, 1, 1);
    ctx.fillRect(sx - 2, sy - 3, 1, 2);
    ctx.fillRect(sx, sy - 3, 2, 1);
    ctx.fillStyle = '#b9473e';
    ctx.fillRect(sx - 3, sy - 8, 6, 1);
  }
  if (has('kartuStempel')) {
    const [sx, sy] = o.S(L * 0.15, D * 0.5, z);
    ctx.fillStyle = '#e7b65c';
    ctx.fillRect(sx - 2, sy - 4, 4, 4);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(sx - 1, sy - 3, 2, 1);
  }
  // Fresh cup being filled at the front while serving.
  if (opts.pour >= 0) {
    const [sx, sy] = o.S(0, D * 0.7, z);
    ctx.fillStyle = '#eef6f9';
    ctx.fillRect(sx - 2, sy - 6, 5, 6);
    ctx.fillStyle = '#a0521a';
    const h = Math.round(5 * opts.pour);
    ctx.fillRect(sx - 1, sy - h, 3, h);
  }
}

function canopy(ctx: Ctx, o: Ops, look: CartLook, L: number, D: number, opts: CartRenderOpts): void {
  const z = look.canopyZ;
  const ou = L + 0.1;
  const v0 = -D - 0.1;
  const v1 = D + 0.16;
  const A = look.canopyA;
  const B = look.canopyB;
  const pts = (u0: number, u1: number, va: number, vb: number, za: number, zb: number) => [o.S(u0, va, za), o.S(u1, va, za), o.S(u1, vb, zb), o.S(u0, vb, zb)];
  if (look.canopy === 'gable') {
    const vm = (v0 + v1) / 2;
    poly(ctx, pts(-ou, ou, v0, vm, z, z + 7), shade(A, -0.25), OUT);
    poly(ctx, pts(-ou, ou, vm, v1, z + 7, z), A, OUT);
    // Gable end
    poly(ctx, [o.S(ou, v0, z), o.S(ou, v1, z), o.S(ou, vm, z + 7)], B, OUT);
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      poly(ctx, [o.S(-ou, vm + (v1 - vm) * t, z + 7 * (1 - t)), o.S(ou, vm + (v1 - vm) * t, z + 7 * (1 - t))], undefined, shade(A, -0.2));
    }
    o.front(v1, -ou, ou, z - 2, z, B, OUT);
    return;
  }
  const slope = look.canopy === 'flat' ? 1 : 3;
  const stripes = look.canopy === 'flat' ? 1 : 6;
  for (let i = 0; i < stripes; i++) {
    const a = -ou + ((2 * ou) * i) / stripes;
    const b = -ou + ((2 * ou) * (i + 1)) / stripes;
    poly(ctx, pts(a, b, v0, v1, z + slope, z - 1), i % 2 ? B : A);
  }
  poly(ctx, pts(-ou, ou, v0, v1, z + slope, z - 1), undefined, OUT);
  // Valance along the front edge
  if (look.canopy === 'scallop') {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = -ou + ((2 * ou) * i) / n;
      const b = -ou + ((2 * ou) * (i + 1)) / n;
      const [x1, y1] = o.S(a, v1, z - 1);
      const [x2, y2] = o.S(b, v1, z - 1);
      ctx.fillStyle = i % 2 ? B : A;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 5, x1, y1);
      ctx.fill();
    }
  } else {
    o.front(v1, -ou, ou, z - 3, z - 1, look.canopy === 'flat' ? B : A, OUT);
  }
  // Side valance
  if (look.canopy !== 'flat') o.side(ou, v0, v1, z - 2, z - 1 + slope * 0.3, shade(A, -0.2));
  if (opts.upgrades.includes('terpal')) {
    // Rolled rain tarp under the front edge.
    o.front(v1 + 0.01, -ou + 0.05, ou - 0.05, z - 5, z - 3, '#9fc6d9', OUT);
  }
}

function decorations(ctx: Ctx, o: Ops, look: CartLook, L: number, D: number, opts: CartRenderOpts): void {
  const z = look.canopyZ - 2;
  const v1 = D + 0.16;
  const ou = L + 0.1;
  const bulbs = look.decor === 'bulbs' || opts.upgrades.includes('lampuHias');
  if (look.decor === 'bunting') {
    const cols = ['#e74c3c', '#f1c40f', '#2e86de', '#27ae60', '#ffffff'];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = -ou + ((2 * ou) * i) / n;
      const b = -ou + ((2 * ou) * (i + 1)) / n;
      const [x1, y1] = o.S(a, v1 + 0.02, z - 1);
      const [x2, y2] = o.S(b, v1 + 0.02, z - 1);
      poly(ctx, [[x1, y1], [x2, y2], [(x1 + x2) / 2, (y1 + y2) / 2 + 5]], cols[i % cols.length]);
    }
  }
  if (bulbs) {
    const cols = look.decor === 'bulbs' ? ['#ffe9a8'] : ['#ff6b6b', '#ffe66d', '#4ecdc4', '#ffffff'];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const u = -ou + ((2 * ou) * i) / n;
      const [x, y] = o.S(u, v1 + 0.03, z - 2 - Math.sin((i / n) * Math.PI) * 2);
      const on = opts.night > 0.2 ? (Math.sin(opts.t * 3 + i) > -0.6 ? 1 : 0.55) : 0.75;
      ctx.globalAlpha = on;
      circle(ctx, x, y, 1.3, cols[i % cols.length]);
      ctx.globalAlpha = 1;
    }
  }
  if (look.decor === 'brass') {
    for (const u of [-L, L]) {
      const [x, y] = o.S(u, D, look.bodyZ + look.bodyH);
      circle(ctx, x, y, 1.5, '#e8c066');
    }
  }
}

function sign(o: Ops, look: CartLook, L: number, D: number): void {
  if (look.signStyle === 'board') {
    // Standing board on top of the canopy.
    const z = look.canopyZ + 2;
    o.box(-L * 0.55, L * 0.55, -0.02, 0.02, z, 8, look.signBg, shade(look.signBg, -0.25), shade(look.signBg, 0.1));
    o.frontText(0.03, 0, z + 4, look.sign, look.signFg, 6, L * 32);
  } else if (look.signStyle === 'marquee') {
    const v = D + 0.17;
    const z0 = look.canopyZ - 9;
    o.front(v, -L * 0.85, L * 0.85, z0, z0 + 6, look.signBg, OUT);
    o.frontText(v + 0.01, 0, z0 + 3, look.sign, look.signFg, 5, L * 52);
  }
}

// ------------------------------------------------------------------ people

function seller(ctx: Ctx, o: Ops, D: number, clipZ: number, opts: CartRenderOpts, u: number, who: Look, act: Act, phase: number, apron?: string): void {
  const v = -D - 0.18;
  const [sx, sy] = o.S(u, v, 0);
  // Only the part above the counter's back edge is visible.
  const [, ey] = o.S(u, -D, clipZ);
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx - 40, sy - 80, 80, ey - (sy - 80) + 1);
  ctx.clip();
  const faceLeftOnScreen = o.S(0, 1, 0)[0] < o.S(0, 0, 0)[0];
  drawCharacter(ctx, sx, sy, who, { facing: 'front', flip: faceLeftOnScreen, frame: -1, act, actPhase: phase, apron, breathe: Math.sin(opts.t * 2 + u) > 0.6 ? 1 : 0 }, false);
  ctx.restore();
}

function sellerAct(opts: CartRenderOpts): { act: Act; phase: number } {
  if (opts.pour >= 0 && opts.pour < 0.8) return { act: 'pour', phase: opts.pour / 0.8 };
  if (opts.pour >= 0.8 || opts.bounce > 0.3) return { act: 'serve', phase: 0 };
  // Idle: every few seconds the seller waves passers-by over.
  if (opts.open && !opts.soldOut && !opts.preview && opts.t % 7 < 1.3) return { act: 'wave', phase: opts.t * 2 };
  return { act: 'none', phase: 0 };
}

// ------------------------------------------------------------------ main entry

export function drawCartModel(ctx: Ctx, f: CartFrame, cartId: CartId, opts: CartRenderOpts): void {
  const look = (CARTS[cartId] ?? CARTS.gerobak).look;
  const has = (u: UpgradeId) => opts.upgrades.includes(u);
  const o = ops(ctx, f);
  const L = look.length / 2;
  const D = look.depth / 2;
  const sellerLook = SELLER_LOOKS[opts.seller] ?? SELLER_LOOKS[DEFAULT_SELLER];
  const { act, phase } = sellerAct(opts);
  // Queue direction in local u (sign only): equipment goes on the other side.
  const qU = f.face === 'left' ? f.qdx : f.qdy;
  const sideU = qU > 0 ? -1 : 1;

  // Ground shadow
  {
    const [sx, sy] = o.S(0, 0, 0);
    ellipse(ctx, sx, sy + 2, 12 + look.length * 12, 6 + look.depth * 5, 'rgba(30,18,8,0.25)');
  }

  // Ground equipment beside the cart (opposite side of the queue).
  const groundU = sideU * (L + 0.32);
  if (has('cooler') || has('kotakEs')) {
    const cool = has('cooler');
    o.box(groundU - 0.16, groundU + 0.16, -0.14, 0.14, 0, cool ? 8 : 7, cool ? '#2e86de' : '#f4f6f7', cool ? '#1f5f9e' : '#d5dadc', cool ? '#ecf0f1' : '#d6eaf8');
  }
  if (has('mejaRacik')) {
    const mu = groundU + sideU * 0.02;
    const md = -D - 0.05;
    const [lx, ly] = o.S(mu, md, 0);
    ctx.fillStyle = '#6d4c2f';
    ctx.fillRect(lx - 5, ly - 8, 1, 8);
    ctx.fillRect(lx + 4, ly - 8, 1, 8);
    o.box(mu - 0.18, mu + 0.18, md - 0.15, md + 0.15, 8, 2, '#c8a165', '#a8834c', '#dcb984');
    for (let i = 0; i < 3; i++) {
      const [px2, py2] = o.S(mu - 0.08 + i * 0.08, md, 10);
      ctx.fillStyle = '#eef6f9';
      ctx.fillRect(px2 - 1, py2 - 4, 2, 4);
    }
  }

  // Staff who stand behind the counter (drawn first: they are further back).
  const counterTop = look.bodyZ + look.bodyH + 1;
  const bounce = Math.sin(opts.bounce * Math.PI) * 1.2;
  ctx.save();
  ctx.translate(0, -bounce);

  if (look.kind === 'kiosk') kiosk(ctx, o, look, L, D, opts, sellerLook, act, phase);
  else if (look.kind === 'truck') truck(ctx, o, look, L, D, opts, sellerLook, act, phase);
  else {
    // Push handle (back end) and legs.
    const [h1x, h1y] = o.S(-L, -D * 0.3, look.bodyZ + 6);
    const [h2x, h2y] = o.S(-L - 0.22, -D * 0.3, look.bodyZ + 9);
    ctx.strokeStyle = '#4a3123';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(h1x, h1y);
    ctx.lineTo(h2x, h2y);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (look.kind === 'bike') bikeFrame(ctx, o, look, L, D);
    else {
      for (const [uu, vv] of [
        [-L + 0.06, -D + 0.06],
        [-L + 0.06, D - 0.06],
      ]) {
        const [lx, ly] = o.S(uu, vv, 0);
        ctx.fillStyle = '#4a3123';
        ctx.fillRect(lx - 0.5, ly - look.bodyZ, 1.5, look.bodyZ);
      }
    }
    // Back canopy posts
    const postColor = look.canopy === 'gable' || look.planks ? '#6d4c2f' : '#d0d3d4';
    if (look.canopy !== 'none') for (const uu of [-L + 0.03, L - 0.03]) post(ctx, o, uu, -D + 0.03, counterTop, look.canopyZ, postColor);

    // Helpers behind the counter, then the seller in the middle.
    if (opts.staff.includes('peracik')) seller(ctx, o, D, counterTop, opts, L * 0.55, staffLook('peracik'), opts.pour >= 0 ? 'pour' : 'none', phase);
    if (opts.staff.includes('kasir')) seller(ctx, o, D, counterTop, opts, -L * 0.6, staffLook('kasir'), 'none', 0);
    seller(ctx, o, D, counterTop, opts, 0, sellerLook, act, phase, sellerLook.apron);

    // Body
    const body = look.body;
    o.box(-L, L, -D, D, look.bodyZ, look.bodyH, body, shade(body, -0.22), shade(body, 0.15));
    // Cream front panel with trim and painted sign
    o.front(D + 0.005, -L + 0.06, L - 0.06, look.bodyZ + 1.5, look.bodyZ + look.bodyH - 1.5, look.panel, OUT);
    o.front(D + 0.01, -L, L, look.bodyZ + look.bodyH - 1.5, look.bodyZ + look.bodyH, look.trim);
    if (look.planks) for (const zz of [look.bodyZ + 3, look.bodyZ + 6]) o.side(L + 0.005, -D, D, zz, zz + 0.6, shade(body, -0.4));
    o.side(L + 0.005, -D + 0.05, D - 0.05, look.bodyZ + 1.5, look.bodyZ + look.bodyH - 1.5, shade(look.panel, -0.18), OUT);
    emblem(ctx, o, D + 0.02, look);
    // Counter lid
    o.box(-L - 0.03, L + 0.03, -D - 0.03, D + 0.03, look.bodyZ + look.bodyH, 1, look.trim, shade(look.trim, -0.25), shade(look.trim, 0.2));

    // Wheels on the visible side
    const rubber = has('rodaKaret');
    if (look.kind === 'bike') {
      for (const vv of [-D + 0.05, D - 0.05]) {
        const [wx, wy] = o.S(L - 0.05, vv, 4);
        wheel(ctx, wx, wy, 4, look.wheelColor, 'small', rubber);
      }
    } else if (look.wheels === 'spoke') {
      const [wx, wy] = o.S(L + 0.02, 0, 6);
      wheel(ctx, wx, wy, 6, look.wheelColor, 'spoke', rubber);
    } else if (look.wheels === 'wagon') {
      for (const vv of [-D * 0.5, D * 0.5]) {
        const [wx, wy] = o.S(L + 0.02, vv, 6);
        wheel(ctx, wx, wy, 6, look.wheelColor, 'wagon', rubber);
      }
    } else if (look.wheels === 'small') {
      for (const vv of [-D + 0.08, D - 0.08]) {
        const [wx, wy] = o.S(L + 0.01, vv, 3);
        wheel(ctx, wx, wy, 3, look.wheelColor, 'small', rubber);
      }
    }

    counterGoods(ctx, o, look, L, D, look.bodyZ + look.bodyH + 1, opts);
    if (look.canopy !== 'none') for (const uu of [-L + 0.03, L - 0.03]) post(ctx, o, uu, D - 0.03, counterTop, look.canopyZ, look.canopy === 'gable' || look.planks ? '#6d4c2f' : '#d0d3d4');
    if (has('lampu')) {
      const [lx, ly] = o.S(0, D * 0.6, look.canopyZ - 4);
      ctx.fillStyle = '#4a3123';
      ctx.fillRect(lx, ly - 2, 1, 3);
      circle(ctx, lx + 0.5, ly + 2, 2, opts.night > 0.2 ? '#fff3b0' : '#f5e6c8');
    }
    canopy(ctx, o, look, L, D, opts);
    decorations(ctx, o, look, L, D, opts);
    sign(o, look, L, D);
  }
  ctx.restore();

  // Big umbrella planted beside open carts (shade for waiting customers).
  if (has('payung') && !CARTS[cartId].roofed) umbrella(ctx, o, sideU * (L + 0.35), D * 0.2, look.canopyZ + 4);

  // Standing price board
  if (has('papanNama')) priceBoard(ctx, o, sideU * (L + 0.4), D + 0.65, opts.price);
  if (has('papanMenu')) chalkboard(ctx, o, -sideU * (L + 0.1), D + 0.3);

  // Seller calling out in front
  if (opts.staff.includes('penjual')) {
    const [sx, sy] = o.S(sideU * (L + 0.55), D + 0.25, 0);
    drawCharacter(ctx, sx, sy, staffLook('penjual'), { facing: 'front', flip: sideU < 0 === (f.face === 'left'), frame: -1, act: opts.open ? 'wave' : 'none', actPhase: opts.t * 2 });
  }
  if (opts.staff.includes('supervisor')) {
    const [sx, sy] = o.S(sideU * (L + 0.3), -D - 0.45, 0);
    drawCharacter(ctx, sx, sy, staffLook('supervisor'), { facing: 'front', flip: f.face === 'left', frame: -1 });
  }

  // Status sign hanging from the front
  if (!opts.open || opts.soldOut) {
    const [sx, sy] = o.S(0, D + 0.2, Math.max(look.bodyZ + look.bodyH + 14, 24));
    ctx.fillStyle = opts.soldOut ? '#b9473e' : '#75583f';
    ctx.fillRect(Math.round(sx - 12), Math.round(sy - 5), 24, 9);
    ctx.strokeStyle = '#2a1a10';
    ctx.strokeRect(Math.round(sx - 12) + 0.5, Math.round(sy - 5) + 0.5, 23, 8);
    ctx.fillStyle = '#fff8e9';
    ctx.font = 'bold 6px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.soldOut ? 'HABIS' : 'TUTUP', sx, sy);
  }
}

/** Brand emblem painted on the front panel: a glass of iced tea between two dots. */
function emblem(ctx: Ctx, o: Ops, v: number, look: CartLook): void {
  const [sx, sy] = o.S(0, v, look.bodyZ + look.bodyH / 2);
  const x = Math.round(sx);
  const y = Math.round(sy);
  ctx.fillStyle = look.signFg;
  ctx.fillRect(x - 3, y - 3, 6, 1);
  ctx.fillRect(x - 3, y - 2, 1, 5);
  ctx.fillRect(x + 2, y - 2, 1, 5);
  ctx.fillRect(x - 2, y + 2, 4, 1);
  ctx.fillStyle = '#c98a32';
  ctx.fillRect(x - 2, y - 1, 4, 3);
  ctx.fillStyle = '#b9473e';
  ctx.fillRect(x + 1, y - 5, 1, 3);
  ctx.fillStyle = look.trim;
  ctx.fillRect(x - 7, y, 2, 1);
  ctx.fillRect(x + 5, y, 2, 1);
}

function post(ctx: Ctx, o: Ops, u: number, v: number, z0: number, z1: number, color: string): void {
  const [ax, ay] = o.S(u, v, z0);
  const [, by] = o.S(u, v, z1);
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(ax) - 0.5, by, 1.5, ay - by);
}

function bikeFrame(ctx: Ctx, o: Ops, look: CartLook, L: number, D: number): void {
  // Rear wheel, saddle and handlebar behind the cargo box.
  const [rx, ry] = o.S(-L - 0.35, 0, 5);
  wheel(ctx, rx, ry, 5, look.wheelColor, 'small', false);
  const [ax, ay] = o.S(-L, 0, look.bodyZ + 2);
  ctx.strokeStyle = '#3a3a3e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.lineTo(ax, ay);
  const [sx, sy] = o.S(-L - 0.25, 0, 14);
  ctx.moveTo(rx, ry);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(sx - 3, sy - 1, 5, 2);
  void D;
}

function umbrella(ctx: Ctx, o: Ops, u: number, v: number, z: number): void {
  const [px, py] = o.S(u, v, 0);
  ellipse(ctx, px + 6, py + 2, 18, 6, 'rgba(30,18,8,0.15)');
  ctx.fillStyle = '#e8e2d6';
  ctx.fillRect(px - 0.5, py - z, 1.5, z);
  const top = py - z - 8;
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    poly(ctx, [[px, top], [px + Math.cos(a0) * 22, py - z + Math.sin(a0) * 10], [px + Math.cos(a1) * 22, py - z + Math.sin(a1) * 10]], i % 2 ? '#c98a32' : '#fff8e9');
  }
  ctx.strokeStyle = OUT;
  ctx.beginPath();
  ctx.ellipse(px, py - z, 22, 10, 0, 0, Math.PI);
  ctx.stroke();
  circle(ctx, px, top, 1.5, '#6b4226');
}

function priceBoard(ctx: Ctx, o: Ops, u: number, v: number, price: string): void {
  const [sx, sy] = o.S(u, v, 0);
  ellipse(ctx, sx, sy, 7, 2.5, 'rgba(30,18,8,0.25)');
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(sx - 6, sy - 6, 1, 6);
  ctx.fillRect(sx + 5, sy - 6, 1, 6);
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(sx - 8, sy - 20, 17, 14);
  ctx.strokeStyle = '#e7b65c';
  ctx.strokeRect(sx - 7.5, sy - 19.5, 16, 13);
  ctx.fillStyle = '#e7b65c';
  ctx.font = 'bold 5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ESTEH', sx + 0.5, sy - 16);
  ctx.fillStyle = '#fff8e9';
  ctx.fillText(price, sx + 0.5, sy - 10, 15);
}

function chalkboard(ctx: Ctx, o: Ops, u: number, v: number): void {
  const [sx, sy] = o.S(u, v, 0);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(sx - 5, sy - 13, 10, 13);
  ctx.fillStyle = '#2f3b33';
  ctx.fillRect(sx - 4, sy - 12, 8, 9);
  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(sx - 3, sy - 10, 5, 1);
  ctx.fillRect(sx - 3, sy - 8, 6, 1);
  ctx.fillRect(sx - 3, sy - 6, 4, 1);
}

function kiosk(ctx: Ctx, o: Ops, look: CartLook, L: number, D: number, opts: CartRenderOpts, sellerLook: Look & { apron: string }, act: Act, phase: number): void {
  const wallTop = 30;
  // Seller stands inside; the walls are drawn around them and the window shows them.
  o.box(-L, L, -D, D, 0, 12, look.body, shade(look.body, -0.22), shade(look.body, 0.1));
  o.box(-L, L, -D, D, 12, wallTop - 12, look.panel, shade(look.panel, -0.15), shade(look.panel, 0.05));
  // Window opening, then the seller visible through it.
  const wa = -L * 0.72;
  const wb = L * 0.72;
  o.front(D + 0.005, wa, wb, 13, 27, '#3b2a1e', OUT);
  {
    const [sx, sy] = o.S(0, D - 0.3, 6);
    const [ax, ay] = o.S(wa, D, 27);
    const [bx, by] = o.S(wb, D, 13);
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.min(ax, bx), Math.min(ay, by) - 4, Math.abs(bx - ax), Math.abs(by - ay) + 8);
    ctx.clip();
    if (opts.staff.includes('peracik')) {
      const [px2, py2] = o.S(L * 0.45, D - 0.35, 6);
      drawCharacter(ctx, px2, py2, staffLook('peracik'), { facing: 'front', flip: o.S(0, 1, 0)[0] < o.S(0, 0, 0)[0], frame: -1, act: opts.pour >= 0 ? 'pour' : 'none', actPhase: phase }, false);
    }
    drawCharacter(ctx, sx, sy, sellerLook, { facing: 'front', flip: o.S(0, 1, 0)[0] < o.S(0, 0, 0)[0], frame: -1, act, actPhase: phase, apron: sellerLook.apron }, false);
    ctx.restore();
  }
  // Counter shelf, goods, roof and lit sign box.
  o.box(-L * 0.8, L * 0.8, D - 0.02, D + 0.16, 12, 2, look.trim, shade(look.trim, -0.25), shade(look.trim, 0.2));
  counterGoods(ctx, o, { ...look, display: 'jars' }, L * 0.8, 0.12, 14, opts);
  o.front(D + 0.01, -L, L, 4, 9, look.panel);
  o.frontText(D + 0.02, 0, 6.5, 'ES TEH SEGAR', look.body, 5, L * 52);
  o.box(-L - 0.06, L + 0.06, -D - 0.06, D + 0.06, wallTop, 3, look.trim, shade(look.trim, -0.25), shade(look.trim, 0.15));
  const glow = opts.night > 0.2 && (opts.upgrades.includes('lampu') || opts.upgrades.includes('lampuHias'));
  o.box(-L * 0.7, L * 0.7, -0.08, 0.08, wallTop + 3, 9, glow ? '#fff3c4' : look.signBg, shade(look.signBg, -0.25), shade(look.signBg, 0.15));
  o.frontText(0.09, 0, wallTop + 7.5, look.sign, look.signFg, 7, L * 48);
  decorations(ctx, o, { ...look, canopyZ: wallTop + 2 }, L, D, opts);
}

function truck(ctx: Ctx, o: Ops, look: CartLook, L: number, D: number, opts: CartRenderOpts, sellerLook: Look & { apron: string }, act: Act, phase: number): void {
  const cab = 0.42;
  const bu1 = L - cab;
  o.box(-L, L, -D, D, 3, 5, '#2c2c30', '#1f1f22', '#3a3a3e');
  // Cargo box with a serving window
  o.box(-L, bu1, -D, D, 8, look.bodyH, look.body, shade(look.body, -0.22), shade(look.body, 0.15));
  const wa = -L + 0.15;
  const wb = bu1 - 0.15;
  o.front(D + 0.005, wa, wb, 16, 30, '#3b2a1e', OUT);
  {
    const [sx, sy] = o.S((wa + wb) / 2, D - 0.32, 9);
    const [ax, ay] = o.S(wa, D, 30);
    const [bx, by] = o.S(wb, D, 16);
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.min(ax, bx), Math.min(ay, by) - 4, Math.abs(bx - ax), Math.abs(by - ay) + 8);
    ctx.clip();
    drawCharacter(ctx, sx, sy, sellerLook, { facing: 'front', flip: o.S(0, 1, 0)[0] < o.S(0, 0, 0)[0], frame: -1, act, actPhase: phase, apron: sellerLook.apron }, false);
    ctx.restore();
  }
  o.front(D + 0.01, -L, bu1, 9, 15, look.panel);
  o.frontText(D + 0.02, (-L + bu1) / 2, 12, look.sign, look.signFg, 8, (bu1 + L) * 30);
  o.box(wa, wb, D - 0.02, D + 0.14, 15, 2, look.trim, shade(look.trim, -0.25), shade(look.trim, 0.2));
  counterGoods(ctx, o, { ...look, display: 'jars' }, (wb - wa) / 2, 0.1, 17, opts);
  // Cab
  o.box(bu1, L, -D + 0.04, D - 0.04, 8, 18, look.panel, shade(look.panel, -0.2), shade(look.panel, 0.05));
  o.side(L + 0.005, -D + 0.12, D - 0.12, 15, 23, '#85c1e9', OUT);
  // Wheels
  for (const uu of [-L + 0.3, L - 0.25]) {
    const [wx, wy] = o.S(uu, D, 4);
    wheel(ctx, wx, wy, 5, look.wheelColor, 'small', opts.upgrades.includes('rodaKaret'));
  }
  // Awning over the window
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = wa + ((wb - wa) * i) / n;
    const b = wa + ((wb - wa) * (i + 1)) / n;
    poly(ctx, [o.S(a, D, 34), o.S(b, D, 34), o.S(b, D + 0.3, 30), o.S(a, D + 0.3, 30)], i % 2 ? look.canopyA : look.canopyB);
  }
  decorations(ctx, o, { ...look, canopyZ: 33 }, (wb - wa) / 2, D + 0.15, opts);
}

// ------------------------------------------------------------------ previews

const previewCache = new Map<string, string>();

/**
 * Renders a cart exactly as the world does (same function, same pixels) into
 * a small canvas and returns it as a data URL for the UI. The UI scales it up
 * with nearest-neighbour filtering.
 */
/** Canvas size (1:1 world pixels) and the integer upscale used to show a cart preview. */
export function previewSize(cartId: CartId): { w: number; h: number; scale: number } {
  // Wide enough for the umbrella, price board and cooler that stand beside the cart.
  const kind = CARTS[cartId].look.kind;
  return { w: kind === 'truck' ? 112 : 100, h: 86, scale: 2 };
}

export function cartPreview(cartId: CartId, upgrades: UpgradeId[], seller: string): string {
  const key = `${cartId}|${[...upgrades].sort().join(',')}|${seller}`;
  const hit = previewCache.get(key);
  if (hit) return hit;
  const { w, h } = previewSize(cartId);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // Shift right a little: side equipment stands on the left in this view.
  ctx.translate(Math.round(w / 2) + 8, h - 24);
  // A small patch of paving under the cart.
  for (let gy = -1; gy <= 1; gy++)
    for (let gx = -1; gx <= 1; gx++) {
      const col = (gx + gy) % 2 === 0 ? '#e9dcc3' : '#e2d3b6';
      poly(ctx, [P(gx - 0.5, gy - 0.5), P(gx + 0.5, gy - 0.5), P(gx + 0.5, gy + 0.5), P(gx - 0.5, gy + 0.5)], col, 'rgba(117,88,63,0.25)');
    }
  drawCartModel(ctx, { x: -0.5, y: -0.5, face: 'left', qdx: 1, qdy: 0 }, cartId, {
    upgrades,
    staff: [],
    seller,
    pour: -1,
    bounce: 0,
    t: 0,
    night: 0,
    soldOut: false,
    open: true,
    price: '3rb',
    preview: true,
  });
  const url = c.toDataURL();
  if (previewCache.size > 200) previewCache.clear();
  previewCache.set(key, url);
  return url;
}
