import type { ToastKind } from '../util/events';

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;

/**
 * Updates `el` to match `html` while keeping existing DOM nodes where the
 * structure is unchanged, so buttons under the cursor survive periodic
 * refreshes (no lost clicks, no hover flicker, scroll position preserved).
 */
export function morph(el: HTMLElement, html: string): void {
  const cacheKey = '__html';
  const anyEl = el as HTMLElement & { [cacheKey]?: string };
  if (anyEl[cacheKey] === html) return;
  anyEl[cacheKey] = html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  patchChildren(el, tpl.content);
}

function patchChildren(target: Node, source: Node): void {
  const tChildren = Array.from(target.childNodes);
  const sChildren = Array.from(source.childNodes);
  for (let i = 0; i < sChildren.length; i++) {
    const s = sChildren[i];
    const t = tChildren[i];
    if (!t) target.appendChild(s.cloneNode(true));
    else patchNode(t, s);
  }
  for (let i = tChildren.length - 1; i >= sChildren.length; i--) target.removeChild(tChildren[i]);
}

function patchNode(t: Node, s: Node): void {
  if (t.nodeType !== s.nodeType || t.nodeName !== s.nodeName) {
    t.parentNode!.replaceChild(s.cloneNode(true), t);
    return;
  }
  if (t.nodeType === Node.TEXT_NODE || t.nodeType === Node.COMMENT_NODE) {
    if (t.nodeValue !== s.nodeValue) t.nodeValue = s.nodeValue;
    return;
  }
  const te = t as Element;
  const se = s as Element;
  // A <details> keeps whatever open/closed state the player gave it.
  const keep = (name: string) => name === 'open' && te.tagName === 'DETAILS';
  for (const a of Array.from(te.attributes)) if (!se.hasAttribute(a.name) && !keep(a.name)) te.removeAttribute(a.name);
  for (const a of Array.from(se.attributes)) if (te.getAttribute(a.name) !== a.value && !keep(a.name)) te.setAttribute(a.name, a.value);
  if (te instanceof HTMLInputElement && se instanceof HTMLInputElement && document.activeElement !== te) te.value = se.getAttribute('value') ?? '';
  patchChildren(te, se);
}

// ------------------------------------------------------------------ toasts

export function toast(text: string, kind: ToastKind = 'info'): void {
  const root = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = text;
  root.appendChild(el);
  while (root.children.length > 3) root.firstElementChild?.remove();
  setTimeout(() => el.classList.add('out'), kind === 'bad' || kind === 'unlock' ? 4200 : 3000);
  setTimeout(() => el.remove(), kind === 'bad' || kind === 'unlock' ? 4700 : 3500);
}

// ------------------------------------------------------------------ tooltips

export function initTooltips(): void {
  const tip = $('#tooltip');
  let current: HTMLElement | null = null;
  const place = (e: MouseEvent) => {
    const stage = $('#stage');
    const scale = stage.getBoundingClientRect().width / stage.offsetWidth || 1;
    const sr = stage.getBoundingClientRect();
    let x = (e.clientX - sr.left) / scale + 14;
    let y = (e.clientY - sr.top) / scale + 16;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    if (x + w > stage.offsetWidth - 4) x = stage.offsetWidth - w - 4;
    if (y + h > stage.offsetHeight - 4) y = (e.clientY - sr.top) / scale - h - 8;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };
  document.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (el === current) return;
    current = el;
    if (!el) {
      tip.classList.remove('show');
      return;
    }
    tip.innerHTML = el.dataset.tip!;
    tip.classList.add('show');
    place(e);
  });
  document.addEventListener('mousemove', (e) => {
    if (current) {
      if (!document.contains(current)) {
        current = null;
        tip.classList.remove('show');
        return;
      }
      tip.innerHTML = current.dataset.tip!;
      place(e);
    }
  });
}

/** Shows a tooltip for something that isn't a DOM element (e.g. a customer on the canvas). */
export function showFloatingTip(html: string | null, clientX = 0, clientY = 0): void {
  const tip = $('#tooltip');
  if (!html) {
    if (tip.dataset.floating) {
      tip.classList.remove('show');
      delete tip.dataset.floating;
    }
    return;
  }
  tip.dataset.floating = '1';
  tip.innerHTML = html;
  tip.classList.add('show');
  const stage = $('#stage');
  const sr = stage.getBoundingClientRect();
  const scale = sr.width / stage.offsetWidth || 1;
  let x = (clientX - sr.left) / scale + 14;
  const y = (clientY - sr.top) / scale + 16;
  if (x + tip.offsetWidth > stage.offsetWidth) x -= tip.offsetWidth + 28;
  tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

// ------------------------------------------------------------------ modals

export interface ModalButton {
  label: string;
  kind?: 'primary' | 'danger' | 'plain';
  value: string;
}

export function modal(title: string, bodyHtml: string, buttons: ModalButton[], wide = false): Promise<string> {
  return new Promise((resolve) => {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-back';
    wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-title">${title}</div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-actions">${buttons.map((b) => `<button class="btn ${b.kind ?? 'plain'}" data-v="${b.value}">${b.label}</button>`).join('')}</div>
    </div>`;
    root.appendChild(wrap);
    const close = (v: string) => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close('cancel');
      if (e.key === 'Enter') close(buttons.find((b) => b.kind === 'primary')?.value ?? buttons[0].value);
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-v]');
      if (b) close(b.dataset.v!);
    });
    (wrap.querySelector('.btn.primary') as HTMLElement | null)?.focus();
  });
}

export async function confirmDialog(title: string, text: string, ok = 'Ya', kind: 'primary' | 'danger' = 'primary'): Promise<boolean> {
  const v = await modal(title, `<p>${text}</p>`, [
    { label: 'Batal', value: 'cancel' },
    { label: ok, value: 'ok', kind },
  ]);
  return v === 'ok';
}

export function modalOpen(): boolean {
  return !!document.querySelector('#modal-root .modal-back');
}
