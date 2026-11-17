import Phaser from 'phaser';
import { BattleScene } from './scene/BattleScene';
import type { GameState } from './game/rules';
import './style.css';

declare global {
  interface Window { __GAME_TEST__?: { getState: () => GameState; isBusy: () => boolean } }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 616,
  height: 472,
  backgroundColor: '#213d4b',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BattleScene],
  render: { pixelArt: true, antialias: false, roundPixels: true },
});
