import { BALANCE } from '../data/balance';
import { CUSTOMER_TYPES, type CustomerTypeDef } from '../data/customers';
import { LOCATIONS, type LocationDef } from '../data/locations';
import type { Complaint, GameState, LocationId, Recipe } from '../game/types';
import { clamp, mulberry32 } from '../util/rng';
import type { Modifiers } from './Modifiers';

export interface TastePrefs {
  tea: number;
  sugar: number;
  ice: number;
  likesLemon: boolean;
}

/** Shifts applied to every customer's preference today (weather, news). Never alters the recipe. */
export interface PrefShift {
  ice: number;
  sugar: number;
}

export interface TasteResult {
  score: number;
  complaint: Complaint | null;
  /** Signed deviations recipe − preference (after shifts). */
  dTea: number;
  dSugar: number;
  dIce: number;
}

export const TASTE_WEIGHTS = BALANCE.taste.weights;

/**
 * Taste score (0..100):
 *   100 − 15·|tea − prefTea| − 12·|sugar − (prefSugar + news)| − 7·|ice − (prefIce + weather)|
 *   ± lemon (+6 per slice if liked, −5 if not) + equipment bonuses.
 */
export function tasteScore(recipe: Recipe, p: TastePrefs, mods: Pick<Modifiers, 'tasteBonus' | 'coldBonus'>, shift: PrefShift): TasteResult {
  const w = BALANCE.taste.weights;
  const dTea = recipe.tea - p.tea;
  const dSugar = recipe.sugar - (p.sugar + shift.sugar);
  const dIce = recipe.ice - (p.ice + shift.ice);
  const pT = w.tea * Math.abs(dTea);
  const pS = w.sugar * Math.abs(dSugar);
  const pI = w.ice * Math.abs(dIce);
  let score = 100 - pT - pS - pI;
  if (recipe.lemon > 0) score += p.likesLemon ? BALANCE.taste.lemonLike * Math.min(recipe.lemon, 2) : -BALANCE.taste.lemonDislike * recipe.lemon;
  score += mods.tasteBonus + (recipe.ice >= 2 ? mods.coldBonus : 0);

  let complaint: Complaint | null = null;
  const worst = Math.max(pT, pS, pI);
  if (worst >= BALANCE.taste.complaintThreshold) {
    if (worst === pT) complaint = dTea < 0 ? 'teaWeak' : 'teaStrong';
    else if (worst === pS) complaint = dSugar < 0 ? 'sugarLow' : 'sugarHigh';
    else complaint = dIce < 0 ? 'iceLow' : 'iceHigh';
  }
  return { score: clamp(score, 0, 100), complaint, dTea, dSugar, dIce };
}

/** Draws a customer's taste preferences from the location profile plus type offsets. */
export function samplePrefs(loc: LocationDef, type: CustomerTypeDef, g: () => number, r: () => number): TastePrefs {
  const p = loc.prefs;
  return {
    tea: clamp(p.tea[0] + type.pref.tea + p.tea[1] * g(), 0.5, 5.5),
    sugar: clamp(p.sugar[0] + type.pref.sugar + p.sugar[1] * g(), 0, 6.5),
    ice: clamp(p.ice[0] + type.pref.ice + p.ice[1] * g(), 0, 6.5),
    likesLemon: r() < clamp(p.lemon + type.lemonLike, 0, 1),
  };
}

export interface RecipeInsight {
  expectedTaste: number;
  meanPrefs: { tea: number; sugar: number; ice: number; lemon: number };
  hints: string[];
}

const insightCache = new Map<string, RecipeInsight>();

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Expected taste score of a recipe for the crowd at a location, estimated by
 * evaluating a fixed sample of 240 virtual customers (deterministic, so the
 * number does not jitter in the UI).
 */
export function recipeInsight(_s: GameState, recipe: Recipe, mods: Pick<Modifiers, 'tasteBonus' | 'coldBonus'>, shift: PrefShift, locationId: LocationId): RecipeInsight {
  const key = `${locationId}|${recipe.tea},${recipe.sugar},${recipe.ice},${recipe.lemon}|${mods.tasteBonus},${mods.coldBonus}|${shift.ice},${shift.sugar}`;
  const hit = insightCache.get(key);
  if (hit) return hit;
  const loc = LOCATIONS[locationId];
  const rng = mulberry32(hashId(locationId));
  const g = () => (rng() + rng() + rng() + rng() - 2) * 1.7;
  const totalW = loc.crowd.reduce((a, c) => a + c.weight, 0);
  let sum = 0;
  let n = 0;
  const mean = { tea: 0, sugar: 0, ice: 0, lemon: 0 };
  for (const c of loc.crowd) {
    const count = Math.round((240 * c.weight) / totalW);
    const type = CUSTOMER_TYPES[c.type];
    for (let i = 0; i < count; i++) {
      const p = samplePrefs(loc, type, g, rng);
      sum += tasteScore(recipe, p, mods, shift).score;
      mean.tea += p.tea;
      mean.sugar += p.sugar + shift.sugar;
      mean.ice += p.ice + shift.ice;
      mean.lemon += p.likesLemon ? 1 : 0;
      n++;
    }
  }
  mean.tea /= n;
  mean.sugar /= n;
  mean.ice /= n;
  mean.lemon /= n;

  const hints: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < 0.55;
  if (!near(recipe.tea, mean.tea)) hints.push(recipe.tea < mean.tea ? 'Pelanggan di sini suka teh lebih kental.' : 'Teh terlalu pekat untuk lidah warga sini.');
  if (!near(recipe.sugar, mean.sugar)) hints.push(recipe.sugar < mean.sugar ? 'Mereka suka lebih manis.' : 'Kurangi gula, terlalu manis.');
  if (!near(recipe.ice, mean.ice)) hints.push(recipe.ice < mean.ice ? 'Tambah es, mereka mau yang lebih dingin.' : 'Es terlalu banyak, rasa jadi encer.');
  if (recipe.lemon > 0 && mean.lemon < 0.3) hints.push('Lemon kurang disukai di lokasi ini.');
  if (!hints.length) hints.push('Resep sudah pas dengan selera pelanggan di sini.');
  const res = { expectedTaste: n ? sum / n : 0, meanPrefs: mean, hints };
  if (insightCache.size > 500) insightCache.clear();
  insightCache.set(key, res);
  return res;
}

export const COMPLAINT_TEXT: Record<Complaint, string> = {
  teaWeak: 'Kurang kental',
  teaStrong: 'Terlalu pekat',
  sugarLow: 'Kurang manis',
  sugarHigh: 'Terlalu manis',
  iceLow: 'Kurang dingin',
  iceHigh: 'Kebanyakan es',
  pricey: 'Kemahalan',
  slow: 'Antre lama',
};
