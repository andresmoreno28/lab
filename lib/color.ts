/**
 * Colour maths of the contrast checker (lab): WCAG 2.2 contrast ratio, APCA lightness contrast
 * (Lc, APCA-W3 0.0.98G-4g) and the nearest colour that passes a ratio, searched in OKLCH so the
 * hue stays. sRGB only, no dependencies: copy the file.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** `#rgb` or `#rrggbb` (the `#` optional, any case); null when it is neither. */
export function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio, 1 to 21, whichever colour is lighter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** What a ratio passes (WCAG 2.2: 1.4.3, 1.4.6 and 1.4.11). */
export function wcagLevels(ratio: number) {
  return {
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
    ui: ratio >= 3,
  };
}

/**
 * APCA Lc of `text` on `background`: about 106 for black on white, about −108 for white on black
 * (negative is light text on dark). 75 is the usual floor for body text, 60 for larger text, 45
 * for headlines and 30 for non-text.
 */
export function apca(text: Rgb, background: Rgb): number {
  const y = ({ r, g, b }: Rgb) => {
    const raw =
      0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;
    return raw > 0.022 ? raw : raw + (0.022 - raw) ** 1.414;
  };
  const yt = y(text);
  const yb = y(background);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) {
    const sapc = (yb ** 0.56 - yt ** 0.57) * 1.14;
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
  }
  const sapc = (yb ** 0.65 - yt ** 0.62) * 1.14;
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

/* OKLab and OKLCH (Björn Ottosson), on linear sRGB. */

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export function toOklch(rgb: Rgb): Oklch {
  const r = linear(rgb.r);
  const g = linear(rgb.g);
  const b = linear(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}

/** Linear sRGB channels of an OKLCH colour, which may fall outside 0–1 (out of gamut). */
function oklchToLinear({ l: L, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (channels: number[]) => channels.every((v) => v >= -1e-6 && v <= 1 + 1e-6);
const encode = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
};

/** OKLCH to sRGB, lowering the chroma (never the lightness or the hue) until it fits. */
export function fromOklch(color: Oklch): Rgb {
  let channels = oklchToLinear(color);
  if (!inGamut(channels)) {
    let lo = 0;
    let hi = color.c;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...color, c: mid }))) lo = mid;
      else hi = mid;
    }
    channels = oklchToLinear({ ...color, c: lo });
  }
  const [r, g, b] = channels.map((v) => Math.round(encode(v))) as [number, number, number];
  return { r, g, b };
}

/**
 * The colour closest in lightness to `foreground`, same hue, that reaches `target` on
 * `background`: it tries darker and lighter and keeps the smaller change. Null when neither
 * direction gets there (e.g. 7:1 on a mid grey).
 */
export function nearestPassing(foreground: Rgb, background: Rgb, target: number): Rgb | null {
  if (contrastRatio(foreground, background) >= target) return foreground;
  const start = toOklch(foreground);
  const search = (end: number) => {
    const at = (l: number) => fromOklch({ ...start, l });
    if (contrastRatio(at(end), background) < target) return null;
    let lo = start.l;
    let hi = end;
    for (let i = 0; i < 30; i += 1) {
      const mid = (lo + hi) / 2;
      if (contrastRatio(at(mid), background) >= target) hi = mid;
      else lo = mid;
    }
    return { l: hi, rgb: at(hi) };
  };
  const options = [search(0), search(1)].filter((o) => o !== null);
  options.sort((a, b) => Math.abs(a.l - start.l) - Math.abs(b.l - start.l));
  return options[0]?.rgb ?? null;
}
