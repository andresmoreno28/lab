/**
 * Scroll depth (lab experiment): paper layers in a scroll box, each moved by a CSS
 * scroll-driven animation (`scroll-timeline` on the box, `animation-timeline` on the layer) at
 * its own speed. The script only builds the markup, which could as well be HTML, and tells a
 * browser without scroll-driven animations why the layers stay still.
 */
import css from './style.css?inline';
import { adopt, fill, h, s, uid, type Mount } from '../shared/dom';

/** Back to front: how far each layer travels, as a share of the nearest one's travel. */
const RIDGES = [
  {
    speed: 15,
    d: 'M0 360 L80 300 L150 330 L230 260 L320 320 L400 280 L480 310 L560 250 L640 305 L720 270 L800 310 L800 600 L0 600 Z',
  },
  {
    speed: 35,
    d: 'M0 410 L70 370 L160 400 L240 345 L330 390 L420 355 L500 385 L590 340 L680 380 L760 360 L800 372 L800 600 L0 600 Z',
  },
  {
    speed: 60,
    d: 'M0 460 L90 425 L180 452 L270 410 L360 448 L450 418 L540 445 L630 408 L720 440 L800 422 L800 600 L0 600 Z',
  },
  {
    speed: 100,
    d: 'M0 520 L100 488 L190 512 L300 478 L400 515 L500 486 L600 510 L700 480 L800 500 L800 600 L0 600 Z',
  },
];

export const mount: Mount = ({ root, strings, signal }) => {
  adopt(css);
  const id = uid('scroll');
  const supported = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()');

  const layer = (className: string, speed: number, child: Node) => {
    const element = h('div', { class: `sd__layer ${className}` }, child);
    element.style.setProperty('--speed', String(speed / 100));
    return element;
  };
  const ridges = RIDGES.map((ridge, index) =>
    layer(
      `sd__ridge sd__ridge--${index + 1}`,
      ridge.speed,
      s(
        'svg',
        { viewBox: '0 0 800 600', preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': 'true' },
        s('path', { d: ridge.d }),
      ),
    ),
  );
  const sun = layer('sd__sun', 8, h('span', { 'aria-hidden': 'true' }));

  const bars = h(
    'div',
    { class: 'sd__bars', 'aria-hidden': 'true' },
    ...[{ speed: 8 }, ...RIDGES].map((ridge, index) => {
      const bar = h(
        'div',
        { class: 'sd__bar' },
        h(
          'span',
          { class: 'sd__bar-label t-mono' },
          fill(strings.layer ?? '', { n: index + 1, speed: ridge.speed }),
        ),
        h('span', { class: 'sd__bar-track' }, h('span', { class: 'sd__bar-fill' })),
      );
      bar.style.setProperty('--speed', String(ridge.speed / 100));
      return bar;
    }),
  );

  const scroller = h(
    'div',
    {
      class: 'sd__scroller',
      tabindex: 0,
      role: 'region',
      'aria-label': strings.label ?? '',
    },
    h(
      'div',
      { class: 'sd__track' },
      h(
        'div',
        { class: 'sd__view' },
        h('div', { class: 'sd__sky', 'aria-hidden': 'true' }),
        sun,
        ...ridges,
        bars,
      ),
    ),
  );

  const show = h('input', { type: 'checkbox', id: `${id}-timelines` });
  show.addEventListener('change', () => scroller.toggleAttribute('data-timelines', show.checked), {
    signal,
  });

  root.replaceChildren(
    h(
      'div',
      { class: 'sd' },
      h('p', { class: 'sd__hint' }, strings.hint ?? ''),
      supported ? null : h('p', { class: 'sd__unsupported' }, strings.unsupported ?? ''),
      scroller,
      h('label', { for: `${id}-timelines`, class: 'sd__check' }, show, strings.timelines ?? ''),
    ),
  );
};
