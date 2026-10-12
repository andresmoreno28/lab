/**
 * Fluid type scale (lab): each step grows from its size at the smallest viewport to its size at
 * the largest, in a straight line, and `clamp()` holds it outside that range. The same idea as
 * this site's own type tokens. No dependencies: copy the file.
 */

export interface ScaleInput {
  /** Viewport widths, in px, where the scale starts and stops growing. */
  minViewport: number;
  maxViewport: number;
  /** Size of step 0, in px, at each end. */
  minBase: number;
  maxBase: number;
  /** Ratio between consecutive steps at each end (1.2 minor third, 1.25 major third…). */
  minRatio: number;
  maxRatio: number;
  /** Steps below and above 0 (e.g. 2 and 5 give −2…5). */
  stepsDown: number;
  stepsUp: number;
}

export interface ScaleStep {
  step: number;
  /** Size in px at the smallest and the largest viewport. */
  min: number;
  max: number;
  /** The CSS value, in rem (16 px) and vw. */
  clamp: string;
}

const round = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
};
const rem = (px: number) => `${round(px / 16)}rem`;

/** `clamp()` for a size that goes from `min` px at `minViewport` to `max` px at `maxViewport`. */
export function fluidClamp(min: number, max: number, minViewport: number, maxViewport: number) {
  if (!(maxViewport > minViewport)) {
    throw new RangeError('the widest viewport must be wider than the narrowest');
  }
  const slope = (max - min) / (maxViewport - minViewport);
  const intercept = min - slope * minViewport;
  const [low, high] = min <= max ? [min, max] : [max, min];
  const vw = round(slope * 100);
  const preferred = vw === 0 ? rem(intercept) : `${rem(intercept)} + ${vw}vw`;
  return `clamp(${rem(low)}, ${preferred}, ${rem(high)})`;
}

export function typeScale(input: ScaleInput): ScaleStep[] {
  const steps: ScaleStep[] = [];
  for (let step = -input.stepsDown; step <= input.stepsUp; step += 1) {
    const min = input.minBase * input.minRatio ** step;
    const max = input.maxBase * input.maxRatio ** step;
    steps.push({
      step,
      min: round(min, 2),
      max: round(max, 2),
      clamp: fluidClamp(min, max, input.minViewport, input.maxViewport),
    });
  }
  return steps;
}

/** The size of a step at a given viewport width, in px: what the browser computes. */
export function sizeAt(step: ScaleStep, input: ScaleInput, viewport: number): number {
  const t = (viewport - input.minViewport) / (input.maxViewport - input.minViewport);
  const clamped = Math.min(1, Math.max(0, t));
  const minPx = input.minBase * input.minRatio ** step.step;
  const maxPx = input.maxBase * input.maxRatio ** step.step;
  return minPx + (maxPx - minPx) * clamped;
}

/** The scale as CSS custom properties, `--step-n` (negative steps `--step--n`). */
export function toCss(steps: readonly ScaleStep[], selector = ':root'): string {
  const lines = steps.map((s) => `  --step-${s.step}: ${s.clamp};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}
