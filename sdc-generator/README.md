# SDC component generator

**Tool** · [Live demo](https://andresmoreno28.github.io/lab/#sdc-generator) · [On andresmoreno.dev](https://andresmoreno.dev/en/lab/sdc-generator)

A Drupal Single Directory Component from a form: machine name, name, status, description, props and slots in; out, the three files (`<name>.component.yml`, `<name>.twig`, `<name>.css`) and an example of how to render it, updated as you type, in tabs with a copy button each. What Drupal would reject is said next to the field that has it. The output works with Drupal 10.3 and later, where SDC is part of core.

## How it is built

**What it checks** ([`lib/sdc.ts`](../lib/sdc.ts), no dependencies)

- The checks Drupal makes when it discovers a component: the machine name's pattern (`ComponentMetadata`: a lowercase letter, then letters, digits, `-` or `_`, not ending in either), and prop and slot names that are valid Twig variables, unique, and not taken by the template (`attributes`, `componentMetadata`, `content`).
- The YAML quotes a value only where YAML would read it as something else (`yes`, `no`, numbers, a `: ` inside…).
- A text prop with options, like `variant` with `light, dark`, comes out as an `enum` in the YAML and as a BEM modifier in the template (`attributes.addClass` with `|clean_class`) and in the CSS.
- The example uses `include` without slots and `embed` with them, every prop filled with a sample value.

**Accessibility**

- Every control has its label, and its error, when there is one, sits next to it and is tied to it with `aria-describedby`, with `aria-invalid="true"` on the control. The files dim while something is wrong.
- Each «×» is named by what it removes («Remove title»), and the name follows the field as you type. After a removal the focus goes to «Add a prop» or «Add a slot»; a new row focuses its first field.
- The files are tabs from [`shared/tabs.ts`](../shared/tabs.ts); each file scrolls and takes the focus, named by its tab. «Copy» says «Copied» in a status region.

**Layout and motion**

- On a wide stage (900 px or more) the form and the files sit side by side, and the files stick below `--header-h` as the form scrolls.
- **Reduced motion**: new rows appear without sliding in, and the tab indicator jumps.

## Use it

```ts
import { mount } from './sdc-generator';
import en from './strings/en.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('.lab-stage')!,
  strings: en['sdc-generator'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, // CSS handles it
  compact: false, // not used by this piece
  signal: controller.signal, // abort() unmounts it
});
```

Or only the generator:

```ts
import { componentTwig, componentYml, problems, type SdcInput } from './lib/sdc';

const card: SdcInput = {
  machineName: 'card', label: 'Card', description: '', status: 'stable',
  props: [{ name: 'title', title: 'Title', type: 'string', required: true, options: [] }],
  slots: [{ name: 'body', title: 'Body' }],
};
problems(card); // [] when Drupal would accept it
componentYml(card);
componentTwig(card);
```

See the [mount contract](../README.md#the-mount-contract) for the stage, the styles and the options.

### Strings

The piece reads these keys from `strings/<locale>.json` → `"sdc-generator"`. Templates keep their `{placeholders}`: the piece fills them.

| Key | English | Spanish |
| --- | --- | --- |
| `machineName` | Machine name | Nombre máquina |
| `label` | Name | Nombre |
| `description` | Description | Descripción |
| `status` | Status | Estado |
| `props` | Props | Props |
| `slots` | Slots | Slots |
| `addProp` | Add a prop | Añadir una prop |
| `addSlot` | Add a slot | Añadir un slot |
| `remove` | Remove {name} | Quitar {name} |
| `name` | Name | Nombre |
| `title` | Title | Título |
| `type` | Type | Tipo |
| `required` | Required | Obligatoria |
| `options` | Options, separated by commas | Opciones, separadas por comas |
| `errEmpty` | It needs a name. | Le falta el nombre. |
| `errPattern` | Start with a lowercase letter; then letters, digits, hyphens or underscores, not ending in one. | Empieza por una minúscula; luego letras, números, guiones o guiones bajos, sin acabar en guion. |
| `errVarPattern` | Letters, digits and underscores, starting with a letter. | Letras, números y guiones bajos, empezando por una letra. |
| `errDuplicate` | Another prop or slot already has that name. | Ya hay otra prop o slot con ese nombre. |
| `errReserved` | Drupal already uses that name in the template. | Drupal ya usa ese nombre en la plantilla. |
| `files` | Generated files | Archivos generados |
| `usage` | How to use it | Cómo usarlo |
| `copy` | Copy | Copiar |
| `copied` | Copied | Copiado |

### Files

- `index.ts`, `style.css`
- `../shared/dom.ts`, `../shared/tabs.ts`, `../lib/sdc.ts`
