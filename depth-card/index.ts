/**
 * Depth card (lab component): a card that tilts towards the pointer, with layers at different
 * depths (translateZ) that slide against each other and a glare that follows the light. «Pull
 * the layers apart» turns it three-quarters and spreads the layers out, to see how it is built.
 * With the keyboard: focus it and use the arrows (Home or Escape straightens it). With reduced
 * motion it does not follow the pointer.
 */
import css from './style.css?inline';
import { adopt, h, s, uid, type Mount } from '../shared/dom';

const MAX_TILT = 14;
const KEY_STEP = 4;

export const mount: Mount = ({ root, strings, reduced, signal }) => {
  adopt(css);
  const id = uid('depth');

  /* Paper layers, back to front: sky, sun, far ridge, near ridge, text, badge. */
  const ridge = (d: string, className: string) =>
    s(
      'svg',
      {
        class: `dc__layer ${className}`,
        viewBox: '0 0 400 260',
        preserveAspectRatio: 'none',
        'aria-hidden': 'true',
      },
      s('path', { d }),
    );
  const card = h(
    'div',
    {
      class: 'dc__card',
      tabindex: 0,
      role: 'group',
      'aria-label': strings.label ?? '',
    },
    h('div', { class: 'dc__layer dc__sky', 'aria-hidden': 'true' }),
    h('div', { class: 'dc__layer dc__sun', 'aria-hidden': 'true' }),
    ridge(
      'M0 118 L60 78 L110 102 L170 52 L240 92 L300 60 L360 88 L400 70 L400 260 L0 260 Z',
      'dc__far',
    ),
    ridge(
      'M0 150 L70 118 L130 140 L200 104 L270 134 L330 112 L400 140 L400 260 L0 260 Z',
      'dc__near',
    ),
    h(
      'div',
      { class: 'dc__layer dc__text' },
      h('p', { class: 'dc__title' }, strings.title ?? ''),
      h('p', { class: 'dc__copy' }, strings.text ?? ''),
    ),
    h(
      'div',
      { class: 'dc__layer dc__badge', 'aria-hidden': 'true' },
      s(
        'svg',
        { viewBox: '0 0 24 24', width: 22, height: 22 },
        s('path', {
          d: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z',
          fill: 'currentColor',
        }),
      ),
    ),
    h('div', { class: 'dc__glare', 'aria-hidden': 'true' }),
  );

  const toggle = (name: string, text: string, checked: boolean) => {
    const input = h('input', { type: 'checkbox', id: `${id}-${name}`, checked });
    return {
      input,
      element: h('label', { for: `${id}-${name}`, class: 'dc__check' }, input, text),
    };
  };
  const glare = toggle('glare', strings.glare ?? '', true);
  const explode = toggle('explode', strings.explode ?? '', false);

  const scene = h('div', { class: 'dc__scene' }, card);
  root.replaceChildren(
    h(
      'div',
      { class: 'dc' },
      scene,
      h('div', { class: 'dc__controls' }, glare.element, explode.element),
    ),
  );

  let rx = 0;
  let ry = 0;
  let frame = 0;
  const apply = (x: number, y: number, light = { x: 50, y: 30 }) => {
    rx = Math.max(-MAX_TILT, Math.min(MAX_TILT, x));
    ry = Math.max(-MAX_TILT, Math.min(MAX_TILT, y));
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      card.style.setProperty('--rx', `${rx}deg`);
      card.style.setProperty('--ry', `${ry}deg`);
      card.style.setProperty('--lx', `${light.x}%`);
      card.style.setProperty('--ly', `${light.y}%`);
    });
  };
  signal.addEventListener('abort', () => cancelAnimationFrame(frame));

  scene.addEventListener(
    'pointermove',
    (event) => {
      if (reduced || explode.input.checked) return;
      const box = card.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;
      card.dataset.live = '';
      apply((0.5 - py) * 2 * MAX_TILT, (px - 0.5) * 2 * MAX_TILT, { x: px * 100, y: py * 100 });
    },
    { signal },
  );
  scene.addEventListener(
    'pointerleave',
    () => {
      delete card.dataset.live;
      if (!explode.input.checked) apply(0, 0);
    },
    { signal },
  );

  card.addEventListener(
    'keydown',
    (event) => {
      const moves: Record<string, [number, number]> = {
        ArrowUp: [KEY_STEP, 0],
        ArrowDown: [-KEY_STEP, 0],
        ArrowLeft: [0, -KEY_STEP],
        ArrowRight: [0, KEY_STEP],
      };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        apply(rx + move[0], ry + move[1], {
          x: 50 + (ry + move[1]) * 3,
          y: 50 - (rx + move[0]) * 3,
        });
      } else if (event.key === 'Home' || event.key === 'Escape') {
        event.preventDefault();
        apply(0, 0);
      }
    },
    { signal },
  );

  glare.input.addEventListener(
    'change',
    () => card.toggleAttribute('data-no-glare', !glare.input.checked),
    { signal },
  );
  explode.input.addEventListener(
    'change',
    () => {
      // The exploded pose is fixed in the CSS; the tilt waits underneath, straightened.
      card.toggleAttribute('data-exploded', explode.input.checked);
      apply(0, 0);
    },
    { signal },
  );
};
