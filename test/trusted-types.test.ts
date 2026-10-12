import { describe, expect, it } from 'vitest';

/**
 * The pieces build their DOM with createElement and text nodes, never from an HTML string, so
 * they run under Trusted Types (`require-trusted-types-for 'script'`) without a policy. The demo
 * enforces it (index.html); this keeps a sink from creeping into the code.
 */
const sources = import.meta.glob<string>(['../*/*.ts', '../main.ts', '!../**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SINKS = [
  /\.innerHTML\b/,
  /\.outerHTML\s*=/,
  /\binsertAdjacentHTML\b/,
  /\bdocument\.write(?:ln)?\b/,
  /\bcreateContextualFragment\b/,
  /\bDOMParser\b/,
  /\bsetHTML(?:Unsafe)?\b/,
  /\beval\s*\(/,
  /\bnew Function\b/,
];

describe('Trusted Types', () => {
  it('finds the sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20);
  });

  it.each(Object.keys(sources))('%s writes no HTML from a string', (path) => {
    const code = sources[path] ?? '';
    for (const sink of SINKS) expect(code, `${path}: ${sink}`).not.toMatch(sink);
  });
});
