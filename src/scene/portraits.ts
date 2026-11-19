import atlasUrl from '../art/portraits.webp';
import { pixelPainter } from './pixelPainter';

// Draw on a 32-pixel lattice so portraits remain sharp at every supported UI scale.

type Palette = { dark: string; mid: string; light: string; hair: string; hairLight: string; skin: string; shadow: string };
const ink = '#182431';
const linen = '#e2c9a0';
const palettes: Record<string, Palette> = {
  'blue-1': { dark: '#294251', mid: '#416b8c', light: '#8eb9c1', hair: '#624235', hairLight: '#a76e43', skin: '#e7bc94', shadow: '#b77d6b' },
  'blue-2': { dark: '#3b345c', mid: '#625686', light: '#a596c3', hair: '#d3cad0', hairLight: '#efe2d5', skin: '#f0c7a6', shadow: '#bb8380' },
  'blue-escort': { dark: '#294a44', mid: '#477864', light: '#8eaa75', hair: '#4c3e36', hairLight: '#83654a', skin: '#bb8a66', shadow: '#925f51' },
  'red-1': { dark: '#51333c', mid: '#84505a', light: '#b37d68', hair: '#40383e', hairLight: '#736268', skin: '#c79574', shadow: '#9c6056' },
  'red-2': { dark: '#423140', mid: '#773f50', light: '#b3696e', hair: '#5e4b5b', hairLight: '#867086', skin: '#d9b09d', shadow: '#a3686c' },
};
const cached = new Map<string, HTMLCanvasElement>();

export const PORTRAIT_SIZE = 64;
const cells = new Map([
  ['blue-1', 0], ['blue-2', 1], ['blue-escort', 2], ['red-1', 3], ['red-2', 4],
]);
const requested = new WeakMap<HTMLCanvasElement, string>();
let atlas: HTMLImageElement | null = null;

const loading = new Promise<HTMLImageElement | null>(resolve => {
  const asset = new Image();
  asset.onload = () => {
    if (asset.naturalWidth === cells.size * PORTRAIT_SIZE && asset.naturalHeight === PORTRAIT_SIZE) atlas = asset;
    resolve(atlas);
  };
  asset.onerror = () => resolve(null);
  asset.src = atlasUrl;
});

export function drawPortrait(canvas: HTMLCanvasElement, id: string): void {
  const target = canvas.getContext('2d')!;
  const cell = cells.get(id);
  requested.set(canvas, id);
  target.clearRect(0, 0, canvas.width, canvas.height);
  target.imageSmoothingEnabled = false;
  if (cell === undefined) return;

  const paint = (image: HTMLImageElement): void => {
    target.clearRect(0, 0, canvas.width, canvas.height);
    target.drawImage(image, cell * PORTRAIT_SIZE, 0, PORTRAIT_SIZE, PORTRAIT_SIZE,
      0, 0, canvas.width, canvas.height);
  };
  if (atlas) {
    paint(atlas);
    return;
  }
  const portrait = cached.get(id) ?? createPortrait(palettes[id], id);
  cached.set(id, portrait);
  target.drawImage(portrait, 0, 0, canvas.width, canvas.height);
  void loading.then(image => {
    if (image && requested.get(canvas) === id) paint(image);
  });
}

function createPortrait(c: Palette, id: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const { pixel, shape } = pixelPainter(ctx);

  shape(ink, [1, 32], [4, 26], [11, 22], [10, 16], [8, 9], [12, 3], [22, 2], [26, 9],
    [26, 17], [22, 22], [29, 26], [32, 32]);
  shape(c.dark, [2, 32], [6, 27], [13, 23], [20, 23], [27, 26], [31, 32]);
  shape(c.mid, [3, 32], [7, 27], [13, 24], [18, 28], [22, 24], [27, 26], [29, 32]);
  shape(c.light, [4, 29], [8, 26], [13, 25], [11, 29], [7, 30]);
  shape(c.light, [21, 25], [25, 25], [28, 28], [23, 28]);
  shape(c.skin, [13, 19], [19, 18], [21, 25], [17, 28], [13, 25]);
  shape(c.shadow, [13, 20], [20, 18], [21, 24], [18, 25], [14, 23]);
  shape(c.hair, [9, 12], [9, 8], [13, 4], [21, 3], [25, 7], [25, 14], [22, 19], [11, 21]);
  shape(c.shadow, [12, 10], [21, 7], [24, 10], [24, 15], [22, 21], [18, 23], [14, 21], [12, 18], [10, 16], [10, 13]);
  shape(c.skin, [13, 12], [15, 8], [21, 8], [24, 12], [23, 18], [20, 21], [16, 21], [13, 18]);
  shape(c.hair, [9, 12], [10, 7], [14, 4], [22, 4], [25, 8], [24, 12], [21, 9], [17, 12], [15, 10], [14, 15], [11, 15]);
  shape(c.hairLight, [10, 9], [13, 5], [21, 4], [19, 7], [14, 7], [12, 10]);
  pixel(15, 14, 3, 1, ink); pixel(21, 13, 2, 1, ink);
  pixel(16, 15, 1, 1, c.mid); pixel(21, 14, 1, 1, c.mid);
  pixel(19, 16, 2, 1, c.shadow); pixel(18, 19, 3, 1, c.shadow);
  pixel(18, 28, 2, 2, linen);
  if (id === 'blue-1') {
    shape(c.light, [8, 11], [10, 5], [16, 2], [23, 3], [25, 7], [24, 9], [15, 8], [11, 13]);
    shape(c.mid, [8, 11], [13, 8], [22, 6], [25, 8], [24, 11], [15, 10], [12, 14]);
    pixel(16, 3, 6, 1, linen); pixel(11, 15, 1, 4, c.light);
  } else if (id === 'blue-escort') {
    shape(c.shadow, [8, 11], [11, 5], [16, 4], [20, 4], [24, 8], [29, 10], [24, 12], [8, 13], [4, 11]);
    shape(linen, [5, 10], [11, 9], [12, 6], [15, 4], [20, 4], [23, 8], [28, 9], [29, 10], [19, 11], [9, 12]);
  } else if (id === 'red-1') {
    shape(linen, [7, 3], [11, 6], [14, 8], [12, 11], [8, 8]);
    shape(c.mid, [9, 13], [12, 7], [23, 6], [26, 9], [25, 12], [16, 12], [12, 14]);
    pixel(19, 10, 4, 1, linen);
  } else {
    shape(c.mid, [8, 23], [6, 13], [8, 7], [12, 3], [21, 2], [26, 6], [28, 15], [27, 22], [23, 25], [22, 23], [24, 17], [24, 10], [20, 6], [15, 7], [12, 11], [12, 20], [14, 24], [11, 26]);
    shape(c.light, [7, 13], [8, 7], [12, 3], [21, 2], [25, 5], [18, 5], [12, 7], [10, 12]);
    pixel(17, 4, 2, 2, linen);
  }
  return canvas;
}
