/**
 * Mounts a lab piece by its name: each one is its own chunk, imported the first time it is
 * mounted, so a page pays only for the pieces it shows. It resolves with the AbortController
 * that unmounts the piece: abort it and the piece's listeners, timers and loops stop.
 *
 * On the site the stage carries the piece's name and strings as data attributes and mounts when
 * it comes within half a viewport of the screen; here the caller decides when, and hands the
 * strings over itself (strings/<locale>.json).
 */
import { adopt, type Mount, type Strings } from './dom';
import stageCss from './stage.css?inline';

export const PIECE_NAMES = [
  'accessible-button',
  'depth-card',
  'accessible-tabs',
  'particle-network',
  'svg-heatmap',
  'scroll-depth',
  'contrast-checker',
  'fluid-type-scale',
  'sdc-generator',
] as const;

export type Piece = (typeof PIECE_NAMES)[number];

const PIECES: Record<Piece, () => Promise<{ mount: Mount }>> = {
  'accessible-button': () => import('../accessible-button'),
  'depth-card': () => import('../depth-card'),
  'accessible-tabs': () => import('../accessible-tabs'),
  'particle-network': () => import('../particle-network'),
  'svg-heatmap': () => import('../svg-heatmap'),
  'scroll-depth': () => import('../scroll-depth'),
  'contrast-checker': () => import('../contrast-checker'),
  'fluid-type-scale': () => import('../fluid-type-scale'),
  'sdc-generator': () => import('../sdc-generator'),
};

/** True when the visitor asked for less motion, or when the browser cannot tell. */
export function prefersReducedMotion(win: Window): boolean {
  if (typeof win.matchMedia !== 'function') return true;
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface MountOptions {
  /** The piece's strings (strings/<locale>.json[piece]); without them its labels are empty. */
  strings?: Strings;
  /** Defaults to the visitor's prefers-reduced-motion. */
  reduced?: boolean;
  /** Defaults to the stage having a `data-compact` attribute. */
  compact?: boolean;
}

/** Mounts `piece` in `stage` (a .lab-stage); resolves with what unmounts it. */
export async function mountPiece(
  stage: HTMLElement,
  piece: Piece,
  options: MountOptions = {},
): Promise<AbortController> {
  const { mount } = await PIECES[piece]();
  adopt(stageCss);
  const controller = new AbortController();
  mount({
    root: stage,
    strings: options.strings ?? {},
    reduced: options.reduced ?? prefersReducedMotion(window),
    compact: options.compact ?? stage.hasAttribute('data-compact'),
    signal: controller.signal,
  });
  stage.dataset.mounted = '';
  return controller;
}
