/**
 * Accessible button (lab component): this site's gold button through its whole life, sending
 * (`aria-busy`), sent (a tick that draws itself) and back, a ripple from where it was pressed,
 * a width that eases between labels instead of jumping, `aria-disabled` (it stays focusable and
 * says why) and a switch that draws the area it can be pressed in (WCAG 2.5.8: 24 × 24 px at
 * least; this one is 48 px tall).
 */
import css from './style.css?inline';
import { zoomOf } from '../shared/zoom';
import { adopt, h, s, uid, type Mount } from '../shared/dom';

const SENDING_MS = 1300;

export const mount: Mount = ({ root, strings, reduced, signal }) => {
  adopt(css);
  const id = uid('button');
  const label = h('span', { class: 'ab__label' }, strings.label ?? '');
  const arrow = s(
    'svg',
    { class: 'ab__icon', viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true' },
    s('path', {
      d: 'M5 12h13M13 6l6 6-6 6',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );
  const spinner = s(
    'svg',
    { class: 'ab__spinner', viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true' },
    s('circle', {
      cx: 12,
      cy: 12,
      r: 9,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'stroke-dasharray': '40 60',
    }),
  );
  const tick = s(
    'svg',
    { class: 'ab__tick', viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true' },
    s('path', {
      d: 'M5 12.5l4.5 4.5L19 7.5',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: 1,
    }),
  );
  const button = h(
    'button',
    {
      type: 'button',
      class: 'ab__button',
      'data-state': 'idle',
    },
    label,
    arrow,
    spinner,
    tick,
  );
  const target = h(
    'span',
    { class: 'ab__target', 'aria-hidden': 'true' },
    h('span', { class: 'ab__target-min' }),
  );
  const status = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  // Why it is disabled: shown and tied to the button while it is (aria-describedby).
  const why = h('p', { id: `${id}-why`, class: 'ab__why', hidden: true }, strings.why ?? '');
  const again = h(
    'button',
    { type: 'button', class: 'ab__again', hidden: true },
    strings.reset ?? '',
  );

  const check = (name: string, text: string) => {
    const input = h('input', { type: 'checkbox', id: `${id}-${name}` });
    return {
      input,
      element: h('label', { for: `${id}-${name}`, class: 'ab__check' }, input, text),
    };
  };
  const disabled = check('disabled', strings.disabled ?? '');
  const showTarget = check('target', strings.target ?? '');

  const stage = h(
    'div',
    { class: 'ab__stage' },
    h('div', { class: 'ab__slot' }, target, button),
    why,
    again,
  );
  root.replaceChildren(
    h(
      'div',
      { class: 'ab' },
      stage,
      h(
        'fieldset',
        { class: 'ab__controls' },
        h('legend', {}, strings.states ?? ''),
        disabled.element,
        showTarget.element,
      ),
      status,
    ),
  );

  /* The width follows the label: measured before and after, then eased (FLIP). Measured on the
   * screen, eased in CSS pixels: under CSS zoom (the site zooms the page past 1920 px) the
   * button would otherwise grow by the zoom and jump back. */
  const morph = (change: () => void) => {
    const zoom = zoomOf(button);
    const from = button.getBoundingClientRect().width / zoom;
    change();
    const to = button.getBoundingClientRect().width / zoom;
    if (reduced || Math.abs(from - to) < 1 || typeof button.animate !== 'function') return;
    button.animate([{ width: `${from}px` }, { width: `${to}px` }], {
      duration: 420,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    });
  };

  let timer = 0;
  const setState = (state: 'idle' | 'sending' | 'sent') => {
    morph(() => {
      button.dataset.state = state;
      label.textContent =
        state === 'sending'
          ? (strings.loading ?? '')
          : state === 'sent'
            ? (strings.done ?? '')
            : (strings.label ?? '');
      button.toggleAttribute('aria-busy', state === 'sending');
    });
    status.textContent = state === 'sent' ? (strings.done ?? '') : '';
    again.hidden = state !== 'sent';
  };

  button.addEventListener(
    'pointerdown',
    (event) => {
      if (reduced || button.getAttribute('aria-disabled') === 'true') return;
      const box = button.getBoundingClientRect();
      const zoom = zoomOf(button);
      const ripple = h('span', { class: 'ab__ripple', 'aria-hidden': 'true' });
      ripple.style.left = `${(event.clientX - box.left) / zoom}px`;
      ripple.style.top = `${(event.clientY - box.top) / zoom}px`;
      button.append(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    },
    { signal },
  );

  button.addEventListener(
    'click',
    () => {
      if (button.getAttribute('aria-disabled') === 'true' || button.dataset.state !== 'idle')
        return;
      setState('sending');
      timer = window.setTimeout(() => setState('sent'), reduced ? 300 : SENDING_MS);
    },
    { signal },
  );
  again.addEventListener(
    'click',
    () => {
      setState('idle');
      button.focus();
    },
    { signal },
  );
  signal.addEventListener('abort', () => window.clearTimeout(timer));

  disabled.input.addEventListener(
    'change',
    () => {
      // aria-disabled, not disabled: it keeps its place in the tab order and is still announced.
      button.setAttribute('aria-disabled', String(disabled.input.checked));
      why.hidden = !disabled.input.checked;
      if (disabled.input.checked) button.setAttribute('aria-describedby', why.id);
      else button.removeAttribute('aria-describedby');
      if (disabled.input.checked && button.dataset.state !== 'idle') {
        window.clearTimeout(timer);
        setState('idle');
      }
    },
    { signal },
  );
  showTarget.input.addEventListener(
    'change',
    () => stage.toggleAttribute('data-target', showTarget.input.checked),
    { signal },
  );
};
