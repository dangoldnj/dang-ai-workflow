import { existsSync, readFileSync } from 'node:fs';
import type { ParsedBrief, Phase } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkPhasePreconditions = (
  brief: ParsedBrief,
  phase: Phase,
  workspacePath: string | undefined,
): ValidationViolation[] => {
  switch (phase) {
    case '60-prep':
      return checkPrepPreconditions(brief);
    case '70-implement':
      return checkImplementPreconditions(brief, workspacePath);
    case '80-verify':
      return checkVerifyPreconditions(brief);
    case '90-close':
      return checkClosePreconditions(brief);
    default:
      return [];
  }
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
    v.push(
      validationError(
        'implement-without-workspace-path',
        '70-implement precheck requires a workspace path',
      ),
    );
    return v;
  }

  const prepPath = `${workspacePath}/60-prep.md`;
  if (!existsSync(prepPath)) {
    v.push(
      validationError(
        'implement-without-prep-file',
        '70-implement cannot run because 60-prep.md is missing',
      ),
    );
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

const checkVerifyPreconditions = (brief: ParsedBrief): ValidationViolation[] => {
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
