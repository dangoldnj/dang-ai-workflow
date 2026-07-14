import {
  ACCEPTANCE_CRITERION_ID_PATTERN,
  STEP_ID_PATTERN,
} from '../constants.ts';
import type { ParsedBrief, PlanItem } from '../types.ts';
import { isPhaseAtOrAfter, validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkPlanProgressConsistency = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [
    ...checkPlanItemIds(
      brief.sections.Plan,
      'Plan',
      'plan-item-id-missing',
      'plan-item-id-invalid',
      'plan-duplicate-step-id',
      STEP_ID_PATTERN,
    ),
    ...checkPlanItemIds(
      brief.sections['Acceptance Criteria'],
      'Acceptance Criteria',
      'acceptance-criteria-id-missing',
      'acceptance-criteria-id-invalid',
      'acceptance-criteria-duplicate-id',
      ACCEPTANCE_CRITERION_ID_PATTERN,
    ),
  ];

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

  // Every Progress record's step should reference a Plan item ID.
  const planIds = new Set(
    brief.sections.Plan.map(p => p.id).filter((id): id is string => !!id),
  );
  for (const record of brief.sections.Progress) {
    if (!planIds.has(record.step)) {
      v.push(
        validationError(
          'progress-step-not-in-plan',
          `Progress record for step "${record.step}" does not match any Plan item ID`,
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
    if (item.id === undefined) {
      continue;
    }

    if (item.checked && !completedSteps.has(item.id)) {
      v.push(
        validationError(
          'plan-checked-without-progress',
          `Plan item "${item.id}" is checked but has no complete Progress record`,
          'Plan',
        ),
      );
    }

    if (
      !item.checked &&
      latestProgressByStep.get(item.id)?.status === 'complete'
    ) {
      v.push(
        validationError(
          'plan-unchecked-with-complete-progress',
          `Plan item "${item.id}" is unchecked but latest Progress status is complete`,
          'Plan',
        ),
      );
    }
  }

  return v;
};

const checkPlanItemIds = (
  items: PlanItem[],
  section: 'Plan' | 'Acceptance Criteria',
  missingInvariant: string,
  invalidInvariant: string,
  duplicateInvariant: string,
  pattern: RegExp,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const counts = new Map<string, number>();

  for (const item of items) {
    if (item.id === undefined || item.id.length === 0) {
      v.push(
        validationError(
          missingInvariant,
          `${section} item "${item.text}" is missing a stable ID`,
          section,
        ),
      );
      continue;
    }

    if (!pattern.test(item.id)) {
      v.push(
        validationError(
          invalidInvariant,
          `${section} item ID "${item.id}" has invalid format`,
          section,
        ),
      );
    }

    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }

  for (const [id, count] of counts) {
    if (count > 1) {
      v.push(
        validationError(
          duplicateInvariant,
          `${section} has ${count} items with ID "${id}"; expected unique IDs`,
          section,
        ),
      );
    }
  }

  return v;
};
