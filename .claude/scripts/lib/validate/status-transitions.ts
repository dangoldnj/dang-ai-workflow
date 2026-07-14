import { isPhaseAtOrAfter, validationError } from './common.ts';
import type { ParsedBrief } from '../types.ts';
import type { ValidationViolation } from './types.ts';
import { ACTIVE_CURRENT_STEP_STATUSES } from '../constants.ts';

export const checkStatusTransitions = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const fm = brief.frontmatter;

  if (fm.status === 'not-started' && fm.current_phase !== null) {
    v.push(
      validationError(
        'not-started-with-current-phase',
        `status is not-started but current_phase is ${fm.current_phase}; expected null`,
      ),
    );
  }

  if (fm.status === 'not-started' && fm.current_step !== null) {
    v.push(
      validationError(
        'not-started-with-current-step',
        `status is not-started but current_step is "${fm.current_step}"; expected null`,
      ),
    );
  }

  if (fm.status === 'in-planning') {
    const checkedPlanItems = brief.sections.Plan.filter(item => item.checked);
    if (checkedPlanItems.length > 0) {
      v.push(
        validationError(
          'in-planning-with-checked-plan',
          `status is in-planning but Plan has ${checkedPlanItems.length} checked item(s)`,
          'Plan',
        ),
      );
    }

    if (brief.sections.Progress.length > 0) {
      v.push(
        validationError(
          'in-planning-with-progress',
          `status is in-planning but Progress has ${brief.sections.Progress.length} record(s)`,
          'Progress',
        ),
      );
    }
  }

  if (
    fm.status === 'in-progress' &&
    !isPhaseAtOrAfter(fm.current_phase, '60-prep')
  ) {
    v.push(
      validationError(
        'in-progress-before-prep',
        `status is in-progress but current_phase is ${fm.current_phase}; expected 60-prep or later`,
      ),
    );
  }

  if (fm.status === 'blocked' && brief.sections.Conflicts.length === 0) {
    v.push(
      validationError(
        'blocked-without-conflicts',
        'status is blocked but Conflicts has no entries',
        'Conflicts',
      ),
    );
  }

  if (
    brief.sections.Conflicts.length > 0 &&
    fm.status !== 'blocked' &&
    fm.status !== 'abandoned'
  ) {
    v.push(
      validationError(
        'conflicts-without-blocked-status',
        `Conflicts has ${brief.sections.Conflicts.length} entries but status is ${fm.status}; expected blocked or abandoned`,
        'Conflicts',
      ),
    );
  }

  // complete requires What We Built
  if (fm.status === 'complete' && !brief.sections['What We Built']) {
    v.push(
      validationError(
        'status-complete-missing-what-we-built',
        'status is complete but What We Built is missing',
      ),
    );
  }

  // What We Built must be absent unless status is complete or abandoned
  if (
    brief.sections['What We Built'] &&
    fm.status !== 'complete' &&
    fm.status !== 'abandoned'
  ) {
    v.push(
      validationError(
        'what-we-built-premature',
        `What We Built is present but status is ${fm.status}`,
      ),
    );
  }

  // current_step is only valid while prep, implementation, or blocked work is active
  if (
    fm.current_step !== null &&
    fm.status !== 'in-progress' &&
    fm.status !== 'blocked' &&
    fm.status !== 'in-planning'
  ) {
    v.push(
      validationError(
        'current-step-stale',
        `current_step is set but status is ${fm.status}; expected null`,
      ),
    );
  }

  if (
    fm.current_step !== null &&
    !isPhaseAtOrAfter(fm.current_phase, '60-prep')
  ) {
    v.push(
      validationError(
        'current-step-before-prep',
        `current_step is set but current_phase is ${fm.current_phase}; expected 60-prep or later`,
      ),
    );
  }

  if (fm.current_step !== null) {
    const planItem = brief.sections.Plan.find(
      item => item.id === fm.current_step,
    );
    const latestProgress = [...brief.sections.Progress]
      .reverse()
      .find(record => record.step === fm.current_step);

    if (!planItem) {
      v.push(
        validationError(
          'current-step-not-in-plan',
          `current_step "${fm.current_step}" does not match any Plan item ID`,
          'Plan',
        ),
      );
    } else if (
      planItem.checked &&
      !(
        latestProgress &&
        ACTIVE_CURRENT_STEP_STATUSES.includes(latestProgress.status)
      )
    ) {
      v.push(
        validationError(
          'current-step-not-active',
          `current_step "${fm.current_step}" is set but the Plan item is checked and latest Progress is ${latestProgress?.status ?? 'missing'}; expected an active Progress status or current_step null`,
          'Progress',
        ),
      );
    }
  }

  return v;
};
