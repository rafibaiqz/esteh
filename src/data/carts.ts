import type { CartId, Ingredient, Requirement } from '../game/types';

/**
 * Visual definition of a cart. This is the ONLY description of what a cart
 * looks like: the shop preview, the title screen and the game world all render
 * it through render/cartModel.ts, so they always match.
 */
export interface CartLook {
  kind: 'cart' | 'bike' | 'kiosk' | 'truck';
  /** Footprint in tiles along the serving face (length) and front-to-back (depth). */
  length: number;
  depth: number;
  /** Height of the body bottom (wheel clearance) and of the body itself, in px. */
  bodyZ: number;
  bodyH: number;
  body: string;
  panel: string;
  trim: string;
  planks: boolean;
  canopy: 'stripes' | 'scallop' | 'gable' | 'flat' | 'none';
  canopyA: string;
  canopyB: string;
  /** Height of the canopy above the ground in px. */
  canopyZ: number;
  wheels: 'spoke' | 'wagon' | 'small' | 'none';
  wheelColor: string;
  sign: string;
  signBg: string;
  signFg: string;
  signStyle: 'painted' | 'board' | 'marquee';
  decor: 'none' | 'bunting' | 'bulbs' | 'brass';
  display: 'jars' | 'glass' | 'barrel';
}

export interface CartDef {
  id: CartId;
  name: string;
  desc: string;
  /** One-line trade-off summary shown in the shop. */
  tradeoff: string;
  price: number;
  req: Requirement;
  capacity: Record<Ingredient, number>;
  /** Multiplier on seconds-per-cup (lower = faster). */
  serviceMult: number;
  queue: number;
  attraction: number;
  maintenance: number;
  /** Extra view radius (tiles) — taller or louder carts are noticed from further away. */
  viewBonus: number;
  /** Built-in taste bonus (better tools). */
  tasteBonus: number;
  /** Multiplier on popularity gained from sales (charming carts get talked about). */
  popGain: number;
  /** Multiplier on overnight ice melt (insulated storage). */
  iceMelt: number;
  /** Roofed carts are sheltered: umbrella/tarp equipment isn't needed. */
  roofed: boolean;
  look: CartLook;
}

const BRAND = { amber: '#c98a32', honey: '#e7b65c', cream: '#fff8e9', creamDeep: '#f5e6c8', tea: '#6b4226', deep: '#38271d' };

export const CARTS: Record<CartId, CartDef> = {
  gerobak: {
    id: 'gerobak',
    name: 'Gerobak Es Teh Klasik',
    desc: 'Gerobak dorong kayu dengan kanopi amber dan panel krem. Sederhana tapi setia.',
    tradeoff: 'Murah dan tanpa biaya perawatan, tapi kecil dan lambat.',
    price: 0,
    req: {},
    capacity: { tea: 80, sugar: 80, ice: 200, cups: 120, lemon: 30 },
    serviceMult: 1,
    queue: 4,
    attraction: 1,
    maintenance: 0,
    viewBonus: 0,
    tasteBonus: 0,
    popGain: 1,
    iceMelt: 1,
    roofed: false,
    look: {
      kind: 'cart', length: 0.82, depth: 0.56, bodyZ: 4, bodyH: 8,
      body: '#a8693a', panel: BRAND.cream, trim: BRAND.amber, planks: true,
      canopy: 'stripes', canopyA: BRAND.amber, canopyB: BRAND.cream, canopyZ: 36,
      wheels: 'spoke', wheelColor: '#4a3123',
      sign: 'ESTEH', signBg: BRAND.cream, signFg: BRAND.tea, signStyle: 'painted', decor: 'none', display: 'jars',
    },
  },
  mobile: {
    id: 'mobile',
    name: 'Gerobak Sepeda',
    desc: 'Sepeda roda tiga dengan kotak es teh di depan. Lincah dan bel-nya terdengar dari jauh.',
    tradeoff: 'Lebih cepat saji dan terlihat dari jauh, tapi stok & antrean paling kecil.',
    price: 90_000,
    req: { cups: 60 },
    capacity: { tea: 60, sugar: 60, ice: 160, cups: 100, lemon: 30 },
    serviceMult: 0.9,
    queue: 3,
    attraction: 1.06,
    maintenance: 1_000,
    viewBonus: 2,
    tasteBonus: 0,
    popGain: 1,
    iceMelt: 1,
    roofed: false,
    look: {
      kind: 'bike', length: 0.7, depth: 0.5, bodyZ: 6, bodyH: 7,
      body: BRAND.cream, panel: BRAND.honey, trim: '#b9473e', planks: false,
      canopy: 'flat', canopyA: '#b9473e', canopyB: BRAND.cream, canopyZ: 33,
      wheels: 'small', wheelColor: '#2f2f33',
      sign: 'ES TEH', signBg: '#b9473e', signFg: BRAND.cream, signStyle: 'painted', decor: 'none', display: 'barrel',
    },
  },
  gerobakPlus: {
    id: 'gerobakPlus',
    name: 'Gerobak Kayu Plus',
    desc: 'Gerobak kayu jati dengan laci ekstra dan atap pelana. Stok lebih banyak, antrean lebih panjang.',
    tradeoff: 'Kapasitas naik dua kali lipat dengan biaya perawatan kecil.',
    price: 180_000,
    req: { cups: 120 },
    capacity: { tea: 180, sugar: 180, ice: 400, cups: 300, lemon: 80 },
    serviceMult: 0.95,
    queue: 6,
    attraction: 1.08,
    maintenance: 2_000,
    viewBonus: 0,
    tasteBonus: 0,
    popGain: 1,
    iceMelt: 1,
    roofed: false,
    look: {
      kind: 'cart', length: 0.92, depth: 0.66, bodyZ: 4, bodyH: 9,
      body: '#8b5a2b', panel: '#d9b382', trim: BRAND.tea, planks: true,
      canopy: 'gable', canopyA: BRAND.tea, canopyB: BRAND.honey, canopyZ: 37,
      wheels: 'wagon', wheelColor: '#3b2416',
      sign: 'ESTEH', signBg: BRAND.tea, signFg: BRAND.honey, signStyle: 'board', decor: 'none', display: 'jars',
    },
  },
  modern: {
    id: 'modern',
    name: 'Gerobak Modern',
    desc: 'Rangka stainless, kotak es berinsulasi, dan papan nama menyala di atas kanopi.',
    tradeoff: 'Saji cepat dan es lebih awet, tapi kurang "berkarakter" dibanding gerobak kayu.',
    price: 280_000,
    req: { cups: 300 },
    capacity: { tea: 220, sugar: 220, ice: 500, cups: 350, lemon: 100 },
    serviceMult: 0.88,
    queue: 6,
    attraction: 1.1,
    maintenance: 3_500,
    viewBonus: 1,
    tasteBonus: 0,
    popGain: 1,
    iceMelt: 0.7,
    roofed: false,
    look: {
      kind: 'cart', length: 0.9, depth: 0.6, bodyZ: 3, bodyH: 9,
      body: '#c9d1d6', panel: '#ffffff', trim: BRAND.amber, planks: false,
      canopy: 'flat', canopyA: BRAND.amber, canopyB: BRAND.honey, canopyZ: 37,
      wheels: 'small', wheelColor: '#2b2b2e',
      sign: 'ESTEH', signBg: BRAND.deep, signFg: BRAND.honey, signStyle: 'board', decor: 'none', display: 'glass',
    },
  },
  vintage: {
    id: 'vintage',
    name: 'Gerobak Vintage',
    desc: 'Gerobak kayu marun berhias kuningan dengan roda kereta kuda. Jadi bahan foto pembeli.',
    tradeoff: 'Paling memikat dan cepat menaikkan popularitas, tapi saji lambat.',
    price: 340_000,
    req: { cups: 400, satisfaction: 65 },
    capacity: { tea: 160, sugar: 160, ice: 350, cups: 260, lemon: 80 },
    serviceMult: 1.0,
    queue: 6,
    attraction: 1.28,
    maintenance: 4_000,
    viewBonus: 1,
    tasteBonus: 0,
    popGain: 1.15,
    iceMelt: 1,
    roofed: false,
    look: {
      kind: 'cart', length: 0.88, depth: 0.6, bodyZ: 5, bodyH: 8,
      body: '#7b2d26', panel: '#f1e1c4', trim: '#d4a24c', planks: true,
      canopy: 'scallop', canopyA: '#7b2d26', canopyB: BRAND.cream, canopyZ: 38,
      wheels: 'wagon', wheelColor: '#d4a24c',
      sign: 'Es Teh Tempo Doeloe', signBg: '#f1e1c4', signFg: '#7b2d26', signStyle: 'marquee', decor: 'brass', display: 'barrel',
    },
  },
  kios: {
    id: 'kios',
    name: 'Booth Kios Modern',
    desc: 'Booth semi-permanen beratap dengan jendela saji lebar. Tidak terganggu hujan.',
    tradeoff: 'Beratap (tahan hujan) dan cepat, tapi perawatan mulai mahal.',
    price: 650_000,
    req: { cups: 800, locations: 2 },
    capacity: { tea: 300, sugar: 300, ice: 700, cups: 500, lemon: 150 },
    serviceMult: 0.8,
    queue: 8,
    attraction: 1.2,
    maintenance: 6_000,
    viewBonus: 1,
    tasteBonus: 0,
    popGain: 1,
    iceMelt: 1,
    roofed: true,
    look: {
      kind: 'kiosk', length: 0.96, depth: 0.92, bodyZ: 0, bodyH: 12,
      body: BRAND.tea, panel: BRAND.cream, trim: BRAND.amber, planks: false,
      canopy: 'flat', canopyA: BRAND.amber, canopyB: BRAND.cream, canopyZ: 30,
      wheels: 'none', wheelColor: '#000',
      sign: 'ESTEH', signBg: BRAND.honey, signFg: BRAND.tea, signStyle: 'board', decor: 'none', display: 'glass',
    },
  },
  premium: {
    id: 'premium',
    name: 'Gerobak Premium',
    desc: 'Kayu walnut, etalase kaca, alat seduh presisi, dan lampu bohlam. Untuk pembeli yang pilih-pilih.',
    tradeoff: 'Rasa lebih enak (+3) dan stok besar, tapi biaya perawatan tinggi.',
    price: 780_000,
    req: { cups: 1000, satisfaction: 70 },
    capacity: { tea: 320, sugar: 320, ice: 750, cups: 550, lemon: 160 },
    serviceMult: 0.82,
    queue: 7,
    attraction: 1.22,
    maintenance: 9_000,
    viewBonus: 1,
    tasteBonus: 3,
    popGain: 1.05,
    iceMelt: 0.8,
    roofed: false,
    look: {
      kind: 'cart', length: 0.96, depth: 0.64, bodyZ: 4, bodyH: 9,
      body: '#3b2a20', panel: BRAND.creamDeep, trim: '#d4a24c', planks: false,
      canopy: 'scallop', canopyA: BRAND.tea, canopyB: BRAND.honey, canopyZ: 39,
      wheels: 'spoke', wheelColor: '#d4a24c',
      sign: 'ESTEH Premium', signBg: BRAND.deep, signFg: '#e7c46c', signStyle: 'marquee', decor: 'bulbs', display: 'glass',
    },
  },
  festival: {
    id: 'festival',
    name: 'Gerobak Festival',
    desc: 'Gerobak besar warna-warni dengan meja saji lebar, bendera segitiga, dan dua orang bisa melayani.',
    tradeoff: 'Antrean sangat panjang dan saji kilat, tapi perawatan termahal untuk ukuran gerobak.',
    price: 950_000,
    req: { cups: 1400, locations: 4 },
    capacity: { tea: 400, sugar: 400, ice: 1000, cups: 700, lemon: 200 },
    serviceMult: 0.72,
    queue: 12,
    attraction: 1.3,
    maintenance: 14_000,
    viewBonus: 2,
    tasteBonus: 0,
    popGain: 1.05,
    iceMelt: 1,
    roofed: false,
    look: {
      kind: 'cart', length: 1.18, depth: 0.72, bodyZ: 4, bodyH: 9,
      body: '#c0392b', panel: '#ffe08a', trim: '#2e86de', planks: false,
      canopy: 'stripes', canopyA: '#e74c3c', canopyB: '#ffe08a', canopyZ: 39,
      wheels: 'spoke', wheelColor: '#2e3a59',
      sign: 'ES TEH SEGAR!', signBg: '#2e86de', signFg: '#ffffff', signStyle: 'marquee', decor: 'bunting', display: 'barrel',
    },
  },
  truk: {
    id: 'truk',
    name: 'Mobil Esteh',
    desc: 'Mobil boks berwarna amber dengan dapur mini dan jendela saji beratap.',
    tradeoff: 'Kapasitas raksasa dan beratap, tapi mahal dan perawatannya paling tinggi.',
    price: 1_600_000,
    req: { cups: 2000, locations: 4 },
    capacity: { tea: 600, sugar: 600, ice: 1400, cups: 1000, lemon: 300 },
    serviceMult: 0.65,
    queue: 10,
    attraction: 1.35,
    maintenance: 15_000,
    viewBonus: 2,
    tasteBonus: 0,
    popGain: 1,
    iceMelt: 0.8,
    roofed: true,
    look: {
      kind: 'truck', length: 1.7, depth: 0.85, bodyZ: 8, bodyH: 26,
      body: BRAND.amber, panel: BRAND.cream, trim: BRAND.tea, planks: false,
      canopy: 'stripes', canopyA: BRAND.tea, canopyB: BRAND.honey, canopyZ: 36,
      wheels: 'small', wheelColor: '#1b1b1b',
      sign: 'ESTEH', signBg: BRAND.cream, signFg: BRAND.tea, signStyle: 'painted', decor: 'none', display: 'glass',
    },
  },
};

export const CART_ORDER: CartId[] = ['gerobak', 'mobile', 'gerobakPlus', 'modern', 'vintage', 'kios', 'premium', 'festival', 'truk'];
