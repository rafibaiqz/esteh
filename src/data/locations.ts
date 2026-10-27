import type { LocationId, Requirement } from '../game/types';
import type { CustomerTypeId } from './customers';

export interface LocationDef {
  id: LocationId;
  name: string;
  tagline: string;
  description: string;
  demographics: string;
  /** Daily rent / stall permit, charged when opening for the day. */
  rent: number;
  /** One-off permit cost to unlock the location. */
  unlockCost: number;
  req: Requirement;
  /** Pedestrians per game hour before time-of-day, weather and marketing effects. */
  traffic: number;
  /** Base probability (0..1) that a passer-by near the cart considers buying. */
  baseDemand: number;
  /** Price locals consider fair; the price factor is (refPrice / price)^1.3. */
  refPrice: number;
  /** Typical maximum price a customer will pay. */
  budget: number;
  /** 0..1 — rival drink vendors steal part of the demand. */
  competition: number;
  /** Price elasticity: demand ∝ (fair price / price)^priceSensitivity. */
  priceSensitivity: number;
  /** How much recipe quality moves the fair price here (premium crowds care more). */
  qualityWeight: number;
  /** 0..1 — covered walkways/halls that soften the rain traffic penalty. */
  shelter: number;
  /** Traffic multiplier on Saturday/Sunday. */
  weekend: number;
  /** Multiplier on customers' patience here (commuters and office workers are in a hurry). */
  patienceMult?: number;
  /** Demand multiplier per hour from 07:00 (index 0) to 21:00 (index 14). */
  hourCurve: number[];
  /** Taste preference distribution: [mean, standard deviation] in recipe units. */
  prefs: { tea: [number, number]; sugar: [number, number]; ice: [number, number]; lemon: number };
  crowd: { type: CustomerTypeId; weight: number }[];
  bonus: { popGain?: number; supplyDiscount?: number; hotBonus?: number };
  bonusText: string;
  startPopularity: number;
  trafficLabel: string;
  purchasingLabel: string;
}

export const LOCATIONS: Record<LocationId, LocationDef> = {
  asri: {
    id: 'asri',
    name: 'Perumahan Asri',
    tagline: 'Kompleks perumahan yang tenang',
    description:
      'Tempat terbaik memulai usaha es teh: jalanan kompleks yang rindang, tetangga yang ramah, dan iuran lapak yang gratis. Pembeli tidak banyak, tetapi mereka setia.',
    demographics: 'Warga, ibu rumah tangga, anak-anak, lansia',
    rent: 0,
    unlockCost: 0,
    req: {},
    traffic: 8,
    baseDemand: 0.62,
    refPrice: 3_000,
    budget: 4_200,
    competition: 0.05,
    priceSensitivity: 1.35,
    qualityWeight: 0.6,
    shelter: 0,
    weekend: 1.2,
    hourCurve: [0.8, 0.9, 0.9, 1.0, 1.1, 1.1, 1.0, 1.1, 1.2, 1.2, 1.1, 0.9, 0.7, 0.6, 0.5],
    prefs: { tea: [2.2, 0.7], sugar: [2.4, 0.8], ice: [3, 1], lemon: 0.25 },
    crowd: [
      { type: 'warga', weight: 5 },
      { type: 'ibu', weight: 3 },
      { type: 'anak', weight: 2 },
      { type: 'lansia', weight: 1.5 },
    ],
    bonus: { popGain: 1.25 },
    bonusText: 'Tetangga suka bercerita: popularitas naik 25% lebih cepat. Tanpa sewa.',
    startPopularity: 15,
    trafficLabel: 'Rendah',
    purchasingLabel: 'Menengah',
  },
  sekolah: {
    id: 'sekolah',
    name: 'Kawasan Sekolah',
    tagline: 'Depan gerbang SD & SMP Tunas Bangsa',
    description:
      'Ratusan pelajar keluar-masuk gerbang setiap hari. Sangat ramai saat jam masuk dan jam pulang sekolah, sepi di sore hari. Pelajar sangat sensitif harga dan suka yang manis.',
    demographics: 'Pelajar, guru, orang tua penjemput',
    rent: 12_000,
    unlockCost: 120_000,
    req: { cups: 100 },
    traffic: 18,
    baseDemand: 0.7,
    refPrice: 3_000,
    budget: 4_200,
    competition: 0.25,
    priceSensitivity: 1.8,
    qualityWeight: 0.4,
    shelter: 0.15,
    weekend: 0.3,
    hourCurve: [1.6, 0.9, 0.5, 0.5, 0.7, 1.4, 1.9, 1.2, 0.8, 0.4, 0.3, 0.25, 0.2, 0.2, 0.2],
    prefs: { tea: [1.8, 0.6], sugar: [3.4, 0.8], ice: [3.5, 1], lemon: 0.3 },
    crowd: [
      { type: 'pelajar', weight: 7 },
      { type: 'anak', weight: 2 },
      { type: 'guru', weight: 1.5 },
      { type: 'ibu', weight: 1.5 },
    ],
    bonus: {},
    bonusText: 'Puncak pembeli pukul 07:00 dan 12:00–14:00. Harga murah = antrean panjang.',
    startPopularity: 12,
    trafficLabel: 'Sangat tinggi saat jam sekolah',
    purchasingLabel: 'Rendah',
  },
  taman: {
    id: 'taman',
    name: 'Taman Kota',
    tagline: 'Taman hijau dengan danau dan jalur lari',
    description:
      'Paru-paru kota yang ramai pelari di pagi hari dan keluarga di sore hari. Pengunjung suka es teh yang sangat dingin, terutama saat cuaca terik.',
    demographics: 'Pelari, keluarga, wisatawan, anak-anak',
    rent: 25_000,
    unlockCost: 280_000,
    req: { cups: 350 },
    traffic: 16,
    baseDemand: 0.68,
    refPrice: 4_000,
    budget: 5_200,
    competition: 0.2,
    priceSensitivity: 1.25,
    qualityWeight: 0.6,
    shelter: 0,
    weekend: 1.5,
    hourCurve: [1.4, 1.2, 0.7, 0.6, 0.6, 0.6, 0.7, 0.9, 1.4, 1.7, 1.6, 1.1, 0.8, 0.6, 0.5],
    prefs: { tea: [2.0, 0.7], sugar: [2.0, 0.8], ice: [4, 1], lemon: 0.45 },
    crowd: [
      { type: 'pelari', weight: 3 },
      { type: 'ibu', weight: 2 },
      { type: 'anak', weight: 2.5 },
      { type: 'warga', weight: 2 },
      { type: 'wisatawan', weight: 1.5 },
    ],
    bonus: { hotBonus: 1.2 },
    bonusText: 'Saat cuaca Cerah/Panas, minat beli +20%. Sore hari paling ramai.',
    startPopularity: 10,
    trafficLabel: 'Sedang–tinggi, puncak sore',
    purchasingLabel: 'Menengah',
  },
  kota: {
    id: 'kota',
    name: 'Pusat Kota',
    tagline: 'Gedung perkantoran dan pertokoan',
    description:
      'Trotoar padat pekerja kantoran yang berani bayar lebih untuk es teh yang pekat dan tidak terlalu manis. Banyak pesaing kafe dan minuman kekinian. Sewa mahal.',
    demographics: 'Pekerja kantoran, wisatawan, pelajar',
    rent: 75_000,
    unlockCost: 550_000,
    req: { cups: 800, locations: 3 },
    traffic: 24,
    baseDemand: 0.66,
    refPrice: 6_000,
    budget: 7_500,
    competition: 0.5,
    priceSensitivity: 1.05,
    qualityWeight: 0.8,
    shelter: 0.3,
    weekend: 0.65,
    hourCurve: [1.2, 1.3, 0.9, 0.9, 1.0, 1.7, 1.6, 1.0, 0.9, 1.1, 1.5, 1.3, 0.9, 0.8, 0.7],
    prefs: { tea: [3.0, 0.7], sugar: [1.8, 0.8], ice: [3, 1], lemon: 0.5 },
    crowd: [
      { type: 'pekerja', weight: 7 },
      { type: 'wisatawan', weight: 1.5 },
      { type: 'warga', weight: 2 },
      { type: 'pelajar', weight: 1 },
    ],
    bonus: {},
    bonusText: 'Pembeli berduit: batas harga tinggi, tapi persaingan ketat (-20% minat).',
    startPopularity: 8,
    trafficLabel: 'Sangat tinggi',
    purchasingLabel: 'Tinggi',
  },
  pasar: {
    id: 'pasar',
    name: 'Pasar Tradisional',
    tagline: 'Pasar Legi yang selalu ramai',
    description:
      'Lorong-lorong lapak yang padat sejak subuh. Pembeli dan pedagang suka teh "nasgitel" — kental dan legi. Pemasok di pasar memberi harga grosir.',
    demographics: 'Pembeli pasar, pedagang, ibu-ibu, lansia',
    rent: 40_000,
    unlockCost: 900_000,
    req: { cups: 1500, satisfaction: 60 },
    traffic: 26,
    baseDemand: 0.64,
    refPrice: 3_500,
    budget: 4_800,
    competition: 0.45,
    priceSensitivity: 1.6,
    qualityWeight: 0.4,
    shelter: 0.5,
    weekend: 1.25,
    hourCurve: [1.8, 1.8, 1.6, 1.3, 1.0, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.2, 0.2],
    prefs: { tea: [3.2, 0.7], sugar: [3.3, 0.8], ice: [2.6, 1], lemon: 0.12 },
    crowd: [
      { type: 'pembeli', weight: 6 },
      { type: 'pedagang', weight: 3 },
      { type: 'ibu', weight: 2 },
      { type: 'lansia', weight: 1.5 },
    ],
    bonus: { supplyDiscount: 0.12 },
    bonusText: 'Harga grosir: semua bahan 12% lebih murah selama berjualan di sini. Ramai pagi.',
    startPopularity: 10,
    trafficLabel: 'Padat, puncak pagi',
    purchasingLabel: 'Menengah-rendah',
  },
  premium: {
    id: 'premium',
    name: 'Kawasan Premium',
    tagline: 'Boulevard butik, hotel, dan apartemen mewah',
    description:
      'Boulevard berjajar palem dengan butik dan lobi hotel. Pembelinya berduit dan menghargai rasa yang istimewa, tapi sewa sangat mahal, kafe mewah bertebaran, dan harga yang tidak masuk akal tetap ditolak.',
    demographics: 'Eksekutif, wisatawan, pekerja kantoran',
    rent: 180_000,
    unlockCost: 1_200_000,
    req: { cups: 2000, satisfaction: 70, locations: 6 },
    traffic: 11,
    baseDemand: 0.6,
    refPrice: 8_500,
    budget: 11_000,
    competition: 0.6,
    priceSensitivity: 0.85,
    qualityWeight: 1.3,
    shelter: 0.45,
    weekend: 1.2,
    hourCurve: [0.6, 0.8, 1.0, 1.0, 1.2, 1.6, 1.4, 1.0, 0.9, 1.2, 1.5, 1.6, 1.4, 1.2, 1.0],
    prefs: { tea: [2.6, 0.6], sugar: [1.5, 0.7], ice: [3, 0.9], lemon: 0.6 },
    crowd: [
      { type: 'eksekutif', weight: 5 },
      { type: 'wisatawan', weight: 2 },
      { type: 'pekerja', weight: 2.5 },
    ],
    bonus: {},
    bonusText: 'Pembeli menghargai kualitas: resep yang enak menaikkan harga wajar jauh lebih tinggi. Selasar beratap meredam dampak hujan.',
    startPopularity: 5,
    trafficLabel: 'Sedang, puncak siang & sore',
    purchasingLabel: 'Sangat tinggi',
  },
  kampus: {
    id: 'kampus',
    name: 'Kampus',
    tagline: 'Universitas Nusantara: fakultas, kantin, dan taman tengah',
    description:
      'Mahasiswa dan dosen berlalu-lalang di antara gedung fakultas. Ramai saat jam istirahat dan makan siang, sepi di akhir pekan. Mahasiswa sangat memperhitungkan uang saku.',
    demographics: 'Mahasiswa, dosen, pekerja kampus',
    rent: 15_000,
    unlockCost: 200_000,
    req: { cups: 250 },
    traffic: 15,
    baseDemand: 0.66,
    refPrice: 3_500,
    budget: 4_600,
    competition: 0.3,
    priceSensitivity: 1.6,
    qualityWeight: 0.5,
    shelter: 0.3,
    weekend: 0.35,
    hourCurve: [0.8, 1.3, 1.5, 0.9, 1.0, 1.6, 1.4, 1.0, 1.4, 1.0, 0.7, 0.5, 0.4, 0.3, 0.3],
    prefs: { tea: [2.2, 0.7], sugar: [2.8, 0.8], ice: [3.5, 1], lemon: 0.4 },
    crowd: [
      { type: 'mahasiswa', weight: 7 },
      { type: 'dosen', weight: 1.5 },
      { type: 'pekerja', weight: 1 },
    ],
    bonus: {},
    bonusText: 'Puncak saat jeda kuliah (09:00) dan makan siang. Akhir pekan sepi — pindah lokasi saat Sabtu–Minggu.',
    startPopularity: 10,
    trafficLabel: 'Sedang–tinggi saat jam kuliah',
    purchasingLabel: 'Menengah-rendah',
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal Angkutan',
    tagline: 'Terminal bus dan angkot antarkota',
    description:
      'Penumpang turun-naik bus sepanjang hari, paling padat saat jam berangkat dan pulang kerja. Mereka terburu-buru: antrean lama langsung ditinggal, jadi kecepatan saji adalah segalanya.',
    demographics: 'Penumpang, pedagang asongan, warga, pelajar',
    rent: 30_000,
    unlockCost: 380_000,
    req: { cups: 550 },
    traffic: 22,
    baseDemand: 0.66,
    refPrice: 3_500,
    budget: 4_800,
    competition: 0.35,
    priceSensitivity: 1.4,
    qualityWeight: 0.4,
    shelter: 0.45,
    weekend: 1.1,
    patienceMult: 0.85,
    hourCurve: [1.9, 1.7, 1.1, 0.8, 0.8, 0.9, 0.9, 1.0, 1.3, 1.8, 1.9, 1.3, 0.9, 0.7, 0.5],
    prefs: { tea: [2.6, 0.7], sugar: [2.6, 0.8], ice: [3, 1], lemon: 0.15 },
    crowd: [
      { type: 'komuter', weight: 7 },
      { type: 'pedagang', weight: 2 },
      { type: 'warga', weight: 2 },
      { type: 'pelajar', weight: 1 },
    ],
    bonus: {},
    bonusText: 'Pembeli tidak sabar (−15% kesabaran). Gerobak cepat, kasir, dan tali antrean sangat berguna. Puncak 07:00 dan 16:00.',
    startPopularity: 8,
    trafficLabel: 'Sangat padat saat jam sibuk',
    purchasingLabel: 'Menengah',
  },
  alunalun: {
    id: 'alunalun',
    name: 'Alun-Alun Kota',
    tagline: 'Lapangan beringin kembar, pendopo, dan deretan kuliner malam',
    description:
      'Jantung kota tempat keluarga bersantai. Sepi di siang hari, makin ramai menjelang malam dan di akhir pekan. Seleranya beragam — resep yang “tengah-tengah” paling aman. Lampu malam sangat menguntungkan di sini.',
    demographics: 'Keluarga, anak-anak, wisatawan, lansia, pedagang',
    rent: 35_000,
    unlockCost: 700_000,
    req: { cups: 1100 },
    traffic: 15,
    baseDemand: 0.66,
    refPrice: 4_000,
    budget: 5_200,
    competition: 0.35,
    priceSensitivity: 1.25,
    qualityWeight: 0.6,
    shelter: 0.1,
    weekend: 1.6,
    hourCurve: [0.6, 0.6, 0.5, 0.5, 0.6, 0.7, 0.7, 0.8, 1.0, 1.3, 1.6, 1.8, 1.9, 1.8, 1.6],
    prefs: { tea: [2.4, 0.9], sugar: [2.6, 1.0], ice: [3, 1.2], lemon: 0.35 },
    crowd: [
      { type: 'ibu', weight: 3 },
      { type: 'anak', weight: 3 },
      { type: 'warga', weight: 3 },
      { type: 'wisatawan', weight: 1.5 },
      { type: 'lansia', weight: 1.5 },
    ],
    bonus: {},
    bonusText: 'Ramai sore–malam (puncak 18:00–20:00) dan akhir pekan. Buka sampai 21:00 dengan Lampu Malam.',
    startPopularity: 10,
    trafficLabel: 'Rendah siang, padat malam',
    purchasingLabel: 'Menengah',
  },
  perkantoran: {
    id: 'perkantoran',
    name: 'Kawasan Perkantoran',
    tagline: 'Menara kantor, food court, dan pelataran parkir',
    description:
      'Ribuan pekerja keluar saat makan siang dan sore hari. Daya beli tinggi dan menghargai rasa yang konsisten, tapi tidak mau menunggu lama. Akhir pekan nyaris kosong.',
    demographics: 'Pekerja kantoran, eksekutif, penumpang',
    rent: 70_000,
    unlockCost: 750_000,
    req: { cups: 1200, locations: 5 },
    traffic: 18,
    baseDemand: 0.64,
    refPrice: 6_500,
    budget: 8_000,
    competition: 0.45,
    priceSensitivity: 1.0,
    qualityWeight: 0.9,
    shelter: 0.35,
    weekend: 0.35,
    patienceMult: 0.85,
    hourCurve: [0.9, 1.0, 0.6, 0.6, 0.8, 1.8, 1.7, 0.8, 1.0, 1.4, 1.2, 0.6, 0.4, 0.3, 0.3],
    prefs: { tea: [3.0, 0.6], sugar: [1.7, 0.7], ice: [3, 0.9], lemon: 0.5 },
    crowd: [
      { type: 'pekerja', weight: 7 },
      { type: 'eksekutif', weight: 2 },
      { type: 'komuter', weight: 1.5 },
    ],
    bonus: {},
    bonusText: 'Puncak 12:00–13:00 dan 15:00. Pembeli tergesa-gesa (−15% kesabaran) dan menghargai rasa konsisten.',
    startPopularity: 6,
    trafficLabel: 'Tinggi saat makan siang, sepi akhir pekan',
    purchasingLabel: 'Tinggi',
  },
  pantai: {
    id: 'pantai',
    name: 'Pantai Wisata',
    tagline: 'Pantai pasir putih dengan jalan papan dan warung seafood',
    description:
      'Wisatawan berjemur dan bermain air. Saat terik, es teh paling dicari di sini; saat mendung atau hujan, pantai hampir kosong. Sewa mahal dan sama sekali tidak teduh.',
    demographics: 'Wisatawan, keluarga, anak-anak, pelari',
    rent: 55_000,
    unlockCost: 1_000_000,
    req: { cups: 1800, locations: 6 },
    traffic: 17,
    baseDemand: 0.68,
    refPrice: 5_000,
    budget: 6_500,
    competition: 0.35,
    priceSensitivity: 1.1,
    qualityWeight: 0.7,
    shelter: 0,
    weekend: 1.7,
    hourCurve: [0.5, 0.7, 0.9, 1.2, 1.4, 1.5, 1.6, 1.6, 1.5, 1.4, 1.2, 0.8, 0.5, 0.3, 0.3],
    prefs: { tea: [2.0, 0.7], sugar: [2.4, 0.8], ice: [4.2, 1], lemon: 0.5 },
    crowd: [
      { type: 'wisatawan', weight: 5 },
      { type: 'ibu', weight: 2 },
      { type: 'anak', weight: 2.5 },
      { type: 'pelari', weight: 1 },
    ],
    bonus: { hotBonus: 1.35 },
    bonusText: 'Saat cerah/panas minat beli +35%, tapi hujan membuat pantai kosong. Akhir pekan sangat ramai.',
    startPopularity: 8,
    trafficLabel: 'Tinggi saat cerah & akhir pekan',
    purchasingLabel: 'Tinggi',
  },
};

export const LOCATION_ORDER: LocationId[] = ['asri', 'sekolah', 'kampus', 'taman', 'terminal', 'kota', 'alunalun', 'perkantoran', 'pasar', 'pantai', 'premium'];

export const OPEN_HOUR = 7;
export const BASE_CLOSE_HOUR = 19;
/** Real seconds per in-game hour at 1× speed. A 12-hour day lasts 3 minutes. */
export const SECONDS_PER_HOUR = 15;

export function hourFactor(def: LocationDef, timeMin: number): number {
  const h = timeMin / 60 - OPEN_HOUR;
  const i = Math.max(0, Math.min(def.hourCurve.length - 1, Math.floor(h)));
  const j = Math.min(def.hourCurve.length - 1, i + 1);
  const t = Math.max(0, Math.min(1, h - i));
  return def.hourCurve[i] * (1 - t) + def.hourCurve[j] * t;
}
