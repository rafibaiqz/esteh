import { CARTS, CART_ORDER } from '../data/carts';
import { SUPPLIES } from '../data/supplies';
import { UPGRADES, UPGRADE_ORDER } from '../data/upgrades';
import type { CartId, GameState, Ingredient, UpgradeId } from '../game/types';
import { getModifiers } from './Modifiers';

/**
 * Selling owned equipment and carts back for cash — the only way to raise
 * money besides trading. There are no loans, credit or handouts: an asset is
 * worth what was paid for it minus a fixed 20% depreciation.
 *
 * Ingredients (tea, sugar, ice, cups, lemon) are stock, not assets; they stay
 * in the inventory system. Location permits, recipes and staff are not
 * equipment and cannot be sold either.
 */
export const RESALE_RATE = 0.8;

/** The one selling-price rule: 80% of the original purchase price, rounded down. */
export function resaleValue(originalPrice: number): number {
  return Math.floor(Math.max(0, originalPrice) * RESALE_RATE);
}

export type AssetRef = { kind: 'upgrade'; id: UpgradeId } | { kind: 'cart'; id: CartId };

export function assetKey(a: AssetRef): string {
  return `${a.kind}:${a.id}`;
}

function catalogPrice(a: AssetRef): number {
  return a.kind === 'upgrade' ? UPGRADES[a.id].price : CARTS[a.id].price;
}

export function assetName(a: AssetRef): string {
  return a.kind === 'upgrade' ? UPGRADES[a.id].name : CARTS[a.id].name;
}

/**
 * What the player actually paid. Recorded at purchase time; saves from before
 * this feature fall back to the catalogue price (the price they paid then).
 */
export function purchasePrice(s: GameState, a: AssetRef): number {
  const rec = s.assetCost?.[assetKey(a)];
  return typeof rec === 'number' && Number.isFinite(rec) && rec >= 0 ? rec : catalogPrice(a);
}

export function ownsAsset(s: GameState, a: AssetRef): boolean {
  return a.kind === 'upgrade' ? s.upgrades.includes(a.id) : s.ownedCarts.includes(a.id);
}

export interface SaleCheck {
  ok: boolean;
  reason?: string;
}

/** Whether this asset may be sold right now, and why not. */
export function saleCheck(s: GameState, a: AssetRef): SaleCheck {
  if (!ownsAsset(s, a)) return { ok: false, reason: 'Aset ini tidak kamu miliki.' };
  if (s.phase === 'report') return { ok: false, reason: 'Mulai hari berikutnya dulu.' };
  if (resaleValue(purchasePrice(s, a)) <= 0) return { ok: false, reason: 'Tidak punya nilai jual.' };
  if (a.kind === 'cart') {
    if (s.activeCart === a.id) return { ok: false, reason: 'Gerobak ini sedang dipakai. Pakai gerobak lain dulu (saat persiapan).' };
    return { ok: true };
  }
  // Equipment that another owned item is built on (e.g. the cooler on the ice box) goes last.
  const dependant = s.upgrades.find((u) => u !== a.id && UPGRADES[u].req.upgrade === a.id);
  if (dependant) return { ok: false, reason: `${UPGRADES[dependant].name} dipasang di atasnya. Jual ${UPGRADES[dependant].name} dulu.` };
  // Selling storage must not leave more stock than the cart can hold.
  const after = getModifiers({ ...s, upgrades: s.upgrades.filter((u) => u !== a.id) }).capacity;
  const over = (Object.keys(after) as Ingredient[]).filter((i) => s.inventory[i].qty > after[i]);
  if (over.length)
    return {
      ok: false,
      reason: `Stok ${over.map((i) => `${SUPPLIES[i].name} (${s.inventory[i].qty}, muat ${after[i]})`).join(', ')} tidak akan muat lagi. Pakai dulu sebagian stoknya.`,
    };
  return { ok: true };
}

export interface AssetListing {
  ref: AssetRef;
  name: string;
  original: number;
  depreciation: number;
  price: number;
  sellable: boolean;
  reason?: string;
}

function listing(s: GameState, ref: AssetRef): AssetListing {
  const original = purchasePrice(s, ref);
  const price = resaleValue(original);
  const chk = saleCheck(s, ref);
  return { ref, name: assetName(ref), original, depreciation: original - price, price, sellable: chk.ok, reason: chk.reason };
}

/**
 * Owned assets that can be sold: every piece of equipment, and every cart
 * except the one in use and the free starter cart (worth nothing).
 */
export function listAssets(s: GameState): AssetListing[] {
  const out: AssetListing[] = [];
  for (const id of UPGRADE_ORDER) if (s.upgrades.includes(id)) out.push(listing(s, { kind: 'upgrade', id }));
  for (const id of CART_ORDER) {
    const ref: AssetRef = { kind: 'cart', id };
    if (!s.ownedCarts.includes(id) || s.activeCart === id || resaleValue(purchasePrice(s, ref)) <= 0) continue;
    out.push(listing(s, ref));
  }
  return out;
}

export function hasSellableAssets(s: GameState): boolean {
  return listAssets(s).some((a) => a.sellable);
}
