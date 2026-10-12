// @vitest-environment happy-dom
/**
 * The pieces in a DOM: each one mounts through shared/boot.ts with its English strings, names
 * every control, points its ARIA at elements that exist, and stops when its signal is aborted.
 * Then what matters most in each one: the keyboard, the announcements, the validation. (On the
 * site the same pieces also run in Playwright with axe at 390 and 1440 px.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPiece, PIECE_NAMES, type MountOptions, type Piece } from '../shared/boot';
import tokens from '../shared/tokens.css?raw';
import en from '../strings/en.json';

const STRINGS = en as Record<Piece, Record<string, string>>;

/* The site's colours, on each stage, for the pieces that read them (getComputedStyle). */
const COLOURS = [...tokens.matchAll(/(--color-[\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)];

const controllers: AbortController[] = [];

async function mount(piece: Piece, options: MountOptions = {}) {
  const root = document.createElement('div');
  root.className = 'lab-stage';
  for (const [, name, value] of COLOURS) root.style.setProperty(name!, value!);
  document.body.append(root);
  const controller = await mountPiece(root, piece, {
    strings: STRINGS[piece],
    reduced: true,
    ...options,
  });
  controllers.push(controller);
  return { root, controller };
}

/** A 2D context that draws nothing: enough for the particle network to run its loop. */
function blankContext(): CanvasRenderingContext2D {
  const state: Record<PropertyKey, unknown> = {};
  return new Proxy(state, {
    get: (target, key) => (key in target ? target[key] : () => undefined),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const key = (target: Element, name: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const toggle = (input: HTMLInputElement, checked: boolean) => {
  input.checked = checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};
/** The control a visible label names. */
const byLabel = <E extends HTMLElement>(root: HTMLElement, text: string): E => {
  const label = [...root.querySelectorAll('label')].find((l) => l.textContent?.trim() === text);
  return document.getElementById(label?.htmlFor ?? '') as E;
};

/** What a screen reader would miss: unnamed controls, duplicate ids, references to nothing. */
function problems(root: HTMLElement): string[] {
  const found: string[] = [];
  const text = (id: string) => document.getElementById(id)?.textContent?.trim();
  const named = (element: Element) => {
    if (element.getAttribute('aria-label')?.trim()) return true;
    const by = element.getAttribute('aria-labelledby');
    if (by) return by.split(/\s+/).every(text);
    const labels = element.id ? root.querySelectorAll(`label[for="${element.id}"]`) : [];
    if ([...labels].some((label) => label.textContent?.trim())) return true;
    return Boolean(element.closest('label')?.textContent?.trim());
  };
  const describe = (element: Element) => `<${element.tagName.toLowerCase()} class="${element.getAttribute('class') ?? ''}">`;
  for (const element of root.querySelectorAll('input, select, textarea')) {
    if (!named(element)) found.push(`unnamed ${describe(element)}`);
  }
  for (const element of root.querySelectorAll('button')) {
    if (!element.textContent?.trim() && !named(element)) found.push(`unnamed ${describe(element)}`);
  }
  for (const element of root.querySelectorAll('[role="img"], [role="group"], [role="region"], [role="tablist"]')) {
    if (!named(element)) found.push(`unnamed ${describe(element)}`);
  }
  const ids = [...root.querySelectorAll('[id]')].map((element) => element.id);
  for (const id of new Set(ids)) {
    if (ids.indexOf(id) !== ids.lastIndexOf(id)) found.push(`duplicate id ${id}`);
  }
  for (const attribute of ['aria-controls', 'aria-labelledby', 'aria-describedby', 'for']) {
    for (const element of root.querySelectorAll(`[${attribute}]`)) {
      for (const id of (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)) {
        if (!document.getElementById(id)) found.push(`${attribute}="${id}" points to nothing`);
      }
    }
  }
  return found;
}

beforeEach(() => {
  document.documentElement.lang = 'en';
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => blankContext() as unknown as ReturnType<HTMLCanvasElement['getContext']>,
  );
  if (!('Path2D' in globalThis)) {
    vi.stubGlobal(
      'Path2D',
      class {
        moveTo() {}
        lineTo() {}
      },
    );
  }
  if (!('ResizeObserver' in globalThis)) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  }
});

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.abort());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each(PIECE_NAMES)('%s', (piece) => {
  it('mounts in its stage, names every control and points its ARIA at real elements', async () => {
    const { root } = await mount(piece);
    expect(root.hasAttribute('data-mounted')).toBe(true);
    expect(root.children.length).toBeGreaterThan(0);
    expect(problems(root)).toEqual([]);
  });
});

describe('accessible-button', () => {
  it('says it is sending, then that it sent, and stays focusable when disabled', async () => {
    const { root, controller } = await mount('accessible-button');
    const button = root.querySelector<HTMLButtonElement>('.ab__button')!;
    const live = root.querySelector('[aria-live="polite"]')!;
    button.click();
    expect(button.hasAttribute('aria-busy')).toBe(true);
    expect(button.textContent).toBe('Sending…');
    await vi.waitFor(() => expect(live.textContent).toBe('Sent'), { timeout: 2000 });
    const again = root.querySelector<HTMLButtonElement>('.ab__again')!;
    expect(again.hidden).toBe(false);
    again.click();
    expect(button.dataset.state).toBe('idle');

    const disabled = byLabel<HTMLInputElement>(root, 'Disabled');
    toggle(disabled, true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false);
    const why = document.getElementById(button.getAttribute('aria-describedby') ?? '')!;
    expect(why.hidden).toBe(false);
    expect(why.textContent).toBe(STRINGS['accessible-button'].why);
    button.click();
    expect(button.dataset.state).toBe('idle');
    button.focus();
    expect(document.activeElement).toBe(button);

    // Unmounted: its listeners are gone with the signal.
    controller.abort();
    toggle(disabled, false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('accessible-tabs', () => {
  it('moves with the arrows, keeps one tab in the tab order and waits in manual mode', async () => {
    const { root } = await mount('accessible-tabs');
    const tabs = [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
    const selected = () => tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    tabs[0]!.focus();
    key(tabs[0]!, 'ArrowRight');
    expect(selected()).toBe(1);
    expect(document.activeElement).toBe(tabs[1]);
    key(tabs[1]!, 'End');
    expect(selected()).toBe(2);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0]);
    const shown = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')].filter(
      (panel) => !panel.hidden,
    );
    expect(shown).toHaveLength(1);
    expect(shown[0]!.getAttribute('aria-labelledby')).toBe(tabs[2]!.id);

    toggle(byLabel<HTMLInputElement>(root, 'On Enter or Space'), true);
    key(tabs[2]!, 'Home');
    expect(document.activeElement).toBe(tabs[0]);
    expect(selected()).toBe(2);
    key(tabs[0]!, 'Enter');
    expect(selected()).toBe(0);
  });
});

describe('depth-card', () => {
  it('tilts with the arrows, straightens on Home and pulls its layers apart', async () => {
    const { root } = await mount('depth-card');
    const card = root.querySelector<HTMLElement>('[role="group"]')!;
    expect(card.tabIndex).toBe(0);
    key(card, 'ArrowUp');
    await vi.waitFor(() => expect(card.style.getPropertyValue('--rx')).toBe('4deg'));
    key(card, 'Home');
    await vi.waitFor(() => expect(card.style.getPropertyValue('--rx')).toBe('0deg'));
    toggle(byLabel<HTMLInputElement>(root, 'Pull the layers apart'), true);
    expect(card.hasAttribute('data-exploded')).toBe(true);
  });
});

describe('particle-network', () => {
  it('starts still with reduced motion, and its buttons drive it', async () => {
    const { root, controller } = await mount('particle-network');
    const canvas = root.querySelector('canvas')!;
    expect(canvas.getAttribute('role')).toBe('img');
    const pause = root.querySelector<HTMLButtonElement>('.pn__button:not(.pn__button--gold)')!;
    expect(pause.textContent).toBe('Resume');
    pause.click();
    expect(pause.textContent).toBe('Pause');
    pause.click();
    expect(pause.textContent).toBe('Resume');
    controller.abort();
    pause.click();
    expect(pause.textContent).toBe('Resume');
  });
});

describe('svg-heatmap', () => {
  it('moves a cursor through the year and names each day, once', async () => {
    const { root } = await mount('svg-heatmap');
    expect(root.querySelectorAll('.hm__cell')).toHaveLength(53 * 7);
    const grid = root.querySelector('[role="group"]')!;
    const live = root.querySelector('[aria-live="polite"]')!;
    grid.dispatchEvent(new FocusEvent('focus'));
    const today = live.textContent ?? '';
    expect(today).toMatch(/\d/);
    // The cursor starts on today and the days to come are not in the year: → stays put.
    key(grid, 'ArrowRight');
    expect(live.textContent).toBe(today);
    key(grid, 'ArrowLeft');
    expect(live.textContent).not.toBe(today);
    // One channel: no active descendant to read it a second time.
    expect(grid.hasAttribute('aria-activedescendant')).toBe(false);
  });
});

describe('scroll-depth', () => {
  it('says why the layers stay still where scroll-driven animations are missing', async () => {
    vi.stubGlobal('CSS', { supports: () => false });
    const { root } = await mount('scroll-depth');
    expect(root.querySelector('.sd__unsupported')?.textContent).toBe(
      STRINGS['scroll-depth'].unsupported,
    );
    const scroller = root.querySelector<HTMLElement>('[role="region"]')!;
    expect(scroller.tabIndex).toBe(0);
    expect(root.querySelectorAll('.sd__layer')).toHaveLength(5);
    toggle(byLabel<HTMLInputElement>(root, "Show each layer's timeline"), true);
    expect(scroller.hasAttribute('data-timelines')).toBe(true);
  });

  it('says nothing where they are there', async () => {
    vi.stubGlobal('CSS', { supports: () => true });
    const { root } = await mount('scroll-depth');
    expect(root.querySelector('.sd__unsupported')).toBeNull();
  });
});

describe('contrast-checker', () => {
  const ratio = (root: HTMLElement) =>
    Number(root.querySelector('.cc__ratio')?.textContent?.replace(':1', ''));

  it("starts with the site's gold on its paper, which fails, and fixes it", async () => {
    const { root } = await mount('contrast-checker');
    const hexes = [...root.querySelectorAll<HTMLInputElement>('.cc__hex')].map((i) => i.value);
    expect(hexes).toEqual(['#d6a35f', '#f2e7d4']);
    expect(ratio(root)).toBeCloseTo(1.85, 2);
    const fix = root.querySelector<HTMLElement>('.cc__fix')!;
    expect(fix.hidden).toBe(false);
    fix.querySelector('button')!.click();
    expect(fix.hidden).toBe(true);
    expect(ratio(root)).toBeGreaterThanOrEqual(4.5);
    // Every pair of the site's seven colours, the diagonal disabled.
    const cells = root.querySelectorAll<HTMLButtonElement>('.cc__matrix button');
    expect(cells).toHaveLength(49);
    expect([...cells].filter((cell) => cell.disabled)).toHaveLength(7);
  });

  it('shows the checker alone when compact', async () => {
    const { root } = await mount('contrast-checker', { compact: true });
    expect(root.querySelector('.cc__checker')).not.toBeNull();
    expect(root.querySelector('.cc__palette')).toBeNull();
  });
});

describe('fluid-type-scale', () => {
  it('never lets a range with no room between its screens reach the CSS', async () => {
    const { root } = await mount('fluid-type-scale');
    const css = () => root.querySelector('.ft__code code')?.textContent ?? '';
    expect(css()).toContain('--step-0: clamp(');
    const min = byLabel<HTMLInputElement>(root, 'Narrowest screen (px)');
    const max = byLabel<HTMLInputElement>(root, 'Widest screen (px)');
    const error = root.querySelector<HTMLElement>('.ft__error')!;
    type(min, '1000');
    const valid = css();
    type(max, '900');
    expect(error.hidden).toBe(false);
    expect(max.getAttribute('aria-invalid')).toBe('true');
    expect(max.getAttribute('aria-describedby')).toBe(error.id);
    expect(css()).toBe(valid);
    type(max, '1600');
    expect(error.hidden).toBe(true);
    expect(max.hasAttribute('aria-invalid')).toBe(false);
    expect(css()).not.toBe(valid);
  });
});

describe('sdc-generator', () => {
  it('says what Drupal would reject, next to the field', async () => {
    const { root } = await mount('sdc-generator');
    const name = byLabel<HTMLInputElement>(root, 'Machine name');
    const error = document.getElementById(name.getAttribute('aria-describedby') ?? '')!;
    type(name, 'My card');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(error.textContent).toBe(STRINGS['sdc-generator'].errPattern);
    type(name, 'my-card');
    expect(name.hasAttribute('aria-invalid')).toBe(false);
    expect(error.textContent).toBe('');
    expect(root.querySelector('[role="tab"]')?.textContent).toBe('my-card.component.yml');
    expect(root.querySelector('code')?.textContent).toContain('name: Card');
    // Each × says what it removes.
    const removes = [...root.querySelectorAll('.sdc__remove')].map((b) => b.getAttribute('aria-label'));
    expect(removes).toEqual(['Remove title', 'Remove variant', 'Remove featured', 'Remove body']);
  });
});
