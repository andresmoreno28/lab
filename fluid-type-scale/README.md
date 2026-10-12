# Fluid type scale

**Tool** · [Live demo](https://andresmoreno28.github.io/lab/#fluid-type-scale) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/fluid-type-scale)

Pick the narrowest screen, the widest, the base size at each and the scale at each (minor third, major third, perfect fourth or perfect fifth), and get the `clamp()` of every step as custom properties, ready to copy. A preview you can stretch from 320 to 1600 px shows each step at that width, and a chart draws how each one grows, with a dashed line at the preview's width.

## How it is built

**The maths** ([`lib/fluid-type.ts`](../lib/fluid-type.ts), no dependencies)

- Each step has a size on the narrowest screen and another on the widest; in between it grows in a straight line, and `clamp()` holds it outside that range. With a tighter scale on phones and a wider one on desktops, headings grow much more than body text, which is what a large screen asks for.
- The ends are in `rem`, so the scale follows the text size each person sets in their browser; the `vw` only sets the slope. A size made only of `vw` would not grow with the browser's text size, and every step keeps its ends in `rem` (WCAG 1.4.4).

**Validation**

- What is being typed and what the output shows are kept apart: the CSS always comes from the last valid scale, so an invalid value never reaches it.
- Each field checks its own range, and the two screens must leave room between them (or the slope divides by zero or turns negative). A field out of range is marked `aria-invalid="true"`; a range with no room shows its error and ties it to the field with `aria-describedby`.

**Accessibility and the rest**

- The preview starts at the width of the screen it is opened on: on a phone, what the scale gives a phone.
- The CSS block takes the focus (it scrolls when the scale is long). «Copy the CSS» uses the Clipboard API and says «Copied» in a status region; where the API is missing (plain http, old engines) it selects the text instead.
- **Reduced motion**: the preview resizes without a transition.

## Use it

```ts
import { mount } from './fluid-type-scale';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['fluid-type-scale'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false, // not used by this piece
  signal: controller.signal, // abort() unmounts it
});
```

Or only the maths:

```ts
import { toCss, typeScale } from './lib/fluid-type';

toCss(
  typeScale({
    minViewport: 360, maxViewport: 1440,
    minBase: 16, maxBase: 19,
    minRatio: 1.2, maxRatio: 1.333,
    stepsDown: 1, stepsUp: 5,
  }),
);
// :root {
//   --step--1: clamp(…);
//   --step-0: clamp(1rem, 0.9375rem + 0.2778vw, 1.1875rem);
//   …
// }
```

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"fluid-type-scale"`. Templates keep their `{placeholders}`: the piece fills them.

| Key | English | Spanish |
| --- | --- | --- |
| `minViewport` | Narrowest screen (px) | Pantalla más estrecha (px) |
| `maxViewport` | Widest screen (px) | Pantalla más ancha (px) |
| `minBase` | Base text on the narrowest (px) | Texto base en la estrecha (px) |
| `maxBase` | Base text on the widest (px) | Texto base en la ancha (px) |
| `minRatio` | Scale on the narrowest | Escala en la estrecha |
| `maxRatio` | Scale on the widest | Escala en la ancha |
| `minorThird` | Minor third | Tercera menor |
| `majorThird` | Major third | Tercera mayor |
| `fourth` | Perfect fourth | Cuarta justa |
| `fifth` | Perfect fifth | Quinta justa |
| `preview` | Preview width | Ancho de la vista previa |
| `sample` | Type that breathes with the screen | Tipografía que respira con la pantalla |
| `copy` | Copy the CSS | Copiar el CSS |
| `copied` | Copied | Copiado |
| `step` | Step {n} | Paso {n} |
| `errRange` | The widest screen has to be wider than the narrowest. | La pantalla más ancha tiene que ser mayor que la más estrecha. |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`, `../lib/fluid-type.ts`
