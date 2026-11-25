import { chapter } from './chapters';
import { combatForecast, movementRange, reduceGame, terrainAt, type Action, type GameState, type Point } from './rules';

const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** A deterministic opponent. Each returned state is one visible action. */
export function enemyTurnSteps(start: GameState): GameState[] {
  if (start.turn !== 'red' || start.winner) return [];
  const { escort, hold, capture } = chapter(start.chapterId);
  const objectives = hold ? [hold.point] : capture;
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
      const objectiveGuard = objectives?.some(target => distance(hero, target) === 0);
      const objectiveScore = objectiveGuard ? (opening.remainingHp === 0 ? 18 : 6)
        : objectives?.some(target => distance(point, target) === 0) ? 8 : 0;
      const score = 3 * Math.min(hero.hp, opening.damage) - 2 * (counter?.damage ?? 0) +
        (opening.remainingHp === 0 ? 12 : 0) + (hero.id === escort?.id ? 3 : 0) -
        (counter?.remainingHp === 0 ? 16 : 0) + objectiveScore;
      return [{ point, hero, score }];
    }));
    const best = attacks.sort((a, b) => b.score - a.score ||
      distance(a.point, enemy) - distance(b.point, enemy))[0];
    const approach = objectives ?? heroes;
    const position = best?.point ?? options.sort((a, b) =>
      nearest(a, approach) - nearest(b, approach) || terrainAt(state, b).cover - terrainAt(state, a).cover ||
      distance(a, enemy) - distance(b, enemy))[0];
    if (distance(position, enemy)) apply({ type: 'move', ...position });
    if (best) apply({ type: 'attack', id: best.hero.id });
  }

  if (!state.winner) apply({ type: 'endTurn' });
  return steps;
}

function nearest(point: Point, targets: readonly Point[]): number {
  return Math.min(...targets.map(target => distance(point, target)));
}
