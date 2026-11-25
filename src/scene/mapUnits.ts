import { TILE } from './board';

const palettes = {
  'blue-1': { d: '#263c65', m: '#416f9c', l: '#68a7c4', a: '#bde7e1', w: '#f3f4df', g: '#efbb61', t: '#a26e47' },
  'blue-2': { d: '#382958', m: '#6e55a0', l: '#ac8fd4', a: '#d9c4f0', w: '#fff1e3', g: '#bce9ff', t: '#635087' },
  'blue-escort': { d: '#234a47', m: '#43796a', l: '#75ad89', a: '#c4d59b', w: '#ffedb7', g: '#ffc66b', t: '#ae773e' },
  'red-1': { d: '#4e283d', m: '#954a50', l: '#da775f', a: '#ffbd86', w: '#f3eee0', g: '#e8a366', t: '#935641' },
  'red-2': { d: '#412642', m: '#79394f', l: '#b8596c', a: '#e48987', w: '#ffe9c4', g: '#ff9d61', t: '#9f553f' },
} as const;

export const mapUnitIds = Object.keys(palettes) as (keyof typeof palettes)[];
export const mapFacings = ['south', 'north', 'side'] as const;
export type MapFacing = typeof mapFacings[number];
export const mapPoses = ['idle', 'ready', 'step-a', 'step-b'] as const;
type MapPose = typeof mapPoses[number];

type UnitId = keyof typeof palettes;
type Frame = readonly string[];
type Palette = Record<string, string>;
const common = { '#': '#222535', s: '#efb58f', h: '#b37660', c: '#849bad' };

// The shared palette keeps the underlit side cool and the light-facing edges warm.
const front: Record<UnitId, Frame> = {
  'blue-1': [
    '........#a#',
    '......##aa##......#',
    '.....#laawld#....#w#',
    '.....#almcad#....#w#',
    '.....#adssdd#....#w#',
    '......#s#sh#.....#c#',
    '.....#m#hh#m#....#c#',
    '...##aalllaa##...#c#',
    '..#lm#caaac#lm#.#g#',
    '.#ldd#cclcd#md##g#',
    '.#ldm#mdld#d#sh##',
    '.#lmm#dgggd#dm##',
    '.#lmmd#mmm#md#',
    '..#lmd#lcl#dd#',
    '..#mdd#md#dm#',
    '...###d#.#dl#',
    '.....#c#.#c#',
    '.....#md##dm#',
    '.....####.###',
  ],
  'blue-2': [
    '........###',
    '......##waa##....#',
    '.....#awwwal#...#g#',
    '.....#aw#swa#..#gwg',
    '....#aa#s#saa#.#g#',
    '....#a#hss#a#...#t#',
    '...#aw##hh#w#...#t#',
    '...#wdllglldw#..#t#',
    '...##lamglaml##.#t#',
    '....#almdml#lsh##t#',
    '....#lmlddll##..#t#',
    '....#mlmdmll#...#t#',
    '...#lmldmllm#...#t#',
    '...#lmldmmlld#..#t#',
    '..#amlddmmla#...#t#',
    '..#lmdmddmll#...###',
    '..##lddddll##',
    '....##d#d##',
    '.....###.##',
  ],
  'blue-escort': [
    '........##',
    '.......#wg#',
    '......#wggt#',
    '.....#wggttt#...###',
    '...##ggtttg###.#gwg',
    '..#aa########a#gwgg',
    '...###shss###.#tgt#',
    '.....##hh##....###',
    '....#allla##....#t#',
    '...#lamammdl#..#t#',
    '...#lmmdgmdl###t#',
    '...#lmlddgllsh#t#',
    '....#lddggd###t#',
    '....#lmdlmm#.#t#',
    '...#amldmlm#.#t#',
    '...##mddml#..###',
    '.....#t#t#',
    '.....#td#dt#',
    '.....###.###',
  ],
  'red-1': [
    '.....#.......#',
    '....#g#.....#g#',
    '....#wg#####gw#..##',
    '.....#glllldg#..#wc',
    '.....#lmlmld#..#wcc',
    '.....#s##ssh#..#cc#',
    '.....##hsh##...###t',
    '....#ag###ga#...#t#',
    '...#amllmllmg#.##t#',
    '..#adldmlmmdd##sh#',
    '..#mdd##d#dld#h##',
    '..####mgggdm##..#t',
    '....#lmmmddd#...##',
    '....#amldlmd#',
    '...#mdd#ddmd#',
    '...####..#dd#',
    '....#c#..#l#',
    '....#md#.#dd#',
    '....####.####',
  ],
  'red-2': [
    '........##',
    '.......#la#.......#',
    '......#lamd#.....#g',
    '.....#lamldd#...#gw',
    '.....#amd#ddd#...#g',
    '....#ladsh#md#...#t',
    '....#lmdss#md#...#t',
    '....#amd#h#md#..##t',
    '....#lmd#gdmd##.##t',
    '....#lmldgmldd#h#t',
    '....#lmdmlml##.#t',
    '...#lmdgddmdl#.#t',
    '...#lmdmddmdl#.#t',
    '...#ammdmdmdd#.#t',
    '..#lamdmdmdd#..#t',
    '..#amdmdmdmdl#.#t',
    '..##lmdmdmdl##.##',
    '....####d###',
    '......###.##',
  ],
};

const profile: Record<UnitId, Frame> = {
  'blue-1': [
    '........#a#',
    '......##aa##......#',
    '.....#laawll#....#w#',
    '....#almcaal#....#w#',
    '....#aamcs#l#....#w#',
    '....#dd##sh#.....#c#',
    '...#mdm##hh#.....#c#',
    '..#lmdlccaaa#...#g#',
    '.#lmld#clmc##..#g#',
    '.#lmmd#lmdlc###s#',
    '.#lmmd#lmdcdlm#h#',
    '.#lmdd#ldc#m##',
    '..#lmld#mggd#',
    '..#lmm##mlmd#',
    '...#mdd#d#ld#',
    '....###d##d#',
    '......#c#.#c#',
    '.....#dm#.#md#',
    '.....####.####',
  ],
  'blue-2': [
    '.......####',
    '.....##wawa##.....#',
    '....#awwwaall#...#g',
    '....#awaw#ss#...#gw',
    '...#awawd#s##....#g',
    '...#awww##sh#....#t',
    '...#wwaw###h#....#t',
    '...#awlldgl##....#t',
    '..#awdlamlam#...##t',
    '..##lmmdlmlll##sht',
    '....#lmdamllm##.#t',
    '....#almmdmdd#..#t',
    '...#amldmdmld#..#t',
    '..#lamlddmdmdd#.#t',
    '..#lammlddmdd#..#t',
    '..##lmmddmdll#..##',
    '....###mddd##',
    '......#d##d#',
    '......###.##',
  ],
  'blue-escort': [
    '........###',
    '.......#wgg#',
    '......#wggtt#...###',
    '....##gggtgt##.#wgg',
    '...#ga#######a#gwgg',
    '....####ssh##.#tgt#',
    '......#hss#....###',
    '.....#alll###...#t#',
    '....#lmmdamdl#..#t#',
    '...#lmmmdmgdd###t#',
    '...#lmdmddlldsh#t#',
    '....#dlddmdl###t#',
    '....#lmdggdd#.#t#',
    '...#lammdmmd#.#t#',
    '...#amlddmld#.#t#',
    '...##mddml##..###',
    '.....#dt#t#',
    '.....#td#dt#',
    '.....###.###',
  ],
  'red-1': [
    '.....#.....#',
    '....#g#...#g#....##',
    '....#wg###gg#...#wc',
    '.....#glllad#..#wcc',
    '.....#lmldd#...#cc#',
    '.....#ldss#....##t#',
    '......##sh##....#t#',
    '....##ag##gl#...#t#',
    '...#amllmdmd#...#t#',
    '..#amddmdllld###sh',
    '..#mdmmdmdllmm##t#',
    '...###d#ld#md#..#t',
    '....#lmgmgd##...##',
    '....#lamddm#',
    '....#mdd#mm#',
    '.....###.#dd#',
    '.....#c#.#l#',
    '....#dm#.#dd#',
    '....####.####',
  ],
  'red-2': [
    '........##',
    '.......#la#.......#',
    '......#lamd#.....#g',
    '.....#lamldd#...#gw',
    '....#lamd#ssh#...#g',
    '....#lmdd#s##....#t',
    '...#lmdd##sh#....#t',
    '...#lmdmd##h#....#t',
    '...#ammdgmd##...##t',
    '..#lamdgmddll##sht',
    '..#lamdmdmldd##.#t',
    '..#amlddmdld#...#t',
    '..#amlddmmdld#..#t',
    '.#lamldmdmdd#...#t',
    '.#lamddmdmdd#...#t',
    '.##amddmdmdll#..##',
    '...##lmdmddl##',
    '.....###dd##',
    '......###.##',
  ],
};

// Rear views replace the eyes and front-facing headgear with hair, plate or fabric.
const rearHead: Record<UnitId, Frame> = {
  'blue-1': [
    '........#a#', '......##aa##', '.....#laawld#', '.....#lmdald#',
    '.....#lmdmdd#', '......#lmdm#', '.....#m#dd#m#',
  ],
  'blue-2': [
    '........###', '......##waa##', '.....#awwwal#', '.....#wwawwl#',
    '....#wawawlaa#', '....#wawawla#', '...#awaawlww#',
  ],
  'blue-escort': [
    '........##', '.......#wg#', '......#wggt#', '.....#wggttt#',
    '...##ggtttg###', '..#aa########a#', '...###ddddd###',
  ],
  'red-1': [
    '.....#.......#', '....#g#.....#g#', '....#wg#####gw#', '.....#glllldg#',
    '.....#lamlmd#', '.....#mmldld#', '.....##mdd##',
  ],
  'red-2': [
    '........##', '.......#la#', '......#lamd#', '.....#lamldd#',
    '.....#amdlmdd#', '....#ladmlmmd#', '....#lmdmlmmd#', '....#amdmlmmd#',
  ],
};

// Columns 15–19 hold the raised weapon, staff or lantern in each unit's ready pose.
const readyGear: Record<UnitId, Frame> = {
  'blue-1': [
    '.....', '.....', '....#', '...#w', '..#wc', '..#c#', '.#wc#', '.#c#.', '#g#..', '#g#..',
  ],
  'blue-2': [
    '.....', '..#..', '.#g#.', '#gwg#', '.#g#.', '.#t#.', '.#t#.', '.#t#.',
  ],
  'blue-escort': [
    '.....', '.....', '.....', '.##..', '#tg#.', '#gwg#', '#tgt#', '.###.',
  ],
  'red-1': [
    '...##', '..#wc', '.#wcc', '.#ccc', '..#c#', '..#t#', '.#t#.', '.#t#.',
  ],
  'red-2': [
    '...#.', '..#g#', '.#gw#', '#ggg#', '.###.', '.#t#.', '.#t#.', '.#t#.',
  ],
};

export function drawMapUnit(context: CanvasRenderingContext2D, id: UnitId, facing: MapFacing, pose: MapPose): void {
  const colors: Palette = { ...common, ...palettes[id] };
  const north = facing === 'north';
  const frame = facing === 'side' ? profile[id] : front[id];
  const step = pose === 'step-a' ? -1 : pose === 'step-b' ? 1 : 0;
  const settle = pose === 'idle' ? 1 : 0;
  frame.forEach((frontRow, y) => {
    const rearRow = north ? rearHead[id][y] : undefined;
    const equipment = pose === 'ready' ? readyGear[id][y] : undefined;
    const body = rearRow === undefined ? frontRow : rearRow.padEnd(15, '.') + frontRow.slice(15);
    const row = equipment === undefined ? body : body.slice(0, 15).padEnd(15, '.') + equipment;
    for (let x = 0; x < row.length; x++) {
      const symbol = row[x];
      if (symbol === '.') continue;
      const boot = y >= 17 && x >= 4 && x <= 13;
      const stride = boot && step === (x < 9 ? -1 : 1) ? 1 : 0;
      const stretch = stride === 1 && y === 17;
      const backTrim = north && y >= 7 && y <= 15 && x >= 8 && x <= 11 && symbol === 'g';
      const color = backTrim ? 'l' : symbol;
      context.fillStyle = colors[color];
      context.fillRect(north ? TILE - 1 - x : x, y + settle + (stretch ? 0 : stride), 1, stretch ? 2 : 1);
    }
  });
}
