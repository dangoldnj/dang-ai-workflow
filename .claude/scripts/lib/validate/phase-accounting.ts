import { existsSync } from 'node:fs';
import { PHASES } from '../constants.ts';
import type { ParsedBrief, Phase } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

type PhaseOutcome = 'ran' | 'skipped';

export const PHASE_OUTPUT_FILES = {
  '00-context': '00-context.md',
  '10-ask-questions': '10-ask-questions.md',
  '20-research': '20-research.md',
  '30-discuss': '30-discuss.md',
  '40-structure': '40-structure.md',
  '50-plan': '50-plan.md',
  '60-prep': '60-prep.md',
  '70-implement': '70-implement.md',
  '80-verify': '80-verify.md',
  '90-close': null,
} satisfies Record<Phase, string | null>;

export const SELF_GATED_PHASES: Phase[] = [
  '00-context',
  '10-ask-questions',
  '20-research',
];

export const checkPhaseAccounting = (
  brief: ParsedBrief,
  workspacePath: string | undefined,
): ValidationViolation[] => {
  const currentPhase = brief.frontmatter.current_phase;
  const v: ValidationViolation[] = [];
  const currentIndex =
    currentPhase === null ? -1 : PHASES.indexOf(currentPhase);
  const accountedPhases =
    currentIndex === -1 ? [] : PHASES.slice(0, currentIndex + 1);

  for (const phase of accountedPhases) {
    const latestOutcome = getLatestPhaseOutcome(brief, phase);
    if (latestOutcome === undefined) {
      v.push(
        validationError(
          'phase-accounting-missing-decision',
          `${phase} is at or before current_phase but has no [${phase}] [ran|skipped] Decision`,
          'Decisions',
        ),
      );
      continue;
    }

    v.push(
      ...checkLatestPhaseOutcome(
        phase,
        latestOutcome,
        currentIndex,
        workspacePath,
      ),
    );
  }

  const futureAccountedPhases = PHASES.slice(currentIndex + 1).flatMap(phase => {
    const latestOutcome = getLatestPhaseOutcome(brief, phase);
    return latestOutcome === undefined
      ? []
      : checkLatestPhaseOutcome(
          phase,
          latestOutcome,
          currentIndex,
          workspacePath,
        );
  });

  v.push(...futureAccountedPhases);

  return v;
};

export const isPriorPhaseAccountedFor = (
  brief: ParsedBrief,
  phase: Phase,
  workspacePath: string,
): boolean => {
  const latestOutcome = getLatestPhaseOutcome(brief, phase);
  if (latestOutcome === undefined) {
    return false;
  }

  if (latestOutcome.outcome === 'skipped') {
    return (
      SELF_GATED_PHASES.includes(phase) &&
      !phaseOutputExists(phase, workspacePath)
    );
  }

  const outputFile = PHASE_OUTPUT_FILES[phase];
  return outputFile === null || phaseOutputExists(phase, workspacePath);
};

const checkLatestPhaseOutcome = (
  phase: Phase,
  latestOutcome: { outcome: PhaseOutcome },
  currentIndex: number,
  workspacePath: string | undefined,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const phaseIndex = PHASES.indexOf(phase);

  if (
    latestOutcome.outcome === 'skipped' &&
    !SELF_GATED_PHASES.includes(phase)
  ) {
    v.push(
      validationError(
        'phase-accounting-non-self-gated-skip',
        `${phase} is recorded as skipped but only self-gated phases may skip`,
        'Decisions',
      ),
    );
  }

  if (phaseIndex > currentIndex) {
    v.push(
      validationError(
        'phase-accounting-future-phase-decision',
        `${phase} is recorded as ${latestOutcome.outcome} but current_phase has not advanced to that phase`,
        'Decisions',
      ),
    );
  }

  if (workspacePath === undefined) {
    return v;
  }

  if (
    latestOutcome.outcome === 'skipped' &&
    phaseOutputExists(phase, workspacePath)
  ) {
    v.push(
      validationError(
        'phase-accounting-skipped-phase-has-output',
        `${phase} is recorded as skipped but ${PHASE_OUTPUT_FILES[phase]} exists`,
        PHASE_OUTPUT_FILES[phase] ?? undefined,
      ),
    );
  }

  const outputFile = PHASE_OUTPUT_FILES[phase];
  if (
    latestOutcome.outcome === 'ran' &&
    outputFile !== null &&
    !phaseOutputExists(phase, workspacePath)
  ) {
    v.push(
      validationError(
        'phase-accounting-ran-phase-missing-output',
        `${phase} is recorded as ran but ${outputFile} is missing`,
        outputFile,
      ),
    );
  }

  return v;
};

const getLatestPhaseOutcome = (
  brief: ParsedBrief,
  phase: Phase,
): { outcome: PhaseOutcome } | undefined => {
  const decision = [...brief.sections.Decisions]
    .reverse()
    .find(entry => entry.step === phase && parsePhaseOutcome(entry.choice));

  if (decision === undefined) {
    return undefined;
  }

  const outcome = parsePhaseOutcome(decision.choice);
  if (outcome === undefined) {
    return undefined;
  }

  return { outcome };
};

const parsePhaseOutcome = (choice: string): PhaseOutcome | undefined => {
  const normalized = choice.toLowerCase();
  if (normalized === 'ran') return 'ran';
  if (normalized === 'skipped') return 'skipped';
  return undefined;
};

const phaseOutputExists = (phase: Phase, workspacePath: string): boolean => {
  const outputFile = PHASE_OUTPUT_FILES[phase];
  return outputFile !== null && existsSync(`${workspacePath}/${outputFile}`);
};
