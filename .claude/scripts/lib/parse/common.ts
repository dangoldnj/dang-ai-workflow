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

type AutomatedCheckValue = 'passed' | 'failed' | 'not-run' | 'deferred';

export const parseAutomated = <T extends AutomatedCheckValue>(
  s: string,
  location: string,
  allowedValues: readonly T[],
): ParseResult<T> => {
  const v = s.toLowerCase().trim();
  const normalized = v === 'not run' ? 'not-run' : v;
  if (allowedValues.includes(normalized as T)) {
    return { value: normalized as T, errors: [] };
  }
  return {
    value: 'not-run' as T,
    errors: [
      {
        code: 'automated-checks-invalid',
        message: `Automated checks must be ${formatAllowedValues(allowedValues)}; got: ${s || 'missing'}`,
        location,
      },
    ],
  };
};

const formatAllowedValues = (values: readonly AutomatedCheckValue[]): string => {
  const labels = values.map(value => (value === 'not-run' ? 'not run' : value));
  if (labels.length === 1) return labels[0]!;
  return `${labels.slice(0, -1).join(', ')}, or ${labels[labels.length - 1]}`;
};

export const parseManual = (
  s: string,
  location: string,
): ParseResult<'needed' | 'not-needed' | 'confirmed' | 'deferred'> => {
  const v = s.toLowerCase().trim();
  if (v === 'confirmed') return { value: 'confirmed', errors: [] };
  if (v === 'needed') return { value: 'needed', errors: [] };
  if (v === 'deferred') return { value: 'deferred', errors: [] };
  if (v === 'not needed' || v === 'not-needed') {
    return { value: 'not-needed', errors: [] };
  }
  return {
    value: 'needed',
    errors: [
      {
        code: 'manual-verification-invalid',
        message: `Manual verification must be needed, not needed, confirmed, or deferred; got: ${s || 'missing'}`,
        location,
      },
    ],
  };
};
