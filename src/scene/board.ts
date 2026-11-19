import type { Point } from '../game/rules';

export const TILE = 20;
export const MARGIN = 8;
export const WIDTH = 8 * TILE + 2 * MARGIN;
export const HEIGHT = 6 * TILE + 2 * MARGIN;

export const center = ({ x, y }: Point): Point => ({
  x: MARGIN + (x + .5) * TILE,
  y: MARGIN + (y + .5) * TILE,
});
