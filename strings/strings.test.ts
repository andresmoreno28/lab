import { describe, expect, it } from 'vitest';
import { PIECE_NAMES } from '../shared/boot';
import en from './en.json';
import es from './es.json';

const LOCALES = { es, en } as const;
type Table = Record<string, Record<string, string>>;

/** Each piece's source, as text: what it reads from `strings`. */
const sources = import.meta.glob<string>('../*/index.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const source = (piece: string) => sources[`../${piece}/index.ts`] ?? '';
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('strings', () => {
  it('has one object per piece, in both languages, with the same keys', () => {
    for (const table of Object.values(LOCALES) as Table[]) {
      expect(Object.keys(table)).toEqual([...PIECE_NAMES]);
    }
    for (const piece of PIECE_NAMES) {
      expect(Object.keys((es as Table)[piece]!), piece).toEqual(
        Object.keys((en as Table)[piece]!),
      );
    }
  });

  it.each(Object.keys(LOCALES))('has no empty text (%s)', (locale) => {
    const table = LOCALES[locale as keyof typeof LOCALES] as Table;
    for (const [piece, strings] of Object.entries(table)) {
      for (const [name, text] of Object.entries(strings)) {
        expect(text.trim(), `${piece}.${name}`).not.toBe('');
      }
    }
  });

  it.each(PIECE_NAMES)('gives %s every string it reads, and nothing it does not', (piece) => {
    const code = source(piece);
    expect(code).not.toBe('');
    const names = Object.keys((en as Table)[piece]!);
    // Read as `strings.name`, or by a name the piece lists ('markup', 'normal'…).
    const read = new Set([...code.matchAll(/strings\.(\w+)/g)].map((m) => m[1]));
    for (const name of read) expect(names, `${piece} reads strings.${name}`).toContain(name);
    for (const name of names) {
      expect(read.has(name) || code.includes(`'${name}'`), `${piece}.${name} is unused`).toBe(true);
    }
  });

  it('keeps the same placeholders in both languages', () => {
    for (const piece of PIECE_NAMES) {
      for (const [name, text] of Object.entries((en as Table)[piece]!)) {
        expect(placeholders((es as Table)[piece]![name]!), `${piece}.${name}`).toEqual(
          placeholders(text),
        );
      }
    }
  });

  it('keeps the placeholders each piece fills', () => {
    const filled: [string, string, string[]][] = [
      ['particle-network', 'stats', ['fps', 'links', 'n']],
      ['svg-heatmap', 'cell', ['count', 'date']],
      ['svg-heatmap', 'cellOne', ['date']],
      ['scroll-depth', 'layer', ['n', 'speed']],
      ['fluid-type-scale', 'step', ['n']],
      ['sdc-generator', 'remove', ['name']],
    ];
    for (const table of Object.values(LOCALES) as Table[]) {
      for (const [piece, name, expected] of filled) {
        expect(placeholders(table[piece]![name]!), `${piece}.${name}`).toEqual(expected);
      }
    }
  });
});
