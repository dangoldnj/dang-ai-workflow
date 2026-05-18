import type { ParseIssue } from './parse/types.ts';

type Scalar = string | number | boolean | null;

// Minimal YAML parser for flat scalar frontmatter.
// Handles strings, numbers, booleans, null. No nested objects, lists, or multiline strings.
// If the frontmatter shape ever grows beyond this, switch to a real YAML library.

export const parseFrontmatter = (
  raw: string,
): {
  data: Record<string, Scalar>;
  body: string;
  bodyStartLine: number;
  errors: ParseIssue[];
} => {
  if (!raw.startsWith('---\n')) {
    return { data: {}, body: raw, bodyStartLine: 1, errors: [] };
  }
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) {
    return {
      data: {},
      body: raw,
      bodyStartLine: 1,
      errors: [
        {
          code: 'frontmatter-unterminated',
          message: 'Frontmatter starts with --- but has no closing --- line',
          location: 'frontmatter:1',
        },
      ],
    };
  }
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const bodyStartLine = yaml.split('\n').length + 3;
  const data: Record<string, Scalar> = {};
  const errors: ParseIssue[] = [];
  for (const [index, line] of yaml.split('\n').entries()) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const m = line.match(/^([a-z_][a-z0-9_]*):\s*(.*)$/i);
    if (!m) {
      errors.push({
        code: 'frontmatter-line-unparseable',
        message: `Frontmatter line is not a flat key/value scalar: ${line}`,
        location: `frontmatter:${index + 2}`,
      });
      continue;
    }
    data[m[1]] = parseScalar(m[2]);
  }
  return { data, body, bodyStartLine, errors };
};

const parseScalar = (s: string): Scalar => {
  const trimmed = s.trim();
  if (trimmed === 'null' || trimmed === '~' || trimmed === '') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (/^-?\d*\.\d+$/.test(trimmed)) return Number(trimmed);
  if (/^".*"$/.test(trimmed) || /^'.*'$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};
