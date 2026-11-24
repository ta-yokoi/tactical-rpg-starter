import Phaser from 'phaser';
import { Chiptune } from '../audio/chiptune';
import { chapter, type ChapterId } from '../game/chapters';
import { loadCheckpoint, saveCheckpoint } from '../game/checkpoint';
import { formationBonuses } from '../game/formation';
import { enemyTurnSteps } from '../game/ai';
import { attackRange, battleProfile, combatForecast, handleTile, initialState, movementPath, movementRange, onBoard, reduceGame, terrainAt, type GameState, type Point, type Strike, type Unit } from '../game/rules';
import { unitProfile } from '../game/units';
import { center, MARGIN, TILE } from './board';
import { createPixelArt } from './pixelArt';
import type { MapFacing } from './mapUnits';
import { CombatStage, duelTiming } from './CombatStage';
import type { ArenaGround } from './combatArt';
import { FormationDialog } from './FormationDialog';
import { drawPortrait, PORTRAIT_SIZE } from './portraits';

const element = (id: string): HTMLElement => document.getElementById(id)!;
const button = (id: string): HTMLButtonElement => document.querySelector<HTMLButtonElement>(`#${id}`)!;
const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const strikeName = (unit: Unit): string => unitProfile(unit.id).reach === 1 ? '斬撃' : '術撃';
const soundPreferenceKey = 'tactical-rpg-starter:sound';

type UnitView = {
  body: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  health: Phaser.GameObjects.Graphics;
  facing: MapFacing;
};

export class BattleScene extends Phaser.Scene {
  private state = initialState();
  private battlefield!: Phaser.GameObjects.Layer;
  private marks!: Phaser.GameObjects.Graphics;
  private cursorLayer!: Phaser.GameObjects.Graphics;
  private readonly views = new Map<string, UnitView>();
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly soundKit = new Chiptune();
  private busy = false;
  private cursor: Point | null = null;
  private lastHit = '';
  private combatStage!: CombatStage;
  private readonly attackDialog = document.querySelector<HTMLDialogElement>('#attack-dialog')!;
  private readonly titleDialog = document.querySelector<HTMLDialogElement>('#title-dialog')!;
  private hasCheckpoint = false;
  private hasProgress = false;
  private pendingTarget: string | null = null;
  private bannerTimer?: number;

  constructor() { super('battle'); }

  create(): void {
    createPixelArt(this);
    this.combatStage = new CombatStage(ms => this.pause(ms), this.reduceMotion);
    this.battlefield = this.add.layer().setDepth(-2);
    try {
      const checkpoint = loadCheckpoint(window.localStorage);
      if (checkpoint) {
        this.state = checkpoint;
        this.hasCheckpoint = true;
        this.hasProgress = true;
      }
    } catch {
      element('checkpoint-status').textContent = 'このブラウザでは保存できません';
    }
    this.drawTerrain();
    this.marks = this.add.graphics();
    this.cursorLayer = this.add.graphics().setDepth(3);
    const board = element('game');
    const pointerTile = (pointer: Phaser.Input.Pointer): Point => ({
      x: Math.floor((pointer.x - MARGIN) / TILE),
      y: Math.floor((pointer.y - MARGIN) / TILE),
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.setCursor(pointerTile(pointer)));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const point = pointerTile(pointer);
      this.setCursor(point);
      if (onBoard(this.state, point)) void this.playerTile(point);
    });
    board.addEventListener('pointerleave', () => this.setCursor(null));
    board.addEventListener('blur', () => this.setCursor(null));
    board.addEventListener('keydown', event => this.onKey(event));
    this.attackDialog.addEventListener('close', () => {
      const target = this.pendingTarget;
      this.pendingTarget = null;
      board.focus({ preventScroll: true });
      if (target && this.attackDialog.returnValue === 'attack') {
        void this.commitPlayerAction(reduceGame(this.state, { type: 'attack', id: target }));
      }
    });
    button('end-turn').addEventListener('click', () => { void this.endPlayerTurn(); });
    for (const id of ['restart', 'restart-outcome']) {
      button(id).addEventListener('click', () => this.startChapter(this.state.chapterId));
    }
    const canPrepare = (): boolean => !this.busy && this.state.chapterId === 1 && this.state.winner === 'blue';
    const formationDialog = new FormationDialog(formation => {
      this.state = reduceGame(this.state, { type: 'prepare', formation });
      this.checkpoint();
    }, () => {
      if (canPrepare()) this.startChapter(2);
    });
    button('next-chapter').addEventListener('click', () => {
      if (canPrepare()) formationDialog.open(this.state.formation);
      else if (!this.busy && this.state.chapterId === 2 && this.state.winner === 'blue') this.startChapter(3);
    });
    const endingDialog = document.querySelector<HTMLDialogElement>('#ending-dialog')!;
    button('show-ending').addEventListener('click', () => {
      if (!this.busy && this.state.chapterId === 3 && this.state.winner === 'blue') {
        endingDialog.returnValue = '';
        endingDialog.showModal();
      }
    });
    endingDialog.addEventListener('close', () => {
      if (endingDialog.returnValue === 'title') this.openTitle();
    });
    this.titleDialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (!element('new-game-confirmation').hidden) this.showNewGameConfirmation(false);
    });
    button('return-title').addEventListener('click', () => this.openTitle());
    button('new-game').addEventListener('click', () => {
      if (this.hasProgress) this.showNewGameConfirmation(true);
      else this.beginCampaign();
    });
    button('cancel-new-game').addEventListener('click', () => this.showNewGameConfirmation(false));
    button('confirm-new-game').addEventListener('click', () => this.beginCampaign());
    button('continue-game').addEventListener('click', () => {
      this.titleDialog.close();
      this.soundKit.start();
      if (this.hasCheckpoint) element('checkpoint-status').textContent = '前回の続きから再開しました';
      if (this.state.winner) this.focusOutcome();
      else {
        this.showChapterBanner();
        board.focus({ preventScroll: true });
      }
    });
    button('replay-campaign').addEventListener('click', () => {
      this.openTitle();
      this.showNewGameConfirmation(true);
    });
    this.setupSoundControls();
    window.__GAME_TEST__ = { getState: () => structuredClone(this.state), isBusy: () => this.busy };
    this.resetUnits();
    this.drawChapterLabels();
    this.drawUi();
    this.openTitle();
  }

  private setupSoundControls(): void {
    try {
      this.soundKit.setEnabled(window.localStorage.getItem(soundPreferenceKey) !== 'off');
    } catch { /* The buttons still work when storage is unavailable. */ }
    const controls = [button('sound-toggle'), button('title-sound-toggle')];
    const refresh = (): void => {
      const enabled = this.soundKit.isEnabled;
      for (const control of controls) {
        control.setAttribute('aria-pressed', String(enabled));
        control.textContent = enabled ? '♪ 音声 ON' : '♪ 音声 OFF';
      }
    };
    const toggle = (): void => {
      const enabled = !this.soundKit.isEnabled;
      this.soundKit.setEnabled(enabled);
      if (enabled && !this.titleDialog.open) this.soundKit.start();
      try {
        window.localStorage.setItem(soundPreferenceKey, enabled ? 'on' : 'off');
      } catch { /* Keep the current session's choice. */ }
      refresh();
    };
    controls.forEach(control => control.addEventListener('click', toggle));
    const visibilityChanged = (): void => {
      if (document.hidden) this.soundKit.stop();
      else if (!this.titleDialog.open) this.soundKit.start();
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', visibilityChanged);
      controls.forEach(control => control.removeEventListener('click', toggle));
      this.soundKit.stop();
    });
    refresh();
  }

  private openTitle(): void {
    if (this.busy || this.titleDialog.open) return;
    this.soundKit.stop();
    const resume = button('continue-game');
    resume.disabled = !this.hasProgress;
    const mission = chapter(this.state.chapterId);
    const cleared = this.state.chapterId === 3 && this.state.winner === 'blue';
    const number = this.state.chapterId === 3 ? '終章' : `第${this.state.chapterId}章`;
    element('title-checkpoint').textContent = this.hasProgress
      ? cleared ? '全3章クリア · エンディングを再読できます' : `${number} · ${mission.title}`
      : '保存データはありません';
    element('title-options').hidden = false;
    element('new-game-confirmation').hidden = true;
    this.titleDialog.showModal();
    (resume.disabled ? button('new-game') : resume).focus();
  }

  private showNewGameConfirmation(show: boolean): void {
    element('title-options').hidden = show;
    element('new-game-confirmation').hidden = !show;
    button(show ? 'cancel-new-game' : 'new-game').focus();
  }

  private beginCampaign(): void {
    this.titleDialog.close();
    this.hasProgress = true;
    (element('field-guide') as HTMLDetailsElement).open = true;
    this.startChapter(1);
  }

  private drawTerrain(): void {
    this.battlefield.removeAll(true);
    const grid = this.add.graphics();
    for (let y = 0; y < this.state.height; y++) {
      for (let x = 0; x < this.state.width; x++) {
        const point = { x, y };
        const variant = (x * 3 + y * 5) % 4;
        const terrain = terrainAt(this.state, point);
        let frame: string = terrain.frame === 'grass' ? `grass-${variant}` : terrain.frame;
        if (terrain.frame === 'water') {
          if (terrainAt(this.state, { x: x - 1, y }).frame !== 'water') frame = 'water-west';
          else if (terrainAt(this.state, { x: x + 1, y }).frame !== 'water') frame = 'water-east';
        }
        const left = MARGIN + x * TILE;
        const top = MARGIN + y * TILE;
        this.battlefield.add(this.add.image(left, top, 'battle-art', frame).setOrigin(0));
        grid.fillStyle(0x273a42, .16).fillRect(left, top, TILE, 1).fillRect(left, top, 1, TILE);
      }
    }
    this.battlefield.add(grid);
    grid.lineStyle(1, 0xe0bb78).strokeRect(MARGIN - 1, MARGIN - 1, this.state.width * TILE + 2, this.state.height * TILE + 2);
  }

  private onKey(event: KeyboardEvent): void {
    const arrows: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    };
    const offset = arrows[event.key];
    if (!offset && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (this.titleDialog.open || this.busy || this.state.winner) return;
    if (!this.cursor) {
      this.setCursor(this.state.units.find(unit => unit.id === this.state.selectedId) ??
        this.state.units.find(unit => unit.team === 'blue') ?? { x: 0, y: 0 });
    }
    if (!this.cursor) return;
    if (offset) {
      const point = { x: this.cursor.x + offset.x, y: this.cursor.y + offset.y };
      if (onBoard(this.state, point)) this.setCursor(point);
    } else {
      void this.playerTile(this.cursor);
    }
  }

  private setCursor(point: Point | null): void {
    const next = point && onBoard(this.state, point) ? point : null;
    if ((!next && !this.cursor) || (next && this.cursor && same(next, this.cursor))) return;
    this.cursor = next;
    this.drawCursor();
  }

  private drawCursor(): void {
    this.cursorLayer.clear();
    const detail = element('tile-detail');
    const chip = element('terrain-chip');
    if (!this.cursor || this.busy || this.state.winner) {
      chip.hidden = true;
      detail.textContent = this.state.winner ? '戦闘終了' : this.busy ? '行動中…' : '青の味方を選択';
      return;
    }
    const tile = terrainAt(this.state, this.cursor);
    chip.hidden = false;
    chip.querySelector('span')!.textContent = tile.cover ? `${tile.name} · 守り +1` : tile.blocked ? `${tile.name} · 通行不可` : tile.name;
    const frame = this.textures.getFrame('battle-art', tile.frame === 'grass' ? 'grass-0' : tile.frame);
    const context = chip.querySelector('canvas')!.getContext('2d')!;
    const atlas = frame.source.image;
    if (atlas instanceof HTMLCanvasElement) context.drawImage(atlas, frame.cutX, frame.cutY, TILE, TILE, 0, 0, TILE, TILE);
    const location = center(this.cursor);
    this.markCorners(this.cursorLayer, location, 9, 0xffedb5);
    const unit = this.state.units.find(item => same(item, this.cursor!));
    const selected = this.state.selectedId;
    const coordinates = `${String.fromCharCode(65 + this.cursor.x)}${this.cursor.y + 1}`;
    if (unit) {
      const forecast = selected && combatForecast(this.state, selected, unit.id);
      const cover = terrainAt(this.state, unit);
      detail.textContent = `${coordinates} · ${unitProfile(unit.id).name} · HP ${unit.hp}/${unit.maxHp}` +
        (cover.cover ? ` · ${cover.name}` : '') +
        (forecast ? ` · 与ダメージ ${forecast.opening.damage}／反撃 ${forecast.counter?.damage ?? 'なし'}` : '');
      return;
    }
    const route = selected ? movementPath(this.state, selected, this.cursor) : [];
    for (const step of route) {
      const { x, y } = center(step);
      this.cursorLayer.fillStyle(0xc6e7ff).fillRect(x - 1, y - 1, 2, 2);
    }
    const terrain = tile.cover ? `${tile.name}・被ダメージ −1` : tile.blocked ? `${tile.name}・通行不可` : tile.name;
    detail.textContent = `${coordinates} · ${route.length ? `移動 ${route.length}マス · ${terrain}` : terrain}`;
  }

  private markCorners(layer: Phaser.GameObjects.Graphics, { x, y }: Point, radius: number, color: number): void {
    layer.fillStyle(color);
    for (const left of [x - radius, x + radius - 4]) {
      for (const top of [y - radius, y + radius - 4]) {
        layer.fillRect(left, top === y - radius ? top : top + 3, 4, 1);
        layer.fillRect(left === x - radius ? left : left + 3, top, 1, 4);
      }
    }
  }

  private async playerTile(point: Point): Promise<void> {
    if (this.titleDialog.open || this.busy || this.state.turn !== 'blue' || this.state.winner) return;
    this.soundKit.start();
    const target = this.state.units.find(unit => unit.team === 'red' && same(unit, point));
    const source = this.state.units.find(unit => unit.id === this.state.selectedId);
    if (target && source) {
      const forecast = combatForecast(this.state, source.id, target.id);
      if (forecast) {
        const cover = terrainAt(this.state, target);
        const lines = [
          `攻撃  ${forecast.opening.damage}ダメージ · 敵HP ${target.hp} → ${forecast.opening.remainingHp}${cover.cover ? `（${cover.name} −1）` : ''}`,
          forecast.counter ? `反撃  ${forecast.counter.damage}ダメージ · 味方HP ${source.hp} → ${forecast.counter.remainingHp}` : '反撃なし',
        ];
        for (const [role, unit] of [['source', source], ['target', target]] as const) {
          drawPortrait(document.querySelector<HTMLCanvasElement>(`#forecast-${role}`)!, unit.id);
          element(`forecast-${role}-name`).textContent = unitProfile(unit.id).name;
          element(`forecast-${role}-weapon`).textContent = this.combatGear(unit);
        }
        element('attack-summary').replaceChildren(...lines.map(line => {
          const row = document.createElement('p');
          row.textContent = line;
          return row;
        }));
        this.pendingTarget = target.id;
        this.attackDialog.returnValue = '';
        this.attackDialog.showModal();
        return;
      }
    }
    await this.commitPlayerAction(handleTile(this.state, point));
  }

  private async commitPlayerAction(next: GameState): Promise<void> {
    if (this.busy || next === this.state) return;
    this.busy = true;
    await this.present(next);
    this.finish();
  }

  private async endPlayerTurn(): Promise<void> {
    if (this.busy || this.state.turn !== 'blue' || this.state.winner) return;
    this.soundKit.start();
    this.busy = true;
    this.state = reduceGame(this.state, { type: 'endTurn' });
    this.drawUi();
    this.showBanner('敵フェイズ', '敵部隊が行動します');
    this.soundKit.play('turn');
    await this.pause(700);
    for (const next of enemyTurnSteps(this.state)) {
      if (next.turn === 'blue') {
        this.state = next;
        this.drawUi();
        this.showBanner('味方フェイズ', `第${Math.ceil(next.turnNumber / 2)}ターン`);
        this.soundKit.play('turn');
        await this.pause(320);
      } else {
        await this.present(next);
        if (!next.winner) await this.pause(120);
      }
    }
    this.finish();
  }

  private finish(): void {
    this.busy = false;
    this.checkpoint();
    this.drawUi();
    if (this.state.winner) {
      this.soundKit.play(this.state.winner === 'blue' ? 'win' : 'lose');
      this.focusOutcome();
    }
  }

  private checkpoint(): void {
    try {
      saveCheckpoint(window.localStorage, this.state);
      this.hasCheckpoint = true;
      element('checkpoint-status').textContent = 'この端末に自動保存済み';
    } catch {
      this.hasCheckpoint = false;
      element('checkpoint-status').textContent = 'このブラウザでは保存できません';
    }
  }

  private startChapter(id: ChapterId): void {
    if (this.busy) return;
    this.state = id === 1 ? initialState(1) : initialState(id, this.state.formation);
    this.lastHit = '';
    this.cursor = null;
    this.drawTerrain();
    this.resetUnits();
    this.checkpoint();
    this.drawChapterLabels();
    this.drawUi();
    this.soundKit.play('turn');
    this.showChapterBanner();
    element('game').focus({ preventScroll: true });
  }

  private drawChapterLabels(): void {
    const { chapterId } = this.state;
    const mission = chapter(chapterId);
    document.querySelector('main')!.dataset.chapter = String(chapterId);
    element('chapter-label').textContent = chapterId === 3 ? '終章' : `第${chapterId}章`;
    element('chapter-number').textContent = String(chapterId).padStart(2, '0');
    element('seal-title').textContent = mission.title;
    element('briefing').textContent = mission.briefing;
    element('district').textContent = mission.district;
    element('mission-objective').textContent = mission.hold
      ? `${mission.objective}（敵フェイズを${this.state.holdGoal}回連続で防衛）` : mission.objective;
    element('escort-help').hidden = !mission.escort;
    element('hold-help').hidden = !mission.hold;
  }

  private showChapterBanner(): void {
    this.showBanner(this.state.chapterId === 3 ? '終章' : `第${this.state.chapterId}章`, chapter(this.state.chapterId).title);
  }

  private focusOutcome(): void {
    const next = button('next-chapter');
    const ending = button('show-ending');
    (next.hidden ? ending.hidden ? button('restart-outcome') : ending : next).focus({ preventScroll: true });
  }

  private drawUi(): void {
    this.marks.clear();
    const objective = chapter(this.state.chapterId).hold;
    const selected = this.state.units.find(unit => unit.id === this.state.selectedId);
    let canAttack = false;
    if (selected && !this.state.winner) {
      const player = !this.busy && this.state.turn === 'blue';
      for (const point of player ? movementRange(this.state, selected.id) : []) {
        const { x, y } = center(point);
        this.marks.fillStyle(0x649af5, .42).fillRect(x - 9, y - 9, 18, 18);
        this.marks.fillStyle(0xb5d6ff, .82).fillRect(x - 2, y + 6, 4, 1);
      }
      const attacks = player ? attackRange(this.state, selected.id) : [];
      for (const point of attacks) {
        const { x, y } = center(point);
        const target = this.state.units.some(unit => unit.team === 'red' && same(unit, point));
        if (target) {
          canAttack = true;
          this.marks.fillStyle(0xe57245, .19).fillRect(x - 9, y - 9, 18, 18);
          this.markCorners(this.marks, { x, y }, 8, 0xffb47b);
        } else {
          this.marks.fillStyle(0xeac084, .8).fillRect(x + 5, y - 6, 2, 2);
        }
      }
      const { x, y } = center(selected);
      this.marks.lineStyle(1, 0xffe295).strokeRect(x - 9, y - 9, 18, 18);
    }
    this.drawHoldStatus(objective?.point);
    if (!this.busy || this.state.turn === 'red') this.drawFieldGuide(selected, canAttack);
    this.drawCursor();
    const phase = this.state.turn === 'blue' ? '味方フェイズ' : '敵フェイズ';
    document.querySelector<HTMLElement>('.battle-frame')!.dataset.turn = this.state.turn;
    element('turn-label').textContent = `第${Math.ceil(this.state.turnNumber / 2)}ターン ／ ${phase}`;
    element('status').textContent = !element('combat-stage').hidden ? '交戦中…'
      : this.state.turn === 'red' && !this.state.winner ? '敵部隊が行動しています。' : this.state.message;
    element('selected-name').textContent = selected ? unitProfile(selected.id).name : 'ユニットを選択';
    const portrait = document.querySelector<HTMLCanvasElement>('#selected-portrait')!;
    portrait.hidden = !selected;
    if (selected) drawPortrait(portrait, selected.id);
    const profile = selected && battleProfile(this.state, selected.id);
    element('selected-detail').textContent = selected && profile
      ? `${profile.role} · HP ${selected.hp}/${selected.maxHp} · ${selected.attacked ? '行動済み' : selected.moved ? profile.reach === 0 ? '移動済み' : '攻撃可' : '行動可'}`
      : '騎士は隣接、星詠みは2マス先まで攻撃できます。';
    const loadout = selected && this.state.chapterId !== 1 ? formationBonuses(selected.id, this.state.formation).equipment : '';
    element('selected-equipment').textContent = loadout ? `装備　${loadout}` : '';
    element('selected-stats').textContent = profile?.reach === 0
      ? `移動 ${profile.movement}　守備 ${profile.defense}　耐術 ${profile.ward}　攻撃不可` : profile
      ? `攻撃 ${profile.power}　守備 ${profile.defense}　耐術 ${profile.ward}　射程 ${profile.reach}` : '';
    element('combat-log').textContent = this.lastHit || 'まだ交戦していません。';
    const escortId = chapter(this.state.chapterId).escort?.id;
    element('roster').replaceChildren(...this.state.units.filter(unit => unit.team === 'blue').map(unit => {
      const item = document.createElement('div');
      item.className = `roster-unit${unit.id === escortId ? ' escort' : ''}${unit.attacked ? ' spent' : ''}`;
      const portrait = document.createElement('canvas');
      portrait.width = portrait.height = PORTRAIT_SIZE;
      portrait.className = 'roster-portrait';
      portrait.setAttribute('aria-hidden', 'true');
      drawPortrait(portrait, unit.id);
      const info = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = unitProfile(unit.id).name;
      const hp = document.createElement('small');
      hp.textContent = `HP ${unit.hp}/${unit.maxHp}`;
      info.append(name, hp);
      item.append(portrait, info);
      return item;
    }));
    button('end-turn').disabled = this.busy || this.state.turn !== 'blue' || this.state.winner !== null;
    button('restart').disabled = this.busy;
    button('return-title').disabled = this.busy;
    const finished = !this.busy && this.state.winner !== null;
    const won = finished && this.state.winner === 'blue';
    const { escort, hold } = chapter(this.state.chapterId);
    element('outcome').hidden = !finished;
    const next = button('next-chapter');
    next.hidden = !won || Boolean(hold);
    next.textContent = escort ? '終章へ進む →' : '編成へ進む →';
    const ending = button('show-ending');
    ending.hidden = !won || !hold;
    button('replay-campaign').hidden = !won || !hold;
    button('restart-outcome').classList.toggle('secondary', !next.hidden || !ending.hidden);
    button('replay-campaign').classList.add('secondary');
    if (this.state.winner) {
      element('outcome').dataset.result = this.state.winner;
      const win = this.state.winner === 'blue';
      element('outcome-heading').textContent = win
        ? hold ? '見張り台を守り抜いた！' : escort ? '護衛成功！' : '戦いに勝利！'
        : escort ? '護衛失敗' : hold ? '見張り台は陥落した' : '部隊は敗走した';
      element('outcome-copy').textContent = win
        ? hold ? '尾根の火が夜明けを告げた。' : escort ? 'ナギが灯火台に到着した。尾根の見張り台へ向かおう。' : '峠を守り抜いた。次は東岸までナギを送り届けよう。'
        : escort ? 'ナギを守りきれなかった。' : 'もう一度、陣形を整えて挑もう。';
    }
  }

  private drawHoldStatus(point: Point | undefined): void {
    const progress = element('hold-progress');
    const status = element('hold-status');
    progress.hidden = status.hidden = !point;
    if (!point) return;
    const guard = this.state.units.find(unit => same(unit, point));
    const text = `防衛 ${this.state.holdTurns} / ${this.state.holdGoal}`;
    if (progress.textContent !== text) progress.textContent = text;
    status.dataset.control = guard?.team ?? 'empty';
    status.textContent = guard ? `見張り台 · ${unitProfile(guard.id).name}` : '見張り台 · 無人';
    if (this.state.winner) return;
    const color = guard?.team === 'blue' ? 0x94eded : guard?.team === 'red' ? 0xff997e : 0xffd785;
    this.markCorners(this.marks, center(point), 9, color);
  }

  private drawFieldGuide(selected: Unit | undefined, canAttack: boolean): void {
    const guide = element('field-guide');
    guide.hidden = this.state.chapterId !== 1 || this.state.winner !== null;
    if (guide.hidden) return;
    const hint = element('field-hint');
    const text = this.state.turn === 'red' ? '敵フェイズ中は、敵の移動と攻撃を見守ります。'
      : this.state.units.filter(unit => unit.team === 'blue').every(unit => unit.attacked) ? '味方は行動済みです。「行動を終える」で敵フェイズへ進みます。'
      : !selected ? '青い味方を選びます。マスはクリック・タップ、または矢印キーと Enter で操作できます。'
      : selected.attacked ? 'この味方は行動済みです。別の味方を選ぶか、「行動を終える」を押します。'
      : canAttack ? '橙の枠が付いた敵を選ぶと、与えるダメージと敵の反撃を確認できます。'
      : selected.moved ? '攻撃できる敵がいません。別の味方を選ぶか、「行動を終える」を押します。'
      : '青く光るマスを選ぶと移動します。低木に入ると受けるダメージが1減ります。';
    if (hint.textContent !== text) hint.textContent = text;
  }

  private async present(next: GameState): Promise<void> {
    const previous = this.state;
    const source = previous.units.find(unit => unit.id === previous.selectedId);
    const moved = source && next.units.find(unit => unit.id === source.id && !same(source, unit));
    const hit = source && previous.units.find(old => old.team !== source.team &&
      (next.units.find(unit => unit.id === old.id)?.hp ?? 0) < old.hp);
    if (source && hit) {
      const forecast = combatForecast(previous, source.id, hit.id)!;
      const terrain = [terrainAt(previous, source).frame, terrainAt(previous, hit).frame];
      const ground: ArenaGround = terrain.includes('bridge') ? 'wood'
        : terrain.some(tile => ['horizontal', 'north', 'south', 'vertical'].includes(tile)) ? 'road' : 'meadow';
      this.combatStage.open(source, hit, ground, unit => this.combatGear(unit));
      this.drawUi();
      if (!this.reduceMotion.matches) await this.pause(duelTiming.enter);
      await this.showHit(source, hit, forecast.opening, false);
      if (forecast.counter) await this.showHit(hit, source, forecast.counter, true);
      this.combatStage.exit();
      if (!this.reduceMotion.matches) await this.pause(duelTiming.exit);
      this.combatStage.close();
    }
    this.state = next;
    this.drawUi();
    if (source && moved) {
      const view = this.views.get(source.id)!;
      const { body, sprite } = view;
      this.soundKit.play('move');
      for (const point of movementPath(previous, source.id, moved)) {
        const position = center(point);
        const horizontal = position.x !== body.x;
        const facing: MapFacing = horizontal ? 'side' : position.y < body.y ? 'north' : 'south';
        const walk = `${source.id}-${facing}-walk`;
        view.facing = facing;
        sprite.setFlipX(horizontal && position.x < body.x);
        if (this.reduceMotion.matches) body.setPosition(position.x, position.y);
        else {
          sprite.play(walk, true);
          await this.tween(body, { ...position, duration: 116, ease: 'Sine.easeInOut' });
        }
      }
      sprite.stop();
    } else if (!hit) {
      this.soundKit.play('select');
    }
    for (const unit of next.units) this.updateHealth(this.views.get(unit.id)!, unit);
  }

  private combatGear(unit: Unit): string {
    const kit = this.state.chapterId !== 1 ? formationBonuses(unit.id, this.state.formation).equipment : '';
    if (kit) return kit;
    const role = unitProfile(unit.id);
    if (!role.reach) return '渡し守の杖';
    if (unit.id === 'blue-1') return '峠の剣';
    if (unit.id === 'blue-2') return '星詠みの杖';
    return role.style === 'blade' ? '鉄牙の斧' : '灰火の杖';
  }

  private async showHit(source: Unit, target: Unit, strike: Strike, counter: boolean): Promise<void> {
    await this.combatStage.windup(strike, counter);
    this.soundKit.play('attack');
    const { damage, remainingHp } = strike;
    this.combatStage.impact(strike);
    this.lastHit = `${unitProfile(source.id).name}の${counter ? '反撃' : strikeName(source)} → ${unitProfile(target.id).name} −${damage}${remainingHp ? '' : '（撃破）'}`;
    element('combat-log').textContent = this.lastHit;
    this.soundKit.play('hurt');
    const victim = this.views.get(target.id)!;
    this.updateHealth(victim, { ...target, hp: remainingHp });
    await this.combatStage.recover(strike);
    if (remainingHp === 0) {
      this.combatStage.fall(target.id);
      if (!this.reduceMotion.matches) await this.pause(160);
      victim.body.destroy();
      this.views.delete(target.id);
    }
  }

  private resetUnits(): void {
    for (const view of this.views.values()) view.body.destroy();
    this.views.clear();
    for (const unit of this.state.units) {
      const { x, y } = center(unit);
      const shadow = this.add.ellipse(0, 5, 13, 4, 0x233641, .7);
      const sprite = this.add.sprite(0, -2, 'battle-art', `${unit.id}-south-idle`);
      const health = this.add.graphics();
      const body = this.add.container(x, y, [shadow, sprite, health]).setDepth(2);
      const view: UnitView = { body, sprite, health, facing: 'south' };
      this.views.set(unit.id, view);
      this.updateHealth(view, unit);
    }
  }

  private updateHealth(view: UnitView, unit: Unit): void {
    const bar = view.health.clear();
    bar.fillStyle(0x20303a).fillRect(-8, 7, 16, 3);
    bar.fillStyle(unit.team === 'blue' ? 0x8ce3e6 : 0xffab87).fillRect(-7, 8, Math.round(14 * unit.hp / unit.maxHp), 1);
    bar.fillStyle(unit.team === 'blue' ? 0x8ce3e6 : 0xffab87).fillRect(-9, 4, 2, 2);
    if (!view.sprite.anims.isPlaying) {
      const poised = unit.id === this.state.selectedId && !unit.attacked;
      view.sprite.setFrame(`${unit.id}-${view.facing}-${poised ? 'ready' : 'idle'}`);
    }
    view.sprite.setAlpha(unit.attacked ? .74 : 1);
  }

  private showBanner(phase: string, title: string): void {
    const banner = element('phase-banner');
    banner.querySelector('span')!.textContent = phase;
    banner.querySelector('strong')!.textContent = title;
    banner.classList.add('visible');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => banner.classList.remove('visible'), 780);
  }

  private tween(targets: object, settings: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>): Promise<void> {
    return new Promise(resolve => this.tweens.add({ ...settings, targets, onComplete: () => resolve() }));
  }

  private pause(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, () => resolve()));
  }
}
