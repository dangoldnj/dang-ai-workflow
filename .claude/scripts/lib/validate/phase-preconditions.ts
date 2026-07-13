import { existsSync, readFileSync } from 'node:fs';
import type { ParsedBrief, Phase } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

const PHASE_OUTPUT_FILES = {
  '00-context': '00-context.md',
  '10-ask-questions': '10-ask-questions.md',
  '20-research': '20-research.md',
  '30-discuss': '30-discuss.md',
  '40-structure': '40-structure.md',
  '50-plan': '50-plan.md',
  '60-prep': '60-prep.md',
  '70-implement': '70-implement.md',
  '80-verify': '80-verify.md',
  '90-close': '90-close.md',
} satisfies Record<Phase, string>;

const SELF_GATED_PHASES: Phase[] = [
  '00-context',
  '10-ask-questions',
  '20-research',
];

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
        ...checkImplementPreconditions(brief, workspacePath),
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
    const skippedText = SELF_GATED_PHASES.includes(requiredPhase)
      ? ` and ${requiredPhase} is not recorded as skipped`
      : '';

    return [
      validationError(
        'phase-precondition-missing-file',
        `${phase} cannot run because ${file} is missing${skippedText}`,
        file,
      ),
    ];
  });
};

const isPriorPhaseAccountedFor = (
  brief: ParsedBrief,
  phase: Phase,
  workspacePath: string,
): boolean => {
  if (existsSync(`${workspacePath}/${PHASE_OUTPUT_FILES[phase]}`)) {
    return true;
  }

  return (
    SELF_GATED_PHASES.includes(phase) &&
    brief.sections.Decisions.some(
      decision =>
        decision.step === phase && decision.choice.toLowerCase() === 'skipped',
    )
  );
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
  workspacePath: string | undefined,
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

  if (workspacePath === undefined) {
    return v;
  }

  const prepPath = `${workspacePath}/60-prep.md`;
  if (!existsSync(prepPath)) {
    return v;
  }

  const selectedStep = readSelectedStep(prepPath);
  if (selectedStep === null) {
    v.push(
      validationError(
        'implement-without-selected-step',
        '70-implement cannot run because 60-prep.md has no Selected step line',
      ),
    );
  } else if (currentStep !== null && selectedStep !== currentStep) {
    v.push(
      validationError(
        'implement-selected-step-mismatch',
        `70-implement cannot run because 60-prep.md Selected step is "${selectedStep}" but current_step is "${currentStep}"`,
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

const readSelectedStep = (prepPath: string): string | null => {
  const prep = readFileSync(prepPath, 'utf8');
  return (
    prep.match(/^Selected step:\s*(.+)$/m)?.[1]?.trim() ??
    prep.match(/^-\s*Selected step:\s*(.+)$/m)?.[1]?.trim() ??
    null
  );
};
