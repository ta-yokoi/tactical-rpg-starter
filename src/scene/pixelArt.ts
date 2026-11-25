import type Phaser from 'phaser';
import { TILE } from './board';
import { drawMapUnit, mapFacings, mapPoses, mapUnitIds, mapWalkCycle } from './mapUnits';

type Pixel = (x: number, y: number, w: number, h: number, color: string) => void;

const grass = '#66874b';
const grassShade = '#506c3d';
const grassLight = '#85a459';
const clay = '#bfa273';
const clayShade = '#9b805c';

export function createPixelArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('battle-art')) return;
  const texture = scene.textures.createCanvas('battle-art', TILE * (16 + mapUnitIds.length * mapFacings.length * mapPoses.length), TILE)!;
  const context = texture.getContext();
  let offset = 0;
  const frame = (name: string, draw: (pixel: Pixel) => void): void => {
    texture.add(name, 0, offset, 0, TILE, TILE);
    draw((x, y, width, height, color) => {
      context.fillStyle = color;
      context.fillRect(offset + x, y, width, height);
    });
    offset += TILE;
  };
  for (let variant = 0; variant < 4; variant++) {
    frame(`grass-${variant}`, p => {
      p(0, 0, TILE, TILE, grass);
      p(0, 0, 20, 7, ['#6d8e4f', '#688a4b', '#64864c', '#71904d'][variant]);
      p(4 + variant, 5, 7, 2, '#739451'); p(2 + variant, 7, 11, 1, '#739451');
      p(1, 12 + variant, 8, 3, '#627e48'); p(11, 16 - variant, 9, 2, '#739451');
      p(2 + variant * 3, 3, 3, 1, grassLight);
      p(3 + variant * 3, 2, 1, 1, grassLight);
      p(15 - variant, 12, 3, 1, grassShade);
      p(16 - variant, 11, 1, 1, grassLight);
      p(1, 17 - variant, 3, 1, grassShade);
      for (let tuft = 0; tuft < 12; tuft++) {
        const x = (tuft * 13 + variant * 7) % 18 + 1;
        const y = (tuft * 11 + variant * 3) % 18 + 1;
        p(x, y, 1 + (tuft % 2), 1, tuft % 3 === 0 ? '#88a35d' : tuft % 3 === 1 ? '#769855' : '#5a7745');
        if (tuft % 4 === 1) p(x, y - 1, 1, 1, '#86a15c');
      }
      p(12, 4 + variant, 1, 1, grassShade);
      p(17, 16, 1, 2, grassLight); p(7, 12, 2, 1, grassShade);
      if (variant === 3) {
        p(5, 9, 1, 1, '#d6bc79'); p(6, 10, 1, 2, grassShade);
        p(4, 17, 1, 1, '#bdac71'); p(9, 16, 1, 1, '#ccb77e');
      }
    });
  }
  for (const kind of ['horizontal', 'vertical', 'north', 'south'] as const) {
    frame(kind, p => {
      p(0, 0, TILE, TILE, grass);
      if (kind !== 'vertical') {
        p(0, 3, 20, 14, grassLight);
        p(0, 5, 20, 10, clay);
        p(0, 14, 20, 1, clayShade);
        p(0, 5, 8, 1, '#ceb381'); p(13, 5, 7, 1, '#ceb381');
        p(0, 15, 4, 1, clayShade); p(12, 15, 5, 1, clayShade);
        p(4, 10, 2, 1, '#d3b987'); p(16, 8, 2, 1, '#94835d');
        p(6, 14, 1, 1, grassLight); p(18, 5, 1, 1, grassLight);
      }
      if (kind !== 'horizontal') {
        const top = kind === 'north' ? 8 : 0;
        const height = kind === 'south' ? 11 : 20 - top;
        p(5, top, 10, height, clay);
        p(14, top, 1, height, clayShade);
      }
      p(7, 8, 3, 1, '#b7a778'); p(12, 11, 2, 1, clayShade);
      p(3, 12, 2, 1, kind === 'vertical' ? grassLight : clayShade);
    });
  }
  frame('wall', p => {
    p(0, 0, 20, 20, grass);
    p(1, 10, 19, 8, grassShade);
    p(2, 5, 16, 11, '#34494c');
    p(2, 3, 16, 8, '#73857e');
    p(3, 2, 14, 3, '#aeb49a');
    p(3, 3, 6, 1, '#c0bea0'); p(11, 3, 4, 1, '#c0bea0');
    p(9, 3, 1, 5, '#415b5a'); p(3, 7, 14, 1, '#415b5a');
    p(6, 8, 1, 5, '#415b5a'); p(13, 8, 1, 6, '#415b5a');
    p(3, 11, 4, 2, '#70836f'); p(15, 5, 3, 2, grassLight);
    p(4, 5, 4, 1, '#8a9985'); p(12, 9, 3, 1, '#8a9985');
    p(5, 14, 11, 1, '#455958'); p(3, 14, 2, 2, '#455958');
    p(1, 14, 3, 1, grassLight); p(7, 16, 5, 1, '#526b55');
    p(16, 15, 3, 2, '#70836f');
  });
  frame('shrub', p => {
    p(0, 0, 20, 20, grass);
    p(2, 14, 16, 4, '#465f40'); p(5, 12, 10, 3, '#465f40');
    p(3, 11, 7, 5, '#4c693d'); p(12, 10, 6, 5, '#4c693d');
    p(6, 7, 9, 9, '#527440'); p(8, 5, 5, 4, '#527440');
    p(3, 10, 5, 3, '#6e8a49'); p(6, 7, 7, 5, '#71944d'); p(12, 9, 5, 4, '#71944d');
    p(8, 6, 4, 1, '#9cac66'); p(7, 8, 3, 2, '#91a45b');
    p(4, 10, 2, 1, '#91a45b'); p(14, 9, 2, 2, '#91a45b');
    p(11, 13, 5, 2, '#58763e'); p(5, 13, 3, 1, '#638049');
    p(9, 16, 2, 2, '#716749'); p(6, 16, 2, 1, '#765f45'); p(14, 16, 2, 1, '#765f45');
  });
  const water: (p: Pixel) => void = p => {
    p(0, 0, 20, 20, '#4d85a0');
    p(2, 4, 9, 1, '#65a3b6'); p(11, 13, 7, 1, '#65a3b6');
    p(4, 16, 5, 1, '#3d6e94'); p(13, 6, 6, 1, '#3d6e94');
    p(0, 8, 8, 2, '#548da6'); p(12, 15, 8, 1, '#548da6');
    p(3, 4, 3, 1, '#699da0'); p(14, 13, 3, 1, '#699da0');
    p(1, 18, 4, 1, '#5a94a9'); p(13, 2, 3, 1, '#5a94a9');
  };
  frame('water', water);
  for (const east of [false, true]) {
    frame(east ? 'water-east' : 'water-west', p => {
      water(p);
      for (let y = 0; y < 20; y++) {
        const curve = [3, 3, 3, 2, 2, 2, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 3, 3, 3, 3][y];
        const x = (from: number, span: number): number => east ? 20 - from - span : from;
        p(x(0, curve), y, curve, 1, grass);
        p(x(curve, 1), y, 1, 1, y % 4 === 0 ? '#9c9b62' : '#988858');
        p(x(curve + 1, 2), y, 2, 1, y % 3 === 0 ? '#87bac1' : '#6294a7');
      }
    });
  }
  frame('bridge', p => {
    water(p);
    p(0, 4, 20, 12, '#5e4840'); p(0, 5, 20, 9, '#bd905b');
    for (let x = 0; x < 20; x += 4) {
      p(x, 5, 1, 9, '#825d49'); p(x + 1, 6, 2, 1, '#c5a16b');
    }
    p(0, 4, 20, 1, '#e0b47d'); p(0, 14, 20, 1, '#e0b47d');
  });
  frame('beacon', p => {
    p(0, 0, 20, 20, grass);
    p(0, 5, 19, 10, clay);
    p(4, 4, 12, 11, '#ebcf79'); p(5, 5, 10, 9, '#5c614f');
    p(7, 9, 6, 3, '#453f41'); p(8, 7, 4, 3, '#ec9d61');
    p(9, 6, 2, 4, '#f9e696');
  });
  frame('watchtower', p => {
    p(0, 0, 20, 20, grass);
    p(0, 5, 20, 10, clay);
    p(2, 15, 16, 4, '#4c524b'); p(3, 13, 14, 4, '#7f8576');
    p(4, 11, 12, 4, '#abb098'); p(5, 3, 10, 9, '#555e5b');
    p(6, 4, 8, 7, '#9a9e89'); p(6, 4, 8, 1, '#dbcb9b');
    p(8, 6, 5, 4, '#414a4d'); p(9, 6, 3, 3, '#f3ae60');
    p(10, 5, 1, 3, '#fff0a3'); p(6, 15, 3, 1, '#b8b59b');
    p(12, 15, 3, 1, '#b8b59b'); p(7, 17, 6, 1, '#858979');
  });
  for (const id of mapUnitIds) {
    for (const facing of mapFacings) {
      for (const pose of mapPoses) {
        frame(`${id}-${facing}-${pose}`, () => {
          context.save();
          context.translate(offset, 0);
          drawMapUnit(context, id, facing, pose);
          context.restore();
        });
      }
      scene.anims.create({
        key: `${id}-${facing}-walk`,
        frames: mapWalkCycle.map(pose => ({ key: 'battle-art', frame: `${id}-${facing}-${pose}` })),
        frameRate: 17,
        repeat: -1,
      });
    }
  }
  texture.refresh();
}
