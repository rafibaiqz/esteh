/**
 * Headless balance & consistency check: plays several days with a simple
 * strategy and verifies accounting invariants. Run with `npm run sim`.
 */
import { Game } from '../src/game/Game';
import { createNewGame, ledgerFor } from '../src/game/GameState';
import { estimateDay } from '../src/systems/ForecastSystem';
import { cashFlow, netProfit, avgSatisfaction, lostTotal } from '../src/systems/EconomySystem';
import { cupsPossible } from '../src/systems/InventorySystem';
import { INGREDIENTS, type LocationId } from '../src/game/types';

const days = Number(process.argv[2] ?? 12);
const s0 = createNewGame(Number(process.argv[4] ?? 12345));
const forced = process.argv[3] as LocationId | undefined;
if (forced) {
  s0.cash = 3_000_000;
  s0.unlockedLocations = ['asri', 'sekolah', 'kampus', 'taman', 'terminal', 'kota', 'alunalun', 'perkantoran', 'pasar', 'pantai', 'premium'];
  s0.locationId = forced;
  s0.totals.cupsSold = 3000;
  s0.today = ledgerFor(s0);
}
const game = new Game(s0);
game.events.on('toast', () => {});
let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗', msg);
  }
};

function restock() {
  const s = game.state;
  for (const id of INGREDIENTS) {
    if (id === 'lemon') continue;
    let guard = 0;
    while (guard++ < 10) {
      const use = id === 'cups' ? 1 : (s.recipe as Record<string, number>)[id];
      if (s.inventory[id].qty >= use * 70) break;
      const r = game.buySupply(id, 1);
      if (!r.ok) {
        const r0 = game.buySupply(id, 0);
        if (!r0.ok) break;
      }
    }
  }
}

console.log('day loc      weather      °C event            est cups  rev    tips  profit    sat pop  reg lost(p/q/w/s) cash');
let estErr = 0;
let estN = 0;
for (let d = 0; d < days; d++) {
  const s = game.state;
  // Simple progression strategy
  if (forced) {
    const prices: Record<string, number> = { asri: 3000, sekolah: 3000, kampus: 3500, taman: 4000, terminal: 3500, kota: 6000, alunalun: 4000, perkantoran: 6500, pasar: 3500, pantai: 5000, premium: 9000 };
    const recipes: Record<string, [number, number, number]> = { asri: [2, 2, 3], sekolah: [2, 3, 4], kampus: [2, 3, 4], taman: [2, 2, 4], terminal: [3, 3, 3], kota: [3, 2, 3], alunalun: [2, 3, 3], perkantoran: [3, 2, 3], pasar: [3, 3, 3], pantai: [2, 2, 4], premium: [3, 1, 3] };
    const [t, sg, i] = process.env.RECIPE ? (process.env.RECIPE.split('/').map(Number) as [number, number, number]) : recipes[forced];
    game.setPrice(process.env.PRICE ? Number(process.env.PRICE) : prices[forced]);
    game.setRecipe({ tea: t, sugar: sg, ice: i, lemon: 0 });
    if (d === 0) { game.buyCart('gerobakPlus'); game.hire('peracik'); game.hire('kasir'); }
  }
  if (!forced && s.totals.cupsSold >= 100 && !s.unlockedLocations.includes('sekolah') && s.cash > 200_000) game.unlockLocation('sekolah');
  if (!forced && s.unlockedLocations.includes('sekolah') && s.locationId !== 'sekolah') game.moveTo('sekolah' as LocationId);
  if (!forced && s.locationId === 'sekolah') { game.setPrice(2500); game.setRecipe({ tea: 2, sugar: 3, ice: 3, lemon: 0 }); }
  if (s.cash > 120_000 && !s.upgrades.includes('payung')) game.buyUpgrade('payung');
  if (s.cash > 150_000 && !s.upgrades.includes('kotakEs')) game.buyUpgrade('kotakEs');
  if (s.totals.cupsSold > 60 && s.cash > 150_000 && !s.staff.includes('peracik')) game.hire('peracik');
  restock();
  const cashStart = s.today.cashStart;
  const est = estimateDay(s, game.mods);
  const r = game.openDay();
  check(r.ok, `day ${s.day} could not open: ${r.msg}`);
  let steps = 0;
  while (game.state.phase === 'open' && steps < 60 * 60 * 10) {
    game.update(1 / 60);
    steps++;
    for (const id of INGREDIENTS) check(game.state.inventory[id].qty >= 0, `negative ${id}`);
    if (steps % 600 === 0 && cupsPossible(game.state) < 15) restock();
  }
  const l = game.report!;
  check(!!l, 'no report');
  const flow = cashFlow(l);
  check(Math.abs(cashStart + flow - (l.cashEnd ?? 0)) < 1, `cash mismatch day ${l.day}: start ${cashStart} + flow ${flow} != end ${l.cashEnd}`);
  check(l.revenue === l.cupsSold * l.price, `drink revenue must exclude tips (day ${l.day})`);
  check(l.tips >= 0 && l.tips <= l.revenue * 0.3, `tips out of bounds (day ${l.day})`);
  if (l.cupsSold > 5) {
    estErr += Math.abs(est.cups - l.cupsSold) / l.cupsSold;
    estN++;
  }
  console.log(
    [
      String(l.day).padEnd(3),
      l.locationId.padEnd(8),
      l.weather.padEnd(12),
      String(game.state.temperature).padStart(2),
      l.eventId.slice(0, 16).padEnd(16),
      String(est.cups).padStart(4),
      String(l.cupsSold).padStart(4),
      String(l.revenue).padStart(7),
      String(l.tips).padStart(5),
      String(Math.round(netProfit(l))).padStart(8),
      avgSatisfaction(l).toFixed(0).padStart(4),
      game.state.locations[l.locationId].popularity.toFixed(0).padStart(3),
      game.state.locations[l.locationId].regulars.toFixed(0).padStart(4),
      `${lostTotal(l)}(${l.lost.price}/${l.lost.queue}/${l.lost.patience}/${l.lost.stock})`.padEnd(14),
      game.state.cash,
    ].join(' '),
  );
  game.nextDay();
}
if (estN) console.log(`\nForecast mean absolute error vs actual cups: ${((estErr / estN) * 100).toFixed(0)}% over ${estN} days`);
console.log(failures ? `\n${failures} check(s) FAILED` : 'All accounting invariants held.');
process.exit(failures ? 1 : 0);
