/**
 * The demo: every piece in a gallery, mounted live through shared/boot.ts, in Spanish or English.
 * The language switch is a pair of links (`?lang=`), so it works without this script too; with
 * it, the copy changes in place and each piece is unmounted (its AbortSignal) and mounted again
 * with the strings of the other language. «Restart» does the same for one piece.
 */
import './shared/tokens.css';
import './shared/base.css';
import './shared/stage.css';
import './demo/demo.css';
import { COPY, KINDS, LOCALES, type Copy, type Kind, type Locale } from './demo/content';
import { mountPiece, PIECE_NAMES, prefersReducedMotion, type Piece } from './shared/boot';
import { burst } from './shared/burst';
import { fill, h, type Strings } from './shared/dom';
import en from './strings/en.json';
import es from './strings/es.json';

const REPO = 'https://github.com/andresmoreno28/lab';
const STRINGS: Record<Locale, Record<Piece, Strings>> = { es, en };

const isLocale = (value: string | null | undefined): value is Locale =>
  (LOCALES as readonly string[]).includes(value ?? '');

/** `?lang=`, else the first of the visitor's languages the lab speaks, else English. */
function initialLocale(): Locale {
  const asked = new URLSearchParams(window.location.search).get('lang');
  if (isLocale(asked)) return asked;
  const preferred = (navigator.languages?.length ? navigator.languages : [navigator.language])
    .map((tag) => tag.slice(0, 2).toLowerCase())
    .find(isLocale);
  return preferred ?? 'en';
}

let locale = initialLocale();
const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let reduced = prefersReducedMotion(window);

/* Copy that follows the language: each entry rewrites one text or attribute. */
const updates: ((copy: Copy) => void)[] = [];
const bind = <E extends Element>(element: E, get: (copy: Copy) => string, attribute?: string) => {
  updates.push((copy) => {
    if (attribute) element.setAttribute(attribute, get(copy));
    else element.textContent = get(copy);
  });
  return element;
};

/* The pieces: one stage each, remounted when the language or the motion preference changes. */
const stages = new Map<Piece, HTMLElement>();
const controllers = new Map<Piece, AbortController>();
const generations = new Map<Piece, number>();

async function mount(piece: Piece): Promise<void> {
  const stage = stages.get(piece);
  if (!stage) return;
  controllers.get(piece)?.abort();
  const generation = (generations.get(piece) ?? 0) + 1;
  generations.set(piece, generation);
  const controller = await mountPiece(stage, piece, {
    strings: STRINGS[locale][piece],
    reduced,
  });
  // A newer mount started while this one loaded: it wins.
  if (generations.get(piece) !== generation) controller.abort();
  else controllers.set(piece, controller);
}

const mountAll = () => Promise.all(PIECE_NAMES.map(mount));

/* The language switch: links that work without the script, switched in place with it. */
const languageLinks = LOCALES.map((code) => {
  const link = h(
    'a',
    { class: 'demo-lang__link', href: `?lang=${code}`, hreflang: code, lang: code },
    COPY[code].language,
  );
  link.addEventListener('click', (event) => {
    event.preventDefault();
    if (code === locale) return;
    locale = code;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', code);
    window.history.replaceState(null, '', url);
    render();
    void mountAll();
  });
  return link;
});

function render(): void {
  const copy = COPY[locale];
  document.documentElement.lang = locale;
  document.title = copy.documentTitle;
  updates.forEach((update) => update(copy));
  languageLinks.forEach((link) => {
    if (link.hreflang === locale) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

function pieceSection(piece: Piece): HTMLElement {
  const titleId = `${piece}-title`;
  const stage = h('div', { class: 'lab-stage demo-piece__stage', 'data-lab-piece': piece });
  stages.set(piece, stage);
  const restart = h('button', { type: 'button', class: 'demo-piece__restart' });
  bind(restart, (copy) => copy.restart);
  bind(restart, (copy) => fill(copy.restartPiece, { title: copy.pieces[piece].title }), 'aria-label');
  restart.addEventListener('click', () => {
    if (!reduced) burst(restart);
    void mount(piece);
  });
  return h(
    'section',
    { class: 'demo-piece', id: piece, 'aria-labelledby': titleId },
    h(
      'div',
      { class: 'demo-piece__head' },
      bind(h('h3', { class: 'demo-piece__title', id: titleId }), (c) => c.pieces[piece].title),
      bind(h('p', { class: 'demo-piece__summary' }), (c) => c.pieces[piece].summary),
      h(
        'p',
        { class: 'demo-piece__actions' },
        bind(
          h('a', { class: 'demo-piece__source', href: `${REPO}/tree/main/${piece}` }),
          (c) => c.source,
        ),
        restart,
      ),
    ),
    stage,
  );
}

function kindSection(kind: Kind): HTMLElement {
  return h(
    'section',
    { class: 'demo-kind', 'aria-labelledby': `kind-${kind}` },
    bind(h('h2', { class: 'demo-kind__title', id: `kind-${kind}` }), (c) => c.kinds[kind]),
    ...KINDS[kind].map(pieceSection),
  );
}

const kinds = Object.keys(KINDS) as Kind[];
const contents = h(
  'nav',
  { class: 'demo-contents' },
  ...kinds.map((kind) =>
    h(
      'div',
      { class: 'demo-contents__group' },
      bind(h('p', { class: 'demo-contents__kind' }), (c) => c.kinds[kind]),
      h(
        'ul',
        { class: 'demo-contents__list', role: 'list' },
        ...KINDS[kind].map((piece) =>
          h(
            'li',
            {},
            bind(
              h('a', { href: `#${piece}`, class: 'demo-contents__link' }),
              (c) => c.pieces[piece].title,
            ),
          ),
        ),
      ),
    ),
  ),
);
bind(contents, (c) => c.contents, 'aria-label');

const languages = bind(
  h('nav', { class: 'demo-lang' }, ...languageLinks),
  (c) => c.languages,
  'aria-label',
);

const app = document.getElementById('app');
if (app) {
  app.replaceChildren(
    bind(h('a', { class: 'demo-skip', href: '#pieces' }), (c) => c.skip),
    h(
      'header',
      { class: 'demo-header' },
      h(
        'div',
        { class: 'demo-header__top' },
        bind(
          bind(h('a', { class: 'demo-header__author' }), (c) => c.author),
          (c) => c.site,
          'href',
        ),
        languages,
      ),
      bind(h('h1', { class: 'demo-header__title' }), (c) => c.heading),
      bind(h('p', { class: 'demo-header__intro' }), (c) => c.intro),
      contents,
    ),
    h('main', { class: 'demo-main', id: 'pieces', tabindex: -1 }, ...kinds.map(kindSection)),
    h(
      'footer',
      { class: 'demo-footer' },
      bind(h('span', {}), (c) => c.licence),
      h('a', { href: REPO }, 'github.com/andresmoreno28/lab'),
      h('span', {}, '© 2026 Andrés Moreno Rubio'),
    ),
  );
  render();
  void mountAll();
  motion?.addEventListener('change', () => {
    reduced = prefersReducedMotion(window);
    void mountAll();
  });
}
