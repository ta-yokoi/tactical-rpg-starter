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
  nearby.units = nearby.units.filter(unit => ['blue-1', 'red-1'].includes(unit.id));
  const attacked = enemyTurnSteps(nearby).at(-1)!;
  expect(attacked.units.find(unit => unit.id === 'blue-1')?.hp).toBe(9);
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

it('spends movement to cast from outside the knight’s counter range', () => {
  const state = reduceGame(initialState(), { type: 'endTurn' });
  const knight = state.units.find(unit => unit.id === 'blue-1')!;
  const mage = state.units.find(unit => unit.id === 'red-2')!;
  Object.assign(knight, { x: 2, y: 1 });
  Object.assign(mage, { x: 3, y: 1 });
  state.units = [knight, mage];
  const final = enemyTurnSteps(state).at(-1)!;
  const caster = final.units.find(unit => unit.id === mage.id)!;
  expect(Math.abs(caster.x - knight.x) + Math.abs(caster.y - knight.y)).toBe(2);
  expect(caster.hp).toBe(mage.hp);
  expect(final.units.find(unit => unit.id === knight.id)?.hp).toBe(6);
});
