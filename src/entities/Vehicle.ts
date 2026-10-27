import type { Lane } from '../world/Map';
import { pick, rand } from '../util/rng';

export type VehicleKind = 'car' | 'motor' | 'angkot' | 'pickup';

const CAR_COLORS = ['#c0392b', '#2980b9', '#ecf0f1', '#2c3e50', '#7f8c8d', '#f1c40f', '#16a085', '#8e44ad'];

/** Ambient traffic driving straight along a road lane. */
export class Vehicle {
  pos: number;
  readonly speed: number;
  current: number;
  readonly color: string;
  readonly kind: VehicleKind;
  done = false;

  constructor(readonly lane: Lane, kind?: VehicleKind) {
    this.kind = kind ?? pick<VehicleKind>(['car', 'car', 'motor', 'motor', 'motor', 'angkot', 'pickup']);
    this.pos = lane.from;
    this.speed = this.kind === 'motor' ? rand(3.6, 4.6) : rand(2.8, 3.6);
    this.current = this.speed;
    this.color = this.kind === 'angkot' ? pick(['#2e86de', '#27ae60', '#e67e22']) : pick(CAR_COLORS);
  }

  get x(): number {
    return this.lane.axis === 'x' ? this.pos : this.lane.at;
  }
  get y(): number {
    return this.lane.axis === 'y' ? this.pos : this.lane.at;
  }
  /** Length along the lane in tiles. */
  get length(): number {
    return this.kind === 'motor' ? 0.5 : this.kind === 'angkot' ? 1.3 : 1.1;
  }

  update(dt: number, blocked: boolean): void {
    const target = blocked ? 0 : this.speed;
    this.current += (target - this.current) * Math.min(1, dt * (blocked ? 8 : 2));
    this.pos += this.lane.dir * this.current * dt;
    if ((this.lane.dir > 0 && this.pos > this.lane.to) || (this.lane.dir < 0 && this.pos < this.lane.to)) this.done = true;
  }
}
