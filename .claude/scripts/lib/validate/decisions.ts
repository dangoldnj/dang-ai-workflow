import { validationError } from './common.ts';
import type { ParsedBrief } from '../types.ts';
import type { ValidationViolation } from './types.ts';

export const checkDecisionsShape = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];

  for (const entry of brief.sections.Decisions) {
    if (
      entry.step.length === 0 ||
      entry.choice.length === 0 ||
      entry.why.length === 0
    ) {
      v.push(
        validationError(
          'decision-empty-field',
          `Decision entry has an empty field: ${entry.raw}`,
          'Decisions',
        ),
      );
    }
  }

  return v;
};
