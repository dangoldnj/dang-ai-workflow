import type { ParsedBrief } from '../types.ts';
import { isPhaseAtOrAfter, validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkPlanProgressConsistency = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];

  if (
    brief.sections.Plan.length === 0 &&
    isPhaseAtOrAfter(brief.frontmatter.current_phase, '50-plan')
  ) {
    v.push(
      validationError(
        'plan-empty-after-plan-phase',
        'current_phase is 50-plan or later but Plan has no items',
        'Plan',
      ),
    );
  }

  const progressCountsByStep = new Map<string, number>();
  const latestProgressByStep = new Map<
    string,
    (typeof brief.sections.Progress)[number]
  >();
  for (const record of brief.sections.Progress) {
    progressCountsByStep.set(
      record.step,
      (progressCountsByStep.get(record.step) ?? 0) + 1,
    );
    latestProgressByStep.set(record.step, record);
  }

  for (const [step, count] of progressCountsByStep) {
    if (count > 1) {
      v.push(
        validationError(
          'progress-duplicate-step',
          `Progress has ${count} records for step "${step}"; expected one mutable record per Plan item`,
          'Progress',
        ),
      );
    }
  }

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

    if (
      !item.checked &&
      latestProgressByStep.get(item.text)?.status === 'complete'
    ) {
      v.push(
        validationError(
          'plan-unchecked-with-complete-progress',
          `Plan item "${item.text}" is unchecked but latest Progress status is complete`,
          'Plan',
        ),
      );
    }
  }

  return v;
};
