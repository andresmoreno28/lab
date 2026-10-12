import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoomOf } from './zoom';

/** A stand-in element: its own computed `zoom`, its parent and, optionally, currentCSSZoom. */
type Fake = { zoom: string; parentElement: Fake | null; currentCSSZoom?: number };
const chain = (...zooms: string[]): Fake =>
  zooms.reduce<Fake | null>((parent, zoom) => ({ zoom, parentElement: parent }), null)!;

describe('zoomOf', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses currentCSSZoom where the engine has it', () => {
    vi.stubGlobal('getComputedStyle', () => {
      throw new Error('not needed');
    });
    expect(zoomOf({ ...chain('1'), currentCSSZoom: 1.49 } as unknown as Element)).toBe(1.49);
  });

  it('multiplies the zoom of every ancestor where it does not (WebKit)', () => {
    vi.stubGlobal('getComputedStyle', (node: Fake) => ({ zoom: node.zoom }));
    // html, body, a block zoomed by --k (the site past 1920 px), two wrappers, the element
    expect(zoomOf(chain('1', '1', '1.49', '1', '1') as unknown as Element)).toBeCloseTo(1.49);
    expect(zoomOf(chain('2', '1.5') as unknown as Element)).toBeCloseTo(3);
  });

  it('reads 1 in an engine without CSS zoom', () => {
    vi.stubGlobal('getComputedStyle', () => ({ zoom: '' }));
    expect(zoomOf(chain('', '') as unknown as Element)).toBe(1);
  });
});
