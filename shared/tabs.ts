/**
 * WAI-ARIA tabs (APG «Tabs»): ← → move between tabs, Home and End jump to the ends, and the
 * selection follows the focus («automatic») or waits for Enter or Space («manual»). An
 * indicator slides to the selected tab through two custom properties the CSS animates. Used by
 * the accessible-tabs and sdc-generator pieces (and the site's home lab window). No
 * dependencies: copy the file.
 *
 * Markup it expects: [role=tablist] > [role=tab][aria-controls], panels [role=tabpanel] with
 * those ids, and optionally an element with [data-tab-indicator] inside the tablist.
 */
export interface TabsOptions {
  automatic?: boolean;
  /** Called after a tab is selected, with its index. */
  onSelect?: (index: number, tab: HTMLElement) => void;
  signal?: AbortSignal;
}

export interface Tabs {
  select: (index: number, focus?: boolean) => void;
  setAutomatic: (automatic: boolean) => void;
  readonly selected: number;
}

export function enhanceTabs(tablist: HTMLElement, options: TabsOptions = {}): Tabs {
  const tabs = [...tablist.querySelectorAll<HTMLElement>('[role="tab"]')];
  const panels = tabs.map((tab) =>
    document.getElementById(tab.getAttribute('aria-controls') ?? ''),
  );
  const indicator = tablist.querySelector<HTMLElement>('[data-tab-indicator]');
  let automatic = options.automatic ?? true;
  let selected = Math.max(
    0,
    tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'),
  );

  const place = () => {
    const tab = tabs[selected];
    if (!indicator || !tab) return;
    indicator.style.setProperty('--tab-x', `${tab.offsetLeft}px`);
    indicator.style.setProperty('--tab-w', `${tab.offsetWidth}px`);
  };

  const select = (index: number, focus = false, notify = true) => {
    selected = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, at) => {
      const on = at === selected;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    // Tabs may share one panel (the site's home window). Each panel is set once, and the one that
    // stays shown is never hidden on the way: hiding it, even for a moment, blurs its focus.
    const shown = panels[selected];
    for (const panel of new Set(panels)) if (panel) panel.hidden = panel !== shown;
    if (focus) tabs[selected]?.focus();
    place();
    if (notify) options.onSelect?.(selected, tabs[selected]!);
  };

  const focusOnly = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, at) => (tab.tabIndex = at === next ? 0 : -1));
    tabs[next]?.focus();
  };

  const current = () => Math.max(0, tabs.indexOf(document.activeElement as HTMLElement));
  const move = (index: number) => (automatic ? select(index, true) : focusOnly(index));

  tablist.addEventListener(
    'keydown',
    (event) => {
      const keys: Record<string, () => void> = {
        ArrowRight: () => move(current() + 1),
        ArrowLeft: () => move(current() - 1),
        Home: () => move(0),
        End: () => move(tabs.length - 1),
      };
      const action = keys[event.key];
      if (action) {
        event.preventDefault();
        action();
      } else if (event.key === ' ' || (!automatic && event.key === 'Enter')) {
        // Space never scrolls the page from a tab (a tab may be a link); it selects it, as
        // Enter does in manual mode (in automatic mode Enter already clicks the tab).
        event.preventDefault();
        select(current(), true);
      }
    },
    { signal: options.signal },
  );
  tabs.forEach((tab, index) =>
    tab.addEventListener(
      'click',
      (event) => {
        // A tab may be a link (the site's home window keeps its href as the no-script way).
        event.preventDefault();
        select(index, true);
      },
      { signal: options.signal },
    ),
  );
  if ('ResizeObserver' in window) {
    // The list and each tab: a tab whose label changes (a file name) moves the indicator too.
    const observer = new ResizeObserver(place);
    observer.observe(tablist);
    tabs.forEach((tab) => observer.observe(tab));
    options.signal?.addEventListener('abort', () => observer.disconnect());
  }
  select(selected, false, false);

  return {
    select,
    setAutomatic: (value) => (automatic = value),
    get selected() {
      return selected;
    },
  };
}
