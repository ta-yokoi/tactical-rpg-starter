import { pixelPainter } from './pixelPainter';

export const COMBAT_SIZE = 64;
export type Pose = 'ready' | 'windup' | 'advance' | 'release' | 'strike' | 'recover' | 'hit' | 'guard';
type Point = readonly [number, number];
type Painter = ReturnType<typeof pixelPainter>;
type Palette = {
  kit: 'knight' | 'raider' | 'star' | 'ash' | 'ferryman';
  cloth: readonly [string, string, string, string];
  hair: readonly [string, string, string];
  skin: readonly [string, string, string];
  accent: string;
  gem: string;
};

const gear: Record<string, Palette> = {
  'blue-1': { kit: 'knight', cloth: ['#263756', '#3d587e', '#5f94bd', '#a9d8da'],
    hair: ['#422a35', '#73503d', '#ad7e51'], skin: ['#a86252', '#dc9470', '#f6c996'], accent: '#f4c675', gem: '#86d4e1' },
  'red-1': { kit: 'raider', cloth: ['#402737', '#704053', '#ad5654', '#e78968'],
    hair: ['#292736', '#51404a', '#8b6465'], skin: ['#99594b', '#d18761', '#efb782'], accent: '#f1b96c', gem: '#efa26f' },
  'blue-2': { kit: 'star', cloth: ['#36274f', '#595080', '#8675b7', '#bdafe1'],
    hair: ['#726788', '#b4a6cb', '#eee3ed'], skin: ['#a76771', '#eaa58c', '#ffcfad'], accent: '#f0ce8b', gem: '#a9e4ff' },
  'red-2': { kit: 'ash', cloth: ['#3b253d', '#672f53', '#9b4865', '#cb7b82'],
    hair: ['#413244', '#7c626e', '#b79aa0'], skin: ['#a46865', '#d49881', '#efd0a8'], accent: '#eac17c', gem: '#ff9376' },
  'blue-escort': { kit: 'ferryman', cloth: ['#263f38', '#416853', '#68886a', '#a9b779'],
    hair: ['#3e3235', '#685043', '#997657'], skin: ['#94624b', '#c38b61', '#f0bc86'], accent: '#efc481', gem: '#fbe187' },
};

const ink = '#201e30';
const shadeSteel = '#52677e';
const steel = '#94b5c4';
const shine = '#f6f0d7';
const brown = '#a77952';
const poses: Record<Pose, { lean: number; crouch: number; feet: number; weapon: Point }> = {
  ready: { lean: 0, crouch: 0, feet: 0, weapon: [42, 34] },
  windup: { lean: -2, crouch: 3, feet: 2, weapon: [33, 26] },
  advance: { lean: 3, crouch: 1, feet: 6, weapon: [41, 26] },
  release: { lean: 4, crouch: -1, feet: 3, weapon: [45, 24] },
  strike: { lean: 4, crouch: 1, feet: 4, weapon: [45, 32] },
  recover: { lean: 0, crouch: 2, feet: 1, weapon: [38, 39] },
  hit: { lean: -5, crouch: 2, feet: 2, weapon: [35, 38] },
  guard: { lean: -1, crouch: 3, feet: 0, weapon: [40, 33] },
};
const frames = new Map<string, HTMLCanvasElement>();
type Body = { palette: Palette; pose: Pose; painter: Painter; anchor: Point };

export function drawCombatant(canvas: HTMLCanvasElement, id: string, pose: Pose): void {
  const key = `${id}:${pose}`;
  let frame = frames.get(key);
  if (!frame) {
    frame = paintFrame(gear[id], pose);
    frames.set(key, frame);
  }
  const target = canvas.getContext('2d')!;
  target.clearRect(0, 0, COMBAT_SIZE, COMBAT_SIZE);
  target.drawImage(frame, 0, 0);
}

function paintFrame(palette: Palette, pose: Pose): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = COMBAT_SIZE;
  const painter = pixelPainter(canvas.getContext('2d')!);
  const stance = poses[pose];
  const body: Body = { palette, pose, painter, anchor: [stance.lean, stance.crouch] };
  const armored = palette.kit === 'knight' || palette.kit === 'raider';

  if (armored) paintArmor(body);
  else paintRobe(body);
  paintHead(body);
  if (armored) paintMelee(body);
  else paintCaster(body);
  return canvas;
}

function paintArmor({ palette, pose, painter: { pixel: p, shape: s }, anchor: [x, y] }: Body): void {
  const [deep, mid, main, light] = palette.cloth;
  const foot = poses[pose].feet;
  const leading = 36 + (pose === 'advance' || pose === 'strike' ? foot : 0);
  const trailing = 16 - foot;
  const hip = 25 + x;
  const footY = pose === 'advance' ? 58 : 61;

  // The far leg and cape sit behind the breastplate.
  s(ink, [hip - 7, 39 + y], [hip + 5, 45], [18, 51], [trailing + 4, 57], [trailing + 2, 62],
    [trailing - 7, 62], [trailing - 7, 58], [trailing - 2, 55], [14, 47]);
  s(deep, [hip - 5, 41 + y], [hip + 2, 45], [17, 51], [trailing + 2, 57], [trailing + 1, 60],
    [trailing - 5, 60], [trailing - 4, 58], [trailing, 56], [16, 47]);
  p(trailing - 5, 60, 7, 1, mid);
  s(ink, [16 + x, 24 + y], [24 + x, 28 + y], [22 + x, 42], [17, 48], [7 - foot, 54], [3, 53],
    [7, 48], [10 + x, 36]);
  s(deep, [16 + x, 25 + y], [22 + x, 29 + y], [21 + x, 41], [15, 48], [7 - foot, 52], [6, 52], [10, 46]);
  s(mid, [17 + x, 27 + y], [20 + x, 30 + y], [18, 43], [10, 47], [12, 39]);

  s(ink, [hip - 1, 38 + y], [hip + 11, 39 + y], [leading - 5, 48], [leading - 6, footY - 6],
    [leading + 2, footY - 4], [leading + 4, footY], [leading - 9, footY],
    [leading - 10, footY - 10], [leading - 9, 48], [hip, 47]);
  s(mid, [hip + 1, 40 + y], [hip + 9, 41 + y], [leading - 6, 48], [leading - 7, footY - 6],
    [leading, footY - 4], [leading + 2, footY - 1], [leading - 8, footY - 1], [leading - 9, footY - 10],
    [leading - 10, 48], [hip + 1, 46]);
  s(main, [hip + 3, 43 + y], [hip + 8, 42 + y], [leading - 6, 48], [leading - 7, 51], [leading - 9, 51]);
  p(leading - 8, footY - 8, 2, 4, light); p(leading - 2, footY - 3, 4, 1, main);

  s(ink, [15 + x, 24 + y], [22 + x, 20 + y], [31 + x, 20 + y], [38 + x, 26 + y],
    [37 + x, 34 + y], [33 + x, 42 + y], [27 + x, 45 + y], [20 + x, 42 + y], [20 + x, 35 + y], [13 + x, 31 + y]);
  s(deep, [16 + x, 25 + y], [22 + x, 21 + y], [31 + x, 21 + y], [37 + x, 26 + y],
    [35 + x, 35 + y], [32 + x, 41 + y], [27 + x, 44 + y], [21 + x, 41 + y], [22 + x, 34 + y], [15 + x, 30 + y]);
  s(main, [18 + x, 24 + y], [25 + x, 22 + y], [33 + x, 23 + y], [35 + x, 27 + y],
    [31 + x, 34 + y], [24 + x, 35 + y], [20 + x, 31 + y], [16 + x, 30 + y]);
  s(light, [18 + x, 24 + y], [24 + x, 22 + y], [28 + x, 23 + y], [27 + x, 26 + y],
    [21 + x, 27 + y], [18 + x, 29 + y], [16 + x, 28 + y]);
  p(24 + x, 37 + y, 10, 2, ink); p(28 + x, 37 + y, 3, 2, palette.accent);
  p(24 + x, 40 + y, 5, 1, main); p(26 + x, 31 + y, 6, 1, light);
  if (palette.kit === 'raider') {
    p(20 + x, 25 + y, 9, 2, '#745259'); p(23 + x, 28 + y, 3, 2, '#e1ad84');
    p(32 + x, 33 + y, 2, 2, palette.accent);
  }
}

function paintRobe({ palette, pose, painter: { pixel: p, shape: s }, anchor: [x, y] }: Body): void {
  const [deep, mid, main, light] = palette.cloth;
  const flutter = pose === 'release' ? 5 : pose === 'hit' ? 3 : pose === 'advance' ? 2 : 0;
  s(ink, [15 + x, 26 + y], [23 + x, 21 + y], [34 + x, 21 + y], [37 + x, 27 + y],
    [35 + x, 38 + y], [37 + x, 46], [43, 58], [40, 61], [15, 61],
    [8 - flutter, 57], [13 - flutter, 51], [18 + x, 37 + y]);
  s(deep, [16 + x, 27 + y], [23 + x, 22 + y], [34 + x, 22 + y], [36 + x, 27 + y],
    [34 + x, 39 + y], [36 + x, 46], [41, 58], [38, 60], [15, 59],
    [10 - flutter, 57], [15 - flutter, 51], [19 + x, 37 + y]);
  s(mid, [19 + x, 27 + y], [26 + x, 23 + y], [32 + x, 24 + y], [34 + x, 29 + y],
    [31 + x, 39 + y], [35 + x, 54], [37, 58], [32, 59], [25, 58], [17, 59],
    [13 - flutter, 57], [18 - flutter, 48], [20 + x, 36 + y]);
  s(main, [21 + x, 28 + y], [27 + x, 24 + y], [31 + x, 25 + y], [30 + x, 34 + y],
    [26 + x, 42 + y], [27, 58], [21, 58], [23, 45], [20 + x, 36 + y]);
  s(light, [22 + x, 27 + y], [27 + x, 25 + y], [29 + x, 26 + y], [26 + x, 28 + y], [23 + x, 33 + y]);
  s(main, [16 - flutter, 53], [19, 45], [18, 54], [16, 57], [13, 57]);
  p(27 + x, 35 + y, 4, 2, palette.accent); p(28 + x, 35 + y, 1, 1, shine);
  p(13, 57, 6, 1, palette.accent); p(32, 57, 7, 1, palette.accent);
  p(26, 60, 9, 2, ink); p(28, 60, 4, 1, main);
  if (palette.kit === 'ash') {
    s(deep, [14 + x, 27 + y], [20 + x, 22 + y], [23 + x, 25 + y], [20 + x, 38 + y],
      [15 - flutter, 49], [12 - flutter, 48], [16 + x, 36 + y]);
    p(17 + x, 26 + y, 3, 1, light); p(17 + x, 28 + y, 2, 2, main);
    p(19, 52, 2, 2, main); p(24, 51, 2, 1, palette.accent);
  } else if (palette.kit === 'star') {
    p(21, 49, 4, 1, light); p(22, 48, 2, 3, light);
    p(24, 55, 2, 1, shine);
  } else if (palette.kit === 'ferryman') {
    s(brown, [19 + x, 26 + y], [22 + x, 24 + y], [33 + x, 36 + y], [31 + x, 38 + y]);
    p(11 - flutter, 42, 4, 7, '#74604c'); p(12 - flutter, 43, 2, 4, palette.accent);
  }
}

function paintHead({ palette, painter: { pixel: p, shape: s }, anchor: [x, y] }: Body): void {
  const [deep, mid, main, light] = palette.cloth;
  const [hairDark, hair, hairLight] = palette.hair;
  const [skinShade, skin, skinLight] = palette.skin;
  s(ink, [21 + x, 21 + y], [19 + x, 17 + y], [19 + x, 12 + y], [22 + x, 7 + y],
    [28 + x, 6 + y], [34 + x, 8 + y], [35 + x, 13 + y], [39 + x, 17 + y], [36 + x, 19 + y],
    [35 + x, 23 + y], [30 + x, 25 + y], [24 + x, 24 + y]);
  s(skinShade, [25 + x, 13 + y], [31 + x, 10 + y], [34 + x, 12 + y], [34 + x, 14 + y],
    [37 + x, 17 + y], [34 + x, 19 + y], [34 + x, 22 + y], [30 + x, 24 + y], [25 + x, 22 + y]);
  s(skin, [28 + x, 13 + y], [33 + x, 12 + y], [34 + x, 15 + y], [36 + x, 17 + y],
    [34 + x, 19 + y], [33 + x, 22 + y], [29 + x, 22 + y], [26 + x, 19 + y]);
  p(30 + x, 15 + y, 3, 1, skinLight); p(32 + x, 15 + y, 2, 1, ink);
  p(33 + x, 16 + y, 1, 1, shine); p(32 + x, 20 + y, 2, 1, skinShade);
  s(hairDark, [19 + x, 17 + y], [20 + x, 11 + y], [24 + x, 7 + y], [32 + x, 8 + y],
    [34 + x, 11 + y], [30 + x, 12 + y], [26 + x, 14 + y], [25 + x, 21 + y], [22 + x, 22 + y]);
  p(24 + x, 10 + y, 7, 2, hair); p(23 + x, 12 + y, 5, 1, hairLight);

  if (palette.kit === 'knight') {
    s(deep, [17 + x, 15 + y], [20 + x, 8 + y], [25 + x, 5 + y], [32 + x, 6 + y],
      [36 + x, 10 + y], [34 + x, 13 + y], [28 + x, 12 + y], [23 + x, 15 + y], [20 + x, 19 + y]);
    s(main, [18 + x, 14 + y], [21 + x, 9 + y], [25 + x, 6 + y], [32 + x, 7 + y], [34 + x, 10 + y],
      [28 + x, 10 + y], [24 + x, 13 + y], [21 + x, 16 + y]);
    p(24 + x, 7 + y, 5, 1, light); p(30 + x, 10 + y, 5, 1, palette.accent);
    p(21 + x, 15 + y, 1, 3, light);
  } else if (palette.kit === 'raider') {
    p(21 + x, 11 + y, 14, 2, main); p(24 + x, 11 + y, 7, 1, light);
    s(palette.accent, [19 + x, 12 + y], [16 + x, 4 + y], [18 + x, 5 + y], [23 + x, 10 + y], [22 + x, 13 + y]);
    p(17 + x, 5 + y, 1, 3, shine); p(25 + x, 20 + y, 2, 2, hair); p(31 + x, 19 + y, 1, 2, skinShade);
  } else if (palette.kit === 'ferryman') {
    s(ink, [13 + x, 13 + y], [19 + x, 10 + y], [24 + x, 5 + y], [30 + x, 5 + y],
      [36 + x, 10 + y], [42 + x, 12 + y], [40 + x, 15 + y], [19 + x, 16 + y]);
    s(palette.accent, [15 + x, 13 + y], [22 + x, 10 + y], [25 + x, 6 + y], [29 + x, 6 + y],
      [35 + x, 11 + y], [40 + x, 12 + y], [38 + x, 14 + y], [20 + x, 15 + y]);
    p(22 + x, 12 + y, 14, 1, brown); p(25 + x, 7 + y, 3, 1, shine);
    p(29 + x, 22 + y, 4, 1, hairDark);
  } else {
    s(deep, [16 + x, 22 + y], [16 + x, 14 + y], [18 + x, 9 + y], [23 + x, 5 + y],
      [30 + x, 4 + y], [35 + x, 7 + y], [37 + x, 12 + y], [34 + x, 13 + y],
      [31 + x, 9 + y], [28 + x, 10 + y], [24 + x, 15 + y], [24 + x, 22 + y], [21 + x, 26 + y]);
    s(main, [17 + x, 19 + y], [17 + x, 13 + y], [20 + x, 8 + y], [24 + x, 6 + y], [30 + x, 5 + y],
      [35 + x, 8 + y], [36 + x, 11 + y], [33 + x, 11 + y], [30 + x, 7 + y], [25 + x, 9 + y], [21 + x, 13 + y]);
    p(24 + x, 7 + y, 4, 1, light); p(20 + x, 10 + y, 3, 1, light);
    p(22 + x, 16 + y, 2, 6, hair); p(23 + x, 17 + y, 1, 4, hairLight);
    p(18 + x, 20 + y, 2, 2, mid); p(29 + x, 7 + y, 2, 2, palette.accent);
    if (palette.kit === 'star') {
      s(hair, [25 + x, 12 + y], [28 + x, 11 + y], [27 + x, 15 + y], [26 + x, 19 + y],
        [25 + x, 24 + y], [21 + x, 26 + y], [22 + x, 21 + y]);
      p(25 + x, 13 + y, 2, 3, hairLight); p(23 + x, 21 + y, 2, 3, hairLight);
    } else {
      s(mid, [30 + x, 21 + y], [37 + x, 19 + y], [35 + x, 24 + y], [30 + x, 25 + y], [25 + x, 24 + y]);
      p(31 + x, 22 + y, 3, 1, main);
    }
  }
}

function paintMelee({ palette, pose, painter: { pixel: p, shape: s }, anchor: [x, y] }: Body): void {
  const [deep, mid, main, light] = palette.cloth;
  const [handX, handY] = poses[pose].weapon;
  const knight = palette.kit === 'knight';
  const guarding = pose === 'guard' || pose === 'hit';
  const shoulderX = 32 + x;
  const shoulderY = 25 + y;
  s(ink, [shoulderX - 4, shoulderY], [shoulderX + 3, shoulderY - 1], [handX, handY - 4],
    [handX + 4, handY - 1], [handX + 2, handY + 4], [handX - 3, handY + 4], [shoulderX - 3, shoulderY + 8]);
  s(mid, [shoulderX - 3, shoulderY + 1], [shoulderX + 2, shoulderY], [handX, handY - 3],
    [handX + 2, handY - 1], [handX - 2, handY + 2], [shoulderX - 2, shoulderY + 6]);
  p(handX - 2, handY - 2, 4, 4, palette.skin[0]); p(handX - 1, handY - 2, 3, 2, palette.skin[2]);
  p(shoulderX - 2, shoulderY + 2, 5, 2, light);

  const sweeping = pose === 'strike';
  const raised = pose === 'windup' || pose === 'advance';
  const exit: Point = sweeping ? [59, handY + 1] : raised ? [handX - 6, 6] : pose === 'recover' ? [55, 47] : [54, 13];
  if (knight) {
    const [tipX, tipY] = pose === 'release' ? [56, 8] : exit;
    s(ink, [handX + 1, handY - 2], [tipX - 1, tipY - 1], [tipX + 3, tipY], [tipX + 2, tipY + 4], [handX + 3, handY + 3]);
    s(shadeSteel, [handX + 2, handY], [tipX, tipY], [tipX + 2, tipY + 1], [tipX + 1, tipY + 3], [handX + 3, handY + 2]);
    s(shine, [handX + 2, handY], [tipX, tipY], [tipX + 1, tipY + 1], [handX + 3, handY + 1]);
    p(handX, handY - 3, 2, 7, palette.accent);
    const sx = (guarding ? 23 : 16) + x;
    const sy = (guarding ? 27 : 32) + y;
    s(ink, [sx - 7, sy + 1], [sx, sy - 3], [sx + 8, sy], [sx + 9, sy + 7],
      [sx + 3, sy + 14], [sx - 3, sy + 12], [sx - 7, sy + 8]);
    s(shadeSteel, [sx - 6, sy + 1], [sx, sy - 2], [sx + 7, sy + 1], [sx + 8, sy + 7],
      [sx + 3, sy + 13], [sx - 2, sy + 11], [sx - 6, sy + 7]);
    s(main, [sx - 4, sy + 2], [sx, sy], [sx + 6, sy + 2], [sx + 6, sy + 7],
      [sx + 2, sy + 11], [sx - 3, sy + 9]);
    p(sx - 3, sy + 2, 4, 1, light); p(sx + 1, sy + 3, 2, 6, palette.accent); p(sx - 1, sy + 5, 6, 2, palette.accent);
  } else {
    const [headX, headY] = sweeping ? [55, 37] : pose === 'release' ? [53, 14] : raised ? [24, 8] : [49, 18];
    s(ink, [handX - 4, handY + 4], [headX - 2, headY], [headX + 2, headY + 2], [handX - 1, handY + 6]);
    s(brown, [handX - 3, handY + 4], [headX, headY + 1], [headX + 1, headY + 2], [handX - 2, handY + 5]);
    s(ink, [headX - 4, headY - 3], [headX + 4, headY - 7], [headX + 7, headY - 5], [headX + 8, headY + 1],
      [headX + 5, headY + 7], [headX + 1, headY + 6], [headX - 2, headY + 3]);
    s(steel, [headX - 2, headY - 2], [headX + 4, headY - 6], [headX + 6, headY - 4], [headX + 7, headY + 1],
      [headX + 4, headY + 6], [headX + 2, headY + 5], [headX, headY + 2]);
    s(shine, [headX + 4, headY - 6], [headX + 6, headY - 4], [headX + 7, headY + 1], [headX + 4, headY + 6], [headX + 5, headY + 1]);
    p(headX - 1, headY - 2, 3, 3, deep);
  }
}

function paintCaster({ palette, pose, painter: { pixel: p, shape: s }, anchor: [x, y] }: Body): void {
  const [deep, mid, main, light] = palette.cloth;
  const [handX, handY] = poses[pose].weapon;
  const charge = pose === 'advance' || pose === 'release';
  const glow = palette.gem;
  const reach = pose === 'strike' || pose === 'release';
  const tipX = palette.kit === 'ferryman' ? handX + 4 : reach ? 57 : pose === 'advance' ? handX + 5 : handX + 6;
  const tipY = pose === 'advance' ? 11 : reach ? handY - 7 : 14;
  s(ink, [tipX - 2, tipY + 6], [tipX + 2, tipY + 6], [handX + 1, handY + 4], [handX - 4, 61], [handX - 7, 61], [handX - 2, handY]);
  s(brown, [tipX - 1, tipY + 6], [tipX + 1, tipY + 7], [handX, handY + 4], [handX - 5, 60], [handX - 6, 60], [handX - 1, handY]);
  p(handX - 5, 58, 2, 2, palette.accent);
  if (palette.kit === 'ferryman') {
    p(tipX - 4, tipY, 8, 9, ink); p(tipX - 3, tipY + 1, 6, 7, brown);
    p(tipX - 2, tipY + 2, 4, 4, glow); p(tipX - 1, tipY + 2, 2, 3, shine);
  } else {
    s(ink, [tipX - 6, tipY + 1], [tipX - 3, tipY - 4], [tipX + 1, tipY - 6],
      [tipX + 5, tipY - 3], [tipX + 5, tipY + 3], [tipX + 2, tipY + 8], [tipX - 3, tipY + 6]);
    s(palette.accent, [tipX - 5, tipY + 1], [tipX - 2, tipY - 3], [tipX + 1, tipY - 5],
      [tipX + 4, tipY - 2], [tipX + 4, tipY + 2], [tipX + 2, tipY + 7], [tipX - 2, tipY + 5]);
    s(glow, [tipX - 2, tipY + 1], [tipX, tipY - 2], [tipX + 3, tipY], [tipX + 2, tipY + 4], [tipX, tipY + 4]);
    p(tipX, tipY - 1, 2, 2, shine);
    if (charge) {
      p(tipX - 8, tipY - 3, 2, 1, glow); p(tipX + 6, tipY - 4, 1, 3, shine);
      p(tipX - 4, tipY + 9, 2, 2, glow); p(tipX, tipY - 8, 1, 1, shine);
    }
  }
  s(ink, [26 + x, 24 + y], [33 + x, 24 + y], [37 + x, 27 + y], [handX + 2, handY - 4],
    [handX + 4, handY], [handX, handY + 4], [35 + x, 39 + y], [25 + x, 35 + y], [23 + x, 28 + y]);
  s(mid, [26 + x, 25 + y], [32 + x, 25 + y], [36 + x, 28 + y], [handX + 1, handY - 3],
    [handX + 2, handY], [handX - 1, handY + 3], [35 + x, 37 + y], [26 + x, 34 + y], [24 + x, 28 + y]);
  s(main, [26 + x, 27 + y], [31 + x, 26 + y], [36 + x, 29 + y], [handX - 2, handY - 1],
    [handX - 2, handY + 2], [34 + x, 35 + y], [26 + x, 32 + y]);
  p(26 + x, 27 + y, 4, 2, light); p(handX - 2, handY - 1, 5, 4, palette.skin[1]);
  p(handX, handY - 1, 2, 1, palette.skin[2]); p(handX - 3, handY, 1, 3, deep);
}
