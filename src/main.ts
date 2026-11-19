import Phaser from 'phaser';
import { BattleScene } from './scene/BattleScene';
import { HEIGHT, WIDTH } from './scene/board';
import type { GameState } from './game/rules';
import './style.css';

declare global {
  interface Window { __GAME_TEST__?: { getState: () => GameState; isBusy: () => boolean } }
}

const parent = document.getElementById('game')!;
const zoom = (): number => Math.max(1, Math.floor(parent.clientWidth / WIDTH));
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
  const resize = new ResizeObserver(() => {
    const next = zoom();
    if (game.scale.zoom !== next) game.scale.setZoom(next);
    parent.style.height = `${HEIGHT * next}px`;
  });
  resize.observe(parent);
  game.events.once(Phaser.Core.Events.DESTROY, () => resize.disconnect());
});
