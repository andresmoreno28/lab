import { describe, expect, it } from 'vitest';
import { SpatialHash } from './spatial-hash';

describe('spatial hash', () => {
  it('finds every point within the radius, the same as checking them all', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const points = Array.from({ length: 400 }, () => ({ x: random() * 900, y: random() * 500 }));
    const radius = 60;
    const grid = new SpatialHash(radius);
    points.forEach((p, i) => grid.insert(i, p.x, p.y));
    for (const [i, p] of points.entries()) {
      const fast = new Set<number>();
      grid.near(p.x, p.y, (j) => {
        if (j !== i && Math.hypot(points[j]!.x - p.x, points[j]!.y - p.y) <= radius) fast.add(j);
      });
      const slow = points
        .map((q, j) => (j !== i && Math.hypot(q.x - p.x, q.y - p.y) <= radius ? j : -1))
        .filter((j) => j >= 0);
      expect([...fast].sort((a, b) => a - b)).toEqual(slow);
    }
  });
});
