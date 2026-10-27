import type { Requirement, UpgradeId } from '../game/types';

export type UpgradeCategory = 'storage' | 'service' | 'cart' | 'business';

export const UPGRADE_CATEGORIES: { id: UpgradeCategory; name: string; desc: string }[] = [
  { id: 'storage', name: 'Penyimpanan Bahan', desc: 'Menambah kapasitas dan menjaga bahan tetap segar.' },
  { id: 'service', name: 'Racik & Saji', desc: 'Menyajikan lebih cepat dan rasa lebih konsisten.' },
  { id: 'cart', name: 'Perlengkapan Gerobak', desc: 'Kanopi, cuaca, lampu, dan perawatan gerobak.' },
  { id: 'business', name: 'Usaha & Pelanggan', desc: 'Menarik pembeli, mengatur antrean, dan membangun langganan.' },
];

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  category: UpgradeCategory;
  desc: string;
  /** Exact gameplay effect (every number here is applied in systems/Modifiers.ts). */
  effect: string;
  price: number;
  req: Requirement;
  /** Not used by roofed carts (kiosk, truck) — they already have shelter. */
  needsOpenCart?: boolean;
}

/** Equipment catalogue. Effects are applied centrally in systems/Modifiers.ts. */
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  // ---------------------------------------------------------------- storage
  kotakEs: {
    id: 'kotakEs', name: 'Kotak Es', category: 'storage',
    desc: 'Kotak styrofoam tebal. Es tidak cepat mencair semalaman.',
    effect: 'Es mencair di malam hari 70% → 30%',
    price: 50_000, req: {},
  },
  cooler: {
    id: 'cooler', name: 'Cooler Box Listrik', category: 'storage',
    desc: 'Pendingin bertenaga aki. Es awet dan minuman lebih dingin.',
    effect: 'Es mencair → 5% · lemon awet · +4 rasa bila es ≥ 2 · +50% kapasitas es',
    price: 140_000, req: { upgrade: 'kotakEs', cups: 300 },
  },
  wadahTeh: {
    id: 'wadahTeh', name: 'Wadah Konsentrat Teh', category: 'storage',
    desc: 'Toples kaca besar untuk teh seduh pekat siap pakai.',
    effect: '+40% kapasitas teh · −5% waktu saji',
    price: 60_000, req: { cups: 100 },
  },
  dispenserGula: {
    id: 'dispenserGula', name: 'Dispenser Gula', category: 'storage',
    desc: 'Wadah gula dengan tuas takar. Tidak tumpah, takaran pas.',
    effect: '+30% kapasitas gula · +1 rasa · −5% waktu saji',
    price: 55_000, req: { cups: 120 },
  },
  rakGelas: {
    id: 'rakGelas', name: 'Rak Gelas Bertingkat', category: 'storage',
    desc: 'Rak susun untuk gelas dan tutup segel.',
    effect: '+50% kapasitas gelas · −5% waktu saji',
    price: 40_000, req: { cups: 80 },
  },
  // ---------------------------------------------------------------- service
  mejaRacik: {
    id: 'mejaRacik', name: 'Meja Racik', category: 'service',
    desc: 'Meja lipat untuk menata gelas dan bahan. Alur kerja lebih rapi.',
    effect: '−10% waktu saji · +2 kapasitas antrean',
    price: 45_000, req: { cups: 40 },
  },
  takaran: {
    id: 'takaran', name: 'Set Gelas Takar', category: 'service',
    desc: 'Gelas ukur dan sendok takar. Setiap gelas rasanya sama.',
    effect: '+3 rasa',
    price: 25_000, req: { cups: 30 },
  },
  seduh: {
    id: 'seduh', name: 'Panci Seduh Besar', category: 'service',
    desc: 'Panci seduh 20 liter. Teh selalu siap, aroma lebih keluar.',
    effect: '−10% waktu saji · +2 rasa',
    price: 70_000, req: { cups: 60 },
  },
  dispenser: {
    id: 'dispenser', name: 'Dispenser Teh', category: 'service',
    desc: 'Tabung dispenser kaca berkeran. Teh seduhan konsisten setiap gelas.',
    effect: '−20% waktu saji · +5 rasa · tidak ada penurunan rasa saat antre ramai',
    price: 90_000, req: { cups: 80 },
  },
  kontrolMutu: {
    id: 'kontrolMutu', name: 'Termometer & Timer Seduh', category: 'service',
    desc: 'Alat kontrol mutu: suhu dan waktu seduh selalu tepat.',
    effect: '+1 rasa · +2 kepuasan',
    price: 120_000, req: { cups: 800 },
  },
  qris: {
    id: 'qris', name: 'Kasir QRIS', category: 'service',
    desc: 'Pembayaran scan QR dan uang elektronik. Tidak perlu repot kembalian.',
    effect: '−15% waktu saji · +5% batas harga pembeli · tip sedikit lebih sering',
    price: 160_000, req: { cups: 500 },
  },
  // ---------------------------------------------------------------- cart
  payung: {
    id: 'payung', name: 'Payung Besar', category: 'cart',
    desc: 'Payung lebar bergaris amber-krem. Teduh saat panas, tetap buka saat gerimis.',
    effect: '+10% daya tarik · +4 kepuasan saat cerah/panas · dampak hujan −30% (gerobak terbuka)',
    price: 35_000, req: {}, needsOpenCart: true,
  },
  terpal: {
    id: 'terpal', name: 'Terpal Anti Hujan', category: 'cart',
    desc: 'Terpal transparan yang bisa diturunkan saat hujan.',
    effect: 'Dampak hujan −25% (gerobak terbuka)',
    price: 45_000, req: { cups: 150 }, needsOpenCart: true,
  },
  rodaKaret: {
    id: 'rodaKaret', name: 'Roda & Sasis Baru', category: 'cart',
    desc: 'Roda karet dan sasis baru. Gerobak jarang rusak.',
    effect: '−40% biaya perawatan harian gerobak',
    price: 120_000, req: { cups: 600 },
  },
  lampu: {
    id: 'lampu', name: 'Lampu Malam', category: 'cart',
    desc: 'Lampu LED terang. Lapak tetap buka setelah magrib.',
    effect: 'Jam tutup 19:00 → 21:00 (lebih banyak jam jualan)',
    price: 110_000, req: { cups: 250 },
  },
  lampuHias: {
    id: 'lampuHias', name: 'Lampu Hias Warna-warni', category: 'cart',
    desc: 'Untaian bohlam warna-warni di kanopi. Cantik di foto pembeli.',
    effect: '+8% daya tarik',
    price: 65_000, req: { cups: 250 },
  },
  // ---------------------------------------------------------------- business
  papanNama: {
    id: 'papanNama', name: 'Papan Nama', category: 'business',
    desc: 'Papan nama berdiri yang menampilkan harga. Orang dari jauh pun melihat.',
    effect: '+15% daya tarik · jangkauan pandang +2 petak · +20% kenaikan popularitas',
    price: 70_000, req: { cups: 150 },
  },
  papanMenu: {
    id: 'papanMenu', name: 'Papan Menu Kapur', category: 'business',
    desc: 'Papan menu tulisan kapur yang ramah dan jelas.',
    effect: '+5% daya tarik · +4% batas harga pembeli',
    price: 35_000, req: { cups: 100 },
  },
  tiangAntre: {
    id: 'tiangAntre', name: 'Tiang & Tali Antrean', category: 'business',
    desc: 'Antrean tertib, pembeli tidak merasa diserobot.',
    effect: '+3 kapasitas antrean · pembeli 15% lebih sabar',
    price: 75_000, req: { cups: 300 },
  },
  kartuStempel: {
    id: 'kartuStempel', name: 'Kartu Stempel Langganan', category: 'business',
    desc: 'Beli 9 gratis 1. Pembeli puas lebih mudah jadi langganan.',
    effect: 'Peluang jadi pelanggan tetap +40% · pelanggan tetap datang 20% lebih sering',
    price: 90_000, req: { cups: 400 },
  },
};

export const UPGRADE_ORDER: UpgradeId[] = [
  'kotakEs', 'cooler', 'wadahTeh', 'dispenserGula', 'rakGelas',
  'mejaRacik', 'takaran', 'seduh', 'dispenser', 'kontrolMutu', 'qris',
  'payung', 'terpal', 'rodaKaret', 'lampu', 'lampuHias',
  'papanNama', 'papanMenu', 'tiangAntre', 'kartuStempel',
];
