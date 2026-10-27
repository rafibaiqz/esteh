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

const STAGE_W = 1280;
const STAGE_H = 720;

/** Scales the fixed 1280×720 stage uniformly to fit the window (letterboxed, never stretched). */
function fitStage(): void {
  const stage = document.getElementById('stage')!;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.max(0.5, Math.min(vw / STAGE_W, vh / STAGE_H));
  stage.style.transform = `scale(${scale})`;
  const viewport = document.getElementById('viewport')!;
  viewport.style.width = `${Math.max(vw, STAGE_W * scale)}px`;
  viewport.style.height = `${Math.max(vh, STAGE_H * scale)}px`;
  stage.style.left = `${Math.max(0, (vw - STAGE_W * scale) / 2)}px`;
  stage.style.top = `${Math.max(0, (vh - STAGE_H * scale) / 2)}px`;
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
  fitStage();
  window.addEventListener('resize', fitStage);

  const game = new Game(demoState());
  const renderer = new Renderer(document.getElementById('world') as HTMLCanvasElement);
  const titleRenderer = new Renderer(document.getElementById('title-canvas') as HTMLCanvasElement);
  titleRenderer.camera.zoomIndex = 1;
  const ui = new UI(game, renderer);
  renderer.camera.zoomIndex = getSettings().zoom;
  titleRenderer.focusCart(game.world);
  game.events.on('locationChanged', () => titleRenderer.focusCart(game.world));

  const enterGame = (state: GameState, message: string) => {
    if (state.phase === 'open') state.paused = true;
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
      enterGame(r.state, `${r.state.businessName} dimuat — hari ke-${r.state.day}.${r.state.phase === 'open' ? ' Permainan dijeda, tekan Spasi untuk lanjut.' : ''}`);
    },
    inGame: () => game.persistent,
    resume: () => {
      title.hide();
      // A running day stays paused until the player chooses "Lanjutkan".
      if (game.state.phase === 'open') ui.showPause();
    },
    settingsChanged: () => {
      renderer.camera.zoomIndex = getSettings().zoom;
      renderer.focusCart(game.world);
    },
  });

  ui.onMainMenu = (screen = 'main') => {
    if (game.persistent) {
      if (game.state.phase === 'open') game.state.paused = true;
      game.save();
    }
    titleRenderer.focusCart(game.world);
    title.show(screen);
  };
  ui.isBlocked = () => title.visible;
  ui.onSettingsChanged = () => {
    renderer.camera.zoomIndex = getSettings().zoom;
    renderer.focusCart(game.world);
  };

  // The title background slowly drifts around the demo stand.
  const drift = (t: number) => {
    const c = game.world.map.cart;
    titleRenderer.camera.centerOnTile(c.x + 0.5 + Math.sin(t * 0.05) * 3, c.y + 0.5 + Math.cos(t * 0.037) * 2);
    titleRenderer.camera.clamp();
  };
  const loop = new GameLoop(
    (dt) => {
      game.update(dt);
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
  (window as unknown as { esteh: unknown }).esteh = { game, renderer, title, ui };
}

boot();
