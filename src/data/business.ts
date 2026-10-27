import type { CampaignId, Requirement, StaffRole } from '../game/types';

// ---------------------------------------------------------------- Staff

export interface StaffDef {
  id: StaffRole;
  name: string;
  desc: string;
  effect: string;
  hireCost: number;
  wage: number;
  req: Requirement;
  shirt: string;
}

export const STAFF: Record<StaffRole, StaffDef> = {
  penjual: {
    id: 'penjual',
    name: 'Penjual',
    desc: 'Menyapa dan memanggil pejalan kaki. "Es teh, es teh, segerrr!"',
    effect: '+12% daya tarik · pembeli 15% lebih sabar mengantre',
    hireCost: 15_000,
    wage: 12_000,
    req: {},
    shirt: '#e8c547',
  },
  peracik: {
    id: 'peracik',
    name: 'Peracik Teh',
    desc: 'Menyeduh dan meracik teh dengan cekatan.',
    effect: '-25% waktu saji',
    hireCost: 20_000,
    wage: 16_000,
    req: { cups: 60 },
    shirt: '#d9534f',
  },
  kasir: {
    id: 'kasir',
    name: 'Kasir',
    desc: 'Mengurus pembayaran dan kembalian sehingga antrean lancar.',
    effect: '-15% waktu saji · +2 kapasitas antrean',
    hireCost: 25_000,
    wage: 18_000,
    req: { cups: 200 },
    shirt: '#4a90d9',
  },
  supervisor: {
    id: 'supervisor',
    name: 'Supervisor',
    desc: 'Mengawasi mutu dan pelayanan. Pelanggan merasa diperhatikan.',
    effect: '+4 kepuasan · efek staf lain +10% · popularitas turun setengah lebih lambat',
    hireCost: 60_000,
    wage: 35_000,
    req: { cups: 1000, locations: 3 },
    shirt: '#333a44',
  },
};

export const STAFF_ORDER: StaffRole[] = ['penjual', 'peracik', 'kasir', 'supervisor'];

// ---------------------------------------------------------------- Marketing

export interface CampaignDef {
  id: CampaignId;
  name: string;
  desc: string;
  cost: number;
  days: number;
  /** Awareness points while active (diminishing returns, see Modifiers.adEffect). */
  awareness: number;
  /** Popularity added to the location each day the campaign runs. */
  popularityPerDay: number;
  req: Requirement;
}

export const CAMPAIGNS: Record<CampaignId, CampaignDef> = {
  brosur: {
    id: 'brosur',
    name: 'Brosur',
    desc: 'Sebar 200 lembar brosur fotokopi di sekitar lapak.',
    cost: 8_000,
    days: 1,
    awareness: 12,
    popularityPerDay: 0,
    req: {},
  },
  spanduk: {
    id: 'spanduk',
    name: 'Spanduk Lokal',
    desc: 'Spanduk kain di tiang listrik dekat lapak selama 3 hari.',
    cost: 24_000,
    days: 3,
    awareness: 14,
    popularityPerDay: 1,
    req: {},
  },
  promoRT: {
    id: 'promoRT',
    name: 'Promo Lingkungan',
    desc: 'Kartu stempel "beli 5 gratis 1" dibagikan ke warga sekitar.',
    cost: 30_000,
    days: 2,
    awareness: 8,
    popularityPerDay: 4,
    req: { cups: 50 },
  },
  sosmed: {
    id: 'sosmed',
    name: 'Promo Media Sosial',
    desc: 'Konten video pendek dan iklan bertarget di sekitar lokasi.',
    cost: 45_000,
    days: 2,
    awareness: 26,
    popularityPerDay: 2,
    req: { cups: 150 },
  },
  radio: {
    id: 'radio',
    name: 'Iklan Radio & Baliho',
    desc: 'Kampanye premium: jingle radio lokal dan baliho di jalan utama.',
    cost: 160_000,
    days: 4,
    awareness: 45,
    popularityPerDay: 3,
    req: { cups: 1000, location: 'kota' },
  },
};

export const CAMPAIGN_ORDER: CampaignId[] = ['brosur', 'spanduk', 'promoRT', 'sosmed', 'radio'];
export const MAX_ACTIVE_CAMPAIGNS = 4;

// ---------------------------------------------------------------- Goals

export interface GoalDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
  target: number;
  /** Which progress metric this goal measures (see ProgressionSystem.goalProgress). */
  metric: 'cups' | 'bestProfit' | 'bestSatisfaction' | 'locations' | 'carts' | 'staff' | 'cash' | 'upgrades' | 'tips' | 'regulars';
}

export const GOALS: GoalDef[] = [
  { id: 'cups10', name: 'Gelas Pertama', desc: 'Jual 10 gelas es teh', reward: 5_000, target: 10, metric: 'cups' },
  { id: 'cups100', name: 'Juragan Kecil', desc: 'Jual total 100 gelas', reward: 15_000, target: 100, metric: 'cups' },
  { id: 'profit50', name: 'Hari Yang Manis', desc: 'Laba bersih ≥ Rp 50.000 dalam sehari', reward: 20_000, target: 50_000, metric: 'bestProfit' },
  { id: 'sat80', name: 'Pelanggan Puas', desc: 'Tutup hari dengan kepuasan rata-rata ≥ 80%', reward: 25_000, target: 80, metric: 'bestSatisfaction' },
  { id: 'upg3', name: 'Lapak Lengkap', desc: 'Miliki 3 peralatan', reward: 20_000, target: 3, metric: 'upgrades' },
  { id: 'loc3', name: 'Ekspansi', desc: 'Buka izin 3 lokasi', reward: 50_000, target: 3, metric: 'locations' },
  { id: 'cups500', name: 'Laris Manis', desc: 'Jual total 500 gelas', reward: 50_000, target: 500, metric: 'cups' },
  { id: 'staff3', name: 'Tim Solid', desc: 'Pekerjakan 3 staf sekaligus', reward: 30_000, target: 3, metric: 'staff' },
  { id: 'profit250', name: 'Panen Raya', desc: 'Laba bersih ≥ Rp 250.000 dalam sehari', reward: 100_000, target: 250_000, metric: 'bestProfit' },
  { id: 'carts3', name: 'Armada Esteh', desc: 'Miliki 3 gerobak/kendaraan', reward: 100_000, target: 3, metric: 'carts' },
  { id: 'cups2000', name: 'Raja Es Teh', desc: 'Jual total 2.000 gelas', reward: 150_000, target: 2000, metric: 'cups' },
  { id: 'tips50', name: 'Rezeki Tambahan', desc: 'Kumpulkan tip total Rp 50.000', reward: 20_000, target: 50_000, metric: 'tips' },
  { id: 'regulars25', name: 'Pelanggan Setia', desc: 'Punya 25 pelanggan tetap (semua lokasi)', reward: 40_000, target: 25, metric: 'regulars' },
  { id: 'loc5', name: 'Kerajaan Esteh', desc: 'Buka izin di lima lokasi', reward: 300_000, target: 5, metric: 'locations' },
  { id: 'loc6', name: 'Penguasa Kota', desc: 'Buka izin di enam lokasi', reward: 200_000, target: 6, metric: 'locations' },
  { id: 'upg12', name: 'Lapak Super Lengkap', desc: 'Miliki 12 peralatan', reward: 150_000, target: 12, metric: 'upgrades' },
  { id: 'carts6', name: 'Juragan Gerobak', desc: 'Miliki 6 gerobak/kendaraan', reward: 250_000, target: 6, metric: 'carts' },
  { id: 'loc11', name: 'Es Teh Se-Kota', desc: 'Buka izin di kesebelas lokasi', reward: 500_000, target: 11, metric: 'locations' },
  { id: 'cash5m', name: 'Taipan Esteh', desc: 'Kumpulkan kas Rp 5.000.000', reward: 0, target: 5_000_000, metric: 'cash' },
];

// ---------------------------------------------------------------- Advanced recipes

export interface FeatureDef {
  id: 'lemon';
  name: string;
  desc: string;
  price: number;
  req: Requirement;
}

export const FEATURES: Record<'lemon', FeatureDef> = {
  lemon: {
    id: 'lemon',
    name: 'Resep Es Teh Lemon',
    desc: 'Membuka bahan Irisan Lemon. Disukai pekerja kantoran dan pengunjung taman, kurang disukai pembeli pasar.',
    price: 40_000,
    req: { cups: 200 },
  },
};
