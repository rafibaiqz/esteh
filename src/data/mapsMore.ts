import type { GameMap } from '../world/Map';
import { building, houses, lane, neighbourhood } from './mapKit';

// Five additional neighbourhoods. Each has a distinct composition: a campus
// quad, a bus terminal, a town square, an office park and a diagonal beach.
// As in maps.ts, the original 24×24 block is authored in local coordinates
// and the outskirts after `b.at(0, 0)` in absolute 36×36 coordinates.

const N = 24;

/** Campus: faculty buildings around a green quad, one main road at the gate. */
export function kampus(): GameMap {
  const b = neighbourhood('lawn');
  b.hRoad(21);
  b.zebra(10, 21, 2, 2, 'v');
  b.rect(10, 3, 2, 17, 'plaza').rect(3, 3, 16, 1, 'plaza').rect(0, 11, N, 1, 'plaza').rect(7, 12, 1, 8, 'plaza').rect(12, 17, 10, 1, 'path');
  b.paintOver(8, 4, 6, 7, 'garden', ['lawn']);
  b.rect(8, 5, 2, 5, 'lawn').rect(12, 5, 2, 5, 'lawn');
  b.structure({ kind: 'school', x: 6, y: 0, w: 10, h: 3, wall: '#f5ead6', roof: '#6b4226', face: 'left', height: 34, sign: 'REKTORAT', accent: '#c98a32', floors: 2 }).door(11, 3);
  b.structure({ kind: 'school', x: 1, y: 5, w: 6, h: 6, wall: '#eef0f2', roof: '#2c4a6b', face: 'left', height: 32, sign: 'FAK. TEKNIK', accent: '#2e86de', floors: 2 }).door(4, 11);
  b.structure({ kind: 'school', x: 15, y: 5, w: 7, h: 6, wall: '#f6efe1', roof: '#8c3b2e', face: 'left', height: 32, sign: 'FAK. EKONOMI', accent: '#397a55', floors: 2 }).door(18, 11);
  b.structure({ kind: 'school', x: 1, y: 13, w: 6, h: 5, wall: '#f3e2c4', roof: '#4e2f1b', face: 'right', height: 30, sign: 'PERPUSTAKAAN', accent: '#c98a32', floors: 2 }).door(7, 15);
  b.structure({ kind: 'warung', x: 14, y: 13, w: 6, h: 4, wall: '#fff3dc', roof: '#c98a32', face: 'left', sign: 'KANTIN', awning: '#b9473e', accent: '#fff8e9', height: 22 }).door(16, 17);
  b.structure({ kind: 'rival', x: 20, y: 12, w: 1, h: 1, wall: '#6c5ce7', roof: '#ffeaa7', face: 'left', height: 12, sign: 'JUS BUAH' });
  b.prop('flag', 9, 4.4);
  b.props('tree', [[8.6, 5.6], [8.6, 8.6], [13.4, 5.6], [13.4, 8.6], [0.5, 3], [22.5, 3.5], [22.5, 9], [0.6, 19.5], [21.5, 19.3], [9, 13.5], [12.6, 15]]);
  b.props('bench', [[9.4, 7], [12.6, 7], [5.5, 11.6], [17, 11.6]]);
  b.props('lamp', [[9.8, 6], [12.2, 9], [3, 11.3], [20, 11.3], [7.8, 17], [6, 20.2], [16, 20.2]]);
  b.props('motor', [[2, 19.4], [2.8, 19.4], [3.6, 19.4], [4.4, 19.4], [5.2, 19.4]]);
  b.props('bin', [[11.8, 13], [13.2, 17.3]]);
  b.props('bush', [[0.5, 12.6], [22.6, 12.6], [8.5, 16], [21.5, 16]]);
  b.poi([11, 3], [4, 11], [18, 11], [7, 15], [16, 17], [10, 15], [11, 19], [14, 11]);
  b.cart({ x: 12, y: 10, serveX: 12, serveY: 11, qdx: 1, qdy: 0, face: 'left' });

  // ---- Outskirts: more faculties and the campus mosque, dormitories, a sports hall and student shops.
  b.at(0, 0);
  lane(b, 0, 5, 36, 1, 'plaza');
  lane(b, 9, 6, 1, 3, 'plaza');
  lane(b, 24, 6, 1, 3, 'plaza');
  lane(b, 4, 6, 1, 20, 'plaza');
  lane(b, 30, 6, 1, 20, 'plaza');
  lane(b, 0, 17, 6, 1, 'plaza');
  lane(b, 30, 17, 6, 1, 'plaza');
  lane(b, 28, 23, 2, 1, 'path');
  building(b, { kind: 'school', x: 1, y: 1, w: 7, h: 4, wall: '#f4ecdc', roof: '#7b241c', face: 'left', height: 32, sign: 'FAK. HUKUM', accent: '#c98a32', floors: 2 });
  building(b, { kind: 'hall', x: 12, y: 1, w: 6, h: 4, wall: '#f4f1e6', roof: '#1e8449', face: 'left', height: 30, sign: 'MASJID KAMPUS', accent: '#c98a32' });
  building(b, { kind: 'school', x: 24, y: 1, w: 8, h: 4, wall: '#eef4f7', roof: '#1f618d', face: 'left', height: 36, sign: 'FAK. KEDOKTERAN', accent: '#b9473e', floors: 2 });
  building(b, { kind: 'school', x: 1, y: 7, w: 3, h: 5, wall: '#fdf2e9', roof: '#a04000', face: 'right', height: 30, sign: 'ASRAMA', accent: '#397a55', floors: 2 });
  building(b, { kind: 'school', x: 1, y: 19, w: 3, h: 5, wall: '#f5eef8', roof: '#6c3483', face: 'right', height: 30, sign: 'ASRAMA', accent: '#c98a32', floors: 2 });
  building(b, { kind: 'hall', x: 31, y: 7, w: 4, h: 5, wall: '#fef5e7', roof: '#c98a32', face: 'left', height: 28, sign: 'GOR', accent: '#6b4226' });
  lane(b, 31, 12, 3, 1, 'plaza');
  lane(b, 10, 0, 1, 5, 'plaza');
  lane(b, 22, 0, 1, 5, 'plaza');
  b.rect(31, 19, 4, 6, 'field');
  // Student strip south of the main road: shops on a back lane with short alleys to the sidewalk.
  lane(b, 0, 33, 36, 1);
  for (const x of [4, 12, 20, 28]) lane(b, x, 30, 1, 3);
  for (const x of [12, 28]) lane(b, x, 34, 1, 2);
  const strip: [string, string, string][] = [
    ['FOTOKOPI', '#fdf2d0', '#3498db'],
    ['WARNET', '#eaf2f8', '#2c3e50'],
    ['LAUNDRY', '#e8f8f5', '#16a085'],
    ['PADANG', '#fef5e7', '#c0392b'],
    ['PENYETAN', '#fdedec', '#e67e22'],
    ['BURJO', '#fef9e7', '#27ae60'],
    ['APOTEK', '#f4f6f6', '#1e8449'],
  ];
  [1, 5, 8, 13, 16, 21, 24].forEach((x, i) => {
    const [sign, wall, awning] = strip[i];
    building(b, { kind: 'shop', x, y: 30, w: 3, h: 3, wall, roof: '#6e2c00', roofStyle: 'flat', face: 'left', sign, awning, accent: '#fff', height: 24 });
  });
  houses(b, [[29, 30], [32, 30]], 'left', 6);
  b.props('tree', [[9.4, 0.6], [10.6, 2.5], [20, 0.6], [21.5, 2.6], [34.6, 1], [0.5, 13], [0.5, 15.5], [2.5, 25], [34.6, 14.5], [34.6, 25.4], [8, 34.6], [17, 34.6], [26, 34.6], [34.6, 34.6], [0.6, 34.5]]);
  b.props('bench', [[3.6, 13.6], [30.4, 21], [30.4, 23], [6, 5.6], [33, 5.6]]);
  b.props('bush', [[3.4, 15.5], [33, 15.6], [11, 4.6], [19.5, 4.4]]);
  b.props('lamp', [[2, 5.1], [9.9, 5.1], [21, 5.1], [33, 5.1], [4.9, 10], [4.9, 22], [30.1, 10], [30.1, 22], [10, 33.1], [26, 33.1]]);
  b.props('pole', [[31.2, 21.9], [34.8, 21.9]]);
  b.props('motor', [[6.4, 6.4], [7.2, 6.4], [27.6, 6.4], [28.4, 6.4]]);
  b.props('bin', [[4.4, 17.6], [30.6, 17.6]]);
  b.poi([15, 5], [28, 5], [4, 9], [4, 21], [33, 12], [30, 21], [10, 33], [22, 33]);
  b.autoCross();
  return b.build('#47703c');
}

/** Bus terminal: hall and ticket office, platform islands between parked buses. */
export function terminal(): GameMap {
  const b = neighbourhood('lawn');
  b.hRoad(19).vRoad(20, undefined, 18);
  b.rect(0, 4, 19, 2, 'plaza');
  b.rect(2, 7, 15, 8, 'parking');
  b.rect(1, 4, 1, 14, 'plaza').rect(17, 4, 1, 14, 'plaza');
  b.rect(1, 10, 17, 1, 'plaza').rect(1, 13, 17, 1, 'plaza');
  b.rect(0, 15, 19, 3, 'plaza');
  b.structure({ kind: 'hall', x: 2, y: 0, w: 12, h: 4, wall: '#efe3cc', roof: '#6b4226', face: 'left', height: 30, sign: 'TERMINAL KOTA', accent: '#c98a32' }).door(6, 4).door(10, 4);
  b.structure({ kind: 'shop', x: 15, y: 1, w: 3, h: 3, wall: '#fff8e9', roof: '#4e2f1b', face: 'left', roofStyle: 'flat', sign: 'LOKET', awning: '#c98a32', accent: '#fff8e9', height: 26 }).door(16, 4);
  b.structure({ kind: 'busstop', x: 3, y: 15, w: 3, h: 1, wall: '#95a5a6', roof: '#c98a32', face: 'left', height: 18 });
  b.structure({ kind: 'rival', x: 14, y: 16, w: 1, h: 1, wall: '#a04000', roof: '#f5e6c8', face: 'left', height: 12, sign: 'KOPI SACHET' });
  b.prop('bus', 6, 8.5, '#2e86de');
  b.prop('bus', 13, 8.5, '#c0392b');
  b.prop('bus', 5, 11.6, '#27ae60');
  b.prop('bus', 12.5, 11.6, '#e67e22');
  b.prop('bus', 8.5, 14.4, '#8e44ad');
  b.props('bench', [[7, 15.4], [6.6, 17.4], [16.4, 15.5]]);
  b.props('lamp', [[1.5, 6.6], [17.5, 6.6], [1.5, 14.6], [17.5, 14.6], [6, 17.8], [12, 17.8], [19.2, 8], [22.8, 12]]);
  b.props('tree', [[23.4, 2], [23.4, 6], [23.4, 10], [23.4, 14], [0.5, 1.5], [14.6, 0.4], [3, 23.4], [9, 23.4], [15, 23.4], [21, 23.4]]);
  b.props('bin', [[2.4, 16.6], [18.4, 16.6]]);
  b.props('crate', [[3.4, 5.6], [12.5, 5.6]]);
  b.poi([6, 4], [10, 4], [16, 4], [1, 9], [17, 12], [9, 15], [5, 17], [18, 17], [11, 10], [6, 13]);
  b.cart({ x: 9, y: 16, serveX: 9, serveY: 17, qdx: 1, qdy: 0, face: 'left' });

  // ---- Outskirts: the bus depot, an angkot & travel stand, a musala and a row of food stalls.
  b.at(0, 0);
  b.rect(6, 0, 18, 4, 'parking');
  lane(b, 0, 4, 25, 2, 'plaza');
  lane(b, 29, 4, 7, 20, 'plaza');
  lane(b, 0, 10, 6, 2, 'plaza');
  lane(b, 0, 21, 6, 3, 'plaza');
  lane(b, 4, 6, 2, 18, 'plaza');
  building(b, { kind: 'hall', x: 0, y: 0, w: 5, h: 4, wall: '#e8dcc4', roof: '#566573', face: 'left', height: 26, sign: 'BENGKEL BUS', accent: '#c98a32' });
  building(b, { kind: 'shop', x: 30, y: 0, w: 5, h: 4, wall: '#fff8e9', roof: '#4e2f1b', roofStyle: 'flat', face: 'left', sign: 'TRAVEL', awning: '#c98a32', accent: '#fff8e9', height: 26 });
  building(b, { kind: 'hall', x: 0, y: 13, w: 4, h: 4, wall: '#f4f1e6', roof: '#1e8449', face: 'right', height: 24, sign: 'MUSALA', accent: '#c98a32' });
  building(b, { kind: 'warung', x: 1, y: 7, w: 3, h: 2, wall: '#fdebd0', roof: '#2e86de', face: 'right', sign: 'TOILET', height: 18 });
  for (const y of [8, 13, 18]) b.structure({ kind: 'busstop', x: 31, y, w: 3, h: 1, wall: '#95a5a6', roof: '#c98a32', face: 'left', height: 18 });
  b.prop('bus', 9, 1.6, '#16a085');
  b.prop('bus', 15, 1.6, '#c0392b');
  b.prop('bus', 21, 1.6, '#2e86de');
  b.props('car', [[32.5, 10.4], [32.5, 15.4], [32.5, 20.4]], '#27ae60');
  b.props('car', [[34.6, 10.4]], '#e67e22');
  // Food stalls on a back lane south of the main road, reached through short alleys.
  lane(b, 0, 33, 36, 1);
  for (const x of [4, 12, 18, 24, 31]) lane(b, x, 28, 1, 5);
  for (const x of [12, 24]) lane(b, x, 34, 1, 2);
  const food: [string, string, string][] = [
    ['SOTO', '#fff3dc', '#c0392b'],
    ['GUDEG', '#fdebd0', '#a04000'],
    ['PECEL', '#eafaf1', '#1e8449'],
    ['MIE', '#fef9e7', '#d35400'],
    ['NASI', '#fdedec', '#c0392b'],
    ['PULSA', '#eaf2f8', '#2e86de'],
    ['KOPI', '#f6ddcc', '#6e2c00'],
  ];
  [1, 8, 13, 19, 25, 28, 32].forEach((x, i) => {
    const [sign, wall, roof] = food[i];
    building(b, { kind: 'warung', x, y: 30, w: 3, h: 3, wall, roof, face: 'left', sign, awning: '#e7b65c', accent: '#fff8e9', height: 22 });
  });
  b.structure({ kind: 'pos', x: 5, y: 30, w: 2, h: 2, wall: '#c9a16b', roof: '#7a4a2a', face: 'left', height: 14, sign: 'OJEK' });
  b.props('motor', [[5.4, 32.6], [6.2, 32.6], [7, 32.6], [29.6, 6.6], [29.6, 7.4], [29.6, 8.2]]);
  b.props('tree', [[0.6, 18.6], [0.6, 28.6], [34.6, 28.6], [35, 30.5], [0.5, 29.5], [11, 34.6], [17, 34.6], [23, 34.6], [30, 34.6], [35, 34.6]]);
  b.props('bench', [[32, 9.4], [32, 14.4], [32, 19.4], [4.6, 22.6]]);
  b.props('lamp', [[3, 5.6], [12, 5.6], [20, 5.6], [33, 5.6], [5.6, 9], [5.6, 19], [29.4, 12], [29.4, 22], [8, 33.1], [28, 33.1]]);
  b.props('bin', [[24.6, 5.6], [29.4, 16.6], [10.6, 33.4]]);
  b.poi([2, 4], [32, 4], [4, 15], [32, 11], [32, 16], [12, 33], [27, 33]);
  b.autoCross();
  return b.build('#4b6b3d');
}

/** Town square: twin banyan trees on the lawn, pendopo to the north, food stalls to the south. */
export function alunalun(): GameMap {
  const b = neighbourhood('lawn');
  b.hRoad(3).hRoad(19);
  b.zebra(11, 3, 2, 2, 'v').zebra(11, 19, 2, 2, 'v').zebra(4, 19, 1, 2, 'v').zebra(19, 3, 1, 2, 'v');
  b.rect(0, 6, N, 12, 'plaza');
  b.rect(3, 8, 18, 8, 'lawn');
  b.rect(11, 8, 2, 8, 'plaza').rect(3, 11, 18, 2, 'plaza');
  b.rect(0, 22, N, 2, 'market');
  b.structure({ kind: 'pendopo', x: 8, y: 0, w: 8, h: 2, wall: '#d9c9a8', roof: '#6b4226', face: 'left', height: 22, sign: 'PENDOPO AGUNG' });
  b.structure({ kind: 'shop', x: 1, y: 0, w: 5, h: 2, wall: '#f5ead6', roof: '#8c3b2e', face: 'left', roofStyle: 'gable', sign: 'MUSEUM', awning: '#6b4226', accent: '#f5e6c8', height: 26 });
  b.structure({ kind: 'shop', x: 18, y: 0, w: 5, h: 2, wall: '#fff3dc', roof: '#b9473e', face: 'left', roofStyle: 'gable', sign: 'KANTOR POS', awning: '#c98a32', accent: '#fff8e9', height: 26 });
  const stalls = ['#c98a32', '#b9473e', '#397a55', '#e7b65c', '#2e86de', '#8e44ad', '#d35400'];
  [1, 4, 7, 13, 16, 19].forEach((x, i) => b.structure({ kind: 'stall', x, y: 22, w: 2, h: 2, wall: '#8b5a2b', roof: stalls[i % stalls.length], accent: '#fff8e9', face: 'left', height: 14 }));
  b.structure({ kind: 'rival', x: 4, y: 16, w: 1, h: 1, wall: '#7b2d26', roof: '#f5e6c8', face: 'left', height: 12, sign: 'WEDANG RONDE' });
  b.structure({ kind: 'rival', x: 19, y: 7, w: 1, h: 1, wall: '#d35400', roof: '#2c3e50', face: 'left', height: 12, sign: 'KERAK TELOR' });
  b.prop('banyan', 7, 9.6);
  b.prop('banyan', 17, 9.6);
  b.props('tree', [[5, 14.6], [9, 14.6], [15, 14.6], [19, 14.6]]);
  b.props('flowers', [[4, 8.6], [20, 8.6], [4, 15.4], [20, 15.4]]);
  b.props('lamp', [[2, 6.3], [8, 6.3], [16, 6.3], [22, 6.3], [2, 17.7], [8, 17.7], [16, 17.7], [22, 17.7], [10.8, 12], [13.2, 12]]);
  b.props('bench', [[6, 7.4], [18, 16.6], [10, 16.6], [14, 7.4]]);
  b.props('umbrella', [[10.5, 22.6], [22.5, 22.6]]);
  b.prop('flag', 12, 7.3);
  b.poi([11, 6], [12, 17], [3, 11], [20, 12], [9, 2], [11, 21], [17, 21], [5, 21], [12, 10], [8, 16]);
  b.cart({ x: 14, y: 15, serveX: 14, serveY: 16, qdx: 1, qdy: 0, face: 'left' });

  // ---- Outskirts: roads now ring the whole square; the great mosque, regency office and shophouses face it.
  b.at(0, 0);
  b.vRoad(2).vRoad(32);
  lane(b, 5, 4, 26, 2, 'plaza');
  lane(b, 12, 6, 2, 2, 'plaza');
  lane(b, 22, 6, 2, 2, 'plaza');
  lane(b, 5, 12, 1, 12, 'plaza');
  lane(b, 30, 12, 1, 12, 'plaza');
  lane(b, 5, 28, 1, 2, 'market');
  lane(b, 30, 28, 1, 2, 'market');
  lane(b, 5, 30, 26, 1, 'plaza');
  lane(b, 5, 33, 26, 1, 'plaza');
  building(b, { kind: 'shop', x: 5, y: 0, w: 5, h: 4, wall: '#f5ead6', roof: '#7d6608', roofStyle: 'flat', face: 'left', sign: 'BANK', awning: '#b7950b', accent: '#fff', height: 32 });
  building(b, { kind: 'hall', x: 12, y: 0, w: 9, h: 4, wall: '#f4f1e6', roof: '#1e8449', face: 'left', height: 34, sign: 'MASJID AGUNG', accent: '#c98a32' });
  building(b, { kind: 'office', x: 23, y: 0, w: 7, h: 4, wall: '#f5ead6', roof: '#6b4226', face: 'left', height: 40, floors: 2, sign: 'KANTOR BUPATI' });
  const fronts: [string, string, string][] = [
    ['BATIK', '#fdf2e9', '#a04000'],
    ['OLEH-OLEH', '#fef9e7', '#c98a32'],
    ['APOTEK', '#f4f6f6', '#1e8449'],
    ['ROTI', '#fdedec', '#c0392b'],
    ['JAMU', '#eafaf1', '#27ae60'],
    ['EMAS', '#f9e79f', '#b7950b'],
  ];
  [6, 10, 14, 19, 23, 27].forEach((x, i) => {
    const [sign, wall, awning] = fronts[i];
    building(b, { kind: 'shop', x, y: 31, w: 3, h: 2, wall, roof: '#6e2c00', roofStyle: 'flat', face: 'left', sign, awning, accent: '#fff', height: 24 });
  });
  for (const y of [2, 6, 13.5, 17.5, 21.5, 29.5, 33.5]) b.props('tree', [[0.5, y], [35.4, y]]);
  b.props('flag', [[16.5, 4.6], [5.6, 12.5], [30.4, 12.5]]);
  b.props('lamp', [[5.6, 18], [30.4, 18], [9, 5.6], [27, 5.6], [9, 33.4], [27, 33.4], [18, 30.2]]);
  b.props('bench', [[5.6, 15], [5.6, 21], [30.4, 15], [30.4, 21]]);
  b.props('flowers', [[10.6, 1], [21.5, 1], [10.6, 3.4], [21.6, 3.4]]);
  b.props('umbrella', [[17.5, 31.5], [31, 33.6]]);
  b.props('motor', [[13, 34.4], [13.8, 34.4], [14.6, 34.4], [22, 34.4], [22.8, 34.4]]);
  b.poi([16, 5], [26, 5], [7, 5], [5, 18], [30, 18], [12, 33], [25, 33]);
  b.autoCross();
  return b.build('#466c3a');
}

/** Office park: tower row along the boulevard, office forecourt, food court and car park. */
export function perkantoran(): GameMap {
  const b = neighbourhood('lawn');
  b.hRoad(5).vRoad(11, 7);
  b.rect(7, 8, 3, 16, 'plaza');
  b.rect(14, 12, 10, 3, 'plaza').rect(14, 8, 1, 16, 'plaza').rect(15, 15, 9, 1, 'plaza');
  b.rect(15, 16, 8, 7, 'parking');
  b.structure({ kind: 'office', x: 0, y: 0, w: 5, h: 4, wall: '#cfd8dc', roof: '#455a64', face: 'left', roofStyle: 'flat', height: 102, floors: 8, sign: 'MENARA NUSA' }).door(2, 4);
  b.structure({ kind: 'office', x: 6, y: 0, w: 4, h: 4, wall: '#e8dcc4', roof: '#6b4226', face: 'left', roofStyle: 'flat', height: 82, floors: 6 }).door(8, 4);
  b.structure({ kind: 'office', x: 13, y: 0, w: 6, h: 4, wall: '#7fa7c2', roof: '#2c3e50', face: 'left', roofStyle: 'flat', height: 118, floors: 9, sign: 'GRAHA SENTOSA' }).door(16, 4);
  b.structure({ kind: 'office', x: 20, y: 0, w: 4, h: 4, wall: '#d7ccc8', roof: '#5d4037', face: 'left', roofStyle: 'flat', height: 74, floors: 5 }).door(21, 4);
  b.structure({ kind: 'office', x: 1, y: 9, w: 6, h: 5, wall: '#eceff1', roof: '#37474f', face: 'right', roofStyle: 'flat', height: 64, floors: 5, sign: 'KANTOR PUSAT' }).door(7, 11);
  b.structure({ kind: 'office', x: 1, y: 16, w: 6, h: 6, wall: '#f5ead6', roof: '#6b4226', face: 'right', roofStyle: 'flat', height: 52, floors: 4, sign: 'BANK' }).door(7, 18);
  b.structure({ kind: 'hall', x: 15, y: 8, w: 8, h: 4, wall: '#fff3dc', roof: '#c98a32', face: 'left', height: 24, sign: 'FOOD COURT', accent: '#6b4226' }).door(18, 12).door(21, 12);
  b.structure({ kind: 'rival', x: 22, y: 14, w: 1, h: 1, wall: '#3e2723', roof: '#f5e6c8', face: 'left', height: 12, sign: 'KOPI' });
  b.props('planter', [[8.5, 9], [8.5, 13], [8.5, 17], [8.5, 21], [14.5, 9.5]]);
  b.props('car', [[16.5, 17.5], [18.5, 17.5], [20.5, 17.5], [16.5, 20.5], [20.5, 20.5]], '#7f8c8d');
  b.props('car', [[18.5, 20.5], [22, 17.5]], '#c0392b');
  b.props('lamp', [[2, 4.2], [12, 4.2], [20, 4.2], [10.2, 10], [10.2, 16], [10.2, 22], [13.8, 10], [13.8, 20]]);
  b.props('tree', [[23.5, 12.5], [0.5, 22.6], [6.5, 22.6], [23.5, 22.6]]);
  b.props('bench', [[15.4, 12.4], [21.5, 13.4]]);
  b.props('bin', [[9.5, 15], [23.5, 15.4]]);
  b.poi([2, 4], [8, 4], [16, 4], [21, 4], [7, 11], [7, 18], [18, 12], [21, 12], [15, 15], [9, 20]);
  b.cart({ x: 17, y: 13, serveX: 17, serveY: 14, qdx: 1, qdy: 0, face: 'left' });

  // ---- Outskirts: a second avenue, a parking garage, mosque, co-working and hotel towers and a corporate garden.
  b.at(0, 0);
  b.hRoad(1);
  lane(b, 0, 4, 36, 2, 'plaza');
  lane(b, 4, 4, 2, 32, 'plaza');
  b.zebra(4, 11, 2, 2, 'v').zebra(4, 1, 2, 2, 'v').zebra(30, 1, 1, 2, 'v');
  lane(b, 30, 6, 1, 4, 'plaza');
  lane(b, 30, 9, 6, 1, 'plaza');
  lane(b, 30, 14, 6, 16, 'plaza');
  lane(b, 0, 30, 36, 1, 'plaza');
  building(b, { kind: 'office', x: 0, y: 14, w: 4, h: 6, wall: '#bfc9ca', roof: '#566573', roofStyle: 'flat', face: 'right', height: 46, floors: 4, sign: 'PARKIR' });
  building(b, { kind: 'hall', x: 0, y: 22, w: 4, h: 4, wall: '#f4f1e6', roof: '#1e8449', face: 'right', height: 26, sign: 'MASJID', accent: '#c98a32' });
  building(b, { kind: 'warung', x: 0, y: 27, w: 4, h: 2, wall: '#fff3dc', roof: '#c98a32', face: 'right', sign: 'KANTIN', awning: '#b9473e', accent: '#fff8e9', height: 20 });
  building(b, { kind: 'office', x: 31, y: 5, w: 4, h: 4, wall: '#e8f6f3', roof: '#117a65', roofStyle: 'flat', face: 'left', height: 66, floors: 5, sign: 'CO-WORKING' });
  building(b, { kind: 'shop', x: 31, y: 14, w: 4, h: 3, wall: '#fef9e7', roof: '#b9473e', roofStyle: 'flat', face: 'left', sign: 'MINIMARKET', awning: '#e74c3c', accent: '#fff', height: 28 });
  building(b, { kind: 'office', x: 31, y: 21, w: 4, h: 6, wall: '#d6eaf8', roof: '#1b4f72', roofStyle: 'flat', face: 'left', height: 104, floors: 8, sign: 'HOTEL BISNIS' });
  building(b, { kind: 'office', x: 25, y: 31, w: 5, h: 4, wall: '#f5ead6', roof: '#6b4226', roofStyle: 'flat', face: 'right', height: 56, floors: 4, sign: 'BURSA' });
  lane(b, 30, 31, 1, 5, 'plaza');
  b.structure({ kind: 'fountain', x: 8, y: 31, w: 3, h: 3, wall: '#e5e7e9', roof: '#5dade2', face: 'left', height: 10 });
  b.structure({ kind: 'busstop', x: 9, y: 5, w: 2, h: 1, wall: '#95a5a6', roof: '#2e86de', face: 'left', height: 18 });
  b.structure({ kind: 'busstop', x: 26, y: 5, w: 2, h: 1, wall: '#95a5a6', roof: '#2e86de', face: 'left', height: 18 });
  b.props('planter', [[2, 5.5], [14, 5.5], [21, 5.5], [29.6, 5.5], [5, 4.4], [24, 4.4], [5.5, 21], [30.6, 19], [12.5, 30.5], [22.5, 30.5], [7, 34.6], [12, 34.6]]);
  b.props('tree', [[14.5, 32.6], [21, 32.6], [21.6, 34.6], [1.5, 33.6], [2.5, 31.6], [34.6, 32.5], [0.5, 20.6], [34.6, 18.6]]);
  b.props('bench', [[7.4, 32.5], [11.6, 32.5], [23.4, 33.5]]);
  b.props('lamp', [[6, 4.1], [18, 4.1], [30, 4.1], [5.9, 17], [5.9, 27], [30.1, 17], [30.1, 25], [10, 30.2], [20, 30.2]]);
  b.props('car', [[2, 21.3], [3.4, 29.6]], '#7f8c8d');
  b.props('bin', [[5.6, 13.6], [30.4, 9.6], [24.6, 30.6]]);
  b.poi([33, 9], [33, 17], [33, 27], [4, 17], [4, 24], [30, 33], [12, 30]);
  b.autoCross();
  return b.build('#4f6448');
}

/** Beach: diagonal shoreline with sea, sand, a wooden boardwalk and dunes with palms. */
export function pantai(): GameMap {
  const b = neighbourhood('grass');
  // Coastal road and the shoreline run across the whole world (absolute coordinates).
  b.at(0, 0);
  b.hRoad(7, undefined, undefined, { top: true });
  b.zebra(10, 7, 1, 2, 'v').zebra(20, 7, 1, 2, 'v').zebra(28, 7, 1, 2, 'v').zebra(4, 7, 1, 2, 'v').zebra(33, 7, 1, 2, 'v');
  for (let y = 10; y < 36; y++)
    for (let x = 0; x < 36; x++) {
      const d = x + y;
      if (d >= 46) b.set(x, y, 'water');
      else if (d >= 41) b.set(x, y, 'beach');
      else if (d >= 39) b.set(x, y, 'deck');
      else if (d === 38) b.set(x, y, 'sand');
    }

  // ---- The original beach block (local coordinates).
  b.at(6, 6);
  // Access paths from the road down to the boardwalk.
  for (let y = 4; y < N && 4 + y <= 26; y++) b.set(4, y, 'path');
  for (let y = 4; 14 + y <= 26; y++) b.set(14, y, 'path');
  b.set(22, 4, 'path');
  b.rect(5, 8, 9, 1, 'path').rect(5, 13, 9, 1, 'path');
  b.set(13, 13, 'path');
  b.rect(15, 4, 4, 3, 'parking');
  b.structure({ kind: 'office', x: 0, y: 5, w: 4, h: 4, wall: '#fdf2e0', roof: '#c98a32', face: 'right', roofStyle: 'flat', height: 44, floors: 3, sign: 'HOTEL CAMAR' }).door(4, 7);
  b.structure({ kind: 'warung', x: 6, y: 5, w: 4, h: 3, wall: '#fff3dc', roof: '#2e86de', face: 'left', sign: 'SEAFOOD', awning: '#2e86de', accent: '#fff8e9', height: 22 }).door(7, 8);
  b.structure({ kind: 'shop', x: 6, y: 10, w: 3, h: 3, wall: '#fef9e7', roof: '#b9473e', face: 'left', roofStyle: 'gable', sign: 'OLEH-OLEH', awning: '#e7b65c', accent: '#fff8e9', height: 22 }).door(7, 13);
  b.structure({ kind: 'shop', x: 10, y: 10, w: 3, h: 3, wall: '#e8f6f3', roof: '#16a085', face: 'left', roofStyle: 'gable', sign: 'SEWA BAN', awning: '#16a085', accent: '#fff8e9', height: 22 }).door(11, 13);
  b.structure({ kind: 'warung', x: 14, y: 16, w: 2, h: 2, wall: '#f5e6c8', roof: '#c98a32', face: 'left', sign: 'KELAPA', height: 18 });
  b.structure({ kind: 'lifeguard', x: 19, y: 12, w: 1, h: 1, wall: '#b9473e', roof: '#c98a32', face: 'left', height: 28 });
  b.structure({ kind: 'rival', x: 9, y: 21, w: 1, h: 1, wall: '#16a085', roof: '#f1c40f', face: 'left', height: 12, sign: 'ES KELAPA' });
  b.props('umbrella', [[17.5, 14.5], [12.5, 19.5], [20.5, 10.5], [8.5, 23.2], [13.5, 18.5]]);
  b.props('beachChair', [[18, 15.2], [13, 20.2], [21, 11.2], [16.4, 17.4]], '#e74c3c');
  b.props('beachChair', [[18.8, 14.4], [21.8, 10.4]], '#2e86de');
  b.props('car', [[16, 5.5], [18, 5.5]], '#ecf0f1');
  b.props('lamp', [[3.8, 10], [3.8, 18], [13.8, 6], [13.8, 11]]);
  b.props('tree', [[1, 11], [2.5, 14], [1, 17], [10.5, 6.6], [12.6, 9.4]]);
  b.props('flowers', [[5.5, 15.5], [9.5, 15], [11, 9.4]]);
  b.poi([4, 7], [7, 8], [7, 13], [11, 13], [15, 18], [18, 14], [12, 17], [22, 6], [8, 20], [16, 11]);
  b.cart({ x: 11, y: 15, serveX: 12, serveY: 15, qdx: 0.7, qdy: -0.7, face: 'right' });

  // ---- Outskirts: resorts along the coast road, a fishing village, a pier into the sea.
  b.at(0, 0);
  building(b, { kind: 'office', x: 0, y: 2, w: 5, h: 4, wall: '#fdf2e0', roof: '#2e86de', roofStyle: 'flat', face: 'left', height: 52, floors: 3, sign: 'RESORT' });
  building(b, { kind: 'shop', x: 7, y: 3, w: 3, h: 3, wall: '#e8f8f5', roof: '#16a085', roofStyle: 'flat', face: 'left', sign: 'SURF', awning: '#1abc9c', accent: '#fff', height: 24 });
  building(b, { kind: 'office', x: 13, y: 2, w: 6, h: 4, wall: '#fef9e7', roof: '#c98a32', roofStyle: 'flat', face: 'left', height: 40, floors: 3, sign: 'PENGINAPAN' });
  building(b, { kind: 'warung', x: 21, y: 3, w: 3, h: 3, wall: '#fff3dc', roof: '#b9473e', face: 'left', sign: 'SATE', awning: '#e7b65c', accent: '#fff8e9', height: 22 });
  houses(b, [[25, 3]], 'left', 2);
  building(b, { kind: 'office', x: 30, y: 1, w: 5, h: 5, wall: '#fdfefe', roof: '#1f618d', roofStyle: 'flat', face: 'left', height: 70, floors: 5, sign: 'HOTEL LAUT' });
  lane(b, 6, 0, 1, 6);
  lane(b, 28, 0, 1, 6);
  // Fishing village west of the hotel, on a lane down to the boardwalk.
  lane(b, 4, 10, 1, 25);
  houses(b, [[1, 11], [1, 15], [1, 19], [1, 23], [1, 27]], 'right', 1);
  // Wooden pier out into the sea with a pavilion at its end.
  b.rect(27, 12, 9, 1, 'deck');
  b.structure({ kind: 'gazebo', x: 33, y: 13, w: 2, h: 2, wall: '#f5e6c8', roof: '#c98a32', face: 'left', height: 18 });
  // Dune palms on the sand line (skipping the access paths and the cart's corner).
  for (let x = 1; x < 36; x += 2) {
    const y = 38 - x;
    if (y < 10 || y > 35 || b.map.tile(x, y)?.type !== 'sand' || (x === 17 && y === 21)) continue;
    b.prop('palm', x + 0.5, y + 0.4);
  }
  b.props('umbrella', [[31.5, 11.4], [30.5, 14.5], [27.5, 16.5], [24.5, 20.4], [20.5, 25.4], [16.5, 28.4], [14.5, 31.4]]);
  b.props('beachChair', [[31, 13.3], [28, 17.4], [20, 25.3], [16, 29.3]], '#e74c3c');
  b.props('beachChair', [[24, 21.3], [13, 32.3]], '#2e86de');
  b.props('rock', [[33.5, 20.5], [26, 28], [20, 33.5], [35, 25]]);
  b.props('car', [[8, 0.6], [11, 0.6]], '#c0392b');
  b.props('car', [[24, 0.7]], '#ecf0f1');
  b.props('tree', [[5.6, 1], [11.5, 2.2], [19.6, 1], [29.5, 0.5], [3.6, 31], [2, 33.6], [0.5, 10.4]]);
  b.props('lamp', [[5.1, 15], [5.1, 25], [6, 6.1], [24, 6.1], [32, 6.1], [29, 12.1]]);
  b.props('bench', [[30, 12.6], [5, 33.4]]);
  b.poi([2, 6], [16, 6], [32, 6], [4, 20], [31, 12], [4, 33]);
  b.autoCross();
  return b.build('#3f8fd2');
}
