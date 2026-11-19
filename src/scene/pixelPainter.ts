type Vertex = readonly [number, number];

export function pixelPainter(ctx: CanvasRenderingContext2D) {
  const pixel = (x: number, y: number, width: number, height: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  };
  const shape = (color: string, ...vertices: Vertex[]): void => {
    for (let y = 0; y < ctx.canvas.height; y++) {
      const row = y + .5;
      const ends = vertices.flatMap(([x1, y1], index) => {
        const [x2, y2] = vertices[(index + 1) % vertices.length];
        if ((y1 > row) === (y2 > row)) return [];
        return [Math.ceil(x1 + (x2 - x1) * (row - y1) / (y2 - y1) - .5)];
      }).sort((a, b) => a - b);
      for (let x = 0; x < ends.length; x += 2) pixel(ends[x], y, ends[x + 1] - ends[x], 1, color);
    }
  };
  return { pixel, shape };
}
