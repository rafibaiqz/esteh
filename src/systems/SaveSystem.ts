import { LOCATIONS } from '../data/locations';
import { newSaveId, sanitizeState } from '../game/GameState';
import type { GameState, LocationId } from '../game/types';

/**
 * Named save slots in LocalStorage. Each game lives under its own key
 * `esteh.slot.<saveId>`; saving the same game always overwrites its own slot,
 * so slots never duplicate and unrelated games are never touched. The list of
 * saves is built by scanning the slot keys, so it cannot drift out of sync.
 */
const SLOT_PREFIX = 'esteh.slot.';
const LEGACY_KEYS = ['esteh.save', 'esteh.save.v1'];

export interface SaveMeta {
  id: string;
  ownerName: string;
  businessName: string;
  day: number;
  locationId: LocationId;
  locationName: string;
  cash: number;
  savedAt: number | null;
  version: number;
  /** The slot exists but its data cannot be loaded. */
  corrupt: boolean;
}

export interface LoadResult {
  state: GameState | null;
  corrupt: boolean;
}

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__esteh_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function storageAvailable(): boolean {
  return storage() !== null;
}

/** One-time conversion of the old single-save format into a named slot. */
function migrateLegacy(s: Storage): void {
  for (const key of LEGACY_KEYS) {
    const raw = s.getItem(key);
    if (raw === null) continue;
    try {
      const state = sanitizeState(JSON.parse(raw));
      if (state) {
        if (!state.saveId) state.saveId = newSaveId();
        s.setItem(SLOT_PREFIX + state.saveId, JSON.stringify({ ...state, savedAt: Date.now() }));
      }
      // Unreadable legacy data is kept under a backup key instead of being lost.
      else s.setItem(`${key}.unreadable`, raw);
    } catch {
      s.setItem(`${key}.unreadable`, raw);
    }
    s.removeItem(key);
  }
}

export function saveSlot(state: GameState): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(SLOT_PREFIX + state.saveId, JSON.stringify({ ...state, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadSlot(id: string): LoadResult {
  const s = storage();
  if (!s) return { state: null, corrupt: false };
  const raw = s.getItem(SLOT_PREFIX + id);
  if (raw === null) return { state: null, corrupt: false };
  try {
    const state = sanitizeState(JSON.parse(raw));
    if (state) state.saveId = id;
    return { state, corrupt: state === null };
  } catch {
    return { state: null, corrupt: true };
  }
}

export function deleteSlot(id: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(SLOT_PREFIX + id);
  } catch {
    /* ignore */
  }
}

/** All saves, most recently played first. */
export function listSaves(): SaveMeta[] {
  const s = storage();
  if (!s) return [];
  migrateLegacy(s);
  const out: SaveMeta[] = [];
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (!key || !key.startsWith(SLOT_PREFIX)) continue;
    const id = key.slice(SLOT_PREFIX.length);
    let meta: SaveMeta = { id, ownerName: '?', businessName: 'Simpanan rusak', day: 0, locationId: 'asri', locationName: '—', cash: 0, savedAt: null, version: 0, corrupt: true };
    try {
      const r = JSON.parse(s.getItem(key) ?? 'null') as Partial<GameState> & { savedAt?: number };
      if (r && typeof r === 'object' && typeof r.cash === 'number' && typeof r.day === 'number') {
        const loc = r.locationId && LOCATIONS[r.locationId] ? r.locationId : 'asri';
        meta = {
          id,
          ownerName: typeof r.ownerName === 'string' ? r.ownerName : 'Juragan',
          businessName: typeof r.businessName === 'string' ? r.businessName : 'ESTEH',
          day: r.day,
          locationId: loc,
          locationName: LOCATIONS[loc].name,
          cash: r.cash,
          savedAt: typeof r.savedAt === 'number' ? r.savedAt : null,
          version: typeof r.version === 'number' ? r.version : 0,
          corrupt: false,
        };
      }
    } catch {
      /* stays marked corrupt */
    }
    out.push(meta);
  }
  return out.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

export function lastPlayed(): SaveMeta | null {
  return listSaves().find((m) => !m.corrupt) ?? null;
}

export function savedAt(id: string): number | null {
  return listSaves().find((m) => m.id === id)?.savedAt ?? null;
}

// ------------------------------------------------------------------ settings

export interface Settings {
  reactions: boolean;
  weatherFx: 'full' | 'light' | 'off';
  zoom: number;
  speed: number;
  hints: boolean;
  /** Audio (shared by every save slot). Volumes are 0–100. */
  muted: boolean;
  musicOn: boolean;
  musicVolume: number;
  sfxOn: boolean;
  sfxVolume: number;
  /** Background music while the pause menu is open. */
  pauseMusic: 'normal' | 'soft' | 'off';
}

const SETTINGS_KEY = 'esteh.settings';
export const DEFAULT_SETTINGS: Settings = {
  reactions: true,
  weatherFx: 'full',
  zoom: 2,
  speed: 1,
  hints: true,
  muted: false,
  musicOn: true,
  musicVolume: 25,
  sfxOn: true,
  sfxVolume: 70,
  pauseMusic: 'soft',
};

const volume = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback);
let current: Settings | null = null;

export function getSettings(): Settings {
  if (current) return current;
  current = { ...DEFAULT_SETTINGS };
  const s = storage();
  if (s) {
    try {
      const r = JSON.parse(s.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>;
      if (typeof r.reactions === 'boolean') current.reactions = r.reactions;
      if (r.weatherFx === 'full' || r.weatherFx === 'light' || r.weatherFx === 'off') current.weatherFx = r.weatherFx;
      if ([0, 1, 2, 3].includes(Number(r.zoom))) current.zoom = Number(r.zoom);
      if ([1, 2, 4].includes(Number(r.speed))) current.speed = Number(r.speed);
      if (typeof r.hints === 'boolean') current.hints = r.hints;
      if (typeof r.muted === 'boolean') current.muted = r.muted;
      if (typeof r.musicOn === 'boolean') current.musicOn = r.musicOn;
      if (typeof r.sfxOn === 'boolean') current.sfxOn = r.sfxOn;
      current.musicVolume = volume(r.musicVolume, current.musicVolume);
      current.sfxVolume = volume(r.sfxVolume, current.sfxVolume);
      if (r.pauseMusic === 'normal' || r.pauseMusic === 'soft' || r.pauseMusic === 'off') current.pauseMusic = r.pauseMusic;
    } catch {
      /* defaults */
    }
  }
  return current;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = { ...getSettings(), ...patch };
  const s = storage();
  if (s) {
    try {
      s.setItem(SETTINGS_KEY, JSON.stringify(current));
    } catch {
      /* ignore */
    }
  }
  return current;
}
