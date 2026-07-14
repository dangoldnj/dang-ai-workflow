import type { ParsedBrief } from '../types.ts';
import {
  isPhaseAtOrAfter,
  validationError,
  validationWarning,
} from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkRequiredContent = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];

  if ((brief.sections.Goal ?? '').trim() === '') {
    v.push(validationError('goal-missing', 'Goal is empty', 'Goal'));
  }

  if (
    brief.sections['Acceptance Criteria'].length === 0 &&
    isPhaseAtOrAfter(brief.frontmatter.current_phase, '50-plan')
  ) {
    v.push(
      validationWarning(
        'acceptance-criteria-empty-after-plan-phase',
        'current_phase is 50-plan or later but Acceptance Criteria has no items',
        'Acceptance Criteria',
      ),
    );
  }

  return v;
};
