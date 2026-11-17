export type Team = 'blue' | 'red';
export type Point = { x: number; y: number };
export type Unit = Point & { id: string; team: Team; hp: number; moved: boolean; attacked: boolean };
export type GameState = {
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
  { type: 'attack'; id: string } | { type: 'endTurn' };

const key = ({ x, y }: Point): string => `${x},${y}`;
const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const copy = (state: GameState): GameState => ({ ...state, units: state.units.map(unit => ({ ...unit })) });
const unitAt = (state: GameState, point: Point): Unit | undefined =>
  state.units.find(unit => unit.hp > 0 && unit.x === point.x && unit.y === point.y);

export function initialState(): GameState {
  return {
    width: 8, height: 6, walls: [{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 3 }],
    units: [
      { id: 'blue-1', team: 'blue', x: 1, y: 1, hp: 3, moved: false, attacked: false },
      { id: 'blue-2', team: 'blue', x: 1, y: 4, hp: 3, moved: false, attacked: false },
      { id: 'red-1', team: 'red', x: 6, y: 1, hp: 3, moved: false, attacked: false },
      { id: 'red-2', team: 'red', x: 6, y: 4, hp: 3, moved: false, attacked: false },
    ], turn: 'blue', turnNumber: 1, selectedId: null, winner: null,
    message: '青いユニットを選択してください。',
  };
}

export function movementRange(state: GameState, id: string): Point[] {
  const unit = state.units.find(item => item.id === id && item.hp > 0);
  if (!unit || unit.team !== state.turn || unit.moved || state.winner) return [];
  const blocked = new Set([...state.walls.map(key), ...state.units.filter(item => item.hp > 0).map(key)]);
  const visited = new Set([key(unit)]);
  const queue: { point: Point; steps: number }[] = [{ point: unit, steps: 0 }];
  const result: Point[] = [];
  for (let index = 0; index < queue.length; index++) {
    const { point, steps } = queue[index];
    if (steps >= 3) continue;
    for (const next of [
      { x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 },
    ]) {
      const nextKey = key(next);
      if (next.x < 0 || next.y < 0 || next.x >= state.width || next.y >= state.height ||
          blocked.has(nextKey) || visited.has(nextKey)) continue;
      visited.add(nextKey);
      result.push(next);
      queue.push({ point: next, steps: steps + 1 });
    }
  }
  return result;
}

export function attackRange(state: GameState, id: string): Point[] {
  const unit = state.units.find(item => item.id === id && item.hp > 0);
  if (!unit || unit.team !== state.turn || unit.attacked || state.winner) return [];
  return [
    { x: unit.x + 1, y: unit.y }, { x: unit.x - 1, y: unit.y },
    { x: unit.x, y: unit.y + 1 }, { x: unit.x, y: unit.y - 1 },
  ].filter(point => point.x >= 0 && point.y >= 0 && point.x < state.width && point.y < state.height &&
    !state.walls.some(wall => distance(wall, point) === 0));
}

export function reduceGame(state: GameState, action: Action): GameState {
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
    next.message = `${unit.team === 'blue' ? '青' : '赤'}のユニットを選択中。移動先か隣の敵を選んでください。`;
    return next;
  }
  const selected = next.units.find(unit => unit.id === next.selectedId);
  if (!selected) return state;
  if (action.type === 'move') {
    if (!movementRange(next, selected.id).some(point => point.x === action.x && point.y === action.y)) return state;
    selected.x = action.x; selected.y = action.y; selected.moved = true;
    next.message = '移動しました。隣の敵を攻撃するか、ターンを終了してください。';
    return next;
  }
  const target = next.units.find(unit => unit.id === action.id && unit.hp > 0);
  if (!target || target.team === selected.team ||
      !attackRange(next, selected.id).some(point => point.x === target.x && point.y === target.y)) return state;
  target.hp--;
  selected.attacked = true;
  selected.moved = true;
  if (target.hp === 0) {
    next.units = next.units.filter(unit => unit.hp > 0);
    if (!next.units.some(unit => unit.team === target.team)) next.winner = selected.team;
  }
  next.message = next.winner ? `${selected.team === 'blue' ? '青' : '赤'}の勝利！` : `${target.id}に1ダメージ。`;
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
