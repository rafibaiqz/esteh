import { BALANCE } from '../data/balance';
import type { Complaint, LostReason } from '../game/types';
import type { SatisfactionResult } from './EconomySystem';
import type { TasteResult } from './RecipeSystem';

export type ReactionTone = 'good' | 'ok' | 'bad';

export interface Reaction {
  text: string;
  tone: ReactionTone;
}

export interface Experience {
  sat: SatisfactionResult;
  taste: TasteResult;
  price: number;
  fair: number;
  tip: number;
  regular: boolean;
  hot: boolean;
}

/** Short, speech-bubble sized lines (shown above heads, so keep them to a few words). */
const TASTE_LINES: Record<Exclude<Complaint, 'pricey' | 'slow'>, string> = {
  teaWeak: 'Tehnya encer.',
  teaStrong: 'Kepahitan!',
  sugarLow: 'Kurang manis.',
  sugarHigh: 'Kemanisan!',
  iceLow: 'Kurang dingin.',
  iceHigh: 'Esnya kebanyakan!',
};

/**
 * Chooses what a customer says from their actual experience: the biggest
 * factor (taste deviation, price, wait, tip, value) decides the line.
 */
export function reactionFor(e: Experience): Reaction {
  const { sat, taste } = e;
  const v = sat.value;
  if (e.tip > 0) return { text: e.hot ? 'Seger! Ambil kembaliannya.' : 'Mantap! Ini tipnya.', tone: 'good' };
  if (v >= 85) {
    if (e.regular) return { text: 'Langganan, top!', tone: 'good' };
    if (e.price <= e.fair * 0.9) return { text: 'Murah & enak!', tone: 'good' };
    if (Math.abs(taste.dSugar) < 0.5 && Math.abs(taste.dTea) < 0.7) return { text: 'Manisnya pas!', tone: 'good' };
    return { text: 'Segar banget!', tone: 'good' };
  }
  // Which part of the experience hurt the most?
  const tastePenalty = 100 - taste.score;
  const worst = Math.max(sat.pricePenalty, sat.waitPenalty, taste.complaint ? tastePenalty * 0.6 : 0);
  if (v >= BALANCE.satisfaction.happy) {
    if (sat.pricePenalty >= 8 && worst === sat.pricePenalty) return { text: 'Enak, agak mahal.', tone: 'ok' };
    if (sat.waitPenalty >= 8 && worst === sat.waitPenalty) return { text: 'Enak, tapi lama.', tone: 'ok' };
    if (taste.complaint && taste.complaint !== 'pricey' && taste.complaint !== 'slow') return { text: TASTE_LINES[taste.complaint], tone: 'ok' };
    return { text: e.hot ? 'Pas buat panas gini!' : 'Seger!', tone: 'good' };
  }
  const tone: ReactionTone = v >= BALANCE.satisfaction.neutral ? 'ok' : 'bad';
  if (worst === sat.waitPenalty && sat.waitPenalty > 0) return { text: 'Antreannya lama!', tone };
  if (worst === sat.pricePenalty && sat.pricePenalty > 0) return { text: 'Kok mahal?', tone };
  if (taste.complaint && taste.complaint !== 'pricey' && taste.complaint !== 'slow') {
    // Too much ice and weak tea often come together.
    if (taste.dIce > 0.8 && taste.dTea < -0.4) return { text: TASTE_LINES.iceHigh, tone };
    return { text: TASTE_LINES[taste.complaint], tone };
  }
  return { text: tone === 'ok' ? 'Lumayan.' : 'Biasa aja.', tone };
}

export function lostReaction(reason: LostReason, missing?: string): Reaction {
  switch (reason) {
    case 'price':
      return { text: 'Kok mahal? Nggak jadi.', tone: 'bad' };
    case 'queue':
      return { text: 'Antre panjang, ah.', tone: 'bad' };
    case 'patience':
      return { text: 'Kelamaan!', tone: 'bad' };
    case 'stock':
      return { text: missing ? `Yah, ${missing} habis…` : 'Yah, habis…', tone: 'bad' };
  }
}
