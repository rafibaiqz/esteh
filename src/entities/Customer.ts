import { HAIR, SKIN_TONES, type Accessory, type CustomerTypeDef } from '../data/customers';
import type { Complaint } from '../game/types';
import type { TastePrefs } from '../systems/RecipeSystem';
import type { Point } from '../world/Map';
import { pick, rand } from '../util/rng';

export type CustomerState = 'walking' | 'toQueue' | 'queued' | 'served' | 'leaving';
export type BubbleKind = 'happy' | 'neutral' | 'unhappy' | 'price' | 'wait' | 'empty' | 'crowded' | 'thirsty';

export interface Bubble {
  kind: BubbleKind;
  complaint?: Complaint | null;
  t: number;
}

export interface Look {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  accessory: Accessory;
  child: boolean;
  scale: number;
  hairStyle?: 'short' | 'long' | 'bun';
  /** Cached sprite key (filled in by the character renderer). */
  key?: string;
}

let nextId = 1;

/**
 * A pedestrian / potential customer. Positions are continuous tile
 * coordinates; a tile's centre is (x + 0.5, y + 0.5).
 */
export class Customer {
  readonly id = nextId++;
  x: number;
  y: number;
  path: Point[] = [];
  pathIndex = 0;
  state: CustomerState = 'walking';
  /** Path index at which the customer evaluates the cart, or -1 if never. */
  decideAt = -1;
  proximity = 0;
  decided = false;
  exit: Point;
  /** Lateral offset so pedestrians don't walk in a single file line. */
  readonly offX: number;
  readonly offY: number;
  readonly speed: number;
  readonly look: Look;
  waited = 0;
  queueSlot = -1;
  /** Sub-tile target used for the final approach to a queue slot. */
  slotTarget: Point | null = null;
  bubble: Bubble | null = null;
  hasCup = false;
  walkPhase = Math.random() * 10;
  moving = false;
  dirX = 1;
  dirY = 0;
  budget = 0;
  patience = 0;
  /** Loyal regular customer (comes back because of past good experiences). */
  regular = false;
  /** Spoken reaction shown as a text bubble (limited number on screen). */
  reaction: { text: string; tone: 'good' | 'ok' | 'bad'; t: number } | null = null;
  prefs: TastePrefs = { tea: 2, sugar: 2, ice: 3, likesLemon: false };

  constructor(
    readonly type: CustomerTypeDef,
    start: Point,
    exit: Point,
  ) {
    this.offX = rand(-0.22, 0.22);
    this.offY = rand(-0.22, 0.22);
    this.x = start.x + 0.5 + this.offX;
    this.y = start.y + 0.5 + this.offY;
    this.exit = exit;
    this.speed = rand(type.speed[0], type.speed[1]);
    this.look = {
      skin: pick(SKIN_TONES),
      hair: type.id === 'lansia' ? pick(['#d8d8d8', '#bdbdbd', '#9e9e9e']) : pick(HAIR),
      shirt: pick(type.shirts),
      pants: pick(type.pants),
      accessory: pick(type.accessories),
      child: type.child,
      scale: 1,
      hairStyle: pick(['short', 'short', 'long', 'bun'] as const),
    };
  }

  get tileX(): number {
    return Math.floor(this.x);
  }
  get tileY(): number {
    return Math.floor(this.y);
  }

  setPath(path: Point[]): void {
    this.path = path;
    this.pathIndex = path.length > 1 ? 1 : 0;
  }

  say(kind: BubbleKind, complaint: Complaint | null = null, seconds = 2.6): void {
    this.bubble = { kind, complaint, t: seconds };
  }

  /** Moves towards a point; returns true once it is reached. */
  moveTo(tx: number, ty: number, dt: number): boolean {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step || d < 0.001) {
      this.x = tx;
      this.y = ty;
      this.moving = false;
      return true;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.dirX = dx / d;
    this.dirY = dy / d;
    this.moving = true;
    this.walkPhase += dt * this.speed * 6;
    return false;
  }

  /** Follows the current path; returns true when the last waypoint is reached. */
  followPath(dt: number): boolean {
    let remaining = dt;
    while (remaining > 0 && this.pathIndex < this.path.length) {
      const p = this.path[this.pathIndex];
      const tx = p.x + 0.5 + this.offX;
      const ty = p.y + 0.5 + this.offY;
      const d = Math.hypot(tx - this.x, ty - this.y);
      const t = Math.min(remaining, d / this.speed);
      if (this.moveTo(tx, ty, t + 1e-6)) {
        this.pathIndex++;
        remaining -= t;
      } else {
        remaining = 0;
      }
    }
    this.moving = this.pathIndex < this.path.length;
    return this.pathIndex >= this.path.length;
  }

  /** `realDt` is wall-clock time so speech stays readable at 2×/4× speed. */
  tickBubble(dt: number, realDt = dt): void {
    if (this.bubble) {
      this.bubble.t -= dt;
      if (this.bubble.t <= 0) this.bubble = null;
    }
    if (this.reaction) {
      this.reaction.t -= realDt;
      if (this.reaction.t <= 0) this.reaction = null;
    }
  }
}
