import { chapter } from './chapters';
import { combatForecast, movementRange, reduceGame, terrainAt, type Action, type GameState, type Point, type Unit } from './rules';

const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** A deterministic opponent. Each returned state is one visible action. */
export function enemyTurnSteps(start: GameState): GameState[] {
  if (start.turn !== 'red' || start.winner) return [];
  const escort = chapter(start.chapterId).escort;
  const steps: GameState[] = [];
  let state = start;
  const apply = (action: Action): void => {
    const next = reduceGame(state, action);
    if (next !== state) { state = next; steps.push(state); }
  };

  for (const id of start.units.filter(unit => unit.team === 'red').map(unit => unit.id)) {
    if (state.winner) break;
    const enemy = state.units.find(unit => unit.id === id);
    if (!enemy) continue;
    const heroes = state.units.filter(unit => unit.team === 'blue');
    apply({ type: 'select', id });
    const options = [enemy, ...movementRange(state, id)];
    const attacks = options.flatMap(point => heroes.flatMap(hero => {
      const forecast = combatForecast(state, id, hero.id, point);
      if (!forecast) return [];
      const { opening, counter } = forecast;
      const score = 3 * Math.min(hero.hp, opening.damage) - 2 * (counter?.damage ?? 0) +
        (opening.remainingHp === 0 ? 12 : 0) + (hero.id === escort?.id ? 3 : 0) - (counter?.remainingHp === 0 ? 16 : 0);
      return [{ point, hero, score }];
    }));
    const best = attacks.sort((a, b) => b.score - a.score ||
      distance(a.point, enemy) - distance(b.point, enemy))[0];
    const position = best?.point ?? options.sort((a, b) =>
      nearest(a, heroes) - nearest(b, heroes) || terrainAt(state, b).cover - terrainAt(state, a).cover ||
      distance(a, enemy) - distance(b, enemy))[0];
    if (distance(position, enemy)) apply({ type: 'move', ...position });
    if (best) apply({ type: 'attack', id: best.hero.id });
  }

  if (!state.winner) apply({ type: 'endTurn' });
  return steps;
}

function nearest(point: Point, heroes: Unit[]): number {
  return Math.min(...heroes.map(hero => distance(point, hero)));
}
