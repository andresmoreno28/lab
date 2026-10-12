import { describe, expect, it } from 'vitest';
import {
  apca,
  contrastRatio,
  fromOklch,
  nearestPassing,
  parseHex,
  toHex,
  toOklch,
  wcagLevels,
} from './color';

const hex = (value: string) => parseHex(value)!;

describe('contrast checker maths', () => {
  it('reads #rgb and #rrggbb, with or without #, and rejects the rest', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('D6A35F')).toEqual({ r: 214, g: 163, b: 95 });
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('red')).toBeNull();
    expect(toHex(hex('#0d1313'))).toBe('#0d1313');
  });

  it('gives the WCAG ratios of the spec', () => {
    expect(contrastRatio(hex('#000'), hex('#fff'))).toBeCloseTo(21, 5);
    expect(contrastRatio(hex('#fff'), hex('#fff'))).toBeCloseTo(1, 5);
    // #767676 on white is the classic 4.54:1, the lightest grey that passes AA.
    expect(contrastRatio(hex('#767676'), hex('#fff'))).toBeCloseTo(4.54, 2);
    expect(wcagLevels(4.54)).toEqual({
      normalAA: true,
      normalAAA: false,
      largeAA: true,
      largeAAA: true,
      ui: true,
    });
    expect(wcagLevels(2.9).ui).toBe(false);
  });

  it('gives the APCA Lc of the reference pairs, with its sign for polarity', () => {
    expect(apca(hex('#000'), hex('#fff'))).toBeCloseTo(106.04, 1);
    expect(apca(hex('#fff'), hex('#000'))).toBeCloseTo(-107.88, 1);
    expect(apca(hex('#888'), hex('#fff'))).toBeCloseTo(63.06, 0);
    expect(apca(hex('#777'), hex('#777'))).toBe(0);
  });

  it('goes to OKLCH and back without moving a colour of the gamut', () => {
    for (const value of ['#d6a35f', '#0d1313', '#6a9cb5', '#fbf6e9', '#c0392b']) {
      expect(toHex(fromOklch(toOklch(hex(value))))).toBe(value);
    }
  });

  it('finds the nearest colour that passes, keeping the hue', () => {
    const gold = hex('#d6a35f');
    const cream = hex('#fbf6e9');
    const fixed = nearestPassing(gold, cream, 4.5)!;
    expect(contrastRatio(fixed, cream)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fixed, cream)).toBeLessThan(4.7);
    expect(Math.abs(toOklch(fixed).h - toOklch(gold).h)).toBeLessThan(3);
    // Already passing: unchanged.
    expect(nearestPassing(hex('#000'), cream, 4.5)).toEqual(hex('#000'));
    // On a mid grey nothing reaches 7:1 in the same hue… but black or white might: only null
    // when neither end passes.
    expect(nearestPassing(hex('#777'), hex('#777'), 21)).toBeNull();
  });
});
