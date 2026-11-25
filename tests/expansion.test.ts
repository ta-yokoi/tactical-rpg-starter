import { expect, it } from 'vitest';
import { chapter, lastChapter, nextChapter } from '../src/game/chapters';
import { decodeCheckpoint, encodeCheckpoint } from '../src/game/checkpoint';
import { battleWinner, initialState, reduceGame, terrainAt } from '../src/game/rules';
import { mapUnitIds } from '../src/scene/mapUnits';

it('continues from the original three chapters into two battles with valid starting tiles', () => {
  expect(nextChapter(3)).toBe(4);
  expect(nextChapter(4)).toBe(lastChapter);
  expect(nextChapter(lastChapter)).toBeUndefined();
  for (const id of [4, 5] as const) {
    const state = initialState(id);
    expect(state.units.filter(unit => unit.team === 'blue')).toHaveLength(4);
    expect(state.units.filter(unit => unit.team === 'red')).toHaveLength(id === 4 ? 3 : 4);
    expect(new Set(state.units.map(({ x, y }) => `${x},${y}`)).size).toBe(state.units.length);
    for (const unit of state.units) {
      expect(mapUnitIds).toContain(unit.id);
      expect(terrainAt(state, unit).blocked).toBe(false);
    }
    expect(chapter(id).aftermath?.paragraphs.length).toBeGreaterThan(1);
    expect(decodeCheckpoint(encodeCheckpoint(state))).toEqual(state);
  }
});

it('requires both control tiles at once and retains partial control in a save', () => {
  const state = initialState(4);
  state.units = state.units.filter(unit => unit.id !== 'red-1' && unit.id !== 'red-3');
  Object.assign(state.units.find(unit => unit.id === 'blue-1')!, { x: 6, y: 1 });
  expect(battleWinner(state)).toBeNull();
  expect(decodeCheckpoint(encodeCheckpoint(state))).toEqual(state);
  Object.assign(state.units.find(unit => unit.id === 'blue-3')!, { x: 5, y: 4 });
  const selected = reduceGame(state, { type: 'select', id: 'blue-3' });
  const won = reduceGame(selected, { type: 'move', x: 6, y: 4 });
  expect(won.winner).toBe('blue');
  expect(won.units.some(unit => unit.team === 'red')).toBe(true);
  expect(decodeCheckpoint(encodeCheckpoint(won))).toEqual(won);
});

it('completes the last chapter when the commander falls with other enemies still standing', () => {
  const state = initialState(5);
  Object.assign(state.units.find(unit => unit.id === 'blue-3')!, { x: 7, y: 3 });
  Object.assign(state.units.find(unit => unit.id === 'red-4')!, { hp: 1 });
  const selected = reduceGame(state, { type: 'select', id: 'blue-3' });
  const won = reduceGame(selected, { type: 'attack', id: 'red-4' });
  expect(won.winner).toBe('blue');
  expect(won.units.filter(unit => unit.team === 'red')).toHaveLength(3);
  expect(decodeCheckpoint(encodeCheckpoint(won))).toEqual(won);
});
