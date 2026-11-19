import { pixelPainter } from './pixelPainter';

const ink = '#202535';
const white = '#f3ecd2';
const gold = '#f2ca76';
const skin = '#efb88d';
const skinShade = '#bd765e';

const uniforms = {
  'blue-1': ['#2c4267', '#4d83ac', '#8bd0d5'],
  'blue-2': ['#403365', '#7b68a3', '#c1abd9'],
  'blue-escort': ['#31534c', '#55866b', '#a1bd82'],
  'red-1': ['#542d40', '#a35854', '#ef9b72'],
  'red-2': ['#563146', '#994d67', '#e08e89'],
} as const;

export const mapUnitIds = Object.keys(uniforms) as (keyof typeof uniforms)[];
export const mapFacings = ['south', 'north', 'side'] as const;
export type MapFacing = typeof mapFacings[number];
export const mapPoses = ['idle', 'ready', 'step-a', 'step-b'] as const;
type MapPose = typeof mapPoses[number];

export function drawMapUnit(context: CanvasRenderingContext2D, id: keyof typeof uniforms, facing: MapFacing, pose: MapPose): void {
  if (facing !== 'side') {
    drawVerticalUnit(context, id, facing === 'north', pose);
    return;
  }
  const { pixel: p, shape: s } = pixelPainter(context);
  const [dark, mid, light] = uniforms[id];
  const knight = id === 'blue-1';
  const raider = id === 'red-1';
  const escort = id === 'blue-escort';
  const shift = pose === 'step-a' ? -1 : pose === 'step-b' ? 1 : 0;
  const head = pose === 'ready' ? 0 : shift === 0 ? 1 : 0;

  if (knight || raider) {
    s(ink, [6, 12], [13, 12], [14 + shift, 17], [11 + shift, 18], [10, 15], [8 - shift, 18], [4 - shift, 18], [4, 16]);
    p(5 - shift, 16, 3, 1, mid); p(11 + shift, 16, 2, 1, mid);
    s(ink, [5, 13], [4, 10], [7, 7], [12, 7], [15, 10], [14, 13], [10, 15], [6, 14]);
    s(dark, [6, 13], [5, 10], [7, 8], [12, 8], [14, 10], [13, 13], [10, 14]);
    s(mid, [6, 9], [9, 8], [13, 9], [13, 11], [10, 12], [6, 12]);
    p(11, 10, 2, 1, light); p(9, 13, 3, 1, gold);
    p(7, 8, 3, 1, light); p(10, 11, 3, 1, dark);
    p(12, 15, 1, 1, light); p(7, 15, 1, 1, light);
    if (knight) {
      s(ink, [3, 9], [7, 9], [9, 11], [8, 14], [6, 16], [3, 14], [2, 12]);
      s(mid, [3, 10], [7, 10], [8, 12], [7, 14], [6, 15], [3, 13]);
      p(3, 10, 3, 1, light); p(5, 11, 1, 3, gold); p(4, 12, 3, 1, gold);
      s(ink, [12, 12], [18, 5], [19, 6], [18, 9], [14, 13]);
      p(17, 7, 1, 2, white); p(16, 9, 1, 2, light); p(13, 11, 3, 1, gold);
    } else {
      p(15, 6, 2, 10, dark); p(15, 8, 1, 7, '#cf875c');
      s(ink, [13, 6], [16, 4], [19, 4], [19, 8], [17, 10], [14, 8]);
      s('#acbdc0', [15, 6], [18, 5], [18, 8], [17, 9]);
      p(17, 5, 2, 1, white); p(6, 9, 2, 1, light);
    }
  } else {
    s(ink, [7, 8], [12, 8], [14, 12], [15 - shift, 16], [13, 18], [5 + shift, 18], [4 + shift, 16], [5, 12]);
    s(dark, [7, 9], [12, 9], [13, 12], [14 - shift, 16], [12, 17], [5 + shift, 17], [6, 12]);
    s(mid, [8, 9], [11, 10], [11, 13], [13, 16], [10, 17], [6 + shift, 16], [7, 13]);
    p(8, 10, 2, 4, light); p(8, 10, 1, 1, gold);
    p(7, 14, 1, 2, dark); p(10, 14, 1, 2, dark); p(12, 14, 1, 1, light);
    p(6 + shift, 16, 3, 1, light); p(11, 16, 3, 1, light);
    const staff = pose === 'ready' ? 16 : 15;
    p(staff, 5, 2, 13, ink); p(staff, 10, 1, 7, '#ba854e');
    p(staff - 1, 4, 4, 4, ink);
    p(staff, 4, 2, 3, gold); p(staff + 1, 5, 1, 1, white);
    p(staff - 2, 11, 2, 2, skinShade);
  }

  s(ink, [6, 3 + head], [9, 1 + head], [13, 2 + head], [14, 5 + head],
    [13, 8 + head], [9, 9 + head], [6, 7 + head]);
  p(9, 4 + head, 4, 3, skin); p(11, 7 + head, 2, 1, skinShade);
  p(12, 5 + head, 1, 1, ink);
  if (escort) {
    s(gold, [5, 5 + head], [7, 4 + head], [9, 1 + head], [12, 2 + head], [16, 5 + head], [13, 6 + head], [5, 6 + head]);
    p(8, 5 + head, 6, 1, '#a47852'); p(9, 3 + head, 3, 1, white);
  } else if (raider) {
    p(7, 3 + head, 6, 2, mid); p(7, 3 + head, 5, 1, light);
    p(6, 1 + head, 2, 3, gold); p(12, 2 + head, 2, 2, gold);
  } else {
    s(mid, [6, 6 + head], [7, 3 + head], [9, 2 + head], [13, 3 + head],
      [13, 4 + head], [10, 4 + head], [8, 7 + head]);
    p(8, 3 + head, 4, 1, light);
    p(7, 5 + head, 1, 2, light);
    if (!knight) p(7, 7 + head, 2, 2, id === 'blue-2' ? white : light);
  }
}

const helms = {
  'blue-1': [
    '..kkkk..', '.klllmk.', 'klwwlmdk', 'kllmmdkk', 'kmsissdk', '.khsshk.', '..kssk..',
  ],
  'blue-2': [
    '..kkkk..', '.kllmmk.', 'klwwlmdk', 'kwwssmdk', 'kwsisgdk', 'kwhsshdk', '.kwwlmk.',
  ],
  'blue-escort': [
    '...kk...', '..kggk..', '.kgwwgk.', 'kgghhggk', 'kkkkkkkk', '..kisk..', '..khhk..',
  ],
  'red-1': [
    'kg....gk', 'kggkkggk', '.kgmmgk.', 'kllmmldk', 'khsiishk', '.khsshk.', '..khhk..',
  ],
  'red-2': [
    '..kkkk..', '.kllmmk.', 'klmmdmdk', 'kldssmdk', 'klsisgdk', 'klhsshdk', '.klddmk.',
  ],
} as const;

function drawVerticalUnit(context: CanvasRenderingContext2D, id: keyof typeof uniforms, north: boolean, pose: MapPose): void {
  const { pixel: p, shape: s } = pixelPainter(context);
  const [dark, mid, light] = uniforms[id];
  const knight = id === 'blue-1';
  const raider = id === 'red-1';
  const escort = id === 'blue-escort';
  const step = pose === 'step-a' ? -1 : pose === 'step-b' ? 1 : 0;
  const stance = pose === 'ready' ? -1 : 0;

  for (const side of [-1, 1]) {
    const x = side < 0 ? 6 : 11;
    const y = step === side ? 16 : 15;
    p(x, y, 4, 3, ink);
    p(x + 1, y, 2, 2, dark);
    p(x + 1, y + 1, 2, 1, mid);
  }

  const isFighter = knight || raider;
  const edge = isFighter ? 5 : 4;
  s(ink, [6, 8], [13, 8], [16, 10], [14, 13], [20 - edge, 16],
    [13, 17], [7, 17], [edge, 16], [5, 13], [3, 11]);
  s(dark, [6, 9], [13, 9], [15, 10], [13, 14], [14, 16],
    [6, 16], [6, 14], [5, 11]);
  s(mid, [7, 9], [12, 9], [13, 11], [12, 13], [13, 16],
    [8, 16], [7, 14], [6, 12]);
  p(6, 10, 2, 1, light); p(12, 10, 2, 1, light);
  if (north) {
    p(7, 10, 6, 2, mid); p(8, 11, 2, 4, light);
    p(11, 12, 2, 4, dark); p(7, 16, 6, 1, light);
  } else if (isFighter) {
    p(8, 11, 4, 1, light);
    p(7, 13, 6, 1, dark); p(9, 13, 2, 1, gold);
    p(7, 15, 2, 1, light); p(11, 15, 2, 1, light);
  } else {
    p(9, 10, 2, 1, gold); p(9, 12, 1, 3, light); p(6, 15, 2, 1, light);
    p(12, 15, 2, 1, light);
  }

  const hand = (north ? 4 : 15) + stance;
  if (knight) {
    p(hand + 1, 4 + stance, 2, 9, ink); p(hand + 1, 4 + stance, 1, 6, white);
    p(hand, 10 + stance, 4, 1, gold);
    const shield = north ? 13 : 2;
    s(ink, [shield, 10], [shield + 5, 10], [shield + 6, 12], [shield + 4, 16], [shield + 2, 16], [shield, 14]);
    p(shield + 1, 11, 4, 3, mid); p(shield + 1, 11, 4, 1, light);
    p(shield + 2, 12, 1, 3, gold); p(shield + 1, 13, 3, 1, gold);
  } else if (raider) {
    p(hand, 7 + stance, 2, 9, ink); p(hand, 8 + stance, 1, 7, '#c38d63');
    p(hand - 1, 5 + stance, 5, 4, ink);
    p(hand, 5 + stance, 3, 2, '#9fafbd'); p(hand, 5 + stance, 2, 1, white);
    p(hand + 1, 7 + stance, 2, 1, '#71849b');
    p(north ? 13 : 4, 11, 2, 2, light);
  } else {
    p(hand + 1, 5 + stance, 2, 13, ink);
    p(hand + 1, 8 + stance, 1, 8, '#c38d63');
    p(hand, 4 + stance, 4, 4, ink);
    p(hand + 1, 4 + stance, 2, 3, escort ? '#f4bd59' : light);
    p(hand + 1, 5 + stance, 1, 1, white);
    p(hand, 12 + stance, 2, 2, skinShade);
  }

  const colors: Record<string, string> = { k: ink, l: light, m: mid, d: dark, w: white, g: gold, h: skinShade, s: skin, i: ink };
  const headY = pose === 'idle' ? 2 : 1;
  helms[id].forEach((row, y) => {
    for (const [x, symbol] of Array.from(row).entries()) {
      if (symbol === '.') continue;
      const color = north && 'hsi'.includes(symbol) ? (y < 5 ? mid : dark) : colors[symbol];
      p(x + 6, y + headY, 1, 1, color);
    }
  });
}
