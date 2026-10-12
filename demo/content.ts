/**
 * The demo's own copy, in both languages: the gallery around the pieces. Each piece's title and
 * summary are those of its page on andresmoreno.dev. The pieces' strings are in strings/.
 */
import type { Piece } from '../shared/boot';

export type Locale = 'es' | 'en';
export type Kind = 'component' | 'experiment' | 'tool';

export const LOCALES: readonly Locale[] = ['es', 'en'];

export const KINDS: Record<Kind, readonly Piece[]> = {
  component: ['accessible-button', 'depth-card', 'accessible-tabs'],
  experiment: ['particle-network', 'svg-heatmap', 'scroll-depth'],
  tool: ['contrast-checker', 'fluid-type-scale', 'sdc-generator'],
};

export interface Copy {
  /** The language's own name, for the switch. */
  language: string;
  documentTitle: string;
  skip: string;
  author: string;
  /** The lab on the site, in this language. */
  site: string;
  heading: string;
  intro: string;
  languages: string;
  contents: string;
  kinds: Record<Kind, string>;
  source: string;
  restart: string;
  /** `{title}`: the piece's title (the button's accessible name). */
  restartPiece: string;
  licence: string;
  pieces: Record<Piece, { title: string; summary: string }>;
}

export const COPY: Record<Locale, Copy> = {
  es: {
    language: 'Español',
    documentTitle: 'Laboratorio · Andrés Moreno Rubio',
    skip: 'Saltar a las piezas',
    author: 'Andrés Moreno Rubio',
    site: 'https://andresmoreno.dev/es/laboratorio',
    heading: 'Laboratorio',
    intro:
      'Las nueve piezas interactivas del laboratorio de andresmoreno.dev: componentes, experimentos y herramientas. Cada una es un módulo de TypeScript con su CSS, sin dependencias. Funcionan con el teclado y con lector de pantalla, respetan el movimiento reducido y construyen el DOM sin cadenas de HTML.',
    languages: 'Idioma',
    contents: 'Piezas',
    kinds: { component: 'Componentes', experiment: 'Experimentos', tool: 'Herramientas' },
    source: 'Código',
    restart: 'Reiniciar',
    restartPiece: 'Reiniciar {title}',
    licence: 'Código con licencia MIT.',
    pieces: {
      'accessible-button': {
        title: 'Botón accesible',
        summary:
          'El botón dorado de andresmoreno.dev en todos sus estados, enviando, enviado y desactivado, sin perder el foco ni dejar a nadie sin saber qué ha pasado.',
      },
      'depth-card': {
        title: 'Tarjeta con relieve',
        summary:
          'Una tarjeta que se inclina con el puntero y separa sus capas en profundidad, con brillo especular. Funciona con el teclado y se queda quieta si reduces el movimiento.',
      },
      'accessible-tabs': {
        title: 'Pestañas accesibles',
        summary:
          'Pestañas WAI-ARIA con un indicador que fluye entre ellas, flechas, Inicio y Fin. Son las mismas que mueven la ventana del laboratorio en la portada de la web.',
      },
      'particle-network': {
        title: 'Red de partículas',
        summary:
          'Cientos de partículas que se enlazan con sus vecinas, siguen al puntero y se dispersan con un clic, a 60 fps gracias a una rejilla espacial.',
      },
      'svg-heatmap': {
        title: 'Mapa de calor en SVG',
        summary:
          'El mapa de actividad de la portada de la web, desmontado. Pulsa una celda y una onda recorre el año desde ahí; cambia el patrón o el color y repinta.',
      },
      'scroll-depth': {
        title: 'Profundidad con scroll',
        summary:
          'Un paisaje de papel en capas que se separan al desplazarte, hecho solo con animaciones CSS ligadas al scroll, sin una línea de JavaScript.',
      },
      'contrast-checker': {
        title: 'Calculadora de contraste',
        summary:
          'El contraste WCAG 2.2 de dos colores, su APCA, lo que cumple y el color más parecido que sí pasa. Y una matriz con todos los pares de tu paleta.',
      },
      'fluid-type-scale': {
        title: 'Escala tipográfica fluida',
        summary:
          'Elige la pantalla más estrecha, la más ancha y la escala, y te da el clamp() de cada paso, con una vista previa que puedes estirar.',
      },
      'sdc-generator': {
        title: 'Generador de componentes SDC',
        summary:
          'Nombre, props y slots, y te da los tres archivos de un Single Directory Component de Drupal, con las comprobaciones que hace Drupal al descubrirlo.',
      },
    },
  },
  en: {
    language: 'English',
    documentTitle: 'Lab · Andrés Moreno Rubio',
    skip: 'Skip to the pieces',
    author: 'Andrés Moreno Rubio',
    site: 'https://andresmoreno.dev/en/lab',
    heading: 'Lab',
    intro:
      'The nine interactive pieces of the lab at andresmoreno.dev: components, experiments and tools. Each one is a TypeScript module with its CSS and no dependencies. They work with the keyboard and with a screen reader, respect reduced motion and build the DOM without HTML strings.',
    languages: 'Language',
    contents: 'Pieces',
    kinds: { component: 'Components', experiment: 'Experiments', tool: 'Tools' },
    source: 'Source',
    restart: 'Restart',
    restartPiece: 'Restart {title}',
    licence: 'Code under the MIT licence.',
    pieces: {
      'accessible-button': {
        title: 'Accessible button',
        summary:
          'The gold button of andresmoreno.dev in all its states, sending, sent and disabled, without losing focus or leaving anyone unsure of what happened.',
      },
      'depth-card': {
        title: 'Depth card',
        summary:
          'A card that tilts with the pointer and pulls its layers apart in depth, with a specular glare. It works with the keyboard and stays still if you reduce motion.',
      },
      'accessible-tabs': {
        title: 'Accessible tabs',
        summary:
          "WAI-ARIA tabs with an indicator that flows between them, arrows, Home and End. The same ones that drive the lab window on the site's home page.",
      },
      'particle-network': {
        title: 'Particle network',
        summary:
          'Hundreds of particles that link to their neighbours, follow the pointer and scatter on a click, at 60 fps thanks to a spatial grid.',
      },
      'svg-heatmap': {
        title: 'SVG heatmap',
        summary:
          "The activity map of the site's home page, taken apart. Press a cell and a wave crosses the year from there; change the pattern or the colour and it repaints.",
      },
      'scroll-depth': {
        title: 'Scroll depth',
        summary:
          'A layered paper landscape that parts as you scroll, made only with scroll-driven CSS animations, without a line of JavaScript.',
      },
      'contrast-checker': {
        title: 'Contrast checker',
        summary:
          'The WCAG 2.2 contrast of two colours, their APCA, what they pass and the closest colour that does pass. And a matrix with every pair of your palette.',
      },
      'fluid-type-scale': {
        title: 'Fluid type scale',
        summary:
          'Pick the narrowest screen, the widest and the scale, and get the clamp() of every step, with a preview you can stretch.',
      },
      'sdc-generator': {
        title: 'SDC component generator',
        summary:
          'Name, props and slots, and you get the three files of a Drupal Single Directory Component, with the checks Drupal makes when it discovers it.',
      },
    },
  },
};
