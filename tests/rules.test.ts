import { describe, expect, it } from 'vitest';
import { attackRange, combatForecast, initialState, movementPath, movementRange, reduceGame } from '../src/game/rules';

describe('game rules', () => {
  it('moves at most three tiles around walls and occupied tiles', () => {
    const state = initialState();
    const range = movementRange(state, 'blue-1');
    expect(range).toContainEqual({ x: 2, y: 1 });
    expect(range).not.toContainEqual({ x: 3, y: 2 });
    expect(range).not.toContainEqual({ x: 6, y: 1 });
    const selected = reduceGame(state, { type: 'select', id: 'blue-1' });
    const moved = reduceGame(selected, { type: 'move', x: 2, y: 1 });
    expect(moved.units.find(unit => unit.id === 'blue-1')).toMatchObject({ x: 2, y: 1, moved: true });
    expect(reduceGame(moved, { type: 'move', x: 2, y: 0 })).toBe(moved);
  });

  it('attacks only adjacent enemies and removes defeated units', () => {
    const state = initialState();
    state.units.find(unit => unit.id === 'red-1')!.x = 2;
    const selected = reduceGame(state, { type: 'select', id: 'blue-1' });
    expect(attackRange(selected, 'blue-1')).toContainEqual({ x: 2, y: 1 });
    const attacked = reduceGame(selected, { type: 'attack', id: 'red-1' });
    expect(attacked.units.find(unit => unit.id === 'red-1')?.hp).toBe(4);
    expect(reduceGame(attacked, { type: 'attack', id: 'red-1' })).toBe(attacked);
    const finishing = initialState();
    finishing.units.find(unit => unit.id === 'red-1')!.x = 2;
    finishing.units.find(unit => unit.id === 'red-1')!.hp = 1;
    finishing.units = finishing.units.filter(unit => unit.id !== 'red-2');
    const result = reduceGame(reduceGame(finishing, { type: 'select', id: 'blue-1' }), { type: 'attack', id: 'red-1' });
    expect(result.winner).toBe('blue');
    expect(result.units.some(unit => unit.team === 'red')).toBe(false);
  });

  it('switches teams and refreshes that team’s actions', () => {
    const state = initialState();
    const blueMoved = reduceGame(reduceGame(state, { type: 'select', id: 'blue-1' }), { type: 'move', x: 2, y: 1 });
    const redTurn = reduceGame(blueMoved, { type: 'endTurn' });
    expect(redTurn).toMatchObject({ turn: 'red', turnNumber: 2, selectedId: null });
    expect(movementRange(redTurn, 'blue-1')).toEqual([]);
    const blueTurn = reduceGame(redTurn, { type: 'endTurn' });
    expect(blueTurn.units.find(unit => unit.id === 'blue-1')?.moved).toBe(false);
    expect(blueTurn.turnNumber).toBe(3);
  });
});

it('returns a legal route around the ruined wall', () => {
  const state = initialState();
  state.units[0].x = 2;
  state.units[0].y = 2;
  expect(movementPath(state, 'blue-1', { x: 4, y: 1 })).toEqual([
    { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
  ]);
  expect(movementPath(state, 'blue-1', { x: 4, y: 2 })).toEqual([]);
});

it('lets a spell reach two tiles, with ruins blocking the path', () => {
  const state = initialState();
  Object.assign(state.units[1], { x: 2, y: 2 });
  Object.assign(state.units[2], { x: 2, y: 0 });
  expect(attackRange(state, 'blue-2')).toContainEqual({ x: 2, y: 0 });
  expect(attackRange(state, 'blue-2')).not.toContainEqual({ x: 4, y: 2 });
  const selected = reduceGame(state, { type: 'select', id: 'blue-2' });
  expect(reduceGame(selected, { type: 'attack', id: 'red-1' }).units[2].hp).toBe(4);
});

it('uses cover and resistance with the same result in forecast and combat', () => {
  const state = initialState();
  Object.assign(state.units[1], { x: 5, y: 1 });
  Object.assign(state.units[3], { x: 6, y: 0 });
  const selected = reduceGame(state, { type: 'select', id: 'blue-2' });
  const forecast = combatForecast(selected, 'blue-2', 'red-2');
  expect(forecast?.opening).toMatchObject({ damage: 2, remainingHp: 5 });
  expect(forecast?.counter).toMatchObject({ damage: 3, remainingHp: 6 });
  const result = reduceGame(selected, { type: 'attack', id: 'red-2' });
  expect(result.units[3].hp).toBe(5);
  expect(result.units[1].hp).toBe(6);
  expect(selected.units[1].hp).toBe(9);
});

it('suppresses a counter when out of range or defeated, and resolves a lethal counter', () => {
  const state = initialState();
  Object.assign(state.units[2], { x: 3, y: 4 });
  expect(combatForecast(state, 'blue-2', 'red-1')?.counter).toBeNull();
  state.units = state.units.filter(unit => unit.id !== 'blue-2');
  const [knight, raider] = state.units;
  Object.assign(raider, { x: 2, y: 1, hp: 2 });
  expect(combatForecast(state, knight.id, raider.id)?.counter).toBeNull();
  raider.hp = 7;
  knight.hp = 1;
  const selected = reduceGame(state, { type: 'select', id: knight.id });
  expect(reduceGame(selected, { type: 'attack', id: raider.id }).winner).toBe('red');
});
