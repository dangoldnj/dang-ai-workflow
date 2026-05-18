import type { ParseResult } from './types.ts';

export const extractField = (block: string, pattern: RegExp): string | null =>
  block.match(pattern)?.[1] ?? null;

export const extractListField = (block: string, label: string): string[] => {
  const lines = block.split('\n');
  const start = lines.findIndex(l => l.trim() === label);
  if (start === -1) return [];
  const items: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const bullet = lines[i].match(/^-\s+(.+)$/);
    if (bullet) {
      items.push(bullet[1].trim());
    } else {
      break;
    }
  }
  return items;
};

export const extractSingleListField = (
  block: string,
  field: { label: string; name: string; codePrefix: string },
  location: string,
): ParseResult<string> => {
  const items = extractListField(block, field.label);
  if (items.length === 1) {
    return { value: items[0], errors: [] };
  }

  if (items.length === 0) {
    return {
      value: '',
      errors: [
        {
          code: `${field.codePrefix}-missing`,
          message: `${field.name} must have exactly one bullet; got none`,
          location,
        },
      ],
    };
  }

  return {
    value: items[0],
    errors: [
      {
        code: `${field.codePrefix}-too-many-items`,
        message: `${field.name} must have exactly one bullet; got ${items.length}`,
        location,
      },
    ],
  };
};

export const parseAutomated = (
  s: string,
  location: string,
): ParseResult<'passed' | 'failed' | 'not-run'> => {
  const v = s.toLowerCase().trim();
  if (v === 'passed') return { value: 'passed', errors: [] };
  if (v === 'failed') return { value: 'failed', errors: [] };
  if (v === 'not run' || v === 'not-run') {
    return { value: 'not-run', errors: [] };
  }
  return {
    value: 'not-run',
    errors: [
      {
        code: 'automated-checks-invalid',
        message: `Automated checks must be passed, failed, or not run; got: ${s || 'missing'}`,
        location,
      },
    ],
  };
};

export const parseManual = (
  s: string,
  location: string,
): ParseResult<'needed' | 'not-needed' | 'confirmed'> => {
  const v = s.toLowerCase().trim();
  if (v === 'confirmed') return { value: 'confirmed', errors: [] };
  if (v === 'needed') return { value: 'needed', errors: [] };
  if (v === 'not needed' || v === 'not-needed') {
    return { value: 'not-needed', errors: [] };
  }
  return {
    value: 'needed',
    errors: [
      {
        code: 'manual-verification-invalid',
        message: `Manual verification must be needed, not needed, or confirmed; got: ${s || 'missing'}`,
        location,
      },
    ],
  };
};
