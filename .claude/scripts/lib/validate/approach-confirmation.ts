import type { DecisionEntry, ParsedBrief } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkApproachConfirmation = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const approachDecisions = brief.sections.Decisions.filter(
    isDiscussApproachDecision,
  );

  if (approachDecisions.length === 0) {
    return [
      validationError(
        'plan-without-approach-decision',
        '50-plan is running without a 30-discuss approach Decision',
        'Decisions',
      ),
    ];
  }

  if (approachDecisions.some(decision => decision.userConfirmed)) {
    return [];
  }

  return [
    validationError(
      'plan-without-confirmed-approach',
      '50-plan is running without a user-confirmed 30-discuss approach Decision',
      'Decisions',
    ),
  ];
};

const isDiscussApproachDecision = (decision: DecisionEntry): boolean =>
  decision.step === '30-discuss' && /^approach\b/i.test(decision.choice);
