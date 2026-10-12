# Laboratorio

Las piezas interactivas del laboratorio de [andresmoreno.dev](https://andresmoreno.dev/es/laboratorio): tres componentes, tres experimentos y tres herramientas, en TypeScript y CSS, sin dependencias en tiempo de ejecución. Es el mismo código que usa la web, ordenado para leerlo, probarlo y copiarlo.

**Demo:** [andresmoreno28.github.io/lab](https://andresmoreno28.github.io/lab/?lang=es) <!-- La publica .github/workflows/pages.yml desde main cuando GitHub Pages esté activado. -->

[Read in English](README.md)

## Las piezas

| Pieza | Tipo | Qué es |
| --- | --- | --- |
| [`accessible-button`](accessible-button/) | Componente | El botón dorado de la web en todos sus estados, enviando, enviado y desactivado, anunciado y siempre al alcance del teclado. |
| [`depth-card`](depth-card/) | Componente | Una tarjeta que se inclina con el puntero o las flechas y separa sus capas en profundidad, con brillo especular. |
| [`accessible-tabs`](accessible-tabs/) | Componente | Pestañas WAI-ARIA con flechas, Inicio y Fin, activación automática o manual y un indicador que se desliza entre ellas. |
| [`particle-network`](particle-network/) | Experimento | Cientos de partículas en un canvas que se enlazan con sus vecinas, siguen al puntero y se dispersan con un clic, a 60 fps gracias a una rejilla espacial. |
| [`svg-heatmap`](svg-heatmap/) | Experimento | Un año de actividad en SVG, una celda por día: pulsa una y una onda recorre el año desde ahí. |
| [`scroll-depth`](scroll-depth/) | Experimento | Un paisaje de papel en capas que se separan al desplazarte, hecho solo con animaciones CSS ligadas al scroll. |
| [`contrast-checker`](contrast-checker/) | Herramienta | El contraste WCAG 2.2 y el APCA de dos colores, el color más parecido que cumple y una matriz con todos los pares de tu paleta. |
| [`fluid-type-scale`](fluid-type-scale/) | Herramienta | El `clamp()` de cada paso de una escala tipográfica entre dos pantallas, con una vista previa que puedes estirar. |
| [`sdc-generator`](sdc-generator/) | Herramienta | Los tres archivos de un Single Directory Component de Drupal a partir de un formulario, con las comprobaciones que hace Drupal al descubrirlo. |

Cada carpeta tiene su README (en inglés): qué hace la pieza, por qué está hecha así (accesibilidad, movimiento, rendimiento) y cómo montarla.

## Ponerlo en marcha

Necesitas Node 20.19+ o 22.12+ y [pnpm](https://pnpm.io) 10 (`corepack enable` lo prepara a partir de `package.json`).

```sh
pnpm install
pnpm dev         # la galería, en http://localhost:5173
pnpm test        # Vitest: los cálculos, los textos y cada pieza montada en un DOM
pnpm typecheck   # TypeScript estricto
pnpm build       # la demo como archivos estáticos, en dist/
```

## Usar una pieza

No es un paquete de npm: copia lo que necesites. Una pieza es su carpeta, más los archivos de `shared/` y `lib/` que indica su README. Carga primero los estilos y móntala en un escenario:

```ts
import './shared/tokens.css';
import './shared/base.css';
import './shared/stage.css';
import { mount } from './svg-heatmap';
import es from './strings/es.json';

const controller = new AbortController();
mount({
  root: document.querySelector<HTMLElement>('#mapa')!, // <div id="mapa" class="lab-stage">
  strings: es['svg-heatmap'],
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  compact: false,
  signal: controller.signal, // abort() la desmonta: listeners, temporizadores y bucles
});
```

El contrato completo (`root`, `strings`, `reduced`, `compact`, `signal`), los estilos y las capas de la cascada están en el [README en inglés](README.md#the-mount-contract).

## Accesibilidad

Todo funciona con el teclado; los resultados se anuncian en regiones `aria-live` que no interrumpen (`polite`); ningún estado se indica solo con el color; lo desactivado sigue siendo enfocable y dice por qué; con movimiento reducido cada pieza muestra su estado final en lugar de desplazarse. Ninguna pieza escribe HTML desde una cadena: la demo funciona con Trusted Types obligatorios y sin políticas.

## Licencia

[MIT](LICENSE) © 2026 Andrés Moreno Rubio.

La demo carga las tipografías de la web, Playfair, Cabin y Fira Code, desde Google Fonts. Tienen licencia SIL Open Font License y no forman parte de este repositorio.
