import { BALANCE } from '../data/balance';
import { FEATURES } from '../data/business';
import { WEATHER } from '../data/weather';
import { LOCATIONS, LOCATION_ORDER } from '../data/locations';
import { RECIPE_LIMITS, SUPPLIES, recipeUsage } from '../data/supplies';
import { CARTS, CART_ORDER } from '../data/carts';
import { UPGRADES, UPGRADE_CATEGORIES, UPGRADE_ORDER } from '../data/upgrades';
import type { Game } from '../game/Game';
import type { Complaint } from '../game/types';
import { locationThumbnail } from '../render/thumbnail';
import { dailyFixedCosts, demand, prefShift } from '../systems/EconomySystem';
import { bestPrice, demandLevel, estimateDay, priceOptions, stockPlan } from '../systems/ForecastSystem';
import { activeIngredients, costPerCup, cupsByIngredient, cupsPossible, LOW_STOCK_CUPS, packPrice, supplyPriceMult } from '../systems/InventorySystem';
import { BASE_SERVICE_TIME } from '../systems/Modifiers';
import { checkRequirement } from '../systems/ProgressionSystem';
import { COMPLAINT_TEXT, recipeInsight, TASTE_WEIGHTS } from '../systems/RecipeSystem';
import { currentWeatherId, forecastText } from '../systems/WeatherSystem';
import { escapeHtml, num, pct, rp, rpShort } from '../util/format';
import { icon, upgradeIcon, weatherIcon, type IconName } from './icons';
import { cartPreview, previewSize } from '../render/cartModel';
import { bar, menuHeader, priceTag, reqList } from './widgets';

const ING_ICON: Record<string, IconName> = { tea: 'tea', sugar: 'sugar', ice: 'ice', cups: 'cups', lemon: 'lemon' };

// ------------------------------------------------------------------ Supplies

function planTable(game: Game): string {
  const s = game.state;
  const mods = game.mods;
  const est = estimateDay(s, mods);
  const plan = stockPlan(s, mods, est);
  const rows = plan.rows
    .map((r) => {
      const def = SUPPLIES[r.id];
      const packs = r.packs
        .map((n, i) => (n ? `${n}×${def.packs[i].qty}` : ''))
        .filter(Boolean)
        .join(' + ');
      return `<tr>
        <td>${icon(ING_ICON[r.id], 16)} ${def.name}</td>
        <td class="num">${num(r.stock)}</td>
        <td class="num" data-tip="${est.cups} gelas × ${recipeUsage(s.recipe)[r.id]} ${def.unit}/gelas">${num(Math.round(r.expectedUse))}</td>
        <td class="num ${r.buyQty ? 'pos' : ''}" data-tip="${packs ? `Paket: ${packs}` : 'Tidak perlu beli'}${r.capacityShort ? '<br><b>Kapasitas gerobak tidak cukup untuk target.</b>' : ''}">${r.buyQty ? `+${num(r.buyQty)}` : '—'}${r.capacityShort ? ' ⚠' : ''}</td>
        <td class="num">${r.cost ? rpShort(r.cost) : '—'}</td>
        <td class="num" data-tip="${r.id === 'ice' ? `Sisa es akan mencair ${pct(mods.iceMelt * 100)} malam ini` : 'Perkiraan sisa di akhir hari'}">${num(Math.round(r.leftover))}</td>
      </tr>`;
    })
    .join('');
  return `<table class="tbl small plan-tbl">
      <thead><tr><th>Bahan</th><th>Stok</th><th>Terpakai</th><th>Saran</th><th>Biaya</th><th>Sisa</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="note small">Perkiraan = pejalan kaki × peluang beli × harga yang diterima, dibatasi kecepatan saji${est.capacityLimited ? ' (hari ini memang dibatasi kecepatan saji)' : ''}. Saran beli memberi cadangan ${pct((BALANCE.plan.safety - 1) * 100)} (es ${pct((BALANCE.plan.iceSafety - 1) * 100)}).${plan.meltLoss >= 100 ? ` Sisa es/lemon terbuang ±${rpShort(plan.meltLoss)}.` : ''} Besok: ${forecastText(s)}.</div>`;
}

/** One-line "what should I buy today" card with a single button. */
function suggestion(game: Game): string {
  const s = game.state;
  const mods = game.mods;
  const est = estimateDay(s, mods);
  const plan = stockPlan(s, mods, est);
  const lvl = demandLevel(s, mods, est);
  const buys = plan.rows.filter((r) => r.buyQty > 0);
  const head = `${weatherIcon(currentWeatherId(s), 26)}<div><b>Perkiraan ±${est.cups} gelas${est.partial ? ' lagi' : ''}</b><small>${WEATHER[currentWeatherId(s)].name} · permintaan ${lvl.label.toLowerCase()}</small></div>`;
  if (!buys.length) return `<div class="sugg ok"><div class="sugg-head">${head}</div><div class="sugg-line">${icon('check', 14)} Stok sudah cukup untuk perkiraan hari ini.</div></div>`;
  return `<div class="sugg">
    <div class="sugg-head">${head}</div>
    <div class="sugg-chips">${buys.map((r) => `<span class="chip plain">${icon(ING_ICON[r.id], 16)} +${num(r.buyQty)}</span>`).join('')}</div>
    <div class="sugg-foot"><span>Total <b>${rp(plan.totalCost)}</b></span>
      <button class="btn primary" data-act="buy-plan" ${plan.affordable && s.phase !== 'report' ? '' : 'disabled'} data-tip="${plan.affordable ? 'Membeli paket-paket saran (minta konfirmasi dulu)' : 'Kas tidak cukup untuk semua saran'}">Beli sesuai saran</button></div>
  </div>`;
}

export function suppliesMenu(game: Game): string {
  const s = game.state;
  const mods = game.mods;
  const by = cupsByIngredient(s);
  const use = recipeUsage(s.recipe);
  const discount = LOCATIONS[s.locationId].bonus.supplyDiscount;
  const rows = activeIngredients(s)
    .map((id) => {
      const def = SUPPLIES[id];
      const it = s.inventory[id];
      const cap = mods.capacity[id];
      const low = by[id] !== Infinity && by[id] < LOW_STOCK_CUPS;
      const mult = supplyPriceMult(s, id) / (1 - (discount ?? 0));
      const packs = def.packs
        .map((p, i) => {
          const price = packPrice(s, id, i);
          const fits = it.qty + p.qty <= cap;
          const afford = s.cash >= price;
          const tip = `${p.qty} ${def.unit} · ${rp(price / p.qty)}/${def.unit}${fits ? '' : '<br><b>Tidak muat di gerobak</b>'}${afford ? '' : '<br><b>Kas tidak cukup</b>'}`;
          return `<button class="pack ${afford && fits ? '' : 'dim'}" data-act="buy" data-id="${id}" data-pack="${i}" data-tip="${tip}"><b>+${p.qty}</b><span>${rpShort(price)}</span></button>`;
        })
        .join('');
      const usesText = use[id] > 0 ? `cukup ${by[id] === Infinity ? '∞' : num(by[id])} gelas` : 'tidak dipakai resep';
      return `<div class="supply ${low ? 'low' : ''}" data-row="${id}">
        <div class="supply-id" data-tip="${escapeHtml(def.desc)}<br>Harga rata-rata stok: ${rp(it.avgCost)}/${def.unit}${mult > 1.01 ? `<br>Harga hari ini +${pct((mult - 1) * 100)}` : ''}">${icon(ING_ICON[id], 30)}
          <div><b>${def.name}</b>${mult > 1.01 ? `<em class="neg">+${pct((mult - 1) * 100)}</em>` : ''}<small>${num(it.qty)} / ${num(cap)} ${def.unit} · <span class="${low ? 'warn-text' : ''}">${usesText}</span></small>${bar(it.qty, cap, low ? 'warn' : '')}</div></div>
        <div class="packs">${packs}</div>
      </div>`;
    })
    .join('');
  return `${menuHeader('Bahan', 'supplies', `Kas ${rp(s.cash)} · bisa dibuat ${num(cupsPossible(s))} gelas`)}
    <div class="menu-body">
      ${discount ? `<div class="note good">Harga grosir Pasar: semua bahan ${pct(discount * 100)} lebih murah.</div>` : ''}
      ${suggestion(game)}
      ${rows}
      <div class="note small">Modal bahan ${rp(costPerCup(s))}/gelas. Es mencair ${pct(mods.iceMelt * 100)} tiap malam${s.features.includes('lemon') ? `, lemon layu ${pct(mods.lemonSpoil * 100)}` : ''} — beli secukupnya.</div>
      <details class="more"><summary>Rincian rencana stok</summary>${planTable(game)}</details>
    </div>`;
}

// ------------------------------------------------------------------ Recipe & price

function glass(r: { tea: number; sugar: number; ice: number; lemon: number }): string {
  const tea = 30 + r.tea * 10;
  const darkness = Math.min(1, 0.35 + r.tea * 0.13);
  const color = `rgba(${Math.round(190 - darkness * 90)}, ${Math.round(110 - darkness * 60)}, ${Math.round(40 - darkness * 25)}, 0.95)`;
  const cubes = Array.from({ length: r.ice }, (_, i) => `<i class="cube" style="left:${10 + (i % 3) * 18}px;top:${8 + Math.floor(i / 3) * 14}px"></i>`).join('');
  const lemons = Array.from({ length: r.lemon }, (_, i) => `<i class="lemon-slice" style="left:${14 + i * 22}px"></i>`).join('');
  const sugar = `<i class="sugar" style="height:${r.sugar * 3}px"></i>`;
  return `<div class="glass"><div class="tea" style="height:${Math.min(100, tea)}%;background:${color}">${cubes}${lemons}${sugar}</div><div class="straw"></div></div>`;
}

/** Price options table, best price and the breakdown behind the fair price (collapsed by default). */
function priceAnalysis(game: Game): string {
  const s = game.state;
  const mods = game.mods;
  const d = demand(s, mods);
  const est = estimateDay(s, mods);
  const opts = priceOptions(s, mods);
  const best = bestPrice(s, mods);
  const up = estimateDay(s, mods, { price: s.price + 500 });
  const drop = est.cups > 0 ? 1 - up.cups / est.cups : 0;
  const optRows = opts
    .map(
      (o) =>
        `<tr class="${o.price === s.price ? 'cur' : ''}"><td>${rp(o.price)}</td><td class="num">${o.cups}</td><td class="num">${rpShort(o.revenue)}</td><td class="num ${o.profit < 0 ? 'neg' : 'pos'}">${rpShort(o.profit)}</td><td>${
          o.price === s.price ? '<small>sekarang</small>' : `<button class="link" data-act="set-price" data-id="${o.price}">Pakai</button>`
        }</td></tr>`,
    )
    .join('');
  return `<div class="price-info">
      <div data-tip="Peluang orang yang lewat ingin membeli. Faktor harga = (wajar ÷ harga)^${d.elasticity.toFixed(2)}."><span>Minat beli</span><b>${pct(d.interest * 100)}</b></div>
      <div data-tip="Pendapatan minuman + perkiraan tip"><span>Perkiraan pendapatan</span><b>${rpShort(est.revenue + est.tips + (est.partial ? s.today.revenue + s.today.tips : 0))}</b></div>
      <div data-tip="Perkiraan kepuasan rata-rata (rasa, harga, pelayanan)"><span>Perkiraan kepuasan</span><b>${pct(est.satisfaction)}</b></div>
      <div data-tip="Perubahan penjualan bila harga naik Rp 500"><span>Jika naik Rp 500</span><b class="${drop >= 0.15 ? 'neg' : ''}">${drop > 0 ? '−' : ''}${pct(Math.abs(drop) * 100)} gelas</b></div>
    </div>
    <table class="tbl small price-tbl">
      <thead><tr><th>Harga</th><th>${est.partial ? 'Gelas lagi' : 'Gelas'}</th><th>Pendapatan</th><th>Laba hari ini</th><th></th></tr></thead>
      <tbody>${optRows}</tbody>
    </table>
    <div class="note small">Laba tertinggi diperkirakan di <b>${rp(best.price)}</b> (±${best.cups} gelas, laba ${rpShort(best.profit)}) ${
      best.price !== s.price ? `<button class="link" data-act="set-price" data-id="${best.price}">Pakai</button>` : ''
    }. Harga wajar = harga dasar lokasi × kualitas resep × cuaca × berita × popularitas. Hasil nyata bisa berbeda.</div>`;
}

const ING_LABEL: Record<string, string> = { tea: 'Teh', sugar: 'Gula', ice: 'Es', lemon: 'Lemon', cups: 'Gelas' };

export function recipeMenu(game: Game): string {
  const s = game.state;
  const r = s.recipe;
  const mods = game.mods;
  const insight = recipeInsight(s, r, mods, prefShift(s, s.locationId), s.locationId);
  const cost = costPerCup(s);
  const lemonOwned = s.features.includes('lemon');
  const complaints = (Object.entries(s.today.complaints) as [Complaint, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const L = RECIPE_LIMITS;
  const by = cupsByIngredient(s);
  const loc = LOCATIONS[s.locationId];
  const est = estimateDay(s, mods);
  const unitTip: Record<string, string> = {
    tea: `Kekentalan teh. Selisih 1 takar dari selera pembeli = −${TASTE_WEIGHTS.tea} poin rasa.`,
    sugar: `Tingkat manis. Selisih 1 sdm = −${TASTE_WEIGHTS.sugar} poin rasa.`,
    ice: `Kesegaran. Selisih 1 kubus = −${TASTE_WEIGHTS.ice} poin rasa. Cuaca menggeser selera, resepmu tidak berubah otomatis.`,
    lemon: 'Penyuka lemon: +6 poin per iris (maks 2). Yang tidak suka: −5 per iris.',
  };
  const steps = (['tea', 'sugar', 'ice', 'lemon'] as const)
    .filter((k) => k !== 'lemon' || lemonOwned)
    .map((k) => {
      const def = SUPPLIES[k];
      const short = by[k] !== Infinity && by[k] < Math.max(LOW_STOCK_CUPS, 1);
      return `<div class="ing-step ${short ? 'short' : ''}" data-row="${k}">
        <span class="ing-ico" data-tip="${unitTip[k]}<br>Stok ${num(s.inventory[k].qty)} ${def.unit} · cukup ${by[k] === Infinity ? '—' : num(by[k])} gelas">${icon(ING_ICON[k], 32)}</span>
        <span class="ing-name"><b>${ING_LABEL[k]}</b><small>${short ? `<span class="neg">stok ${num(s.inventory[k].qty)}</span>` : def.unit}</small></span>
        <button class="step" data-act="recipe" data-k="${k}" data-d="-1" ${r[k] <= L[k].min ? 'disabled' : ''} aria-label="Kurangi ${def.name}">−</button>
        <b class="ing-val">${r[k]}</b>
        <button class="step" data-act="recipe" data-k="${k}" data-d="1" ${r[k] >= L[k].max ? 'disabled' : ''} aria-label="Tambah ${def.name}">+</button>
      </div>`;
    })
    .join('');
  const taste = Math.round(insight.expectedTaste);
  const verdict = taste >= 85 ? 'Istimewa' : taste >= 72 ? 'Enak' : taste >= 58 ? 'Lumayan' : taste >= 45 ? 'Kurang pas' : 'Tidak cocok';
  const tone = taste >= 70 ? 'good' : taste >= 50 ? 'pop' : 'warn';
  const margin = s.price - cost;
  const warnings: string[] = [];
  if (s.price < cost) warnings.push('Harga di bawah modal — rugi di setiap gelas!');
  else if (s.price > est.fairPrice * 1.5) warnings.push(`Jauh di atas harga wajar (${rpShort(est.fairPrice)}) — banyak yang batal beli.`);
  const rows = (['tea', 'sugar', 'ice', 'lemon', 'cups'] as const)
    .filter((k) => k !== 'lemon' || lemonOwned)
    .map((k) => {
      const per = k === 'cups' ? 1 : r[k];
      const unit = s.inventory[k].avgCost;
      return `<tr><td>${icon(ING_ICON[k], 16)} ${SUPPLIES[k].name}</td><td class="num">${per} ${SUPPLIES[k].unit}</td><td class="num">${num(s.inventory[k].qty)}</td><td class="num">${rp(Math.round(unit))}</td><td class="num">${rp(Math.round(per * unit))}</td></tr>`;
    })
    .join('');
  return `${menuHeader('Resep & Harga', 'recipe', `Racik es teh untuk pembeli di ${loc.name}.`)}
    <div class="menu-body">
      <div class="rc">
        <div class="rc-glass">${glass(r)}</div>
        <div class="rc-steps">${steps}</div>
      </div>
      <div class="rc-meter" data-tip="Rata-rata skor rasa untuk pelanggan di ${loc.name} (240 selera contoh). Reputasi rasa di sini: ${Math.round(s.locations[s.locationId].quality)}/100.">
        <div class="rc-meter-head"><span>Rasa</span><b class="${tone}">${verdict}</b><small>${taste}/100</small></div>
        ${bar(insight.expectedTaste, 100, tone)}
        <div class="rc-hint">💡 ${insight.hints[0]}</div>
      </div>
      <div class="rc-money">
        <div data-tip="Biaya bahan per gelas (harga beli rata-rata stok)"><span>Modal</span><b>${rp(Math.round(cost))}</b></div>
        <div class="rc-price"><span>Harga jual</span><span class="stepper"><button class="step" data-act="price" data-d="-1" aria-label="Turunkan harga">−</button><b>${rp(s.price)}</b><button class="step" data-act="price" data-d="1" aria-label="Naikkan harga">+</button></span></div>
        <div data-tip="Harga jual − modal bahan"><span>Untung</span><b class="${margin < 0 ? 'neg' : 'pos'}">${rp(Math.round(margin))}</b></div>
      </div>
      <div class="rc-est" data-tip="Memakai cuaca, berita, kualitas resep, popularitas, promosi, dan pesaing hari ini.">Harga wajar <b>${rp(est.fairPrice)}</b> · perkiraan <b>±${est.cupsTotal} gelas</b> · laba <b class="${est.profit < 0 ? 'neg' : 'pos'}">${rpShort(est.profit)}</b></div>
      ${warnings.map((w) => `<div class="note warn">⚠ ${w}</div>`).join('')}
      ${complaints.length ? `<div class="complaints"><span>Keluhan hari ini:</span> ${complaints.slice(0, 3).map(([c, n]) => `<span class="chip">${COMPLAINT_TEXT[c]} ×${n}</span>`).join('')}</div>` : ''}
      <details class="more"><summary>Rincian bahan per gelas</summary>
        <table class="tbl small"><thead><tr><th>Bahan</th><th class="num">Per gelas</th><th class="num">Stok</th><th class="num">Harga/unit</th><th class="num">Biaya</th></tr></thead><tbody>${rows}</tbody>
        <tfoot><tr><td colspan="4"><b>Total modal per gelas</b></td><td class="num"><b>${rp(Math.round(cost))}</b></td></tr></tfoot></table>
        <div class="note small">Selera rata-rata di ${loc.name} hari ini: teh ${insight.meanPrefs.tea.toFixed(1)} · gula ${insight.meanPrefs.sugar.toFixed(1)} · es ${insight.meanPrefs.ice.toFixed(1)} · suka lemon ${pct(insight.meanPrefs.lemon * 100)}.${insight.hints.length > 1 ? ` ${insight.hints.slice(1).join(' ')}` : ''}</div>
      </details>
      <details class="more"><summary>Analisis harga</summary>${priceAnalysis(game)}</details>
      ${
        lemonOwned
          ? ''
          : `<div class="card ${checkRequirement(s, FEATURES.lemon.req).ok ? '' : 'locked'}">
          <div class="card-head">${icon('lemon', 26)}<div><b>${FEATURES.lemon.name}</b><small>${FEATURES.lemon.desc}</small></div></div>
          ${reqList(game, FEATURES.lemon.req)}
          <div class="card-foot">${priceTag(game, FEATURES.lemon.price)}<button class="btn primary" data-act="feature" data-id="lemon" ${checkRequirement(s, FEATURES.lemon.req).ok ? '' : 'disabled'}>Buka Resep</button></div>
        </div>`
      }
    </div>`;
}

// ------------------------------------------------------------------ Locations

export function locationMenu(game: Game): string {
  const s = game.state;
  const cards = LOCATION_ORDER.map((id) => {
    const def = LOCATIONS[id];
    const prog = s.locations[id];
    const unlocked = s.unlockedLocations.includes(id);
    const current = s.locationId === id;
    const reqOk = checkRequirement(s, def.req).ok;
    const est = estimateDay(s, game.mods, { locationId: id });
    const fixed = dailyFixedCosts(s, game.mods, id);
    let action: string;
    if (current) action = `<span class="badge">Di sini</span>`;
    else if (unlocked)
      action =
        s.phase === 'prep'
          ? `<button class="btn primary" data-act="loc-move" data-id="${id}">Pindah</button>`
          : `<button class="btn" disabled data-tip="Pindah lokasi hanya saat persiapan pagi.">Besok</button>`;
    else action = `${priceTag(game, def.unlockCost)}<button class="btn primary" data-act="loc-unlock" data-id="${id}" ${reqOk ? '' : 'disabled'}>Beli Izin</button>`;
    const evHere = s.event.id !== 'biasa' && (s.event.locationId === id || (s.event.locationId === null && est.locationId === id));
    const facts = `${def.description}<br><br>Pelanggan: ${def.demographics}<br>Peka harga: ${def.priceSensitivity >= 1.5 ? 'sangat' : def.priceSensitivity >= 1.2 ? 'cukup' : 'rendah'} · Pesaing: ${
      def.competition >= 0.4 ? 'tinggi' : def.competition >= 0.2 ? 'sedang' : 'rendah'
    }<br>Harga dasar ${rp(def.refPrice)} · Teduh: ${def.shelter >= 0.4 ? 'ya' : def.shelter > 0 ? 'sebagian' : 'tidak'}<br>Biaya harian ${rp(fixed.total)}`;
    return `<div class="card loc ${current ? 'current' : ''} ${!unlocked && !reqOk ? 'locked' : ''}">
      <img class="thumb" src="${locationThumbnail(id)}" alt="Peta ${def.name}" />
      <div class="loc-info">
        <div class="card-title" data-tip="${escapeHtml(facts)}"><b>${def.name}</b>${!unlocked ? icon('lock', 14) : ''}<span class="info-i">i</span></div>
        <small>${def.tagline}</small>
        <div class="loc-stats"><span>Sewa <b>${def.rent ? rpShort(def.rent) : 'gratis'}</b></span><span>Ramai <b>${def.trafficLabel}</b></span><span>Daya beli <b>${def.purchasingLabel}</b></span></div>
        <div class="loc-est" data-tip="Perkiraan hari ini dengan resep, harga, cuaca, dan berita saat ini">±<b>${est.cups}</b> gelas · laba <b class="${est.profit < 0 ? 'neg' : 'pos'}">${rpShort(est.profit)}</b> · wajar ${rpShort(est.fairPrice)}${evHere ? ' · 📰' : ''}</div>
        <small class="bonus">★ ${def.bonusText}</small>
        ${unlocked ? `<div class="mini-bars"><span>${icon('star', 12)}</span>${bar(prog.popularity, 100, 'pop', `Popularitas ${Math.round(prog.popularity)}`)}<span>${icon('happy', 12)}</span>${bar(prog.satisfaction, 100, 'sat', `Kepuasan ${Math.round(prog.satisfaction)}%`)}</div>` : reqList(game, def.req)}
        <div class="card-foot">${action}</div>
      </div>
    </div>`;
  }).join('');
  return `${menuHeader('Lokasi', 'location', s.phase === 'prep' ? 'Pilih tempat berjualan hari ini.' : 'Lapak sedang buka — pindah besok pagi.')}
    <div class="menu-body">${cards}</div>`;
}

// ------------------------------------------------------------------ Equipment

export function upgradesMenu(game: Game): string {
  const s = game.state;
  const roofed = CARTS[s.activeCart].roofed;
  const sections = UPGRADE_CATEGORIES.map((cat) => {
    const ids = UPGRADE_ORDER.filter((id) => UPGRADES[id].category === cat.id);
    const owned = ids.filter((id) => s.upgrades.includes(id)).length;
    const cards = ids
      .map((id) => {
        const def = UPGRADES[id];
        const have = s.upgrades.includes(id);
        const reqOk = checkRequirement(s, def.req).ok;
        const idle = have && def.needsOpenCart && roofed;
        return `<div class="card upg ${have ? 'owned' : !reqOk ? 'locked' : ''}">
          <div class="card-head" data-tip="${escapeHtml(def.desc)}">${upgradeIcon(id)}<div><b>${def.name}</b><div class="effect">${def.effect}</div></div></div>
          ${idle ? `<div class="note small">Tidak dipakai oleh ${CARTS[s.activeCart].name} (sudah beratap).</div>` : ''}
          ${id === 'rodaKaret' && CARTS[s.activeCart].maintenance === 0 ? `<div class="note small">${CARTS[s.activeCart].name} tidak punya biaya perawatan, jadi efeknya baru terasa di gerobak lain.</div>` : ''}
          ${have ? '' : reqList(game, def.req)}
          <div class="card-foot">${
            have ? `<span class="badge good">${icon('check', 12)} Terpasang</span>` : `${priceTag(game, def.price)}<button class="btn primary" data-act="upg-buy" data-id="${id}" ${reqOk ? '' : 'disabled'}>Beli</button>`
          }</div>
        </div>`;
      })
      .join('');
    return `<h3 class="cat">${cat.name} <small>${owned}/${ids.length}</small></h3><div class="cat-desc">${cat.desc}</div><div class="grid2">${cards}</div>`;
  }).join('');
  return `${menuHeader('Peralatan', 'upgrades', `${s.upgrades.length}/${UPGRADE_ORDER.length} terpasang · ikut pindah ke gerobak mana pun`)}
    <div class="menu-body">${sections}</div>`;
}

// ------------------------------------------------------------------ Carts

function cartStat(label: string, value: string, tip: string, cls = ''): string {
  return `<div class="cstat ${cls}" data-tip="${tip}"><span>${label}</span><b>${value}</b></div>`;
}

export function cartsMenu(game: Game): string {
  const s = game.state;
  const base = CARTS[s.activeCart];
  const cards = CART_ORDER.map((id) => {
    const def = CARTS[id];
    const owned = s.ownedCarts.includes(id);
    const active = s.activeCart === id;
    const reqOk = checkRequirement(s, def.req).ok;
    let action: string;
    if (active) action = `<span class="badge good">${icon('check', 12)} Sedang dipakai</span>`;
    else if (owned)
      action =
        s.phase === 'prep'
          ? `<button class="btn primary" data-act="cart-use" data-id="${id}">Pakai</button>`
          : `<button class="btn" disabled data-tip="Ganti gerobak saat persiapan pagi.">Pakai besok</button>`;
    else action = `${priceTag(game, def.price)}<button class="btn primary" data-act="cart-buy" data-id="${id}" ${reqOk ? '' : 'disabled'}>Beli</button>`;
    const secs = (BASE_SERVICE_TIME * def.serviceMult).toFixed(1);
    const cmp = (a: number, b: number, higherBetter = true) => (a === b ? '' : (a > b) === higherBetter ? 'up' : 'down');
    const status = active ? 'Aktif' : owned ? 'Dimiliki' : reqOk ? 'Tersedia' : 'Terkunci';
    const extras = [
      def.roofed ? 'Beratap: tahan hujan, payung & terpal tidak diperlukan' : 'Terbuka: cocok dipasang payung & terpal',
      def.tasteBonus ? `+${def.tasteBonus} rasa (alat lebih baik)` : '',
      def.iceMelt < 1 ? `Es mencair ${Math.round((1 - def.iceMelt) * 100)}% lebih sedikit` : '',
      def.popGain > 1 ? `Popularitas naik ${Math.round((def.popGain - 1) * 100)}% lebih cepat` : '',
      def.viewBonus ? `Terlihat dari ${def.viewBonus} petak lebih jauh` : '',
    ].filter(Boolean);
    return `<div class="cart-card ${active ? 'current' : ''} ${!owned && !reqOk ? 'locked' : ''}">
      <div class="cart-preview"><img src="${cartPreview(id, s.upgrades, s.sellerLook)}" style="width:${previewSize(id).w * previewSize(id).scale}px" alt="${def.name}" /><span class="cart-status ${status.toLowerCase()}">${status}</span></div>
      <div class="cart-info">
        <div class="card-title"><b>${def.name}</b>${!owned && !reqOk ? icon('lock', 14) : ''}</div>
        <small>${def.desc}</small>
        <div class="tradeoff">${def.tradeoff}</div>
        <div class="cstats">
          ${cartStat('Kapasitas teh/es/gelas', `${def.capacity.tea}/${def.capacity.ice}/${def.capacity.cups}`, 'Stok maksimal sebelum peralatan penyimpanan', cmp(def.capacity.ice, base.capacity.ice))}
          ${cartStat('Waktu saji', `${secs} dtk`, 'Per gelas, sebelum peralatan & staf', cmp(def.serviceMult, base.serviceMult, false))}
          ${cartStat('Antrean', `${def.queue} org`, 'Pembeli yang mau mengantre', cmp(def.queue, base.queue))}
          ${cartStat('Daya tarik', `×${def.attraction.toFixed(2)}`, 'Pengali minat beli', cmp(def.attraction, base.attraction))}
          ${cartStat('Perawatan', def.maintenance ? `${rpShort(def.maintenance)}/hr` : '—', 'Biaya harian saat lapak buka', cmp(def.maintenance, base.maintenance, false))}
        </div>
        ${extras.length ? `<ul class="cart-extras">${extras.map((e) => `<li>${e}</li>`).join('')}</ul>` : ''}
        ${owned ? '' : reqList(game, def.req)}
        <div class="card-foot">${action}</div>
      </div>
    </div>`;
  }).join('');
  const m = game.mods;
  return `${menuHeader('Gerobak', 'carts', 'Tampilan sama persis dengan yang di peta, lengkap dengan peralatanmu.')}
    <div class="menu-body">
      <div class="kv-grid">
        <div data-tip="Termasuk efek alat & staf"><span>Waktu saji efektif</span><b>${m.serviceTime.toFixed(1)} dtk</b></div>
        <div><span>Kapasitas antrean</span><b>${m.queueCapacity} orang</b></div>
        <div><span>Daya tarik total</span><b>×${m.attraction.toFixed(2)}</b></div>
      </div>
      <div class="note small">Panah ▲▼ membandingkan dengan gerobak yang sedang dipakai. Tidak ada gerobak yang unggul di semua hal.</div>
      ${cards}
    </div>`;
}
