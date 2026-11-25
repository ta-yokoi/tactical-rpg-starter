import { formationBonuses, type Formation } from './formation';

type Profile = {
  name: string;
  role: string;
  reach: number;
  movement: number;
  power: number;
  defense: number;
  ward: number;
  style: 'blade' | 'spell';
};

const profiles: Record<string, Profile> = {
  'blue-1': { name: 'アステル', role: '守護騎士', reach: 1, movement: 3, power: 5, defense: 3, ward: 1, style: 'blade' },
  'blue-2': { name: 'リナ', role: '星詠み', reach: 2, movement: 3, power: 5, defense: 1, ward: 3, style: 'spell' },
  'blue-escort': { name: 'ナギ', role: '渡し守', reach: 0, movement: 2, power: 0, defense: 1, ward: 1, style: 'blade' },
  'blue-3': { name: 'セラ', role: '水門の盾兵', reach: 1, movement: 3, power: 4, defense: 4, ward: 2, style: 'blade' },
  'blue-4': { name: 'イオ', role: '潮読み', reach: 2, movement: 3, power: 5, defense: 2, ward: 3, style: 'spell' },
  'red-1': { name: '鉄牙', role: '略奪兵', reach: 1, movement: 3, power: 5, defense: 2, ward: 1, style: 'blade' },
  'red-2': { name: '灰の術士', role: '呪術師', reach: 2, movement: 3, power: 6, defense: 1, ward: 2, style: 'spell' },
  'red-3': { name: '鎖番ヴァル', role: '門番', reach: 1, movement: 2, power: 6, defense: 3, ward: 1, style: 'blade' },
  'red-4': { name: 'サイラス', role: '監潮官', reach: 1, movement: 2, power: 7, defense: 3, ward: 3, style: 'blade' },
};

export function unitProfile(id: string, formation?: Formation): Profile {
  const base = profiles[id] ?? { name: id, role: '兵士', reach: 1, movement: 3, power: 2, defense: 1, ward: 1, style: 'blade' };
  if (!formation) return base;
  const bonus = formationBonuses(id, formation);
  return { ...base, power: base.power + bonus.power, defense: base.defense + bonus.defense, ward: base.ward + bonus.ward };
}
