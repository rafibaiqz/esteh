import { LOCATIONS } from '../data/locations';
import type { NewGameSetup } from '../game/GameState';
import { DEFAULT_SELLER, SELLER_LOOKS, getSprite } from '../render/characters';
import { deleteSlot, getSettings, lastPlayed, listSaves, storageAvailable, updateSettings, type SaveMeta, type Settings } from '../systems/SaveSystem';
import { escapeHtml, rp } from '../util/format';
import { confirmDialog } from './dom';

type Screen = 'main' | 'new' | 'welcome' | 'load' | 'settings' | 'credits';

export interface TitleHandlers {
  start(setup: NewGameSetup): void;
  load(id: string): void;
  /** Whether a game is currently running underneath (menu opened from in-game). */
  inGame(): boolean;
  resume(): void;
  settingsChanged(s: Settings): void;
}

const VERSION = '1.3';

const NAME_RE = /^[\p{L}\p{N} .,'&\-]+$/u;

export function validateNames(owner: string, business: string): string | null {
  const o = owner.trim();
  const b = business.trim();
  if (o.length < 2) return 'Nama pemilik minimal 2 huruf.';
  if (o.length > 24) return 'Nama pemilik maksimal 24 karakter.';
  if (!NAME_RE.test(o)) return 'Nama pemilik hanya boleh berisi huruf, angka, spasi, dan tanda baca sederhana.';
  if (b.length > 28) return 'Nama usaha maksimal 28 karakter.';
  if (b && !NAME_RE.test(b)) return 'Nama usaha hanya boleh berisi huruf, angka, spasi, dan tanda baca sederhana.';
  return null;
}

const spriteUrls = new Map<string, string>();
function sellerSprite(id: string): string {
  const hit = spriteUrls.get(id);
  if (hit) return hit;
  const look = SELLER_LOOKS[id];
  const url = getSprite(look, { facing: 'front', flip: false, frame: -1, apron: look.apron }).toDataURL();
  spriteUrls.set(id, url);
  return url;
}

function timeAgo(t: number | null): string {
  if (!t) return 'waktu simpan tidak diketahui';
  const d = new Date(t);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Segmented settings controls (shared by the title screen and the in-game menu). */
function slider(key: 'musicVolume' | 'sfxVolume', label: string, value: number): string {
  return `<div class="set-opt"><span>${label}</span><div class="vol-ctl"><input type="range" min="0" max="100" step="5" value="${value}" data-vol="${key}" aria-label="${label}" /><output>${value}%</output></div></div>`;
}

export function settingsHtml(): string {
  const s = getSettings();
  const seg = (key: keyof Settings, label: string, opts: [string, string][], tip: string) =>
    `<div class="set-opt" data-tip="${tip}"><span>${label}</span><div class="seg">${opts
      .map(([v, l]) => `<button class="${String(s[key]) === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${l}</button>`)
      .join('')}</div></div>`;
  return `<div class="settings">
    <div class="set-col">
    <div class="set-group">Permainan</div>
    ${seg('reactions', 'Balon reaksi pelanggan', [['true', 'Tampil'], ['false', 'Sembunyi']], 'Kalimat singkat di atas kepala pelanggan dan penjual. Komentar terbaru tetap ada di Statistik → Hari Ini.')}
    ${seg('weatherFx', 'Efek cuaca', [['full', 'Penuh'], ['light', 'Ringan'], ['off', 'Mati']], 'Hanya tampilan (hujan, awan, kilat). Pengaruh cuaca ke penjualan tetap berlaku.')}
    ${seg('zoom', 'Zoom awal peta', [['0', '1×'], ['1', '1,5×'], ['2', '2×'], ['3', '3×']], 'Zoom saat permainan dibuka atau pindah lokasi.')}
    ${seg('speed', 'Kecepatan awal', [['1', '1×'], ['2', '2×'], ['4', '4×']], 'Kecepatan simulasi saat lapak dibuka.')}
    ${seg('hints', 'Tips pemula', [['true', 'Aktif'], ['false', 'Mati']], 'Petunjuk singkat di rincian kartu persiapan.')}
    </div>
    <div class="set-col">
    <div class="set-group">Suara</div>
    ${seg('muted', 'Semua suara', [['false', 'Aktif'], ['true', 'Bisu']], 'Membisukan musik dan efek tanpa mengubah volume masing-masing.')}
    ${seg('musicOn', 'Musik latar', [['true', 'Aktif'], ['false', 'Mati']], 'Musik santai \u201cTeh Sore\u201d yang diputar berulang.')}
    ${slider('musicVolume', 'Volume musik', s.musicVolume)}
    ${seg('sfxOn', 'Efek suara', [['true', 'Aktif'], ['false', 'Mati']], 'Klik tombol, bunyi kasir saat pembeli membayar, dan bunyi pemberitahuan.')}
    ${slider('sfxVolume', 'Volume efek', s.sfxVolume)}
    ${seg('pauseMusic', 'Musik saat jeda', [['normal', 'Normal'], ['soft', 'Pelan'], ['off', 'Senyap']], 'Volume musik selama menu jeda terbuka. Permainan tetap berhenti total.')}
    </div>
  </div>`;
}

export function applySettingClick(el: HTMLElement): Settings | null {
  const key = el.dataset.set as keyof Settings | undefined;
  const raw = el.dataset.val;
  if (!key || raw === undefined) return null;
  const val = raw === 'true' ? true : raw === 'false' ? false : /^\d+$/.test(raw) ? Number(raw) : raw;
  return updateSettings({ [key]: val } as Partial<Settings>);
}

export class TitleScreen {
  private screen: Screen = 'main';
  private owner = '';
  private business = 'ESTEH';
  private seller = DEFAULT_SELLER;
  private error = '';
  visible = true;

  constructor(
    private readonly container: HTMLElement,
    private readonly root: HTMLElement,
    private readonly h: TitleHandlers,
  ) {
    root.addEventListener('click', (e) => void this.onClick(e));
    root.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.name === 'owner') this.owner = t.value;
      if (t.name === 'business') this.business = t.value;
    });
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitNew();
    });
    this.render();
  }

  show(screen: Screen = 'main'): void {
    this.visible = true;
    this.container.hidden = false;
    this.screen = screen;
    this.error = '';
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.container.hidden = true;
  }

  private go(screen: Screen): void {
    this.screen = screen;
    this.error = '';
    this.render();
  }

  private submitNew(): void {
    const err = validateNames(this.owner, this.business);
    if (err) {
      this.error = err;
      this.render();
      (this.root.querySelector('input[name=owner]') as HTMLInputElement | null)?.focus();
      return;
    }
    this.go('welcome');
  }

  private async onClick(e: Event): Promise<void> {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-ta],[data-set]');
    if (!el) return;
    if (el.dataset.set) {
      const s = applySettingClick(el);
      if (s) {
        this.h.settingsChanged(s);
        this.render();
      }
      return;
    }
    switch (el.dataset.ta) {
      case 'continue': {
        const last = lastPlayed();
        if (last) this.h.load(last.id);
        break;
      }
      case 'resume':
        this.h.resume();
        break;
      case 'new':
        this.owner = '';
        this.business = 'ESTEH';
        this.seller = DEFAULT_SELLER;
        this.go('new');
        (this.root.querySelector('input[name=owner]') as HTMLInputElement | null)?.focus();
        break;
      case 'seller':
        this.seller = el.dataset.id ?? DEFAULT_SELLER;
        this.render();
        break;
      case 'submit-new':
        this.submitNew();
        break;
      case 'start':
        this.h.start({ ownerName: this.owner.trim(), businessName: this.business.trim() || 'ESTEH', sellerLook: this.seller });
        break;
      case 'load':
        this.go('load');
        break;
      case 'load-slot': {
        const id = el.dataset.id!;
        const meta = listSaves().find((m) => m.id === id);
        if (meta && !meta.corrupt) this.h.load(id);
        break;
      }
      case 'delete-slot': {
        const id = el.dataset.id!;
        const meta = listSaves().find((m) => m.id === id);
        if (!meta) break;
        const ok = await confirmDialog('Hapus simpanan?', `Simpanan <b>${escapeHtml(meta.businessName)}</b> milik <b>${escapeHtml(meta.ownerName)}</b> (hari ke-${meta.day}) akan dihapus permanen.`, 'Hapus', 'danger');
        if (ok) {
          deleteSlot(id);
          this.render();
        }
        break;
      }
      case 'settings':
        this.go('settings');
        break;
      case 'credits':
        this.go('credits');
        break;
      case 'back':
        this.go(this.screen === 'welcome' ? 'new' : 'main');
        break;
    }
  }

  private render(): void {
    const body = (() => {
      switch (this.screen) {
        case 'main':
          return this.mainHtml();
        case 'new':
          return this.newHtml();
        case 'welcome':
          return this.welcomeHtml();
        case 'load':
          return this.loadHtml();
        case 'settings':
          return `<div class="t-panel wide"><h2>Pengaturan</h2>${settingsHtml()}<div class="t-actions"><button class="btn" data-ta="back">Kembali</button></div></div>`;
        case 'credits':
          return this.creditsHtml();
      }
    })();
    this.root.innerHTML = `<div class="title-shade"></div>
      <div class="title-wrap ${this.screen === 'main' ? 'is-main' : ''}">
        <header class="wordmark"><span class="glass-logo"><i></i></span><div><b>ESTEH</b><small>Juragan Es Teh</small></div></header>
        <div class="title-body">${body}</div>
      </div>
      <div class="title-foot"><span class="version">Versi ${VERSION}<small class="save-note"> · ${storageAvailable() ? 'Progres tersimpan di browser ini' : 'Penyimpanan browser tidak tersedia!'}</small></span></div>`;
  }

  private mainHtml(): string {
    const last = lastPlayed();
    const inGame = this.h.inGame();
    return `<nav class="title-menu">
      ${inGame ? `<button class="tbtn primary" data-ta="resume"><b>Lanjutkan Permainan</b>${last ? `<small>${escapeHtml(last.businessName)} · Hari ${last.day}</small>` : ''}</button>` : ''}
      ${!inGame && last ? `<button class="tbtn primary" data-ta="continue"><b>Lanjutkan Permainan</b><small>${escapeHtml(last.businessName)} · Hari ${last.day}</small></button>` : ''}
      <button class="tbtn ${!inGame && !last ? 'primary' : ''}" data-ta="new"><b>Main Baru</b></button>
      <button class="tbtn" data-ta="load"><b>Muat Permainan</b>${listSaves().length ? `<small>${listSaves().length} simpanan</small>` : ''}</button>
      <button class="tbtn" data-ta="settings"><b>Pengaturan</b></button>
      <button class="tbtn" data-ta="credits"><b>Kredit</b></button>
    </nav>`;
  }

  private newHtml(): string {
    const sellers = Object.entries(SELLER_LOOKS)
      .map(([id, l]) => `<button type="button" class="seller-opt ${this.seller === id ? 'on' : ''}" data-ta="seller" data-id="${id}"><img src="${sellerSprite(id)}" alt="" /><span>${l.label}</span></button>`)
      .join('');
    return `<form class="t-panel" autocomplete="off" novalidate>
      <h2>Usaha Baru</h2>
      <label class="field"><span>Nama Pemilik <em>*</em></span><input name="owner" maxlength="24" value="${escapeHtml(this.owner)}" required /></label>
      <label class="field"><span>Nama Usaha</span><input name="business" maxlength="28" value="${escapeHtml(this.business)}" placeholder="ESTEH" /></label>
      <div class="field"><span>Penampilan penjual di gerobak</span><div class="seller-row">${sellers}</div></div>
      ${this.error ? `<div class="t-error">${this.error}</div>` : ''}
      <div class="t-actions"><button type="button" class="btn" data-ta="back">Kembali</button><button type="submit" class="btn primary">Lanjut</button></div>
    </form>`;
  }

  private welcomeHtml(): string {
    const biz = escapeHtml(this.business.trim() || 'ESTEH');
    return `<div class="t-panel welcome">
      <h2>Selamat datang, ${escapeHtml(this.owner.trim())}!</h2>
      <p><b>${biz}</b> dimulai dengan satu gerobak es teh klasik di <b>${LOCATIONS.asri.name}</b>, modal <b>${rp(60_000)}</b>, dan stok untuk sekitar 20 gelas.</p>
      <ul>
        <li>Pagi hari: baca berita & prakiraan cuaca, beli bahan, atur resep dan harga.</li>
        <li>Tekan <b>BUKA LAPAK</b> lalu lihat pembeli datang, mengantre, dan berkomentar.</li>
        <li>Tabung keuntungan untuk gerobak, peralatan, staf, dan lokasi baru.</li>
      </ul>
      <div class="t-actions"><button class="btn" data-ta="back">Ubah</button><button class="btn primary big" data-ta="start">Mulai Bisnis ▶</button></div>
    </div>`;
  }

  private loadHtml(): string {
    const saves = listSaves();
    const rows = saves
      .map((m: SaveMeta) =>
        m.corrupt
          ? `<div class="save-row corrupt"><div><b>Simpanan rusak</b><small>Data tidak bisa dibaca dan tidak bisa dimuat.</small></div><div class="save-btns"><button class="btn danger" data-ta="delete-slot" data-id="${m.id}">Hapus</button></div></div>`
          : `<div class="save-row">
              <div><b>${escapeHtml(m.businessName)}</b><small>${escapeHtml(m.ownerName)} · Hari ke-${m.day} · ${m.locationName} · ${rp(m.cash)}</small><small class="when">Disimpan ${timeAgo(m.savedAt)}</small></div>
              <div class="save-btns"><button class="btn primary" data-ta="load-slot" data-id="${m.id}">Muat</button><button class="btn danger" data-ta="delete-slot" data-id="${m.id}">Hapus</button></div>
            </div>`,
      )
      .join('');
    return `<div class="t-panel">
      <h2>Muat Permainan</h2>
      ${saves.length ? `<div class="save-list">${rows}</div>` : `<div class="t-empty"><b>Belum ada permainan tersimpan.</b><small>Mulai usaha baru — progresmu tersimpan otomatis.</small><button class="btn primary" data-ta="new">Main Baru</button></div>`}
      <div class="t-actions"><button class="btn" data-ta="back">Kembali</button></div>
    </div>`;
  }

  private creditsHtml(): string {
    return `<div class="t-panel credits">
      <h2>Kredit</h2>
      <p><b>ESTEH — Juragan Es Teh</b><br />Game simulasi usaha es teh 2D.</p>
      <p>Desain, kode, peta, karakter, dan seni piksel dibuat khusus untuk ESTEH dengan TypeScript dan HTML5 Canvas. Tidak memakai aset dari game lain.</p>
      <p>Terinspirasi oleh game <i>tycoon</i> klasik era 2000-an dan gerobak es teh di setiap sudut kota Indonesia.</p>
      <p class="muted">Terima kasih sudah bermain. Es tehnya jangan kemanisan, ya!</p>
      <div class="t-actions"><button class="btn" data-ta="back">Kembali</button></div>
    </div>`;
  }
}
