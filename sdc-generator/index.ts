/**
 * SDC generator (lab tool): a Drupal Single Directory Component from a form. The three files
 * and how to use it update as you type, in tabs (shared/tabs.ts), each with a copy button;
 * what Drupal would reject is said next to the field that has it.
 */
import css from './style.css?inline';
import { adopt, copy, fill, h, uid, type Mount, type Strings } from '../shared/dom';
import {
  componentCss,
  componentTwig,
  componentYml,
  includeExample,
  problems,
  PROP_TYPES,
  STATUSES,
  type SdcInput,
  type SdcProblem,
} from '../lib/sdc';
import { enhanceTabs } from '../shared/tabs';

const START: SdcInput = {
  machineName: 'card',
  label: 'Card',
  description: '',
  status: 'stable',
  props: [
    { name: 'title', title: 'Title', type: 'string', required: true, options: [] },
    {
      name: 'variant',
      title: 'Variant',
      type: 'string',
      required: false,
      options: ['light', 'dark'],
    },
    { name: 'featured', title: 'Featured', type: 'boolean', required: false, options: [] },
  ],
  slots: [{ name: 'body', title: 'Body' }],
};

const message = (strings: Strings, problem: SdcProblem) => {
  if (problem.code === 'empty') return strings.errEmpty ?? '';
  if (problem.code === 'duplicate') return strings.errDuplicate ?? '';
  if (problem.code === 'reserved') return strings.errReserved ?? '';
  return problem.field === 'machineName'
    ? (strings.errPattern ?? '')
    : (strings.errVarPattern ?? '');
};

export const mount: Mount = ({ root, strings, signal }) => {
  adopt(css);
  const id = uid('sdc');
  const state: SdcInput = structuredClone(START);
  const errors = new Map<string, HTMLElement>();

  /* A labelled control whose error, if any, is described by an element next to it. */
  const control = (
    key: string,
    label: string,
    element: HTMLInputElement | HTMLSelectElement,
    wide = false,
  ) => {
    const field = `${id}-${key}`;
    element.id = field;
    const error = h('span', { class: 'sdc__error', id: `${field}-error` });
    errors.set(key, error);
    element.setAttribute('aria-describedby', error.id);
    return h(
      'div',
      { class: `sdc__field${wide ? ' sdc__field--wide' : ''}` },
      h('label', { for: field }, label),
      element,
      error,
    );
  };
  const text = (value: string, onInput: (value: string) => void, mono = false) => {
    const input = h('input', {
      type: 'text',
      value,
      spellcheck: false,
      autocomplete: 'off',
      class: mono ? 'sdc__input t-mono' : 'sdc__input',
    });
    input.addEventListener(
      'input',
      () => {
        onInput(input.value);
        render();
      },
      { signal },
    );
    return input;
  };

  const status = h(
    'select',
    { class: 'sdc__input' },
    ...STATUSES.map((value) => h('option', { value, selected: value === state.status }, value)),
  );
  status.addEventListener(
    'change',
    () => {
      state.status = status.value as SdcInput['status'];
      render();
    },
    { signal },
  );

  const head = h(
    'div',
    { class: 'sdc__head' },
    control(
      'machineName',
      strings.machineName ?? '',
      text(state.machineName, (v) => (state.machineName = v.trim()), true),
    ),
    control(
      'label',
      strings.label ?? '',
      text(state.label, (v) => (state.label = v)),
    ),
    control('status', strings.status ?? '', status),
    control(
      'description',
      strings.description ?? '',
      text(state.description, (v) => (state.description = v)),
      true,
    ),
  );

  const propList = h('ol', { class: 'sdc__list', role: 'list' });
  const slotList = h('ol', { class: 'sdc__list', role: 'list' });

  /* Each «×» says what it removes; its name follows the field as it is typed (render()). */
  let removers: { button: HTMLButtonElement; name: () => string }[] = [];
  const removeButton = (
    onRemove: () => void,
    focusAfter: () => HTMLElement | null,
    name: () => string,
  ) => {
    const button = h('button', { type: 'button', class: 'sdc__remove' }, '×');
    removers.push({ button, name });
    button.addEventListener(
      'click',
      () => {
        onRemove();
        rebuild();
        focusAfter()?.focus();
      },
      { signal },
    );
    return button;
  };

  const rebuild = () => {
    for (const key of [...errors.keys()]) if (/^(?:prop|slot)\d/.test(key)) errors.delete(key);
    removers = [];
    propList.replaceChildren(
      ...state.props.map((prop, index) => {
        const type = h(
          'select',
          { class: 'sdc__input' },
          ...PROP_TYPES.map((value) =>
            h('option', { value, selected: value === prop.type }, value),
          ),
        );
        const options = text(
          prop.options.join(', '),
          (v) =>
            (prop.options = v
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)),
        );
        const optionsField = control(`prop${index}-options`, strings.options ?? '', options);
        optionsField.hidden = prop.type !== 'string';
        type.addEventListener(
          'change',
          () => {
            prop.type = type.value as (typeof PROP_TYPES)[number];
            optionsField.hidden = prop.type !== 'string';
            render();
          },
          { signal },
        );
        const required = h('input', {
          type: 'checkbox',
          id: `${id}-prop${index}-required`,
          checked: prop.required,
        });
        required.addEventListener(
          'change',
          () => {
            prop.required = required.checked;
            render();
          },
          { signal },
        );
        return h(
          'li',
          { class: 'sdc__item' },
          control(
            `prop${index}`,
            strings.name ?? '',
            text(prop.name, (v) => (prop.name = v.trim()), true),
          ),
          control(
            `prop${index}-title`,
            strings.title ?? '',
            text(prop.title, (v) => (prop.title = v)),
          ),
          control(`prop${index}-type`, strings.type ?? '', type),
          h(
            'label',
            { class: 'sdc__check', for: `${id}-prop${index}-required` },
            required,
            strings.required ?? '',
          ),
          optionsField,
          removeButton(
            () => state.props.splice(index, 1),
            () => addProp,
            () => prop.name,
          ),
        );
      }),
    );
    slotList.replaceChildren(
      ...state.slots.map((slot, index) =>
        h(
          'li',
          { class: 'sdc__item sdc__item--slot' },
          control(
            `slot${index}`,
            strings.name ?? '',
            text(slot.name, (v) => (slot.name = v.trim()), true),
          ),
          control(
            `slot${index}-title`,
            strings.title ?? '',
            text(slot.title, (v) => (slot.title = v)),
          ),
          removeButton(
            () => state.slots.splice(index, 1),
            () => addSlot,
            () => slot.name,
          ),
        ),
      ),
    );
    render();
  };

  const addProp = h('button', { type: 'button', class: 'sdc__add' }, strings.addProp ?? '');
  addProp.addEventListener(
    'click',
    () => {
      state.props.push({ name: '', title: '', type: 'string', required: false, options: [] });
      rebuild();
      propList.lastElementChild?.querySelector('input')?.focus();
    },
    { signal },
  );
  const addSlot = h('button', { type: 'button', class: 'sdc__add' }, strings.addSlot ?? '');
  addSlot.addEventListener(
    'click',
    () => {
      state.slots.push({ name: '', title: '' });
      rebuild();
      slotList.lastElementChild?.querySelector('input')?.focus();
    },
    { signal },
  );

  /* Output: a tab per file, and how to use it. */
  const files = [
    { key: 'yml', label: () => `${state.machineName || '…'}.component.yml`, make: componentYml },
    { key: 'twig', label: () => `${state.machineName || '…'}.twig`, make: componentTwig },
    { key: 'css', label: () => `${state.machineName || '…'}.css`, make: componentCss },
    {
      key: 'usage',
      label: () => strings.usage ?? '',
      make: (input: SdcInput) => includeExample(input),
    },
  ];
  const tabs = files.map((file, index) =>
    h('button', {
      type: 'button',
      role: 'tab',
      id: `${id}-tab-${file.key}`,
      'aria-controls': `${id}-panel-${file.key}`,
      'aria-selected': String(index === 0),
      tabindex: index === 0 ? 0 : -1,
      class: 'sdc__tab t-mono',
    }),
  );
  const codes = files.map(() => h('code', {}));
  const panels = files.map((file, index) => {
    // The file scrolls: it takes the focus itself, named by its tab (the panel holds buttons).
    const pre = h(
      'pre',
      {
        class: 'sdc__code t-mono',
        tabindex: 0,
        role: 'region',
        'aria-labelledby': `${id}-tab-${file.key}`,
      },
      codes[index]!,
    );
    const said = h('span', { class: 'sdc__copied', role: 'status' });
    const button = h('button', { type: 'button', class: 'sdc__copy' }, strings.copy ?? '');
    button.addEventListener(
      'click',
      () => void copy(codes[index]!.textContent ?? '', pre, said, strings.copied ?? ''),
      { signal },
    );
    return h(
      'div',
      {
        role: 'tabpanel',
        id: `${id}-panel-${file.key}`,
        'aria-labelledby': `${id}-tab-${file.key}`,
        hidden: index !== 0,
        class: 'sdc__panel',
      },
      pre,
      h('div', { class: 'sdc__actions' }, button, said),
    );
  });
  const indicator = h('span', {
    class: 'sdc__indicator',
    'data-tab-indicator': true,
    'aria-hidden': 'true',
  });
  const tablist = h(
    'div',
    { role: 'tablist', 'aria-label': strings.files ?? '', class: 'sdc__tabs' },
    ...tabs,
    indicator,
  );

  const render = () => {
    const found = problems(state);
    for (const { button, name } of removers) {
      button.setAttribute('aria-label', fill(strings.remove ?? '', { name: name() || '…' }));
    }
    errors.forEach((error) => (error.textContent = ''));
    for (const element of root.querySelectorAll('[aria-invalid]'))
      element.removeAttribute('aria-invalid');
    for (const problem of found) {
      const key =
        problem.field === 'machineName' || problem.field === 'label'
          ? problem.field
          : `${problem.field}${problem.index}`;
      const error = errors.get(key);
      if (!error) continue;
      error.textContent = message(strings, problem);
      document
        .getElementById(error.id.replace(/-error$/, ''))
        ?.setAttribute('aria-invalid', 'true');
    }
    files.forEach((file, index) => {
      tabs[index]!.textContent = file.label();
      codes[index]!.textContent = file.make(state);
    });
    root.querySelector('.sdc')?.toggleAttribute('data-invalid', found.length > 0);
  };

  root.replaceChildren(
    h(
      'div',
      { class: 'sdc' },
      h(
        'form',
        { class: 'sdc__form', novalidate: true },
        head,
        h(
          'fieldset',
          { class: 'sdc__group' },
          h('legend', {}, strings.props ?? ''),
          propList,
          addProp,
        ),
        h(
          'fieldset',
          { class: 'sdc__group' },
          h('legend', {}, strings.slots ?? ''),
          slotList,
          addSlot,
        ),
      ),
      h('div', { class: 'sdc__output' }, tablist, ...panels),
    ),
  );
  root
    .querySelector('form')
    ?.addEventListener('submit', (event) => event.preventDefault(), { signal });
  rebuild();
  enhanceTabs(tablist, { signal });
};
