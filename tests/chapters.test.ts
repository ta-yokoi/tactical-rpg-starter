import { expect, it } from 'vitest';
import { decodeCheckpoint, encodeCheckpoint } from '../src/game/checkpoint';
import { attackRange, combatForecast, initialState, movementPath, reduceGame } from '../src/game/rules';

it('lets Nagi use the bridge, with a mobility limit and no attacks or counters', () => {
  const state = initialState(2);
  const escort = state.units.find(unit => unit.id === 'blue-escort')!;
  Object.assign(escort, { x: 2, y: 3 });
  expect(movementPath(state, escort.id, { x: 4, y: 3 })).toEqual([{ x: 3, y: 3 }, { x: 4, y: 3 }]);
  expect(movementPath(state, escort.id, { x: 5, y: 3 })).toEqual([]);
  expect(movementPath(state, escort.id, { x: 3, y: 4 })).toEqual([]);
  expect(attackRange(state, escort.id)).toEqual([]);
  const enemy = state.units.find(unit => unit.id === 'red-1')!;
  enemy.x = 3;
  const red = reduceGame(state, { type: 'endTurn' });
  expect(combatForecast(red, enemy.id, escort.id)?.counter).toBeNull();
});

it('wins when Nagi reaches the beacon, even with enemies remaining', () => {
  const state = initialState(2);
  const escort = state.units.find(unit => unit.id === 'blue-escort')!;
  escort.x = 5;
  state.units.find(unit => unit.id === 'red-1')!.y = 1;
  state.selectedId = escort.id;
  const won = reduceGame(state, { type: 'move', x: 7, y: 3 });
  expect(won.winner).toBe('blue');
  expect(won.units.some(unit => unit.team === 'red')).toBe(true);
  expect(reduceGame(won, { type: 'restart' })).toEqual(initialState(2));
});

it('keeps escorting after defeating the last enemy and loses if Nagi falls', () => {
  const state = initialState(2);
  const [knight, lina, escort, enemy] = state.units;
  state.units = [knight, lina, escort, enemy];
  Object.assign(enemy, { x: 2, y: 3, hp: 1 });
  state.selectedId = knight.id;
  const cleared = reduceGame(state, { type: 'attack', id: enemy.id });
  expect(cleared.winner).toBeNull();
  expect(cleared.units.every(unit => unit.team === 'blue')).toBe(true);
  Object.assign(enemy, { x: 0, y: 2 });
  escort.hp = 1;
  const red = reduceGame(state, { type: 'endTurn' });
  red.selectedId = enemy.id;
  const lost = reduceGame(red, { type: 'attack', id: escort.id });
  expect(lost.winner).toBe('red');
  expect(lost.units.some(unit => unit.team === 'blue')).toBe(true);
  expect(decodeCheckpoint(encodeCheckpoint(lost))).toEqual(lost);
});

it('round-trips a chapter checkpoint and rejects invalid versions and positions', () => {
  const state = initialState(2);
  const selected = reduceGame(state, { type: 'select', id: 'blue-2' });
  const moved = reduceGame(selected, { type: 'move', x: 3, y: 5 });
  expect(decodeCheckpoint(encodeCheckpoint(moved))).toEqual(moved);
  expect(decodeCheckpoint('{bad json')).toBeNull();
  expect(decodeCheckpoint(JSON.stringify({ ...JSON.parse(encodeCheckpoint(moved)), version: 9 }))).toBeNull();
  expect(decodeCheckpoint(JSON.stringify({ ...JSON.parse(encodeCheckpoint(moved)), winner: 'blue' }))).toBeNull();
  moved.units[1].y = 4;
  expect(decodeCheckpoint(encodeCheckpoint(moved))).toBeNull();
});
