import type { GameMap } from '../world/Map';
import { MapBuilder } from '../world/MapBuilder';

// Five additional neighbourhoods. Each has a distinct composition: a campus
// quad, a bus terminal, a town square, an office park and a diagonal beach.

const N = 24;

/** Campus: faculty buildings around a green quad, one main road at the gate. */
export function kampus(): GameMap {
  const b = new MapBuilder(N, N, 'lawn');
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
  b.autoCross();
  return b.build('#47703c');
}

/** Bus terminal: hall and ticket office, platform islands between parked buses. */
export function terminal(): GameMap {
  const b = new MapBuilder(N, N, 'lawn');
  b.hRoad(19).vRoad(20, 0, 18);
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
  b.autoCross();
  return b.build('#4b6b3d');
}

/** Town square: twin banyan trees on the lawn, pendopo to the north, food stalls to the south. */
export function alunalun(): GameMap {
  const b = new MapBuilder(N, N, 'lawn');
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
  b.autoCross();
  return b.build('#466c3a');
}

/** Office park: tower row along the boulevard, office forecourt, food court and car park. */
export function perkantoran(): GameMap {
  const b = new MapBuilder(N, N, 'lawn');
  b.hRoad(5).vRoad(11, 7, 23);
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
  b.autoCross();
  return b.build('#4f6448');
}

/** Beach: diagonal shoreline with sea, sand, a wooden boardwalk and dunes with palms. */
export function pantai(): GameMap {
  const b = new MapBuilder(N, N, 'grass');
  b.hRoad(1, 0, N - 1, { top: true });
  b.zebra(4, 1, 1, 2, 'v').zebra(14, 1, 1, 2, 'v').zebra(22, 1, 1, 2, 'v');
  for (let y = 4; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = x + y;
      if (d >= 34) b.set(x, y, 'water');
      else if (d >= 29) b.set(x, y, 'beach');
      else if (d >= 27) b.set(x, y, 'deck');
      else if (d === 26) b.set(x, y, 'sand');
    }
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
  // Dune palms (skip the access paths)
  for (let x = 3; x <= 22; x += 2) {
    const y = 26 - x;
    if (y < 4 || y >= N || b.map.tile(x, y)?.type !== 'sand' || (x === 11 && y === 15)) continue;
    b.prop('palm', x + 0.5, y + 0.4);
  }
  b.props('umbrella', [[17.5, 14.5], [12.5, 19.5], [20.5, 10.5], [8.5, 23.2], [13.5, 18.5]]);
  b.props('beachChair', [[18, 15.2], [13, 20.2], [21, 11.2], [16.4, 17.4]], '#e74c3c');
  b.props('beachChair', [[18.8, 14.4], [21.8, 10.4]], '#2e86de');
  b.props('car', [[16, 5.5], [18, 5.5]], '#ecf0f1');
  b.props('lamp', [[3.8, 10], [3.8, 18], [13.8, 6], [13.8, 11]]);
  b.props('tree', [[1, 11], [2.5, 14], [1, 17], [10.5, 6.6], [12.6, 9.4]]);
  b.props('flowers', [[5.5, 15.5], [9.5, 15], [11, 9.4]]);
  b.poi([4, 7], [7, 8], [7, 13], [11, 13], [15, 18], [18, 14], [12, 17], [22, 6], [8, 20], [16, 11]);
  b.cart({ x: 11, y: 15, serveX: 12, serveY: 15, qdx: 0.7, qdy: -0.7, face: 'right' });
  b.autoCross();
  return b.build('#3f8fd2');
}
