import { enemyTurnSteps } from '../src/game/ai';
import { expect, it } from 'vitest';
import { decodeCheckpoint, encodeCheckpoint } from '../src/game/checkpoint';
import { defaultFormation, type Formation } from '../src/game/formation';
import { battleProfile, combatForecast, initialState, reduceGame } from '../src/game/rules';

const formation: Formation = { astel: 'shield', lina: 'comet', training: 'vitality' };

it('keeps draft bonuses out of chapter one and applies the chosen trade-offs in chapter two', () => {
  const first = initialState();
  expect(reduceGame(first, { type: 'prepare', formation })).toBe(first);
  const victory = { ...first, winner: 'blue' as const, units: first.units.filter(unit => unit.team === 'blue') };
  const draft = reduceGame(victory, { type: 'prepare', formation });
  expect(draft.formation).toEqual(formation);
  expect(battleProfile(draft, 'blue-1')).toMatchObject({ power: 5, defense: 3, ward: 1 });
  expect(decodeCheckpoint(encodeCheckpoint(draft))).toEqual(draft);
  const next = initialState(2, draft.formation);
  expect(battleProfile(next, 'blue-1')).toMatchObject({ power: 4, defense: 4, ward: 3 });
  expect(next.units.find(unit => unit.id === 'blue-1')).toMatchObject({ hp: 13, maxHp: 13 });
  expect(battleProfile(next, 'blue-2')).toMatchObject({ power: 7, ward: 2 });
  expect(reduceGame(next, { type: 'prepare', formation: defaultFormation })).toBe(next);
  expect(reduceGame(next, { type: 'restart' })).toEqual(next);
});

it('uses equipped power, defense and ward to resolve the forecast', () => {
  const state = initialState(2, formation);
  const lina = state.units.find(unit => unit.id === 'blue-2')!;
  Object.assign(lina, { x: 4, y: 5 });
  const selected = reduceGame(state, { type: 'select', id: lina.id });
  const forecast = combatForecast(selected, lina.id, 'red-2')!;
  expect(forecast.opening.damage).toBe(5);
  expect(forecast.counter?.damage).toBe(4);
  expect(reduceGame(selected, { type: 'attack', id: 'red-2' }).units.find(unit => unit.id === lina.id)?.hp).toBe(5);
});

it('migrates a version 1 save and rejects invalid version 2 loadouts', () => {
  const base = JSON.parse(encodeCheckpoint(initialState(2))) as Record<string, unknown>;
  const legacy = { ...base, version: 1, formation: undefined };
  expect(decodeCheckpoint(JSON.stringify(legacy))).toEqual(initialState(2));
  const altered = { ...base, formation: { ...formation, lina: 'shield' } };
  expect(decodeCheckpoint(JSON.stringify(altered))).toBeNull();
  const deployed = initialState(2, formation);
  expect(decodeCheckpoint(encodeCheckpoint(deployed))).toEqual(deployed);
});

it('allows only one training benefit and keeps standard gear available', () => {
  const focused = initialState(2, { ...defaultFormation, training: 'focus' });
  expect(focused.units.find(unit => unit.id === 'blue-1')?.maxHp).toBe(11);
  expect(battleProfile(focused, 'blue-2')).toMatchObject({ power: 6, ward: 3 });
  const stacked = initialState(2, { ...formation, training: 'focus' });
  expect(stacked.units.find(unit => unit.id === 'blue-1')?.maxHp).toBe(11);
  expect(battleProfile(stacked, 'blue-2')).toMatchObject({ power: 8, ward: 2 });
});


it('can clear chapter two with standard equipment and no training', () => {
  let state = initialState(2);
  const turns = [
    [{ id: 'blue-1', x: 2, y: 3 }, { id: 'blue-2', x: 1, y: 5 }, { id: 'blue-escort', x: 1, y: 3 }],
    [{ id: 'blue-1', x: 2, y: 5, target: 'red-2' }, { id: 'blue-2', x: 2, y: 4, target: 'red-1' }, { id: 'blue-escort', x: 3, y: 3 }],
    [{ id: 'blue-escort', x: 5, y: 3 }],
    [{ id: 'blue-escort', x: 7, y: 3 }],
  ];
  for (const orders of turns) {
    for (const { id, x, y, target } of orders) {
      state = reduceGame(state, { type: 'select', id });
      state = reduceGame(state, { type: 'move', x, y });
      expect(state.units.find(unit => unit.id === id)).toMatchObject({ x, y });
      if (target) state = reduceGame(state, { type: 'attack', id: target });
    }
    if (state.winner) break;
    state = enemyTurnSteps(reduceGame(state, { type: 'endTurn' })).at(-1)!;
  }
  expect(state.winner).toBe('blue');
});
