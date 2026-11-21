import { expect, it } from 'vitest';
import { enemyTurnSteps } from '../src/game/ai';
import { decodeCheckpoint, encodeCheckpoint } from '../src/game/checkpoint';
import { defaultFormation } from '../src/game/formation';
import { initialState, reduceGame, terrainAt, type GameState } from '../src/game/rules';

const finishEnemyTurn = (state: GameState): GameState =>
  enemyTurnSteps(reduceGame(state, { type: 'endTurn' })).at(-1)!;

it('wins with standard equipment after holding the tower for two enemy phases', () => {
  const state = initialState(3, defaultFormation);
  expect(terrainAt(state, { x: 4, y: 2 })).toMatchObject({ name: '見張り台', cover: 1 });
  const selected = reduceGame(state, { type: 'select', id: 'blue-1' });
  const placed = reduceGame(selected, { type: 'move', x: 4, y: 2 });
  expect(placed).toMatchObject({ holdTurns: 0, winner: null });
  const held = finishEnemyTurn(placed);
  expect(held).toMatchObject({ holdTurns: 1, winner: null });
  expect(decodeCheckpoint(encodeCheckpoint(held))).toEqual(held);
  const won = finishEnemyTurn(held);
  expect(won).toMatchObject({ holdTurns: 2, winner: 'blue' });
  expect(won.units.filter(unit => unit.team === 'blue')).toHaveLength(2);
  expect(won.units.some(unit => unit.team === 'red')).toBe(true);
  expect(decodeCheckpoint(encodeCheckpoint(won))).toEqual(won);
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
