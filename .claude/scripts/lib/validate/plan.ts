import { validationError, validationWarning } from './common.ts';
import type { ParsedBrief } from '../types.ts';
import type { ValidationViolation } from './types.ts';

export const checkPlanProgressConsistency = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];

  // Every Progress record's step name should appear as a Plan item
  const planTexts = new Set(brief.sections.Plan.map(p => p.text));
  for (const record of brief.sections.Progress) {
    if (!planTexts.has(record.step)) {
      v.push(
        validationError(
          'progress-step-not-in-plan',
          `Progress record for step "${record.step}" does not match any Plan item`,
          'Progress',
        ),
      );
    }
  }

  // Every checked Plan item should have a Progress record with status: complete
  const completedSteps = new Set(
    brief.sections.Progress.filter(r => r.status === 'complete').map(
      r => r.step,
    ),
  );
  for (const item of brief.sections.Plan) {
    if (item.checked && !completedSteps.has(item.text)) {
      v.push(
        validationError(
          'plan-checked-without-progress',
          `Plan item "${item.text}" is checked but has no complete Progress record`,
          'Plan',
        ),
      );
    }
  }

  return v;
};
