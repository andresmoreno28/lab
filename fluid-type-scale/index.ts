/**
 * Fluid type scale (lab tool): the ends of the scale in, the `clamp()` of every step out. A
 * preview you can stretch shows each step at that width, and a chart draws how each one grows
 * between the narrowest and the widest screen, with a marker at the preview's width.
 */
import css from './style.css?inline';
import { adopt, copy, fill, formatNumber, h, s, uid, type Mount } from '../shared/dom';
import { sizeAt, toCss, typeScale, type ScaleInput } from '../lib/fluid-type';

/** The CSS unit the readouts carry (a unit, not copy). */
const PX = 'px';

const RATIOS = [
  ['minorThird', 1.2],
  ['majorThird', 1.25],
  ['fourth', 1.333],
  ['fifth', 1.5],
] as const;

export const mount: Mount = ({ root, strings, signal }) => {
  adopt(css);
  const id = uid('type');
  const input: ScaleInput = {
    minViewport: 360,
    maxViewport: 1440,
    minBase: 16,
    maxBase: 19,
    minRatio: 1.2,
    maxRatio: 1.333,
    stepsDown: 1,
    stepsUp: 5,
  };

  /*
   * What is being typed (draft) and what the output shows (input, the last valid scale): an
   * invalid value never reaches the CSS. Each field checks its own range; the two viewports must
   * also leave room between them, or the slope divides by zero or turns negative.
   */
  const draft: ScaleInput = { ...input };
  const fields = new Map<keyof ScaleInput, HTMLInputElement>();
  const rangeError = h(
    'p',
    { id: `${id}-range`, class: 'ft__error', hidden: true },
    strings.errRange ?? '',
  );
  const invalid = (element: HTMLInputElement, bad: boolean, describedBy?: string) => {
    // `aria-invalid=""` reads as false: the error needs the explicit value.
    if (bad) element.setAttribute('aria-invalid', 'true');
    else element.removeAttribute('aria-invalid');
    if (bad && describedBy) element.setAttribute('aria-describedby', describedBy);
    else element.removeAttribute('aria-describedby');
  };
  const number = (key: keyof ScaleInput, label: string, min: number, max: number) => {
    const field = `${id}-${key}`;
    const element = h('input', {
      type: 'number',
      id: field,
      min,
      max,
      step: 1,
      value: input[key],
      inputmode: 'numeric',
      class: 'ft__number',
    });
    fields.set(key, element);
    element.addEventListener(
      'input',
      () => {
        const value = Number(element.value);
        const ok = element.value !== '' && Number.isFinite(value) && value >= min && value <= max;
        invalid(element, !ok);
        if (!ok) return;
        draft[key] = value;
        const roomy = draft.maxViewport > draft.minViewport;
        rangeError.hidden = roomy;
        for (const viewport of ['minViewport', 'maxViewport'] as const) {
          const other = fields.get(viewport);
          if (
            other &&
            (other === element || other.getAttribute('aria-describedby') === rangeError.id)
          )
            invalid(other, !roomy, rangeError.id);
        }
        if (!roomy) return;
        Object.assign(input, draft);
        render();
      },
      { signal },
    );
    return h('div', { class: 'ft__field' }, h('label', { for: field }, label), element);
  };
  const ratio = (key: 'minRatio' | 'maxRatio', label: string) => {
    const field = `${id}-${key}`;
    const select = h(
      'select',
      { id: field, class: 'ft__select' },
      ...RATIOS.map(([name, value]) =>
        h('option', { value, selected: value === input[key] }, `${strings[name] ?? ''} · ${value}`),
      ),
    );
    select.addEventListener(
      'change',
      () => {
        draft[key] = Number(select.value);
        input[key] = draft[key];
        if (rangeError.hidden) render();
      },
      { signal },
    );
    return h('div', { class: 'ft__field' }, h('label', { for: field }, label), select);
  };

  const widthId = `${id}-width`;
  // The preview starts at this screen's width: on a phone, what the scale gives a phone.
  const start = Math.round(Math.min(1600, Math.max(320, window.innerWidth)) / 10) * 10;
  const width = h('input', {
    type: 'range',
    id: widthId,
    min: 320,
    max: 1600,
    step: 10,
    value: start,
    class: 'ft__range',
  });
  const widthOut = h('output', { for: widthId, class: 't-mono ft__width' });
  const lines = h('div', { class: 'ft__lines' });
  const preview = h('div', { class: 'ft__preview' }, lines);
  const chart = s('svg', {
    class: 'ft__chart',
    viewBox: '0 0 320 160',
    'aria-hidden': 'true',
    preserveAspectRatio: 'none',
  });
  const code = h('code', {});
  // It scrolls when the scale is long: the keyboard reaches it.
  const pre = h('pre', { class: 'ft__code t-mono', tabindex: 0 }, code);
  const status = h('span', { class: 'ft__status', role: 'status' });
  const copyButton = h('button', { type: 'button', class: 'ft__copy' }, strings.copy ?? '');
  copyButton.addEventListener(
    'click',
    () => void copy(code.textContent ?? '', pre, status, strings.copied ?? ''),
    { signal },
  );
  width.addEventListener('input', () => renderPreview(), { signal });

  root.replaceChildren(
    h(
      'div',
      { class: 'ft' },
      h(
        'div',
        { class: 'ft__inputs' },
        number('minViewport', strings.minViewport ?? '', 240, 1000),
        number('maxViewport', strings.maxViewport ?? '', 800, 2560),
        number('minBase', strings.minBase ?? '', 10, 32),
        number('maxBase', strings.maxBase ?? '', 10, 40),
        ratio('minRatio', strings.minRatio ?? ''),
        ratio('maxRatio', strings.maxRatio ?? ''),
        rangeError,
      ),
      h(
        'div',
        { class: 'ft__stage' },
        h(
          'div',
          { class: 'ft__width-row' },
          h('label', { for: widthId }, strings.preview ?? ''),
          width,
          widthOut,
        ),
        preview,
        chart,
      ),
      h('div', { class: 'ft__out' }, pre, h('div', { class: 'ft__actions' }, copyButton, status)),
    ),
  );

  let steps = typeScale(input);

  const renderPreview = () => {
    const at = Number(width.value);
    widthOut.textContent = `${at}${PX}`;
    preview.style.setProperty('--preview-w', String((at - 320) / (1600 - 320)));
    for (const [index, step] of [...steps].reverse().entries()) {
      const line = lines.children[index] as HTMLElement | undefined;
      if (!line) continue;
      const size = sizeAt(step, input, at);
      line.style.setProperty('--size', `${size}px`);
      (line.lastElementChild as HTMLElement).textContent = `${formatNumber(size, 1)}${PX}`;
    }
    const x = ((Math.min(Math.max(at, 320), 1600) - 320) / (1600 - 320)) * 320;
    chart.querySelector('.ft__marker')?.setAttribute('x1', String(x));
    chart.querySelector('.ft__marker')?.setAttribute('x2', String(x));
  };

  const render = () => {
    steps = typeScale(input);
    code.textContent = toCss(steps);
    lines.replaceChildren(
      ...[...steps]
        .reverse()
        .map((step) =>
          h(
            'p',
            { class: 'ft__line' },
            h('span', { class: 'ft__step t-mono' }, fill(strings.step ?? '', { n: step.step })),
            h('span', { class: 'ft__sample' }, strings.sample ?? ''),
            h('span', { class: 'ft__px t-mono' }),
          ),
        ),
    );
    // Chart: px on y (0 at the bottom), viewport 320–1600 px on x; flat outside the range.
    const top = Math.max(...steps.map((step) => Math.max(step.min, step.max))) * 1.08;
    const px = (v: number) => 160 - (v / top) * 160;
    const vx = (v: number) => ((v - 320) / (1600 - 320)) * 320;
    const paths = steps.map((step, index) => {
      const a = vx(Math.max(320, input.minViewport));
      const b = vx(Math.min(1600, input.maxViewport));
      const d = `M0 ${px(step.min)} L${a} ${px(step.min)} L${b} ${px(step.max)} L320 ${px(step.max)}`;
      return s('path', { d, class: 'ft__curve', style: `--i:${index}` });
    });
    chart.replaceChildren(
      s('rect', {
        x: vx(input.minViewport),
        y: 0,
        width: Math.max(0, vx(input.maxViewport) - vx(input.minViewport)),
        height: 160,
        class: 'ft__band',
      }),
      ...paths,
      s('line', { class: 'ft__marker', x1: 0, x2: 0, y1: 0, y2: 160 }),
    );
    renderPreview();
  };
  render();
};
