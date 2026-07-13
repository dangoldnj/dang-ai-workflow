import { existsSync } from 'node:fs';
import type { ParsedBrief, Phase } from '../types.ts';
import { validationError } from './common.ts';
import {
  PHASE_OUTPUT_FILES,
  SELF_GATED_PHASES,
  isPriorPhaseAccountedFor,
} from './phase-accounting.ts';
import type { ValidationViolation } from './types.ts';

const REQUIRED_PRIOR_PHASES = {
  '00-context': [],
  '10-ask-questions': ['00-context'],
  '20-research': ['00-context', '10-ask-questions'],
  '30-discuss': ['00-context', '10-ask-questions', '20-research'],
  '40-structure': ['30-discuss'],
  '50-plan': ['30-discuss', '40-structure'],
  '60-prep': ['50-plan'],
  '70-implement': ['50-plan', '60-prep'],
  '80-verify': ['50-plan', '70-implement'],
  '90-close': ['50-plan', '70-implement', '80-verify'],
} satisfies Record<Phase, Phase[]>;

export const checkPhasePreconditions = (
  brief: ParsedBrief,
  phase: Phase,
  workspacePath: string | undefined,
): ValidationViolation[] => {
  const workspaceViolations = checkWorkspacePreconditions(phase, workspacePath);
  const priorPhaseViolations =
    workspacePath === undefined
      ? []
      : checkRequiredPriorPhases(brief, phase, workspacePath);

  switch (phase) {
    case '60-prep':
      return [
        ...workspaceViolations,
        ...priorPhaseViolations,
        ...checkPrepPreconditions(brief),
      ];
    case '70-implement':
      return [
        ...workspaceViolations,
        ...priorPhaseViolations,
        ...checkImplementPreconditions(brief),
      ];
    case '80-verify':
      return [
        ...workspaceViolations,
        ...priorPhaseViolations,
        ...checkVerifyPreconditions(brief),
      ];
    case '90-close':
      return [
        ...workspaceViolations,
        ...priorPhaseViolations,
        ...checkClosePreconditions(brief),
      ];
    default:
      return [...workspaceViolations, ...priorPhaseViolations];
  }
};

const checkWorkspacePreconditions = (
  phase: Phase,
  workspacePath: string | undefined,
): ValidationViolation[] => {
  if (workspacePath === undefined) {
    return [
      validationError(
        'phase-precheck-without-workspace-path',
        `${phase} precheck requires a workspace path`,
      ),
    ];
  }

  return ['brief.md', 'task.md'].flatMap(file => {
    if (existsSync(`${workspacePath}/${file}`)) {
      return [];
    }

    return [
      validationError(
        'phase-precondition-missing-file',
        `${phase} cannot run because ${file} is missing`,
        file,
      ),
    ];
  });
};

const checkRequiredPriorPhases = (
  brief: ParsedBrief,
  phase: Phase,
  workspacePath: string,
): ValidationViolation[] => {
  return REQUIRED_PRIOR_PHASES[phase].flatMap(requiredPhase => {
    if (isPriorPhaseAccountedFor(brief, requiredPhase, workspacePath)) {
      return [];
    }

    const file = PHASE_OUTPUT_FILES[requiredPhase];
    const expectedState = SELF_GATED_PHASES.includes(requiredPhase)
      ? `[${requiredPhase}] [ran] with output or ` +
        `[${requiredPhase}] [skipped] without output`
      : `[${requiredPhase}] [ran] with output`;

    return [
      validationError(
        'phase-precondition-unaccounted-prior-phase',
        `${phase} cannot run because ${requiredPhase} is not accounted for; expected ${expectedState}`,
        file ?? undefined,
      ),
    ];
  });
};

const checkPrepPreconditions = (brief: ParsedBrief): ValidationViolation[] => {
  if (brief.frontmatter.current_step === null) {
    return [];
  }

  return [
    validationError(
      'prep-with-active-current-step',
      `60-prep cannot run because current_step is already set to "${brief.frontmatter.current_step}"`,
    ),
  ];
};

const checkImplementPreconditions = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const currentStep = brief.frontmatter.current_step;

  if (currentStep === null) {
    v.push(
      validationError(
        'implement-without-current-step',
        '70-implement cannot run because current_step is null',
      ),
    );
  }

  return v;
};

const checkVerifyPreconditions = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];

  if (brief.sections.Progress.length === 0) {
    v.push(
      validationError(
        'verify-without-progress',
        '80-verify cannot run because Progress has no records',
        'Progress',
      ),
    );
  }

  if (brief.frontmatter.current_step !== null) {
    v.push(
      validationError(
        'verify-with-active-current-step',
        `80-verify cannot run because current_step is still set to "${brief.frontmatter.current_step}"`,
      ),
    );
  }

  const completedPlanItemsNeedingManualVerification =
    brief.sections.Plan.filter(item => {
      if (!item.checked) {
        return false;
      }

      const latestProgress = [...brief.sections.Progress]
        .reverse()
        .find(record => record.step === item.text);

      return latestProgress?.manualVerification === 'needed';
    });

  if (completedPlanItemsNeedingManualVerification.length > 0) {
    v.push(
      validationError(
        'verify-with-manual-verification-needed',
        `80-verify cannot run because ${completedPlanItemsNeedingManualVerification.length} completed Plan item(s) still need manual verification`,
        'Progress',
      ),
    );
  }

  return v;
};

const checkClosePreconditions = (brief: ParsedBrief): ValidationViolation[] => {
  if (brief.sections.Verification?.status === 'pass') {
    return [];
  }

  return [
    validationError(
      'close-without-verification-pass',
      `90-close cannot run because Verification status is ${brief.sections.Verification?.status ?? 'missing'}; expected pass`,
      'Verification',
    ),
  ];
};
