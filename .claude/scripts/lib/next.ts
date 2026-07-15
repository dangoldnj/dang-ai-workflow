import { PHASES, WORKFLOW_STATUSES } from './constants.ts';
import type { ParsedBrief, Phase } from './types.ts';

type ReworkLoopPhase = '60-prep' | '70-implement' | '80-verify';

const REWORK_LOOP_PHASES: readonly ReworkLoopPhase[] = [
  '60-prep',
  '70-implement',
  '80-verify',
];

type StopReason =
  | 'abandoned'
  | 'blocked'
  | 'complete'
  | 'invalid-current-phase'
  | 'invalid-status'
  | 'no-next-phase';

export type NextWorkflowAction =
  | {
      kind: 'phase';
      phase: Phase;
      reason: string;
    }
  | {
      kind: 'stop';
      reason: StopReason;
      message: string;
    };

export const getNextWorkflowAction = (
  brief: ParsedBrief,
): NextWorkflowAction => {
  if (!WORKFLOW_STATUSES.includes(brief.frontmatter.status)) {
    return {
      kind: 'stop',
      reason: 'invalid-status',
      message: `Cannot route workflow with invalid status "${brief.frontmatter.status}"`,
    };
  }

  switch (brief.frontmatter.status) {
    case 'complete':
      return {
        kind: 'stop',
        reason: 'complete',
        message: 'Workflow is already complete',
      };
    case 'abandoned':
      return {
        kind: 'stop',
        reason: 'abandoned',
        message: 'Workflow is abandoned',
      };
    case 'blocked':
      return {
        kind: 'stop',
        reason: 'blocked',
        message: 'Workflow is blocked',
      };
  }

  const currentPhase = brief.frontmatter.current_phase;

  if (currentPhase === null) {
    return {
      kind: 'phase',
      phase: '00-context',
      reason: 'No current phase is recorded',
    };
  }

  const currentPhaseIndex = PHASES.indexOf(currentPhase);
  if (currentPhaseIndex === -1) {
    return {
      kind: 'stop',
      reason: 'invalid-current-phase',
      message: `Cannot route workflow with invalid current_phase "${currentPhase}"`,
    };
  }

  if (brief.frontmatter.status === 'in-progress') {
    if (brief.frontmatter.current_step !== null) {
      return {
        kind: 'phase',
        phase: '70-implement',
        reason: 'An active current_step is ready for implementation',
      };
    }

    if (brief.sections.Plan.some(item => !item.checked)) {
      return {
        kind: 'phase',
        phase: '60-prep',
        reason: 'Plan has unchecked items and no active current_step',
      };
    }

    if (brief.sections.Verification?.status === 'pass') {
      return {
        kind: 'phase',
        phase: '90-close',
        reason: 'Verification passed; ready to close',
      };
    }

    if (
      brief.sections.Verification?.status === 'fail' &&
      getLatestRanReworkLoopPhase(brief) === '80-verify'
    ) {
      return {
        kind: 'phase',
        phase: '60-prep',
        reason: 'Verification failed; select a rework step',
      };
    }

    return {
      kind: 'phase',
      phase: '80-verify',
      reason: 'All Plan items are checked',
    };
  }

  const nextPhase = PHASES[currentPhaseIndex + 1];
  if (nextPhase === undefined) {
    return {
      kind: 'stop',
      reason: 'no-next-phase',
      message: `No phase follows ${currentPhase}`,
    };
  }

  return {
    kind: 'phase',
    phase: nextPhase,
    reason: `Continue after ${currentPhase}`,
  };
};

const getLatestRanReworkLoopPhase = (
  brief: ParsedBrief,
): ReworkLoopPhase | undefined => {
  const decision = [...brief.sections.Decisions]
    .reverse()
    .find(
      entry =>
        isReworkLoopPhase(entry.step) && entry.choice.toLowerCase() === 'ran',
    );

  if (decision === undefined || !isReworkLoopPhase(decision.step)) {
    return undefined;
  }

  return decision.step;
};

const isReworkLoopPhase = (phase: string): phase is ReworkLoopPhase =>
  REWORK_LOOP_PHASES.includes(phase as ReworkLoopPhase);
