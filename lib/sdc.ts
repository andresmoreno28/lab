/**
 * Single Directory Component scaffold (lab): from a name, props and slots, the three files of a
 * Drupal SDC (`<name>.component.yml`, `<name>.twig`, `<name>.css`), with the checks Drupal makes
 * when it discovers the component. No dependencies: copy the file.
 */

export const PROP_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'] as const;
export type PropType = (typeof PROP_TYPES)[number];
export const STATUSES = ['stable', 'experimental', 'deprecated', 'obsolete'] as const;
export type Status = (typeof STATUSES)[number];

export interface SdcProp {
  name: string;
  title: string;
  type: PropType;
  required: boolean;
  /** Allowed values, for a string prop rendered as a choice (variant, size…). */
  options: string[];
}

export interface SdcSlot {
  name: string;
  title: string;
}

export interface SdcInput {
  machineName: string;
  label: string;
  description: string;
  status: Status;
  props: SdcProp[];
  slots: SdcSlot[];
}

/** What is wrong with the input, by field: the codes the UI turns into words. */
export type SdcProblem =
  | { field: 'machineName'; code: 'empty' | 'pattern' }
  | { field: 'label'; code: 'empty' }
  | { field: 'prop' | 'slot'; index: number; code: 'empty' | 'pattern' | 'duplicate' | 'reserved' };

/** Drupal's pattern for a component's machine name (ComponentMetadata). */
const MACHINE_NAME = /^[a-z]([a-zA-Z0-9_-]*[a-zA-Z0-9])*$/;
/**
 * Props and slots become Twig variables: a lowercase letter, then letters, digits or underscores
 * (snake_case or camelCase, both valid in Drupal).
 */
const VARIABLE = /^[a-z][a-zA-Z0-9_]*$/;
/** Variables every component template already has. */
const RESERVED = new Set(['attributes', 'componentMetadata', 'content']);

export function problems(input: SdcInput): SdcProblem[] {
  const found: SdcProblem[] = [];
  if (!input.machineName.trim()) found.push({ field: 'machineName', code: 'empty' });
  else if (!MACHINE_NAME.test(input.machineName))
    found.push({ field: 'machineName', code: 'pattern' });
  if (!input.label.trim()) found.push({ field: 'label', code: 'empty' });
  const seen = new Set<string>();
  const check = (field: 'prop' | 'slot', name: string, index: number) => {
    if (!name) found.push({ field, index, code: 'empty' });
    else if (!VARIABLE.test(name)) found.push({ field, index, code: 'pattern' });
    else if (RESERVED.has(name)) found.push({ field, index, code: 'reserved' });
    else if (seen.has(name)) found.push({ field, index, code: 'duplicate' });
    seen.add(name);
  };
  input.props.forEach((prop, index) => check('prop', prop.name, index));
  input.slots.forEach((slot, index) => check('slot', slot.name, index));
  return found;
}

/** A YAML scalar, quoted only when YAML would read it as something else. */
function scalar(value: string): string {
  if (
    value === '' ||
    /^[\s'"&*!|>%@`#,[\]{}?:-]|[:#]\s|\s$|^(?:true|false|null|yes|no|on|off|~|[-+]?[\d.]+)$/i.test(
      value,
    )
  ) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

export function componentYml(input: SdcInput): string {
  const lines = [
    '$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json',
    `name: ${scalar(input.label.trim())}`,
    `status: ${input.status}`,
  ];
  if (input.description.trim()) lines.push(`description: ${scalar(input.description.trim())}`);
  const props = input.props.filter((prop) => prop.name);
  if (props.length) {
    lines.push('props:', '  type: object');
    const required = props.filter((prop) => prop.required);
    if (required.length) lines.push('  required:', ...required.map((prop) => `    - ${prop.name}`));
    lines.push('  properties:');
    for (const prop of props) {
      lines.push(`    ${prop.name}:`, `      type: ${prop.type}`);
      if (prop.title.trim()) lines.push(`      title: ${scalar(prop.title.trim())}`);
      const options = prop.type === 'string' ? prop.options.filter(Boolean) : [];
      if (options.length)
        lines.push('      enum:', ...options.map((option) => `        - ${scalar(option)}`));
    }
  }
  const slots = input.slots.filter((slot) => slot.name);
  if (slots.length) {
    lines.push('slots:');
    for (const slot of slots) {
      lines.push(`  ${slot.name}:`);
      if (slot.title.trim()) lines.push(`    title: ${scalar(slot.title.trim())}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/** BEM block of the component: its machine name in kebab case. */
export const blockClass = (machineName: string) =>
  machineName
    .replace(/_/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

export function componentTwig(input: SdcInput): string {
  const block = blockClass(input.machineName);
  const modifiers = input.props.filter(
    (prop) => prop.name && prop.type === 'string' && prop.options.some(Boolean),
  );
  const classes = [
    `'${block}'`,
    ...modifiers.map((prop) => `${prop.name} ? '${block}--' ~ ${prop.name}|clean_class`),
  ];
  const lines = [`<div{{ attributes.addClass([${classes.join(', ')}]) }}>`];
  for (const prop of input.props.filter((p) => p.name && !modifiers.includes(p))) {
    const element = `${block}__${blockClass(prop.name)}`;
    if (prop.type === 'boolean')
      lines.push(`  {% if ${prop.name} %}<span class="${element}"></span>{% endif %}`);
    else if (prop.type === 'array')
      lines.push(
        `  {% for item in ${prop.name} %}<span class="${element}">{{ item }}</span>{% endfor %}`,
      );
    else if (prop.type === 'object') lines.push(`  {# ${prop.name}: {{ ${prop.name}.key }} #}`);
    else
      lines.push(`  {% if ${prop.name} %}<p class="${element}">{{ ${prop.name} }}</p>{% endif %}`);
  }
  for (const slot of input.slots.filter((s) => s.name)) {
    lines.push(
      `  <div class="${block}__${blockClass(slot.name)}">`,
      `    {% block ${slot.name} %}{% endblock %}`,
      '  </div>',
    );
  }
  lines.push('</div>');
  return `${lines.join('\n')}\n`;
}

export function componentCss(input: SdcInput): string {
  const block = blockClass(input.machineName);
  const rules = [`.${block} {\n  display: grid;\n  gap: 0.75rem;\n}`];
  for (const prop of input.props.filter(
    (p) => p.name && p.type === 'string' && p.options.some(Boolean),
  )) {
    for (const option of prop.options.filter(Boolean))
      rules.push(`.${block}--${blockClass(option)} {\n}`);
  }
  for (const part of [
    ...input.props.filter((p) => p.name && !(p.type === 'string' && p.options.some(Boolean))),
    ...input.slots.filter((s) => s.name),
  ]) {
    if ('type' in part && part.type === 'object') continue;
    rules.push(`.${block}__${blockClass(part.name)} {\n}`);
  }
  return `${rules.join('\n\n')}\n`;
}

/** How to render it from another template, with every prop and slot in place. */
export function includeExample(input: SdcInput, provider = 'my_theme'): string {
  const props = input.props.filter((prop) => prop.name);
  const slots = input.slots.filter((slot) => slot.name);
  const sample = (prop: SdcProp) => {
    if (prop.type === 'string') return `'${prop.options.find(Boolean) ?? '…'}'`;
    if (prop.type === 'boolean') return 'true';
    if (prop.type === 'number' || prop.type === 'integer') return '1';
    if (prop.type === 'array') return '[]';
    return '{}';
  };
  const id = `'${provider}:${input.machineName}'`;
  const values = `{\n${props.map((p) => `  ${p.name}: ${sample(p)},`).join('\n')}\n}`;
  if (!slots.length) {
    return props.length
      ? `{{ include(${id}, ${values}, with_context = false) }}\n`
      : `{{ include(${id}, with_context = false) }}\n`;
  }
  const blocks = slots.map((slot) => `  {% block ${slot.name} %}{% endblock %}`).join('\n');
  return `{% embed ${id}${props.length ? ` with ${values}` : ''} only %}\n${blocks}\n{% endembed %}\n`;
}
