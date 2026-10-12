/**
 * Contrast checker (lab tool): text and background → WCAG 2.2 ratio with what it passes, APCA
 * Lc, a live sample, the nearest colour of the same hue that passes AA, and a palette mode that
 * paints the contrast of every pair. It starts with this site's own gold on its paper, which
 * does not pass for text: the reason the site's gold text is a darker token.
 */
import css from './style.css?inline';
import {
  apca,
  contrastRatio,
  nearestPassing,
  parseHex,
  toHex,
  wcagLevels,
  type Rgb,
} from '../lib/color';
import { adopt, formatNumber, h, s, uid, type Mount } from '../shared/dom';

/** Site tokens the tool starts with: the pair in the checker and the palette in the matrix. */
const START = { text: '--color-gold', background: '--color-paper' };
const PALETTE = [
  '--color-ink',
  '--color-ink-muted',
  '--color-gold',
  '--color-gold-text',
  '--color-annotation-blue',
  '--color-paper',
  '--color-bg-dark',
];
/** Gauge: ratios on a log scale, 1:1 empty, 21:1 full. */
const gaugeShare = (ratio: number) => Math.log(ratio) / Math.log(21);
const RING = 2 * Math.PI * 52;

export const mount: Mount = ({ root, strings, reduced, compact, signal }) => {
  adopt(css);
  const style = getComputedStyle(root);
  const token = (name: string) => parseHex(style.getPropertyValue(name)) ?? { r: 0, g: 0, b: 0 };
  let text = token(START.text);
  let background = token(START.background);

  /* A colour field: label, native picker and hex text, kept in step. */
  const field = (label: string, initial: Rgb, set: (value: Rgb) => void) => {
    const id = uid('colour');
    const picker = h('input', { type: 'color', id, value: toHex(initial), class: 'cc__picker' });
    const hex = h('input', {
      type: 'text',
      value: toHex(initial),
      class: 'cc__hex t-mono',
      spellcheck: false,
      autocomplete: 'off',
      maxlength: 7,
      'aria-label': `${label} (hex)`,
    });
    picker.addEventListener(
      'input',
      () => {
        hex.value = picker.value;
        hex.removeAttribute('aria-invalid');
        set(parseHex(picker.value)!);
      },
      { signal },
    );
    hex.addEventListener(
      'input',
      () => {
        const value = parseHex(hex.value);
        // `aria-invalid=""` reads as false: the error needs the explicit value.
        if (value) hex.removeAttribute('aria-invalid');
        else hex.setAttribute('aria-invalid', 'true');
        if (!value) return;
        picker.value = toHex(value);
        set(value);
      },
      { signal },
    );
    const update = (value: Rgb) => {
      picker.value = toHex(value);
      hex.value = toHex(value);
      hex.removeAttribute('aria-invalid');
    };
    const element = h(
      'div',
      { class: 'cc__field' },
      h('label', { for: id, class: 'cc__label' }, label),
      h('div', { class: 'cc__inputs' }, picker, hex),
    );
    return { element, update };
  };

  const textField = field(strings.text ?? '', text, (value) => {
    text = value;
    render();
  });
  const backgroundField = field(strings.background ?? '', background, (value) => {
    background = value;
    render();
  });
  const swap = h(
    'button',
    { type: 'button', class: 'cc__swap', 'aria-label': strings.swap ?? '' },
    s(
      'svg',
      { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' },
      s('path', {
        d: 'M7 7h11l-3-3M17 17H6l3 3',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    ),
  );
  swap.addEventListener(
    'click',
    () => {
      [text, background] = [background, text];
      textField.update(text);
      backgroundField.update(background);
      render();
    },
    { signal },
  );

  /* The sample, in both sizes WCAG distinguishes. */
  const sampleLarge = h('p', { class: 'cc__sample-large' }, strings.sample ?? '');
  const sampleSmall = h('p', { class: 'cc__sample-small' }, strings.sample ?? '');
  // A visual preview of the pair being checked, which may well fail on purpose: its ratio is
  // read out in the result and the live region, so assistive technology skips the preview.
  const sample = h('div', { class: 'cc__sample', 'aria-hidden': 'true' }, sampleLarge, sampleSmall);

  /* Gauge: a ring that fills with the ratio, the number in the middle. */
  const arc = s('circle', {
    cx: 60,
    cy: 60,
    r: 52,
    class: 'cc__arc',
    'stroke-dasharray': RING,
    'stroke-dashoffset': RING,
    transform: 'rotate(-90 60 60)',
  });
  const ratioText = h('span', { class: 'cc__ratio t-mono' });
  const gauge = h(
    'div',
    { class: 'cc__gauge' },
    s(
      'svg',
      { viewBox: '0 0 120 120', 'aria-hidden': 'true' },
      s('circle', { cx: 60, cy: 60, r: 52, class: 'cc__track' }),
      arc,
    ),
    h(
      'div',
      { class: 'cc__gauge-text' },
      ratioText,
      h('span', { class: 'cc__gauge-label' }, strings.ratio ?? ''),
    ),
  );
  const apcaValue = h('span', { class: 't-mono' });
  const apcaRow = h('p', { class: 'cc__apca' }, h('span', {}, strings.apca ?? ''), apcaValue);

  /*
   * What the ratio passes: normal text, large text, UI. Each badge says it in three ways, never
   * by colour alone (WCAG 1.4.1): a tick or a cross, its colour, and «passes / fails» as text
   * for screen readers.
   */
  const badge = (label: string) => {
    const mark = h('span', { class: 'cc__badge-mark', 'aria-hidden': 'true' });
    const state = h('span', { class: 'visually-hidden' });
    const element = h('span', { class: 'cc__badge' }, mark, label, state);
    const set = (ok: boolean) => {
      element.dataset.pass = String(ok);
      mark.textContent = ok ? '✓' : '✕';
      state.textContent = ` ${ok ? strings.pass : strings.fail}`;
    };
    return { element, set };
  };
  const rows = (['normal', 'large', 'ui'] as const).map((kind) => {
    const aa = badge(strings.aa ?? '');
    const aaa = kind === 'ui' ? null : badge(strings.aaa ?? '');
    const row = h(
      'li',
      { class: 'cc__level' },
      h('span', { class: 'cc__level-name' }, strings[kind] ?? ''),
      h('span', { class: 'cc__badges' }, aa.element, aaa?.element),
    );
    return { kind, row, aa, aaa };
  });
  const levels = h('ul', { class: 'cc__levels', role: 'list' }, ...rows.map((r) => r.row));

  /* The fix: the nearest text colour of the same hue that passes AA. */
  const fixSwatch = h('span', { class: 'cc__fix-swatch', 'aria-hidden': 'true' });
  const fixHex = h('span', { class: 't-mono' });
  const fixUse = h('button', { type: 'button', class: 'cc__fix-use' }, strings.use ?? '');
  const fix = h(
    'div',
    { class: 'cc__fix', hidden: true },
    h('p', { class: 'cc__fix-text' }, strings.suggest ?? ''),
    h('div', { class: 'cc__fix-row' }, fixSwatch, fixHex, fixUse),
  );
  let suggestion: Rgb | null = null;
  fixUse.addEventListener(
    'click',
    () => {
      if (!suggestion) return;
      text = suggestion;
      textField.update(text);
      render();
      fixUse.blur();
      textField.element.querySelector('input')?.focus();
    },
    { signal },
  );

  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

  const checker = h(
    'div',
    { class: 'cc__checker' },
    h('div', { class: 'cc__fields' }, textField.element, swap, backgroundField.element),
    sample,
    h(
      'div',
      { class: 'cc__result' },
      gauge,
      h('div', { class: 'cc__result-side' }, levels, apcaRow),
    ),
    fix,
  );

  /* Palette mode: the contrast of every pair, rows as text, columns as background. */
  const paletteId = uid('palette');
  const palette = h('textarea', {
    id: paletteId,
    class: 'cc__palette-input t-mono',
    rows: 8,
    spellcheck: false,
  });
  palette.value = PALETTE.map((name) => toHex(token(name))).join('\n');
  const matrix = h('div', {
    class: 'cc__matrix-wrap',
    tabindex: 0,
    role: 'region',
    'aria-labelledby': `${paletteId}-caption`,
  });
  const paletteSection = h(
    'div',
    { class: 'cc__palette' },
    h(
      'div',
      { class: 'cc__palette-edit' },
      h('label', { for: paletteId, class: 'cc__label' }, strings.palette ?? ''),
      h('p', { class: 'cc__hint', id: `${paletteId}-hint` }, strings.paletteHint ?? ''),
      palette,
    ),
    h(
      'div',
      { class: 'cc__matrix-col' },
      h('p', { id: `${paletteId}-caption`, class: 'cc__caption' }, strings.matrix ?? ''),
      matrix,
    ),
  );
  palette.setAttribute('aria-describedby', `${paletteId}-hint`);

  const renderMatrix = () => {
    const colours = [
      ...new Set(
        palette.value
          .split(/[\s,;]+/)
          .map((v) => parseHex(v))
          .filter((v): v is Rgb => v !== null)
          .map(toHex),
      ),
    ].slice(0, 10);
    if (colours.length < 2) {
      matrix.replaceChildren(h('p', { class: 'cc__hint' }, strings.empty ?? ''));
      return;
    }
    /* One tab stop for the whole matrix; the arrows move between its pairs (roving tabindex). */
    const grid: (HTMLButtonElement | null)[][] = [];
    const table = h('table', { class: 'cc__matrix', 'aria-labelledby': `${paletteId}-caption` });
    const head = h('tr', {}, h('td', {}));
    colours.forEach((hex) =>
      head.append(
        h(
          'th',
          { scope: 'col', class: 't-mono' },
          h('span', { class: 'cc__chip', style: `--chip:${hex}` }),
          hex,
        ),
      ),
    );
    table.append(h('thead', {}, head));
    const body = h('tbody');
    colours.forEach((rowHex, row) => {
      grid[row] = [];
      const tr = h(
        'tr',
        {},
        h(
          'th',
          { scope: 'row', class: 't-mono' },
          h('span', { class: 'cc__chip', style: `--chip:${rowHex}` }),
          rowHex,
        ),
      );
      colours.forEach((colHex, col) => {
        const ratio = contrastRatio(parseHex(rowHex)!, parseHex(colHex)!);
        const level = ratio >= 7 ? 'aaa' : ratio >= 4.5 ? 'aa' : ratio >= 3 ? 'large' : 'fail';
        const pick = h(
          'button',
          {
            type: 'button',
            class: `cc__cell cc__cell--${level}`,
            style: `--fg:${rowHex};--bg:${colHex};--i:${row + col}`,
            'aria-label': `${rowHex} / ${colHex}: ${formatNumber(ratio)}:1`,
            disabled: row === col,
            tabindex: -1,
          },
          h('span', { class: 'cc__cell-ink', 'aria-hidden': 'true' }),
          h('span', { class: 'cc__cell-ratio t-mono', 'aria-hidden': 'true' }, formatNumber(ratio)),
        );
        pick.addEventListener(
          'click',
          () => {
            text = parseHex(rowHex)!;
            background = parseHex(colHex)!;
            textField.update(text);
            backgroundField.update(background);
            render();
            checker.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
          },
          { signal },
        );
        grid[row]![col] = row === col ? null : pick;
        tr.append(h('td', {}, pick));
      });
      body.append(tr);
    });
    table.append(body);
    const first = grid[0]?.[1];
    if (first) first.tabIndex = 0;
    table.addEventListener(
      'keydown',
      (event) => {
        const row = grid.findIndex((cells) => cells.includes(event.target as HTMLButtonElement));
        if (row < 0) return;
        const col = grid[row]!.indexOf(event.target as HTMLButtonElement);
        const steps: Record<string, [number, number]> = {
          ArrowRight: [0, 1],
          ArrowLeft: [0, -1],
          ArrowDown: [1, 0],
          ArrowUp: [-1, 0],
        };
        const step = steps[event.key];
        if (!step) return;
        event.preventDefault();
        // Walk past the diagonal (a colour on itself): the next real pair in that direction.
        for (let r = row + step[0], c = col + step[1]; grid[r]?.[c] !== undefined;) {
          const next = grid[r]![c];
          if (next) {
            (event.target as HTMLButtonElement).tabIndex = -1;
            next.tabIndex = 0;
            next.focus();
            return;
          }
          r += step[0];
          c += step[1];
        }
      },
      { signal },
    );
    matrix.replaceChildren(table);
  };
  let paletteTimer = 0;
  palette.addEventListener(
    'input',
    () => {
      window.clearTimeout(paletteTimer);
      paletteTimer = window.setTimeout(renderMatrix, 250);
    },
    { signal },
  );

  /* The number counts up to its new value, the ring follows (CSS transition). */
  let shown = 1;
  let tween = 0;
  const showRatio = (target: number) => {
    cancelAnimationFrame(tween);
    if (reduced) {
      shown = target;
      ratioText.textContent = `${formatNumber(target, 2)}:1`;
      return;
    }
    const from = shown;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      shown = from + (target - from) * (1 - (1 - t) ** 3);
      ratioText.textContent = `${formatNumber(shown, 2)}:1`;
      if (t < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  };
  signal.addEventListener('abort', () => cancelAnimationFrame(tween));

  let announceTimer = 0;
  const render = () => {
    const ratio = contrastRatio(text, background);
    const pass = wcagLevels(ratio);
    root.style.setProperty('--cc-text', toHex(text));
    root.style.setProperty('--cc-background', toHex(background));
    showRatio(ratio);
    const share = gaugeShare(ratio);
    arc.setAttribute('stroke-dashoffset', String(RING * (1 - share)));
    gauge.dataset.level = pass.normalAAA
      ? 'aaa'
      : pass.normalAA
        ? 'aa'
        : pass.largeAA
          ? 'large'
          : 'fail';
    apcaValue.textContent = formatNumber(apca(text, background), 1);
    const said: string[] = [];
    for (const { kind, aa, aaa } of rows) {
      const okAA = kind === 'normal' ? pass.normalAA : kind === 'large' ? pass.largeAA : pass.ui;
      const okAAA = kind === 'normal' ? pass.normalAAA : pass.largeAAA;
      aa.set(okAA);
      aaa?.set(okAAA);
      const word = (ok: boolean) => (ok ? strings.pass : strings.fail);
      said.push(
        aaa
          ? `${strings[kind]}: ${strings.aa} ${word(okAA)}, ${strings.aaa} ${word(okAAA)}.`
          : `${strings[kind]}: ${strings.aa} ${word(okAA)}.`,
      );
    }
    suggestion = pass.normalAA ? null : nearestPassing(text, background, 4.5);
    fix.hidden = suggestion === null;
    if (suggestion) {
      fixSwatch.style.background = toHex(suggestion);
      fixHex.textContent = toHex(suggestion);
    }
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      live.textContent = `${strings.ratio} ${formatNumber(ratio, 2)}:1. ${said.join(' ')}`;
    }, 600);
  };
  signal.addEventListener('abort', () => {
    window.clearTimeout(announceTimer);
    window.clearTimeout(paletteTimer);
  });

  // Compact (the site's home window): the checker alone; the palette matrix waits for the
  // full piece.
  root.replaceChildren(h('div', { class: 'cc' }, checker, compact ? null : paletteSection, live));
  render();
  if (!compact) renderMatrix();
};
