import type { ParsedBrief } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkProgressConsistency = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];

  for (const record of brief.sections.Progress) {
    if (
      record.status === 'complete' &&
      record.manualVerification === 'needed'
    ) {
      v.push(
        validationError(
          'progress-complete-with-manual-needed',
          `Progress record for step "${record.step}" is complete but Manual verification is needed`,
          'Progress',
        ),
      );
    }

    if (record.status === 'complete' && record.automatedChecks === 'failed') {
      v.push(
        validationError(
          'progress-complete-with-failed-checks',
          `Progress record for step "${record.step}" is complete but Automated checks failed`,
          'Progress',
        ),
      );
    }

    if (
      record.status === 'automated-checks-passed' &&
      record.automatedChecks !== 'passed'
    ) {
      v.push(
        validationError(
          'progress-checks-passed-mismatch',
          `Progress record for step "${record.step}" has status automated-checks-passed but Automated checks is ${record.automatedChecks}`,
          'Progress',
        ),
      );
    }
  }

  return v;
};
