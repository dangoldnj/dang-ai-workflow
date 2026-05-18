import { validationError } from './common.ts';
import { PHASES } from '../constants.ts';
import type { ParsedBrief } from '../types.ts';
import type { ValidationViolation } from './types.ts';

export const checkConstraintsTagging = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const validTags: string[] = [...PHASES, 'init'];

  for (const entry of brief.sections.Constraints) {
    if (!validTags.includes(entry.phase)) {
      v.push(
        validationError(
          'constraint-invalid-tag',
          `Constraint tagged [${entry.phase}] is not a known phase or [init]`,
          'Constraints',
        ),
      );
    }
  }

  return v;
};
