import { PHASES } from '../constants.ts';
import type { ParsedBrief } from '../types.ts';
import { validationWarning } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkConstraintsTagging = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const currentPhaseIndex =
    brief.frontmatter.current_phase === null
      ? -1
      : PHASES.indexOf(brief.frontmatter.current_phase);

  for (const entry of brief.sections.Constraints) {
    if (entry.phase === 'init') {
      continue;
    }

    if (PHASES.indexOf(entry.phase) > currentPhaseIndex) {
      v.push(
        validationWarning(
          'constraint-future-phase-tag',
          `Constraint tagged [${entry.phase}] is after current_phase ${brief.frontmatter.current_phase ?? 'null'}`,
          'Constraints',
        ),
      );
    }
  }

  return v;
};
