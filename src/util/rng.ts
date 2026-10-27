/** Small seeded PRNG (mulberry32) used for reproducible daily weather and news. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (min: number, max: number): number => min + Math.random() * (max - min);
export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p: number): boolean => Math.random() < p;

/** Approximately normal(0,1) — sum of uniforms, bounded to about ±3. */
export function gauss(): number {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.7;
}

export function weightedPick<T>(items: readonly { weight: number; value: T }[], r = Math.random()): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let x = r * total;
  for (const it of items) {
    x -= it.weight;
    if (x <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
