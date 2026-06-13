import type { ParsedBrief, Phase } from '../types.ts';
import { isPhaseAtOrAfter, validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkUnresolvedUnknowns = (
  brief: ParsedBrief,
  beforePhase?: Phase,
): ValidationViolation[] => {
  if (brief.sections.Unknowns.length === 0) {
    return [];
  }

  if (
    beforePhase === '50-plan' ||
    isPhaseAtOrAfter(brief.frontmatter.current_phase, '50-plan')
  ) {
    return [
      validationError(
        'planning-with-unresolved-unknowns',
        `brief has ${brief.sections.Unknowns.length} unresolved Unknown(s); resolve or defer them before planning`,
        'Unknowns',
      ),
    ];
  }

  return [];
};
