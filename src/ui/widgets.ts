import type { Requirement } from '../game/types';
import type { Game } from '../game/Game';
import { checkRequirement } from '../systems/ProgressionSystem';
import { escapeHtml, num, rp } from '../util/format';
import { icon } from './icons';

export function bar(value: number, max: number, cls = '', label = ''): string {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return `<div class="bar ${cls}" ${label ? `data-tip="${escapeHtml(label)}"` : ''}><div class="bar-fill" style="width:${pct.toFixed(1)}%"></div></div>`;
}

/** Requirement checklist with progress bars. */
export function reqList(game: Game, req: Requirement): string {
  const chk = checkRequirement(game.state, req);
  if (!chk.lines.length) return '';
  return `<ul class="req">${chk.lines
    .map(
      (l) =>
        `<li class="${l.ok ? 'ok' : ''}">${l.ok ? icon('check', 12) : icon('lock', 12)}<span>${l.label}</span>${
          l.target > 1 && !l.ok ? `<em>${num(Math.min(l.current, l.target))}/${num(l.target)}</em>` : ''
        }${l.target > 1 && !l.ok ? bar(l.current, l.target, 'thin') : ''}</li>`,
    )
    .join('')}</ul>`;
}

export function priceTag(game: Game, price: number): string {
  return `<span class="price ${game.state.cash >= price ? '' : 'short'}">${rp(price)}</span>`;
}

export function stepper(act: string, key: string, value: string, tip = '', disabledMinus = false, disabledPlus = false): string {
  return `<span class="stepper" ${tip ? `data-tip="${escapeHtml(tip)}"` : ''}>
    <button class="mini" data-act="${act}" data-k="${key}" data-d="-1" ${disabledMinus ? 'disabled' : ''}>−</button>
    <b>${value}</b>
    <button class="mini" data-act="${act}" data-k="${key}" data-d="1" ${disabledPlus ? 'disabled' : ''}>+</button>
  </span>`;
}

export function menuHeader(title: string, iconName: Parameters<typeof icon>[0], sub = ''): string {
  return `<div class="menu-head">${icon(iconName, 26)}<div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div><button class="close" data-act="close-menu" data-tip="Tutup (Esc)">✕</button></div>`;
}
