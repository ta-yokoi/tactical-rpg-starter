import { expect, it } from 'vitest';
import { enemyTurnSteps } from '../src/game/ai';
import { decodeCheckpoint, encodeCheckpoint } from '../src/game/checkpoint';
import { defaultFormation, type Formation } from '../src/game/formation';
import { initialState, reduceGame, terrainAt, type GameState } from '../src/game/rules';

const finishEnemyTurn = (state: GameState): GameState =>
  enemyTurnSteps(reduceGame(state, { type: 'endTurn' })).at(-1)!;

type Order = { id: string; x: number; y: number; target?: string };
const astel = (x: number, y: number, target?: string): Order => ({ id: 'blue-1', x, y, target });
const lina = (x: number, y: number, target?: string): Order => ({ id: 'blue-2', x, y, target });
const opening = [astel(4, 2), lina(3, 4)];
const formations: Formation[] = (['standard', 'shield'] as const).flatMap(astel =>
  (['standard', 'comet'] as const).flatMap(lina =>
    (['none', 'vitality', 'focus'] as const).map(training => ({ astel, lina, training }))));

function playTurn(start: GameState, orders: Order[]): GameState {
  let state = start;
  for (const { id, x, y, target } of orders) {
    const unit = state.units.find(unit => unit.id === id)!;
    state = reduceGame(state, { type: 'select', id });
    expect(state.selectedId).toBe(id);
    if (unit.x !== x || unit.y !== y) {
      state = reduceGame(state, { type: 'move', x, y });
      expect(state.units.find(unit => unit.id === id)).toMatchObject({ x, y });
    }
    if (target) {
      const next = reduceGame(state, { type: 'attack', id: target });
      expect(next).not.toBe(state);
      state = next;
    }
  }
  return finishEnemyTurn(state);
}

it.each(formations)('defends the tower with $astel / $lina / $training and both allies survive', formation => {
  const state = initialState(3, formation);
  const held = playTurn(state, opening);
  expect(held).toMatchObject({ holdTurns: 1, holdGoal: 3, winner: null });
  expect(decodeCheckpoint(encodeCheckpoint(held))).toEqual(held);

  let second: Order[];
  let third: Order[];
  if (formation.astel === 'shield') {
    second = [astel(4, 2, 'red-1'), lina(3, 4, 'red-2')];
    third = [formation.lina === 'comet' || formation.training === 'focus' ? lina(3, 4, 'red-2') : lina(1, 3)];
  } else if (formation.lina === 'comet') {
    second = [astel(5, 1), lina(4, 2, 'red-1')];
    third = [lina(4, 2, 'red-2')];
  } else if (formation.training === 'focus') {
    second = [astel(5, 1, 'red-1'), lina(4, 2, 'red-1')];
    third = [lina(4, 2, 'red-2')];
  } else {
    second = [astel(5, 1), lina(4, 2, 'red-2')];
    third = [astel(5, 1, 'red-1'), lina(4, 2, 'red-2')];
  }

  const defended = playTurn(held, second);
  expect(defended).toMatchObject({ holdTurns: 2, winner: null });
  expect(defended.units.find(unit => unit.x === 4 && unit.y === 2)?.id)
    .toBe(formation.astel === 'shield' ? 'blue-1' : 'blue-2');
  const won = playTurn(defended, third);
  expect(won).toMatchObject({ holdTurns: 3, winner: 'blue' });
  expect(won.units.filter(unit => unit.team === 'blue')).toHaveLength(2);
  expect(decodeCheckpoint(encodeCheckpoint(won))).toEqual(won);
});

it('pressures the tower from range and breaks a lone standard guard on the third enemy phase', () => {
  const state = initialState(3);
  expect(terrainAt(state, { x: 4, y: 2 })).toMatchObject({ name: '見張り台', cover: 1 });
  const first = playTurn(state, [astel(4, 2)]);
  expect(first.units.find(unit => unit.id === 'blue-1')?.hp).toBe(6);
  const second = finishEnemyTurn(first);
  expect(second.units.find(unit => unit.id === 'blue-1')?.hp).toBe(1);
  const third = finishEnemyTurn(second);
  expect(third).toMatchObject({ holdTurns: 0, winner: null });
  expect(third.units.some(unit => unit.id === 'blue-1')).toBe(false);
  const overrun = finishEnemyTurn(third);
  expect(overrun.units.find(unit => unit.x === 4 && unit.y === 2)?.team).toBe('red');
});

it('preserves the two-phase goal of both in-progress and completed version-3 saves', () => {
  const first = playTurn(initialState(3, defaultFormation), [astel(4, 2)]);
  const legacy = JSON.parse(encodeCheckpoint(first));
  legacy.version = 3;
  delete legacy.holdGoal;
  const resumed = decodeCheckpoint(JSON.stringify(legacy))!;
  expect(resumed).toEqual({ ...first, holdGoal: 2 });
  expect(decodeCheckpoint(encodeCheckpoint(resumed))).toEqual(resumed);
  const won = finishEnemyTurn(resumed);
  expect(won).toMatchObject({ holdTurns: 2, holdGoal: 2, winner: 'blue' });
  const oldWin = { ...JSON.parse(encodeCheckpoint(won)), version: 3, holdGoal: undefined };
  expect(decodeCheckpoint(JSON.stringify(oldWin))).toEqual(won);
  expect(reduceGame(won, { type: 'restart' }).holdGoal).toBe(3);
});

it('resets the streak if the watchtower is abandoned and preserves formation on retry', () => {
  const formation = { astel: 'shield', lina: 'comet', training: 'vitality' } as const;
  const state = initialState(3, formation);
  expect(state.units.find(unit => unit.id === 'blue-1')?.maxHp).toBe(13);
  const ready = reduceGame(state, { type: 'select', id: 'blue-1' });
  const placed = reduceGame(ready, { type: 'move', x: 4, y: 2 });
  placed.units = placed.units.filter(unit => unit.team === 'blue');
  const held = finishEnemyTurn(placed);
  expect(held).toMatchObject({ holdTurns: 1, winner: null });
  const left = reduceGame(reduceGame(held, { type: 'select', id: 'blue-1' }), { type: 'move', x: 3, y: 2 });
  const unguarded = finishEnemyTurn(left);
  expect(unguarded).toMatchObject({ holdTurns: 0, winner: null });
  expect(reduceGame(unguarded, { type: 'restart' })).toEqual(state);
});

it('retains an old version-2 escort victory so it can advance to the finale', () => {
  const state = initialState(2);
  const escort = state.units.find(unit => unit.id === 'blue-escort')!;
  escort.x = 7;
  state.winner = 'blue';
  const prior = { ...JSON.parse(encodeCheckpoint(state)), version: 2, holdTurns: undefined };
  expect(decodeCheckpoint(JSON.stringify(prior))).toEqual(state);
});
