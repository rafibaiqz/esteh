import type { WeatherId } from '../game/types';

export interface WeatherDef {
  id: WeatherId;
  name: string;
  /** Peak-temperature range in °C (configurable). */
  temp: [number, number];
  /** Outdoor pedestrian volume multiplier (shelter can soften rain penalties). */
  traffic: number;
  /** Condition multiplier on the desire for an iced drink, on top of temperature. */
  mood: number;
  /** Multiplier on customers' price ceiling. */
  budget: number;
  /** Multiplier on price elasticity (higher = customers react more to price). */
  priceSensitivity: number;
  /** Shift of customers' preferred ice cubes. The player's recipe is never changed. */
  iceShift: number;
  /** Visuals */
  rain: number;
  wind: number;
  cloud: number;
  heat: number;
  lightning: boolean;
  /** Short explanation for the UI. */
  effect: string;
  advice: string;
}

export const WEATHER: Record<WeatherId, WeatherDef> = {
  terik: {
    id: 'terik', name: 'Panas Terik', temp: [35, 38], traffic: 1.05, mood: 1.05, budget: 1.15, priceSensitivity: 0.85, iceShift: 1,
    rain: 0, wind: 0, cloud: 0, heat: 1, lightning: false,
    effect: 'Semua orang kehausan. Permintaan melonjak dan pembeli rela bayar sedikit lebih mahal.',
    advice: 'Stok es, teh, gula, dan gelas harus banyak. Harga boleh naik sedikit.',
  },
  panas: {
    id: 'panas', name: 'Panas Cerah', temp: [32, 35], traffic: 1.1, mood: 1.05, budget: 1.1, priceSensitivity: 0.9, iceShift: 0.5,
    rain: 0, wind: 0, cloud: 0, heat: 0.6, lightning: false,
    effect: 'Cuaca ideal untuk es teh: banyak pembeli potensial dan permintaan tinggi.',
    advice: 'Siapkan stok lebih dari biasa, terutama es.',
  },
  hangat: {
    id: 'hangat', name: 'Cerah Hangat', temp: [29, 32], traffic: 1.05, mood: 1, budget: 1.05, priceSensitivity: 1, iceShift: 0,
    rain: 0, wind: 0, cloud: 0, heat: 0.25, lightning: false,
    effect: 'Hari yang menyenangkan. Permintaan di atas rata-rata.',
    advice: 'Stok sedikit di atas normal, harga wajar.',
  },
  cerahBerawan: {
    id: 'cerahBerawan', name: 'Cerah Berawan', temp: [28, 31], traffic: 1.05, mood: 0.98, budget: 1, priceSensitivity: 1, iceShift: 0,
    rain: 0, wind: 0.1, cloud: 0.25, heat: 0, lightning: false,
    effect: 'Matahari sesekali tertutup awan. Permintaan normal hingga cukup tinggi.',
    advice: 'Stok normal.',
  },
  berawan: {
    id: 'berawan', name: 'Berawan', temp: [26, 29], traffic: 1, mood: 0.92, budget: 0.97, priceSensitivity: 1.05, iceShift: 0,
    rain: 0, wind: 0.15, cloud: 0.5, heat: 0, lightning: false,
    effect: 'Tidak terlalu panas, orang tidak terlalu haus. Penjualan lebih sedikit.',
    advice: 'Hindari belanja besar-besaran dan biaya yang tidak perlu.',
  },
  mendung: {
    id: 'mendung', name: 'Mendung', temp: [25, 28], traffic: 0.95, mood: 0.88, budget: 0.95, priceSensitivity: 1.1, iceShift: -0.3,
    rain: 0, wind: 0.2, cloud: 0.75, heat: 0, lightning: false,
    effect: 'Langit gelap, minat minuman dingin turun. Kebutuhan bahan lebih sedikit.',
    advice: 'Stok secukupnya saja, es sisa akan mencair.',
  },
  berangin: {
    id: 'berangin', name: 'Sejuk Berangin', temp: [21, 25], traffic: 0.85, mood: 0.8, budget: 0.9, priceSensitivity: 1.3, iceShift: -1,
    rain: 0, wind: 1, cloud: 0.35, heat: 0, lightning: false,
    effect: 'Udara sejuk, angin kencang. Permintaan rendah dan pembeli sangat peka harga.',
    advice: 'Harga bersaing lebih penting dari biasanya. Stok sedikit.',
  },
  gerimis: {
    id: 'gerimis', name: 'Gerimis', temp: [24, 27], traffic: 0.72, mood: 0.85, budget: 0.92, priceSensitivity: 1.15, iceShift: -0.5,
    rain: 0.35, wind: 0.2, cloud: 0.6, heat: 0, lightning: false,
    effect: 'Pejalan kaki berkurang dan yang lewat lebih jarang membeli.',
    advice: 'Kurangi stok es. Harga sedikit lebih murah bisa membantu.',
  },
  hujan: {
    id: 'hujan', name: 'Hujan Deras', temp: [22, 25], traffic: 0.45, mood: 0.75, budget: 0.88, priceSensitivity: 1.2, iceShift: -0.8,
    rain: 1, wind: 0.4, cloud: 0.85, heat: 0, lightning: false,
    effect: 'Jalanan sepi. Penjualan turun drastis, risiko stok tidak terjual tinggi.',
    advice: 'Beli sedikit saja. Payung/kios beratap dan lokasi teduh (Pasar, Kota) mengurangi dampaknya.',
  },
  badai: {
    id: 'badai', name: 'Badai Petir', temp: [22, 25], traffic: 0.3, mood: 0.65, budget: 0.85, priceSensitivity: 1.25, iceShift: -0.8,
    rain: 1.3, wind: 0.8, cloud: 1, heat: 0, lightning: true,
    effect: 'Hampir tidak ada yang keluar rumah. Pertimbangkan libur atau lokasi teduh.',
    advice: 'Stok minimum. Biaya buka bisa lebih besar dari pendapatan.',
  },
};

/** Ordered from hottest/driest to wettest; adjacent entries are "neighbouring" weather. */
export const WEATHER_ORDER: WeatherId[] = ['terik', 'panas', 'hangat', 'cerahBerawan', 'berawan', 'mendung', 'berangin', 'gerimis', 'hujan', 'badai'];

/** Base probability of each weather on a given day (tropical: mostly sunny, sometimes rain). */
export const WEATHER_ODDS: Record<WeatherId, number> = {
  terik: 0.08,
  panas: 0.17,
  hangat: 0.2,
  cerahBerawan: 0.15,
  berawan: 0.1,
  mendung: 0.08,
  berangin: 0.04,
  gerimis: 0.08,
  hujan: 0.06,
  badai: 0.04,
};

/** Maps weather ids from older saves. */
export const LEGACY_WEATHER: Record<string, WeatherId> = { cerah: 'hangat' };

export function isWeatherId(v: unknown): v is WeatherId {
  return typeof v === 'string' && v in WEATHER;
}

export function migrateWeather(v: unknown): WeatherId {
  if (isWeatherId(v)) return v;
  if (typeof v === 'string' && LEGACY_WEATHER[v]) return LEGACY_WEATHER[v];
  return 'hangat';
}
