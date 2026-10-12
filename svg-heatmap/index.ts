/**
 * SVG heatmap (lab experiment): the drupal.org heatmap of the site's home page taken apart. A
 * year, one cell per day; a press on a cell (or Enter on it) sends a wave from there; patterns
 * and palettes repaint it. The keyboard moves a cursor through the grid (arrows, Home, End) and
 * each cell says its date and count.
 */
import { zoomOf } from '../shared/zoom';
import css from './style.css?inline';
import { adopt, fill, h, pageLocale, s, uid, type Mount } from '../shared/dom';
import {
  cellDate,
  DAYS,
  generate,
  levels,
  waveDelay,
  WEEKS,
  type Pattern,
} from '../lib/heatmap-data';

const CELL = 12;
const GAP = 3;
const PITCH = CELL + GAP;

export const mount: Mount = ({ root, strings, reduced, signal }) => {
  adopt(css);
  const id = uid('heatmap');
  const today = new Date();
  // British English, like the site's English copy; Spanish as is.
  const locale = pageLocale() === 'en' ? 'en-GB' : pageLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const countFormat = new Intl.NumberFormat(locale);

  const svg = s('svg', {
    class: 'hm__grid',
    viewBox: `0 0 ${WEEKS * PITCH - GAP} ${DAYS * PITCH - GAP}`,
    // One focusable group; the cell under the cursor is read out by the live region, the only
    // channel (aria-activedescendant inside SVG is unevenly supported and would say it twice).
    role: 'group',
    'aria-label': strings.label ?? '',
    'aria-describedby': `${id}-hint`,
    tabindex: 0,
  });
  const cells: SVGRectElement[] = [];
  const rows = Array.from({ length: DAYS }, () => s('g', { 'aria-hidden': 'true' }));
  for (let index = 0; index < WEEKS * DAYS; index += 1) {
    const week = Math.floor(index / DAYS);
    const day = index % DAYS;
    const future = cellDate(index, today) > today;
    const rect = s('rect', {
      id: `${id}-c${index}`,
      x: week * PITCH,
      y: day * PITCH,
      width: CELL,
      height: CELL,
      rx: 2.5,
      class: 'hm__cell',
      'data-future': future,
    });
    cells.push(rect);
    rows[day]!.append(rect);
  }
  svg.append(...rows);
  const cursor = s('rect', {
    class: 'hm__cursor',
    width: CELL + 4,
    height: CELL + 4,
    rx: 4,
    x: -2,
    y: -2,
    'aria-hidden': 'true',
  });
  svg.append(cursor);

  const tip = h('p', { class: 'hm__tip', hidden: true, 'aria-hidden': 'true' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

  const segmented = <T extends string>(
    key: string,
    legend: string,
    options: [T, string][],
    initial: T,
    onChange: (value: T) => void,
  ) => {
    const group = h('fieldset', { class: 'hm__choice' }, h('legend', {}, legend));
    for (const [value, label] of options) {
      const input = h('input', {
        type: 'radio',
        name: `${id}-${key}`,
        id: `${id}-${value}`,
        value,
        checked: value === initial,
      });
      input.addEventListener('change', () => input.checked && onChange(value), { signal });
      group.append(input, h('label', { for: `${id}-${value}` }, label));
    }
    return group;
  };

  let pattern: Pattern = 'weekdays';
  let counts = generate(pattern);
  let level = levels(counts);
  const container = h('div', { class: 'hm', 'data-palette': 'gold' });

  const legend = h(
    'div',
    { class: 'hm__legend', 'aria-hidden': 'true' },
    h('span', {}, strings.less ?? ''),
    ...[0, 1, 2, 3, 4].map((l) => h('span', { class: 'hm__swatch', 'data-level': l })),
    h('span', {}, strings.more ?? ''),
  );

  // The tooltip sits beside the scrolling frame, not in it: inside, one past the frame's edge
  // would widen what scrolls, and its scrollbar would flash on and off as the pointer moves.
  const frame = h('div', { class: 'hm__frame' }, svg);
  const plot = h('div', { class: 'hm__plot' }, frame, tip);
  container.append(
    h('p', { class: 'hm__hint', id: `${id}-hint` }, strings.hint ?? ''),
    plot,
    h(
      'div',
      { class: 'hm__bar' },
      segmented(
        'pattern',
        strings.pattern ?? '',
        [
          ['random', strings.random ?? ''],
          ['weekdays', strings.weekdays ?? ''],
          ['streaks', strings.streaks ?? ''],
        ],
        pattern,
        (value) => {
          pattern = value;
          counts = generate(pattern);
          level = levels(counts);
          paint();
          wave(0, 0);
        },
      ),
      segmented(
        'palette',
        strings.palette ?? '',
        [
          ['gold', strings.gold ?? ''],
          ['blue', strings.blue ?? ''],
          ['green', strings.green ?? ''],
        ],
        'gold',
        (value) => {
          container.dataset.palette = value;
          wave(WEEKS - 1, DAYS - 1);
        },
      ),
      legend,
    ),
    live,
  );
  root.replaceChildren(container);

  const plural = new Intl.PluralRules(locale);
  const describe = (index: number) => {
    const count = counts[index] ?? 0;
    const date = dateFormat.format(cellDate(index, today));
    return plural.select(count) === 'one'
      ? fill(strings.cellOne ?? '', { date })
      : fill(strings.cell ?? '', { count: countFormat.format(count), date });
  };

  const paint = () => {
    cells.forEach((cell, index) => {
      cell.dataset.level = String(cell.dataset.future === undefined ? level[index] : 0);
    });
  };

  /* The wave: every cell pulses, later the further it is from where it started. */
  let waveTimer = 0;
  const wave = (originWeek: number, originDay: number) => {
    if (reduced) return;
    window.clearTimeout(waveTimer);
    container.removeAttribute('data-wave');
    void container.getBoundingClientRect();
    let longest = 0;
    cells.forEach((cell, index) => {
      const delay = waveDelay(Math.floor(index / DAYS), index % DAYS, originWeek, originDay);
      longest = Math.max(longest, delay);
      cell.style.setProperty('--d', `${delay}ms`);
    });
    container.dataset.wave = '';
    waveTimer = window.setTimeout(() => container.removeAttribute('data-wave'), longest + 700);
  };
  signal.addEventListener('abort', () => window.clearTimeout(waveTimer));

  /* Keyboard cursor (announced by the live region) and pointer tooltip. Days to come are not
   * in the year yet: the cursor stops at today. */
  const lastDay = cells.length - 1 - (DAYS - 1 - ((today.getDay() + 6) % 7));
  let active = lastDay;
  const moveCursor = (index: number, announce: boolean) => {
    active = Math.max(0, Math.min(lastDay, index));
    const week = Math.floor(active / DAYS);
    const day = active % DAYS;
    cursor.setAttribute('x', String(week * PITCH - 2));
    cursor.setAttribute('y', String(day * PITCH - 2));
    if (announce) live.textContent = describe(active);
  };
  svg.addEventListener(
    'keydown',
    (event) => {
      const week = Math.floor(active / DAYS);
      const day = active % DAYS;
      const moves: Record<string, number> = {
        ArrowRight: week < WEEKS - 1 ? active + DAYS : active,
        ArrowLeft: week > 0 ? active - DAYS : active,
        ArrowDown: day < DAYS - 1 ? active + 1 : active,
        ArrowUp: day > 0 ? active - 1 : active,
        Home: day,
        End: (WEEKS - 1) * DAYS + day,
      };
      if (event.key in moves) {
        event.preventDefault();
        moveCursor(moves[event.key]!, true);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        wave(week, day);
      }
    },
    { signal },
  );
  svg.addEventListener('focus', () => moveCursor(active, true), { signal });

  const cellAt = (event: Event) => {
    const target = event.target as Element | null;
    return target instanceof SVGRectElement ? cells.indexOf(target) : -1;
  };
  svg.addEventListener(
    'pointerdown',
    (event) => {
      const index = cellAt(event);
      if (index < 0) return;
      moveCursor(index, false);
      wave(Math.floor(index / DAYS), index % DAYS);
    },
    { signal },
  );
  /* The tooltip over the cell under the pointer, kept within the plot's width at its ends. */
  let tipAt = -1;
  const hideTip = () => {
    tip.hidden = true;
    tipAt = -1;
  };
  svg.addEventListener(
    'pointermove',
    (event) => {
      const index = cellAt(event);
      if (index < 0 || cells[index]!.dataset.future !== undefined) {
        hideTip();
        return;
      }
      if (index === tipAt) return;
      tipAt = index;
      // Measured on the screen, placed in CSS pixels: under CSS zoom (the site, past 1920 px).
      const zoom = zoomOf(plot);
      const area = plot.getBoundingClientRect();
      const box = cells[index]!.getBoundingClientRect();
      tip.textContent = describe(index);
      tip.hidden = false;
      const half = tip.offsetWidth / 2;
      const centre = (box.left - area.left + box.width / 2) / zoom;
      tip.style.left = `${Math.max(half, Math.min(area.width / zoom - half, centre))}px`;
      tip.style.top = `${(box.top - area.top) / zoom}px`;
    },
    { signal },
  );
  svg.addEventListener('pointerleave', hideTip, { signal });
  // On a narrow screen the year scrolls under the tooltip: it goes until the pointer moves again.
  frame.addEventListener('scroll', hideTip, { signal, passive: true });

  paint();
  moveCursor(active, false);
  if (!reduced && 'IntersectionObserver' in window) {
    // The first wave plays when the grid is in view, from its newest day.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        wave(WEEKS - 1, DAYS - 1);
      },
      { threshold: 0.4 },
    );
    observer.observe(svg);
    signal.addEventListener('abort', () => observer.disconnect());
  }
};
