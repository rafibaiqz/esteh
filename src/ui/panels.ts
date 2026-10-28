import { LOCATIONS, OPEN_HOUR } from '../data/locations';
import { SUPPLIES } from '../data/supplies';
import { CARTS } from '../data/carts';
import { WEATHER } from '../data/weather';
import { EVENT_BY_ID } from '../data/events';
import type { Game } from '../game/Game';
import type { DayLedger } from '../game/types';
import type { FeedItem } from '../systems/CustomerSystem';
import {
  avgSatisfaction,
  cashFlow,
  grossProfit,
  ingredientExpenses,
  lostTotal,
  netProfit,
  operatingExpenses,
  otherExpenses,
} from '../systems/EconomySystem';
import { eventDef, eventScopeText } from '../systems/EventSystem';
import { demandLevel, estimateDay, stockPlan } from '../systems/ForecastSystem';
import { activeIngredients, cupsByIngredient, cupsPossible, LOW_STOCK_CUPS } from '../systems/InventorySystem';
import { hasSellableAssets } from '../systems/AssetSystem';
import { getSettings, savedAt, storageAvailable } from '../systems/SaveSystem';
import { dayPart, forecastText, todayText, weatherNow, weatherNowLabel } from '../systems/WeatherSystem';
import { WEEKDAYS, dayOfMonth, dayOfWeek, isWeekend, monthOf } from '../util/calendar';
import { clock, escapeHtml, num, pct, rp, rpShort } from '../util/format';
import { icon, weatherIcon, type IconName } from './icons';
import { bar } from './widgets';

export const ING_ICON: Record<string, IconName> = { tea: 'tea', sugar: 'sugar', ice: 'ice', cups: 'cups', lemon: 'lemon' };

export function dateLabel(day: number): string {
  return `${WEEKDAYS[dayOfWeek(day)]}, ${dayOfMonth(day)} Bln ${monthOf(day)}${isWeekend(day) ? ' ☀' : ''}`;
}

export function demandBars(level: number): string {
  return `<span class="dbars">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= level ? 'on' : ''} l${level}"></i>`).join('')}</span>`;
}

// ------------------------------------------------------------------ HUD (always visible, top edge)

export function hudHtml(game: Game, salesRate: number): string {
  const s = game.state;
  const l = s.today;
  const by = cupsByIngredient(s);

  const stock = activeIngredients(s)
    .map((id) => {
      const def = SUPPLIES[id];
      const it = s.inventory[id];
      const low = by[id] !== Infinity && by[id] < LOW_STOCK_CUPS;
      const tip = `<b>${def.name}</b> · ${num(it.qty)} / ${num(game.mods.capacity[id])} ${def.unit}<br>${
        by[id] === Infinity ? 'Tidak dipakai resep saat ini' : `Cukup untuk <b>${num(by[id])}</b> gelas`
      }<br><i>Klik untuk membeli</i>`;
      return `<button class="ing ${it.qty === 0 ? 'empty' : low ? 'low' : ''}" data-ing="${id}" data-act="menu" data-id="supplies" data-tip="${tip}">${icon(ING_ICON[id], 20)}<b>${num(it.qty)}</b></button>`;
    })
    .join('');

  const close = game.mods.closeHour * 60;
  const progress = s.phase === 'prep' ? 0 : ((s.timeMin - OPEN_HOUR * 60) / (close - OPEN_HOUR * 60)) * 100;
  const phase = s.phase === 'prep' ? 'Persiapan' : s.phase === 'open' ? dayPart(s.timeMin) : 'Tutup';
  const left = Math.max(0, close - s.timeMin);
  const timeTip = `<b>Hari ke-${s.day}</b> · ${dateLabel(s.day)}<br>${
    s.phase === 'open' ? `Tutup pukul ${clock(close)} (sisa ${Math.floor(left / 60)} j ${Math.floor(left % 60)} m)` : s.phase === 'prep' ? 'Waktu berjalan setelah lapak dibuka.' : 'Lapak sudah tutup.'
  }`;

  const now = weatherNow(s);
  const w = now.def;
  const ev = eventDef(s);
  const news = ev.id !== 'biasa';
  const wxTip = `<b>${weatherNowLabel(now)}</b> (sekarang)<br>${todayText(s)}<br>${w.effect}<br><br><b>Besok:</b> ${forecastText(s)}${
    news ? `<br><br><b>📰 ${escapeHtml(s.event.headline)}</b><br>${ev.desc}<br><i>${eventScopeText(s)}</i>` : ''
  }`;

  const lost = lostTotal(l);
  const salesTip = `<b>Hari ini</b><br>Terjual ${num(l.cupsSold)} gelas · ${salesRate}/jam<br>Pendapatan ${rp(l.revenue)}${l.tips ? ` + tip ${rp(l.tips)}` : ''}<br>Puas ${l.feedback.happy} · biasa ${l.feedback.neutral} · kecewa ${l.feedback.unhappy}<br>Pergi tanpa beli: ${lost} (kemahalan ${l.lost.price}, antre ${l.lost.queue + l.lost.patience}, habis ${l.lost.stock})<br><i>Rincian di menu Statistik</i>`;

  const running = !s.paused && s.phase === 'open';
  const speeds = [1, 2, 4]
    .map((n) => `<button class="spd ${running && s.speed === n ? 'on' : ''}" data-act="speed" data-id="${n}" data-tip="Kecepatan ${n}× (tombol ${n === 4 ? 3 : n})">${n}×</button>`)
    .join('');

  return `<div class="pill cash" data-tip="Kas <b>${escapeHtml(s.businessName)}</b> (milik ${escapeHtml(s.ownerName)})">${icon('cash', 22)}<b class="${s.cash < 10_000 ? 'neg' : ''}">${rp(s.cash)}</b></div>
    <div class="pill stock">${stock}</div>
    <div class="pill time" data-tip="${timeTip}">${icon('clock', 18)}<div><b>${clock(s.timeMin)}</b><small>H${s.day} · ${phase}</small></div><i class="dayprog"><i style="width:${Math.max(0, Math.min(100, progress)).toFixed(1)}%"></i></i></div>
    <div class="pill wx" data-tip="${escapeHtml(wxTip)}">${weatherIcon(now.id, 24)}<b>${now.temperature}°</b>${news ? `<span class="news-dot ${ev.good}" aria-label="Ada berita">📰</span>` : ''}</div>
    <div class="pill sales" data-tip="${escapeHtml(salesTip)}" data-act="menu" data-id="stats">${icon('cups', 18)}<b>${num(l.cupsSold)}</b>${icon('happy', 16)}<b>${l.feedback.happy}</b>${icon('unhappy', 16)}<b class="${lost ? 'neg' : ''}">${l.feedback.unhappy + lost}</b></div>
    <div class="hud-gap"></div>
    <div class="pill ctrl">
      <button class="spd pause ${s.paused ? 'on' : ''}" data-act="pause-menu" data-tip="Jeda & menu (Esc). Spasi = jeda cepat." aria-label="${s.paused ? 'Lanjut' : 'Jeda'}"><i class="${s.paused ? 'play' : 'pz'}"></i></button>${speeds}
    </div>
    <button class="pill menu-btn" data-act="pause-menu" data-tip="Menu: simpan, pengaturan, menu utama (Esc)" aria-label="Menu">☰</button>`;
}

// ------------------------------------------------------------------ Location HUD (top-left)

export function locHud(game: Game): string {
  const s = game.state;
  const loc = LOCATIONS[s.locationId];
  const prog = s.locations[s.locationId];
  const costs = game.fixedCosts();
  return `<button class="lh-name" data-act="menu" data-id="location" data-tip="${escapeHtml(loc.description)}<br><i>Klik untuk melihat lokasi lain</i>">${icon('location', 16)}<b>${loc.name}</b></button>
    <div class="lh-tag">${loc.tagline}</div>
    <div class="lh-bars">
      <span data-tip="Popularitas lapak di lokasi ini: ${Math.round(prog.popularity)}/100">${icon('star', 14)}${bar(prog.popularity, 100, 'pop')}</span>
      <span data-tip="Kepuasan pelanggan rata-rata: ${Math.round(prog.satisfaction)}%">${icon('happy', 14)}${bar(prog.satisfaction, 100, 'sat')}</span>
    </div>
    <div class="lh-rent" data-tip="Sewa ${rp(costs.rent)} + gaji ${rp(costs.wages)} + perawatan ${rp(costs.maintenance)}, dibayar saat lapak dibuka">Sewa <b>${loc.rent ? rpShort(loc.rent) : 'gratis'}</b>${costs.total > loc.rent ? ` · total ${rpShort(costs.total)}/hari` : ''}</div>`;
}

// ------------------------------------------------------------------ Map controls (bottom-right)

export function controlsHtml(game: Game): string {
  const s = game.state;
  return `${s.phase === 'open' ? `<button class="ctl-btn wide" data-act="close-early" data-tip="Tutup lapak sekarang dan lihat laporan">Tutup Lapak</button>` : ''}
    <button class="ctl-btn" data-act="zoom" data-d="-1" data-tip="Perkecil (−)" aria-label="Perkecil">−</button>
    <button class="ctl-btn" data-act="zoom" data-d="1" data-tip="Perbesar (+)" aria-label="Perbesar">+</button>
    <button class="ctl-btn" data-act="focus" data-tip="Kembali ke gerobak" aria-label="Pusatkan">⌖</button>
    ${s.paused ? '<div class="paused-tag">DIJEDA</div>' : ''}`;
}

// ------------------------------------------------------------------ Pre-opening popup

export function prepPopup(game: Game, details: boolean): string {
  const s = game.state;
  const mods = game.mods;
  const costs = game.fixedCosts();
  const possible = cupsPossible(s);
  const can = game.canOpen();
  const est = estimateDay(s, mods);
  const lvl = demandLevel(s, mods, est);
  const now = weatherNow(s);
  const w = now.def;
  const ev = eventDef(s);
  // The headline is the weather right now (same as the HUD); the peak and any afternoon change are labelled forecasts.
  const outlook = now.later ? `Mulai 13:00 ${WEATHER[now.later].name.toLowerCase()} · puncak ±${now.peak}°C` : `Sepanjang hari · puncak ±${now.peak}°C`;

  let stockLine: string;
  const plan0 = stockPlan(s, mods, est);
  const cashShort = plan0.totalCost > s.cash && hasSellableAssets(s);
  if (cashShort && possible < est.cups)
    stockLine = `<div class="pp-warn">${icon('cash', 18)}<span>Kas menipis untuk belanja bahan. Jual sebagian peralatan?</span><button class="link" data-act="menu" data-id="assets">Jual Aset</button></div>`;
  else if (possible === 0) stockLine = `<div class="pp-warn">${icon('empty', 18)}<span>Bahan habis.</span><button class="link" data-act="menu" data-id="supplies">Beli</button></div>`;
  else if (possible < est.cups)
    stockLine = `<div class="pp-warn">${icon('cups', 18)}<span>Stok ±${num(possible)} gelas, perkiraan laku ±${est.cups}.</span><button class="link" data-act="menu" data-id="supplies">Beli</button></div>`;
  else stockLine = `<div class="pp-ok">${icon('check', 14)}<span>Stok cukup (±${num(possible)} gelas)</span></div>`;

  let more = '';
  if (details) {
    const plan = stockPlan(s, mods, est);
    const buys = plan.rows.filter((r) => r.buyQty > 0);
    const first = getSettings().hints && s.day <= 2 && s.totals.cupsSold < 30;
    more = `<div class="pp-more">
      ${ev.id !== 'biasa' ? `<div class="pp-news ${ev.good}" data-tip="${escapeHtml(eventScopeText(s))}"><b>📰 ${escapeHtml(s.event.headline)}</b><small>${ev.desc}</small></div>` : ''}
      <div class="pp-line">Perkiraan <b>±${est.cups} gelas</b> · laba <b class="${est.profit < 0 ? 'neg' : 'pos'}">${rpShort(est.profit)}</b></div>
      <div class="pp-line">Harga <b>${rp(s.price)}</b> · wajar di sini ${rpShort(est.fairPrice)}</div>
      ${
        buys.length
          ? `<div class="pp-line">Saran beli: ${buys.map((r) => `${SUPPLIES[r.id].name.split(' ')[0].toLowerCase()} +${r.buyQty}`).join(', ')} <b>(${rpShort(plan.totalCost)})</b> <button class="link" data-act="buy-plan" ${plan.affordable ? '' : 'disabled'}>Beli</button></div>`
          : ''
      }
      <div class="pp-line">Besok: ${forecastText(s)}</div>
      ${first ? '<div class="pp-tip">Tip: cek <b>Resep</b> dan <b>Bahan</b> dulu — stok awal hanya cukup untuk sebagian hari.</div>' : ''}
    </div>`;
  }

  return `<div class="pp">
    <button class="pp-min" data-act="prep-min" data-tip="Minimalkan panel" aria-label="Minimalkan panel"><i></i></button>
    <div class="pp-day">Hari ke-${s.day} · ${dateLabel(s.day)}</div>
    <div class="pp-loc">${LOCATIONS[s.locationId].name}</div>
    <div class="pp-wx" data-tip="${escapeHtml(`${w.effect}<br><b>Saran:</b> ${w.advice}`)}">${weatherIcon(now.id, 34)}<div><b>${weatherNowLabel(now)}</b><small>${outlook}</small></div></div>
    <div class="pp-row" data-tip="Dibanding hari cerah berawan biasa di lokasi ini (cuaca, berita, akhir pekan, popularitas)."><span>Permintaan</span><b class="d${lvl.level}">${lvl.label}</b>${demandBars(lvl.level)}</div>
    ${stockLine}
    <div class="pp-row" data-tip="Sewa ${rp(costs.rent)} · gaji ${rp(costs.wages)} · perawatan ${rp(costs.maintenance)}"><span>Biaya buka</span><b>${costs.total ? rp(costs.total) : 'Gratis'}</b></div>
    <button class="btn big primary" data-act="open-day" ${can.ok ? '' : `disabled data-tip="${can.msg}"`}>BUKA LAPAK ▶</button>
    ${can.ok ? '' : `<div class="pp-warn small">${can.msg}</div>`}
    <div class="pp-btns">
      <button class="btn" data-act="menu" data-id="location">Ganti Lokasi</button>
      <button class="btn" data-act="skip-day" data-tip="Tidak berjualan: tanpa sewa & gaji, tapi es tetap mencair dan popularitas turun.">Libur Hari Ini</button>
    </div>
    <button class="pp-toggle" data-act="prep-details" aria-expanded="${details}">${details ? 'Sembunyikan rincian ▴' : 'Rincian ▾'}</button>
    ${more}
  </div>`;
}

/** Minimized pre-opening card: one compact, clickable line that restores the full card. */
export function prepMini(game: Game): string {
  const s = game.state;
  const est = estimateDay(s, game.mods);
  const lvl = demandLevel(s, game.mods, est);
  const possible = cupsPossible(s);
  const now = weatherNow(s);
  const stockTip = possible < est.cups ? `<br><b>Stok ±${num(possible)} gelas</b>, perkiraan laku ±${est.cups}` : '';
  return `<button class="pp-mini" data-act="prep-restore" aria-label="Buka panel persiapan" data-tip="Lapak belum dibuka. Klik untuk membuka panel persiapan.${stockTip}">
    ${icon('location', 16)}<b class="pm-loc">${LOCATIONS[s.locationId].name}</b>
    <span class="pm-sep"></span>${weatherIcon(now.id, 20)}<span data-tip="${weatherNowLabel(now)}">${now.temperature}°C</span>
    <span class="pm-sep"></span><span class="pm-dem">Permintaan <b class="d${lvl.level}">${lvl.label}</b></span>
    ${possible < est.cups ? `<span class="pm-warn" aria-label="Stok kurang">!</span>` : ''}
    <span class="pm-open">Buka Panel <i></i></span>
  </button>`;
}

// ------------------------------------------------------------------ Cart popover (click the cart)

export function cartPopover(game: Game): string {
  const s = game.state;
  const r = s.recipe;
  const possible = cupsPossible(s);
  const est = estimateDay(s, game.mods);
  const recipe = (['tea', 'sugar', 'ice', 'lemon'] as const)
    .filter((k) => k !== 'lemon' || s.features.includes('lemon'))
    .map((k) => `<span>${icon(ING_ICON[k], 16)}<b>${r[k]}</b></span>`)
    .join('');
  return `<div class="cp-head"><b>${CARTS[s.activeCart].name}</b><button class="close sm" data-act="cart-pop" aria-label="Tutup">✕</button></div>
    <div class="cp-row"><span>Harga</span><span class="stepper"><button class="mini" data-act="price" data-d="-1" aria-label="Turunkan harga">−</button><b>${rp(s.price)}</b><button class="mini" data-act="price" data-d="1" aria-label="Naikkan harga">+</button></span></div>
    <div class="cp-row small"><span></span><small class="${s.price > est.fairPrice * 1.4 ? 'neg' : ''}">wajar ±${rpShort(est.fairPrice)}</small></div>
    <div class="cp-row"><span>Resep</span><span class="cp-recipe">${recipe}</span></div>
    <div class="cp-row"><span>Stok</span><b class="${possible < LOW_STOCK_CUPS ? 'neg' : ''}">${num(possible)} gelas</b></div>
    <div class="cp-acts">
      <button data-act="menu" data-id="recipe">${icon('recipe', 18)}Resep</button>
      <button data-act="menu" data-id="supplies">${icon('supplies', 18)}Bahan</button>
      <button data-act="menu" data-id="carts">${icon('carts', 18)}Gerobak</button>
      <button data-act="menu" data-id="upgrades">${icon('upgrades', 18)}Alat</button>
    </div>`;
}

// ------------------------------------------------------------------ Pause menu

export function pauseMenu(game: Game): string {
  const s = game.state;
  const t = savedAt(s.saveId);
  const ok = storageAvailable();
  return `<div class="pause-card" role="dialog" aria-modal="true" aria-label="Menu jeda">
    <div class="pause-title">Dijeda</div>
    <div class="pause-sub">${escapeHtml(s.businessName)} · ${escapeHtml(s.ownerName)} · Hari ${s.day}</div>
    <button class="pbtn primary" data-act="resume">▶ Lanjutkan</button>
    <button class="pbtn" data-act="save">Simpan Permainan</button>
    <button class="pbtn" data-act="open-settings">Pengaturan</button>
    <button class="pbtn" data-act="howto">Cara Bermain</button>
    <button class="pbtn" data-act="main-menu">Kembali ke Menu Utama</button>
    <div class="pause-foot ${ok ? '' : 'neg'}">${ok ? `Tersimpan otomatis${t ? ` · terakhir ${new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}` : 'Penyimpanan browser tidak tersedia'}</div>
  </div>`;
}

export function howtoHtml(game: Game): string {
  return `<ul class="howto">
    <li><b>Pagi:</b> cek cuaca & permintaan di kartu persiapan, beli <b>Bahan</b>, atur <b>Resep</b> dan harga, lalu tekan <b>BUKA LAPAK</b>.</li>
    <li><b>Berjualan:</b> pejalan kaki menilai harga, antrean, dan stok. Arahkan kursor ke orang untuk melihat seleranya; klik gerobak untuk mengubah harga dengan cepat.</li>
    <li><b>Gelembung:</b> 😊 puas · 😐 biasa · ☹ kecewa · Rp = kemahalan · ⌛ menunggu lama · ✖ bahan habis.</li>
    <li><b>Tutup:</b> pukul ${game.mods.closeHour}:00 laporan harian muncul. Es mencair semalaman!</li>
    <li><b>Kontrol:</b> Spasi = jeda cepat, Esc = menu/tutup panel, 1/2/3 = kecepatan, +/− = zoom, seret peta untuk menggeser. Tombol huruf (R, B, L, G, U, F, P, S) membuka menu.</li>
  </ul>`;
}

// ------------------------------------------------------------------ Statistics: today

export function todayStats(game: Game, salesRate: number, feed: FeedItem[]): string {
  const s = game.state;
  const l = s.today;
  const prog = s.locations[s.locationId];
  const sat = avgSatisfaction(l);
  const profit = netProfit(l);
  const lost = lostTotal(l);
  const popDelta = prog.popularity - l.popularityStart;
  const words = feed.slice(0, 5);
  return `<div class="kv-grid">
      <div data-tip="Jumlah gelas terjual hari ini"><span>Gelas terjual</span><b>${num(l.cupsSold)}</b></div>
      <div data-tip="Pendapatan minuman = Harga × Gelas terjual (tip dicatat terpisah)"><span>Pendapatan</span><b>${rp(l.revenue)}</b></div>
      <div data-tip="Tip dari ${l.tipCount} pelanggan yang sangat puas"><span>Tip</span><b class="${l.tips ? 'pos' : ''}">${rp(l.tips)}</b></div>
      <div data-tip="Bahan yang terpakai (harga beli rata-rata) + bahan terbuang"><span>Biaya bahan</span><b>${rp(ingredientExpenses(l))}</b></div>
      <div data-tip="Laba kotor = Pendapatan − Biaya bahan"><span>Laba kotor</span><b>${rp(grossProfit(l))}</b></div>
      <div data-tip="Sewa ${rp(l.rent)} · Gaji ${rp(l.wages)} · Promosi ${rp(l.advertising)} · Lainnya ${rp(otherExpenses(l))}"><span>Operasional</span><b>${rp(operatingExpenses(l))}</b></div>
      <div class="hl" data-tip="Laba bersih = Pendapatan + Tip − Biaya bahan − Operasional${l.bonus ? ' + Bonus target' : ''}"><span>Laba bersih</span><b class="${profit < 0 ? 'neg' : 'pos'}">${rp(profit)}</b></div>
      <div data-tip="Gelas terjual per jam permainan (60 menit terakhir)"><span>Laju jual</span><b>${salesRate}/jam</b></div>
      <div data-tip="Kemahalan ${l.lost.price} · Antrean penuh ${l.lost.queue} · Bosan menunggu ${l.lost.patience} · Bahan habis ${l.lost.stock}"><span>Pergi tanpa beli</span><b class="${lost ? 'neg' : ''}">${num(lost)}</b></div>
    </div>
    <div class="meters">
      <div data-tip="Rata-rata kepuasan pembeli hari ini (rasa, harga, lama antre, pelayanan)"><span>${icon('happy', 16)} Kepuasan</span>${bar(sat, 100, 'sat')}<b>${l.customersServed ? pct(sat) : '—'}</b></div>
      <div data-tip="Popularitas lapak di lokasi ini (tersimpan per lokasi)"><span>${icon('star', 16)} Popularitas</span>${bar(prog.popularity, 100, 'pop')}<b>${Math.round(prog.popularity)}<small class="${popDelta >= 0 ? 'pos' : 'neg'}">${popDelta >= 0.5 ? ` +${Math.round(popDelta)}` : popDelta <= -0.5 ? ` ${Math.round(popDelta)}` : ''}</small></b></div>
    </div>
    <div class="feedback">
      <span data-tip="Pembeli puas">${icon('happy', 18)}<b>${l.feedback.happy}</b></span>
      <span data-tip="Pembeli kecewa (rasa/harga/menunggu)">${icon('unhappy', 18)}<b>${l.feedback.unhappy}</b></span>
      <span data-tip="Pergi karena antre lama / antrean penuh">${icon('wait', 18)}<b>${l.lost.patience + l.lost.queue}</b></span>
      <span data-tip="Menolak karena kemahalan">${icon('price', 18)}<b>${l.lost.price}</b></span>
      <span data-tip="Batal karena bahan habis">${icon('empty', 18)}<b>${l.lost.stock}</b></span>
      <span data-tip="Pelanggan tetap dilayani hari ini (total ${Math.floor(prog.regulars)} di lokasi ini)">${icon('star', 18)}<b>${l.regularsServed}</b></span>
    </div>
    <h3>Kata pelanggan</h3>
    ${
      words.length
        ? `<div class="feed">${words.map((f) => `<div class="feed-item ${f.tone}"><i></i><span>“${escapeHtml(f.text)}”</span><small>${escapeHtml(f.who)} · ${clock(f.at)}</small></div>`).join('')}</div>`
        : '<div class="note small">Belum ada komentar hari ini.</div>'
    }`;
}

// ------------------------------------------------------------------ End of day report

const minus = (v: number) => (v ? `−${rp(v)}` : rp(0));

export function reportBody(game: Game, l: DayLedger): string {
  const profit = netProfit(l);
  const gross = grossProfit(l);
  const sat = avgSatisfaction(l);
  const flow = cashFlow(l);
  const line = (label: string, v: number, cls = '', tip = '') => `<tr ${tip ? `data-tip="${tip}"` : ''}><td>${label}</td><td class="num ${cls}">${rp(v)}</td></tr>`;
  const popEnd = l.popularityEnd ?? game.state.locations[l.locationId].popularity;
  const popDelta = popEnd - l.popularityStart;
  const r = l.recipe;
  const ev = EVENT_BY_ID[l.eventId];
  const lost = [
    [l.lost.price, 'price', 'kemahalan'],
    [l.lost.queue, 'people', 'antrean penuh'],
    [l.lost.patience, 'wait', 'bosan menunggu'],
    [l.lost.stock, 'empty', 'bahan habis'],
  ] as [number, IconName, string][];
  const lostChips = lost.filter(([n]) => n > 0).map(([n, ic, label]) => `<span class="chip">${icon(ic, 14)} ${n} ${label}</span>`);
  return `<div class="report">
    <div class="report-hero">
      <span>Laba bersih</span><b class="${profit < 0 ? 'neg' : 'pos'}">${rp(profit)}</b>
      <small data-tip="Kas awal ${rp(l.cashStart)} → kas akhir ${rp(l.cashEnd ?? 0)} (termasuk belanja stok & investasi)">Kas ${flow >= 0 ? '+' : ''}${rp(flow)}</small>
    </div>
    <div class="report-top">
      <div><span>Gelas terjual</span><b>${num(l.cupsSold)}</b></div>
      <div><span>Kepuasan</span><b>${l.customersServed ? pct(sat) : '—'}</b></div>
      <div data-tip="Popularitas lokasi awal hari → akhir hari"><span>Popularitas</span><b>${Math.round(popEnd)} <small class="${popDelta >= 0 ? 'pos' : 'neg'}">${popDelta >= 0 ? '+' : ''}${popDelta.toFixed(1)}</small></b></div>
      <div><span>Pergi tanpa beli</span><b class="${lostTotal(l) ? 'neg' : ''}">${num(lostTotal(l))}</b></div>
    </div>
    <div class="report-lines">
      <div><span>Pendapatan</span><b class="pos">${rp(l.revenue)}</b></div>
      <div><span>Tip</span><b class="pos">${rp(l.tips)}</b></div>
      <div><span>Biaya bahan</span><b class="${ingredientExpenses(l) ? 'neg' : ''}">${minus(ingredientExpenses(l))}</b></div>
      <div><span>Operasional</span><b class="${operatingExpenses(l) ? 'neg' : ''}">${minus(operatingExpenses(l))}</b></div>
    </div>
    ${lostChips.length ? `<div class="report-lost">${lostChips.join('')}</div>` : ''}
    <div class="report-ctx">${weatherIcon(l.weather, 16)} ${WEATHER[l.weather].name} · harga ${rp(l.price)} · teh ${r.tea}/gula ${r.sugar}/es ${r.ice}${r.lemon ? `/lemon ${r.lemon}` : ''}${ev && ev.id !== 'biasa' ? ` · 📰 ${ev.headline}` : ''}</div>
    ${l.unlocks.length ? `<div class="unlocks"><b>★ Baru terbuka</b><ul>${l.unlocks.map((u) => `<li>${u}</li>`).join('')}</ul></div>` : ''}
    <details class="more">
      <summary>Rincian keuangan</summary>
      <table class="ledger">
        ${line(`Pendapatan minuman (${num(l.cupsSold)} gelas)`, l.revenue, 'pos')}
        ${line('Biaya bahan terpakai', -l.ingredientCost, 'neg', 'Teh, gula, es, gelas, lemon yang terpakai — dinilai dengan harga beli rata-rata')}
        ${line(`Bahan terbuang (es mencair ${num(l.meltedIce)})`, -l.wasteCost, 'neg')}
        <tr class="sub"><td>Laba kotor</td><td class="num ${gross < 0 ? 'neg' : ''}">${rp(gross)}</td></tr>
        ${line(`Tip (${l.tipCount} pelanggan)`, l.tips, 'pos', 'Dicatat terpisah dari pendapatan minuman')}
        ${line('Sewa lokasi', -l.rent, 'neg')}
        ${line('Gaji staf', -l.wages, 'neg')}
        ${line('Promosi', -l.advertising, 'neg')}
        ${line('Operasional lain (perawatan, rekrut)', -otherExpenses(l), 'neg')}
        ${l.bonus ? line('Bonus target', l.bonus, 'pos') : ''}
        <tr class="total"><td>Laba bersih</td><td class="num ${profit < 0 ? 'neg' : 'pos'}">${rp(profit)}</td></tr>
      </table>
      <table class="ledger small">
        ${line('Belanja bahan (stok)', -l.supplyPurchases, '', 'Uang keluar untuk membeli stok. Menjadi biaya saat bahan terpakai.')}
        ${line('Investasi (alat, gerobak, izin, resep)', -l.capex)}
        ${l.assetSales ? line('Penjualan aset (80% harga beli)', l.assetSales, 'pos', 'Uang dari menjual peralatan atau gerobak cadangan') : ''}
        <tr><td>Kas awal → kas akhir</td><td class="num">${rp(l.cashStart)} → ${rp(l.cashEnd ?? 0)}</td></tr>
        <tr class="total"><td>Arus kas hari ini</td><td class="num ${flow < 0 ? 'neg' : 'pos'}">${rp(flow)}</td></tr>
      </table>
      <div class="note small">Laba kotor = pendapatan − biaya bahan. Laba bersih = pendapatan + tip − biaya bahan − sewa − gaji − promosi − operasional lain. Kas awal + arus kas = kas akhir.</div>
    </details>
  </div>`;
}
