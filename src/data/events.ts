import type { Ingredient, LocationId, WeatherId } from '../game/types';
import type { CustomerTypeId } from './customers';

/** Mechanical effect of a news event. Missing fields mean "no change". */
export interface EventEffect {
  /** × pedestrian volume. */
  traffic?: number;
  /** × purchase interest. */
  thirst?: number;
  /** × customers' price ceiling (only `segments` if given). */
  budget?: number;
  /** × price elasticity. */
  priceSensitivity?: number;
  /** + competition (0..1). */
  competition?: number;
  /** + customers' preferred sugar (recipe units). */
  sugarPref?: number;
  /** Customer groups the budget/segmentTraffic multipliers apply to. */
  segments?: CustomerTypeId[];
  /** × share of `segments` in the crowd. */
  segmentTraffic?: number;
  /** × supplier prices today. */
  supply?: Partial<Record<Ingredient, number>>;
  /** × popularity gained from sales. */
  popularityGain?: number;
}

export interface EventContext {
  weather: WeatherId;
  dayOfWeek: number; // 0 = Senin … 6 = Minggu
  dayOfMonth: number; // 1..28
}

export interface NewsEventDef {
  id: string;
  headline: string;
  /** What it means for the business (shown in the UI). */
  desc: string;
  weight: number;
  /** 'all' = every location, 'random' = one unlocked location chosen when it happens. */
  scope: 'all' | 'random' | LocationId;
  when?: (c: EventContext) => boolean;
  effect: EventEffect;
  /** Per-location overrides merged on top of `effect` (for scope 'all'). */
  byLocation?: Partial<Record<LocationId, EventEffect>>;
  good: 'good' | 'bad' | 'mixed' | 'neutral';
}

const hot = (c: EventContext) => c.weather === 'terik' || c.weather === 'panas';
const wet = (c: EventContext) => c.weather === 'hujan' || c.weather === 'badai';
const weekday = (c: EventContext) => c.dayOfWeek <= 4;
const weekend = (c: EventContext) => c.dayOfWeek >= 5;

export const NEUTRAL_HEADLINES = [
  'Lomba 17-an makin dekat, warga mulai berlatih balap karung.',
  'Tim sepak bola kampung kalah lagi, suporter butuh yang segar-segar.',
  'Survei: 8 dari 10 orang lebih suka es teh daripada minuman bersoda.',
  'Pemkot cat ulang zebra cross di seluruh kota.',
  'Kucing oranye viral karena tidur di atas gerobak bakso.',
  'Musim mangga tiba, harga buah turun di pasar.',
];

export const EVENTS: NewsEventDef[] = [
  {
    id: 'biasa', headline: '', desc: 'Tidak ada kejadian khusus hari ini.', weight: 5, scope: 'all', effect: {}, good: 'neutral',
  },
  {
    id: 'gelombangPanas', headline: 'Gelombang Panas Melanda Kota!', desc: 'Semua orang lebih haus (+20% minat) dan sedikit lebih rela membayar.',
    weight: 4, scope: 'all', when: hot, effect: { thirst: 1.2, budget: 1.05 }, good: 'good',
  },
  {
    id: 'festivalKuliner', headline: 'Festival Kuliner Digelar di Pusat Kota!', desc: 'Pusat Kota jauh lebih ramai (+50% pejalan kaki), tapi pesaing makanan & minuman juga bertambah.',
    weight: 1, scope: 'kota', effect: { traffic: 1.5, competition: 0.1 }, good: 'mixed',
  },
  {
    id: 'peringatanHujan', headline: 'Hujan Deras Diperkirakan Sepanjang Hari!', desc: 'Warga memilih di rumah: pejalan kaki di luar ruangan berkurang lagi.',
    weight: 5, scope: 'all', when: wet, effect: { traffic: 0.85, thirst: 0.95 }, byLocation: { pasar: { traffic: 1 }, premium: { traffic: 0.95 } }, good: 'bad',
  },
  {
    id: 'promoSebelah', headline: 'Promo Minuman Murah di Sebelah!', desc: 'Pesaing banting harga: persaingan naik dan pembeli lebih membandingkan harga.',
    weight: 1.5, scope: 'random', effect: { competition: 0.25, priceSensitivity: 1.25 }, good: 'bad',
  },
  {
    id: 'olahragaSekolah', headline: 'Sekolah Mengadakan Acara Olahraga!', desc: 'Kawasan Sekolah ramai pelajar yang kehausan setelah bertanding.',
    weight: 1.2, scope: 'sekolah', when: weekday, effect: { traffic: 1.35, thirst: 1.2, segments: ['pelajar', 'anak'], segmentTraffic: 1.4 }, good: 'good',
  },
  {
    id: 'tamanRamai', headline: 'Taman Kota Ramai Pengunjung Akhir Pekan Ini!', desc: 'Keluarga dan pelari memadati Taman Kota.',
    weight: 2.5, scope: 'taman', when: (c) => weekend(c) && !wet(c), effect: { traffic: 1.45, segments: ['ibu', 'anak', 'pelari'], segmentTraffic: 1.3 }, good: 'good',
  },
  {
    id: 'gajian', headline: 'Gaji Bulanan Cair!', desc: 'Pekerja, guru, dan keluarga punya uang lebih: batas harga mereka naik 20%.',
    weight: 4, scope: 'all', when: (c) => c.dayOfMonth >= 25 || c.dayOfMonth === 1,
    effect: { budget: 1.2, priceSensitivity: 0.9, segments: ['pekerja', 'guru', 'eksekutif', 'warga', 'ibu'] }, good: 'good',
  },
  {
    id: 'jalanDitutup', headline: 'Jalan Utama Ditutup untuk Perbaikan!', desc: 'Lalu lintas pejalan kaki di satu lokasi turun 35%.',
    weight: 1, scope: 'random', effect: { traffic: 0.65 }, good: 'bad',
  },
  {
    id: 'gulaNaik', headline: 'Harga Gula Pasir Naik di Pemasok!', desc: 'Harga beli gula hari ini +30%.',
    weight: 1, scope: 'all', effect: { supply: { sugar: 1.3 } }, good: 'bad',
  },
  {
    id: 'esLangka', headline: 'Pabrik Es Gangguan, Harga Es Naik!', desc: 'Harga beli es batu hari ini +40%. Kotak es & cooler makin berharga.',
    weight: 1.2, scope: 'all', when: (c) => hot(c) || c.weather === 'hangat', effect: { supply: { ice: 1.4 } }, good: 'bad',
  },
  {
    id: 'viral', headline: 'Es Teh Viral di Media Sosial!', desc: 'Minat beli +12% dan popularitas naik lebih cepat dari biasanya.',
    weight: 1, scope: 'all', effect: { thirst: 1.12, popularityGain: 1.3 }, good: 'good',
  },
  {
    id: 'hariPasaran', headline: 'Hari Pasaran Legi: Pasar Lebih Ramai!', desc: 'Pasar Tradisional dipadati pembeli (+50% pejalan kaki).',
    weight: 1.5, scope: 'pasar', effect: { traffic: 1.5 }, good: 'good',
  },
  {
    id: 'liburNasional', headline: 'Hari Libur Nasional: Kantor & Sekolah Tutup', desc: 'Sekolah & perkantoran sepi, taman dan perumahan lebih ramai.',
    weight: 0.8, scope: 'all', effect: {},
    byLocation: { sekolah: { traffic: 0.3 }, kampus: { traffic: 0.3 }, kota: { traffic: 0.7 }, perkantoran: { traffic: 0.35 }, premium: { traffic: 0.85 }, taman: { traffic: 1.35 }, asri: { traffic: 1.25 }, pasar: { traffic: 1.1 }, terminal: { traffic: 1.4 }, alunalun: { traffic: 1.4 }, pantai: { traffic: 1.5 } },
    good: 'mixed',
  },
  {
    id: 'kurangiGula', headline: 'Kampanye "Kurangi Gula" Ramai Dibicarakan', desc: 'Pembeli hari ini lebih suka es teh yang kurang manis (selera gula −0,8 sdm).',
    weight: 1, scope: 'all', effect: { sugarPref: -0.8 }, good: 'mixed',
  },
  {
    id: 'pameran', headline: 'Pameran Bisnis di Kawasan Premium!', desc: 'Banyak eksekutif dan tamu pameran berlalu-lalang di Kawasan Premium.',
    weight: 1, scope: 'premium', when: weekday, effect: { traffic: 1.35, budget: 1.1, segments: ['eksekutif', 'pekerja'], segmentTraffic: 1.5 }, good: 'good',
  },
  {
    id: 'konserTaman', headline: 'Konser Musik Gratis di Taman Kota!', desc: 'Taman Kota sangat ramai, tapi banyak pedagang dadakan ikut berjualan.',
    weight: 0.8, scope: 'taman', when: (c) => !wet(c), effect: { traffic: 1.6, competition: 0.15 }, good: 'mixed',
  },
  {
    id: 'ujianSekolah', headline: 'Musim Ujian: Pelajar Pulang Lebih Awal', desc: 'Pelajar lebih sedikit dan lebih hemat uang jajan.',
    weight: 0.8, scope: 'sekolah', when: weekday, effect: { traffic: 0.75, budget: 0.9, segments: ['pelajar'] }, good: 'bad',
  },
  {
    id: 'arusMudik', headline: 'Arus Mudik: Terminal Penuh Sesak!', desc: 'Terminal Angkutan dipadati pemudik (+60% pejalan kaki), semuanya terburu-buru.',
    weight: 1, scope: 'terminal', effect: { traffic: 1.6, segments: ['komuter'], segmentTraffic: 1.3 }, good: 'good',
  },
  {
    id: 'wisuda', headline: 'Wisuda di Kampus Hari Ini!', desc: 'Keluarga wisudawan memenuhi Kampus dan lebih rela membayar.',
    weight: 1, scope: 'kampus', when: weekday, effect: { traffic: 1.45, budget: 1.15 }, good: 'good',
  },
  {
    id: 'pentasSeni', headline: 'Pentas Seni Malam Ini di Alun-Alun!', desc: 'Alun-Alun jauh lebih ramai (+50%), terutama menjelang malam.',
    weight: 1.2, scope: 'alunalun', when: (c) => !wet(c), effect: { traffic: 1.5 }, good: 'good',
  },
  {
    id: 'ombakTinggi', headline: 'Peringatan Ombak Tinggi di Pantai', desc: 'Sebagian pantai ditutup: pengunjung Pantai Wisata turun 50%.',
    weight: 1, scope: 'pantai', effect: { traffic: 0.5 }, good: 'bad',
  },
];

export const EVENT_BY_ID: Record<string, NewsEventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
