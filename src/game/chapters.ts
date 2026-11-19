import type { Point, Unit } from './rules';

type Chapter = {
  title: string;
  district: string;
  briefing: string;
  objective: string;
  map: readonly string[];
  units: readonly Unit[];
  escort?: { id: string; goal: Point };
};

function unit(id: string, team: Unit['team'], x: number, y: number, hp: number): Unit {
  return { id, team, x, y, hp, maxHp: hp, moved: false, attacked: false };
}

export const chapters = {
  1: {
    title: '古い峠の防衛線',
    district: '古い峠',
    briefing: '古い峠に迫る敵を退け、防衛線を守れ。',
    objective: '敵部隊を全滅させる',
    map: ['c.c.c.c.', '==v=====', '..|##...', '..|#....', '==^=====', '.c.c.c.c'],
    units: [
      unit('blue-1', 'blue', 1, 1, 11), unit('blue-2', 'blue', 1, 4, 9),
      unit('red-1', 'red', 6, 1, 7), unit('red-2', 'red', 6, 4, 7),
    ],
  },
  2: {
    title: '渡し守の灯',
    district: '灯渡りの川',
    briefing: '渡し守のナギを連れ、東岸の灯火台にたどり着け。',
    objective: 'ナギを東岸の灯火台へ護衛する',
    map: ['.c.~~.c.', '...~~...', '.#.~~.#.', '===++==g', '.c.~~c..', '===++==='],
    units: [
      unit('blue-1', 'blue', 1, 3, 11), unit('blue-2', 'blue', 2, 5, 9),
      unit('blue-escort', 'blue', 0, 3, 8),
      unit('red-1', 'red', 6, 3, 7), unit('red-2', 'red', 6, 5, 7),
    ],
    escort: { id: 'blue-escort', goal: { x: 7, y: 3 } },
  },
} satisfies Record<number, Chapter>;

export type ChapterId = keyof typeof chapters;

export function chapter(id: ChapterId): Chapter {
  return chapters[id];
}

const terrains = {
  '.': { name: '平地', frame: 'grass' },
  c: { name: '低木', frame: 'shrub' },
  '#': { name: '石垣', frame: 'wall' },
  '=': { name: '道', frame: 'horizontal' },
  '|': { name: '道', frame: 'vertical' },
  v: { name: '道', frame: 'north' },
  '^': { name: '道', frame: 'south' },
  '~': { name: '川', frame: 'water' },
  '+': { name: '橋', frame: 'bridge' },
  g: { name: '灯火台', frame: 'beacon' },
} as const;

export function chapterTerrain(id: ChapterId, { x, y }: Point) {
  const symbol = chapter(id).map[y]?.[x] as keyof typeof terrains | undefined;
  return symbol ? terrains[symbol] : terrains['.'];
}
