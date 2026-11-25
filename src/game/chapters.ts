import type { Point, Unit } from './rules';

type Chapter = {
  title: string;
  district: string;
  briefing: string;
  objective: string;
  map: readonly string[];
  units: readonly Unit[];
  escort?: { id: string; goal: Point };
  hold?: { point: Point; turns: number };
  capture?: readonly Point[];
  commander?: string;
  aftermath?: { title: string; paragraphs: readonly string[]; dialogue?: readonly { speaker: string; text: string }[] };
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
  3: {
    title: '夜明けの火守',
    district: '暁の見張り台',
    briefing: '夜明けまで尾根の火を守れ。灰の術士は離れた場所から見張り台を狙う。',
    objective: '見張り台を守る',
    map: ['c..#...c', '.##..c..', '====t=..', '.c#..#..', '....==..', 'c....c..'],
    units: [
      unit('blue-1', 'blue', 1, 2, 11), unit('blue-2', 'blue', 2, 4, 9),
      unit('red-1', 'red', 6, 2, 9), unit('red-2', 'red', 7, 4, 8),
    ],
    hold: { point: { x: 4, y: 2 }, turns: 3 },
    aftermath: {
      title: '境界に灯がともる',
      paragraphs: [
        '尾根の火を見て、ナギも川辺の灯を掲げた。二つの明かりは夜の底で応え合い、旅人たちに帰り道を知らせた。',
        '朝の舟が運んできたのは、下流から逃れた人々だった。盾兵セラと潮読みイオが、閉じた水門の話を持ってきた。',
      ],
      dialogue: [
        { speaker: 'blue-3', text: '私が守っていたのは水門だ。だが門が閉じてから、守るべき人たちが村を追われている。道は私が案内する。' },
        { speaker: 'blue-4', text: '水位が上がり続けてる。上と下の制御台を一つずつ開けると、圧でまた閉じる。開けるなら、二つを同時に。' },
        { speaker: 'blue-1', text: 'なら、橋を一つずつ預けよう。ナギ、下流に舟を出せるように知らせてくれ。' },
      ],
    },
  },
  4: {
    title: '閉ざされた水門',
    district: '双塔水門',
    briefing: 'セラとイオが合流した。二つの制御台を同時に確保し、水路を開け。',
    objective: '二つの制御台を味方で同時に占める',
    map: ['..c~~~c.', '===++=u.', '...~~~..', '.c.~~~c.', '===++=u.', '..c~~~..'],
    units: [
      unit('blue-1', 'blue', 1, 1, 11), unit('blue-2', 'blue', 2, 4, 9),
      unit('blue-3', 'blue', 0, 4, 12), unit('blue-4', 'blue', 2, 0, 10),
      unit('red-1', 'red', 6, 1, 7), unit('red-3', 'red', 6, 4, 9),
      unit('red-2', 'red', 7, 2, 7),
    ],
    capture: [{ x: 6, y: 1 }, { x: 6, y: 4 }],
    aftermath: {
      title: '流れが戻る朝',
      paragraphs: [
        '二つの制御台が応え合い、溜まっていた水が下流へ走った。セラは水門に刻まれた封印を調べ、上流の観潮砦と同じ印を見つけた。',
        'セラは門番のヴァルを起こした。ヴァルは監潮官サイラスから届いた命令書を差し出し、砦へ向かう道を示した。',
      ],
      dialogue: [
        { speaker: 'red-3', text: '砦の石がもたない。それが封鎖の理由だった。だが、村に知らせるなという命令まで守ったのは俺だ。' },
        { speaker: 'blue-3', text: '橋を預かっててくれ。水が戻ったことを知らせる舟は、ここを通る。' },
        { speaker: 'blue-4', text: '記録には、昔も二つの水路で水を分けたとある。サイラスが守りたかった砦も、村も残せる。記録を持って会いに行こう。' },
      ],
    },
  },
  5: {
    title: '潮がひらく道',
    district: '観潮砦',
    briefing: '両翼から砦へ進み、監潮官サイラスを倒せ。石垣が術の経路を遮る。',
    objective: '監潮官サイラスを倒す',
    map: ['c..#..c.', 'pppppppp', '..p##pcp', '..p..#pp', 'pppppppp', '.c..#..c'],
    units: [
      unit('blue-1', 'blue', 1, 1, 11), unit('blue-2', 'blue', 1, 4, 9),
      unit('blue-3', 'blue', 2, 4, 12), unit('blue-4', 'blue', 2, 1, 10),
      unit('red-1', 'red', 6, 1, 8), unit('red-2', 'red', 6, 4, 8),
      unit('red-3', 'red', 6, 3, 10), unit('red-4', 'red', 7, 2, 13),
    ],
    commander: 'red-4',
    aftermath: {
      title: '水の先にある灯',
      paragraphs: [
        '砦が静まると、サイラスは水門の封印を解いた。セラが村へ鍵を返し、イオは水路の記録に今朝の水位を書き足した。',
        '数日後、峠の見張り台に旅人の灯がともった。ナギの舟が下流から戻り、リナが岸から手を振る。',
        'かつて境界だった川を、今は暮らしの荷を積んだ舟が行き交う。アステルは剣を収め、灯のあるほうへ歩き出した。',
      ],
      dialogue: [
        { speaker: 'red-4', text: '砦が崩れれば皆が困ると思った。下流の暮らしを私一人で量り、知らせることすらしなかった。まず村へ行こう。' },
        { speaker: 'blue-4', text: '水位の帳面を持っていこう。次の潮は、村の人たちと一緒に読むんだ。' },
        { speaker: 'blue-3', text: '門を開ける時刻も、皆で決めよう。私の持ち場は、これからもあの橋だ。' },
      ],
    },
  },
} satisfies Record<number, Chapter>;

export type ChapterId = keyof typeof chapters;
export const lastChapter = 5;

export function isChapterId(id: unknown): id is ChapterId {
  return typeof id === 'number' && Object.hasOwn(chapters, id);
}

export function chapter(id: ChapterId): Chapter {
  return chapters[id];
}

export function nextChapter(id: ChapterId): ChapterId | undefined {
  const next = id + 1;
  return isChapterId(next) ? next : undefined;
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
  t: { name: '見張り台', frame: 'watchtower' },
  u: { name: '制御台', frame: 'control' },
  p: { name: '石畳', frame: 'paving' },
} as const;

export function chapterTerrain(id: ChapterId, { x, y }: Point) {
  const symbol = chapter(id).map[y]?.[x] as keyof typeof terrains | undefined;
  return symbol ? terrains[symbol] : terrains['.'];
}
