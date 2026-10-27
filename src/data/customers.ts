export type CustomerTypeId =
  | 'warga'
  | 'ibu'
  | 'anak'
  | 'pelajar'
  | 'guru'
  | 'pelari'
  | 'pekerja'
  | 'pembeli'
  | 'pedagang'
  | 'lansia'
  | 'wisatawan'
  | 'eksekutif'
  | 'mahasiswa'
  | 'dosen'
  | 'komuter';

export type Accessory = 'none' | 'bag' | 'basket' | 'briefcase' | 'backpack' | 'cap' | 'hijab' | 'helmet' | 'peci';

export interface CustomerTypeDef {
  id: CustomerTypeId;
  name: string;
  /** Walking speed in tiles per simulated second. */
  speed: [number, number];
  /** Multiplier on the location's typical price ceiling. */
  budgetMult: number;
  /** Seconds (simulated) the customer is willing to stand in the queue. */
  patience: number;
  thirst: number;
  /** Preference offsets added to the location profile (in recipe units). */
  pref: { tea: number; sugar: number; ice: number };
  lemonLike: number;
  /** How strongly price above fair value hurts satisfaction (1 = average). */
  priceSensitivity: number;
  /** How strongly waiting hurts satisfaction (1 = average). */
  waitSensitivity: number;
  /** How much taste quality drives satisfaction (1 = average). */
  qualityWeight: number;
  /** Tip propensity multiplier (0 = never tips). */
  tipMult: number;
  /** Premium customers leave larger tips. */
  premium: boolean;
  child: boolean;
  shirts: string[];
  pants: string[];
  accessories: Accessory[];
}

const SKIN = ['#f1c9a5', '#e0ac85', '#c68a62', '#a86e4b', '#8a573a'];
export const SKIN_TONES = SKIN;
export const HAIR = ['#1d1612', '#2b1d14', '#3b2a1e', '#4a3423', '#0f0f12', '#8a8a8a'];

export const CUSTOMER_TYPES: Record<CustomerTypeId, CustomerTypeDef> = {
  warga: {
    id: 'warga', name: 'Warga', speed: [1.2, 1.6], budgetMult: 1, patience: 28, thirst: 1,
    pref: { tea: 0, sugar: 0, ice: 0 }, lemonLike: 0, priceSensitivity: 1.1, waitSensitivity: 1.0, qualityWeight: 1.0, tipMult: 1.0, premium: false, child: false,
    shirts: ['#5b8bd6', '#d65b5b', '#6fbf73', '#f0b84a', '#9c6fd6', '#ffffff', '#3d4a5c'],
    pants: ['#2f3e5c', '#4a3b2a', '#3b3b3b', '#6b5a43'], accessories: ['none', 'none', 'cap', 'hijab', 'bag'],
  },
  ibu: {
    id: 'ibu', name: 'Ibu Rumah Tangga', speed: [1.0, 1.3], budgetMult: 0.95, patience: 30, thirst: 0.95,
    pref: { tea: -0.2, sugar: 0.3, ice: -0.3 }, lemonLike: 0.05, priceSensitivity: 1.2, waitSensitivity: 1.0, qualityWeight: 1.0, tipMult: 0.9, premium: false, child: false,
    shirts: ['#e57ba6', '#c95f8a', '#7bc4a8', '#f2a65a', '#b48ade'],
    pants: ['#5a3d5c', '#3e3e5a', '#6b4a3a'], accessories: ['hijab', 'hijab', 'basket', 'bag'],
  },
  anak: {
    id: 'anak', name: 'Anak-anak', speed: [1.3, 1.9], budgetMult: 0.7, patience: 18, thirst: 1.25,
    pref: { tea: -0.6, sugar: 1, ice: 0.6 }, lemonLike: -0.05, priceSensitivity: 1.3, waitSensitivity: 1.2, qualityWeight: 0.8, tipMult: 0.3, premium: false, child: true,
    shirts: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e06c', '#6c8cff'],
    pants: ['#2d4a7a', '#7a2d2d', '#3d3d3d'], accessories: ['none', 'cap'],
  },
  pelajar: {
    id: 'pelajar', name: 'Pelajar', speed: [1.4, 1.9], budgetMult: 0.8, patience: 20, thirst: 1.25,
    pref: { tea: -0.3, sugar: 0.7, ice: 0.5 }, lemonLike: 0.05, priceSensitivity: 1.5, waitSensitivity: 1.1, qualityWeight: 0.8, tipMult: 0.3, premium: false, child: true,
    shirts: ['#f6f6f6'], pants: ['#b8282c', '#b8282c', '#2a3f73'], accessories: ['backpack', 'backpack', 'hijab'],
  },
  guru: {
    id: 'guru', name: 'Guru', speed: [1.1, 1.4], budgetMult: 1.15, patience: 26, thirst: 1,
    pref: { tea: 0.3, sugar: -0.3, ice: -0.2 }, lemonLike: 0.05, priceSensitivity: 1.0, waitSensitivity: 0.9, qualityWeight: 1.1, tipMult: 1.0, premium: false, child: false,
    shirts: ['#c9a96e', '#8b9a6b', '#7d8fb3'], pants: ['#3a3a3a', '#4a3b2a'], accessories: ['bag', 'hijab', 'none'],
  },
  pelari: {
    id: 'pelari', name: 'Pelari', speed: [2.0, 2.6], budgetMult: 1.1, patience: 16, thirst: 1.4,
    pref: { tea: -0.3, sugar: -0.6, ice: 1 }, lemonLike: 0.15, priceSensitivity: 0.9, waitSensitivity: 1.4, qualityWeight: 0.9, tipMult: 0.8, premium: false, child: false,
    shirts: ['#ff8c42', '#3ec1d3', '#f6416c', '#a1de93'], pants: ['#222222', '#1b2a4a'], accessories: ['cap', 'none'],
  },
  pekerja: {
    id: 'pekerja', name: 'Pekerja Kantoran', speed: [1.4, 1.8], budgetMult: 1.25, patience: 18, thirst: 1.05,
    pref: { tea: 0.5, sugar: -0.6, ice: 0 }, lemonLike: 0.15, priceSensitivity: 0.8, waitSensitivity: 1.5, qualityWeight: 1.2, tipMult: 1.2, premium: false, child: false,
    shirts: ['#ffffff', '#d7e3f4', '#f4e1d7', '#b9c9d9'], pants: ['#22252b', '#2e3442', '#3c3c3c'], accessories: ['briefcase', 'bag', 'hijab'],
  },
  pembeli: {
    id: 'pembeli', name: 'Pembeli Pasar', speed: [1.0, 1.4], budgetMult: 0.95, patience: 26, thirst: 1.05,
    pref: { tea: 0.2, sugar: 0.3, ice: 0 }, lemonLike: -0.05, priceSensitivity: 1.4, waitSensitivity: 0.9, qualityWeight: 1.0, tipMult: 0.6, premium: false, child: false,
    shirts: ['#d97b4a', '#6f9e5c', '#c9604f', '#e2c044', '#7c6bb0'],
    pants: ['#4a3b2a', '#3b3b3b', '#5c4033'], accessories: ['basket', 'basket', 'hijab', 'bag'],
  },
  pedagang: {
    id: 'pedagang', name: 'Pedagang', speed: [1.2, 1.5], budgetMult: 0.9, patience: 14, thirst: 1.15,
    pref: { tea: 0.4, sugar: 0.4, ice: 0.2 }, lemonLike: -0.1, priceSensitivity: 1.3, waitSensitivity: 1.2, qualityWeight: 0.9, tipMult: 0.7, premium: false, child: false,
    shirts: ['#4f6d7a', '#8c5e3c', '#7a7a3c', '#a33'], pants: ['#3b3b3b', '#2b2b2b'], accessories: ['cap', 'helmet', 'none'],
  },
  lansia: {
    id: 'lansia', name: 'Lansia', speed: [0.8, 1.0], budgetMult: 0.9, patience: 35, thirst: 0.8,
    pref: { tea: 0.3, sugar: 0.2, ice: -1 }, lemonLike: -0.05, priceSensitivity: 1.2, waitSensitivity: 0.7, qualityWeight: 1.1, tipMult: 1.0, premium: false, child: false,
    shirts: ['#a89f91', '#8c7b6b', '#6b7f8c', '#b5651d'], pants: ['#4a4a4a', '#5c4b3b'], accessories: ['cap', 'hijab', 'none'],
  },
  wisatawan: {
    id: 'wisatawan', name: 'Wisatawan', speed: [1.0, 1.4], budgetMult: 1.4, patience: 24, thirst: 1.15,
    pref: { tea: 0, sugar: 0, ice: 0.5 }, lemonLike: 0.2, priceSensitivity: 0.8, waitSensitivity: 1.0, qualityWeight: 1.1, tipMult: 1.6, premium: true, child: false,
    shirts: ['#ff9f1c', '#2ec4b6', '#e71d36', '#f9c74f'], pants: ['#d4b483', '#3d5a80'], accessories: ['backpack', 'cap'],
  },
  eksekutif: {
    id: 'eksekutif', name: 'Eksekutif', speed: [1.3, 1.7], budgetMult: 1.4, patience: 15, thirst: 1,
    pref: { tea: 0.4, sugar: -0.8, ice: 0 }, lemonLike: 0.25,
    priceSensitivity: 0.6, waitSensitivity: 1.4, qualityWeight: 1.4, tipMult: 2, premium: true, child: false,
    shirts: ['#1c2833', '#f4f6f6', '#7b241c', '#d4ac0d', '#5b2c6f'], pants: ['#17202a', '#212f3d', '#d5d8dc'], accessories: ['briefcase', 'bag', 'none', 'hijab'],
  },
  mahasiswa: {
    id: 'mahasiswa', name: 'Mahasiswa', speed: [1.3, 1.7], budgetMult: 0.85, patience: 22, thirst: 1.15,
    pref: { tea: 0, sugar: 0.4, ice: 0.6 }, lemonLike: 0.15,
    priceSensitivity: 1.45, waitSensitivity: 1.0, qualityWeight: 0.9, tipMult: 0.4, premium: false, child: false,
    shirts: ['#6c8cff', '#e17055', '#00b894', '#fdcb6e', '#2d3436', '#a29bfe'], pants: ['#2d3436', '#34495e', '#636e72'], accessories: ['backpack', 'backpack', 'hijab', 'cap', 'none'],
  },
  dosen: {
    id: 'dosen', name: 'Dosen', speed: [1.1, 1.4], budgetMult: 1.2, patience: 24, thirst: 0.95,
    pref: { tea: 0.4, sugar: -0.5, ice: -0.2 }, lemonLike: 0.1,
    priceSensitivity: 0.9, waitSensitivity: 1.0, qualityWeight: 1.2, tipMult: 1.1, premium: false, child: false,
    shirts: ['#b8a07e', '#7d8fb3', '#8e6e53', '#f5f0e6'], pants: ['#3a3a3a', '#4a3b2a'], accessories: ['briefcase', 'hijab', 'peci', 'none'],
  },
  komuter: {
    id: 'komuter', name: 'Penumpang', speed: [1.6, 2.1], budgetMult: 1.0, patience: 15, thirst: 1.15,
    pref: { tea: 0.3, sugar: 0.2, ice: 0.2 }, lemonLike: 0,
    priceSensitivity: 1.1, waitSensitivity: 1.6, qualityWeight: 0.85, tipMult: 0.7, premium: false, child: false,
    shirts: ['#5d6d7e', '#a04000', '#1abc9c', '#f39c12', '#8e44ad', '#ecf0f1'], pants: ['#2c3e50', '#3b3b3b', '#4a3b2a'], accessories: ['bag', 'backpack', 'helmet', 'hijab', 'none'],
  },
};
