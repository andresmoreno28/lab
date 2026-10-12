# Accessible tabs

**Component** · [Live demo](https://andresmoreno28.github.io/lab/#accessible-tabs) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/accessible-tabs)

WAI-ARIA tabs showing their own source, HTML, CSS and TypeScript, with an indicator that slides and stretches between them and a switch between automatic and manual activation. The behaviour lives in [`shared/tabs.ts`](../shared/tabs.ts), one file with no dependencies; the SDC generator uses it too, and on the site it drives the lab window of the home page.

## How it is built

**Accessibility** (the «Tabs» pattern of the WAI-ARIA Authoring Practices)

- A `tablist`, a `tab` per tab and a `tabpanel` per panel, tied with `aria-controls` and `aria-labelledby`.
- Roving `tabindex`: Tab gets you into the list once, on the selected tab; inside it, ← and → move (and wrap), Home and End jump to the ends.
- **Automatic** activation selects the tab as soon as the arrows reach it: comfortable when panels are light. **Manual** lets you move freely and select with Enter or Space: better when a panel loads something heavy. Space never scrolls the page from a tab.
- The panels take the focus (`tabindex="0"`) and scroll sideways, so the keyboard can scroll the code.
- When tabs share a panel, each panel is set once and the one that stays shown is never hidden on the way: hiding it, even for a moment, would blur its focus.

**Motion**

- The indicator is not a border that comes and goes: the script measures the selected tab and hands its position and width to the CSS (`--tab-x`, `--tab-w`), which animates the slide and the stretch together over 450 ms. A `ResizeObserver` measures again when the list or a tab's label changes size.
- **Reduced motion**: the indicator jumps and the panels appear without fading in.

## Use it

```ts
import { mount } from './accessible-tabs';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['accessible-tabs'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false, // not used by this piece
  signal: controller.signal, // abort() unmounts it
});
```

Or only the behaviour, on your own markup:

```ts
import { enhanceTabs } from './shared/tabs';

// [role=tablist] > [role=tab][aria-controls], panels [role=tabpanel] with those ids, and
// optionally an element with [data-tab-indicator] inside the tablist.
const tabs = enhanceTabs(tablist, {
  automatic: true,
  onSelect: (index, tab) => console.log(index, tab),
  signal, // optional: abort() removes its listeners
});
tabs.select(2, true); // select the third tab and focus it
tabs.setAutomatic(false);
tabs.selected; // the selected index
```

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"accessible-tabs"`.

| Key | English | Spanish |
| --- | --- | --- |
| `label` | This component's code | Código de este componente |
| `markup` | HTML | HTML |
| `styles` | CSS | CSS |
| `script` | TypeScript | TypeScript |
| `activation` | When the tab changes | Cuándo cambia de pestaña |
| `automatic` | On the arrow keys | Al llegar con las flechas |
| `manual` | On Enter or Space | Al pulsar Intro o Espacio |
| `hint` | Try it with the keyboard: Tab to get in, arrows, Home and End. | Pruébalo con el teclado: Tab para entrar, flechas, Inicio y Fin. |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`, `../shared/tabs.ts`
- Custom properties from `../shared/tokens.css`: `--color-gold*`, `--color-on-dark*`, `--color-code-plain`, `--ease-out`.
