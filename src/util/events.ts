/** Minimal typed event bus connecting the simulation to the UI. */
export type ToastKind = 'info' | 'good' | 'bad' | 'warn' | 'unlock';

export interface GameEvents {
  toast: { text: string; kind: ToastKind };
  sale: { price: number; tip: number; x: number; y: number; satisfaction: number };
  /** A customer walked away without buying (for contextual notices). */
  lost: { reason: 'price' | 'queue' | 'patience' | 'stock'; x: number; y: number };
  /** The afternoon weather differs from the morning (announced once per day). */
  weatherShift: { from: string; to: string };
  dayEnded: { day: number };
  dayStarted: { day: number };
  locationChanged: { id: string };
  stateChanged: void;
  cartChanged: void;
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Handler<never>[]>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(fn as Handler<never>);
    this.handlers.set(type, list);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    for (const fn of this.handlers.get(type) ?? []) (fn as Handler<GameEvents[K]>)(payload);
  }
}
