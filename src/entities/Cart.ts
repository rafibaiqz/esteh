/** Visual/animation state of the player's cart in the world (business data lives in GameState). */
export class CartEntity {
  /** 0..1 progress of the current pour animation, or -1 when idle. */
  pour = -1;
  bounce = 0;
  steam = 0;

  startServing(): void {
    this.pour = 0;
  }

  update(dt: number, serviceTime: number, serving: boolean): void {
    if (serving && this.pour >= 0) this.pour = Math.min(1, this.pour + dt / Math.max(0.2, serviceTime));
    if (!serving) this.pour = -1;
    this.bounce = Math.max(0, this.bounce - dt * 3);
    this.steam += dt;
  }

  celebrate(): void {
    this.bounce = 1;
  }
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}
