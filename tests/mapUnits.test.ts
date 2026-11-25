import { expect, it } from 'vitest';
import { TILE } from '../src/scene/board';
import { drawMapUnit, mapFacings, mapPoses, mapUnitIds } from '../src/scene/mapUnits';

it('keeps every character and pose in its own tile of the sprite atlas', () => {
  const portraits = new Set<string>();
  for (const id of mapUnitIds) {
    const orientations = new Set<string>();
    for (const facing of mapFacings) {
      const poses = new Set<string>();
      for (const pose of mapPoses) {
        const pixels = new Map<number, string>();
        const context = {
          fillStyle: '',
          fillRect(x: number, y: number, width: number, height: number) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(x + width).toBeLessThanOrEqual(TILE);
            expect(y + height).toBeLessThanOrEqual(TILE);
            expect(this.fillStyle).toMatch(/^#[0-9a-f]{6}$/);
            for (let row = y; row < y + height; row++) pixels.set(row * TILE + x, this.fillStyle);
          },
        };
        drawMapUnit(context as CanvasRenderingContext2D, id, facing, pose);
        expect(pixels.size).toBeGreaterThan(80);
        const image = JSON.stringify([...pixels].sort(([a], [b]) => a - b));
        poses.add(image);
        if (pose === 'idle') orientations.add(image);
        if (pose === 'idle' && facing === 'south') portraits.add(image);
      }
      expect(poses.size).toBe(mapPoses.length);
    }
    expect(orientations.size).toBe(mapFacings.length);
  }
  expect(portraits.size).toBe(mapUnitIds.length);
});
