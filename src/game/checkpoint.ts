import { isChapterId } from './chapters';
import { defaultFormation, readFormation } from './formation';
import { battleWinner, initialState, onBoard, terrainAt, type GameState, type Unit } from './rules';

export const checkpointKey = 'tactical-rpg-starter:checkpoint';

export function encodeCheckpoint(state: GameState): string {
  const { chapterId, formation, units, turn, turnNumber, selectedId, winner, holdTurns, holdGoal, message } = state;
  return JSON.stringify({ version: 4, chapterId, formation, units, turn, turnNumber, selectedId, winner, holdTurns, holdGoal, message });
}

type Fields = Record<string, unknown>;

const record = (value: unknown): value is Fields => typeof value === 'object' && value !== null;
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

export function decodeCheckpoint(raw: string): GameState | null {
  try {
    const saved: unknown = JSON.parse(raw);
    if (!record(saved) || (saved.version !== 1 && saved.version !== 2 && saved.version !== 3 && saved.version !== 4) ||
        !isChapterId(saved.chapterId) || (saved.version !== 4 && saved.chapterId > (saved.version === 3 ? 3 : 2))) return null;
    const formation = saved.version === 1 ? defaultFormation : readFormation(saved.formation);
    if (!formation) return null;
    const state = initialState(saved.chapterId, formation);
    const { units, turn, turnNumber, selectedId, winner, message } = saved;
    const holdTurns = saved.version === 3 || saved.version === 4 ? saved.holdTurns : 0;
    const legacyHoldGoal = state.chapterId === 3 ? 2 : 0;
    const holdGoal = saved.version === 4 ? saved.holdGoal : legacyHoldGoal;
    if (!integer(holdGoal) || (holdGoal !== state.holdGoal && holdGoal !== legacyHoldGoal) ||
        !integer(holdTurns) || holdTurns < 0 || holdTurns > holdGoal ||
        holdTurns > Math.floor(integer(turnNumber) ? (turnNumber - 1) / 2 : 0)) return null;
    if (!Array.isArray(units) || !integer(turnNumber) || turnNumber < 1 ||
        (turn !== 'blue' && turn !== 'red') || turn !== (turnNumber % 2 ? 'blue' : 'red') ||
        (winner !== null && winner !== 'blue' && winner !== 'red') ||
        (turn === 'red' && winner === null) || typeof message !== 'string' || message.length > 200) return null;

    const restored: Unit[] = [];
    for (const entry of units as unknown[]) {
      if (!record(entry)) return null;
      const base = state.units.find(unit => unit.id === entry.id);
      const { x, y, hp, moved, attacked } = entry;
      if (!base || !integer(x) || !integer(y) || !integer(hp) || hp < 1 || hp > base.maxHp ||
          typeof moved !== 'boolean' || typeof attacked !== 'boolean' || (attacked && !moved) ||
          !onBoard(state, { x, y }) || terrainAt(state, { x, y }).blocked ||
          restored.some(unit => unit.id === base.id || (unit.x === x && unit.y === y))) return null;
      restored.push({ ...base, x, y, hp, moved, attacked });
    }
    if (selectedId !== null && !restored.some(unit => unit.id === selectedId && unit.team === turn)) return null;
    const checkpoint: GameState = { ...state, units: restored, turn, turnNumber, selectedId: selectedId as string | null, winner, holdTurns, holdGoal, message };
    return battleWinner(checkpoint) === winner ? checkpoint : null;
  } catch {
    return null;
  }
}

export function loadCheckpoint(storage: Storage): GameState | null {
  const raw = storage.getItem(checkpointKey);
  return raw === null ? null : decodeCheckpoint(raw);
}

export function saveCheckpoint(storage: Storage, state: GameState): void {
  storage.setItem(checkpointKey, encodeCheckpoint(state));
}
