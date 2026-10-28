import type { LocationId } from '../game/types';
import type { GameMap } from '../world/Map';
import { building, houses, lane, neighbourhood } from './mapKit';
import { alunalun, kampus, pantai, perkantoran, terminal } from './mapsMore';

// Every neighbourhood is a 36×36 world (see mapKit). The original 24×24 block
// around the cart is authored in its own local grid (`neighbourhood()` places
// it at (6,6)); the outskirts below each block use absolute coordinates.
// x grows towards the lower-right of the screen, y towards the lower-left.
// Only the faces on the +x ("right") and +y ("left") sides of a structure are
// visible, so doors open onto walkways south or east of a building.

const N = 24;

function asri(): GameMap {
  const b = neighbourhood('grass');
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

  // ---- Outskirts: a ring of gang lanes lined with more houses, a musala and the RW field.
  b.at(0, 0);
  lane(b, 0, 4, 36, 1);
  lane(b, 4, 4, 1, 28);
  lane(b, 33, 4, 1, 28);
  lane(b, 0, 31, 36, 1);
  b.zebra(17, 4, 2, 1, 'h').zebra(17, 31, 2, 1, 'h').zebra(4, 17, 1, 2, 'v').zebra(33, 17, 1, 2, 'v');
  // The old footpaths now continue to the new lanes.
  lane(b, 5, 10, 1, 1);
  lane(b, 5, 25, 1, 1);
  lane(b, 30, 23, 3, 1);
  houses(b, [[1, 1], [6, 1], [11, 1], [26, 1], [30, 1]], 'left', 1);
  building(b, { kind: 'hall', x: 20, y: 1, w: 5, h: 3, wall: '#f4f1e6', roof: '#2e7d4f', face: 'left', height: 24, sign: 'MUSALA', accent: '#c98a32' });
  houses(b, [[1, 6], [1, 10], [1, 13], [1, 20], [1, 24], [1, 27]], 'right', 4);
  houses(b, [[30, 6], [30, 10], [30, 13], [30, 20], [30, 24], [30, 27]], 'right', 7);
  b.rect(6, 32, 9, 3, 'field');
  b.structure({ kind: 'gazebo', x: 23, y: 32, w: 2, h: 2, wall: '#f5f5dc', roof: '#a0522d', face: 'left', height: 18 });
  b.props('bench', [[8, 31.8], [12, 31.8], [26, 32.6]]);
  b.prop('flag', 15.5, 33);
  b.props('tree', [[4.6, 0.6], [9.6, 0.5], [14.6, 1.5], [25.5, 0.4], [34.5, 1], [0.5, 5], [0.5, 9.4], [0.5, 23.4], [0.5, 30], [34.6, 6], [34.6, 12], [34.6, 22], [34.6, 28], [2, 33.5], [21, 33.4], [28.5, 33.5], [34.5, 34.5], [3, 34.6], [15.4, 34.6]]);
  b.props('bush', [[5.5, 3.5], [9.5, 3.6], [14.5, 3.5], [25.5, 3.5], [29.5, 3.4], [2.5, 9.5], [2.5, 23.4], [31.5, 9.5], [31.5, 30.3], [2.5, 30.3]]);
  b.props('flowers', [[7.5, 0.4], [12.5, 0.4], [31.5, 0.4], [2.5, 5.4], [31.5, 5.4], [27.5, 0.4]]);
  b.props('lamp', [[3.9, 9.5], [3.9, 23.5], [32.9, 9.5], [33.9, 26.5], [10, 3.9], [25.4, 3.9], [10, 31.1], [26, 31.1], [3.9, 30.2]]);
  b.props('motor', [[3.4, 9.2], [31.6, 9.2]]);
  b.props('fenceX', [[6.5, 30.95], [7.5, 30.95], [8.5, 30.95], [12.5, 30.95], [13.5, 30.95], [14.5, 30.95]]);
  b.poi([22, 4], [10, 31], [26, 31], [4, 12], [33, 22]);
  b.autoCross();
  return b.build('#3e7a37');
}

function sekolah(): GameMap {
  const b = neighbourhood('lawn');
  b.hRoad(14).vRoad(4, 16);
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
  b.props('fenceX', [[2.5, 12.95], [3.5, 12.95], [4.5, 12.95], [5.5, 12.95], [6.5, 12.95], [7.5, 12.95], [10.5, 12.95], [12.5, 12.95], [13.5, 12.95], [14.5, 12.95], [15.5, 12.95], [16.5, 12.95], [17.5, 12.95], [20.5, 12.95], [22.5, 12.95]]);
  b.props('tree', [[0.6, 2], [0.6, 5], [22.6, 1.5], [15.4, 1], [12, 9], [15.5, 9.5], [22.5, 9], [10.5, 22.5], [14.5, 22.5], [18.5, 22.4], [22.6, 22.6], [7.4, 22.6]]);
  b.props('bush', [[2.5, 8.5], [5, 8.3], [11, 8.5], [14, 8.4], [21, 9.6], [11.5, 19.5], [15.5, 19.5], [19.5, 19.4]]);
  b.props('lamp', [[3, 13.2], [15, 13.2], [20, 13.2], [6, 16.8], [16, 16.8], [2.8, 20]]);
  b.props('motor', [[0.5, 9.5], [1.2, 9.8], [1.9, 10.1]]);
  b.props('bin', [[10.3, 12.4], [17.6, 12.3]]);
  b.poi([8, 12], [9, 11], [18, 12], [9, 20], [13, 20], [10, 13], [3, 16]);
  b.cart({ x: 11, y: 12, serveX: 11, serveY: 13, qdx: 1, qdy: 0, face: 'left' });

  // ---- Outskirts: Jl. Pendidikan with student kiosks, a side street, the SMA and teachers' housing.
  b.at(0, 0);
  b.hRoad(3).vRoad(2);
  const kiosks: [string, string, string][] = [
    ['ATK', '#fdf2d0', '#2e86de'],
    ['FOTO', '#e8f8f5', '#16a085'],
    ['BAKSO', '#fff3e0', '#c0392b'],
    ['PULSA', '#fef9e7', '#f39c12'],
    ['LES', '#eaf2f8', '#8e44ad'],
    ['BUKU', '#fdedec', '#a0522d'],
    ['SEPATU', '#f4f6f6', '#34495e'],
    ['MIE', '#fff8e9', '#d35400'],
  ];
  [6, 9, 12, 15, 24, 27, 30, 33].forEach((x, i) => {
    const [sign, wall, awning] = kiosks[i];
    building(b, { kind: 'shop', x, y: 0, w: 2, h: 2, wall, roof: '#7f8c8d', roofStyle: 'flat', face: 'left', sign, awning, accent: '#fff', height: 20 });
  });
  b.rect(18, 0, 5, 2, 'garden');
  // SMA with a basketball court, reached by a lane from Jl. Pendidikan.
  lane(b, 30, 5, 1, 15);
  building(b, { kind: 'school', x: 31, y: 6, w: 4, h: 5, wall: '#fdf2e9', roof: '#7d6608', face: 'left', height: 34, sign: 'SMA', accent: '#c0392b', floors: 2 });
  lane(b, 30, 11, 4, 1);
  b.rect(31, 13, 4, 4, 'plaza');
  // Teachers' housing south of the school path.
  lane(b, 30, 26, 5, 1);
  lane(b, 34, 26, 1, 8);
  lane(b, 13, 33, 22, 1);
  houses(b, [[14, 30], [18, 30], [22, 30], [26, 30], [30, 30]], 'left', 2);
  houses(b, [[6, 31]], 'right', 6);
  b.prop('flag', 33, 12.5);
  b.props('pole', [[31.2, 14.8], [34.8, 14.8]]);
  b.props('tree', [[0.5, 6], [0.5, 12], [0.5, 25], [0.5, 31], [5.5, 9.5], [5.5, 14], [5.5, 26.5], [18.6, 0.5], [22, 1.2], [35.5, 0.6], [13.5, 34.6], [20, 34.6], [28, 34.6], [34.6, 34.6], [34.6, 24], [6.5, 34.5]]);
  b.props('bush', [[20, 1.5], [5.5, 30], [16, 29.6], [24, 29.6], [32.5, 18.6]]);
  b.props('lamp', [[8, 5.1], [20, 5.1], [28, 5.1], [4.9, 16], [4.9, 28], [30.1, 9], [30.1, 17], [17.5, 32.9], [29.5, 32.9]]);
  b.props('bench', [[31.4, 12.4], [34.5, 12.4]]);
  b.props('motor', [[29.4, 6.5], [29.4, 7.3], [29.4, 8.1]]);
  b.props('bin', [[23.6, 5.4], [12.6, 26.6]]);
  b.poi([33, 11], [32, 15], [20, 33], [8, 2], [25, 2]);
  b.autoCross();
  return b.build('#4a8a3f');
}

function taman(): GameMap {
  const b = neighbourhood('lawn');
  b.hRoad(1, undefined, undefined, { top: true }).vRoad(1);
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

  // ---- Outskirts: shops facing the park, a lake with a jogging lane, a stage and flower beds.
  b.at(0, 0);
  const fronts: [string, string, string, string][] = [
    ['KAFE', '#fbeee0', '#6e2c00', '#c0392b'],
    ['BUNGA', '#fdedec', '#943126', '#e84393'],
    ['SEPEDA', '#eaf2f8', '#1f618d', '#2e86de'],
    ['BUKU', '#fef9e7', '#7d6608', '#b7950b'],
    ['ES KRIM', '#e8f8f5', '#0e6655', '#1abc9c'],
  ];
  building(b, { kind: 'house', x: 1, y: 3, w: 4, h: 3, wall: '#f3e3c3', roof: '#a0522d', face: 'left', height: 26 });
  [11, 15, 19, 27, 31].forEach((x, i) => {
    const [sign, wall, roof, awning] = fronts[i];
    building(b, { kind: 'shop', x, y: 3, w: 3, h: 3, wall, roof, roofStyle: 'flat', face: 'left', sign, awning, accent: '#fff', height: 28 });
  });
  houses(b, [[23, 3]], 'left', 3);
  // West: houses and a mosque facing the park road.
  houses(b, [[3, 11], [3, 15], [3, 26], [3, 30]], 'right', 5);
  building(b, { kind: 'hall', x: 2, y: 20, w: 4, h: 5, wall: '#f4f1e6', roof: '#1e8449', face: 'right', height: 26, sign: 'MASJID', accent: '#c98a32' });
  // The park's paths reach a jogging lane around the new lake and gardens.
  lane(b, 33, 9, 1, 25);
  lane(b, 9, 33, 25, 1);
  for (const y of [12, 19, 26]) lane(b, 30, y, 3, 1);
  for (const x of [12, 19, 26]) lane(b, x, 30, 1, 3);
  b.rect(30, 20, 3, 5, 'water');
  b.rect(13, 30, 5, 3, 'garden').rect(20, 32, 5, 1, 'garden');
  b.structure({ kind: 'pendopo', x: 20, y: 30, w: 5, h: 2, wall: '#e8d5b0', roof: '#8e44ad', face: 'left', height: 18, sign: 'PANGGUNG' });
  b.structure({ kind: 'gazebo', x: 30, y: 28, w: 2, h: 2, wall: '#f5f5dc', roof: '#c0392b', face: 'left', height: 18 });
  b.props('pine', [[1, 0.6], [6, 0.6], [12, 0.8], [17, 0.6], [22, 0.8], [27, 0.6], [32, 0.8], [35, 2], [34.6, 10], [34.6, 15], [34.6, 22], [34.6, 28], [10, 34.6], [15, 34.6], [21, 34.6], [27, 34.6], [32, 34.6], [0.6, 34]]);
  b.props('tree', [[0.6, 10], [0.6, 14.5], [0.6, 19], [0.6, 25], [0.6, 29.5], [31.5, 31.5], [29, 31.5], [16, 33.2], [25.5, 31]]);
  b.props('flowers', [[14, 31], [16, 31.5], [21, 32.5], [23, 32.4], [31, 19.6], [31.5, 25.4]]);
  b.props('bench', [[33.8, 21], [33.8, 23], [14.5, 32.4], [27.6, 33.8], [10.5, 33.8]]);
  b.props('lamp', [[33.1, 12], [33.1, 18], [33.1, 25], [33.1, 31], [13, 33.1], [24, 33.1], [6.1, 13], [6.1, 24], [10, 6.1], [26, 6.1]]);
  b.props('rock', [[32.6, 19.8], [30.3, 25.4]]);
  b.props('bin', [[33.8, 16.5], [18.5, 33.8]]);
  b.poi([33, 22], [22, 33], [12, 6], [6, 22], [33, 29]);
  b.autoCross();
  return b.build('#3d7a3a');
}

function kota(): GameMap {
  const b = neighbourhood('lawn');
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

  // ---- Outskirts: more downtown blocks — towers, a hospital, city hall, the station and a pocket park.
  b.at(0, 0);
  for (const [x, y, w, h] of [[0, 0, 36, 6], [0, 30, 36, 6], [0, 6, 6, 24], [30, 6, 6, 24]]) b.paintOver(x, y, w, h, 'plaza', ['lawn']);
  b.rect(0, 31, 10, 5, 'lawn');
  building(b, { kind: 'office', x: 0, y: 0, w: 5, h: 4, wall: '#d5dbdb', roof: '#566573', roofStyle: 'flat', face: 'left', height: 100, floors: 7, sign: 'APARTEMEN' });
  building(b, { kind: 'shop', x: 6, y: 0, w: 4, h: 3, wall: '#fdebd0', roof: '#6e2c00', roofStyle: 'flat', face: 'left', sign: 'TOKO BUKU', awning: '#ca6f1e', accent: '#fff', height: 30 });
  building(b, { kind: 'office', x: 14, y: 0, w: 7, h: 4, wall: '#7fa7c2', roof: '#1b4f72', roofStyle: 'flat', face: 'left', height: 128, floors: 9, sign: 'MENARA KOTA' });
  building(b, { kind: 'office', x: 25, y: 0, w: 5, h: 4, wall: '#f5ead6', roof: '#7b5e3b', roofStyle: 'flat', face: 'left', height: 88, floors: 6, sign: 'HOTEL' });
  building(b, { kind: 'office', x: 31, y: 0, w: 4, h: 4, wall: '#aab7b8', roof: '#34495e', roofStyle: 'flat', face: 'left', height: 70, floors: 5 });
  building(b, { kind: 'shop', x: 0, y: 6, w: 4, h: 3, wall: '#fdfefe', roof: '#1e8449', roofStyle: 'flat', face: 'right', sign: 'FARMASI', awning: '#27ae60', accent: '#fff', height: 30 });
  building(b, { kind: 'office', x: 0, y: 14, w: 4, h: 6, wall: '#f4f6f6', roof: '#b03a2e', roofStyle: 'flat', face: 'right', height: 60, floors: 4, sign: 'RUMAH SAKIT' });
  building(b, { kind: 'shop', x: 0, y: 25, w: 4, h: 4, wall: '#2c3e50', roof: '#17202a', roofStyle: 'flat', face: 'right', sign: 'BIOSKOP', awning: '#c0392b', accent: '#f1c40f', height: 36 });
  building(b, { kind: 'shop', x: 31, y: 6, w: 4, h: 3, wall: '#ebf5fb', roof: '#21618c', roofStyle: 'flat', face: 'left', sign: 'ELEKTRONIK', awning: '#2e86de', accent: '#fff', height: 30 });
  building(b, { kind: 'office', x: 31, y: 14, w: 4, h: 6, wall: '#f5ead6', roof: '#6b4226', face: 'left', height: 48, floors: 3, sign: 'BALAI KOTA' });
  building(b, { kind: 'office', x: 31, y: 25, w: 4, h: 4, wall: '#a9cce3', roof: '#1b4f72', roofStyle: 'flat', face: 'left', height: 82, floors: 6 });
  building(b, { kind: 'hall', x: 14, y: 30, w: 7, h: 3, wall: '#efe3cc', roof: '#6b4226', face: 'left', height: 30, sign: 'STASIUN', accent: '#c98a32' });
  building(b, { kind: 'shop', x: 25, y: 30, w: 5, h: 4, wall: '#fef9e7', roof: '#b9473e', roofStyle: 'flat', face: 'left', sign: 'SWALAYAN', awning: '#e74c3c', accent: '#fff', height: 32 });
  building(b, { kind: 'office', x: 31, y: 30, w: 4, h: 4, wall: '#d6dbdf', roof: '#283747', roofStyle: 'flat', face: 'left', height: 64, floors: 4 });
  b.structure({ kind: 'fountain', x: 4, y: 32, w: 3, h: 3, wall: '#e5e7e9', roof: '#5dade2', face: 'left', height: 10 });
  b.structure({ kind: 'busstop', x: 15, y: 5, w: 2, h: 1, wall: '#95a5a6', roof: '#16a085', face: 'left', height: 18 });
  b.structure({ kind: 'busstop', x: 5, y: 15, w: 1, h: 2, wall: '#95a5a6', roof: '#c98a32', face: 'right', height: 18 });
  b.props('tree', [[0.6, 31.6], [2.5, 34.6], [8.5, 31.6], [8.6, 34.4], [0.6, 34.6]]);
  b.props('bench', [[2.4, 33.4], [7.6, 33.6]]);
  b.props('pot', [[5.5, 5.5], [24.5, 5.5], [29.5, 5.5], [5.5, 24.5], [30.5, 24.5], [30.5, 9.5], [13.5, 30.4], [24.5, 30.4], [5.5, 9.5], [30.5, 13.5]]);
  b.props('lamp', [[3, 5.2], [19, 5.2], [33, 5.2], [5.2, 13.6], [5.2, 26], [30.8, 13.6], [30.8, 26], [13.6, 31.5], [24.4, 31.5], [33, 34.6]]);
  b.props('hydrant', [[9.6, 5.4], [30.4, 20.6]]);
  b.props('bin', [[20.6, 4.6], [4.6, 21.6], [30.4, 5.4]]);
  b.poi([2, 4], [17, 4], [4, 16], [33, 20], [17, 33], [27, 34], [10, 32]);
  b.autoCross();
  return b.build('#5b6b5a');
}

function pasar(): GameMap {
  const b = neighbourhood('market');
  b.hRoad(20).vRoad(2, undefined, 19);
  b.rect(5, 0, 8, 6, 'parking');
  // Lawn strip south of the road, with gaps so shoppers can reach the new shophouses.
  b.rect(0, 23, N, 1, 'lawn').rect(5, 23, 1, 1, 'market').rect(12, 23, 1, 1, 'market').rect(18, 23, 1, 1, 'market');
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

  // ---- Outskirts: wholesale warehouses, the fish market, more stall rows and a line of shophouses.
  b.at(0, 0);
  building(b, { kind: 'hall', x: 1, y: 0, w: 5, h: 4, wall: '#e8dcc4', roof: '#7f8c8d', face: 'left', height: 28, sign: 'GUDANG', accent: '#6b4226' });
  building(b, { kind: 'hall', x: 12, y: 0, w: 6, h: 4, wall: '#f5ead6', roof: '#a04000', face: 'left', height: 30, sign: 'GROSIR BERAS', accent: '#2e7d32' });
  building(b, { kind: 'hall', x: 20, y: 0, w: 6, h: 4, wall: '#eef4ea', roof: '#1e8449', face: 'left', height: 30, sign: 'GROSIR SAYUR', accent: '#c98a32' });
  building(b, { kind: 'hall', x: 28, y: 0, w: 7, h: 3, wall: '#e8dcc4', roof: '#566573', face: 'left', height: 26, sign: 'GUDANG', accent: '#6b4226' });
  building(b, { kind: 'hall', x: 0, y: 8, w: 5, h: 6, wall: '#eaf2f8', roof: '#1f618d', face: 'right', height: 28, sign: 'PASAR IKAN', accent: '#c98a32' });
  b.structure({ kind: 'busstop', x: 5, y: 21, w: 1, h: 2, wall: '#95a5a6', roof: '#27ae60', face: 'right', height: 18 });
  let cj = 3;
  for (const [x, y] of [[1, 16], [1, 19], [30, 7], [33, 7], [30, 10], [33, 10], [30, 13], [33, 13], [30, 16], [33, 16], [30, 19], [33, 19], [30, 22], [33, 22]] as [number, number][])
    b.structure({ kind: 'stall', x, y, w: 2, h: 2, wall: '#a0522d', roof: canopies[cj++ % canopies.length], accent: '#ffffff', face: 'left', height: 14 });
  const shops: [string, string, string][] = [
    ['EMAS', '#f9e79f', '#b7950b'],
    ['KAIN', '#fdedec', '#c0392b'],
    ['SEMBAKO', '#fef5e7', '#d35400'],
    ['JAMU', '#eafaf1', '#1e8449'],
    ['BUMBU', '#fdf2e9', '#a04000'],
    ['PLASTIK', '#ebf5fb', '#2e86de'],
    ['KUE', '#fdedec', '#e84393'],
    ['OBAT', '#f4f6f6', '#27ae60'],
  ];
  [1, 5, 9, 13, 17, 21, 25, 29].forEach((x, i) => {
    const [sign, wall, awning] = shops[i];
    building(b, { kind: 'shop', x, y: 31, w: 3, h: 3, wall, roof: '#6e2c00', roofStyle: 'flat', face: 'left', sign, awning, accent: '#fff', height: 26 });
  });
  b.props('car', [[19, 4.8], [26.5, 4.6]], '#7f8c8d');
  b.props('car', [[33, 4.6]], '#c0392b');
  b.props('crate', [[6.5, 3.6], [11.5, 4.5], [18.6, 1.5], [26.6, 1.5], [27.4, 4.6], [5.6, 12.6], [3.4, 18.4], [32.4, 9.4], [35.4, 12.4], [32.4, 21.4], [33.5, 33.6], [6.5, 29.6]]);
  b.props('umbrella', [[3.5, 23.5], [34.5, 25.4]]);
  b.props('motor', [[0.6, 24.6], [1.4, 24.6], [2.2, 24.6], [3, 24.6], [31.5, 29.6], [32.3, 29.6]]);
  b.props('tree', [[0.5, 29.6], [34.6, 29.6], [34.6, 34.6], [0.6, 34.6]]);
  b.props('lamp', [[6.4, 4.6], [19.6, 4.6], [27.6, 4.6], [5.4, 14.6], [29.6, 9], [29.6, 18], [8, 30.4], [24, 30.4]]);
  b.props('bin', [[11.4, 30.4], [29.4, 25]]);
  b.poi([3, 4], [15, 4], [23, 4], [5, 11], [32, 12], [32, 18], [11, 34], [27, 34]);
  b.autoCross();
  return b.build('#6b5b45');
}


function premium(): GameMap {
  const b = neighbourhood('lawn');
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
  b.props('tree', [[0.4, 23.4]]);
  b.props('bin', [[8.5, 15.3], [14.6, 20]]);
  b.poi([2, 6], [8, 6], [13, 6], [21, 6], [6, 16], [12, 19], [6, 23], [21, 23], [10, 17], [6, 10]);
  b.cart({ x: 9, y: 15, serveX: 9, serveY: 16, qdx: 1, qdy: 0, face: 'left' });

  // ---- Outskirts: residential towers, a clinic and hospital, an art gallery and a shopping promenade.
  b.at(0, 0);
  b.rect(0, 16, 6, 2, 'garden').rect(30, 16, 6, 2, 'garden');
  lane(b, 0, 5, 36, 1, 'plaza');
  b.zebra(5, 14, 1, 2, 'v').zebra(5, 18, 1, 2, 'v').zebra(30, 14, 1, 2, 'v').zebra(30, 18, 1, 2, 'v');
  lane(b, 5, 6, 1, 30, 'plaza');
  lane(b, 30, 6, 1, 30, 'plaza');
  lane(b, 31, 12, 5, 1, 'plaza');
  lane(b, 31, 26, 5, 1, 'plaza');
  lane(b, 0, 30, 36, 6, 'plaza');
  b.paintOver(0, 35, 36, 1, 'lawn', ['plaza']);
  building(b, { kind: 'office', x: 0, y: 1, w: 4, h: 4, wall: '#e8e1d5', roof: '#5d6d7e', roofStyle: 'flat', face: 'left', height: 118, floors: 9, sign: 'KONDOMINIUM' });
  building(b, { kind: 'office', x: 7, y: 1, w: 5, h: 4, wall: '#f5efe2', roof: '#7b5e3b', roofStyle: 'flat', face: 'left', height: 104, floors: 8, sign: 'RESIDENCE' });
  building(b, { kind: 'office', x: 14, y: 1, w: 6, h: 4, wall: '#d6eaf8', roof: '#1b4f72', roofStyle: 'flat', face: 'left', height: 132, floors: 10, sign: 'HOTEL BINTANG' });
  building(b, { kind: 'office', x: 25, y: 1, w: 5, h: 4, wall: '#fdfbf7', roof: '#4a235a', roofStyle: 'flat', face: 'left', height: 96, floors: 7, sign: 'KANTOR' });
  building(b, { kind: 'office', x: 31, y: 1, w: 4, h: 4, wall: '#6c8ea6', roof: '#2c3e50', roofStyle: 'flat', face: 'left', height: 122, floors: 9, sign: 'APARTEMEN' });
  building(b, { kind: 'office', x: 1, y: 7, w: 4, h: 4, wall: '#f8f9f9', roof: '#1e8449', roofStyle: 'flat', face: 'right', height: 44, floors: 3, sign: 'KLINIK' });
  building(b, { kind: 'shop', x: 1, y: 21, w: 4, h: 3, wall: '#f8f9f9', roof: '#4a235a', roofStyle: 'flat', face: 'right', sign: 'GALERI', awning: '#4a235a', accent: '#f5f5f5', height: 30 });
  b.structure({ kind: 'fountain', x: 1, y: 26, w: 3, h: 3, wall: '#e5e7e9', roof: '#5dade2', face: 'left', height: 10 });
  building(b, { kind: 'office', x: 31, y: 6, w: 5, h: 6, wall: '#f4f6f6', roof: '#b03a2e', roofStyle: 'flat', face: 'left', height: 58, floors: 4, sign: 'RUMAH SAKIT' });
  building(b, { kind: 'shop', x: 31, y: 22, w: 4, h: 4, wall: '#1c2833', roof: '#17202a', roofStyle: 'flat', face: 'left', sign: 'SHOWROOM', awning: '#d4ac0d', accent: '#fff', height: 34 });
  const boutiques: [string, string, string][] = [
    ['JAM', '#fdfbf7', '#1c2833'],
    ['SEPATU', '#fef9e7', '#7d6608'],
    ['KOSMETIK', '#fdedec', '#c0392b'],
    ['BISTRO', '#f4ecf7', '#6c3483'],
    ['GELATO', '#e8f8f5', '#16a085'],
    ['BUNGA', '#fdf2e9', '#e67e22'],
  ];
  [6, 10, 14, 25, 28, 32].forEach((x, i) => {
    const [sign, wall, awning] = boutiques[i];
    building(b, { kind: 'shop', x, y: 31, w: 3, h: 3, wall, roof: '#283747', roofStyle: 'flat', face: 'left', sign, awning, accent: '#fff', height: 30 });
  });
  b.props('palm', [[0.6, 16.4], [3, 17.2], [31.6, 16.4], [34.4, 17.1], [0.5, 31], [4.5, 31.4], [19.5, 31.4], [21, 34.2], [35, 30.6], [0.6, 12.4], [35.3, 21]]);
  b.props('flowers', [[1.8, 16.6], [33, 17]]);
  b.props('umbrella', [[3, 33.5], [19.5, 33.4], [35, 33.5]]);
  b.props('pot', [[4.6, 5.4], [12.6, 5.4], [20.6, 5.4], [24.6, 5.6], [5.6, 20.4], [30.4, 20.4], [9.6, 34.4], [20.4, 34.4]]);
  b.props('lamp', [[2, 5.1], [10, 5.1], [17, 5.1], [28, 5.1], [5.1, 9], [5.1, 25], [30.9, 9], [30.9, 25], [10, 30.2], [26, 30.2]]);
  b.props('bench', [[2.3, 25.4], [1.6, 30.4]]);
  b.props('bin', [[13.6, 34.4], [30.4, 30.4]]);
  b.poi([16, 5], [27, 5], [5, 9], [5, 22], [33, 12], [33, 26], [12, 34], [29, 34]);
  b.autoCross();
  return b.build('#4f5f4c');
}

const BUILDERS: Record<LocationId, () => GameMap> = { asri, sekolah, kampus, taman, terminal, kota, alunalun, perkantoran, pasar, pantai, premium };

export function buildMap(id: LocationId): GameMap {
  return BUILDERS[id]();
}
