import { validationError } from './common.ts';
import type { DecisionEntry, ParsedBrief, PlanItem } from '../types.ts';
import type { ValidationViolation } from './types.ts';

export const checkVerificationPreconditions = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const verification = brief.sections.Verification;

  if (verification?.status !== 'pass') {
    return v;
  }

  const uncheckedPlanItems = brief.sections.Plan.filter(item => !item.checked);
  if (uncheckedPlanItems.length > 0) {
    v.push(
      validationError(
        'verification-pass-with-unchecked-plan',
        `Verification status is pass but Plan has ${uncheckedPlanItems.length} unchecked item(s)`,
        'Plan',
      ),
    );
  }

  const unresolvedAcceptanceCriteria = brief.sections[
    'Acceptance Criteria'
  ].filter(
    item =>
      !item.checked &&
      !hasDeferredAcceptanceCriterion(item, brief.sections.Decisions),
  );
  if (unresolvedAcceptanceCriteria.length > 0) {
    v.push(
      validationError(
        'verification-pass-with-unmet-acceptance-criteria',
        `Verification status is pass but Acceptance Criteria has ${unresolvedAcceptanceCriteria.length} unmet and undeferred item(s)`,
        'Acceptance Criteria',
      ),
    );
  }

  if (brief.sections.Conflicts.length > 0) {
    v.push(
      validationError(
        'verification-pass-with-conflicts',
        `Verification status is pass but Conflicts has ${brief.sections.Conflicts.length} entries`,
        'Conflicts',
      ),
    );
  }

  if (brief.frontmatter.current_step !== null) {
    v.push(
      validationError(
        'verification-pass-with-active-current-step',
        `Verification status is pass but current_step is "${brief.frontmatter.current_step}"; expected null`,
      ),
    );
  }

  const checkedPlanItemsWithoutLatestCompleteProgress =
    brief.sections.Plan.filter(item => {
      if (!item.checked) {
        return false;
      }

      const latestProgress = [...brief.sections.Progress]
        .reverse()
        .find(record => record.step === item.text);

      return latestProgress?.status !== 'complete';
    });

  if (checkedPlanItemsWithoutLatestCompleteProgress.length > 0) {
    v.push(
      validationError(
        'verification-pass-without-latest-complete-progress',
        `Verification status is pass but ${checkedPlanItemsWithoutLatestCompleteProgress.length} checked Plan item(s) do not have latest Progress status complete`,
        'Progress',
      ),
    );
  }

  if (verification.automatedChecks !== 'passed') {
    v.push(
      validationError(
        'verification-pass-without-automated-checks',
        `Verification status is pass but Automated checks is ${verification.automatedChecks}; expected passed`,
        'Verification',
      ),
    );
  }

  if (
    verification.manualVerification !== 'confirmed' &&
    verification.manualVerification !== 'deferred'
  ) {
    v.push(
      validationError(
        'verification-pass-without-manual-verification',
        `Verification status is pass but Manual verification is ${verification.manualVerification}; expected confirmed or deferred`,
        'Verification',
      ),
    );
  }

  if (
    verification.manualVerification === 'deferred' &&
    !hasDeferredManualVerification(brief.sections.Decisions)
  ) {
    v.push(
      validationError(
        'verification-pass-with-manual-verification-deferred-without-decision',
        'Verification status is pass with Manual verification deferred but Decisions has no [80-verify] [defer manual verification] rationale',
        'Decisions',
      ),
    );
  }

  return v;
};

const hasDeferredAcceptanceCriterion = (
  item: PlanItem,
  decisions: DecisionEntry[],
): boolean => {
  return decisions.some(
    decision =>
      decision.step === '80-verify' &&
      decision.choice.toLowerCase() ===
        `defer acceptance criterion: ${item.text}`.toLowerCase(),
  );
};

const hasDeferredManualVerification = (decisions: DecisionEntry[]): boolean => {
  return decisions.some(
    decision =>
      decision.step === '80-verify' &&
      decision.choice.toLowerCase() === 'defer manual verification',
  );
};
