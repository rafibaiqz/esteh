import { CAMPAIGNS, CAMPAIGN_ORDER, GOALS, MAX_ACTIVE_CAMPAIGNS, STAFF, STAFF_ORDER } from '../data/business';
import { WEATHER } from '../data/weather';
import { LOCATIONS, LOCATION_ORDER } from '../data/locations';
import type { Game } from '../game/Game';
import type { DayLedger } from '../game/types';
import { avgSatisfaction, cashFlow, ingredientExpenses, lostTotal, netProfit, operatingExpenses } from '../systems/EconomySystem';
import { adEffect } from '../systems/Modifiers';
import { checkRequirement, goalProgress } from '../systems/ProgressionSystem';
import { escapeHtml, num, pct, rp, rpShort } from '../util/format';
import { icon, personIcon, weatherIcon } from './icons';
import { EVENT_BY_ID } from '../data/events';
import { bar, menuHeader, priceTag, reqList } from './widgets';
import { todayStats } from './panels';

// ------------------------------------------------------------------ Staff

export function staffMenu(game: Game): string {
  const s = game.state;
  const cards = STAFF_ORDER.map((id) => {
    const def = STAFF[id];
    const hired = s.staff.includes(id);
    const reqOk = checkRequirement(s, def.req).ok;
    return `<div class="card ${hired ? 'owned' : !reqOk ? 'locked' : ''}">
      <div class="card-head" data-tip="${escapeHtml(def.desc)}">${personIcon(def.shirt)}<div><b>${def.name}</b><div class="effect">${def.effect}</div></div></div>
      <div class="cart-stats"><span>Biaya rekrut <b>${rp(def.hireCost)}</b></span><span>Gaji <b>${rp(def.wage)}/hari</b></span></div>
      ${hired ? '' : reqList(game, def.req)}
      <div class="card-foot">${
        hired
          ? `<span class="badge good">${icon('check', 12)} Bekerja</span><button class="btn danger" data-act="fire" data-id="${id}">Berhentikan</button>`
          : `${priceTag(game, def.hireCost)}<button class="btn primary" data-act="hire" data-id="${id}" ${reqOk ? '' : 'disabled'}>Rekrut</button>`
      }</div>
    </div>`;
  }).join('');
  return `${menuHeader('Staf', 'staff', 'Gaji dibayar setiap pagi saat lapak dibuka.')}
    <div class="menu-body">
      <div class="kv-grid">
        <div><span>Staf aktif</span><b>${s.staff.length} orang</b></div>
        <div><span>Total gaji / hari</span><b>${rp(game.mods.wages)}</b></div>
        <div data-tip="Termasuk efek alat & gerobak"><span>Waktu saji</span><b>${game.mods.serviceTime.toFixed(1)} dtk</b></div>
      </div>
      <div class="grid2">${cards}</div>
    </div>`;
}

// ------------------------------------------------------------------ Marketing

export function marketingMenu(game: Game): string {
  const s = game.state;
  const ad = adEffect(s);
  const here = s.campaigns.filter((c) => c.locationId === s.locationId);
  const elsewhere = s.campaigns.filter((c) => c.locationId !== s.locationId);
  const full = here.length >= MAX_ACTIVE_CAMPAIGNS;
  const active = here.length
    ? `<ul class="active-ads">${here.map((c) => `<li>${icon('marketing', 14)} <b>${CAMPAIGNS[c.id].name}</b> — sisa ${c.daysLeft} hari <small>(+${CAMPAIGNS[c.id].awareness} poin)</small></li>`).join('')}</ul>`
    : '<div class="note">Belum ada promosi aktif di lokasi ini.</div>';
  const cards = CAMPAIGN_ORDER.map((id) => {
    const def = CAMPAIGNS[id];
    const reqOk = checkRequirement(s, def.req).ok;
    // Preview with diminishing returns.
    const after = 1 - Math.exp(-(ad.awareness + def.awareness) / 35);
    const gain = (0.6 * after - (ad.interestMult - 1)) * 100;
    return `<div class="card ${!reqOk ? 'locked' : ''}">
      <div class="card-head" data-tip="${escapeHtml(def.desc)}">${icon('marketing', 24)}<div><b>${def.name}</b><small>${def.days} hari · +${def.awareness} kesadaran</small></div></div>
      <div class="cart-stats">
        <span>Durasi <b>${def.days} hari</b></span>
        <span data-tip="Poin kesadaran merek selama kampanye">Kesadaran <b>+${def.awareness}</b></span>
        <span data-tip="Popularitas lokasi bertambah setiap hari kampanye">Popularitas <b>+${def.popularityPerDay}/hari</b></span>
        <span data-tip="Tambahan minat beli bila dijalankan sekarang (setelah efek jenuh)">Minat <b>+${gain.toFixed(1)}%</b></span>
      </div>
      ${reqList(game, def.req)}
      <div class="card-foot">${priceTag(game, def.cost)}<button class="btn primary" data-act="ad" data-id="${id}" ${reqOk && !full && s.phase !== 'report' ? '' : 'disabled'}>Jalankan</button></div>
    </div>`;
  }).join('');
  return `${menuHeader('Promosi', 'marketing', `Promosi berlaku di lokasi tempat dijalankan (${LOCATIONS[s.locationId].name}).`)}
    <div class="menu-body">
      <div class="kv-grid">
        <div data-tip="Total poin kesadaran dari promosi aktif"><span>Kesadaran</span><b>${ad.awareness} poin</b></div>
        <div data-tip="Pengali minat beli: 1 + 0,6 × (1 − e^(−poin/35))"><span>Minat beli</span><b>+${pct((ad.interestMult - 1) * 100)}</b></div>
        <div data-tip="Pengali lalu lintas: 1 + 0,35 × (1 − e^(−poin/35))"><span>Lalu lintas</span><b>+${pct((ad.trafficMult - 1) * 100)}</b></div>
      </div>
      <div class="sat-row"><span>Kejenuhan promosi</span>${bar(ad.interestMult - 1, 0.6, 'warn', 'Semakin penuh, semakin kecil tambahan efek promosi baru')}</div>
      ${active}
      ${elsewhere.length ? `<div class="note small">Promosi di lokasi lain: ${elsewhere.map((c) => `${CAMPAIGNS[c.id].name} @ ${LOCATIONS[c.locationId].name} (${c.daysLeft} hr)`).join(', ')}</div>` : ''}
      <div class="note small">Belanja promosi hari ini: <b>${rp(s.today.advertising)}</b>. Efek promosi jenuh — menumpuk banyak promosi memberi tambahan yang makin kecil. Maks ${MAX_ACTIVE_CAMPAIGNS} promosi aktif per lokasi.</div>
      <div class="grid2">${cards}</div>
    </div>`;
}

// ------------------------------------------------------------------ Statistics

/** Single-series bar chart of daily net profit (negative days drop below the baseline). */
function profitChart(history: DayLedger[]): string {
  const days = history.slice(-14);
  if (!days.length) return '<div class="note">Grafik muncul setelah hari pertama selesai.</div>';
  const vals = days.map(netProfit);
  const max = Math.max(1, ...vals.map((v) => Math.abs(v)));
  const hasNeg = vals.some((v) => v < 0);
  const H = 110;
  const zero = hasNeg ? H / 2 : H;
  const scale = (hasNeg ? H / 2 : H) / max;
  // Keep at least 7 slots so a short history doesn't produce giant bars.
  const slots = Math.max(7, days.length);
  const bw = 100 / slots;
  const bars = days
    .map((d, i) => {
      const v = vals[i];
      const h = Math.max(1, Math.abs(v) * scale);
      const y = v >= 0 ? zero - h : zero;
      const tip = `<b>Hari ${d.day}</b> · ${LOCATIONS[d.locationId].name}<br>${WEATHER[d.weather].name}<br>Terjual ${d.cupsSold} gelas<br>Pendapatan ${rp(d.revenue)}<br>Biaya bahan ${rp(ingredientExpenses(d))}<br>Biaya operasional ${rp(operatingExpenses(d))}<br><b>Laba ${rp(v)}</b>`;
      return `<g class="chart-bar" data-tip="${escapeHtml(tip)}"><rect x="${i * 20}" y="0" width="20" height="${H}" fill="transparent"/>
        <rect class="${v >= 0 ? 'pos' : 'neg'}" x="${i * 20 + 3}" y="${y.toFixed(1)}" width="14" height="${h.toFixed(1)}"/></g>`;
    })
    .join('');
  const labels = days.map((d, i) => `<span style="left:${(i + 0.5) * bw}%">${d.day}</span>`).join('');
  return `<div class="chart">
    <div class="chart-title">Laba bersih harian (14 hari terakhir) <small>maks ${rpShort(max)}</small></div>
    <svg width="100%" height="${H}" viewBox="0 0 ${slots * 20} ${H}" preserveAspectRatio="none" class="chart-svg" role="img" aria-label="Laba bersih harian">
      <line x1="0" x2="${slots * 20}" y1="${zero}" y2="${zero}" class="baseline" vector-effect="non-scaling-stroke"/>${bars}
    </svg>
    <div class="chart-x">${labels}</div>
  </div>`;
}

interface Group {
  key: string;
  label: string;
  days: number;
  cups: number;
  profit: number;
  sat: number;
  satDays: number;
}

function groupBy(days: DayLedger[], keyOf: (d: DayLedger) => string, labelOf: (d: DayLedger) => string): Group[] {
  const map = new Map<string, Group>();
  for (const d of days) {
    const k = keyOf(d);
    const g = map.get(k) ?? { key: k, label: labelOf(d), days: 0, cups: 0, profit: 0, sat: 0, satDays: 0 };
    g.days++;
    g.cups += d.cupsSold;
    g.profit += netProfit(d);
    if (d.customersServed) {
      g.sat += avgSatisfaction(d);
      g.satDays++;
    }
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.profit / b.days - a.profit / a.days);
}

function groupTable(title: string, head: string, groups: Group[], limit = 6): string {
  if (!groups.length) return '';
  const best = groups[0];
  return `<h3>${title}</h3><table class="tbl small"><thead><tr><th>${head}</th><th>Hari</th><th>Gelas/hari</th><th>Laba/hari</th><th>Puas</th></tr></thead><tbody>${groups
    .slice(0, limit)
    .map(
      (g) =>
        `<tr class="${g === best && groups.length > 1 ? 'cur' : ''}"><td>${g.label}</td><td>${g.days}</td><td>${Math.round(g.cups / g.days)}</td><td class="${g.profit < 0 ? 'neg' : 'pos'}">${rpShort(g.profit / g.days)}</td><td>${g.satDays ? pct(g.sat / g.satDays) : '—'}</td></tr>`,
    )
    .join('')}</tbody></table>`;
}

/** Compares past days to show which locations, prices, recipes and weather paid off. */
function analysis(game: Game): string {
  const s = game.state;
  const days = s.history.filter((d) => d.cupsSold > 0 || d.rent > 0);
  if (!days.length) return '<div class="note">Analisis muncul setelah beberapa hari berjualan.</div>';
  const here = days.filter((d) => d.locationId === s.locationId);
  return `<div class="note small">Rata-rata per hari dari ${days.length} hari terakhir (maks 30). Baris yang disorot = laba per hari tertinggi.</div>
    ${groupTable('Lokasi paling menguntungkan', 'Lokasi', groupBy(days, (d) => d.locationId, (d) => LOCATIONS[d.locationId].name))}
    ${groupTable(`Strategi harga di ${LOCATIONS[s.locationId].name}`, 'Harga', groupBy(here, (d) => String(d.price), (d) => rp(d.price)))}
    ${groupTable('Resep', 'Teh/Gula/Es', groupBy(days, (d) => `${d.recipe.tea}/${d.recipe.sugar}/${d.recipe.ice}/${d.recipe.lemon}`, (d) => `${d.recipe.tea}/${d.recipe.sugar}/${d.recipe.ice}${d.recipe.lemon ? `/L${d.recipe.lemon}` : ''}`))}
    ${groupTable('Cuaca', 'Cuaca', groupBy(days, (d) => d.weather, (d) => WEATHER[d.weather].name), 10)}`;
}

export function statsMenu(game: Game, tab: string, salesRate: number): string {
  const s = game.state;
  const t = s.totals;
  const tabs = `<div class="tabs">${[
    ['today', 'Hari Ini'],
    ['overview', 'Ringkasan'],
    ['days', 'Riwayat Hari'],
    ['analysis', 'Analisis'],
    ['goals', 'Target'],
  ]
    .map(([id, label]) => `<button class="tab ${tab === id ? 'on' : ''}" data-act="stats-tab" data-id="${id}">${label}</button>`)
    .join('')}</div>`;
  let body = '';
  if (tab === 'today') {
    body = todayStats(game, salesRate, game.world.feed);
  } else if (tab === 'overview') {
    const locRows = LOCATION_ORDER.filter((id) => s.unlockedLocations.includes(id))
      .map((id) => {
        const p = s.locations[id];
        return `<tr><td>${LOCATIONS[id].name}</td><td>${num(p.daysOpen)}</td><td>${num(p.cupsSold)}</td><td>${rpShort(p.revenue)}</td><td>${Math.round(p.popularity)}</td><td>${Math.round(p.satisfaction)}%</td></tr>`;
      })
      .join('');
    const lost = s.history.reduce(
      (a, d) => {
        a.price += d.lost.price;
        a.queue += d.lost.queue;
        a.patience += d.lost.patience;
        a.stock += d.lost.stock;
        return a;
      },
      { price: 0, queue: 0, patience: 0, stock: 0 },
    );
    body = `
      <div class="kv-grid four">
        <div><span>Hari berjualan</span><b>${num(t.daysPlayed)}</b></div>
        <div><span>Gelas terjual</span><b>${num(t.cupsSold)}</b></div>
        <div data-tip="Pendapatan minuman (tanpa tip)"><span>Total pendapatan</span><b>${rpShort(t.revenue)}</b></div>
        <div data-tip="Tip dicatat terpisah dari pendapatan minuman"><span>Total tip</span><b>${rpShort(t.tips)}</b></div>
        <div data-tip="Akumulasi laba bersih semua hari yang sudah selesai"><span>Total laba</span><b class="${t.profit < 0 ? 'neg' : 'pos'}">${rpShort(t.profit)}</b></div>
        <div><span>Pelanggan dilayani</span><b>${num(t.customersServed)}</b></div>
        <div><span>Pelanggan hilang</span><b>${num(t.lostCustomers)}</b></div>
        <div><span>Laba terbaik</span><b>${rpShort(t.bestDayProfit)}</b></div>
        <div><span>Kepuasan terbaik</span><b>${pct(t.bestDaySatisfaction)}</b></div>
      </div>
      ${profitChart(s.history)}
      <h3>Pelanggan hilang (semua hari)</h3>
      <div class="lost-grid">
        <div data-tip="Harga di atas batas harga pembeli">${icon('price', 18)} Kemahalan <b>${num(lost.price)}</b></div>
        <div data-tip="Antrean penuh saat pembeli datang">${icon('people', 18)} Antrean penuh <b>${num(lost.queue)}</b></div>
        <div data-tip="Pembeli bosan menunggu">${icon('wait', 18)} Kesal menunggu <b>${num(lost.patience)}</b></div>
        <div data-tip="Bahan habis">${icon('empty', 18)} Bahan habis <b>${num(lost.stock)}</b></div>
      </div>
      <h3>Per lokasi</h3>
      <table class="tbl"><thead><tr><th>Lokasi</th><th>Hari</th><th>Gelas</th><th>Pendapatan</th><th>Pop.</th><th>Puas</th></tr></thead><tbody>${locRows}</tbody></table>`;
  } else if (tab === 'days') {
    const rows = s.history
      .slice()
      .reverse()
      .map(
        (d) =>
          `<tr data-tip="${escapeHtml(`${WEATHER[d.weather].name}${EVENT_BY_ID[d.eventId] && d.eventId !== 'biasa' ? ` · ${EVENT_BY_ID[d.eventId].headline}` : ''}<br>Resep teh ${d.recipe.tea}/gula ${d.recipe.sugar}/es ${d.recipe.ice}<br>Bahan ${rp(ingredientExpenses(d))} · operasional ${rp(operatingExpenses(d))}`)}"><td>${d.day}</td><td>${LOCATIONS[d.locationId].name}</td><td>${weatherIcon(d.weather, 14)}</td><td>${rpShort(d.price)}</td><td>${d.cupsSold}</td><td>${rpShort(d.revenue)}</td><td>${rpShort(d.tips)}</td><td class="${netProfit(d) < 0 ? 'neg' : 'pos'}">${rpShort(netProfit(d))}</td><td>${d.customersServed ? pct(avgSatisfaction(d)) : '—'}</td><td>${lostTotal(d)}</td></tr>`,
      )
      .join('');
    body = rows
      ? `<table class="tbl small"><thead><tr><th>Hari</th><th>Lokasi</th><th>Cuaca</th><th>Harga</th><th>Gelas</th><th>Pendapatan</th><th>Tip</th><th>Laba</th><th>Puas</th><th>Hilang</th></tr></thead><tbody>${rows}</tbody></table>
         <div class="note small">Laba = Pendapatan minuman + Tip − Bahan (terpakai + terbuang) − Operasional (sewa, gaji, promosi, perawatan, rekrut). Arahkan kursor ke baris untuk detail. Arus kas hari terakhir: ${rp(cashFlow(s.history[s.history.length - 1]))}.</div>`
      : '<div class="note">Belum ada hari yang selesai.</div>';
  } else if (tab === 'analysis') {
    body = analysis(game);
  } else {
    body = `<div class="goals">${GOALS.map((g) => {
      const done = s.goalsDone.includes(g.id);
      const cur = goalProgress(s, g);
      const isMoney = g.metric === 'bestProfit' || g.metric === 'cash' || g.metric === 'tips';
      const fmt = (v: number) => (isMoney ? rpShort(v) : g.metric === 'bestSatisfaction' ? pct(v) : num(v));
      return `<div class="goal ${done ? 'done' : ''}">${icon(done ? 'goals' : 'star', 22)}<div><b>${g.name}</b><small>${g.desc}${g.reward ? ` · Hadiah ${rp(g.reward)}` : ''}</small>
        ${done ? '<em>Selesai!</em>' : `${bar(cur, g.target, 'thin')}<em>${fmt(Math.min(cur, g.target))} / ${fmt(g.target)}</em>`}</div></div>`;
    }).join('')}</div>`;
  }
  return `${menuHeader('Statistik', 'stats', 'Kinerja hari ini, riwayat, dan target.')}<div class="menu-body">${tabs}${body}</div>`;
}
