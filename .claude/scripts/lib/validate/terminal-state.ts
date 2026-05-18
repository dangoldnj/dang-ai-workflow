import { validationError, validationWarning } from './common.ts';
import type { ParsedBrief } from '../types.ts';
import type { ValidationViolation } from './types.ts';

export const checkTerminalState = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const fm = brief.frontmatter;

  if (fm.status === 'complete' && fm.current_phase !== '90-close') {
    v.push(
      validationError(
        'complete-without-close',
        `status is complete but current_phase is ${fm.current_phase}; expected 90-close`,
      ),
    );
  }

  if (
    fm.status === 'complete' &&
    brief.sections.Verification?.status !== 'pass'
  ) {
    v.push(
      validationError(
        'complete-without-verification-pass',
        `status is complete but Verification status is ${brief.sections.Verification?.status ?? 'missing'}; expected pass`,
        'Verification',
      ),
    );
  }

  if (
    fm.status === 'abandoned' &&
    !brief.sections.Decisions.some(entry => /abandon/i.test(entry.raw))
  ) {
    v.push(
      validationWarning(
        'abandoned-without-decision-rationale',
        'status is abandoned but Decisions has no abandonment rationale',
        'Decisions',
      ),
    );
  }

  return v;
};
