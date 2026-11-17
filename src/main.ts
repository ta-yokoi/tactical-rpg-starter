import Phaser from 'phaser';
import { BattleScene } from './scene/BattleScene';
import type { GameState } from './game/rules';
import './style.css';

declare global {
  interface Window { __GAME_TEST__?: { getState: () => GameState } }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 616,
  height: 472,
  backgroundColor: '#26313a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BattleScene],
  render: { pixelArt: false, antialias: true },
});
