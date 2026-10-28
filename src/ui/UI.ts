import { CAMPAIGNS, STAFF } from '../data/business';
import { CUSTOMER_TYPES } from '../data/customers';
import { LOCATIONS } from '../data/locations';
import { RECIPE_LIMITS, PRICE_LIMITS, SUPPLIES } from '../data/supplies';
import { CARTS } from '../data/carts';
import { UPGRADES } from '../data/upgrades';
import { estimateDay, stockPlan } from '../systems/ForecastSystem';
import type { Game } from '../game/Game';
import type { Renderer } from '../game/Renderer';
import type { CampaignId, CartId, Ingredient, LocationId, StaffRole, UpgradeId } from '../game/types';
import { getSettings } from '../systems/SaveSystem';
import { applySettingClick, settingsHtml } from './TitleScreen';
import { rp } from '../util/format';
import { $, confirmDialog, initTooltips, modal, modalOpen, morph, showFloatingTip, toast } from './dom';
import { icon, type IconName } from './icons';
import { assetsMenu, cartsMenu, locationMenu, recipeMenu, suppliesMenu, upgradesMenu } from './menusBusiness';
import { assetName, hasSellableAssets, purchasePrice, resaleValue, type AssetRef } from '../systems/AssetSystem';
import { marketingMenu, staffMenu, statsMenu } from './menusManage';
import { cartPopover, controlsHtml, howtoHtml, hudHtml, locHud, pauseMenu, prepMini, prepPopup, reportBody } from './panels';

export type MenuId = 'location' | 'upgrades' | 'staff' | 'marketing' | 'recipe' | 'supplies' | 'carts' | 'stats' | 'assets';

/** Bottom toolbar: one button per business menu, most-used first. */
const TOOLS: { id: MenuId; label: string; icon: IconName; key: string; tip: string }[] = [
  { id: 'recipe', label: 'Resep', icon: 'recipe', key: 'R', tip: 'Racikan & harga jual' },
  { id: 'supplies', label: 'Bahan', icon: 'supplies', key: 'B', tip: 'Beli teh, gula, es, gelas' },
  { id: 'location', label: 'Lokasi', icon: 'location', key: 'L', tip: 'Pilih tempat berjualan' },
  { id: 'carts', label: 'Gerobak', icon: 'carts', key: 'G', tip: 'Beli & ganti gerobak' },
  { id: 'upgrades', label: 'Alat', icon: 'upgrades', key: 'U', tip: 'Peralatan gerobak' },
  { id: 'staff', label: 'Staf', icon: 'staff', key: 'F', tip: 'Rekrut pegawai' },
  { id: 'marketing', label: 'Promosi', icon: 'marketing', key: 'P', tip: 'Kampanye promosi' },
  { id: 'stats', label: 'Statistik', icon: 'stats', key: 'S', tip: 'Keuangan, riwayat & target' },
];

/** Menus that need a wider panel (cart previews, tables). */
const WIDE: MenuId[] = ['carts', 'stats'];
const PANEL_W = 470;
const PANEL_W_WIDE = 560;
const PREP_W = 292;

const SELLER_LINES = ['Makasih!', 'Silakan!', 'Mampir lagi, ya!', 'Es teh segar!', 'Ditunggu lagi!', 'Monggo!'];
const LOST_NOTICE: Record<'price' | 'queue' | 'patience', string> = {
  price: 'Pembeli batal: kemahalan',
  queue: 'Antrean penuh — pembeli pergi',
  patience: 'Antreannya kelamaan — pembeli pergi',
};

/** Big purchases ask for confirmation first. */
const CONFIRM_ABOVE = 100_000;

export class UI {
  private menu: MenuId | null = null;
  private statsTab = 'today';
  private refreshT = 0;
  private sales: number[] = [];
  private reportShown = false;
  private bankruptShown = -1;
  /** Canvas drag; `slop` is how far a finger may wobble before a tap becomes a pan. */
  private drag: { x: number; y: number; moved: boolean; slop: number } | null = null;
  private busy = false;
  private prepDetails = false;
  /**
   * How the pre-opening card is shown. Purely a view state: minimizing never
   * opens the stand, charges costs or changes the day.
   */
  private prepView: 'expanded' | 'minimized' = 'expanded';
  private cartPop = false;
  private pauseOpen = false;
  private lastInv: Record<string, number> = {};
  private noticeAt: Record<string, number> = {};
  private sellerAt = 0;
  /** Set by main.ts: return to the title screen (game is saved first). */
  onMainMenu: (screen?: 'main' | 'new' | 'load') => void = () => {};
  onSettingsChanged: () => void = () => {};
  /** True while another screen (the title screen) covers the game: shortcuts are ignored. */
  isBlocked: () => boolean = () => false;
  /** Set by main.ts: the pause menu opened/closed (used for music ducking). */
  onPauseMenu: (open: boolean) => void = () => {};

  constructor(
    private readonly game: Game,
    private readonly renderer: Renderer,
  ) {
    this.build();
    initTooltips();
    this.bind();
    game.events.on('toast', ({ text, kind }) => toast(text, kind));
    game.events.on('sale', (e) => this.onSale(e.price, e.tip));
    game.events.on('lost', (e) => this.onLost(e.reason));
    game.events.on('stateChanged', () => this.refresh(true));
    game.events.on('locationChanged', () => {
      this.renderer.camera.zoomIndex = getSettings().zoom;
      this.renderer.focusCart(this.game.world);
    });
    game.events.on('dayEnded', () => {
      this.sales = [];
      this.reportShown = false;
      this.cartPop = false;
    });
    this.renderer.focusCart(game.world);
    this.watchBars();
    this.refresh(true);
  }

  /**
   * The HUD (top) and toolbar (bottom) change size with the layout (e.g. the HUD
   * wraps onto two rows on a phone). Their real extent is published as CSS
   * variables so panels, cards and toasts always sit between them.
   */
  private watchBars(): void {
    const stage = $('#stage');
    const hud = $('#hud');
    const bar = $('#toolbar');
    const update = () => {
      stage.style.setProperty('--hud-h', `${Math.round(hud.offsetTop + hud.offsetHeight)}px`);
      stage.style.setProperty('--bar-h', `${Math.round(stage.offsetHeight - bar.offsetTop)}px`);
    };
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(hud);
      ro.observe(bar);
      ro.observe(stage);
    }
    update();
  }

  /** Compact (phone portrait) layout: panels cover the width, the pre-opening card sits at the bottom. */
  private get narrow(): boolean {
    const c = $('#stage').classList;
    return c.contains('st-narrow') && !c.contains('st-short');
  }

  private build(): void {
    $('#toolbar').innerHTML = TOOLS.map(
      (t) => `<button class="tool" data-act="tool" data-id="${t.id}" data-tip="<b>${t.label}</b> · ${t.tip}<br><small>Tombol ${t.key}</small>">${icon(t.icon, 28)}<span>${t.label}</span></button>`,
    ).join('');
  }

  // ------------------------------------------------------------------ per-frame

  update(dt: number): void {
    this.refreshT += dt;
    if (this.refreshT >= 0.2) {
      this.refreshT = 0;
      this.refresh(false);
      this.game.checkProgress();
    }
    if (this.cartPop) this.placeCartPop();
  }

  private salesRate(): number {
    const now = this.game.state.timeMin;
    this.sales = this.sales.filter((t) => now - t <= 60 && t <= now);
    return this.sales.length;
  }

  private refresh(full: boolean): void {
    const g = this.game;
    const s = g.state;
    morph($('#hud'), hudHtml(g, this.salesRate()));
    const lh = $('#loc-hud');
    // The pre-opening card already names the location, so the location card only shows once the day runs.
    lh.hidden = s.phase === 'prep';
    if (!lh.hidden) morph(lh, locHud(g));
    morph($('#ctl'), controlsHtml(g));
    for (const b of document.querySelectorAll<HTMLElement>('#toolbar .tool')) b.classList.toggle('on', b.dataset.id === this.menu);

    const menuEl = $('#menu');
    if (this.menu) {
      menuEl.hidden = false;
      menuEl.classList.toggle('wide', WIDE.includes(this.menu));
      morph(menuEl, this.menuHtml(this.menu));
    } else menuEl.hidden = true;

    const prep = $('#prep');
    prep.hidden = s.phase !== 'prep';
    const prepMinimized = this.prepView === 'minimized';
    prep.classList.toggle('mini', prepMinimized);
    if (!prep.hidden) morph(prep, prepMinimized ? prepMini(g) : prepPopup(g, this.prepDetails));

    const pop = $('#cart-pop');
    if (this.cartPop && s.phase !== 'report') {
      pop.hidden = false;
      morph(pop, cartPopover(g));
    } else {
      pop.hidden = true;
      this.cartPop = false;
    }

    const pause = $('#pause');
    pause.hidden = !this.pauseOpen;
    if (this.pauseOpen) morph(pause, pauseMenu(g));

    if (this.narrow) {
      // Panels cover the width here; keep the cart centred between the HUD and the bottom bar/card.
      const stage = $('#stage');
      const menuEl2 = $('#menu');
      const bottomEdge = !menuEl2.hidden
        ? menuEl2.offsetTop
        : prep.hidden || prepMinimized
          ? stage.offsetHeight - parseFloat(getComputedStyle(stage).getPropertyValue('--bar-h') || '0')
          : prep.offsetTop;
      this.renderer.setInsets(0, 0, $('#hud').offsetTop + $('#hud').offsetHeight, stage.offsetHeight - bottomEdge);
    } else {
      const left = this.menu ? (WIDE.includes(this.menu) ? PANEL_W_WIDE : PANEL_W) + 16 : 0;
      // The view does not move when the card is minimized or restored (only when it appears or goes away).
      this.renderer.setInsets(left, prep.hidden ? 0 : PREP_W + 16);
    }

    this.stockTicks();
    if (s.phase === 'report' && !this.reportShown && !modalOpen()) void this.showReport();
    if (full && g.isBankrupt() && this.bankruptShown !== s.day && !modalOpen()) void this.showBankrupt();
  }

  private menuHtml(id: MenuId): string {
    const g = this.game;
    switch (id) {
      case 'supplies':
        return suppliesMenu(g);
      case 'recipe':
        return recipeMenu(g);
      case 'location':
        return locationMenu(g);
      case 'upgrades':
        return upgradesMenu(g);
      case 'carts':
        return cartsMenu(g);
      case 'staff':
        return staffMenu(g);
      case 'marketing':
        return marketingMenu(g);
      case 'stats':
        return statsMenu(g, this.statsTab, this.salesRate());
      case 'assets':
        return assetsMenu(g);
    }
  }

  /** Opens one menu panel (only one at a time). `toggle` closes it when it's already open. */
  openMenu(id: MenuId | null, toggle = false): void {
    const next = toggle && this.menu === id ? null : id;
    if (next !== this.menu) $('#menu').scrollTop = 0;
    this.menu = next;
    this.cartPop = false;
    this.refresh(true);
  }

  // ------------------------------------------------------------------ feedback

  private onSale(price: number, tip: number): void {
    this.sales.push(this.game.state.timeMin);
    const cash = document.querySelector<HTMLElement>('#hud .cash');
    if (cash) {
      cash.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.09)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
      this.floatText(cash, `+${rp(price + tip)}`);
    }
    const now = performance.now();
    if (now - this.sellerAt > 2600) {
      this.sellerAt = now;
      this.renderer.sellerSay(tip ? 'Makasih tipnya!' : SELLER_LINES[Math.floor(Math.random() * SELLER_LINES.length)]);
    }
  }

  private onLost(reason: 'price' | 'queue' | 'patience' | 'stock'): void {
    if (reason === 'stock' || this.game.state.phase !== 'open') return; // stock-outs have their own warning
    const now = performance.now();
    if (now - (this.noticeAt[reason] ?? -1e9) < 20_000) return;
    this.noticeAt[reason] = now;
    toast(LOST_NOTICE[reason], 'warn');
  }

  /** Rising "+Rp" next to an element (DOM layer above the HUD). */
  private floatText(anchor: HTMLElement, text: string): void {
    const fx = $('#fx');
    const stage = $('#stage').getBoundingClientRect();
    const scale = stage.width / $('#stage').offsetWidth || 1;
    const r = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-cash';
    el.textContent = text;
    el.style.left = `${(r.left + r.width / 2 - stage.left) / scale}px`;
    el.style.top = `${(r.bottom - stage.top) / scale + 2}px`;
    fx.appendChild(el);
    while (fx.children.length > 6) fx.firstElementChild?.remove();
    el.animate([{ opacity: 0, transform: 'translate(-50%, -6px)' }, { opacity: 1, transform: 'translate(-50%, 0)', offset: 0.2 }, { opacity: 0, transform: 'translate(-50%, 22px)' }], {
      duration: 1100,
      easing: 'ease-out',
    }).onfinish = () => el.remove();
  }

  /** Brief highlight on ingredient pills whose stock changed (use = amber dip, purchase = green glow). */
  private stockTicks(): void {
    const inv = this.game.state.inventory;
    for (const id of Object.keys(inv) as Ingredient[]) {
      const q = inv[id].qty;
      const before = this.lastInv[id];
      this.lastInv[id] = q;
      if (before === undefined || before === q) continue;
      const el = document.querySelector<HTMLElement>(`#hud .ing[data-ing="${id}"]`);
      if (!el) continue;
      const color = q > before ? 'rgba(57,122,85,0.55)' : 'rgba(231,182,92,0.6)';
      el.animate([{ background: color }, { background: 'transparent' }], { duration: q > before ? 900 : 450, easing: 'ease-out' });
    }
  }

  private flashRow(sel: string): void {
    document.querySelector<HTMLElement>(sel)?.animate([{ background: 'rgba(231,182,92,0.55)' }, { background: 'transparent' }], { duration: 500, easing: 'ease-out' });
  }

  // ------------------------------------------------------------------ cart popover

  private placeCartPop(): void {
    const pop = $('#cart-pop');
    if (pop.hidden) return;
    const c = this.renderer.cartOnCanvas();
    const stage = $('#stage');
    const W = stage.offsetWidth;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const sideCard = !this.narrow && this.game.state.phase === 'prep' && this.prepView === 'expanded';
    const rightLimit = W - 8 - (sideCard ? PREP_W + 16 : 0);
    const hudBottom = $('#hud').offsetTop + $('#hud').offsetHeight;
    const barTop = $('#toolbar').offsetTop;
    let x: number;
    let y: number;
    if (this.narrow) {
      // Too narrow to sit beside the cart: centre it above the cart (or below when there's no room).
      x = Math.max(8, Math.min(W - 8 - w, c.x - w / 2));
      y = c.top - 10 - h >= hudBottom + 8 ? c.top - 10 - h : Math.min(barTop - 8 - h, c.y + 14);
    } else {
      x = c.x + 46;
      if (x + w > rightLimit) x = c.x - 46 - w;
      x = Math.max(8, Math.min(rightLimit - w, x));
      y = Math.max(hudBottom + 8, Math.min(barTop - 8 - h, c.top - 8));
    }
    pop.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  // ------------------------------------------------------------------ pause menu

  /** Opens the pause menu and freezes the whole simulation (in every phase, not only while trading). */
  showPause(): void {
    this.pauseOpen = true;
    this.cartPop = false;
    this.game.setPaused(true);
    this.onPauseMenu(true);
    this.refresh(true);
  }

  /** Closes the pause menu; only this (or a speed button) starts the simulation again. */
  private resume(): void {
    this.enterGameplay();
  }

  /**
   * The single way into running gameplay (Resume, or continuing from the title
   * screen): no pause menu, no stale popovers, simulation running.
   */
  enterGameplay(): void {
    this.pauseOpen = false;
    this.cartPop = false;
    this.game.setPaused(false);
    this.onPauseMenu(false);
    this.refresh(true);
  }

  // ------------------------------------------------------------------ dialogs

  private async showReport(): Promise<void> {
    const l = this.game.report;
    if (!l) return;
    this.reportShown = true;
    this.menu = null;
    this.pauseOpen = false;
    await modal(`Hari ke-${l.day} selesai — ${LOCATIONS[l.locationId].name}`, reportBody(this.game, l), [{ label: 'Lanjut ke hari berikutnya ▶', value: 'next', kind: 'primary' }]);
    this.game.nextDay();
    this.sales = [];
    this.prepDetails = false;
    this.prepView = 'expanded';
  }

  /**
   * No stock for a single cup and no cash to restock. If there is equipment to
   * sell, that is the way back (never a loan, never free money). Otherwise the
   * player can load another save or start over — this save is never deleted.
   */
  private async showBankrupt(): Promise<void> {
    const s = this.game.state;
    this.bankruptShown = s.day;
    if (hasSellableAssets(s)) {
      const v = await modal(
        'Kas menipis!',
        `<p>Stok bahan tidak cukup untuk segelas es teh, dan kas (${rp(s.cash)}) belum cukup untuk membeli bahan.</p><p><b>Jual sebagian peralatan untuk menambah modal</b>, lalu belanja bahan lagi.</p>`,
        [
          { label: 'Nanti saja', value: 'cancel' },
          { label: 'Jual Aset', value: 'sell', kind: 'primary' },
        ],
      );
      if (v === 'sell') this.openMenu('assets');
      return;
    }
    const v = await modal(
      'Modal habis',
      `<p>Stok bahan tidak cukup untuk segelas es teh, kas (${rp(s.cash)}) tidak cukup untuk membeli bahan, dan tidak ada peralatan yang bisa dijual.</p><p>Kamu bisa memuat simpanan lain atau memulai usaha baru. Simpanan ini tetap disimpan dan tidak dihapus.</p>`,
      [
        { label: 'Lihat dulu', value: 'cancel' },
        { label: 'Muat Permainan', value: 'load' },
        { label: 'Mulai Usaha Baru', value: 'new', kind: 'primary' },
      ],
    );
    if (v === 'new' || v === 'load') this.onMainMenu(v);
  }

  /** Clears per-game UI state after a different game was loaded. */
  reset(): void {
    this.menu = null;
    this.reportShown = false;
    this.bankruptShown = -1;
    this.sales = [];
    this.cartPop = false;
    this.pauseOpen = false;
    this.onPauseMenu(false);
    this.prepDetails = false;
    this.prepView = 'expanded';
    this.statsTab = 'today';
    this.lastInv = {};
    this.refresh(true);
  }

  async openSettings(): Promise<void> {
    await modal('Pengaturan', settingsHtml(), [{ label: 'Tutup', value: 'ok', kind: 'primary' }], true);
  }

  private async confirmBuy(name: string, price: number): Promise<boolean> {
    if (price < CONFIRM_ABOVE || this.game.state.cash < price) return true;
    return confirmDialog('Konfirmasi pembelian', `Beli <b>${name}</b> seharga <b>${rp(price)}</b>? Sisa kas: ${rp(this.game.state.cash - price)}.`, 'Beli');
  }

  // ------------------------------------------------------------------ input

  private onEscape(): void {
    if (this.pauseOpen) this.resume();
    else if (this.menu) this.openMenu(null);
    else if (this.cartPop) {
      this.cartPop = false;
      this.refresh(true);
    } else this.showPause();
  }

  private bind(): void {
    document.addEventListener('click', (e) => {
      const set = (e.target as HTMLElement).closest<HTMLElement>('[data-set]');
      if (set && !set.closest('#title')) {
        if (applySettingClick(set)) {
          const box = set.closest('.settings');
          if (box) box.outerHTML = settingsHtml();
          this.onSettingsChanged();
        }
        return;
      }
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el || (el as HTMLButtonElement).disabled || el.closest('.modal-back')) return;
      void this.action(el.dataset.act!, el.dataset);
    });

    document.addEventListener('keydown', (e) => {
      if (this.isBlocked() || modalOpen() || (e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key;
      if (k === 'Escape') {
        e.preventDefault();
        this.onEscape();
        return;
      }
      if (this.pauseOpen) return;
      if (k === ' ') {
        e.preventDefault();
        if (this.game.state.phase !== 'report') this.game.togglePause();
      } else if (k === '1' || k === '2' || k === '3') this.game.setSpeed(k === '3' ? 4 : Number(k));
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        const step = 48;
        this.renderer.camera.pan(k === 'ArrowLeft' ? step : k === 'ArrowRight' ? -step : 0, k === 'ArrowUp' ? step : k === 'ArrowDown' ? -step : 0);
      } else if (k === 'c' || k === 'C') this.renderer.focusCart(this.game.world, true);
      else if (k === '+' || k === '=') this.zoom(1);
      else if (k === '-') this.zoom(-1);
      else if (k.toLowerCase() === 'm') this.showPause();
      else {
        const t = TOOLS.find((n) => n.key.toLowerCase() === k.toLowerCase());
        if (t) this.openMenu(t.id, true);
      }
    });

    const canvas = this.renderer.canvas;
    const scale = () => {
      const r = canvas.getBoundingClientRect();
      return r.width / canvas.offsetWidth || 1;
    };
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const sc = scale();
      return { x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc };
    };
    canvas.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, y: e.clientY, moved: false, slop: e.pointerType === 'touch' ? 10 : 2 };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const sc = scale();
      if (this.drag) {
        const dx = (e.clientX - this.drag.x) / sc;
        const dy = (e.clientY - this.drag.y) / sc;
        if (Math.abs(dx) + Math.abs(dy) > this.drag.slop) this.drag.moved = true;
        if (this.drag.moved) {
          this.renderer.camera.pan(dx, dy);
          this.drag.x = e.clientX;
          this.drag.y = e.clientY;
          canvas.style.cursor = 'grabbing';
          showFloatingTip(null);
        }
        return;
      }
      const p = local(e);
      const c = this.renderer.pickCustomer(p.x, p.y);
      if (c) {
        showFloatingTip(this.customerTip(c), e.clientX, e.clientY);
        canvas.style.cursor = 'help';
      } else if (this.renderer.pickCart(p.x, p.y)) {
        showFloatingTip(this.cartPop ? null : '<b>Gerobakmu</b><br>Klik untuk atur harga, resep & stok', e.clientX, e.clientY);
        canvas.style.cursor = 'pointer';
      } else {
        showFloatingTip(null);
        canvas.style.cursor = 'grab';
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      const wasClick = this.drag && !this.drag.moved;
      this.drag = null;
      canvas.style.cursor = 'grab';
      if (!wasClick || this.game.state.phase === 'report') return;
      const p = local(e);
      const onCart = this.renderer.pickCart(p.x, p.y);
      if (onCart !== this.cartPop) {
        this.cartPop = onCart;
        showFloatingTip(null);
        this.refresh(true);
        this.placeCartPop();
      }
    });
    canvas.addEventListener('pointercancel', () => {
      this.drag = null;
      canvas.style.cursor = 'grab';
    });
    canvas.addEventListener('pointerleave', () => showFloatingTip(null));
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom(e.deltaY < 0 ? 1 : -1);
      },
      { passive: false },
    );
  }

  private customerTip(c: import('../entities/Customer').Customer): string {
    const state: Record<string, string> = { walking: 'Lewat', toQueue: 'Menuju antrean', queued: 'Mengantre', served: 'Dilayani', leaving: 'Pergi' };
    const p = c.prefs;
    return `<b>${CUSTOMER_TYPES[c.type.id].name}</b>${c.regular ? ' ★ langganan' : ''} · ${state[c.state]}${c.hasCup ? ' (membawa es teh)' : ''}<br>
      Batas harga: <b>${rp(Math.round(c.budget / 100) * 100)}</b><br>
      Selera: teh ${p.tea.toFixed(1)} · gula ${p.sugar.toFixed(1)} · es ${p.ice.toFixed(1)}${p.likesLemon ? ' · suka lemon' : ''}<br>
      Sabar: ${Math.round(c.patience)} dtk${c.state === 'queued' || c.state === 'toQueue' ? ` · menunggu ${Math.round(c.waited)} dtk` : ''}`;
  }

  private zoom(step: number): void {
    this.renderer.camera.zoomBy(step);
  }

  private async action(act: string, d: DOMStringMap): Promise<void> {
    if (this.busy) return;
    const g = this.game;
    const s = g.state;
    this.busy = true;
    try {
      switch (act) {
        case 'tool':
          this.openMenu(d.id as MenuId, true);
          break;
        case 'menu':
          this.openMenu(d.id as MenuId);
          break;
        case 'close-menu':
          this.openMenu(null);
          break;
        case 'cart-pop':
          this.cartPop = false;
          this.refresh(true);
          break;
        case 'prep-details':
          this.prepDetails = !this.prepDetails;
          this.refresh(true);
          break;
        case 'prep-min':
          this.prepView = 'minimized';
          this.refresh(true);
          break;
        case 'prep-restore':
          this.prepView = 'expanded';
          this.refresh(true);
          break;
        case 'buy':
          g.buySupply(d.id as Ingredient, Number(d.pack));
          this.flashRow(`#menu .supply[data-row="${d.id}"]`);
          break;
        case 'recipe': {
          const k = d.k as 'tea' | 'sugar' | 'ice' | 'lemon';
          const v = s.recipe[k] + Number(d.d);
          if (v >= RECIPE_LIMITS[k].min && v <= RECIPE_LIMITS[k].max) {
            g.setRecipe({ ...s.recipe, [k]: v });
            this.flashRow(`#menu .ing-step[data-row="${k}"]`);
          }
          break;
        }
        case 'price':
          g.setPrice(Math.max(PRICE_LIMITS.min, s.price + Number(d.d) * PRICE_LIMITS.step));
          break;
        case 'buy-plan': {
          const plan = stockPlan(s, g.mods, estimateDay(s, g.mods));
          const items = plan.rows.flatMap((r) => r.packs.map((count, pack) => ({ id: r.id, pack, count })).filter((x) => x.count > 0));
          if (!items.length) break;
          const list = plan.rows
            .filter((r) => r.buyQty > 0)
            .map((r) => `<li>${SUPPLIES[r.id].name}: +${r.buyQty} ${SUPPLIES[r.id].unit} (${rp(r.cost)})</li>`)
            .join('');
          if (await confirmDialog('Beli sesuai saran?', `<ul>${list}</ul>Total <b>${rp(plan.totalCost)}</b>. Sisa kas ${rp(s.cash - plan.totalCost)}.`, 'Beli')) g.buyPacks(items);
          break;
        }
        case 'set-price':
          g.setPrice(Number(d.id));
          break;
        case 'feature':
          g.unlockFeature('lemon');
          break;
        case 'loc-unlock': {
          const def = LOCATIONS[d.id as LocationId];
          if (await this.confirmBuy(`izin ${def.name}`, def.unlockCost)) g.unlockLocation(def.id);
          break;
        }
        case 'loc-move':
          g.moveTo(d.id as LocationId);
          break;
        case 'upg-buy': {
          const def = UPGRADES[d.id as UpgradeId];
          if (await this.confirmBuy(def.name, def.price)) g.buyUpgrade(def.id);
          break;
        }
        case 'cart-buy': {
          const def = CARTS[d.id as CartId];
          if (await this.confirmBuy(def.name, def.price)) g.buyCart(def.id);
          break;
        }
        case 'cart-use':
          g.useCart(d.id as CartId);
          break;
        case 'sell-asset': {
          const ref = { kind: d.kind, id: d.id } as AssetRef;
          const original = purchasePrice(s, ref);
          const price = resaleValue(original);
          const lost = ref.kind === 'upgrade' ? UPGRADES[ref.id].effect : 'Gerobak cadangan ini hilang dari koleksimu.';
          const choice = await modal(
            `Jual ${assetName(ref)}?`,
            `<table class="sale-sum">
              <tr><td>Harga beli</td><td class="num">${rp(original)}</td></tr>
              <tr><td>Susut 20%</td><td class="num neg">−${rp(original - price)}</td></tr>
              <tr class="total"><td>Kamu menerima</td><td class="num pos">${rp(price)}</td></tr>
              <tr><td>Kas setelah dijual</td><td class="num">${rp(s.cash + price)}</td></tr>
            </table>
            <p class="sale-effect"><b>Efek yang hilang:</b> ${lost}</p>`,
            [
              { label: 'Batal', value: 'cancel' },
              { label: `Jual ${rp(price)}`, value: 'sell', kind: 'danger' },
            ],
          );
          const ok = choice === 'sell';
          if (ok) {
            g.sellAsset(ref);
            if (this.menu === 'assets') this.flashRow('#hud .cash');
          }
          break;
        }
        case 'hire':
          g.hire(d.id as StaffRole);
          break;
        case 'fire':
          if (await confirmDialog('Berhentikan staf?', `${STAFF[d.id as StaffRole].name} akan berhenti bekerja. Biaya rekrut tidak kembali.`, 'Berhentikan', 'danger')) g.fire(d.id as StaffRole);
          break;
        case 'ad': {
          const def = CAMPAIGNS[d.id as CampaignId];
          if (await this.confirmBuy(def.name, def.cost)) g.launchCampaign(def.id);
          break;
        }
        case 'stats-tab':
          this.statsTab = d.id ?? 'today';
          this.refresh(true);
          break;
        case 'open-day':
          this.menu = null;
          this.prepDetails = false;
          g.openDay();
          break;
        case 'skip-day':
          if (await confirmDialog('Libur hari ini?', 'Lapak tidak dibuka hari ini. Tidak ada sewa & gaji, tapi es tetap mencair dan popularitas turun sedikit.', 'Libur')) g.skipDay();
          break;
        case 'close-early':
          if (await confirmDialog('Tutup lebih awal?', 'Lapak ditutup sekarang dan laporan hari ini ditampilkan. Pembeli yang mengantre akan pergi.', 'Tutup Lapak')) g.closeDay();
          break;
        case 'pause-menu':
          if (this.pauseOpen) this.resume();
          else this.showPause();
          break;
        case 'resume':
          this.resume();
          break;
        case 'speed':
          g.setSpeed(Number(d.id));
          break;
        case 'zoom':
          this.zoom(Number(d.d));
          break;
        case 'focus':
          this.renderer.focusCart(g.world, true);
          break;
        case 'save': {
          const ok = g.save();
          toast(ok ? 'Permainan tersimpan.' : 'Gagal menyimpan (penyimpanan browser tidak tersedia).', ok ? 'good' : 'bad');
          this.refresh(true);
          break;
        }
        case 'howto':
          await modal('Cara Bermain', howtoHtml(g), [{ label: 'Tutup', value: 'ok', kind: 'primary' }]);
          break;
        case 'main-menu':
          // Leave the pause behind: the title screen suspends the session by itself, and
          // continuing later goes straight back into running gameplay.
          this.menu = null;
          this.enterGameplay();
          this.onMainMenu('main');
          break;
        case 'open-settings':
          await this.openSettings();
          break;
      }
    } finally {
      this.busy = false;
    }
  }
}
