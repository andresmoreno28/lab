import { describe, expect, it } from 'vitest';
import { cellDate, DAYS, generate, levels, seeded, waveDelay, WEEKS } from './heatmap-data';

describe('SVG heatmap data', () => {
  it('draws the same year for the same pattern and seed', () => {
    expect(generate('streaks', 7)).toEqual(generate('streaks', 7));
    expect(generate('streaks', 7)).not.toEqual(generate('streaks', 8));
    expect(generate('random')).toHaveLength(WEEKS * DAYS);
    const a = seeded(1);
    const values = Array.from({ length: 1000 }, a);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it('is busier on weekdays with the weekdays pattern', () => {
    const counts = generate('weekdays');
    const sum = (days: number[]) =>
      counts.filter((_, i) => days.includes(i % DAYS)).reduce((a, b) => a + b, 0);
    expect(sum([0, 1, 2, 3, 4]) / 5).toBeGreaterThan((sum([5, 6]) / 2) * 3);
  });

  it('gives level 0 to empty days and 1–4 by quartiles to the rest', () => {
    // Active days 1–8: quartiles at 3, 5 and 7.
    expect(levels([0, 1, 2, 3, 4, 5, 6, 7, 8])).toEqual([0, 1, 1, 1, 2, 2, 3, 3, 4]);
    expect(levels([0, 0])).toEqual([0, 0]);
  });

  it('delays each cell by its distance from where the wave starts', () => {
    expect(waveDelay(10, 3, 10, 3)).toBe(0);
    expect(waveDelay(12, 3, 10, 3)).toBe(44);
    expect(waveDelay(0, 0, 3, 4)).toBeGreaterThan(waveDelay(2, 3, 3, 4));
  });

  it('dates the cells back from today, the last column being this week', () => {
    const wednesday = new Date(2026, 9, 14);
    const last = WEEKS * DAYS - 1;
    // Sunday of this week is in the future; Wednesday (index 2 of the column) is today.
    expect(cellDate(last - 4, wednesday).toDateString()).toBe(wednesday.toDateString());
    expect(cellDate(last, wednesday) > wednesday).toBe(true);
    expect(cellDate(last - 4 - DAYS, wednesday).getDate()).toBe(7);
  });
});
