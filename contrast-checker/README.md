# Contrast checker

**Tool** · [Live demo](https://andresmoreno28.github.io/lab/#contrast-checker) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/contrast-checker)

Text and background in; out, the WCAG 2.2 contrast ratio and what it passes, the APCA lightness contrast, a live sample, the nearest colour of the same hue that passes AA, and a matrix with the contrast of every pair in your palette.

It opens with the site's own gold (`#d6a35f`) on its paper (`#f2e7d4`): 1.85:1, lovely as decoration, but not enough even for large text. That is why the site sets gold text on paper in a darker token.

## How it is built

**The maths** ([`lib/color.ts`](../lib/color.ts), no dependencies)

- **WCAG 2.2**: relative luminance and the contrast ratio, and what it passes for normal text, large text and user interface components (criteria 1.4.3, 1.4.6 and 1.4.11).
- **APCA** Lc (APCA-W3 0.0.98G-4g): a perceptual contrast that knows whether the text is light on dark or dark on light, signed by polarity. A second opinion, not a WCAG 2.2 requirement.
- **The fix**: the closest colour that reaches 4.5:1 is searched in OKLCH, darker and lighter, changing only the lightness and never the hue, so the brand is still the brand. Out-of-gamut colours lose chroma, never lightness or hue.

**Accessibility**

- Never by colour alone (WCAG 1.4.1): each badge says its result three ways, a ✓ or ✕, its colour, and «passes» or «fails» as text for screen readers.
- The verdict is announced by a polite live region 600 ms after the last change, so dragging the colour picker does not flood a screen reader.
- The sample is hidden from assistive technology: it shows the pair under test, which may fail on purpose, and its ratio is already read out.
- A hex value that does not parse marks its field `aria-invalid="true"` (an empty `aria-invalid` reads as false).
- The matrix is one tab stop: the arrows move between pairs (roving `tabindex`) and skip the diagonal, where a colour meets itself. Each pair is named «text / background: ratio», and pressing it loads it into the checker above.

**Motion**

- The ratio counts up to its new value over 450 ms and the ring fills with it on a log scale (1:1 empty, 21:1 full); the matrix cells pop in one after another.
- **Reduced motion**: the number is set at once, nothing transitions or pops in, and picking a pair scrolls to the checker without a smooth scroll.

## Use it

```ts
import { mount } from './contrast-checker';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['contrast-checker'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false, // true: the checker alone, without the palette matrix
  signal: controller.signal, // abort() unmounts it
});
```

The starting pair and palette are read from the stage's custom properties when it mounts (`--color-gold` on `--color-paper`, then `--color-ink`, `--color-ink-muted`, `--color-gold`, `--color-gold-text`, `--color-annotation-blue`, `--color-paper` and `--color-bg-dark`), as hex values. Redefine them and it starts with your palette.

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"contrast-checker"`.

| Key | English | Spanish |
| --- | --- | --- |
| `text` | Text | Texto |
| `background` | Background | Fondo |
| `swap` | Swap text and background | Intercambiar texto y fondo |
| `sample` | What can't be read doesn't exist. | Lo que no se lee, no existe. |
| `ratio` | Contrast | Contraste |
| `apca` | APCA Lc | APCA Lc |
| `normal` | Normal text | Texto normal |
| `large` | Large text | Texto grande |
| `ui` | Icons and borders | Iconos y bordes |
| `aa` | AA | AA |
| `aaa` | AAA | AAA |
| `pass` | passes | cumple |
| `fail` | fails | no cumple |
| `suggest` | The closest colour that passes AA as text: | El color más parecido que cumple AA como texto: |
| `use` | Use it | Usarlo |
| `palette` | Your palette | Tu paleta |
| `paletteHint` | One colour per line, in hex, up to ten. It starts with this site's. | Un color por línea, en hexadecimal, hasta diez. Viene con la de esta web. |
| `empty` | Write at least two colours to see the matrix. | Escribe al menos dos colores para ver la matriz. |
| `matrix` | Contrast of every pair: rows are the text, columns the background. Press one to see it above. | Contraste de cada par: filas, el texto; columnas, el fondo. Pulsa uno para verlo arriba. |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`, `../lib/color.ts`
