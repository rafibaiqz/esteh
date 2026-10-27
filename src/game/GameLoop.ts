/** Fixed-timestep simulation with variable-rate rendering via requestAnimationFrame. */
export class GameLoop {
  private last = 0;
  private acc = 0;
  private running = false;
  private readonly step = 1 / 60;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (time: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      // Clamp long gaps (tab in background) so the simulation doesn't jump.
      const dt = Math.min(0.25, (now - this.last) / 1000);
      this.last = now;
      this.acc += dt;
      let n = 0;
      while (this.acc >= this.step && n < 8) {
        this.update(this.step);
        this.acc -= this.step;
        n++;
      }
      if (n === 8) this.acc = 0;
      this.render(now / 1000);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
  }
}
