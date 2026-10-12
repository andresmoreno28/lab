# Lab

The interactive pieces of the lab at [andresmoreno.dev](https://andresmoreno.dev/en/lab): three components, three experiments and three tools, in TypeScript and CSS with no runtime dependencies. They are the code the site runs, set out to be read, tried and copied.

**Live demo:** [andresmoreno28.github.io/lab](https://andresmoreno28.github.io/lab/) <!-- Published from main by .github/workflows/pages.yml once GitHub Pages is enabled. -->

[Leer en español](README.es.md)

## The pieces

| Piece | Kind | What it is |
| --- | --- | --- |
| [`accessible-button`](accessible-button/) | Component | The site's gold button in all its states, sending, sent and disabled, announced and never out of the keyboard's reach. |
| [`depth-card`](depth-card/) | Component | A card that tilts with the pointer or the arrow keys and pulls its layers apart in depth, with a specular glare. |
| [`accessible-tabs`](accessible-tabs/) | Component | WAI-ARIA tabs with arrows, Home and End, automatic or manual activation and an indicator that slides between them. |
| [`particle-network`](particle-network/) | Experiment | Hundreds of particles on a canvas that link to their neighbours, follow the pointer and scatter on a click, at 60 fps thanks to a spatial grid. |
| [`svg-heatmap`](svg-heatmap/) | Experiment | A year of activity in SVG, one cell per day: press a cell and a wave crosses the year from there. |
| [`scroll-depth`](scroll-depth/) | Experiment | A layered paper landscape that parts as you scroll, made only with scroll-driven CSS animations. |
| [`contrast-checker`](contrast-checker/) | Tool | WCAG 2.2 contrast and APCA of two colours, the closest colour that passes, and a matrix of every pair in your palette. |
| [`fluid-type-scale`](fluid-type-scale/) | Tool | The `clamp()` of every step of a type scale between two screens, with a preview you can stretch. |
| [`sdc-generator`](sdc-generator/) | Tool | The three files of a Drupal Single Directory Component from a form, with the checks Drupal makes when it discovers it. |

Each folder has its own README: what the piece does, why it is built that way (accessibility, motion, performance) and how to mount it.

## Run it

You need Node 20.19+ or 22.12+ and [pnpm](https://pnpm.io) 10 (`corepack enable` sets it up from `package.json`).

```sh
pnpm install
pnpm dev         # the gallery, at http://localhost:5173
pnpm test        # Vitest: the maths, the strings, and every piece mounted in a DOM
pnpm typecheck   # TypeScript, strict
pnpm build       # the demo as static files, in dist/
pnpm preview     # serves dist/
```

## Use a piece

The repository is not an npm package: copy what you need. A piece is its folder, plus the files of `shared/` and `lib/` its README lists. Load the styles first, then mount it in a stage:

```ts
import './shared/tokens.css'; // the custom properties the pieces read
import './shared/base.css'; // layer order, a reset scoped to the stage, focus ring, utilities
import './shared/stage.css'; // the dark stage itself
import { mount } from './svg-heatmap';
import en from './strings/en.json';

const root = document.querySelector<HTMLElement>('#heatmap')!; // <div id="heatmap" class="lab-stage">
const controller = new AbortController();

mount({
  root,
  strings: en['svg-heatmap'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false,
  signal: controller.signal,
});

// Later: stop its listeners, timers, observers and animation frames.
controller.abort();
```

Or let `shared/boot.ts` load the piece's chunk on demand and fill in the defaults:

```ts
import { mountPiece } from './shared/boot';

const controller = await mountPiece(root, 'svg-heatmap', { strings: en['svg-heatmap'] });
```

### The mount contract

Every piece exports `mount(context): void` (the `Mount` type of `shared/dom.ts`). It builds its DOM in `root` synchronously and returns nothing; the `signal` unmounts it.

| Field | Type | What it does |
| --- | --- | --- |
| `root` | `HTMLElement` | Where the piece builds itself (it replaces the children). Give it the class `lab-stage`: the pieces lay themselves out with `@container lab-stage` queries, by the stage's width and not the viewport's. |
| `strings` | `Readonly<Record<string, string>>` | Its UI copy: `strings/<locale>.json`, under the piece's name. Templates keep their `{placeholders}`; the piece fills them. A missing key renders empty, it never throws. |
| `reduced` | `boolean` | `prefers-reduced-motion`: show end states, no travel. Read once: mount again to change it. Each piece's CSS also honours the media query on its own. |
| `compact` | `boolean` | The piece's core only. Only the contrast checker uses it (it leaves out the palette matrix); the others ignore it. |
| `signal` | `AbortSignal` | Abort it to unmount: every listener, timer, observer and loop of the piece stops with it. The DOM stays until you empty `root` or mount again. |

`mountPiece(root, piece, options?)` in `shared/boot.ts` returns a promise of the `AbortController`. Its options are `strings` (default `{}`), `reduced` (default: the visitor's `prefers-reduced-motion`) and `compact` (default: whether the stage has a `data-compact` attribute).

The language of numbers and dates is the page's: `document.documentElement.lang`, through `Intl`.

### Styles

- Each piece imports its `style.css` with Vite's `?inline` and adds it to the document once, as a constructed stylesheet (`adopt()` in `shared/dom.ts`). It arrives with the piece's code, and a CSP `style-src` does not apply to it. With another bundler, import the CSS as a string its own way, or link `style.css` and drop the `adopt(css)` line.
- The pieces' CSS lives in the cascade layer `components`. `shared/base.css` (and `tokens.css`) declare the order `reset, tokens, base, layout, components, utilities`. CSS outside any layer beats every layer, so a global rule of your page, like `button { … }`, can restyle a piece: keep page rules in a layer before `components`, or scoped to your own classes.
- Restyle a piece by redefining the custom properties of `shared/tokens.css`, on `:root` or on its stage. The contrast checker and the particle network read some colours with `getComputedStyle` when they mount, so keep those as hex values.

## Browser support

The pieces target what the site supports: Chrome and Edge 111+, Firefox 115+, Safari and iOS 16.4+, Samsung Internet 22+ (they use `color-mix()`, container queries and constructable stylesheets).

- **Scroll depth** needs scroll-driven animations, in Chromium-based browsers and Safari 26. Without them its layers stay still and it says why; nothing breaks.
- **CSS zoom**: the pieces that measure on screen and write CSS pixels (the button's width and ripple, the heatmap's tooltip) divide by the element's zoom, through `currentCSSZoom` where the engine has it and by multiplying the zoom of every ancestor where it does not (WebKit).
- **Clipboard**: the copy buttons fall back to selecting the text when the Clipboard API is missing (plain http, old engines).

## Accessibility

- **Keyboard**: everything works without a pointer. The tabs follow the WAI-ARIA pattern (arrows, Home, End, roving `tabindex`), the heatmap is a grid you move through with the arrows, the depth card tilts with them, the contrast matrix is one tab stop with arrow navigation, and the boxes of code that scroll take the focus, as does the scroll-depth frame.
- **Screen readers**: results are announced through polite live regions (the button's «Sent», the heatmap's day, the contrast verdict once you stop changing it); states are never told by colour alone; disabled stays focusable and says why (`aria-disabled` and `aria-describedby`); invalid fields are marked `aria-invalid="true"` with the error next to them.
- **Reduced motion**: each piece shows its end state instead of travelling, and the parallax and particle animations stay still until asked. Each README says what changes.
- **Targets**: buttons, fields, sliders and the labels of checkboxes and radios are at least 24 px tall (WCAG 2.5.8), most of them 40 to 48 px. The heatmap's day cells are smaller; its keyboard cursor reaches every day.
- **Trusted Types**: no piece writes HTML from a string; the DOM is built with `createElement` and text nodes (`h()` and `s()` in `shared/dom.ts`). The demo runs under `require-trusted-types-for 'script'` with no policy, and `test/trusted-types.test.ts` keeps HTML sinks out of the code.
- Before 1.0.0 the demo was checked with axe-core (WCAG 2.2 A and AA rules) at 390 and 1440 px, in both languages, with and without reduced motion. The contrast checker's sample is left out on purpose: it shows whatever pair you are testing.

## Project layout

```text
accessible-button/ … sdc-generator/   one folder per piece: index.ts, style.css, README.md
shared/
  dom.ts        h() and s() element builders, adopt(), fill(), copy(), loopWhileVisible(), the Mount types
  boot.ts       mountPiece(): lazy loading by name, with defaults
  tabs.ts       enhanceTabs(): WAI-ARIA tabs, used by two pieces
  zoom.ts       zoomOf(): the CSS zoom an element is drawn at
  burst.ts      gold sparks from an element (the demo's «Restart»)
  tokens.css    every custom property the pieces read, with the site's values
  base.css      layer order, a reset scoped to the stage, focus ring, .t-mono, .visually-hidden
  stage.css     the dark stage (.lab-stage), a size container
lib/            the pure logic, no DOM, each with its tests:
                color, fluid-type, sdc, spatial-hash, heatmap-data
strings/        es.json and en.json: each piece's copy, as on the site
demo/           the gallery's own copy and styles
index.html, main.ts   the demo
test/           every piece in a DOM (happy-dom), and the Trusted Types guard
```

## Strings

`strings/es.json` and `strings/en.json` hold, for each piece, the same texts as andresmoreno.dev. To add a language, add a file with the same keys; `strings/strings.test.ts` checks that every piece gets every string it reads and that the placeholders match across languages.

## License

[MIT](LICENSE) © 2026 Andrés Moreno Rubio.

The demo loads the site's typefaces, Playfair, Cabin and Fira Code, from Google Fonts. They are under the SIL Open Font License and are not part of this repository.
