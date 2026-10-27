import type { Ingredient, Recipe } from '../game/types';

export interface SupplyPack {
  qty: number;
  price: number;
}

export interface SupplyDef {
  id: Ingredient;
  name: string;
  unit: string;
  desc: string;
  packs: SupplyPack[];
  /** Feature required before this supply appears in the shop/top bar. */
  feature?: 'lemon';
}

/** Supplier catalogue. Larger packs have a bulk discount. All prices are Rupiah. */
export const SUPPLIES: Record<Ingredient, SupplyDef> = {
  tea: {
    id: 'tea',
    name: 'Teh Tubruk',
    unit: 'takar',
    desc: 'Daun teh melati seduh. Takaran teh menentukan kekentalan rasa.',
    packs: [
      { qty: 20, price: 8_000 },
      { qty: 50, price: 18_000 },
      { qty: 120, price: 39_000 },
    ],
  },
  sugar: {
    id: 'sugar',
    name: 'Gula Pasir',
    unit: 'sdm',
    desc: 'Gula pasir putih. Menentukan tingkat manis.',
    packs: [
      { qty: 20, price: 4_000 },
      { qty: 50, price: 9_000 },
      { qty: 120, price: 19_000 },
    ],
  },
  ice: {
    id: 'ice',
    name: 'Es Batu',
    unit: 'kubus',
    desc: 'Es batu kristal. Mencair di akhir hari kecuali disimpan di kotak es.',
    packs: [
      { qty: 40, price: 4_000 },
      { qty: 100, price: 9_000 },
      { qty: 250, price: 20_000 },
    ],
  },
  cups: {
    id: 'cups',
    name: 'Gelas Plastik',
    unit: 'gelas',
    desc: 'Gelas plastik + tutup segel. Satu gelas per penjualan.',
    packs: [
      { qty: 25, price: 3_000 },
      { qty: 75, price: 8_000 },
      { qty: 200, price: 19_000 },
    ],
  },
  lemon: {
    id: 'lemon',
    name: 'Irisan Lemon',
    unit: 'iris',
    desc: 'Irisan lemon segar untuk es teh lemon. Sebagian layu tiap malam.',
    feature: 'lemon',
    packs: [
      { qty: 10, price: 5_000 },
      { qty: 30, price: 13_500 },
      { qty: 80, price: 32_000 },
    ],
  },
};

/** Reference unit cost (smallest pack), used for starter-inventory valuation. */
export function baseUnitCost(id: Ingredient): number {
  const p = SUPPLIES[id].packs[0];
  return p.price / p.qty;
}

/** Units of each ingredient one cup consumes for a recipe. */
export function recipeUsage(recipe: Recipe): Record<Ingredient, number> {
  return { tea: recipe.tea, sugar: recipe.sugar, ice: recipe.ice, lemon: recipe.lemon, cups: 1 };
}

export const RECIPE_LIMITS = {
  tea: { min: 1, max: 5 },
  sugar: { min: 0, max: 6 },
  ice: { min: 0, max: 6 },
  lemon: { min: 0, max: 2 },
} as const;

export const PRICE_LIMITS = { min: 500, max: 20_000, step: 500 };
