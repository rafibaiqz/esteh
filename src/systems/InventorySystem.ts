import { LOCATIONS } from '../data/locations';
import { SUPPLIES, recipeUsage } from '../data/supplies';
import { INGREDIENTS, type GameState, type Ingredient } from '../game/types';
import { eventSupplyMult } from './EventSystem';
import type { Modifiers } from './Modifiers';

export interface ActionResult {
  ok: boolean;
  msg: string;
}

/** Ingredients visible to the player (lemon only after the lemon recipe is unlocked). */
export function activeIngredients(s: GameState): Ingredient[] {
  return INGREDIENTS.filter((i) => !SUPPLIES[i].feature || s.features.includes(SUPPLIES[i].feature!));
}

/** Supplier price multiplier today: location wholesale discount × news (e.g. sugar price hike). */
export function supplyPriceMult(s: GameState, id: Ingredient): number {
  const discount = LOCATIONS[s.locationId].bonus.supplyDiscount ?? 0;
  return (1 - discount) * eventSupplyMult(s, id);
}

/** Pack price after discounts and news effects, rounded to Rp 100. */
export function packPrice(s: GameState, id: Ingredient, packIndex: number): number {
  const pack = SUPPLIES[id].packs[packIndex];
  return Math.round((pack.price * supplyPriceMult(s, id)) / 100) * 100;
}

export function buySupply(s: GameState, id: Ingredient, packIndex: number, mods: Modifiers): ActionResult {
  const def = SUPPLIES[id];
  const pack = def.packs[packIndex];
  if (!pack) return { ok: false, msg: 'Paket tidak tersedia.' };
  if (def.feature && !s.features.includes(def.feature)) return { ok: false, msg: `${def.name} belum terbuka.` };
  if (s.phase === 'report') return { ok: false, msg: 'Toko pemasok tutup. Mulai hari berikutnya dulu.' };
  const price = packPrice(s, id, packIndex);
  const item = s.inventory[id];
  const cap = mods.capacity[id];
  if (item.qty + pack.qty > cap) {
    return { ok: false, msg: `Tidak muat! ${def.name} maksimal ${cap} ${def.unit} di gerobak ini.` };
  }
  if (s.cash < price) return { ok: false, msg: 'Uang tidak cukup.' };
  // Weighted average cost keeps ingredient costs consistent with what was paid.
  item.avgCost = (item.qty * item.avgCost + price) / (item.qty + pack.qty);
  item.qty += pack.qty;
  s.cash -= price;
  s.today.supplyPurchases += price;
  return { ok: true, msg: `Membeli ${pack.qty} ${def.unit} ${def.name}.` };
}

/** How many cups the current stock can produce with the current recipe. */
export function cupsPossible(s: GameState): number {
  const use = recipeUsage(s.recipe);
  let n = Infinity;
  for (const i of INGREDIENTS) if (use[i] > 0) n = Math.min(n, Math.floor(s.inventory[i].qty / use[i]));
  return n === Infinity ? 0 : n;
}

/** Cups possible per ingredient (Infinity for unused ones). */
export function cupsByIngredient(s: GameState): Record<Ingredient, number> {
  const use = recipeUsage(s.recipe);
  const out = {} as Record<Ingredient, number>;
  for (const i of INGREDIENTS) out[i] = use[i] > 0 ? Math.floor(s.inventory[i].qty / use[i]) : Infinity;
  return out;
}

export function limitingIngredient(s: GameState): Ingredient | null {
  const by = cupsByIngredient(s);
  let worst: Ingredient | null = null;
  for (const i of INGREDIENTS) if (by[i] !== Infinity && (worst === null || by[i] < by[worst])) worst = i;
  return worst;
}

export const LOW_STOCK_CUPS = 10;

export function lowStock(s: GameState): Ingredient[] {
  const by = cupsByIngredient(s);
  return INGREDIENTS.filter((i) => by[i] !== Infinity && by[i] < LOW_STOCK_CUPS);
}

/** Ingredient cost of one cup at weighted-average prices. */
export function costPerCup(s: GameState): number {
  const use = recipeUsage(s.recipe);
  let c = 0;
  for (const i of INGREDIENTS) c += use[i] * s.inventory[i].avgCost;
  return c;
}

/**
 * Removes one cup's ingredients from stock. Returns its ingredient cost, or
 * null (and changes nothing) if any ingredient is short.
 */
export function consumeCup(s: GameState): number | null {
  const use = recipeUsage(s.recipe);
  for (const i of INGREDIENTS) if (s.inventory[i].qty < use[i]) return null;
  let cost = 0;
  for (const i of INGREDIENTS) {
    s.inventory[i].qty -= use[i];
    cost += use[i] * s.inventory[i].avgCost;
  }
  return cost;
}

/** Overnight losses: ice melts and lemon slices wilt, depending on storage equipment. */
export function spoilOvernight(s: GameState, mods: Modifiers): { ice: number; lemon: number; cost: number } {
  const ice = Math.ceil(s.inventory.ice.qty * mods.iceMelt);
  const lemon = Math.ceil(s.inventory.lemon.qty * mods.lemonSpoil);
  const cost = ice * s.inventory.ice.avgCost + lemon * s.inventory.lemon.avgCost;
  s.inventory.ice.qty -= ice;
  s.inventory.lemon.qty -= lemon;
  return { ice, lemon, cost };
}
