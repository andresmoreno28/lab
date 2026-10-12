# Accessible button

**Component** · [Live demo](https://andresmoreno28.github.io/lab/#accessible-button) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/accessible-button)

The gold button of andresmoreno.dev through its whole life: idle, sending, sent and back again, plus a disabled state and a switch that draws the area you can press. It is the component every site repeats most, and the one most often done wrong: a `div` with a click handler, a loading state nobody announces, or a `disabled` that drops it from the keyboard without saying why.

## How it is built

**Accessibility**

- **Sending** sets `aria-busy` and a new label, but the button is not disabled: it keeps the focus.
- **Sent** is said by an `aria-live="polite"` region. The tick that draws itself is decorative (`aria-hidden`): you do not need to see it to know.
- **Disabled** uses `aria-disabled="true"`, not `disabled`, so the button stays in the tab order and is still announced. While it is disabled, `aria-describedby` points at the visible reason, and the click handler ignores presses.
- **Target size**: the button is 48 px tall; WCAG 2.2 asks for at least 24 × 24 px (2.5.8). «Show the area you can press» draws the button's box and the 24 px minimum inside it.
- The focus ring is the site's: 3 px of `--color-gold-text`, 4 px clear of the button. Hover effects only apply on devices that hover (`@media (hover: hover)`).

**Motion**

- The width follows the label instead of jumping (FLIP): the button is measured before and after the label changes, and the difference is animated over 420 ms with the site's ease-out curve.
- The ripple starts exactly where you press and removes itself when its animation ends.
- Both are measured on the screen and divided by `zoomOf()` (`shared/zoom.ts`), so they stay right under CSS `zoom` (the site zooms the page past 1920 px).
- **Reduced motion**: no ripple, no width animation and no drawing of the tick; the spinner turns slower (2.4 s a turn) and «sending» lasts 300 ms instead of 1.3 s. The states still change.

## Use it

```ts
import { mount } from './accessible-button';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['accessible-button'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false, // not used by this piece
  signal: controller.signal, // abort() unmounts it
});
```

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"accessible-button"`.

| Key | English | Spanish |
| --- | --- | --- |
| `label` | Send message | Enviar mensaje |
| `loading` | Sending… | Enviando… |
| `done` | Sent | Enviado |
| `states` | Try its states | Prueba sus estados |
| `disabled` | Disabled | Desactivado |
| `target` | Show the area you can press | Ver el área que se puede pulsar |
| `reset` | Again | Otra vez |
| `why` | Disabled: write your message first. | Desactivado: primero escribe tu mensaje. |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`, `../shared/zoom.ts`
- Custom properties from `../shared/tokens.css`: the gold button colours, `--color-lab-ok` (sent), `--color-annotation-blue` and `--color-lab-bad` (the target overlay).
