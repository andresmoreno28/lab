/**
 * What every lab piece shares: a tiny element builder (no HTML strings, so Trusted Types never
 * sees one), the strings the page hands over (strings/<locale>.json, one object per piece) and
 * number formatting in the page's language.
 */

export type Strings = Readonly<Record<string, string>>;

export interface PieceContext {
  root: HTMLElement;
  strings: Strings;
  /** prefers-reduced-motion: show the end state, no travel. */
  reduced: boolean;
  /** The piece's core only (the site's home window); its own page shows the rest. */
  compact: boolean;
  /** Aborted when the piece is unmounted: listeners and loops stop with it. */
  signal: AbortSignal;
}

export type Mount = (context: PieceContext) => void;

type Child = Node | string | null | undefined | false;
type Attributes = Record<string, string | number | boolean | null | undefined>;

/**
 * `h('button', { type: 'button', class: 'x', 'aria-pressed': false }, label)`. `true` writes an
 * empty attribute, `false`, null and undefined leave it out; strings become text nodes.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value === null || value === undefined) continue;
    element.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child);
  }
  return element;
}

const SVG = 'http://www.w3.org/2000/svg';

export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: (SVGElement | null | false)[]
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value === null || value === undefined) continue;
    element.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) if (child) element.append(child);
  return element;
}

const adopted = new Set<string>();

/**
 * Adds a piece's CSS (imported `?inline`) to the document once, as a constructed stylesheet: it
 * arrives with the piece's chunk instead of in every page, after shared/base.css has fixed the
 * order of the cascade layers, and CSP (style-src 'self' + hashes) does not apply to it.
 */
export function adopt(css: string): void {
  if (adopted.has(css) || !('adoptedStyleSheets' in Document.prototype)) return;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  adopted.add(css);
}

/** `{name}` placeholders of a UI template, filled. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** The page's language, for Intl. */
export const pageLocale = () => document.documentElement.lang || 'es';

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat(pageLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** A unique id prefix per mounted piece, for label/for and aria-* pairs. */
let next = 0;
export const uid = (name: string) => `lab-${name}-${(next += 1)}`;

/**
 * Copies text and says so in `status` for a moment; falls back to selecting the text when the
 * Clipboard API is not there (http, old engines).
 */
export async function copy(text: string, source: HTMLElement, status: HTMLElement, done: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(source);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return;
  }
  status.textContent = done;
  window.setTimeout(() => {
    if (status.textContent === done) status.textContent = '';
  }, 2000);
}

/**
 * Runs `frame` on every animation frame while the element is on screen and the tab visible;
 * returns a function that wakes it after it stopped (for loops that sleep when idle).
 */
export function loopWhileVisible(
  element: Element,
  signal: AbortSignal,
  frame: (time: number) => boolean | void,
): () => void {
  let visible = true;
  let id = 0;
  const tick = (time: number) => {
    id = 0;
    if (signal.aborted || !visible || document.hidden) return;
    if (frame(time) === false) return;
    id = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!id && visible && !document.hidden && !signal.aborted) id = requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      wake();
    });
    observer.observe(element);
    signal.addEventListener('abort', () => observer.disconnect());
  }
  document.addEventListener('visibilitychange', wake, { signal });
  signal.addEventListener('abort', () => cancelAnimationFrame(id));
  wake();
  return wake;
}
