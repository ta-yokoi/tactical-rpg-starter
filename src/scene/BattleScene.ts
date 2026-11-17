import Phaser from 'phaser';
import { Chiptune, type Cue } from '../audio/chiptune';
import { enemyTurnSteps } from '../game/ai';
import { attackRange, handleTile, initialState, movementRange, reduceGame, type GameState, type Point, type Unit } from '../game/rules';
import { createPixelArt } from './pixelArt';

const TILE = 72;
const MARGIN = 20;
const PROFILES: Record<string, { name: string; role: string }> = {
  'blue-1': { name: 'アステル', role: '守護騎士' },
  'blue-2': { name: 'リナ', role: '星詠み' },
  'red-1': { name: '鉄牙', role: '略奪兵' },
  'red-2': { name: '灰の術士', role: '呪術師' },
};
const center = (point: Point): { x: number; y: number } => ({
  x: MARGIN + point.x * TILE + TILE / 2,
  y: MARGIN + point.y * TILE + TILE / 2,
});

export class BattleScene extends Phaser.Scene {
  private state: GameState = initialState();
  private highlights!: Phaser.GameObjects.Graphics;
  private views = new Map<string, Phaser.GameObjects.Container>();
  private soundKit = new Chiptune();
  private busy = false;
  private generation = 0;

  constructor() { super('battle'); }

  create(): void {
    createPixelArt(this);
    this.drawTerrain();
    this.highlights = this.add.graphics();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const point: Point = {
        x: Math.floor((pointer.x - MARGIN) / TILE),
        y: Math.floor((pointer.y - MARGIN) / TILE),
      };
      if (point.x < 0 || point.y < 0 || point.x >= this.state.width || point.y >= this.state.height) return;
      void this.playerTile(point);
    });
    document.getElementById('end-turn')!.addEventListener('click', () => { void this.endPlayerTurn(); });
    for (const id of ['restart', 'restart-outcome']) {
      document.getElementById(id)!.addEventListener('click', () => this.restart());
    }
    document.getElementById('sound-toggle')!.addEventListener('click', () => {
      this.soundKit.toggle();
      document.getElementById('sound-toggle')!.textContent = this.soundKit.isEnabled ? '♪ 音声 ON' : '♪ 音声 OFF';
    });
    window.__GAME_TEST__ = { getState: () => structuredClone(this.state), isBusy: () => this.busy };
    this.syncUnits(this.state, this.state);
    this.drawUi();
    this.showBanner('MISSION 01', '古い峠の防衛線');
  }

  private drawTerrain(): void {
    for (let y = 0; y < this.state.height; y++) {
      for (let x = 0; x < this.state.width; x++) {
        const isWall = this.state.walls.some(wall => wall.x === x && wall.y === y);
        const isPath = y === 1 || y === 4 || (x === 2 && y >= 1 && y <= 4);
        const key = isWall ? 'wall' : isPath ? 'path' : `grass-${(x * 3 + y * 5) % 4}`;
        this.add.image(MARGIN + x * TILE, MARGIN + y * TILE, key).setOrigin(0).setDisplaySize(TILE, TILE);
      }
    }
    const frame = this.add.graphics();
    frame.lineStyle(4, 0x213d4b);
    frame.strokeRect(MARGIN - 2, MARGIN - 2, this.state.width * TILE + 4, this.state.height * TILE + 4);
  }

  private async playerTile(point: Point): Promise<void> {
    if (this.busy || this.state.turn !== 'blue' || this.state.winner) return;
    this.soundKit.start();
    const next = handleTile(this.state, point);
    if (next === this.state) return;
    this.busy = true;
    const previous = this.state;
    this.state = next;
    this.drawUi();
    this.playCue(previous, next);
    await this.syncUnits(previous, next);
    this.busy = false;
    this.drawUi();
  }

  private async endPlayerTurn(): Promise<void> {
    if (this.busy || this.state.turn !== 'blue' || this.state.winner) return;
    this.soundKit.start();
    this.busy = true;
    const generation = this.generation;
    this.state = reduceGame(this.state, { type: 'endTurn' });
    this.soundKit.play('turn');
    this.drawUi();
    this.showBanner('ENEMY PHASE', '敵の行動');
    await this.pause(650);
    for (const next of enemyTurnSteps(this.state)) {
      if (this.generation !== generation) return;
      const previous = this.state;
      this.state = next;
      this.drawUi();
      this.playCue(previous, next);
      await this.syncUnits(previous, next);
      await this.pause(260);
    }
    if (this.generation !== generation) return;
    this.busy = false;
    this.drawUi();
    if (!this.state.winner) this.showBanner('PLAYER PHASE', '青の部隊の番');
  }

  private restart(): void {
    this.generation++;
    this.tweens.killAll();
    this.views.forEach(view => view.destroy());
    this.views.clear();
    this.state = reduceGame(this.state, { type: 'restart' });
    this.busy = false;
    this.syncUnits(this.state, this.state);
    this.drawUi();
    this.soundKit.play('turn');
    this.showBanner('MISSION 01', '古い峠の防衛線');
  }

  private drawUi(): void {
    this.highlights.clear();
    const selected = this.state.selectedId;
    const moves = selected ? movementRange(this.state, selected) : [];
    const attacks = selected ? attackRange(this.state, selected) : [];
    for (const point of moves) {
      this.highlights.fillStyle(0x78d4a6, 0.43);
      this.highlights.fillRect(MARGIN + point.x * TILE + 3, MARGIN + point.y * TILE + 3, TILE - 6, TILE - 6);
    }
    for (const point of attacks) {
      this.highlights.lineStyle(4, 0xf8af68, 0.95);
      this.highlights.strokeRect(MARGIN + point.x * TILE + 5, MARGIN + point.y * TILE + 5, TILE - 10, TILE - 10);
    }
    const selectedUnit = this.state.units.find(unit => unit.id === selected);
    if (selectedUnit) {
      this.highlights.lineStyle(4, 0xffe49b);
      this.highlights.strokeRect(MARGIN + selectedUnit.x * TILE + 4, MARGIN + selectedUnit.y * TILE + 4, TILE - 8, TILE - 8);
    }
    const phase = this.state.turn === 'blue' ? 'PLAYER PHASE' : 'ENEMY PHASE';
    document.getElementById('turn-label')!.textContent = `${phase} · ${Math.ceil(this.state.turnNumber / 2)}`;
    document.getElementById('status')!.textContent = this.state.message;
    document.getElementById('selected-name')!.textContent = selectedUnit ? PROFILES[selectedUnit.id].name : 'ユニットを選択';
    document.getElementById('selected-detail')!.textContent = selectedUnit
      ? `${PROFILES[selectedUnit.id].role} · HP ${selectedUnit.hp}/${selectedUnit.maxHp} · ${selectedUnit.attacked ? '行動済み' : selectedUnit.moved ? '攻撃可能' : '移動・攻撃可能'}`
      : '青のユニットをクリックして行動を決めます。';
    const roster = document.getElementById('roster')!;
    roster.replaceChildren(...this.state.units.filter(unit => unit.team === 'blue').map(unit => {
      const item = document.createElement('div');
      item.className = `roster-unit${unit.attacked ? ' spent' : ''}`;
      item.textContent = `${PROFILES[unit.id].name}  ♥ ${unit.hp}`;
      return item;
    }));
    (document.getElementById('end-turn') as HTMLButtonElement).disabled = this.busy || this.state.turn !== 'blue' || this.state.winner !== null;
    const outcome = document.getElementById('outcome')!;
    outcome.hidden = this.state.winner === null;
    if (this.state.winner) {
      document.getElementById('outcome-heading')!.textContent = this.state.winner === 'blue' ? '戦いに勝利！' : '部隊は敗走した';
      document.getElementById('outcome-copy')!.textContent = this.state.winner === 'blue'
        ? '峠を守り抜いた。次の戦いに備えよう。' : 'もう一度、陣形を整えて挑もう。';
    }
  }

  private syncUnits(previous: GameState, next: GameState): Promise<void> {
    const animations: Promise<void>[] = [];
    const hit = previous.units.find(old => {
      const current = next.units.find(unit => unit.id === old.id);
      return !current || current.hp < old.hp;
    });
    if (hit && previous.selectedId) {
      const attacker = this.views.get(previous.selectedId);
      const source = previous.units.find(unit => unit.id === previous.selectedId);
      if (attacker && source) {
        animations.push(new Promise(resolve => {
          this.tweens.add({ targets: attacker,
            x: attacker.x + Math.sign(hit.x - source.x) * 13,
            y: attacker.y + Math.sign(hit.y - source.y) * 13,
            duration: 95, yoyo: true, onComplete: () => resolve() });
        }));
      }
    }
    for (const unit of next.units) {
      let view = this.views.get(unit.id);
      if (!view) {
        view = this.makeUnit(unit);
        this.views.set(unit.id, view);
      }
      const old = previous.units.find(item => item.id === unit.id);
      const location = center(unit);
      if (old && (old.x !== unit.x || old.y !== unit.y)) {
        const moving = view;
        animations.push(new Promise(resolve => {
          this.tweens.add({ targets: moving, x: location.x, y: location.y, duration: 260, ease: 'Sine.easeInOut',
            onComplete: () => resolve() });
        }));
      } else { view.setPosition(location.x, location.y); }
      this.updateHealth(view, unit);
      if (old && old.hp > unit.hp) {
        const sprite = view.getAt(1) as Phaser.GameObjects.Image;
        sprite.setTintFill(0xffffff);
        this.time.delayedCall(150, () => { if (sprite.active) sprite.clearTint(); });
        this.floatDamage(location, old.hp - unit.hp);
        animations.push(this.pause(220));
      }
      view.setAlpha(unit.attacked ? 0.7 : 1);
    }
    for (const [id, view] of this.views) {
      if (next.units.some(unit => unit.id === id)) continue;
      const old = previous.units.find(unit => unit.id === id);
      if (old) this.floatDamage(center(old), old.hp);
      this.views.delete(id);
      animations.push(new Promise(resolve => {
        this.tweens.add({ targets: view, alpha: 0, y: view.y - 18, duration: 250,
          onComplete: () => { view.destroy(); resolve(); } });
      }));
    }
    return Promise.all(animations).then(() => undefined);
  }

  private makeUnit(unit: Unit): Phaser.GameObjects.Container {
    const shadow = this.add.rectangle(0, 17, 44, 9, 0x1b3538, 0.55);
    const sprite = this.add.image(0, -6, unit.id).setDisplaySize(54, 54);
    const health = this.add.graphics();
    const view = this.add.container(center(unit).x, center(unit).y, [shadow, sprite, health]);
    this.tweens.add({ targets: sprite, y: -8, duration: 750, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    this.updateHealth(view, unit);
    return view;
  }

  private updateHealth(view: Phaser.GameObjects.Container, unit: Unit): void {
    const bar = view.getAt(2) as Phaser.GameObjects.Graphics;
    bar.clear();
    bar.fillStyle(0x1f343c).fillRect(-23, 24, 46, 8);
    bar.fillStyle(unit.team === 'blue' ? 0x73d8b7 : 0xf19077).fillRect(-21, 26, (42 * unit.hp) / unit.maxHp, 4);
  }

  private floatDamage(location: Point, amount: number): void {
    const label = this.add.text(location.x, location.y - 26, `−${amount}`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#fff0ae', fontStyle: 'bold',
      stroke: '#523b3d', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: label, y: label.y - 30, alpha: 0, duration: 600,
      onComplete: () => label.destroy() });
  }

  private playCue(previous: GameState, next: GameState): void {
    let cue: Cue = 'select';
    if (next.winner) cue = next.winner === 'blue' ? 'win' : 'lose';
    else if (previous.turn !== next.turn) cue = 'turn';
    else if (next.units.some(unit => (previous.units.find(old => old.id === unit.id)?.hp ?? 0) > unit.hp) ||
      next.units.length < previous.units.length) cue = 'attack';
    else if (next.units.some(unit => { const old = previous.units.find(item => item.id === unit.id);
      return old && (old.x !== unit.x || old.y !== unit.y); })) cue = 'move';
    this.soundKit.play(cue);
  }

  private showBanner(eyebrow: string, title: string): void {
    const banner = document.getElementById('phase-banner')!;
    banner.replaceChildren();
    const small = document.createElement('span');
    small.textContent = eyebrow;
    const large = document.createElement('strong');
    large.textContent = title;
    banner.append(small, large);
    banner.classList.remove('visible');
    void banner.offsetWidth;
    banner.classList.add('visible');
    window.setTimeout(() => banner.classList.remove('visible'), 1100);
  }

  private pause(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, () => resolve()));
  }
}
