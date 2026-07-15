import { CONFLICT_ID_PATTERN, UNKNOWN_ID_PATTERN } from '../constants.ts';
import type { BlockerEntry, ParsedBrief } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkBlockerIds = (brief: ParsedBrief): ValidationViolation[] => [
  ...checkBlockerSectionIds(
    brief.sections.Conflicts,
    'Conflicts',
    'conflict-id-missing',
    'conflict-id-invalid',
    'conflict-duplicate-id',
    CONFLICT_ID_PATTERN,
  ),
  ...checkBlockerSectionIds(
    brief.sections.Unknowns,
    'Unknowns',
    'unknown-id-missing',
    'unknown-id-invalid',
    'unknown-duplicate-id',
    UNKNOWN_ID_PATTERN,
  ),
];

const checkBlockerSectionIds = (
  entries: BlockerEntry[],
  section: 'Conflicts' | 'Unknowns',
  missingInvariant: string,
  invalidInvariant: string,
  duplicateInvariant: string,
  pattern: RegExp,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.id === undefined || entry.id.length === 0) {
      v.push(
        validationError(
          missingInvariant,
          `${section} entry "${entry.text}" is missing a stable ID`,
          section,
        ),
      );
      continue;
    }

    if (!pattern.test(entry.id)) {
      v.push(
        validationError(
          invalidInvariant,
          `${section} entry ID "${entry.id}" has invalid format`,
          section,
        ),
      );
    }

    counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);
  }

  for (const [id, count] of counts) {
    if (count > 1) {
      v.push(
        validationError(
          duplicateInvariant,
          `${section} has ${count} entries with ID "${id}"; expected unique IDs`,
          section,
        ),
      );
    }
  }

  return v;
};
