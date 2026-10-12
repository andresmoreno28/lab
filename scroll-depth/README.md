# Scroll depth

**Experiment** · [Live demo](https://andresmoreno28.github.io/lab/#scroll-depth) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/scroll-depth)

A layered paper landscape that parts as you scroll inside its frame, made only with scroll-driven CSS animations: no scroll listeners and no `requestAnimationFrame`. «Show each layer's timeline» shows how each layer moves with the same scroll.

## How it is built

**Scroll as the clock**

- A normal CSS animation moves with time. Here the frame names its scroll as a timeline (`scroll-timeline: --sd-scroll block`): 0 % at the top, 100 % at the bottom. Every layer runs the same keyframes on that timeline (`animation-timeline: --sd-scroll`), scaled by its own `--speed`: the sun 8 %, the ridges 15, 35, 60 and 100 %. The far layers barely move; the near ones rise and cover the rest.
- The browser runs it on the compositor, so it stays smooth even when the page is busy. The script only builds the markup, which could as well be plain HTML, and checks `CSS.supports('animation-timeline: scroll()')`.
- The animations are declared only inside `@supports (animation-timeline: scroll())`: without a scroll timeline, an animation would run on the document's clock and stop on its last frame. Without support, the layers keep their resting pose and the piece says why.
- The timing function stays a custom property (`--sd-ease`): with a plain `linear` the CSS minifier folds the timeline into the `animation` shorthand, which browsers reject.

**Accessibility**

- The frame is a focusable, named region (`role="region"`, `tabindex="0"`), so the keyboard scrolls it with the arrows and Page keys. `overscroll-behavior: contain` keeps the page from scrolling when it reaches an end.

**Motion**

- **Reduced motion**: the layers stay still. Parallax is exactly the kind of motion that makes people dizzy.

## Browser support

Scroll-driven animations ship in Chromium-based browsers and in Safari 26. Elsewhere (Firefox, at the time of writing, unless enabled by a flag) the landscape stays still and the piece shows the `unsupported` string.

## Use it

```ts
import { mount } from './scroll-depth';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['scroll-depth'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, // CSS handles it too
  compact: false, // not used by this piece
  signal: controller.signal, // abort() unmounts it
});
```

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"scroll-depth"`. Templates keep their `{placeholders}`: the piece fills them.

| Key | English | Spanish |
| --- | --- | --- |
| `label` | Layered landscape: scroll inside the frame | Paisaje en capas: desplázate dentro del marco |
| `hint` | Scroll inside the frame: each layer moves at its own speed, without a line of JavaScript. | Desplázate dentro del marco: cada capa va a su velocidad, sin una línea de JavaScript. |
| `timelines` | Show each layer's timeline | Ver la línea de tiempo de cada capa |
| `unsupported` | Your browser has no scroll-driven animations yet: the layers stay still. | Tu navegador aún no tiene animaciones ligadas al scroll: las capas se quedan quietas. |
| `layer` | Layer {n} · {speed} % | Capa {n} · {speed} % |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`
- Custom properties from `../shared/tokens.css`: `--color-paper`, `--color-annotation-blue`, `--color-bg-dark`, `--color-gold*`.
