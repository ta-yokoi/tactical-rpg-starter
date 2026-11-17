import Phaser from 'phaser';

type Pixel = (x: number, y: number, w: number, h: number, color: string) => void;

const palette = {
  grass: '#638c65', grassLight: '#83a977', grassDark: '#436e5b',
  soil: '#b99b65', soilDark: '#896e55', stone: '#73817b', stoneDark: '#4f6465',
  blue: '#397cbd', blueLight: '#8ac5da', red: '#ad4b50', redLight: '#ea946a',
  gold: '#edca78', ink: '#283c48', skin: '#e6b58d', white: '#f2ead7',
};

function make(scene: Phaser.Scene, name: string, width: number, height: number, draw: (pixel: Pixel) => void): void {
  const texture = scene.textures.createCanvas(name, width, height);
  if (!texture) return;
  const context = texture.getContext();
  context.clearRect(0, 0, width, height);
  draw((x, y, w, h, color) => {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  });
  texture.refresh();
}

export function createPixelArt(scene: Phaser.Scene): void {
  for (let variant = 0; variant < 4; variant++) {
    make(scene, `grass-${variant}`, 24, 24, p => {
      p(0, 0, 24, 24, palette.grass);
      p(0, 0, 24, 2, palette.grassLight);
      p(0, 22, 24, 2, palette.grassDark);
      p(4 + variant * 2, 5, 2, 3, palette.grassLight);
      p(17 - variant, 13, 2, 3, palette.grassDark);
      p(10, 18 - variant, 3, 1, palette.grassLight);
      if (variant === 2) { p(7, 10, 2, 2, '#d8cb82'); p(9, 11, 1, 1, palette.white); }
    });
  }
  make(scene, 'path', 24, 24, p => {
    p(0, 0, 24, 24, palette.soil);
    p(0, 0, 24, 2, '#d4ba80'); p(0, 22, 24, 2, palette.soilDark);
    p(3, 7, 5, 1, palette.soilDark); p(15, 15, 6, 1, '#d4ba80');
    p(10, 20, 3, 1, palette.soilDark);
  });
  make(scene, 'wall', 24, 24, p => {
    p(0, 0, 24, 24, palette.stoneDark);
    p(1, 2, 22, 6, palette.stone); p(2, 3, 19, 1, '#a0aaa0');
    p(1, 10, 10, 6, palette.stone); p(13, 10, 10, 6, palette.stone);
    p(1, 18, 22, 5, palette.stone); p(4, 11, 5, 1, '#a0aaa0');
    p(16, 11, 5, 1, '#a0aaa0'); p(3, 19, 18, 1, '#a0aaa0');
    p(10, 3, 1, 5, palette.stoneDark); p(11, 11, 2, 5, palette.stoneDark);
  });
  make(scene, 'blue-1', 24, 24, p => {
    p(8, 2, 8, 3, palette.ink); p(7, 5, 10, 5, palette.blueLight);
    p(9, 6, 6, 5, palette.skin); p(10, 8, 1, 1, palette.ink); p(14, 8, 1, 1, palette.ink);
    p(6, 11, 12, 8, palette.blue); p(9, 12, 6, 3, palette.blueLight);
    p(4, 12, 3, 8, palette.stone); p(4, 13, 3, 4, palette.white);
    p(18, 11, 2, 10, palette.ink); p(18, 10, 2, 3, palette.gold);
    p(7, 19, 4, 4, palette.ink); p(14, 19, 4, 4, palette.ink);
    p(9, 14, 6, 2, palette.gold);
  });
  make(scene, 'blue-2', 24, 24, p => {
    p(8, 1, 8, 4, '#66549a'); p(5, 5, 14, 3, '#8b75b4');
    p(9, 7, 6, 5, palette.skin); p(10, 9, 1, 1, palette.ink); p(14, 9, 1, 1, palette.ink);
    p(7, 12, 10, 9, '#66549a'); p(5, 15, 3, 6, '#8b75b4');
    p(16, 15, 3, 6, '#8b75b4'); p(8, 21, 9, 2, palette.ink);
    p(19, 5, 2, 17, palette.soilDark); p(18, 3, 4, 4, palette.gold);
    p(10, 14, 4, 3, palette.blueLight);
  });
  make(scene, 'red-1', 24, 24, p => {
    p(7, 3, 10, 5, palette.ink); p(5, 1, 3, 6, palette.gold); p(16, 1, 3, 6, palette.gold);
    p(9, 7, 6, 5, palette.skin); p(10, 9, 1, 1, palette.ink); p(14, 9, 1, 1, palette.ink);
    p(6, 12, 12, 8, palette.red); p(8, 13, 8, 3, palette.redLight);
    p(3, 13, 4, 8, palette.ink); p(17, 12, 4, 9, palette.stone);
    p(8, 20, 4, 3, palette.ink); p(14, 20, 4, 3, palette.ink);
    p(11, 16, 3, 2, palette.gold);
  });
  make(scene, 'red-2', 24, 24, p => {
    p(8, 2, 8, 5, palette.red); p(6, 6, 12, 4, palette.redLight);
    p(9, 8, 6, 4, palette.skin); p(10, 10, 1, 1, palette.ink); p(14, 10, 1, 1, palette.ink);
    p(7, 12, 11, 10, palette.red); p(8, 14, 8, 4, '#d17c66');
    p(4, 15, 3, 7, palette.ink); p(18, 15, 3, 7, palette.ink);
    p(7, 22, 11, 1, palette.ink); p(19, 3, 2, 17, palette.soilDark);
    p(17, 1, 6, 4, palette.white); p(19, 3, 2, 1, palette.ink);
  });
}
