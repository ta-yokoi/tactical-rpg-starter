import { expect, it } from 'vitest';
import { enemyTurnSteps } from '../src/game/ai';
import { initialState, reduceGame } from '../src/game/rules';

it('moves the enemy team, attacks adjacent heroes, then returns control', () => {
  const state = reduceGame(initialState(), { type: 'endTurn' });
  const steps = enemyTurnSteps(state);
  const last = steps.at(-1)!;
  expect(steps.length).toBeGreaterThan(2);
  expect(last.turn).toBe('blue');
  expect(last.turnNumber).toBe(3);
  expect(last.units.find(unit => unit.id === 'red-1')?.x).toBeLessThan(6);

  const nearby = reduceGame(initialState(), { type: 'endTurn' });
  nearby.units.find(unit => unit.id === 'red-1')!.x = 2;
  const attacked = enemyTurnSteps(nearby).at(-1)!;
  expect(attacked.units.find(unit => unit.id === 'blue-1')?.hp).toBe(4);
});

it('can restart after victory', () => {
  const won = initialState();
  won.winner = 'blue';
  expect(reduceGame(won, { type: 'restart' })).toEqual(initialState());
});

it('ends the encounter when the enemy defeats the last hero', () => {
  const state = reduceGame(initialState(), { type: 'endTurn' });
  state.units = state.units.filter(unit => unit.id !== 'blue-2');
  state.units.find(unit => unit.id === 'blue-1')!.hp = 1;
  state.units.find(unit => unit.id === 'red-1')!.x = 2;
  const final = enemyTurnSteps(state).at(-1)!;
  expect(final.winner).toBe('red');
  expect(final.turn).toBe('red');
});
