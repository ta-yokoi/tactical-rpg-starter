import { describe, expect, it } from 'vitest';
import { attackRange, initialState, movementRange, reduceGame } from '../src/game/rules';

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
    expect(attacked.units.find(unit => unit.id === 'red-1')?.hp).toBe(2);
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
