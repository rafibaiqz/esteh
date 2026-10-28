import { getSettings } from '../systems/SaveSystem';
import { MUSIC, PAUSE_MUSIC_LEVEL, SFX, audioUrl, type SfxName } from './audioConfig';

type Ctx = AudioContext;

/**
 * The single owner of all game audio (Web Audio API).
 *
 * - Nothing is created until the player interacts with the page (browsers
 *   block audio before that); `unlock()` is wired to the first pointer/key.
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
  private loading: Promise<void> | null = null;
  private lastPlayed = new Map<SfxName, number>();
  private musicSources = new Set<AudioBufferSourceNode>();
  private musicTimer: number | null = null;
  private nextLoopAt = 0;
  private musicPlaying = false;
  private pauseMenuOpen = false;
  private hiddenSuspended = false;
  private failed = false;

  /** True once audio is running (after the first interaction). */
  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Call from a user gesture. Safe to call many times. */
  unlock(): void {
    if (this.failed) return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) {
        this.fail('Web Audio tidak tersedia di browser ini.');
        return;
      }
      try {
        this.ctx = new AC();
      } catch (e) {
        this.fail(e);
        return;
      }
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.musicBus = ctx.createGain();
      this.musicDuck = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.musicBus.connect(this.musicDuck).connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(ctx.destination);
      this.applySettings(true);
      document.addEventListener('visibilitychange', () => this.onVisibility());
    }
    if (this.ctx.state === 'suspended' && !this.hiddenSuspended) void this.ctx.resume().catch(() => {});
    void this.load().then(() => this.syncMusic());
  }

  private fail(reason: unknown): void {
    this.failed = true;
    console.warn('[audio] dinonaktifkan:', reason);
  }

  private load(): Promise<void> {
    if (this.loading) return this.loading;
    const ctx = this.ctx!;
    const files = [...Object.values(SFX).map((s) => s.file), MUSIC.file];
    this.loading = Promise.all(
      files.map(async (file) => {
        try {
          const res = await fetch(audioUrl(file));
          if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
          const data = await res.arrayBuffer();
          this.buffers.set(file, await ctx.decodeAudioData(data));
        } catch (e) {
          console.warn('[audio] gagal memuat', file, e);
        }
      }),
    ).then(() => undefined);
    return this.loading;
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
    if (!ctx || ctx.state !== 'running' || s.muted || !s.sfxOn || s.sfxVolume === 0) return;
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
    const want = !!this.ctx && s.musicOn && !s.muted && this.buffers.has(MUSIC.file);
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
