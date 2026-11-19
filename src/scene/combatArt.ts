import { pixelPainter } from './pixelPainter';

export const COMBAT_SIZE = 44;
export type Pose = 'ready' | 'windup' | 'strike' | 'hit';
type Costume = 'knight' | 'raider' | 'mage' | 'hexer' | 'escort';
type Colors = { costume: Costume; dark: string; mid: string; light: string; trim: string; hair: string };

const colors: Record<string, Colors> = {
  'blue-1': { costume: 'knight', dark: '#243967', mid: '#4368a0', light: '#82c5d4', trim: '#f9d079', hair: '#844b36' },
  'red-1': { costume: 'raider', dark: '#532c39', mid: '#a95151', light: '#e59168', trim: '#f3c380', hair: '#412f38' },
  'blue-2': { costume: 'mage', dark: '#362b67', mid: '#6753a2', light: '#ae9fe1', trim: '#f3cf80', hair: '#ded4e3' },
  'red-2': { costume: 'hexer', dark: '#512744', mid: '#a14968', light: '#e78c84', trim: '#f1c478', hair: '#624355' },
  'blue-escort': { costume: 'escort', dark: '#274d48', mid: '#48836d', light: '#8fbc8a', trim: '#f5d086', hair: '#665044' },
};
const ink = '#202237';
const skin = '#f2bb85';
const skinShade = '#bc755e';
const steel = '#a0b8c8';
const gleam = '#f8eed6';
const frames = new Map<string, HTMLCanvasElement>();

export function drawCombatant(canvas: HTMLCanvasElement, id: string, pose: Pose): void {
  const key = `${id}:${pose}`;
  const frame = frames.get(key) ?? paintCombatant(colors[id], pose);
  frames.set(key, frame);
  const target = canvas.getContext('2d')!;
  target.clearRect(0, 0, COMBAT_SIZE, COMBAT_SIZE);
  target.drawImage(frame, 0, 0);
}

function paintCombatant(c: Colors, pose: Pose): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = COMBAT_SIZE;
  const context = canvas.getContext('2d')!;
  const dx = pose === 'strike' ? 3 : pose === 'hit' ? -2 : 0;
  context.translate(dx, pose === 'windup' ? 1 : 0);
  const { pixel: p, shape: s } = pixelPainter(context);
  const robed = c.costume === 'mage' || c.costume === 'hexer' || c.costume === 'escort';
  const swinging = pose === 'strike';
  const preparing = pose === 'windup';

  if (robed) {
    s(ink, [14, 23], [27, 23], [29, 32], [33, 38], [29, 41], [10, 41], [6, 38], [10, 34]);
    s(c.dark, [15, 24], [26, 24], [27, 33], [31, 38], [25, 40], [10, 39], [8, 38], [12, 34]);
    s(c.mid, [17, 25], [25, 25], [26, 33], [28, 38], [20, 39], [15, 38], [10, 39], [15, 32]);
    s(c.light, [18, 26], [21, 26], [20, 33], [18, 38], [15, 38]);
    p(12, 39, 6, 1, c.trim); p(22, 39, 6, 1, c.trim);
    p(18, 41, 7, 2, ink);
    p(19, 41, 4, 1, c.mid);
  } else {
    s(ink, [12, 22], [17, 25], [15, 31], [8, 35], [2, 34], [5, 29], [8, 23]);
    s(c.dark, [13, 24], [16, 25], [14, 30], [7, 33], [4, 33], [7, 28]);
    s(c.mid, [13, 24], [15, 25], [12, 30], [6, 32], [8, 27]);
    s(ink, [12, 27], [24, 25], [25, 31], [23, 36], [25, 40], [28, 41], [28, 43], [20, 43], [17, 39], [18, 33], [13, 36], [11, 39], [12, 42], [10, 43], [3, 43], [4, 39], [7, 37], [9, 32]);
    s(c.mid, [13, 28], [23, 27], [24, 31], [20, 35], [20, 38], [25, 42], [21, 42],
      [18, 38], [20, 31], [15, 34], [10, 38], [9, 42], [5, 42], [5, 40], [9, 36]);
    s(c.light, [10, 36], [13, 34], [11, 38], [7, 41], [6, 40]);
    p(19, 35, 2, 3, c.light); p(22, 40, 3, 1, c.light);
  }

  s(ink, [8, 23], [10, 17], [14, 14], [23, 14], [28, 18], [27, 25], [23, 30], [14, 30], [12, 26]);
  s(c.dark, [10, 23], [11, 18], [15, 15], [24, 16], [27, 19], [25, 25], [22, 29], [15, 29]);
  s(c.mid, [11, 20], [15, 16], [22, 16], [26, 19], [23, 24], [18, 25], [14, 25]);
  s(c.light, [11, 21], [11, 18], [14, 16], [19, 16], [18, 20], [16, 22]);
  p(17, 26, 7, 2, ink); p(20, 26, 2, 2, c.trim);

  s(ink, [14, 14], [13, 8], [16, 4], [22, 3], [26, 5], [26, 9], [29, 12], [27, 13], [26, 16], [22, 17], [18, 16]);
  s(skinShade, [16, 9], [22, 6], [25, 8], [25, 10], [27, 12], [25, 13], [25, 15], [22, 16], [18, 14]);
  s(skin, [20, 8], [24, 8], [25, 10], [26, 12], [24, 13], [24, 15], [21, 14], [19, 12]);
  p(23, 10, 2, 1, ink); p(23, 13, 2, 1, skinShade);
  s(c.hair, [14, 9], [15, 6], [19, 4], [24, 4], [26, 6], [25, 8], [22, 8], [20, 10], [19, 13], [17, 14]);
  if (c.costume === 'knight') {
    s(c.mid, [12, 10], [14, 5], [18, 3], [24, 4], [26, 6], [25, 8], [19, 8], [15, 12]);
    s(c.light, [13, 9], [15, 5], [19, 4], [24, 5], [24, 6], [18, 6], [15, 9]);
    p(18, 3, 4, 1, gleam);
  } else if (c.costume === 'raider') {
    p(14, 7, 12, 2, c.trim);
    s(c.light, [13, 7], [11, 1], [14, 3], [17, 7]); p(24, 4, 2, 3, c.trim);
  } else if (c.costume === 'escort') {
    s(c.trim, [9, 9], [15, 7], [17, 4], [22, 4], [25, 7], [30, 8], [31, 10], [15, 12], [9, 11]);
    p(12, 10, 12, 1, skinShade);
  } else {
    s(c.mid, [12, 16], [11, 11], [12, 7], [17, 3], [23, 2], [27, 6], [28, 9], [25, 9], [23, 6], [18, 7], [16, 12], [15, 17]);
    s(c.light, [12, 11], [13, 7], [17, 4], [23, 3], [25, 5], [19, 5], [15, 7], [14, 11]);
    p(22, 4, 2, 2, c.trim);
  }

  if (!robed) {
    const start = swinging ? 25 : 19;
    const top = preparing ? 12 : 19;
    s(ink, [18, 18], [22, 17], [start + 5, top], [start + 6, top + 4], [start + 3, top + 6], [19, 25], [16, 22]);
    s(c.light, [18, 19], [22, 18], [start + 4, top + 1], [start + 4, top + 4], [20, 23]);
    p(start + 3, top + 1, 3, 3, skin);
    const hilt = start + 6;
    if (c.costume === 'raider') {
      const headX = swinging ? 38 : preparing ? 18 : 32;
      const headY = swinging ? 16 : 6;
      s(ink, [hilt - 1, top + 3], [headX, headY], [headX + 2, headY + 2], [hilt + 2, top + 5]);
      s('#b78357', [hilt, top + 3], [headX, headY + 1], [headX + 1, headY + 2], [hilt + 1, top + 4]);
      s(ink, [headX - 3, headY - 2], [headX + 3, headY - 5], [headX + 5, headY - 2],
        [headX + 5, headY + 3], [headX + 2, headY + 6], [headX - 2, headY + 2]);
      s(steel, [headX - 2, headY - 1], [headX + 3, headY - 4], [headX + 4, headY - 2],
        [headX + 4, headY + 2], [headX + 2, headY + 5], [headX, headY + 2]);
      p(headX + 3, headY - 2, 1, 4, gleam);
    } else if (swinging) {
      p(hilt - 1, 17, 2, 7, c.trim);
      s(ink, [hilt + 1, 18], [40, 15], [41, 17], [39, 21], [hilt + 1, 22]);
      s(steel, [hilt + 1, 19], [40, 16], [39, 20], [hilt + 1, 21]);
      p(hilt + 2, 19, 4, 1, gleam);
    } else {
      const tip = preparing ? hilt - 8 : hilt + 9;
      s(ink, [hilt - 1, top + 2], [tip, 1], [tip + 2, 1], [tip + 3, 5], [hilt + 3, top + 3]);
      s(steel, [hilt, top + 1], [tip + 1, 2], [tip + 2, 3], [hilt + 2, top + 2]);
      p(hilt - 1, top, 5, 2, c.trim);
    }
    if (c.costume === 'knight') {
      s(ink, [7, 19], [13, 18], [16, 21], [16, 28], [12, 34], [7, 31], [5, 25]);
      s(c.mid, [7, 20], [13, 19], [15, 21], [15, 28], [12, 33], [8, 30], [6, 25]);
      s(c.light, [7, 20], [13, 19], [14, 21], [8, 22], [7, 25], [6, 24]); p(9, 24, 4, 2, c.trim); p(10, 23, 2, 4, c.trim);
    }
  } else {
    const staff = swinging ? 35 : preparing ? 30 : 31;
    p(staff, 9, 3, 32, ink); p(staff + 1, 10, 1, 28, c.trim);
    s(ink, [staff - 3, 9], [staff + 1, 4], [staff + 5, 7], [staff + 4, 12], [staff, 14]);
    s(c.trim, [staff - 2, 9], [staff + 1, 5], [staff + 4, 7], [staff + 3, 11], [staff, 13]);
    p(staff, 7, 3, 3, gleam); p(staff + 1, 9, 2, 2, c.light);
    s(ink, [19, 17], [24, 17], [27, 20], [staff + 3, 19], [staff + 4, 22], [29, 25], [21, 25], [17, 22]);
    s(c.light, [19, 18], [23, 18], [26, 21], [29, 21], [29, 23], [21, 24], [18, 22]);
    p(staff - 1, 20, 4, 3, skin);
  }
  return canvas;
}

export type ArenaGround = 'road' | 'wood' | 'meadow';

export function combatBackdrop(ground: ArenaGround): string {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 120;
  const { pixel: p, shape: s } = pixelPainter(canvas.getContext('2d')!);
  p(0, 0, 240, 120, '#829eb6');
  p(0, 21, 240, 48, '#a7bbba');
  p(0, 48, 240, 35, '#d3cdb0');
  for (const [x, y, span] of [[9, 21, 56], [126, 32, 63], [199, 12, 36], [76, 50, 40]]) {
    p(x, y, span, 2, '#cad0bb'); p(x + 8, y - 2, span - 19, 2, '#cad0bb');
  }
  s('#687b96', [0, 65], [27, 47], [60, 58], [91, 39], [105, 51], [132, 59], [163, 41], [188, 50], [220, 29], [240, 44], [240, 84], [0, 84]);
  s('#8a99a2', [160, 44], [164, 41], [185, 49], [175, 47], [173, 51], [167, 46]);
  s('#a4ada7', [205, 42], [220, 29], [240, 44], [227, 39], [223, 43], [219, 36], [216, 38], [213, 37]);
  s('#546c7c', [0, 69], [25, 58], [38, 62], [50, 55], [76, 68], [107, 58], [135, 64], [163, 54],
    [198, 67], [229, 56], [240, 59], [240, 96], [0, 96]);
  s('#485f60', [0, 78], [32, 70], [63, 75], [102, 69], [141, 75], [161, 69], [198, 73], [240, 66], [240, 95], [0, 95]);
  for (let x = 1; x < 240; x += 7) {
    const y = 67 + (x * 13) % 14;
    s('#344f53', [x - 3, 93], [x + 2, y], [x + 7, 93]);
    s('#496865', [x, 90], [x + 2, y + 2], [x + 4, 90]);
  }
  if (ground === 'wood') {
    p(0, 87, 240, 13, '#527893');
    for (let x = 4; x < 240; x += 27) p(x, 89 + x % 5, 13, 1, '#8db2b6');
    p(0, 96, 240, 24, '#7d604e');
    p(0, 99, 240, 21, '#b89564');
    p(0, 97, 240, 1, '#e7c590');
    for (let x = -12; x < 240; x += 12) {
      const skew = Math.round((x - 120) / 12);
      s('#896a50', [x, 99], [x + 1, 99], [x + skew + 1, 120], [x + skew, 120]);
      p(x + 3, 102 + x % 6, 5, 1, '#d1ad75');
    }
  } else {
    p(0, 91, 240, 29, '#556b4c');
    p(0, 96, 240, 24, ground === 'road' ? '#a28b67' : '#788550');
    p(0, 99, 240, 21, ground === 'road' ? '#baa378' : '#8f995e');
    for (let x = 3; x < 240; x += 11) {
      const y = 96 + (x * 7) % 19;
      p(x, y, 4 + x % 4, 1, '#766d53');
      p(x + 2, y - 1, 3, 1, ground === 'road' ? '#d3bc8d' : '#aeb679');
      if (x % 3 === 1) {
        p(x, 94, 1, 4, '#425c49'); p(x + 3, 93, 1, 4, '#657e53');
      }
    }
  }
  return `url("${canvas.toDataURL()}")`;
}
