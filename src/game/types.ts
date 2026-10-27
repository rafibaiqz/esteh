// Core shared types. The GameState is the single authoritative, serialisable
// game state; everything visual (customers, vehicles, particles) lives in the
// runtime World and is regenerated from it.

export type Ingredient = 'tea' | 'sugar' | 'ice' | 'cups' | 'lemon';
export const INGREDIENTS: Ingredient[] = ['tea', 'sugar', 'ice', 'cups', 'lemon'];

export type LocationId = 'asri' | 'sekolah' | 'kampus' | 'taman' | 'terminal' | 'kota' | 'alunalun' | 'perkantoran' | 'pasar' | 'pantai' | 'premium';
export type WeatherId =
  | 'terik'
  | 'panas'
  | 'hangat'
  | 'cerahBerawan'
  | 'berawan'
  | 'mendung'
  | 'berangin'
  | 'gerimis'
  | 'hujan'
  | 'badai';
export type CartId = 'gerobak' | 'mobile' | 'gerobakPlus' | 'modern' | 'vintage' | 'kios' | 'premium' | 'festival' | 'truk';
export type UpgradeId =
  | 'payung'
  | 'kotakEs'
  | 'dispenser'
  | 'mejaRacik'
  | 'cooler'
  | 'papanNama'
  | 'lampu'
  | 'qris'
  | 'seduh'
  | 'wadahTeh'
  | 'dispenserGula'
  | 'rakGelas'
  | 'takaran'
  | 'tiangAntre'
  | 'papanMenu'
  | 'kartuStempel'
  | 'terpal'
  | 'rodaKaret'
  | 'kontrolMutu'
  | 'lampuHias';
export type StaffRole = 'penjual' | 'peracik' | 'kasir' | 'supervisor';
export type CampaignId = 'brosur' | 'spanduk' | 'promoRT' | 'sosmed' | 'radio';
export type FeatureId = 'lemon';

/** 'prep' = before opening (time frozen), 'open' = trading, 'report' = end-of-day summary. */
export type Phase = 'prep' | 'open' | 'report';
export type LostReason = 'price' | 'queue' | 'patience' | 'stock';
export type Complaint =
  | 'teaWeak'
  | 'teaStrong'
  | 'sugarLow'
  | 'sugarHigh'
  | 'iceLow'
  | 'iceHigh'
  | 'pricey'
  | 'slow';

export interface Recipe {
  tea: number;
  sugar: number;
  ice: number;
  lemon: number;
}

export interface InventoryItem {
  qty: number;
  /** Weighted-average purchase cost per unit (Rupiah, may be fractional). */
  avgCost: number;
}

export interface DayLedger {
  day: number;
  locationId: LocationId;
  weather: WeatherId;
  cashStart: number;
  cupsSold: number;
  /** Drink revenue only (price × cups). Tips are recorded separately. */
  revenue: number;
  tips: number;
  tipCount: number;
  /** Selling price and recipe in effect when the day opened (for analytics). */
  price: number;
  recipe: Recipe;
  eventId: string;
  popularityStart: number;
  popularityEnd?: number;
  /** Popularity gained / lost from customer experiences today (capped per day). */
  popGain: number;
  popLoss: number;
  regularsServed: number;
  /** Cost of ingredients actually consumed in sold cups (weighted average cost). */
  ingredientCost: number;
  /** Ice / lemon lost to melting or spoilage at closing. */
  wasteCost: number;
  rent: number;
  wages: number;
  maintenance: number;
  advertising: number;
  hiring: number;
  bonus: number;
  /** Cash spent buying supplies (cash flow, not an expense until consumed). */
  supplyPurchases: number;
  /** One-off investments: carts, equipment, location permits, recipes. */
  capex: number;
  passersby: number;
  customersServed: number;
  lost: Record<LostReason, number>;
  satisfactionSum: number;
  feedback: { happy: number; neutral: number; unhappy: number };
  complaints: Record<Complaint, number>;
  unlocks: string[];
  meltedIce: number;
  cashEnd?: number;
}

export interface Campaign {
  id: CampaignId;
  locationId: LocationId;
  daysLeft: number;
  /** Day the campaign was launched (its first day's popularity boost is applied at launch). */
  startDay: number;
}

export interface LocationProgress {
  popularity: number; // 0..100
  satisfaction: number; // 0..100 rolling average
  /** Rolling average taste score of drinks sold here (taste reputation). */
  quality: number;
  /** Size of the pool of loyal regular customers. */
  regulars: number;
  cupsSold: number;
  revenue: number;
  daysOpen: number;
}

export interface Totals {
  cupsSold: number;
  revenue: number;
  tips: number;
  profit: number;
  customersServed: number;
  lostCustomers: number;
  daysPlayed: number;
  bestDayProfit: number;
  bestDaySatisfaction: number;
  ingredientCost: number;
  operatingCost: number;
}

export interface GameState {
  version: number;
  /** Unique id of this save slot (never derived from the names). */
  saveId: string;
  ownerName: string;
  businessName: string;
  /** Appearance preset of the stall owner (see render/characters SELLER_LOOKS). */
  sellerLook: string;
  cash: number;
  day: number;
  phase: Phase;
  /** Minutes since midnight. */
  timeMin: number;
  speed: number;
  paused: boolean;
  weather: WeatherId;
  /** Weather from 13:00 onward (may differ from morning). */
  weatherLater: WeatherId;
  /** Today's peak temperature in °C. */
  temperature: number;
  forecast: Forecast;
  /** Today's news headline / special event. */
  event: ActiveEvent;
  locationId: LocationId;
  unlockedLocations: LocationId[];
  locations: Record<LocationId, LocationProgress>;
  inventory: Record<Ingredient, InventoryItem>;
  recipe: Recipe;
  price: number;
  ownedCarts: CartId[];
  activeCart: CartId;
  upgrades: UpgradeId[];
  staff: StaffRole[];
  campaigns: Campaign[];
  features: FeatureId[];
  goalsDone: string[];
  today: DayLedger;
  history: DayLedger[];
  totals: Totals;
  rngSeed: number;
  hintsSeen: string[];
}

export interface Forecast {
  /** Forecast shown to the player for tomorrow. */
  weather: WeatherId;
  tempLo: number;
  tempHi: number;
  /** What will actually happen (forecasts are right most of the time, not always). */
  actual: WeatherId;
  actualTemp: number;
}

export interface ActiveEvent {
  id: string;
  /** Location the event applies to, or null when it applies everywhere. */
  locationId: LocationId | null;
  /** Headline text (neutral days pick a flavour headline). */
  headline: string;
}

/** A requirement for unlocking something. All present fields must hold. */
export interface Requirement {
  cups?: number;
  satisfaction?: number;
  locations?: number;
  upgrade?: UpgradeId;
  location?: LocationId;
  day?: number;
}
