import { defineConfig } from 'vitest/config';

/** The site's browsers (Chrome and Edge 111, Firefox 115, Safari 16.4): what color-mix() needs. */
const TARGETS = ['chrome111', 'edge111', 'firefox115', 'safari16.4', 'ios16.4'];

export default defineConfig({
  // Relative URLs: the demo works from any path (GitHub Pages serves it under /lab/).
  base: './',
  build: { target: TARGETS, cssTarget: TARGETS },
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    environment: 'node',
    // Real CSS in tests: the pieces adopt it, and the DOM tests read the tokens.
    css: true,
  },
});
