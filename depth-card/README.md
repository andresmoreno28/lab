# Depth card

**Component** · [Live demo](https://andresmoreno28.github.io/lab/#depth-card) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/depth-card)

A card that tilts towards the pointer (up to 14°), with paper layers at different depths that slide against each other and a glare that follows the light. «Pull the layers apart» turns it three-quarters and spreads the layers out, to see how it is built: the quickest way to show what a layer is and why their order matters.

## How it is built

**Performance**

- The card is a `transform-style: preserve-3d` container and each layer sits at its own depth with `translateZ` (sky 0, sun 10, far ridge 22, near ridge 38, text 58, badge 72, glare 80 px). «Pull the layers apart» multiplies every depth by 3.2.
- The script only writes four custom properties, the tilt on both axes and where the light is (`--rx`, `--ry`, `--lx`, `--ly`), at most once per animation frame. Everything else is CSS transforms: the browser composites them and never lays out the page on a move.
- Each layer also scales by `1 − depth × spread / 900`, cancelling the growth the 900 px perspective gives it, so it keeps the card's size and only the parallax shows.
- The glare is a plain translucent gradient, not a blend mode: `mix-blend-mode` on a child flattens the card's `preserve-3d` and the layers would lose their depth.

**Accessibility**

- The card takes the focus (`role="group"` with a label that says how to use it): the arrow keys tilt it 4° per press, Home or Escape straighten it.
- The text sits on the dark near layer, so its contrast never depends on the angle.
- The two switches are real checkboxes with their labels.

**Motion**

- Following the pointer, the card eases over 120 ms, so it tracks without lag; back at rest, over 700 ms.
- **Reduced motion**: it does not follow the pointer and nothing transitions. The keyboard tilt and the exploded view still work, as instant changes.

## Use it

```ts
import { mount } from './depth-card';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['depth-card'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false, // not used by this piece
  signal: controller.signal, // abort() unmounts it
});
```

To take only the effect, copy `style.css` and the four lines that write `--rx`, `--ry`, `--lx` and `--ly` as the pointer moves. The layers can be anything: a cut-out photo, an SVG or the text of a card.

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"depth-card"`.

| Key | English | Spanish |
| --- | --- | --- |
| `title` | Layers with depth | Capas con profundidad |
| `text` | Each layer moves at its own pace: the near one more, the far one less. | Cada capa se mueve a su ritmo: la cercana más, la lejana menos. |
| `label` | Tilting card: focus it and use the arrow keys | Tarjeta inclinable: enfócala y usa las flechas |
| `glare` | Glare | Brillo |
| `explode` | Pull the layers apart | Separar las capas |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`
- Custom properties from `../shared/tokens.css`: `--color-paper`, `--color-gold*`, `--color-annotation-blue`, `--color-bg-dark`, `--color-ink`, `--color-display-cream`, `--font-display`.
