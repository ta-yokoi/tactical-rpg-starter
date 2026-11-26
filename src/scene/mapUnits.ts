import { TILE } from './board';

const palettes = {
  'blue-1': { d: '#263c65', m: '#416f9c', l: '#68a7c4', a: '#bde7e1', w: '#f3f4df', g: '#efbb61', t: '#a26e47' },
  'blue-2': { d: '#382958', m: '#6e55a0', l: '#ac8fd4', a: '#d9c4f0', w: '#fff1e3', g: '#bce9ff', t: '#635087' },
  'blue-escort': { d: '#234a47', m: '#43796a', l: '#75ad89', a: '#c4d59b', w: '#ffedb7', g: '#ffc66b', t: '#ae773e' },
  'red-1': { d: '#4e283d', m: '#954a50', l: '#da775f', a: '#ffbd86', w: '#f3eee0', g: '#e8a366', t: '#935641' },
  'red-2': { d: '#412642', m: '#79394f', l: '#b8596c', a: '#e48987', w: '#ffe9c4', g: '#ff9d61', t: '#9f553f' },
  'blue-3': { d: '#203c45', m: '#327a78', l: '#58b19b', a: '#c5e6bc', w: '#f6eed5', g: '#edcb76', t: '#9b744b' },
  'blue-4': { d: '#51402e', m: '#9c7041', l: '#d4a35b', a: '#f1cd8e', w: '#ffe7b5', g: '#9cdded', t: '#88614c' },
  'red-3': { d: '#433844', m: '#7e5560', l: '#b88270', a: '#e7b294', w: '#f3e1c9', g: '#e18b58', t: '#7c5a49' },
  'red-4': { d: '#342340', m: '#6a365a', l: '#ac5274', a: '#e799a6', w: '#f9dfae', g: '#f4bc64', t: '#82495b' },
} as const;

export const mapUnitIds = Object.keys(palettes) as (keyof typeof palettes)[];
export const mapFacings = ['south', 'north', 'side'] as const;
export type MapFacing = typeof mapFacings[number];
export const mapPoses = ['idle', 'ready', 'step-a', 'pass', 'step-b'] as const;
export const mapWalkCycle = ['step-a', 'pass', 'step-b', 'pass'] as const;
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
  'blue-3': [
    '........###',
    '......##gag##',
    '.....#laggal#',
    '.....#alwlma#',
    '.....#mlccml#',
    '......#shss#',
    '....##l#hh#l##',
    '...#aa##ccmmaa#',
    '..#awwwww#lmdl#',
    '..#wlaaalw#ldm#',
    '..#wlamalw#mdm#',
    '..#wlmgalw#md#',
    '..#wllmall#gg#',
    '...#wllld#dm#',
    '....#wld#lmd#',
    '.....###m#dm#',
    '......#c#.#c#',
    '.....#dm#.#md#',
    '.....####.####',
  ],
  'blue-4': [
    '........##',
    '......##ag##',
    '.....#waaagl#.....#',
    '....#waawllm#....#g',
    '....#wal#ssm#...#gw',
    '...#awll#ssh#...#ga',
    '...#wllm##hh#....#t',
    '..#al##glll##...#t#',
    '.#al#gwgggga#...#t#',
    '.#l#gglmd#ld###sh#',
    '.###g#lmdmd#dam#t#',
    '...#g#aldmll#...#t',
    '....#lalmldd#...#t',
    '...#lalmlddm#...#t',
    '...#almmdmdm#...#t',
    '..#almmddmdl#..###',
    '..###amdldm##',
    '.....##c#dc#',
    '.....###.###',
  ],
  'red-3': [
    '.......####',
    '......#ggmm#....####',
    '.....##laaam#..#wwcc',
    '....#gllmmm#...#wccc',
    '....#lmlccm#...##cc#',
    '.....#hsshh#....##t#',
    '....##ddhh##.....#t',
    '..##almddml###...#t',
    '.#aallmdgmlmaa#..#t',
    '.#ammdmdgdldml##sh#',
    '.##mmddmgdmdd##h##',
    '...#dddgggdd#..#t#',
    '...##lmdmdmd#..###',
    '....#llddmdl#',
    '....#mlddmdd#',
    '....#dd#.##d#',
    '....#c#...#c#',
    '...#dm#...#md#',
    '...####...####',
  ],
  'red-4': [
    '......#.#.#',
    '.....#g#g#g#',
    '.....#ggwgg#......#',
    '.....#mlalm#.....#w',
    '.....#ms#sd#....#wc',
    '......#ssh#.....#c#',
    '.....##hh##....#wc#',
    '....#wggggw#...#c#',
    '...#cwlmmmcw#.#g#',
    '...#cwmccmcw##sh#',
    '...#lwmdgmdw#h#',
    '...#lwmgdgdmw##',
    '..#lwwmgwgdmww#',
    '..#lmwmgggdmwm#',
    '..#lm#mdldm#md#',
    '.##md#mddd#dm#',
    '...##d#..#d##',
    '.....#c#.#c#',
    '.....###.###',
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
  'blue-3': [
    '........###',
    '......##gag##',
    '.....#lagaal#',
    '.....#amwwll#',
    '.....#mccmll#',
    '......#mssh#',
    '.....##m#hh##',
    '....#mlcmmmla#',
    '...#mmlc#wwww#',
    '...#mlmd#wlaaw#',
    '...#lmd#wllmaw#',
    '...#mmd#wlgmaw#',
    '....#md#wllmw#',
    '....#mm#wlmw#',
    '.....#dm#ww#',
    '.....#dd###',
    '......#c#.#c#',
    '.....#md#.#dm#',
    '.....####.####',
  ],
  'blue-4': [
    '.......###',
    '.....##agg##',
    '....#waawagl#.....#',
    '....#waawmls#....#g',
    '...#waawld#s#...#gw',
    '...#wawlm##h#...#ga',
    '..#wawldd###h#...#t',
    '..#awl#ggll##...#t#',
    '.#awl#ggggld#...#t#',
    '.#al#glgmlald###sh#',
    '.###gmldd#dl##..#t',
    '...#galmdmld#...#t',
    '....#almdmdd#...#t',
    '...#almdmldm#...#t',
    '...#almdmldm#...#t',
    '..#almdmdmml#..###',
    '..###mdddld##',
    '.....#c##dc#',
    '.....###.###',
  ],
  'red-3': [
    '.......####',
    '......#ggmm#.....###',
    '.....##aallm#...#wwc',
    '....#gllmcmm#..#wccc',
    '....#lmmc#ss#...#cc#',
    '.....#lm##sh#....#t',
    '.....###d#hh#....#t',
    '...##almmdl##....#t',
    '..#aallmmmlma#...#t',
    '..#ammdmdgldm###sh',
    '..##mmdddgmdml##h#',
    '....#ddmdggdd#.#t#',
    '....#lmdmgd##..###',
    '....#llddmd#',
    '....#mld#mdd#',
    '....#dd#.#dd#',
    '.....#c#..#c#',
    '....#dm#..#md#',
    '....####..####',
  ],
  'red-4': [
    '......#.#.#',
    '.....#g#g#g#',
    '.....#ggggw#......#',
    '....#mlalmm#.....#w',
    '....#lmdss#.....#wc',
    '....#md#sh#.....#c#',
    '...#mlw##h##...#wc#',
    '...#lwgggwll#..#c#',
    '..#lwwlmmmdc#.#g#',
    '..#lwwlmdgmd##sh#',
    '..#lwwmddgmld#h#',
    '..#lwmmcddmml##',
    '..#lwmmdgmdm#',
    '.#lmwmddgdmd#',
    '.#lmwmld#ld#',
    '.##mmd#.#dd#',
    '..####..#c#',
    '.....#c##md#',
    '.....###.###',
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
  'blue-3': [
    '........###', '......##gag##', '.....#lagaal#', '.....#lammal#', '.....#mlddlm#', '......#lmml#', '....##l#dd#l##',
  ],
  'blue-4': [
    '........##', '......##ag##', '.....#waaagl#', '....#waawllm#', '....#walwalml#', '...#walwalmd#', '...#allmmld#', '..#al##glll##',
  ],
  'red-3': [
    '.......####', '......#ggmm#', '.....##laaam#', '....#gllmmm#', '....#lmlmlm#', '.....#dmdl#', '....##ddmd##',
  ],
  'red-4': [
    '......#.#.#', '.....#g#g#g#', '.....#ggwgg#', '.....#mlalm#', '.....#mldlm#', '......#ldd#', '.....##md##',
  ],
};

// Columns 15–19 hold the raised weapon, staff or lantern in each unit's ready pose.
const readyGear: Partial<Record<UnitId, Frame>> = {
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
  'blue-4': [
    '...#', '..#g#', '.#gag', '#gwwg', '.#ga#', '..#t#', '.#t#', '.#t#',
  ],
  'red-3': [
    '.####', '#wwcc', '#wccc', '#cccd', '.####', '..#t#', '..#t#', '.#t#',
  ],
  'red-4': [
    '.....', '....#', '...#w', '...#c', '..#w#', '..#c#', '.#wc#', '.#c#', '#g#', '#g#',
  ],
};

// Travel gear sits close to the body before joining the base frame at the hand.
const walkingGear: Partial<Record<UnitId, Frame>> = {
  'blue-1': [
    '.....', '.....', '.....', '.....', '....#', '...#w', '...#c', '..#wc',
  ],
  'blue-2': [
    '.....', '.....', '.....', '..#..', '.#gw#', '..#g#', '.#t#.', '.#t#.',
  ],
  'blue-escort': [
    '.....', '.....', '.....', '.....', '..##.', '.#tg#', '.#gw#', '.###.',
  ],
  'red-1': [
    '.....', '.....', '...##', '..#wc', '..#cc', '..#c#', '..#t#', '.#t#.',
  ],
  'red-2': [
    '.....', '.....', '....#', '...#g', '..#gw', '..###', '..#t#', '.#t#.',
  ],
  'blue-4': [
    '.....', '.....', '.....', '..##', '.#gw#', '.#ga#', '..#t#', '..#t#',
  ],
  'red-3': [
    '.....', '.....', '.####', '#wwcc', '#wccc', '.###d', '..#t#', '..#t#',
  ],
  'red-4': [
    '.....', '.....', '.....', '.....', '....#', '...#w', '...#c', '..#wc',
  ],
};

// The tower shield stays at the arm in transit and rises to cover the chest in ready.
const raisedShield = {
  front: [
    '..#wwwww#amma#', '..#waaalw#mmdl#', '..#wamalw#ldm#',
    '..#wagalw#mdm#', '..#wllalw#md#', '...#wllw#dgg#',
    '....#ww#ldmd#', '.....##d#lmd#',
  ],
  side: [
    '....#ml#wwww#', '...#mml#wlaaw#', '...#ml#wllmaw#',
    '...#lm#wlgmaw#', '...#mm#wllmw#', '....#md#wlmw#',
    '....#mdd#ww#', '.....#dmd##',
  ],
} as const;

export function drawMapUnit(context: CanvasRenderingContext2D, id: UnitId, facing: MapFacing, pose: MapPose): void {
  const colors: Palette = { ...common, ...palettes[id] };
  const north = facing === 'north';
  const frame = facing === 'side' ? profile[id] : front[id];
  const step = pose === 'step-a' ? -1 : pose === 'step-b' ? 1 : 0;
  const passing = pose === 'pass';
  const settle = pose === 'idle' || passing ? 1 : 0;
  const equipmentFrames = pose === 'ready' ? readyGear[id] : step || passing ? walkingGear[id] : undefined;
  const shield = id === 'blue-3' && pose === 'ready' ? raisedShield[facing === 'side' ? 'side' : 'front'] : undefined;
  frame.forEach((frontRow, y) => {
    const rearRow = north ? rearHead[id][y] : undefined;
    const equipment = equipmentFrames?.[y];
    const body = shield?.[y - 7] ?? (rearRow === undefined ? frontRow : rearRow.padEnd(15, '.') + frontRow.slice(15));
    const row = equipment === undefined ? body : body.slice(0, 15).padEnd(15, '.') + equipment;
    for (let x = 0; x < row.length; x++) {
      const symbol = row[x];
      if (symbol === '.') continue;
      const boot = y >= 17 && x >= 4 && x <= 13;
      const nearFoot = x < 9 ? -1 : 1;
      const stride = boot && step === nearFoot ? 1 : 0;
      const stretch = stride === 1 && y === 17;
      const backTrim = north && y >= 7 && y <= 15 && x >= 8 && x <= 11 && symbol === 'g';
      const color = backTrim ? 'l' : symbol;
      const hem = step === -1 && facing === 'side' && y >= 13 && y <= 15 && x <= 5 && x > 0;
      const offsetX = boot && passing ? -nearFoot : hem ? -1 : 0;
      const pixelX = x + offsetX;
      context.fillStyle = colors[color];
      context.fillRect(north ? TILE - 1 - pixelX : pixelX, y + settle + (stretch ? 0 : stride), 1, stretch ? 2 : 1);
    }
  });
}
