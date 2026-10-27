/**
 * Central tuning parameters. Gameplay formulas read their coefficients from
 * here so balancing never requires hunting for magic numbers in the code.
 */
export const BALANCE = {
  service: {
    /** Seconds (simulated) to prepare one cup with the basic cart and no help. */
    baseTime: 3.0,
    /** Fraction of theoretical service capacity achievable in practice (used by forecasts). */
    efficiency: 0.92,
  },

  taste: {
    /** Penalty points per recipe unit away from a customer's preference. */
    weights: { tea: 15, sugar: 12, ice: 7 },
    lemonLike: 6,
    lemonDislike: 5,
    /** Penalty above which the biggest deviation becomes a complaint. */
    complaintThreshold: 12,
  },

  quality: {
    /** Weight of the current recipe's expected taste vs. the location's taste reputation. */
    recipeWeight: 0.6,
    /** Rolling-average speed of the location's taste reputation. */
    reputationAlpha: 0.05,
    /** interest × (base + span × quality/100) */
    interestBase: 0.85,
    interestSpan: 0.3,
    /** Fair price multiplier = 1 + location.qualityWeight × (quality − pivot)/100, clamped. */
    pricePivot: 70,
    priceMin: 0.75,
    priceMax: 1.4,
  },

  demand: {
    /** Thirst rises 4.5% per °C above 29 °C (and falls below it). */
    tempPivot: 29,
    tempSlope: 0.045,
    tempMin: 0.6,
    tempMax: 1.4,
    /** Rival vendors steal up to this share of interest at competition = 1. */
    competitionWeight: 0.4,
    priceFactorMin: 0.1,
    priceFactorMax: 1.8,
    /** Budget spread of individual customers (standard deviation as a fraction). */
    budgetSpread: 0.15,
    maxInterest: 0.95,
  },

  satisfaction: {
    /** Penalty per unit of (price / fair price) above `priceFree`, scaled by the customer's price sensitivity. */
    priceFree: 0.9,
    pricePerUnit: 45,
    /** Extra penalty when the price nears the customer's own budget. */
    budgetFree: 0.85,
    budgetPerUnit: 30,
    /** Bonus for prices clearly below fair value. */
    valueBelow: 0.85,
    valuePerUnit: 20,
    valueMax: 6,
    /** Waiting longer than this share of patience starts to hurt. */
    waitFree: 0.35,
    waitPerUnit: 35,
    /** Rushed brewing without a dispenser when the queue is long. */
    rushQueue: 4,
    rushPenalty: 3,
    dispenserConsistency: 3,
    coolerFreshness: 3,
    noStorageHotPenalty: 2,
    emaAlpha: 0.06,
    happy: 70,
    neutral: 45,
  },

  tips: {
    /** No tips below this satisfaction. */
    minSatisfaction: 78,
    /** Chance at satisfaction 100 for an average customer. */
    maxChance: 0.3,
    curve: 1.5,
    /** Tip as a share of the price, before customer multipliers. */
    shareMin: 0.1,
    shareMax: 0.22,
    capShare: 0.3,
    /** Premium customers tip a bit more generously. */
    premiumMult: 1.3,
    capAmount: 5_000,
    minAmount: 100,
    service: { penjual: 0.1, supervisor: 0.15, qris: 0.1 },
  },

  popularity: {
    perSale: 0.5,
    fairPriceBonus: 0.05,
    regularBonus: 0.05,
    lost: { price: 0.05, queue: 0.15, patience: 0.4, stock: 0.25 },
    /** Daily caps so popularity moves gradually. */
    maxGainPerDay: 8,
    maxLossPerDay: 10,
    /** Overnight drift towards the location's baseline. */
    decay: 0.05,
    decaySupervisor: 0.025,
  },

  regulars: {
    /** Chance that a satisfied (≥ minSatisfaction) newcomer becomes a regular: base + span × (sat − min)/(100 − min). */
    minSatisfaction: 75,
    joinBase: 0.12,
    joinSpan: 0.35,
    /** A regular who leaves unhappy (< this) stops coming. */
    quitBelow: 55,
    /** Share of the pool visiting on a normal day. */
    visitShare: 0.35,
    interest: 0.85,
    dailyDecay: 0.05,
    /** Pool cap = location traffic × this. */
    capPerTraffic: 3,
  },

  spoilage: {
    iceMelt: { none: 0.7, kotakEs: 0.3, cooler: 0.05 },
    lemonWilt: { none: 0.25, cooler: 0.05 },
  },

  weather: {
    /** Probability the forecast is exactly right; otherwise it is off by one step. */
    forecastAccuracy: 0.75,
    /** Chance the weather shifts by one step at 13:00. */
    afternoonShift: 0.25,
    persistence: 0.12,
    neighbour: 0.05,
    /** Max share of the rain traffic penalty that shelter + equipment can remove. */
    maxShelter: 0.8,
  },

  plan: {
    /** Recommended stock = expected use × safety (ice uses its own factor because leftovers melt). */
    safety: 1.15,
    iceSafety: 1.08,
  },

  reactions: {
    /** Max text reactions on screen at once; extra customers show an icon only. */
    maxVisible: 3,
    seconds: 3.2,
    feedSize: 5,
  },

  weekend: { days: [5, 6] as number[] },
} as const;
