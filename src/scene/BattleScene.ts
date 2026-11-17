import Phaser from 'phaser';
import { attackRange, handleTile, initialState, movementRange, reduceGame, type GameState, type Point } from '../game/rules';

const TILE = 72;
const MARGIN = 20;
const BLUE = 0x438bd4;
const RED = 0xe26d68;

export class BattleScene extends Phaser.Scene {
  private state: GameState = initialState();
  private graphics!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() { super('battle'); }

  create(): void {
    this.graphics = this.add.graphics();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const point: Point = {
        x: Math.floor((pointer.x - MARGIN) / TILE),
        y: Math.floor((pointer.y - MARGIN) / TILE),
      };
      if (point.x < 0 || point.y < 0 || point.x >= this.state.width || point.y >= this.state.height) return;
      this.state = handleTile(this.state, point);
      this.renderState();
    });
    document.getElementById('end-turn')!.addEventListener('click', () => {
      this.state = reduceGame(this.state, { type: 'endTurn' });
      this.renderState();
    });
    window.__GAME_TEST__ = { getState: () => structuredClone(this.state) };
    this.renderState();
  }

  private renderState(): void {
    this.graphics.clear();
    this.labels.forEach(label => label.destroy());
    this.labels = [];
    const selected = this.state.selectedId;
    const moves = selected ? movementRange(this.state, selected) : [];
    const attacks = selected ? attackRange(this.state, selected) : [];
    for (let y = 0; y < this.state.height; y++) {
      for (let x = 0; x < this.state.width; x++) {
        const px = MARGIN + x * TILE;
        const py = MARGIN + y * TILE;
        const wall = this.state.walls.some(point => point.x === x && point.y === y);
        const move = moves.some(point => point.x === x && point.y === y);
        const enemy = this.state.units.some(unit => unit.x === x && unit.y === y && unit.team !== this.state.turn);
        const attack = enemy && attacks.some(point => point.x === x && point.y === y);
        this.graphics.fillStyle(wall ? 0x596375 : attack ? 0xf5aa7c : move ? 0x8dd7c2 :
          (x + y) % 2 === 0 ? 0xe6e8e2 : 0xd7dbd5);
        this.graphics.fillRoundedRect(px + 2, py + 2, TILE - 4, TILE - 4, 8);
        if (attacks.some(point => point.x === x && point.y === y)) {
          this.graphics.lineStyle(3, 0xf5aa7c);
          this.graphics.strokeRoundedRect(px + 5, py + 5, TILE - 10, TILE - 10, 7);
        }
        if (wall) {
          this.graphics.fillStyle(0x718092);
          this.graphics.fillRect(px + 18, py + 17, 36, 38);
          this.graphics.lineStyle(2, 0x475261);
          this.graphics.strokeRect(px + 18, py + 17, 36, 38);
        }
      }
    }
    for (const unit of this.state.units) {
      const cx = MARGIN + unit.x * TILE + TILE / 2;
      const cy = MARGIN + unit.y * TILE + TILE / 2;
      const active = selected === unit.id;
      if (active) {
        this.graphics.lineStyle(4, 0xffd375);
        this.graphics.strokeCircle(cx, cy, 29);
      }
      this.graphics.fillStyle(unit.team === 'blue' ? BLUE : RED);
      this.graphics.fillCircle(cx, cy, 24);
      this.graphics.lineStyle(3, 0xffffff, 0.9);
      this.graphics.strokeCircle(cx, cy, 24);
      const label = this.add.text(cx, cy - 3, unit.team === 'blue' ? 'B' : 'R', {
        fontFamily: 'sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
      const hp = this.add.text(cx, cy + 27, `HP ${unit.hp}`, {
        fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#26313a',
        backgroundColor: '#ffffff', padding: { x: 4, y: 1 },
      }).setOrigin(0.5);
      this.labels.push(label, hp);
    }
    document.getElementById('turn-label')!.textContent = `${this.state.turn === 'blue' ? '青' : '赤'}のターン · ${this.state.turnNumber}`;
    document.getElementById('status')!.textContent = this.state.message;
    (document.getElementById('end-turn') as HTMLButtonElement).disabled = this.state.winner !== null;
  }
}
