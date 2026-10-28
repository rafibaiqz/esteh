import { BALANCE } from '../data/balance';
import { WEATHER, WEATHER_ODDS, WEATHER_ORDER, type WeatherDef } from '../data/weather';
import type { Forecast, GameState, WeatherId } from '../game/types';
import { mulberry32, weightedPick } from '../util/rng';

/** Hour at which the afternoon weather (`weatherLater`) takes over. */
export const SHIFT_HOUR = 13;

/** Seeded RNG for a given day and purpose, so a save always replays the same weather. */
function dayRng(s: GameState, day: number, salt: number): () => number {
  return mulberry32((s.rngSeed ^ Math.imul(day, 2654435761) ^ Math.imul(salt, 40503)) >>> 0);
}

function stepWeather(id: WeatherId, delta: number): WeatherId {
  const i = WEATHER_ORDER.indexOf(id) + delta;
  return WEATHER_ORDER[Math.max(0, Math.min(WEATHER_ORDER.length - 1, i))];
}

/**
 * Next day's weather: base climate odds, plus a bonus for staying the same and
 * for neighbouring conditions, so streaks happen but surprises remain possible.
 */
function rollNext(prev: WeatherId, rng: () => number): WeatherId {
  const pi = WEATHER_ORDER.indexOf(prev);
  const items = WEATHER_ORDER.map((id, i) => ({
    value: id,
    weight: WEATHER_ODDS[id] + (id === prev ? BALANCE.weather.persistence : Math.abs(i - pi) === 1 ? BALANCE.weather.neighbour : 0),
  }));
  return weightedPick(items, rng());
}

function rollTemp(id: WeatherId, rng: () => number): number {
  const [lo, hi] = WEATHER[id].temp;
  return Math.round(lo + rng() * (hi - lo));
}

/** Creates tomorrow's forecast (and the hidden actual outcome) from today's weather. */
export function rollForecast(s: GameState): Forecast {
  const rng = dayRng(s, s.day + 1, 7);
  const actual = rollNext(s.weather, rng);
  const actualTemp = rollTemp(actual, rng);
  // Forecasts are usually right; otherwise they are off by one step.
  const weather = rng() < BALANCE.weather.forecastAccuracy ? actual : stepWeather(actual, rng() < 0.5 ? -1 : 1);
  const [lo, hi] = WEATHER[weather].temp;
  return { weather, tempLo: lo, tempHi: hi, actual, actualTemp };
}

/** Applies the pre-rolled forecast outcome to today and rolls the next forecast. */
export function advanceWeather(s: GameState): void {
  const f = s.forecast;
  s.weather = f.actual;
  s.temperature = f.actualTemp;
  const rng = dayRng(s, s.day, 13);
  s.weatherLater = rng() < BALANCE.weather.afternoonShift ? stepWeather(s.weather, rng() < 0.5 ? -1 : 1) : s.weather;
  s.forecast = rollForecast(s);
}

/** Fresh game: a dry first day plus a forecast for day 2. */
export function initWeather(s: GameState): void {
  const rng = dayRng(s, 1, 3);
  const opts: WeatherId[] = ['panas', 'hangat', 'hangat', 'cerahBerawan'];
  s.weather = opts[Math.floor(rng() * opts.length)];
  s.weatherLater = s.weather;
  s.temperature = rollTemp(s.weather, rng);
  s.forecast = rollForecast(s);
}

export function currentWeatherId(s: GameState): WeatherId {
  return s.phase === 'open' && s.timeMin >= SHIFT_HOUR * 60 ? s.weatherLater : s.weather;
}

export function currentWeather(s: GameState): WeatherDef {
  return WEATHER[currentWeatherId(s)];
}

/** Hour-by-hour temperature: cool mornings, peak 12:00–15:00, cooling in the evening. */
export function temperatureAt(s: GameState, timeMin: number, weatherId: WeatherId = s.weather): number {
  const base = weatherId === s.weather ? s.temperature : Math.round((WEATHER[weatherId].temp[0] + WEATHER[weatherId].temp[1]) / 2);
  const h = timeMin / 60;
  const curve = h < 9 ? -4 : h < 11 ? -2 : h < 12 ? -1 : h < 15 ? 0 : h < 17 ? -1 : h < 19 ? -2.5 : -4;
  return base + curve;
}

/**
 * The weather right now — the single source every screen shows and the
 * demand model uses (same weather id, same temperature curve, same time).
 * Forecast values (today's peak, the afternoon change, tomorrow) are separate
 * fields and must always be labelled as such when displayed.
 */
export interface WeatherNow {
  id: WeatherId;
  def: WeatherDef;
  /** Temperature at the current game time (°C), as used by demand. */
  temperature: number;
  /** Forecast peak for this weather today (12:00–15:00). */
  peak: number;
  /** Afternoon weather (from 13:00) when it differs from the weather now. */
  later: WeatherId | null;
}

export function weatherNow(s: GameState): WeatherNow {
  const id = currentWeatherId(s);
  return {
    id,
    def: WEATHER[id],
    temperature: temperatureAt(s, s.timeMin, id),
    peak: temperatureAt(s, SHIFT_HOUR * 60, id),
    later: s.weatherLater !== id ? s.weatherLater : null,
  };
}

/** "Cerah Berawan · 26°C" — the one way current weather is written. */
export function weatherNowLabel(now: WeatherNow): string {
  return `${now.def.name} · ${now.temperature}°C`;
}

export function currentTemperature(s: GameState): number {
  return weatherNow(s).temperature;
}

/** Thirst multiplier from temperature alone (1.0 at 29 °C). */
export function temperatureFactor(tempC: number): number {
  const d = BALANCE.demand;
  return Math.max(d.tempMin, Math.min(d.tempMax, 1 + d.tempSlope * (tempC - d.tempPivot)));
}

export function dayPart(timeMin: number): string {
  const h = timeMin / 60;
  if (h < 11) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 18) return 'Sore';
  return 'Malam';
}

export function todayText(s: GameState): string {
  const a = WEATHER[s.weather].name;
  const b = WEATHER[s.weatherLater].name;
  return a === b ? `${a} sepanjang hari, puncak ${s.temperature}°C` : `${a} (puncak ${s.temperature}°C), berubah ${b.toLowerCase()} mulai 13:00`;
}

export function forecastText(s: GameState): string {
  const f = s.forecast;
  return `${WEATHER[f.weather].name}, ${f.tempLo}–${f.tempHi}°C`;
}
