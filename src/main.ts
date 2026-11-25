import Phaser from 'phaser';
import { BattleScene } from './scene/BattleScene';
import { HEIGHT, WIDTH } from './scene/board';
import type { GameState } from './game/rules';
import './style.css';

declare global {
  interface Window {
    __GAME_TEST__?: {
      getState: () => GameState;
      isBusy: () => boolean;
      getUnitFrame: (id: string) => string | number | null;
    };
  }
}

const parent = document.getElementById('game')!;
const shortLandscape = window.matchMedia('(max-height: 500px) and (orientation: landscape) and (pointer: coarse)');
const zoom = (): number => {
  const byWidth = Math.floor(parent.clientWidth / WIDTH);
  // Leave room for the battle header, tile details and end-turn button.
  const byHeight = shortLandscape.matches ? Math.floor((window.innerHeight - 100) / HEIGHT) : byWidth;
  return Math.max(1, Math.min(byWidth, byHeight));
};
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  audio: { noAudio: true },
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#0b1927',
  scale: { mode: Phaser.Scale.NONE, zoom: zoom() },
  scene: [BattleScene],
  render: { pixelArt: true, antialias: false, roundPixels: true },
});

game.events.once(Phaser.Core.Events.READY, () => {
  const resizeBoard = (): void => {
    const next = zoom();
    if (game.scale.zoom !== next) game.scale.setZoom(next);
    parent.style.height = `${HEIGHT * next}px`;
    parent.dataset.zoom = String(next);
  };
  resizeBoard();
  const resize = new ResizeObserver(resizeBoard);
  resize.observe(parent);
  window.addEventListener('resize', resizeBoard);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    resize.disconnect();
    window.removeEventListener('resize', resizeBoard);
  });
});
