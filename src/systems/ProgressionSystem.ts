import { CAMPAIGNS, CAMPAIGN_ORDER, FEATURES, GOALS, STAFF, STAFF_ORDER, type GoalDef } from '../data/business';
import { LOCATIONS, LOCATION_ORDER } from '../data/locations';
import { CARTS, CART_ORDER } from '../data/carts';
import { UPGRADES, UPGRADE_ORDER } from '../data/upgrades';
import type { GameState, Requirement } from '../game/types';
import { num } from '../util/format';
import { avgSatisfaction } from './EconomySystem';

export interface ReqLine {
  label: string;
  current: number;
  target: number;
  ok: boolean;
}

export interface ReqCheck {
  ok: boolean;
  lines: ReqLine[];
}

/** Best location satisfaction so far, used for satisfaction-gated unlocks. */
function bestSatisfaction(s: GameState): number {
  return Math.max(0, ...s.unlockedLocations.map((id) => s.locations[id].satisfaction));
}

export function checkRequirement(s: GameState, req: Requirement): ReqCheck {
  const lines: ReqLine[] = [];
  if (req.cups !== undefined) lines.push({ label: `Terjual ${num(req.cups)} gelas`, current: s.totals.cupsSold, target: req.cups, ok: s.totals.cupsSold >= req.cups });
  if (req.locations !== undefined)
    lines.push({ label: `${req.locations} lokasi terbuka`, current: s.unlockedLocations.length, target: req.locations, ok: s.unlockedLocations.length >= req.locations });
  if (req.satisfaction !== undefined) {
    const cur = Math.round(bestSatisfaction(s));
    lines.push({ label: `Kepuasan ≥ ${req.satisfaction}%`, current: cur, target: req.satisfaction, ok: cur >= req.satisfaction });
  }
  if (req.upgrade) {
    const ok = s.upgrades.includes(req.upgrade);
    lines.push({ label: `Punya ${UPGRADES[req.upgrade].name}`, current: ok ? 1 : 0, target: 1, ok });
  }
  if (req.location) {
    const ok = s.unlockedLocations.includes(req.location);
    lines.push({ label: `Buka ${LOCATIONS[req.location].name}`, current: ok ? 1 : 0, target: 1, ok });
  }
  if (req.day !== undefined) lines.push({ label: `Hari ke-${req.day}`, current: s.day, target: req.day, ok: s.day >= req.day });
  return { ok: lines.every((l) => l.ok), lines };
}

export function goalProgress(s: GameState, g: GoalDef): number {
  switch (g.metric) {
    case 'cups':
      return s.totals.cupsSold;
    case 'bestProfit':
      return s.totals.bestDayProfit;
    case 'bestSatisfaction':
      return s.totals.bestDaySatisfaction;
    case 'locations':
      return s.unlockedLocations.length;
    case 'carts':
      return s.ownedCarts.length;
    case 'staff':
      return s.staff.length;
    case 'cash':
      return s.cash;
    case 'upgrades':
      return s.upgrades.length;
    case 'tips':
      return s.totals.tips;
    case 'regulars':
      return Math.floor(Object.values(s.locations).reduce((a, p) => a + p.regulars, 0));
  }
}

/** Awards newly completed goals. Returns the completed goal definitions. */
export function checkGoals(s: GameState): GoalDef[] {
  const done: GoalDef[] = [];
  for (const g of GOALS) {
    if (s.goalsDone.includes(g.id)) continue;
    if (goalProgress(s, g) >= g.target) {
      s.goalsDone.push(g.id);
      if (g.reward > 0) {
        s.cash += g.reward;
        s.today.bonus += g.reward;
      }
      s.today.unlocks.push(`Target tercapai: ${g.name}${g.reward ? ` (+bonus)` : ''}`);
      done.push(g);
    }
  }
  return done;
}

/** Keys of everything whose requirements are currently met but not yet owned. */
function availableKeys(s: GameState): Map<string, string> {
  const out = new Map<string, string>();
  for (const id of LOCATION_ORDER)
    if (!s.unlockedLocations.includes(id) && checkRequirement(s, LOCATIONS[id].req).ok) out.set(`loc:${id}`, `Lokasi baru: ${LOCATIONS[id].name}`);
  for (const id of CART_ORDER)
    if (!s.ownedCarts.includes(id) && checkRequirement(s, CARTS[id].req).ok) out.set(`cart:${id}`, `Kendaraan baru: ${CARTS[id].name}`);
  for (const id of UPGRADE_ORDER)
    if (!s.upgrades.includes(id) && checkRequirement(s, UPGRADES[id].req).ok) out.set(`upg:${id}`, `Peralatan baru: ${UPGRADES[id].name}`);
  for (const id of STAFF_ORDER)
    if (!s.staff.includes(id) && checkRequirement(s, STAFF[id].req).ok) out.set(`staff:${id}`, `Staf baru: ${STAFF[id].name}`);
  for (const id of CAMPAIGN_ORDER) if (checkRequirement(s, CAMPAIGNS[id].req).ok) out.set(`ad:${id}`, `Promosi baru: ${CAMPAIGNS[id].name}`);
  if (!s.features.includes('lemon') && checkRequirement(s, FEATURES.lemon.req).ok) out.set('feat:lemon', `Resep baru: ${FEATURES.lemon.name}`);
  return out;
}

/** Returns human-readable messages for things that just became available (once each). */
export function announceNewUnlocks(s: GameState): string[] {
  const msgs: string[] = [];
  for (const [key, text] of availableKeys(s)) {
    const k = `avail:${key}`;
    if (s.hintsSeen.includes(k)) continue;
    s.hintsSeen.push(k);
    msgs.push(text);
  }
  return msgs;
}

/** Marks everything currently available as already announced (used for a fresh game). */
export function primeAnnouncements(s: GameState): void {
  for (const key of availableKeys(s).keys()) {
    const k = `avail:${key}`;
    if (!s.hintsSeen.includes(k)) s.hintsSeen.push(k);
  }
}

export function daySatisfaction(s: GameState): number {
  return avgSatisfaction(s.today);
}
