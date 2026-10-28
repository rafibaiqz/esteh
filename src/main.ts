import './styles/main.css';
import './styles/screens.css';
import { Game } from './game/Game';
import { GameLoop } from './game/GameLoop';
import { createNewGame } from './game/GameState';
import type { GameState } from './game/types';
import { Renderer } from './game/Renderer';
import { getSettings, loadSlot } from './systems/SaveSystem';
import { TitleScreen } from './ui/TitleScreen';
import { UI } from './ui/UI';
import { toast } from './ui/dom';
import { AudioManager } from './audio/AudioManager';
import { bindAudio } from './audio/gameSounds';

/** Design size of the stage: on a 16:9 screen the stage is exactly this, as before. */
const DESIGN_W = 1280;
const DESIGN_H = 720;
/** Smallest UI scale (screen px per stage px), so text and touch targets stay usable on phones. */
const MIN_SCALE = 0.8;
/** Stage widths/heights below these switch to the compact (phone) layout rules. */
const NARROW_BELOW = 760;
const SHORT_BELOW = 560;

let safeProbe: HTMLElement | null = null;

/** Device safe areas (notch, home indicator) in CSS px, read from env() via a hidden probe. */
function safeArea(): { top: number; right: number; bottom: number; left: number } {
  if (!safeProbe) {
    safeProbe = document.createElement('div');
    safeProbe.style.cssText =
      'position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(safeProbe);
  }
  const cs = getComputedStyle(safeProbe);
  const px = (v: string) => parseFloat(v) || 0;
  return { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
}

/**
 * Fits the stage to the screen without letterboxing or clipping. The stage
 * takes the screen's own shape: a 16:9 desktop gets exactly 1280×720 (so the
 * desktop layout is unchanged), a portrait phone gets a tall, narrow stage and
 * the compact layout rules (`st-narrow` / `st-short`). One uniform scale maps
 * stage px to screen px; all input code converts through getBoundingClientRect,
 * so clicks and touches stay aligned. Returns the scale.
 */
function fitStage(): number {
  const stage = document.getElementById('stage')!;
  const viewport = document.getElementById('viewport')!;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const safe = safeArea();
  const availW = Math.max(200, vw - safe.left - safe.right);
  const availH = Math.max(200, vh - safe.top - safe.bottom);
  const scale = Math.max(Math.min(availW / DESIGN_W, availH / DESIGN_H), Math.min(MIN_SCALE, availW / 360, availH / 360));
  const w = Math.round(availW / scale);
  const h = Math.round(availH / scale);
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.transform = `scale(${scale})`;
  stage.style.left = `${safe.left}px`;
  stage.style.top = `${safe.top}px`;
  stage.style.setProperty('--inv', String(1 / scale));
  stage.style.setProperty('--stage-h', `${h}px`);
  stage.classList.toggle('st-narrow', w < NARROW_BELOW);
  stage.classList.toggle('st-short', h < SHORT_BELOW);
  stage.classList.toggle('st-portrait', h > w);
  stage.classList.toggle('st-touch', window.matchMedia?.('(pointer: coarse)').matches ?? false);
  viewport.style.width = `${vw}px`;
  viewport.style.height = `${vh}px`;
  return scale;
}

/** Background game for the title screen: never saved. */
function demoState(): GameState {
  const s = createNewGame(20240817, { ownerName: 'Demo', businessName: 'ESTEH' });
  s.upgrades = ['payung', 'papanNama', 'lampuHias'];
  s.weather = 'cerahBerawan';
  s.weatherLater = 'cerahBerawan';
  return s;
}

function boot(): void {
  let scale = fitStage();

  const game = new Game(demoState());
  const renderer = new Renderer(document.getElementById('world') as HTMLCanvasElement);
  const titleRenderer = new Renderer(document.getElementById('title-canvas') as HTMLCanvasElement);
  titleRenderer.camera.zoomIndex = 1;
  titleRenderer.pauseTint = false;
  // Canvas backing resolution follows the real screen pixels (capped for phones' memory and speed).
  const applyResolution = () => {
    const r = Math.max(1, Math.min(2, scale * (window.devicePixelRatio || 1)));
    renderer.resolution = r;
    titleRenderer.resolution = r;
  };
  applyResolution();
  const refit = () => {
    scale = fitStage();
    applyResolution();
  };
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', () => setTimeout(refit, 50));
  window.visualViewport?.addEventListener('resize', refit);
  const ui = new UI(game, renderer);
  // Audio lives for the whole session and is ready from the very first screen.
  const audio = new AudioManager();
  bindAudio(audio, game);
  const audioHint = document.getElementById('audio-hint')!;
  const refreshAudioHint = () => {
    const s = getSettings();
    audioHint.hidden = !(audio.locked && s.musicOn && !s.muted);
  };
  audio.onLockChange = refreshAudioHint;
  audio.init();
  ui.onPauseMenu = (open) => audio.setPauseMenu(open);
  renderer.camera.zoomIndex = getSettings().zoom;
  titleRenderer.focusCart(game.world);
  game.events.on('locationChanged', () => titleRenderer.focusCart(game.world));

  /** New game or loaded save: straight into gameplay, running (pausing is always the player's choice). */
  const enterGame = (state: GameState, message: string) => {
    state.paused = false;
    game.loadState(state, true);
    renderer.camera.zoomIndex = getSettings().zoom;
    renderer.focusCart(game.world);
    ui.reset();
    title.hide();
    document.getElementById('toasts')!.replaceChildren();
    toast(message, 'good');
  };

  const title: TitleScreen = new TitleScreen(document.getElementById('title')!, document.getElementById('title-ui')!, {
    start: (setup) => {
      const s = createNewGame(undefined, setup);
      enterGame(s, `Selamat datang, ${setup.ownerName}! ${setup.businessName} siap berjualan.`);
    },
    load: (id) => {
      const r = loadSlot(id);
      if (!r.state) {
        toast(r.corrupt ? 'Simpanan ini rusak dan tidak bisa dimuat.' : 'Simpanan tidak ditemukan.', 'bad');
        title.show('load');
        return;
      }
      enterGame(r.state, `${r.state.businessName} dimuat — hari ke-${r.state.day}.`);
    },
    inGame: () => game.persistent,
    resume: () => {
      // Same session, same world: just leave the title screen and keep playing.
      title.hide();
      ui.enterGameplay();
    },
    settingsChanged: () => {
      renderer.camera.zoomIndex = getSettings().zoom;
      renderer.focusCart(game.world);
      audio.applySettings();
      refreshAudioHint();
    },
  });

  ui.onMainMenu = (screen = 'main') => {
    if (game.persistent) game.save();
    titleRenderer.focusCart(game.world);
    title.show(screen);
  };
  ui.isBlocked = () => title.visible;
  ui.onSettingsChanged = () => {
    renderer.camera.zoomIndex = getSettings().zoom;
    renderer.focusCart(game.world);
    audio.applySettings();
  };

  // The title background slowly drifts around the demo stand.
  const drift = (t: number) => {
    const c = game.world.map.cart;
    titleRenderer.camera.centerOnTile(c.x + 0.5 + Math.sin(t * 0.05) * 3, c.y + 0.5 + Math.cos(t * 0.037) * 2);
    titleRenderer.camera.clamp();
  };
  const loop = new GameLoop(
    (dt) => {
      // A player's game is suspended while the title screen covers it (navigation, not the
      // gameplay pause): nothing is simulated until they come back. The demo street keeps moving.
      if (!title.visible || !game.persistent) game.update(dt);
      if (!title.visible) ui.update(dt);
    },
    (t) => {
      if (title.visible) {
        drift(t);
        titleRenderer.render(game, t);
      } else renderer.render(game, t);
    },
  );
  loop.start();

  const persist = () => game.save();
  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });

  // Exposed for debugging / automated checks in the browser console.
  (window as unknown as { esteh: unknown }).esteh = { game, renderer, title, ui, audio };
}

try {
  boot();
} catch (err) {
  // Shown by the startup guard in index.html instead of a blank page.
  console.error('[esteh] gagal memulai:', err);
  const show = (window as unknown as { __estehBootError?: (detail: string) => void }).__estehBootError;
  show?.(err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err));
}
