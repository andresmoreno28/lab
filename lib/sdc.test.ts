import { describe, expect, it } from 'vitest';
import {
  componentCss,
  componentTwig,
  componentYml,
  includeExample,
  problems,
  type SdcInput,
} from './sdc';

describe('SDC scaffold', () => {
  const card: SdcInput = {
    machineName: 'card',
    label: 'Card',
    description: 'A card: title, image and body.',
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

  it('writes the component.yml Drupal reads, quoting what YAML would misread', () => {
    const yml = componentYml(card);
    expect(yml).toContain('name: Card\nstatus: stable\n');
    expect(yml).toContain("description: 'A card: title, image and body.'");
    expect(yml).toContain('  required:\n    - title\n');
    expect(yml).toContain(
      '    variant:\n      type: string\n      title: Variant\n      enum:\n        - light\n        - dark\n',
    );
    expect(yml).toContain('slots:\n  body:\n    title: Body\n');
    expect(componentYml({ ...card, label: 'yes' })).toContain("name: 'yes'");
  });

  it('writes a template with a modifier per choice and a block per slot', () => {
    const twig = componentTwig(card);
    expect(twig).toContain(
      "<div{{ attributes.addClass(['card', variant ? 'card--' ~ variant|clean_class]) }}>",
    );
    expect(twig).toContain('{% if title %}<p class="card__title">{{ title }}</p>{% endif %}');
    expect(twig).toContain('{% block body %}{% endblock %}');
    expect(componentCss(card)).toContain('.card--dark {');
    expect(includeExample(card)).toContain("{% embed 'my_theme:card' with {");
    expect(includeExample({ ...card, slots: [] })).toContain("{{ include('my_theme:card', {");
  });

  it('reports what Drupal would reject', () => {
    expect(problems(card)).toEqual([]);
    expect(problems({ ...card, machineName: 'Card' })).toEqual([
      { field: 'machineName', code: 'pattern' },
    ]);
    expect(problems({ ...card, machineName: 'my-card_2' })).toEqual([]);
    expect(problems({ ...card, machineName: 'my-card_' })).toEqual([
      { field: 'machineName', code: 'pattern' },
    ]);
    // camelCase props are valid Twig variables, as Drupal accepts them.
    expect(problems({ ...card, props: [{ ...card.props[0]!, name: 'isActive' }] })).toEqual([]);
    expect(
      problems({
        ...card,
        props: [
          { ...card.props[0]!, name: 'attributes' },
          { ...card.props[0]!, name: 'Title' },
        ],
        slots: [
          { name: 'body', title: '' },
          { name: 'body', title: '' },
        ],
      }),
    ).toEqual([
      { field: 'prop', index: 0, code: 'reserved' },
      { field: 'prop', index: 1, code: 'pattern' },
      { field: 'slot', index: 1, code: 'duplicate' },
    ]);
  });
});
