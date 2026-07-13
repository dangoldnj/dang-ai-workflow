import { existsSync, readFileSync } from 'node:fs';
import type { ParsedBrief } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkSelectedStep = (
  brief: ParsedBrief,
  workspacePath: string | undefined,
): ValidationViolation[] => {
  if (workspacePath === undefined) {
    return [];
  }

  const prepPath = `${workspacePath}/60-prep.md`;
  if (!existsSync(prepPath)) {
    return [];
  }

  const selectedSteps = readSelectedSteps(prepPath);
  if (selectedSteps.length === 0) {
    return [
      validationError(
        'selected-step-missing',
        '60-prep.md exists but has no Selected step line',
        '60-prep.md',
      ),
    ];
  }

  if (selectedSteps.length > 1) {
    return [
      validationError(
        'selected-step-multiple',
        `60-prep.md has ${selectedSteps.length} Selected step lines; expected exactly one`,
        '60-prep.md',
      ),
    ];
  }

  const selectedStep = selectedSteps[0];
  const planItem = brief.sections.Plan.find(item => item.text === selectedStep);
  const v: ValidationViolation[] = [];

  if (planItem === undefined) {
    v.push(
      validationError(
        'selected-step-not-in-plan',
        `60-prep.md Selected step "${selectedStep}" does not match any Plan item`,
        'Plan',
      ),
    );
  }

  if (
    brief.frontmatter.current_step !== null &&
    brief.frontmatter.current_step !== selectedStep
  ) {
    v.push(
      validationError(
        'selected-step-current-step-mismatch',
        `60-prep.md Selected step is "${selectedStep}" but current_step is "${brief.frontmatter.current_step}"`,
        '60-prep.md',
      ),
    );
  }

  return v;
};

const readSelectedSteps = (prepPath: string): string[] => {
  const prep: string = readFileSync(prepPath, 'utf8') ?? '';
  return prep
    .split(/\r?\n/)
    .map(line => line.match(/^\s*(?:-\s*)?Selected step:\s*(.+?)\s*$/)?.[1])
    .filter((step): step is string => step !== undefined)
    .map(step => step.trim());
};
