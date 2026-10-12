/**
 * Data and wave of the SVG heatmap (lab experiment): a year of days in weeks (columns) and
 * weekdays (rows), filled from a pattern with a seeded random, so the same pattern always draws
 * the same year; levels 0–4 by quartiles of the active days; and the delay of each cell when a
 * wave starts somewhere. No dependencies: copy the file.
 */
export type Pattern = 'random' | 'weekdays' | 'streaks';

export const WEEKS = 53;
export const DAYS = 7;

/** mulberry32: small, fast, good enough for drawings. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Counts per day, week by week (index = week * 7 + weekday, Monday = 0). */
export function generate(pattern: Pattern, seed = 2026): number[] {
  const random = seeded(seed);
  const counts: number[] = [];
  let streak = 0;
  for (let week = 0; week < WEEKS; week += 1) {
    // A slow seasonal swell: busier in spring and autumn, quieter in August and at Christmas.
    const season = 0.65 + 0.35 * Math.sin(((week - 6) / WEEKS) * Math.PI * 2) ** 2;
    for (let day = 0; day < DAYS; day += 1) {
      let count: number;
      if (pattern === 'random') {
        count = random() < 0.62 ? Math.floor(random() * 9 * season) : 0;
      } else if (pattern === 'weekdays') {
        const work = day < 5;
        count =
          random() < (work ? 0.85 : 0.18)
            ? Math.floor((work ? 3 + random() * 8 : random() * 3) * season)
            : 0;
      } else {
        if (streak === 0 && random() < 0.12) streak = 3 + Math.floor(random() * 12);
        if (streak > 0) {
          streak -= 1;
          count = 2 + Math.floor(random() * 9 * season);
        } else {
          count = random() < 0.15 ? 1 : 0;
        }
      }
      counts.push(count);
    }
  }
  return counts;
}

/** Level 0 for no activity, 1–4 by the quartiles of the active days. */
export function levels(counts: readonly number[]): number[] {
  const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (!active.length) return counts.map(() => 0);
  const q = (p: number) => active[Math.min(active.length - 1, Math.floor(p * active.length))]!;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return counts.map((c) => (c === 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4));
}

/**
 * Delay of a cell, in ms, for a wave that starts at (week, day): its distance in cells, with
 * rows counted a little closer so the wave looks round on cells that are wider than the gaps.
 */
export function waveDelay(
  week: number,
  day: number,
  originWeek: number,
  originDay: number,
  msPerCell = 22,
): number {
  return Math.round(Math.hypot(week - originWeek, (day - originDay) * 0.9) * msPerCell);
}

/** The date of a cell, counting back from `end` (the last cell is `end`'s week, its weekday). */
export function cellDate(index: number, end: Date): Date {
  const lastIndex = WEEKS * DAYS - 1;
  const endWeekday = (end.getDay() + 6) % 7;
  const offset = lastIndex - index - (DAYS - 1 - endWeekday);
  const date = new Date(end);
  date.setDate(end.getDate() - offset);
  return date;
}
