# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-12

First public release: the nine pieces of the lab at andresmoreno.dev, out of the site and on their own.

### Added

- Components: `accessible-button`, `depth-card`, `accessible-tabs`.
- Experiments: `particle-network`, `svg-heatmap`, `scroll-depth`.
- Tools: `contrast-checker`, `fluid-type-scale`, `sdc-generator`.
- `shared/`: the element builders and helpers the pieces share, `mountPiece()` to load a piece by name, the WAI-ARIA tabs, `zoomOf()`, and the site's tokens, base styles and stage.
- `lib/`: the pure logic (colour and contrast maths, fluid type, SDC scaffolding, spatial hash, heatmap data), with its tests.
- `strings/`: each piece's copy in Spanish and English, as on the site.
- A demo gallery with every piece mounted live, a language switch, and Trusted Types enforced.
- Tests of every piece in a DOM: names, ARIA references, keyboard, announcements, validation and unmounting.
- CI (typecheck, test, build) and deployment of the demo to GitHub Pages.

### Fixed

- `enhanceTabs()` now finds the panels when a tab is selected, not when the tabs are enhanced. The accessible tabs piece enhances its tablist before it is in the document, so its panels never changed with the selected tab.

[1.0.0]: https://github.com/andresmoreno28/lab/releases/tag/v1.0.0
