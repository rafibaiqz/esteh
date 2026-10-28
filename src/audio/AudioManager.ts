import { getSettings } from '../systems/SaveSystem';
import { MUSIC, PAUSE_MUSIC_LEVEL, SFX, audioUrl, type SfxName } from './audioConfig';

type Ctx = AudioContext;

/**
 * The single owner of all game audio (Web Audio API). Created once at app
 * start and kept for the whole session (title screen, gameplay, pause, back).
 *
 * Lifecycle:
 * 1. `init()` (app start): reads the saved settings, starts downloading and
 *    decoding every sound right away (an OfflineAudioContext decodes without
 *    needing permission), and checks whether the browser allows audio to
 *    start on its own. If it does, the AudioContext is created and the title
 *    music starts as soon as it is decoded.
 * 2. Otherwise the browser's autoplay policy is respected: the context is
 *    created/resumed inside the first real user gesture (pointer, key, click,
 *    touch) on *any* screen — usually the title menu — and because the files
 *    are already decoded, music and the click sound start on that same
 *    gesture.
 *
 * - Gain chain: sources → music/sfx bus → master. Mute zeroes the master
 *   without touching the saved volumes.
 * - Background music is one decoded buffer scheduled back-to-back on the
 *   audio clock (each repeat starts exactly one loop length after the last,
 *   its tail overlapping the next start), so it loops seamlessly and can
 *   never be started twice.
 * - Failures (no Web Audio, missing file, decode error) are logged once and
 *   the game simply stays silent.
 */
export class AudioManager {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicDuck: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  /** Encoded files waiting for a context to decode them (only without OfflineAudioContext). */
  private pending = new Map<string, ArrayBuffer>();
  private loading: Promise<void> | null = null;
  private lastPlayed = new Map<SfxName, number>();
  private musicSources = new Set<AudioBufferSourceNode>();
  private musicTimer: number | null = null;
  private nextLoopAt = 0;
  private musicPlaying = false;
  private pauseMenuOpen = false;
  private hiddenSuspended = false;
  /** A user gesture has happened (or autoplay was allowed): it is fine to make sound. */
  private unlocked = false;
  private failed = false;
  private initialized = false;
  /** Number of AudioContexts ever created (for checks: must stay 1). */
  contextsCreated = 0;
  /** Called when audio becomes available / blocked (the title screen shows a small hint). */
  onLockChange: (locked: boolean) => void = () => {};

  /** True once sound can actually be heard. */
  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Waiting for the first user gesture because the browser blocks autoplay. */
  get locked(): boolean {
    return !this.failed && !this.unlocked;
  }

  /** Prepare everything at app start. Safe to call more than once. */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    if (!window.AudioContext && !(window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) {
      this.fail('Web Audio tidak tersedia di browser ini.');
      return;
    }
    // Any of these counts as a user gesture for autoplay purposes; the handler runs synchronously in it.
    const gesture = () => {
      this.gestureSeen = true;
      this.unlock();
    };
    for (const type of ['pointerdown', 'keydown', 'click', 'touchend'] as const) window.addEventListener(type, gesture, true);
    document.addEventListener('visibilitychange', () => this.onVisibility());
    void this.load().then(() => this.syncMusic());
    void this.autoplayAllowed().then((ok) => {
      if (ok && !this.unlocked) this.startWithoutGesture();
    });
    this.onLockChange(this.locked);
  }

  /** Does the browser let this page start audio without a gesture? (No side effects, no console noise.) */
  private async autoplayAllowed(): Promise<boolean> {
    const nav = navigator as Navigator & { getAutoplayPolicy?: (type: string) => string };
    if (typeof nav.getAutoplayPolicy === 'function') {
      try {
        return nav.getAutoplayPolicy('audiocontext') === 'allowed';
      } catch {
        /* fall through to the probe */
      }
    }
    // Probe with a tiny silent clip: play() is refused (and the refusal handled) when autoplay is blocked.
    try {
      const probe = new Audio(silentWavUrl());
      await probe.play();
      probe.pause();
      return true;
    } catch {
      return false;
    }
  }

  /** Autoplay is allowed: start right away, but fall back to waiting for a gesture if the context stays suspended. */
  private startWithoutGesture(): void {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'running') return;
    const timeout = new Promise((r) => setTimeout(r, 400));
    void Promise.race([ctx.resume().catch(() => {}), timeout]).then(() => {
      if (ctx.state !== 'running' && !this.gestureSeen) {
        this.unlocked = false;
        this.onLockChange(true);
      }
    });
  }

  /** A real user gesture has reached `unlock()` at least once. */
  private gestureSeen = false;

  /**
   * Creates (once) or resumes the AudioContext. Called from a user gesture, or at
   * start when autoplay is allowed. Safe to call any number of times.
   */
  unlock(): void {
    if (this.failed) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.unlocked) {
      this.unlocked = true;
      this.onLockChange(false);
    }
    if (ctx.state === 'suspended' && !this.hiddenSuspended) void ctx.resume().catch(() => {});
    void this.load().then(() => this.syncMusic());
  }

  private ensureContext(): Ctx | null {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    try {
      this.ctx = new AC!();
    } catch (e) {
      this.fail(e);
      return null;
    }
    this.contextsCreated++;
    const ctx = this.ctx;
    // A (re)created context starts with fresh nodes; any old music voices belonged to the old one.
    this.musicSources.clear();
    this.musicPlaying = false;
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.master = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.musicDuck = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.musicDuck).connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(ctx.destination);
    this.applySettings(true);
    // Files fetched before the context existed (no OfflineAudioContext) are decoded now.
    for (const [file, data] of this.pending) {
      this.pending.delete(file);
      void ctx
        .decodeAudioData(data)
        .then((buf) => {
          this.buffers.set(file, buf);
          this.syncMusic();
        })
        .catch((e) => console.warn('[audio] gagal memuat', file, e));
    }
    return ctx;
  }

  private fail(reason: unknown): void {
    this.failed = true;
    console.warn('[audio] dinonaktifkan:', reason);
    this.onLockChange(false);
  }

  /** Downloads and decodes every sound once, independent of any screen. */
  private load(): Promise<void> {
    if (this.loading) return this.loading;
    const OAC = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    let decoder: BaseAudioContext | null = null;
    try {
      decoder = OAC ? new OAC(1, 1, 44100) : null;
    } catch {
      decoder = null;
    }
    const files = [...Object.values(SFX).map((s) => s.file), MUSIC.file];
    this.loading = Promise.all(
      files.map(async (file) => {
        try {
          const res = await fetch(audioUrl(file));
          if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
          const data = await res.arrayBuffer();
          const ctx = decoder ?? this.ctx;
          if (ctx) this.buffers.set(file, await ctx.decodeAudioData(data));
          else this.pending.set(file, data);
        } catch (e) {
          console.warn('[audio] gagal memuat', file, e);
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  /** Files decoded so far (for checks). */
  get loadedCount(): number {
    return this.buffers.size;
  }

  /** Re-reads the persisted settings (volumes, toggles, mute) and applies them at once. */
  applySettings(immediate = false): void {
    if (!this.ctx) return;
    const s = getSettings();
    const t = this.ctx.currentTime;
    const ramp = immediate ? 0.001 : 0.08;
    this.master!.gain.setTargetAtTime(s.muted ? 0 : 1, t, ramp);
    this.sfxBus!.gain.setTargetAtTime(s.sfxOn ? s.sfxVolume / 100 : 0, t, ramp);
    this.musicBus!.gain.setTargetAtTime(s.musicVolume / 100, t, ramp);
    this.applyDuck(immediate);
    this.syncMusic();
  }

  /** The pause menu lowers (or silences) the music according to the setting; it never restarts it. */
  setPauseMenu(open: boolean): void {
    this.pauseMenuOpen = open;
    this.applyDuck(false);
  }

  private applyDuck(immediate: boolean): void {
    if (!this.ctx) return;
    const level = this.pauseMenuOpen ? PAUSE_MUSIC_LEVEL[getSettings().pauseMusic] : 1;
    this.musicDuck!.gain.setTargetAtTime(level, this.ctx.currentTime, immediate ? 0.001 : 0.25);
  }

  // ------------------------------------------------------------------ sound effects

  play(name: SfxName): void {
    const ctx = this.ctx;
    const s = getSettings();
    // Right after the first gesture the context may still be resuming: the sound is queued and plays at once.
    if (!ctx || !this.unlocked || ctx.state === 'closed' || this.hiddenSuspended || s.muted || !s.sfxOn || s.sfxVolume === 0) return;
    const def = SFX[name];
    const buf = this.buffers.get(def.file);
    if (!buf) return;
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1e9) < def.minGap) return;
    this.lastPlayed.set(name, now);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = def.gain;
    src.connect(g).connect(this.sfxBus!);
    src.start();
  }

  // ------------------------------------------------------------------ music

  /** Starts or stops the music to match the settings. Never creates a second copy. */
  private syncMusic(): void {
    const s = getSettings();
    const want = !!this.ctx && this.unlocked && s.musicOn && !s.muted && s.musicVolume > 0 && this.buffers.has(MUSIC.file);
    if (want && !this.musicPlaying) this.startMusic();
    else if (!want && this.musicPlaying) this.stopMusic();
  }

  private startMusic(): void {
    const ctx = this.ctx!;
    this.musicPlaying = true;
    this.nextLoopAt = ctx.currentTime + 0.1;
    // Fade the very first entrance in.
    const bus = this.musicBus!;
    const target = getSettings().musicVolume / 100;
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(target, ctx.currentTime + MUSIC.fadeIn);
    this.scheduleMusic();
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 1000);
  }

  /** Queues the next repeats on the audio clock (looks 3 s ahead). */
  private scheduleMusic(): void {
    const ctx = this.ctx;
    const buf = this.buffers.get(MUSIC.file);
    if (!ctx || !buf || !this.musicPlaying) return;
    while (this.nextLoopAt < ctx.currentTime + 3) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.musicBus!);
      src.start(this.nextLoopAt);
      src.onended = () => this.musicSources.delete(src);
      this.musicSources.add(src);
      this.nextLoopAt += MUSIC.loopSeconds;
    }
  }

  private stopMusic(): void {
    const ctx = this.ctx!;
    this.musicPlaying = false;
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    const t = ctx.currentTime;
    this.musicBus!.gain.cancelScheduledValues(t);
    this.musicBus!.gain.setTargetAtTime(0, t, 0.15);
    for (const src of this.musicSources) {
      try {
        src.stop(t + 0.8);
      } catch {
        /* already stopped */
      }
    }
    this.musicSources.clear();
  }

  /** Number of music voices currently scheduled (for checks: never more than two overlap). */
  get musicVoices(): number {
    return this.musicSources.size;
  }

  get isMusicPlaying(): boolean {
    return this.musicPlaying;
  }

  /** A hidden tab goes quiet; the music continues where it was when the tab comes back. */
  private onVisibility(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (document.visibilityState === 'hidden' && ctx.state === 'running') {
      this.hiddenSuspended = true;
      void ctx.suspend().catch(() => {});
    } else if (document.visibilityState === 'visible' && this.hiddenSuspended) {
      this.hiddenSuspended = false;
      void ctx.resume().catch(() => {});
    }
  }
}

/** A 50 ms silent WAV (as a blob URL) used only to ask the browser whether autoplay is allowed. */
function silentWavUrl(): string {
  const rate = 8000;
  const samples = 400;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const text = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  v.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
