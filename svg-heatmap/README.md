# SVG heatmap

**Experiment** · [Live demo](https://andresmoreno28.github.io/lab/#svg-heatmap) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/svg-heatmap)

The drupal.org activity map of the site's home page, taken apart: a year, one cell per day, without real data and with the controls in view. Press a cell (or Enter on it) and a wave crosses the year from there; change the pattern (random, weekdays, streaks) or the palette (gold, blue, green) and it repaints.

## How it is built

**Performance and data**

- It is SVG, not canvas: every day is an element that CSS can animate.
- JavaScript does not move the wave frame by frame. It works out each cell's delay from its distance to where the wave starts (22 ms per cell, rows counted a little closer so the wave looks round) and leaves it in a custom property, `--d`; the rest is one CSS animation with `animation-delay: var(--d)`.
- The data ([`lib/heatmap-data.ts`](../lib/heatmap-data.ts)) comes from a seeded random (mulberry32), so a pattern always draws the same year. The colour levels are the quartiles of the active days, so a quiet year does not look empty and a busy one does not look saturated.
- The first wave plays when 40 % of the grid is in view, from the newest day.

**Accessibility**

- The year is one focusable group. The arrows move a cursor by days and weeks, Home and End go to the ends of the row, and Enter or Space sends the wave from there. The cursor stops at today: the days to come are not in the year yet.
- Each cell says its date and count through one channel, a polite live region. There is no `aria-activedescendant`: inside SVG it is unevenly supported and would say it twice.
- Counts and dates follow the page's language with `Intl` (`PluralRules` picks «1 contribution»; English dates are British, like the site's copy).
- The pattern and palette choices are real radio buttons, styled as pills, so they work with the keyboard and screen readers.

**Layout**

- On a narrow screen the year scrolls sideways instead of shrinking its cells to dots.
- The tooltip sits beside the scrolling frame, not inside it: inside, a tooltip past the frame's edge would widen what scrolls and its scrollbar would flash on and off. It is kept within the plot at both ends, hides when the year scrolls, and is placed in CSS pixels through `zoomOf()` so it stays on its cell under CSS `zoom`.

**Motion**

- **Reduced motion**: no wave and no colour transitions; the cells change at once.

## Use it

```ts
import { mount } from './svg-heatmap';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['svg-heatmap'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false, // not used by this piece
  signal: controller.signal, // abort() unmounts it
});
```

To draw real data, replace `generate(pattern)` with your counts per day, week by week from Monday (`index = week * 7 + weekday`), and keep `levels()` for the colours.

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"svg-heatmap"`. Templates keep their `{placeholders}`: the piece fills them.

| Key | English | Spanish |
| --- | --- | --- |
| `label` | A year of activity, one cell per day | Un año de actividad, una celda por día |
| `cell` | {count} contributions on {date} | {count} contribuciones el {date} |
| `cellOne` | 1 contribution on {date} | 1 contribución el {date} |
| `pattern` | Pattern | Patrón |
| `random` | Random | Al azar |
| `weekdays` | Weekdays | Entre semana |
| `streaks` | Streaks | Rachas |
| `palette` | Colour | Color |
| `gold` | Gold | Oro |
| `blue` | Blue | Azul |
| `green` | Green | Verde |
| `hint` | Press a cell, or Enter on it, and the wave starts there. | Pulsa una celda, o Intro sobre ella, y la onda sale desde ahí. |
| `less` | Less | Menos |
| `more` | More | Más |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`, `../shared/zoom.ts`, `../lib/heatmap-data.ts`
- Custom properties from `../shared/tokens.css`: `--color-gold*`, `--color-annotation-blue`, `--color-lab-ok` and `--color-bg-deep` (the three palettes), `--color-ink` (the tooltip).
