import type { Game } from '../game/Game';
import { updateSettings, type Settings } from '../systems/SaveSystem';
import type { AudioManager } from './AudioManager';

/**
 * Connects the game and the page to the AudioManager. This is the only place
 * that decides *when* a sound plays; components never play audio directly.
 */
export function bindAudio(audio: AudioManager, game: Game): void {
  // Browsers only allow audio after a user gesture: the first pointer/key press starts it.
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  // One soft click per click on an enabled control (a single capturing listener, so
  // nested handlers can't double it; disabled buttons never receive clicks).
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('button, [data-act], [data-ta], [data-set], [data-v]');
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      audio.play('click');
    },
    true,
  );

  // Volume sliders (title-screen and in-game settings): apply while dragging.
  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    const key = el.dataset?.vol as keyof Settings | undefined;
    if (!key) return;
    const v = Math.max(0, Math.min(100, Number(el.value)));
    updateSettings({ [key]: v } as Partial<Settings>);
    const out = el.parentElement?.querySelector('output');
    if (out) out.textContent = `${v}%`;
    audio.applySettings();
  });
  // Releasing the effects slider plays a sample at the new level.
  document.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset?.vol === 'sfxVolume') audio.play('cash');
  });

  // Game events → sounds. Each comes from the authoritative place in the simulation,
  // so nothing plays while the game is paused (the simulation is not running).
  let lastSale = -1;
  game.events.on('sale', ({ id }) => {
    if (id === lastSale) return; // one transaction, one cha-ching
    lastSale = id;
    audio.play('cash');
  });
  game.events.on('locationChanged', () => {
    lastSale = -1; // a new world numbers its sales from the start
  });
  game.events.on('purchase', ({ kind }) => audio.play(kind === 'supplies' ? 'buy' : kind === 'unlock' ? 'unlock' : 'coins'));
  game.events.on('actionFailed', () => audio.play('error'));
  game.events.on('unlocked', () => audio.play('unlock'));
  game.events.on('dayStarted', () => audio.play('dayStart'));
  game.events.on('dayEnded', () => audio.play('dayEnd'));
  game.events.on('stockWarning', () => audio.play('lowStock'));
}
