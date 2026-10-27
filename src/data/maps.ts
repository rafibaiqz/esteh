import type { LocationId } from '../game/types';
import type { GameMap } from '../world/Map';
import { MapBuilder } from '../world/MapBuilder';
import { alunalun, kampus, pantai, perkantoran, terminal } from './mapsMore';

// Each neighbourhood is authored on a 24×24 tile grid. x grows towards the
// lower-right of the screen, y towards the lower-left. Only the faces on the
// +x ("right") and +y ("left") sides of a structure are visible.

const N = 24;

function asri(): GameMap {
  const b = new MapBuilder(N, N, 'grass');
  b.hRoad(11).vRoad(11);
  // Residential footpaths (gang).
  b.rect(0, 4, 10, 1, 'path').rect(0, 19, 10, 1, 'path').rect(14, 17, 10, 1, 'path');
  b.rect(16, 1, 6, 4, 'field');
  b.rect(14, 18, 10, 6, 'lawn').rect(15, 20, 3, 3, 'sand');
  b.rect(0, 20, 7, 4, 'lawn');
  // NW block
  b.house(1, 1, 3, 3, 'left', '#f3e3c3', '#c2553e').door(2, 4);
  b.house(5, 1, 3, 3, 'left', '#d9ecf2', '#3d6f9e', 'hip').door(6, 4);
  b.house(1, 7, 3, 3, 'left', '#f6d6d6', '#8e3b46').door(2, 10);
  b.house(5, 7, 3, 3, 'left', '#e9f0d0', '#5f7f3a', 'hip').door(6, 10);
  // NE block
  b.structure({ kind: 'pos', x: 14, y: 2, w: 2, h: 2, wall: '#c9a16b', roof: '#7a4a2a', face: 'right', height: 14, sign: 'POS' });
  b.house(15, 7, 3, 3, 'left', '#fff2c7', '#b5523b').door(16, 10);
  b.house(19, 7, 3, 3, 'left', '#d6e4f7', '#40517e', 'hip').door(20, 10);
  // SW block
  b.house(1, 16, 3, 3, 'left', '#e8d6f2', '#6b3d8e').door(2, 19);
  b.house(5, 16, 3, 3, 'left', '#f2e0c9', '#a0522d', 'hip').door(6, 19);
  b.house(7, 20, 3, 3, 'right', '#dff2df', '#2f6e4a').door(10, 21);
  // SE block
  b.house(14, 14, 3, 3, 'left', '#f9e6cf', '#c0392b').door(15, 17);
  b.structure({ kind: 'warung', x: 18, y: 14, w: 3, h: 3, wall: '#fbe8a6', roof: '#2e8b57', face: 'left', sign: 'WARUNG', awning: '#e74c3c', accent: '#fff', height: 22 }).door(19, 17);
  b.structure({ kind: 'playground', x: 15, y: 20, w: 2, h: 2, wall: '#e74c3c', roof: '#f1c40f', face: 'left', height: 18 });
  b.house(20, 19, 3, 3, 'left', '#eadbc8', '#7b4b2a');
  // Decorations
  b.props('tree', [[8.5, 2.5], [0.5, 5.6], [3.5, 5.5], [8.5, 5.6], [22.5, 2.5], [14.5, 5], [22.5, 14.5], [22.5, 16], [0.5, 21], [3.5, 21.5], [5.5, 22.7], [18.5, 21.5], [22.6, 23], [14.6, 22.6], [9, 23.2]]);
  b.props('bush', [[4.5, 3.6], [4.4, 9.6], [8.6, 9.5], [4.5, 18.5], [8.5, 18.6], [17.5, 16.6], [21.5, 16.5], [14.3, 9.5], [18.4, 9.4]]);
  b.props('flowers', [[1.5, 5.4], [6.5, 5.5], [1.5, 20.5], [16, 23], [21, 22.5]]);
  b.props('lamp', [[10.1, 3], [10.1, 8], [10.1, 18], [10.1, 22.5], [13.9, 3], [13.9, 8], [13.9, 15.5], [13.9, 21], [3, 10.1], [20, 10.1], [5, 13.9], [20, 13.9]]);
  b.props('bench', [[18.5, 19], [14.6, 19.6]]);
  b.props('fenceX', [[0.5, 9.9], [4.5, 9.9], [8.5, 9.9], [9.5, 9.9], [14.5, 9.9], [18.5, 9.9], [22.5, 9.9], [23.5, 9.9]]);
  b.props('hydrant', [[13.2, 8.7]]);
  b.props('motor', [[4.3, 2.5], [22.5, 8.5]]);
  b.prop('pole', 9.5, 16.5);
  b.poi([19, 17], [15, 17], [2, 4], [6, 19], [10, 16], [13, 12]);
  b.cart({ x: 9, y: 14, serveX: 10, serveY: 14, qdx: 0, qdy: 1, face: 'right' });
  b.autoCross();
  return b.build('#3e7a37');
}

function sekolah(): GameMap {
  const b = new MapBuilder(N, N, 'lawn');
  b.hRoad(14).vRoad(4, 16, 23);
  b.rect(1, 7, 22, 6, 'field');
  b.rect(8, 7, 2, 6, 'plaza').rect(18, 8, 2, 5, 'plaza').rect(3, 11, 17, 1, 'plaza');
  b.rect(7, 20, 17, 1, 'path');
  b.zebra(8, 14, 2, 2, 'v');
  b.structure({ kind: 'school', x: 2, y: 2, w: 13, h: 5, wall: '#f4efe1', roof: '#c0392b', face: 'left', height: 34, sign: 'SD TUNAS BANGSA', accent: '#2e86de', floors: 2 }).door(8, 7).door(9, 7);
  b.structure({ kind: 'school', x: 16, y: 3, w: 6, h: 5, wall: '#eaf2f8', roof: '#1f618d', face: 'left', height: 38, sign: 'SMP', accent: '#27ae60', floors: 2 }).door(18, 8);
  b.structure({ kind: 'rival', x: 21, y: 12, w: 1, h: 1, wall: '#f39c12', roof: '#e74c3c', face: 'left', height: 12, sign: 'ES CENDOL' });
  // South side
  b.structure({ kind: 'shop', x: 8, y: 17, w: 3, h: 3, wall: '#fdf2d0', roof: '#7f8c8d', face: 'left', roofStyle: 'flat', sign: 'FOTOKOPI', awning: '#3498db', accent: '#fff', height: 26 }).door(9, 20);
  b.structure({ kind: 'warung', x: 12, y: 17, w: 3, h: 3, wall: '#fff3e0', roof: '#16a085', face: 'left', sign: 'JAJANAN', awning: '#f1c40f', accent: '#e67e22', height: 24 }).door(13, 20);
  b.house(16, 17, 3, 3, 'left', '#f5e1da', '#a93226').door(17, 20);
  b.house(20, 17, 3, 3, 'left', '#e1f5e8', '#1e8449', 'hip').door(21, 20);
  b.house(0, 17, 3, 3, 'right', '#f7f1c6', '#b9770e').door(3, 18);
  b.house(0, 21, 3, 3, 'right', '#dfe7f5', '#2c3e50', 'hip').door(3, 22);
  b.structure({ kind: 'busstop', x: 0, y: 12, w: 2, h: 1, wall: '#95a5a6', roof: '#2980b9', face: 'left', height: 18 });
  b.prop('flag', 6, 9.4);
  b.props('fenceX', [[1.5, 12.95], [2.5, 12.95], [3.5, 12.95], [4.5, 12.95], [5.5, 12.95], [6.5, 12.95], [7.5, 12.95], [10.5, 12.95], [12.5, 12.95], [13.5, 12.95], [14.5, 12.95], [15.5, 12.95], [16.5, 12.95], [17.5, 12.95], [20.5, 12.95], [22.5, 12.95]]);
  b.props('tree', [[0.6, 2], [0.6, 5], [22.6, 1.5], [15.4, 1], [12, 9], [15.5, 9.5], [22.5, 9], [10.5, 22.5], [14.5, 22.5], [18.5, 22.4], [22.6, 22.6], [7.4, 22.6]]);
  b.props('bush', [[2.5, 8.5], [5, 8.3], [11, 8.5], [14, 8.4], [21, 9.6], [11.5, 19.5], [15.5, 19.5], [19.5, 19.4]]);
  b.props('lamp', [[3, 13.2], [15, 13.2], [20, 13.2], [6, 16.8], [16, 16.8], [2.8, 20]]);
  b.props('motor', [[0.5, 9.5], [1.2, 9.8], [1.9, 10.1]]);
  b.props('bin', [[10.3, 12.4], [17.6, 12.3]]);
  b.poi([8, 12], [9, 11], [18, 12], [9, 20], [13, 20], [10, 13], [3, 16]);
  b.cart({ x: 11, y: 12, serveX: 11, serveY: 13, qdx: 1, qdy: 0, face: 'left' });
  b.autoCross();
  return b.build('#4a8a3f');
}

function taman(): GameMap {
  const b = new MapBuilder(N, N, 'lawn');
  b.hRoad(1, 0, N - 1, { top: true }).vRoad(1, 0, N - 1);
  // Jogging ring and cross paths.
  b.rect(4, 6, 17, 1, 'path').rect(4, 20, 17, 1, 'path').rect(6, 4, 1, 17, 'path').rect(20, 4, 1, 17, 'path');
  b.rect(4, 13, 20, 1, 'path').rect(13, 4, 1, 20, 'path');
  b.rect(6, 21, 1, 3, 'path').rect(20, 21, 1, 3, 'path').rect(21, 6, 3, 1, 'path').rect(21, 20, 3, 1, 'path');
  b.rect(11, 11, 5, 5, 'plaza');
  b.rect(15, 8, 4, 4, 'water').rect(21, 15, 3, 4, 'water');
  b.rect(8, 15, 4, 4, 'sand');
  b.paintOver(7, 7, 5, 5, 'garden', ['lawn']);
  b.rect(8, 8, 3, 3, 'lawn');
  b.structure({ kind: 'fountain', x: 12, y: 12, w: 3, h: 3, wall: '#bfc9ca', roof: '#5dade2', face: 'left', height: 10 });
  b.structure({ kind: 'playground', x: 9, y: 16, w: 2, h: 2, wall: '#e67e22', roof: '#3498db', face: 'left', height: 18 });
  b.structure({ kind: 'gazebo', x: 16, y: 16, w: 2, h: 2, wall: '#f5f5dc', roof: '#8e44ad', face: 'left', height: 20 });
  b.structure({ kind: 'rival', x: 21, y: 10, w: 1, h: 1, wall: '#27ae60', roof: '#f1c40f', face: 'left', height: 12, sign: 'ES KELAPA' });
  b.structure({ kind: 'warung', x: 4, y: 21, w: 2, h: 2, wall: '#fdebd0', roof: '#c0392b', face: 'right', sign: 'TOILET', height: 18 });
  b.props('pine', [[4.5, 4.5], [8, 4.4], [10.5, 4.5], [15.5, 4.6], [18, 4.4], [22.5, 4.5], [4.5, 8.5], [4.5, 11], [22.5, 7.5], [22.6, 11.5]]);
  b.props('tree', [[8.5, 9.5], [17.5, 14.6], [19, 15], [4.6, 16], [4.6, 18.5], [7.5, 22.5], [10.5, 22.4], [15.5, 22.6], [18.5, 22.4], [22.5, 21.5], [15.5, 18.5], [12, 18.6]]);
  b.props('bush', [[7.5, 12], [11.5, 7.5], [14.5, 7.5], [19.5, 7.5], [7.5, 14.5], [14.5, 19.5], [19.5, 19.4], [11.5, 19.5]]);
  b.props('flowers', [[10, 12], [19, 11], [12, 9.5], [16, 15.2], [10.6, 14.5], [16.5, 14.5]]);
  b.props('bench', [[7.4, 13.6], [16.5, 12.5], [19.5, 12.5], [14.4, 17], [6.6, 18], [19.5, 6.6], [10, 6.5]]);
  b.props('lamp', [[5.6, 6.6], [12.6, 6.4], [20.6, 13.6], [12.4, 19.6], [5.6, 19.6], [20.6, 19.6], [3.2, 13.4], [13.4, 3.3]]);
  b.props('bin', [[14.3, 6.5], [6.5, 14.3]]);
  b.props('rock', [[18.8, 12.4], [14.6, 9.2], [22, 14.6]]);
  b.poi([11, 13], [15, 15], [13, 11], [6, 17], [17, 20], [20, 10], [8, 13], [12, 15]);
  b.cart({ x: 9, y: 12, serveX: 9, serveY: 13, qdx: -1, qdy: 0, face: 'left' });
  b.autoCross();
  return b.build('#3d7a3a');
}

function kota(): GameMap {
  const b = new MapBuilder(N, N, 'lawn');
  b.hRoad(5).hRoad(16).vRoad(5).vRoad(16);
  b.rect(8, 8, 7, 7, 'plaza');
  b.paintOver(0, 0, N, N, 'plaza', ['lawn']);
  b.rect(0, 0, 3, 3, 'lawn').rect(19, 0, 5, 4, 'lawn').rect(0, 19, 4, 5, 'lawn').rect(19, 19, 5, 5, 'lawn');
  b.rect(19, 8, 5, 7, 'lawn').rect(0, 8, 4, 7, 'lawn').rect(8, 0, 7, 4, 'lawn').rect(8, 19, 7, 5, 'lawn');
  // Towers & shops
  b.structure({ kind: 'office', x: 0, y: 0, w: 3, h: 3, wall: '#8fb3c9', roof: '#5d6d7e', face: 'left', roofStyle: 'flat', height: 92, floors: 7 });
  b.structure({ kind: 'busstop', x: 3, y: 2, w: 1, h: 2, wall: '#95a5a6', roof: '#16a085', face: 'right', height: 18 });
  b.structure({ kind: 'office', x: 8, y: 0, w: 3, h: 4, wall: '#d5dbdb', roof: '#7f8c8d', face: 'left', roofStyle: 'flat', height: 72, floors: 5, sign: 'BANK' });
  b.structure({ kind: 'shop', x: 11, y: 1, w: 2, h: 3, wall: '#fae5d3', roof: '#6e2c00', face: 'left', roofStyle: 'flat', sign: 'ROTI', awning: '#d35400', accent: '#fff', height: 30 });
  b.structure({ kind: 'shop', x: 13, y: 1, w: 2, h: 3, wall: '#e8f8f5', roof: '#0e6655', face: 'left', roofStyle: 'flat', sign: 'KAFE', awning: '#148f77', accent: '#fff', height: 30 });
  b.structure({ kind: 'office', x: 19, y: 0, w: 5, h: 4, wall: '#5d8aa8', roof: '#34495e', face: 'left', roofStyle: 'flat', height: 110, floors: 8 });
  b.structure({ kind: 'shop', x: 0, y: 8, w: 4, h: 3, wall: '#fdfefe', roof: '#922b21', face: 'right', roofStyle: 'flat', sign: 'APOTEK', awning: '#27ae60', accent: '#fff', height: 32 });
  b.structure({ kind: 'shop', x: 0, y: 11, w: 4, h: 4, wall: '#f9e79f', roof: '#7d6608', face: 'right', roofStyle: 'flat', sign: 'TOKO EMAS', awning: '#b7950b', accent: '#fff', height: 36 });
  b.structure({ kind: 'office', x: 19, y: 8, w: 4, h: 6, wall: '#aab7b8', roof: '#566573', face: 'left', roofStyle: 'flat', height: 84, floors: 6, sign: 'HOTEL' });
  b.structure({ kind: 'shop', x: 0, y: 19, w: 4, h: 4, wall: '#f5cba7', roof: '#784212', face: 'right', roofStyle: 'flat', sign: 'RESTO', awning: '#c0392b', accent: '#fff', height: 30 });
  b.structure({ kind: 'office', x: 8, y: 19, w: 7, h: 4, wall: '#d6eaf8', roof: '#2e4053', face: 'left', roofStyle: 'flat', height: 52, floors: 3, sign: 'MALL SENTOSA' });
  b.structure({ kind: 'office', x: 19, y: 19, w: 4, h: 4, wall: '#a9cce3', roof: '#1b4f72', face: 'left', roofStyle: 'flat', height: 78, floors: 6 });
  b.structure({ kind: 'tower', x: 10, y: 10, w: 2, h: 2, wall: '#ecf0f1', roof: '#f1c40f', face: 'left', height: 64 });
  b.structure({ kind: 'rival', x: 14, y: 8, w: 1, h: 1, wall: '#8e44ad', roof: '#f5b7b1', face: 'left', height: 12, sign: 'BOBA' });
  b.structure({ kind: 'rival', x: 8, y: 9, w: 1, h: 1, wall: '#6e2c00', roof: '#ecf0f1', face: 'left', height: 12, sign: 'KOPI' });
  b.props('pot', [[8.5, 12.5], [9.5, 8.5], [13.5, 10.5], [8.5, 14.5]]);
  b.props('tree', [[23.5, 9], [23.5, 12.5], [20, 14.5], [22, 14.5], [9.5, 23.5], [13.5, 23.5], [1.5, 23.5], [21, 23.5], [12, 0.5]]);
  b.props('lamp', [[4.2, 9], [7.8, 11], [15.2, 2], [18.8, 11], [11, 7.8], [11, 15.2], [4.2, 21], [18.8, 21], [7.8, 2], [21, 7.8], [2, 18.8], [21, 18.8]]);
  b.props('bench', [[9.5, 13.6], [12.6, 9.3]]);
  b.props('hydrant', [[7.6, 7.6], [15.4, 15.4]]);
  b.props('bin', [[14.6, 12], [8.3, 11.5]]);
  b.poi([8, 13], [14, 10], [11, 18], [10, 15], [12, 8], [7, 12]);
  b.cart({ x: 11, y: 13, serveX: 11, serveY: 14, qdx: 1, qdy: 0, face: 'left' });
  b.autoCross();
  return b.build('#5b6b5a');
}

function pasar(): GameMap {
  const b = new MapBuilder(N, N, 'market');
  b.hRoad(20).vRoad(2, 0, 19);
  b.rect(5, 0, 8, 6, 'parking');
  b.rect(0, 23, N, 1, 'lawn');
  b.rect(0, 0, 1, 20, 'lawn');
  b.structure({ kind: 'hall', x: 14, y: 0, w: 9, h: 6, wall: '#f0e2c0', roof: '#8e4b2a', face: 'left', height: 34, sign: 'PASAR LEGI', accent: '#2e7d32' }).door(16, 6).door(20, 6);
  const canopies = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22', '#9b59b6', '#1abc9c'];
  let ci = 0;
  for (const y of [8, 12, 16]) {
    for (const x of [6, 9, 12, 16, 19]) {
      const c = canopies[ci++ % canopies.length];
      b.structure({ kind: 'stall', x, y, w: 2, h: 2, wall: '#a0522d', roof: c, accent: '#ffffff', face: 'left', height: 14 });
    }
  }
  b.structure({ kind: 'rival', x: 22, y: 10, w: 1, h: 1, wall: '#d35400', roof: '#27ae60', face: 'left', height: 12, sign: 'ES DAWET' });
  b.structure({ kind: 'rival', x: 5, y: 14, w: 1, h: 1, wall: '#6d4c41', roof: '#f39c12', face: 'left', height: 12, sign: 'KOPI' });
  b.props('car', [[6.5, 1.5], [8.5, 1.5], [10.5, 1.5]], '#2980b9');
  b.props('car', [[6.5, 4], [10.5, 4]], '#16a085');
  b.props('motor', [[5.5, 5.5], [6.3, 5.5], [7.1, 5.5], [7.9, 5.5], [8.7, 5.5], [9.5, 5.5], [11.5, 5.4], [12.3, 5.4]]);
  b.props('crate', [[8.3, 9.6], [11.3, 13.4], [14.6, 9.5], [18.4, 13.5], [21.3, 17.6], [5.6, 17.6], [14.5, 17.5]]);
  b.props('umbrella', [[22.5, 14], [5.5, 10.5]]);
  b.props('lamp', [[4.2, 3], [4.2, 9], [4.2, 15], [13, 18.8], [17, 18.8], [13.6, 6.4], [22.5, 6.6]]);
  b.props('tree', [[0.5, 3], [0.5, 9], [0.5, 15], [3, 23.4], [9, 23.5], [15, 23.4], [21, 23.5]]);
  b.props('bin', [[13.4, 7.4], [15.6, 15.5]]);
  b.poi([16, 6], [20, 6], [8, 11], [11, 15], [15, 11], [8, 18], [18, 11], [5, 18], [14, 18], [18, 15]);
  b.cart({ x: 14, y: 13, serveX: 15, serveY: 13, qdx: 0, qdy: 1, face: 'right' });
  b.autoCross();
  return b.build('#6b5b45');
}


function premium(): GameMap {
  const b = new MapBuilder(N, N, 'lawn');
  // Divided boulevard (two carriageways with a planted median) crossed by an avenue.
  b.hRoad(8).hRoad(12).vRoad(16);
  b.rect(0, 10, 15, 2, 'garden').rect(19, 10, 5, 2, 'garden');
  b.zebra(6, 8, 1, 2, 'v').rect(6, 10, 1, 2, 'plaza').zebra(6, 12, 1, 2, 'v');
  b.rect(0, 5, 15, 2, 'plaza').rect(19, 5, 5, 2, 'plaza');
  b.rect(0, 15, 15, 9, 'plaza').rect(19, 15, 5, 1, 'plaza').rect(19, 22, 5, 2, 'plaza');
  b.structure({ kind: 'office', x: 1, y: 0, w: 4, h: 5, wall: '#e8e1d5', roof: '#5d6d7e', face: 'left', roofStyle: 'flat', height: 122, floors: 9, sign: 'APARTEMEN' }).door(2, 5);
  b.structure({ kind: 'office', x: 6, y: 0, w: 5, h: 5, wall: '#f5efe2', roof: '#7b5e3b', face: 'left', roofStyle: 'flat', height: 96, floors: 7, sign: 'HOTEL MERAK' }).door(8, 5);
  b.structure({ kind: 'shop', x: 12, y: 2, w: 3, h: 3, wall: '#fdfbf7', roof: '#1c2833', face: 'left', roofStyle: 'flat', sign: 'BUTIK', awning: '#1c2833', accent: '#d4ac0d', height: 34 }).door(13, 5);
  b.structure({ kind: 'office', x: 19, y: 0, w: 5, h: 5, wall: '#6c8ea6', roof: '#2c3e50', face: 'left', roofStyle: 'flat', height: 112, floors: 8, sign: 'MENARA SAMUDRA' }).door(21, 5);
  b.structure({ kind: 'fountain', x: 2, y: 17, w: 3, h: 3, wall: '#e5e7e9', roof: '#5dade2', face: 'left', height: 10 });
  b.structure({ kind: 'shop', x: 1, y: 20, w: 3, h: 3, wall: '#f8f9f9', roof: '#4a235a', face: 'left', roofStyle: 'flat', sign: 'GALERI', awning: '#4a235a', accent: '#f5f5f5', height: 30 }).door(2, 23);
  b.structure({ kind: 'shop', x: 5, y: 20, w: 3, h: 3, wall: '#fef9e7', roof: '#7d6608', face: 'left', roofStyle: 'flat', sign: 'PARFUM', awning: '#b7950b', accent: '#fff', height: 30 }).door(6, 23);
  b.structure({ kind: 'shop', x: 9, y: 20, w: 3, h: 3, wall: '#fdedec', roof: '#943126', face: 'left', roofStyle: 'flat', sign: 'PATISERI', awning: '#cb4335', accent: '#fff', height: 30 }).door(10, 23);
  b.structure({ kind: 'rival', x: 13, y: 18, w: 1, h: 1, wall: '#4d3227', roof: '#f0e6d2', face: 'left', height: 12, sign: 'KOPI SENJA' });
  b.structure({ kind: 'office', x: 19, y: 16, w: 5, h: 6, wall: '#d6dbdf', roof: '#283747', face: 'left', roofStyle: 'flat', height: 62, floors: 3, sign: 'MALL CEMPAKA' }).door(21, 22);
  b.props('palm', [[1.5, 10.5], [4.2, 11], [8.6, 10.4], [11.5, 11.1], [14, 10.5], [20.4, 10.6], [22.6, 11]]);
  b.props('flowers', [[3, 10.6], [10.2, 11.2], [21.5, 10.4]]);
  b.props('umbrella', [[11.5, 18.5], [7.5, 17.6], [12.6, 21.5]]);
  b.props('pot', [[0.5, 15.5], [14.5, 15.5], [0.5, 6.5], [14.5, 6.5], [19.5, 6.6], [23.5, 15.5], [23.5, 6.6]]);
  b.props('bench', [[1.6, 16.3], [6.3, 18.6]]);
  b.props('lamp', [[2, 7.2], [10, 7.2], [21, 7.2], [3, 14.8], [11, 14.8], [21, 14.8], [15.2, 3], [18.8, 3], [15.2, 19], [18.8, 19]]);
  b.props('tree', [[23.5, 2], [17.5, 23.5], [0.4, 23.4]]);
  b.props('bin', [[8.5, 15.3], [14.6, 20]]);
  b.poi([2, 6], [8, 6], [13, 6], [21, 6], [6, 16], [12, 19], [6, 23], [21, 23], [10, 17], [6, 10]);
  b.cart({ x: 9, y: 15, serveX: 9, serveY: 16, qdx: 1, qdy: 0, face: 'left' });
  b.autoCross();
  return b.build('#4f5f4c');
}

const BUILDERS: Record<LocationId, () => GameMap> = { asri, sekolah, kampus, taman, terminal, kota, alunalun, perkantoran, pasar, pantai, premium };

export function buildMap(id: LocationId): GameMap {
  return BUILDERS[id]();
}
