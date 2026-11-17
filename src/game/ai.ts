import { attackRange, movementRange, reduceGame, type Action, type GameState, type Point, type Unit } from './rules';

const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** A deterministic, small opponent. Each returned state is one visible action. */
export function enemyTurnSteps(start: GameState): GameState[] {
  if (start.turn !== 'red' || start.winner) return [];
  const steps: GameState[] = [];
  let state = start;
  const apply = (action: Action): void => {
    const next = reduceGame(state, action);
    if (next !== state) { state = next; steps.push(state); }
  };
  for (const id of start.units.filter(unit => unit.team === 'red').map(unit => unit.id)) {
    if (state.winner) break;
    const enemy = state.units.find(unit => unit.id === id);
    const heroes = state.units.filter(unit => unit.team === 'blue');
    if (!enemy || !heroes.length) break;
    apply({ type: 'select', id });
    if (!adjacentTarget(state, enemy)) {
      const options = movementRange(state, id);
      const best = options.sort((a, b) => score(a, heroes) - score(b, heroes) ||
        distance(a, enemy) - distance(b, enemy) || a.y - b.y || a.x - b.x)[0];
      if (best) apply({ type: 'move', ...best });
    }
    const current = state.units.find(unit => unit.id === id);
    const target = current && adjacentTarget(state, current);
    if (target) apply({ type: 'attack', id: target.id });
  }
  if (!state.winner) apply({ type: 'endTurn' });
  return steps;
}

function adjacentTarget(state: GameState, enemy: Unit): Unit | undefined {
  const area = attackRange(state, enemy.id);
  return state.units.filter(unit => unit.team === 'blue' &&
    area.some(point => point.x === unit.x && point.y === unit.y))
    .sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0];
}

function score(point: Point, heroes: Unit[]): number {
  return Math.min(...heroes.map(hero => distance(point, hero)));
}
