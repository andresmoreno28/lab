# Particle network

**Experiment** · [Live demo](https://andresmoreno28.github.io/lab/#particle-network) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/particle-network)

Hundreds of particles drift on a canvas, link to their neighbours within a reach, lean towards the pointer and scatter on a click. Sliders set how many there are (40–420) and how far they link (60–180 px); a line below counts particles, links and frames per second.

## How it is built

**Performance**

- **Do not compare everything with everything.** Finding the links by checking every pair is n²/2 comparisons: about 80,000 per frame with 400 particles. A uniform grid ([`lib/spatial-hash.ts`](../lib/spatial-hash.ts)) buckets the particles into cells as wide as the link distance, and each particle only reads the 3 × 3 cells around it: O(n) per frame.
- **Few canvas calls.** The links are grouped into eight opacity bands, one `Path2D` and one stroke per band, so a frame strokes eight times however many links there are. The particles are filled in one path per colour.
- The canvas draws at the device's pixel ratio, capped at 2. The starting count is one particle per ~2,600 px² of canvas (between 60 and 420): dense on a desktop, lighter on a phone.
- **It spends nothing it does not show.** The loop runs only while the canvas is on screen and the tab is visible (`IntersectionObserver` and `visibilitychange`, in `loopWhileVisible()` of `shared/dom.ts`), and it stops asking for frames while paused. Each step is capped at 50 ms, so a slow frame never throws the particles across the canvas.

**Accessibility**

- The canvas is an image with a name that says what the pointer does (`role="img"`, `aria-label`).
- The controls are real controls: labelled range inputs with their `<output>`, and buttons. The statistics line changes twice a second, so it is hidden from screen readers.
- On touch screens the pointer does not pull (a finger would drag the network along), and `touch-action: pan-y` keeps the page scrolling; a tap still scatters.

**Motion**

- **Reduced motion**: the network starts still, drawn once, and the button says «Resume»: you set it going.

## Use it

```ts
import { mount } from './particle-network';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['particle-network'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false, // not used by this piece
  signal: controller.signal, // abort() stops the loop and the observers
});
```

The colours are read from the stage's custom properties when it mounts (`--color-gold`, `--color-display-cream`, `--color-annotation-blue`): restyle it by redefining them.

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"particle-network"`. Templates keep their `{placeholders}`: the piece fills them.

| Key | English | Spanish |
| --- | --- | --- |
| `label` | Particle network: the pointer pulls them and a click scatters them | Red de partículas: el puntero las atrae y un clic las dispersa |
| `density` | Particles | Partículas |
| `reach` | Link distance | Distancia de enlace |
| `pause` | Pause | Pausar |
| `play` | Resume | Reanudar |
| `burst` | Scatter | Dispersar |
| `stats` | {n} particles · {links} links · {fps} fps | {n} partículas · {links} enlaces · {fps} fps |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`, `../lib/spatial-hash.ts`
