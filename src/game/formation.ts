export const equipment = {
  astel: {
    standard: { name: '峠の剣', detail: '標準装備', power: 0, defense: 0, ward: 0 },
    shield: { name: '灯守の盾', detail: '攻撃 −1　守備 +1　耐術 +2', power: -1, defense: 1, ward: 2 },
  },
  lina: {
    standard: { name: '星詠みの杖', detail: '標準装備', power: 0, defense: 0, ward: 0 },
    comet: { name: '彗星の杖', detail: '攻撃 +2　耐術 −1', power: 2, defense: 0, ward: -1 },
  },
} as const;

export const training = {
  none: { name: '訓練なし', detail: '従来の能力で出撃', unitId: '', hp: 0, power: 0 },
  vitality: { name: 'アステルの体力訓練', detail: 'アステルの最大HP +2', unitId: 'blue-1', hp: 2, power: 0 },
  focus: { name: 'リナの集中訓練', detail: 'リナの攻撃 +1', unitId: 'blue-2', hp: 0, power: 1 },
} as const;

export type Formation = {
  astel: keyof typeof equipment.astel;
  lina: keyof typeof equipment.lina;
  training: keyof typeof training;
};

export const defaultFormation: Readonly<Formation> = { astel: 'standard', lina: 'standard', training: 'none' };

export function readFormation(value: unknown): Formation | null {
  if (!value || typeof value !== 'object' || !('astel' in value) || !('lina' in value) || !('training' in value)) return null;
  const { astel, lina, training: drill } = value;
  if ((astel !== 'standard' && astel !== 'shield') || (lina !== 'standard' && lina !== 'comet') ||
      (drill !== 'none' && drill !== 'vitality' && drill !== 'focus')) return null;
  return { astel, lina, training: drill };
}

export function formationBonuses(id: string, formation: Formation) {
  const armor = id === 'blue-1' ? equipment.astel[formation.astel] : id === 'blue-2' ? equipment.lina[formation.lina] : null;
  const drill = training[formation.training];
  const trained = drill.unitId === id;
  return {
    equipment: armor?.name ?? '',
    hp: trained ? drill.hp : 0,
    power: (armor?.power ?? 0) + (trained ? drill.power : 0),
    defense: armor?.defense ?? 0,
    ward: armor?.ward ?? 0,
  };
}
