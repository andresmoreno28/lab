/**
 * Accessible tabs (lab component): the tabs of shared/tabs.ts showing their own source, HTML,
 * CSS and TypeScript, with a switch between automatic and manual activation.
 */
import css from './style.css?inline';
import { adopt, h, uid, type Mount } from '../shared/dom';
import { enhanceTabs } from '../shared/tabs';

const SOURCE = {
  markup: `<div class="tabs__list" role="tablist" aria-label="…">
  <button role="tab" id="t1" aria-controls="p1" aria-selected="true">HTML</button>
  <button role="tab" id="t2" aria-controls="p2" aria-selected="false" tabindex="-1">CSS</button>
  <span class="tabs__indicator" data-tab-indicator></span>
</div>
<div role="tabpanel" id="p1" aria-labelledby="t1" tabindex="0">…</div>
<div role="tabpanel" id="p2" aria-labelledby="t2" tabindex="0" hidden>…</div>`,
  styles: `.tabs__list { position: relative; display: flex; }

/* The indicator slides to the tab the script measured. */
.tabs__indicator {
  position: absolute;
  inset: auto auto 0 0;
  width: var(--tab-w);
  height: 3px;
  translate: var(--tab-x) 0;
  transition: translate 450ms cubic-bezier(0.16, 1, 0.3, 1),
    width 450ms cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  .tabs__indicator { transition: none; }
}`,
  script: `const tabs = enhanceTabs(list, { automatic: true });

// ← → move, Home and End jump. Automatic: the panel follows the
// focus. Manual: it waits for Enter or Space (for heavy panels).
list.addEventListener('keydown', (event) => { /* … */ });

// Only the selected tab is in the tab order (roving tabindex):
tab.tabIndex = selected ? 0 : -1;
panel.hidden = !selected;`,
} as const;

export const mount: Mount = ({ root, strings, signal }) => {
  adopt(css);
  const id = uid('tabs');
  const names = ['markup', 'styles', 'script'] as const;
  const tabs = names.map((name, index) =>
    h(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `${id}-tab-${name}`,
        'aria-controls': `${id}-panel-${name}`,
        'aria-selected': String(index === 0),
        tabindex: index === 0 ? 0 : -1,
        class: 'at__tab',
      },
      strings[name] ?? '',
    ),
  );
  const indicator = h('span', {
    class: 'at__indicator',
    'data-tab-indicator': true,
    'aria-hidden': 'true',
  });
  const tablist = h(
    'div',
    { class: 'at__list', role: 'tablist', 'aria-label': strings.label ?? '' },
    ...tabs,
    indicator,
  );
  const panels = names.map((name, index) =>
    h(
      'div',
      {
        role: 'tabpanel',
        id: `${id}-panel-${name}`,
        'aria-labelledby': `${id}-tab-${name}`,
        tabindex: 0,
        class: 'at__panel',
        hidden: index !== 0,
      },
      h('pre', { class: 'at__code t-mono' }, h('code', {}, SOURCE[name])),
    ),
  );

  const mode = h('fieldset', { class: 'at__mode' }, h('legend', {}, strings.activation ?? ''));
  const control = enhanceTabs(tablist, { automatic: true, signal });
  (['automatic', 'manual'] as const).forEach((value, index) => {
    const input = h('input', {
      type: 'radio',
      name: `${id}-mode`,
      id: `${id}-${value}`,
      value,
      checked: index === 0,
    });
    input.addEventListener('change', () => control.setAutomatic(value === 'automatic'), { signal });
    mode.append(
      h('label', { for: `${id}-${value}`, class: 'at__option' }, input, strings[value] ?? ''),
    );
  });

  root.replaceChildren(
    h(
      'div',
      { class: 'at' },
      h('p', { class: 'at__hint' }, strings.hint ?? ''),
      h('div', { class: 'at__window' }, tablist, ...panels),
      mode,
    ),
  );
  // The indicator needs the tabs laid out: place it once they are in the page.
  control.select(control.selected, false);
};
