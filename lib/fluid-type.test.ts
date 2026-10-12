import { describe, expect, it } from 'vitest';
import { fluidClamp, sizeAt, toCss, typeScale } from './fluid-type';

describe('fluid type scale', () => {
  const input = {
    minViewport: 320,
    maxViewport: 1440,
    minBase: 16,
    maxBase: 20,
    minRatio: 1.2,
    maxRatio: 1.25,
    stepsDown: 2,
    stepsUp: 5,
  };

  it('writes the clamp() of a size that grows in a straight line', () => {
    // 16 → 20 px over 320 → 1440: slope 4/1120 = 0.3571vw, 14.857 px at 0 = 0.9286rem.
    expect(fluidClamp(16, 20, 320, 1440)).toBe('clamp(1rem, 0.9286rem + 0.3571vw, 1.25rem)');
    expect(fluidClamp(18, 18, 320, 1440)).toBe('clamp(1.125rem, 1.125rem, 1.125rem)');
    // No room between the viewports: no slope to compute (the tool says so before it gets here).
    expect(() => fluidClamp(16, 20, 900, 900)).toThrow(RangeError);
    expect(() => fluidClamp(16, 20, 1000, 900)).toThrow(RangeError);
  });

  it('keeps min ≤ max when a step shrinks as the screen grows', () => {
    const value = fluidClamp(14, 12, 320, 1440);
    expect(value.startsWith('clamp(0.75rem, ')).toBe(true);
    expect(value.endsWith(', 0.875rem)')).toBe(true);
  });

  it('builds every step and the size the browser computes', () => {
    const steps = typeScale(input);
    expect(steps.map((s) => s.step)).toEqual([-2, -1, 0, 1, 2, 3, 4, 5]);
    const base = steps.find((s) => s.step === 0)!;
    expect(sizeAt(base, input, 320)).toBeCloseTo(16, 5);
    expect(sizeAt(base, input, 880)).toBeCloseTo(18, 5);
    expect(sizeAt(base, input, 4000)).toBeCloseTo(20, 5);
    const five = steps.find((s) => s.step === 5)!;
    expect(five.min).toBeCloseTo(39.81, 2);
    expect(five.max).toBeCloseTo(61.04, 2);
    expect(toCss(steps)).toContain('  --step--2: clamp(');
  });
});
