import { CARTS } from '../data/carts';
import type { Customer } from '../entities/Customer';
import { cartBounds, drawCartModel } from '../render/cartModel';
import { drawCharacter, facingFor } from '../render/characters';
import { P, type Ctx } from '../render/draw';
import { groundBounds, renderGround } from '../render/ground';
import { drawBubble } from '../render/people';
import { PROP_HEIGHT, drawCarBox, drawMotor, drawProp, setWind } from '../render/props';
import { drawStructure } from '../render/structures';
import { cupsPossible } from '../systems/InventorySystem';
import type { World } from '../systems/CustomerSystem';
import { currentWeather } from '../systems/WeatherSystem';
import { getSettings } from '../systems/SaveSystem';
import { rpShort } from '../util/format';
import type { GameMap } from '../world/Map';
import { Camera } from './Camera';
import type { Game } from './Game';

interface Drawable {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Screen rect for overlap tests. */
  l: number;
  r: number;
  t: number;
  b: number;
  draw: () => void;
}

interface Drop {
  x: number;
  y: number;
  s: number;
}

/** Renders the active World into the canvas. Purely visual: never mutates game state. */
export class Renderer {
  readonly camera = new Camera();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buffer = document.createElement('canvas');
  private readonly bctx: CanvasRenderingContext2D;
  private readonly light = document.createElement('canvas');
  private readonly lctx: CanvasRenderingContext2D;
  private ground: HTMLCanvasElement | null = null;
  private groundMap: GameMap | null = null;
  private drops: Drop[] = [];
  private offset = { x: 0, y: 0 };
  private customerScreen: { c: Customer; x: number; y: number }[] = [];
  /** Cart anchor (ground centre) and height in buffer pixels, for picking and the seller bubble. */
  private cartScreen = { x: 0, y: 0, h: 40 };
  /** Horizontal shift of the view centre (display px) so overlay panels never hide the cart. */
  private inset = 0;
  private insetTarget = 0;
  private insetY = 0;
  private insetTargetY = 0;
  /** Canvas pixels per CSS pixel of the canvas element (screen scale × device pixel ratio). */
  resolution = 1;
  /** Size of the canvas element in its own CSS px (stage px); all picking uses these units. */
  private viewW = 0;
  private viewH = 0;
  private seller: { text: string; tone: 'good' | 'ok' | 'bad'; t: number } | null = null;
  /**
   * Clock for world animations (water, swaying trees, cart lights, the seller's
   * idle moves, wind). It stands still while the game is paused, so a paused
   * world is truly frozen; only the camera and the UI keep moving.
   */
  private worldT = 0;
  /** Dim the world while paused (off for the title-screen background). */
  pauseTint = true;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.bctx = this.buffer.getContext('2d')!;
    this.lctx = this.light.getContext('2d')!;
  }

  /**
   * Screen space covered by UI on the left/right edge (display px). The world
   * view slides so the cart stays centred in the part that is still visible.
   */
  setInsets(left: number, right: number, top = 0, bottom = 0): void {
    this.insetTarget = (left - right) / 2;
    this.insetTargetY = (top - bottom) / 2;
  }

  /** Short line said by the seller (drawn above the cart at display resolution). */
  sellerSay(text: string, tone: 'good' | 'ok' | 'bad' = 'good'): void {
    this.seller = { text, tone, t: 1.5 };
  }

  /** Cart position on the display canvas: ground anchor and top of the canopy. */
  cartOnCanvas(): { x: number; y: number; top: number } {
    const z = this.camera.zoom;
    const c = this.cartScreen;
    return { x: (c.x + this.offset.x) * z, y: (c.y + this.offset.y) * z, top: (c.y - c.h + this.offset.y) * z };
  }

  /** True when a display-canvas point is on the player's cart. */
  pickCart(px: number, py: number): boolean {
    const z = this.camera.zoom;
    const bx = px / z - this.offset.x;
    const by = py / z - this.offset.y;
    const c = this.cartScreen;
    return Math.abs(bx - c.x) < 28 && by > c.y - c.h - 6 && by < c.y + 12;
  }

  /** Re-centres on the cart (after a location change). */
  focusCart(world: World, smooth = false): void {
    const c = world.map.cart;
    this.camera.setBounds(groundBounds(world.map));
    this.camera.setMapSize(world.map.width, world.map.height);
    if (smooth) this.camera.glideToTile(c.x + 0.5, c.y + 0.5);
    else {
      this.camera.centerOnTile(c.x + 0.5, c.y + 0.5);
      this.camera.clamp();
    }
  }

  private ensureGround(map: GameMap): void {
    if (this.groundMap !== map) {
      this.ground = renderGround(map);
      this.groundMap = map;
      this.camera.setBounds(groundBounds(map));
      this.camera.setMapSize(map.width, map.height);
    }
  }

  private resize(): { w: number; h: number } {
    const w = Math.max(64, Math.round(this.canvas.clientWidth));
    const h = Math.max(64, Math.round(this.canvas.clientHeight));
    this.viewW = w;
    this.viewH = h;
    // The backing store follows the real screen pixels, so pixel art and speech text stay sharp.
    const pw = Math.round(w * this.resolution);
    const ph = Math.round(h * this.resolution);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    const z = this.camera.zoom;
    const bw = Math.ceil(w / z);
    const bh = Math.ceil(h / z);
    if (this.buffer.width !== bw || this.buffer.height !== bh) {
      this.buffer.width = bw;
      this.buffer.height = bh;
      this.light.width = bw;
      this.light.height = bh;
    }
    return { w: bw, h: bh };
  }

  render(game: Game, time: number): void {
    const world = game.world;
    const s = game.state;
    this.ensureGround(world.map);
    const { w, h } = this.resize();
    const ctx = this.bctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = world.map.background;
    ctx.fillRect(0, 0, w, h);
    const dt = Math.min(0.05, time - (this.lastT || time));
    this.camera.update(dt);
    const worldDt = s.paused ? 0 : dt;
    this.worldT += worldDt;
    this.inset += (this.insetTarget - this.inset) * Math.min(1, dt * 9);
    if (Math.abs(this.insetTarget - this.inset) < 0.5) this.inset = this.insetTarget;
    this.insetY += (this.insetTargetY - this.insetY) * Math.min(1, dt * 9);
    if (Math.abs(this.insetTargetY - this.insetY) < 0.5) this.insetY = this.insetTargetY;
    if (this.seller) {
      this.seller.t -= worldDt;
      if (this.seller.t <= 0) this.seller = null;
    }
    const ox = Math.round(w / 2 + this.inset / this.camera.zoom - this.camera.cx);
    const oy = Math.round(h / 2 + this.insetY / this.camera.zoom - this.camera.cy);
    this.offset = { x: ox, y: oy };
    ctx.translate(ox, oy);

    const gb = groundBounds(world.map);
    ctx.drawImage(this.ground!, gb.left, 0);
    this.waterShimmer(ctx, world.map, this.worldT);

    const items = this.collect(game, ctx, this.worldT, w, h);
    for (const d of sortDrawables(items)) d.draw();

    // Overlays: bubbles and floating money above everything.
    for (const { c, x, y } of this.customerScreen) if (c.bubble && !c.reaction) drawBubble(ctx, x, y, c.bubble);
    ctx.font = 'bold 8px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    for (const f of world.floaters) {
      const [sx, sy] = P(f.x, f.y);
      const rise = (1.4 - f.t) * 14;
      ctx.globalAlpha = Math.min(1, f.t * 2);
      ctx.fillStyle = '#1d3b12';
      ctx.fillText(f.text, sx + 1, sy - 30 - rise + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx, sy - 30 - rise);
      ctx.globalAlpha = 1;
    }

    this.atmosphere(game, w, h, time);

    // Blit to the display canvas with nearest-neighbour scaling.
    const out = this.ctx;
    // Everything below is drawn in canvas CSS px; the transform maps it onto the backing pixels.
    out.setTransform(this.resolution, 0, 0, this.resolution, 0, 0);
    out.imageSmoothingEnabled = false;
    out.drawImage(this.buffer, 0, 0, w * this.camera.zoom, h * this.camera.zoom);
    this.drawReactions(out);
    if (this.flash > 0.01) {
      out.fillStyle = `rgba(235,240,255,${0.55 * this.flash})`;
      out.fillRect(0, 0, this.viewW, this.viewH);
    }
    if (s.paused && this.pauseTint) {
      out.fillStyle = 'rgba(10,30,10,0.25)';
      out.fillRect(0, 0, this.viewW, this.viewH);
    }
  }

  private waterShimmer(ctx: Ctx, map: GameMap, t: number): void {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y * map.width + x];
        if (tile.type !== 'water') continue;
        const ph = (t * 0.6 + tile.n * 5) % 1;
        const [sx, sy] = P(x + 0.2 + ph * 0.6, y + 0.3 + tile.n * 0.4);
        ctx.fillRect(Math.round(sx), Math.round(sy), 3, 1);
      }
  }

  private collect(game: Game, ctx: Ctx, time: number, viewW: number, viewH: number): Drawable[] {
    const world = game.world;
    const s = game.state;
    const items: Drawable[] = [];
    // Visible area in iso pixels (plus a margin): objects outside it are neither sorted nor drawn.
    const M = 48;
    const vl = -this.offset.x - M;
    const vr = viewW - this.offset.x + M;
    const vt = -this.offset.y - M;
    const vb = viewH - this.offset.y + M;
    const add = (x0: number, y0: number, x1: number, y1: number, height: number, halfW: number | null, draw: () => void) => {
      let l: number, r: number, t: number, b: number;
      if (halfW === null) {
        l = P(x0, y1)[0] - 4;
        r = P(x1, y0)[0] + 4;
        t = P(x0, y0)[1] - height - 30;
        b = P(x1, y1)[1] + 4;
      } else {
        const [sx, sy] = P((x0 + x1) / 2, (y0 + y1) / 2);
        l = sx - halfW;
        r = sx + halfW;
        t = sy - height;
        b = sy + 4;
      }
      if (r < vl || l > vr || b < vt || t > vb) return;
      items.push({ x0, y0, x1, y1, l, r, t, b, draw });
    };

    for (const st of world.map.structures) {
      add(st.x, st.y, st.x + st.w, st.y + st.h, st.height + 30, null, () => drawStructure(ctx, st, time));
    }
    for (const p of world.map.props) {
      const r = p.kind === 'tree' || p.kind === 'pine' ? 0.3 : 0.22;
      const hw = p.kind === 'tree' ? 16 : p.kind === 'umbrella' ? 17 : p.kind === 'car' ? 20 : 10;
      add(p.x - r, p.y - r, p.x + r, p.y + r, PROP_HEIGHT[p.kind] + 4, hw, () => drawProp(ctx, p, time));
    }

    // Player cart (+ seller, staff and equipment) — same renderer as the shop preview.
    const spot = world.map.cart;
    const frame = { x: spot.x, y: spot.y, face: spot.face, qdx: spot.qdx, qdy: spot.qdy };
    const cb = cartBounds(frame, CARTS[s.activeCart].look);
    const [csx, csy] = P(spot.x + 0.5, spot.y + 0.5);
    this.cartScreen = { x: csx, y: csy, h: cb.h };
    const night = nightFactor(s.timeMin);
    add(cb.x0, cb.y0, cb.x1, cb.y1, cb.h + 20, null, () =>
      drawCartModel(ctx, frame, s.activeCart, {
        upgrades: s.upgrades,
        staff: s.staff,
        seller: s.sellerLook,
        pour: world.cart.pour,
        bounce: world.cart.bounce,
        t: time,
        night,
        soldOut: cupsPossible(s) === 0,
        open: s.phase === 'open',
        price: rpShort(s.price).replace('Rp ', ''),
      }),
    );

    for (const v of world.vehicles) {
      const L = v.length / 2;
      const axis = v.lane.axis;
      const [x0, x1, y0, y1] = axis === 'x' ? [v.x - L, v.x + L, v.y - 0.3, v.y + 0.3] : [v.x - 0.3, v.x + 0.3, v.y - L, v.y + L];
      add(x0, y0, x1, y1, 24, null, () => {
        if (v.kind === 'motor') {
          const [sx, sy] = P(v.x, v.y);
          const screenDir = axis === 'x' ? v.lane.dir : -v.lane.dir;
          drawMotor(ctx, sx, sy, v.color, screenDir < 0);
          // Rider
          ctx.fillStyle = '#34495e';
          ctx.fillRect(sx - 2, sy - 13, 4, 6);
          ctx.fillStyle = v.color === '#f1c40f' ? '#e74c3c' : '#f1c40f';
          ctx.fillRect(sx - 2, sy - 16, 4, 3);
        } else drawCarBox(ctx, v.x, v.y, axis, v.color, v.kind === 'angkot');
      });
    }

    this.customerScreen = [];
    for (const c of world.customers) {
      const [sx, sy] = P(c.x, c.y);
      this.customerScreen.push({ c, x: sx, y: sy });
      add(c.x - 0.18, c.y - 0.18, c.x + 0.18, c.y + 0.18, 26, 8, () => {
        const f = facingFor(c.dirX, c.dirY);
        drawCharacter(ctx, sx, sy, c.look, { facing: f.facing, flip: f.flip, frame: c.moving ? Math.floor(c.walkPhase) % 4 : -1, cup: c.hasCup });
      });
    }
    return items;
  }

  private atmosphere(game: Game, w: number, h: number, time: number): void {
    const s = game.state;
    const ctx = this.bctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const weather = currentWeather(s);
    const night = nightFactor(s.timeMin);
    const hour = s.timeMin / 60;

    // Golden afternoon / cool morning tints
    if (hour < 9) {
      ctx.fillStyle = `rgba(255,220,160,${0.08 * (1 - (hour - 7) / 2)})`;
      ctx.fillRect(0, 0, w, h);
    } else if (hour >= 15.5 && hour < 18.5) {
      const k = Math.sin(((hour - 15.5) / 3) * Math.PI);
      ctx.fillStyle = `rgba(255,150,60,${0.12 * k})`;
      ctx.fillRect(0, 0, w, h);
    }
    const fx = getSettings().weatherFx;
    const fxOn = fx !== 'off';
    const fxFull = fx === 'full';
    if (fxOn && weather.cloud > 0) {
      // Soft grey for clouds, blue-grey for rain, dark slate for storms.
      const storm = weather.lightning ? 0.08 : 0;
      ctx.fillStyle = `rgba(${weather.rain > 0 ? '60,74,98' : '92,96,104'},${0.04 + weather.cloud * 0.11 + weather.rain * 0.05 + storm})`;
      ctx.fillRect(0, 0, w, h);
      // Drifting cloud shadows
      const n = fxFull ? 4 : 2;
      ctx.fillStyle = `rgba(30,36,48,${0.05 + weather.cloud * 0.06})`;
      for (let i = 0; i < n; i++) {
        const speed = 6 + i * 2.5;
        const cx = ((this.cloudT * speed + i * 260) % (w + 360)) - 180;
        const cy = ((i * 137) % Math.max(1, h - 60)) + 30;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 120 - i * 12, 46 - i * 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (fxOn && weather.heat > 0 && hour >= 9 && hour < 17) {
      // Amber sunlight from the upper-left.
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(w, h));
      g.addColorStop(0, `rgba(255,196,96,${0.2 * weather.heat})`);
      g.addColorStop(1, `rgba(255,196,96,${0.03 * weather.heat})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (!s.paused) this.cloudT += Math.min(0.05, time - (this.lastT || time)) * s.speed;
    setWind(fxOn ? weather.wind : 0);
    // Wind streaks
    if (fxFull && weather.wind > 0.3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      const n = Math.round(weather.wind * 14);
      for (let i = 0; i < n; i++) {
        const sp = 60 + ((i * 37) % 50);
        const x = ((this.worldT * sp + i * 97) % (w + 80)) - 40;
        const y = (i * 53) % h;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 14 + (i % 3) * 6, y + 1);
      }
      ctx.stroke();
    }
    // Subtle lightning flashes during thunderstorms (full effects only)
    const dtFlash = Math.min(0.05, time - (this.lastT || time));
    this.flash = Math.max(0, this.flash - dtFlash * 3);
    if (fxFull && weather.lightning && !s.paused && Math.random() < dtFlash * 0.12 * s.speed) this.flash = 0.7;

    if (night > 0.01) {
      const l = this.lctx;
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, w, h);
      l.fillStyle = `rgba(12,20,55,${0.62 * night})`;
      l.fillRect(0, 0, w, h);
      l.globalCompositeOperation = 'destination-out';
      const lights: [number, number, number][] = [];
      for (const p of game.world.map.props) if (p.kind === 'lamp') lights.push([p.x, p.y, 34]);
      const lit = s.upgrades.includes('lampu');
      const c = game.world.map.cart;
      lights.push([c.x + 0.5, c.y + 0.5, lit ? 62 : 18]);
      for (const [x, y, r] of lights) {
        const [sx, sy] = P(x, y);
        const px = sx + this.offset.x;
        const py = sy + this.offset.y - 6;
        const g = l.createRadialGradient(px, py, 2, px, py, r);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = g;
        l.fillRect(px - r, py - r, r * 2, r * 2);
      }
      ctx.drawImage(this.light, 0, 0);
      // Warm glow
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, r] of lights) {
        const [sx, sy] = P(x, y);
        const px = sx + this.offset.x;
        const py = sy + this.offset.y - 8;
        const g = ctx.createRadialGradient(px, py, 1, px, py, r * 0.6);
        g.addColorStop(0, `rgba(255,200,90,${0.25 * night})`);
        g.addColorStop(1, 'rgba(255,200,90,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // Rain
    const target = fxOn ? Math.round(((weather.rain * 160 * (w * h)) / (400 * 250)) * (fxFull ? 1 : 0.45)) : 0;
    while (this.drops.length < target) this.drops.push({ x: Math.random() * w, y: Math.random() * h, s: 160 + Math.random() * 80 });
    if (this.drops.length > target) this.drops.length = target;
    if (this.drops.length) {
      const dt = Math.min(0.05, time - (this.lastT || time));
      ctx.strokeStyle = 'rgba(170,192,218,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of this.drops) {
        if (!s.paused) {
          d.y += d.s * dt * s.speed;
          d.x -= d.s * 0.25 * dt * s.speed;
        }
        if (d.y > h) {
          d.y = -5;
          d.x = Math.random() * (w + 40);
        }
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 2, d.y - 6);
      }
      ctx.stroke();
    }
    this.lastT = time;
  }

  private lastT = 0;
  private flash = 0;

  private cloudT = 0;

  /** Customer and seller speech, drawn at display resolution so it stays readable. */
  private drawReactions(out: CanvasRenderingContext2D): void {
    const z = this.camera.zoom;
    out.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
    out.textBaseline = 'middle';
    out.textAlign = 'left';
    if (getSettings().reactions)
      for (const { c, x, y } of this.customerScreen) {
        const r = c.reaction;
        if (!r) continue;
        this.bubble(out, (x + this.offset.x) * z, (y + this.offset.y - 34) * z, r.text, r.tone, Math.min(1, r.t * 2.5));
      }
    if (this.seller) {
      const c = this.cartOnCanvas();
      out.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
      const rise = (1.5 - this.seller.t) * 6;
      this.bubble(out, c.x, c.top - 4 - rise, this.seller.text, this.seller.tone, Math.min(1, this.seller.t * 3), true);
    }
  }

  /** Rounded speech bubble with a tail pointing down at (px, py). */
  private bubble(out: CanvasRenderingContext2D, px: number, py: number, text: string, tone: 'good' | 'ok' | 'bad', alpha: number, seller = false): void {
    const colors = { good: ['#fff8e9', '#397a55'], ok: ['#fff8e9', '#c98a32'], bad: ['#fbe9e3', '#b9473e'] } as const;
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const wd of words) {
      const test = cur ? `${cur} ${wd}` : wd;
      if (out.measureText(test).width > 150 && cur) {
        lines.push(cur);
        cur = wd;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    const tw = Math.max(...lines.map((l) => out.measureText(l).width));
    const bw = tw + 14;
    const bh = lines.length * 15 + 8;
    const bx = Math.round(Math.max(4, Math.min(this.viewW - bw - 4, px - bw / 2)));
    const by = Math.round(Math.max(4, py - bh));
    const [bg, edge] = seller ? (['#6b4226', '#e7b65c'] as const) : colors[tone];
    out.globalAlpha = alpha;
    out.fillStyle = bg;
    out.strokeStyle = edge;
    out.lineWidth = 2;
    out.beginPath();
    out.roundRect(bx, by, bw, bh, 6);
    out.fill();
    out.stroke();
    out.beginPath();
    out.moveTo(px - 5, by + bh - 1);
    out.lineTo(px, by + bh + 7);
    out.lineTo(px + 5, by + bh - 1);
    out.fill();
    out.fillStyle = seller ? '#fff8e9' : '#38271d';
    lines.forEach((l, i) => out.fillText(l, bx + 7, by + 11 + i * 15));
    out.globalAlpha = 1;
  }

  /** Customer under a display-canvas point, if any (for hover info). */
  pickCustomer(px: number, py: number): Customer | null {
    const z = this.camera.zoom;
    const bx = px / z - this.offset.x;
    const by = py / z - this.offset.y;
    let best: Customer | null = null;
    let bestD = 10;
    for (const { c, x, y } of this.customerScreen) {
      const d = Math.hypot(bx - x, by - (y - 10));
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }
}

/** 0 by day, rising to 1 after sunset (~18:30). */
export function nightFactor(timeMin: number): number {
  const h = timeMin / 60;
  if (h < 17) return 0;
  return Math.min(1, (h - 17) / 2);
}

/** Painter's ordering via a dependency graph of screen-overlapping objects. */
function sortDrawables(items: Drawable[]): Drawable[] {
  const n = items.length;
  const deps: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const a = items[i];
    for (let j = i + 1; j < n; j++) {
      const b = items[j];
      if (a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t) continue;
      if (behind(a, b)) deps[j].push(i);
      else deps[i].push(j);
    }
  }
  const out: Drawable[] = [];
  const state = new Uint8Array(n);
  const visit = (i: number) => {
    if (state[i]) return;
    state[i] = 1;
    for (const d of deps[i]) visit(d);
    out.push(items[i]);
  };
  // Seed in rough depth order so ties resolve back-to-front.
  const order = items.map((_, i) => i).sort((i, j) => items[i].x0 + items[i].y0 + items[i].x1 + items[i].y1 - (items[j].x0 + items[j].y0 + items[j].x1 + items[j].y1));
  for (const i of order) visit(i);
  return out;
}

function behind(a: Drawable, b: Drawable): boolean {
  const e = 1e-3;
  if (a.x1 <= b.x0 + e) return true;
  if (b.x1 <= a.x0 + e) return false;
  if (a.y1 <= b.y0 + e) return true;
  if (b.y1 <= a.y0 + e) return false;
  return a.x0 + a.x1 + a.y0 + a.y1 < b.x0 + b.x1 + b.y0 + b.y1;
}
