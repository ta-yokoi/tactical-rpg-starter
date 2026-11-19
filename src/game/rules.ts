import { chapter, chapterTerrain, type ChapterId } from './chapters';
import { defaultFormation, formationBonuses, readFormation, type Formation } from './formation';
import { unitProfile } from './units';

export type Team = 'blue' | 'red';
export type Point = { x: number; y: number };
export type Unit = Point & { id: string; team: Team; hp: number; maxHp: number; moved: boolean; attacked: boolean };
export type GameState = {
  chapterId: ChapterId;
  formation: Formation;
  width: number;
  height: number;
  walls: Point[];
  units: Unit[];
  turn: Team;
  turnNumber: number;
  selectedId: string | null;
  winner: Team | null;
  message: string;
};
export type Action = { type: 'select'; id: string } | { type: 'move'; x: number; y: number } |
  { type: 'attack'; id: string } | { type: 'endTurn' } | { type: 'restart' } | { type: 'prepare'; formation: Formation };

const key = ({ x, y }: Point): string => `${x},${y}`;
const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const neighbors = ({ x, y }: Point): Point[] =>
  [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
export const onBoard = (state: GameState, { x, y }: Point): boolean =>
  x >= 0 && y >= 0 && x < state.width && y < state.height;
const copy = (state: GameState): GameState => ({ ...state, units: state.units.map(unit => ({ ...unit })) });
const unitAt = (state: GameState, point: Point): Unit | undefined =>
  state.units.find(unit => unit.hp > 0 && unit.x === point.x && unit.y === point.y);

export function terrainAt(state: GameState, point: Point) {
  const terrain = chapterTerrain(state.chapterId, point);
  if (state.walls.some(wall => key(wall) === key(point))) return { name: '石垣', frame: 'wall', cover: 0, blocked: true };
  return { ...terrain, cover: Number(terrain.frame === 'shrub'), blocked: terrain.frame === 'water' };
}

export function initialState(chapterId: ChapterId = 1, formation: Formation = defaultFormation): GameState {
  const mission = chapter(chapterId);
  return {
    chapterId, formation: { ...formation }, width: mission.map[0].length, height: mission.map.length,
    walls: mission.map.flatMap((row, y) => [...row].flatMap((tile, x) => tile === '#' ? [{ x, y }] : [])),
    units: mission.units.map(unit => {
      const hp = unit.maxHp + (chapterId === 2 ? formationBonuses(unit.id, formation).hp : 0);
      return { ...unit, hp, maxHp: hp };
    }),
    turn: 'blue', turnNumber: 1, selectedId: null, winner: null,
    message: mission.escort ? 'ナギを選び、橋を渡って灯火台へ向かいましょう。' : '青いユニットを選択してください。',
  };
}

export function battleWinner(state: GameState): Team | null {
  const escort = chapter(state.chapterId).escort;
  if (escort) {
    const traveler = state.units.find(unit => unit.id === escort.id && unit.hp > 0);
    if (!traveler) return 'red';
    return key(traveler) === key(escort.goal) ? 'blue' : null;
  }
  if (!state.units.some(unit => unit.team === 'red' && unit.hp > 0)) return 'blue';
  if (!state.units.some(unit => unit.team === 'blue' && unit.hp > 0)) return 'red';
  return null;
}

function movementRoutes(state: GameState, id: string): Map<string, Point[]> {
  const routes = new Map<string, Point[]>();
  const unit = state.units.find(item => item.id === id && item.hp > 0);
  if (!unit || unit.team !== state.turn || unit.moved || state.winner) return routes;
  const occupied = new Set(state.units.filter(item => item.hp > 0).map(key));
  const queue: { point: Point; path: Point[] }[] = [{ point: unit, path: [] }];
  for (let index = 0; index < queue.length; index++) {
    const { point, path } = queue[index];
    if (path.length >= unitProfile(id).movement) continue;
    for (const next of neighbors(point)) {
      const nextKey = key(next);
      if (!onBoard(state, next) || (occupied.has(nextKey) || terrainAt(state, next).blocked) || routes.has(nextKey)) continue;
      const route = [...path, next];
      routes.set(nextKey, route);
      queue.push({ point: next, path: route });
    }
  }
  return routes;
}

export function movementRange(state: GameState, id: string): Point[] {
  return [...movementRoutes(state, id).values()].map(route => route[route.length - 1]);
}

export function movementPath(state: GameState, id: string, destination: Point): Point[] {
  return movementRoutes(state, id).get(key(destination)) ?? [];
}

export function attackRange(state: GameState, id: string, origin?: Point): Point[] {
  const unit = state.units.find(item => item.id === id && item.hp > 0);
  if (!unit || unit.team !== state.turn || unit.attacked || state.winner) return [];
  return strikeRange(state, unit, origin ?? unit);
}

function strikeRange(state: GameState, unit: Unit, start: Point): Point[] {
  const open = (point: Point): boolean =>
    onBoard(state, point) && !state.walls.some(wall => distance(wall, point) === 0);
  const reach = unitProfile(unit.id).reach;
  if (reach === 0) return [];
  const adjacent = neighbors(start).filter(open);
  if (reach === 1) return adjacent;
  const area = new Map(adjacent.map(point => [key(point), point]));
  for (const step of adjacent) {
    for (const point of neighbors(step)) {
      if (distance(start, point) === 2 && open(point)) area.set(key(point), point);
    }
  }
  return [...area.values()];
}

export type Strike = {
  attackerId: string;
  defenderId: string;
  damage: number;
  remainingHp: number;
};

function strike(state: GameState, attacker: Unit, defender: Unit, origin: Point): Strike {
  const weapon = battleProfile(state, attacker.id);
  const armor = battleProfile(state, defender.id);
  const mitigation = weapon.style === 'blade' ? armor.defense : armor.ward;
  const damage = Math.max(1, weapon.power - mitigation - terrainAt(state, origin).cover);
  return {
    attackerId: attacker.id, defenderId: defender.id, damage,
    remainingHp: Math.max(0, defender.hp - damage),
  };
}

export function combatForecast(state: GameState, attackerId: string, defenderId: string, origin?: Point) {
  const attacker = state.units.find(unit => unit.id === attackerId && unit.hp > 0);
  const defender = state.units.find(unit => unit.id === defenderId && unit.hp > 0);
  if (!attacker || !defender || attacker.team === defender.team ||
      !attackRange(state, attackerId, origin).some(point => key(point) === key(defender))) return null;
  const opening = strike(state, attacker, defender, defender);
  const position = origin ?? attacker;
  const counter = opening.remainingHp && strikeRange(state, defender, defender).some(point => key(point) === key(position))
    ? strike(state, defender, attacker, position) : null;
  return { opening, counter };
}

export function battleProfile(state: GameState, id: string) {
  return unitProfile(id, state.chapterId === 2 ? state.formation : undefined);
}

export function reduceGame(state: GameState, action: Action): GameState {
  if (action.type === 'restart') return initialState(state.chapterId, state.chapterId === 2 ? state.formation : defaultFormation);
  if (action.type === 'prepare') {
    const formation = readFormation(action.formation);
    return state.chapterId === 1 && state.winner === 'blue' && formation ? { ...state, formation } : state;
  }
  if (state.winner) return state;
  const next = copy(state);
  if (action.type === 'endTurn') {
    next.turn = state.turn === 'blue' ? 'red' : 'blue';
    next.turnNumber++;
    next.selectedId = null;
    next.units.filter(unit => unit.team === next.turn).forEach(unit => { unit.moved = false; unit.attacked = false; });
    next.message = `${next.turn === 'blue' ? '青' : '赤'}のターンです。ユニットを選択してください。`;
    return next;
  }
  if (action.type === 'select') {
    const unit = next.units.find(item => item.id === action.id && item.hp > 0);
    if (!unit || unit.team !== next.turn) return state;
    next.selectedId = unit.id;
    next.message = unitProfile(unit.id).reach === 0
      ? unit.moved ? 'ナギは移動済みです。仲間で護衛しましょう。' : 'ナギを青いマスへ移動し、灯火台を目指しましょう。'
      : unit.attacked ? '行動済みです。別の味方を選ぶか、ターンを終了してください。'
      : unit.moved ? '橙の枠にいる敵を攻撃できます。' : '青いマスへ移動するか、橙の枠にいる敵を攻撃できます。';
    return next;
  }
  const selected = next.units.find(unit => unit.id === next.selectedId);
  if (!selected) return state;
  if (action.type === 'move') {
    if (!movementRange(next, selected.id).some(point => point.x === action.x && point.y === action.y)) return state;
    selected.x = action.x; selected.y = action.y; selected.moved = true;
    next.winner = battleWinner(next);
    next.message = next.winner ? 'ナギが灯火台に到着しました！' : unitProfile(selected.id).reach === 0
      ? 'ナギが移動しました。仲間で次の道を確保しましょう。'
      : '移動しました。射程内の敵を攻撃できます。';
    return next;
  }
  const forecast = combatForecast(state, selected.id, action.id);
  if (!forecast) return state;
  const target = next.units.find(unit => unit.id === action.id)!;
  target.hp = forecast.opening.remainingHp;
  selected.attacked = true;
  selected.moved = true;
  if (forecast.counter) selected.hp = forecast.counter.remainingHp;
  next.units = next.units.filter(unit => unit.hp > 0);
  next.winner = battleWinner(next);
  if (!next.units.some(unit => unit.id === next.selectedId)) next.selectedId = null;
  next.message = next.winner ? `${next.winner === 'blue' ? '青' : '赤'}の勝利！`
    : `${unitProfile(target.id).name}に${forecast.opening.damage}ダメージ。` +
      (forecast.counter ? `反撃で${forecast.counter.damage}ダメージ。` : '');
  return next;
}

export function handleTile(state: GameState, point: Point): GameState {
  const target = unitAt(state, point);
  if (target) {
    if (target.team === state.turn) return reduceGame(state, { type: 'select', id: target.id });
    return reduceGame(state, { type: 'attack', id: target.id });
  }
  return reduceGame(state, { type: 'move', ...point });
}
