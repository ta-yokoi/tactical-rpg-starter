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
export const mapPoses = ['idle', 'ready', 'step-a', 'step-b'] as const;
type MapPose = typeof mapPoses[number];

export function drawMapUnit(context: CanvasRenderingContext2D, id: keyof typeof uniforms, pose: MapPose): void {
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
