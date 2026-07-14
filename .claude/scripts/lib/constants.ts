export const LAST_VALID_SNAPSHOT = '.brief.last-valid.md';

export const WORKFLOW_STATUSES = [
  'not-started',
  'in-planning',
  'in-progress',
  'blocked',
  'complete',
  'abandoned',
] as const;

export const STEP_STATUSES = [
  'not-started',
  'in-progress',
  'blocked',
  'automated-checks-passed',
  'manual-verification-needed',
  'complete',
] as const;

export const ACTIVE_CURRENT_STEP_STATUSES: (typeof STEP_STATUSES)[number][] = [
  'in-progress',
  'blocked',
  'automated-checks-passed',
  'manual-verification-needed',
] as const;

export const PHASES = [
  '00-context',
  '10-ask-questions',
  '20-research',
  '30-discuss',
  '40-structure',
  '50-plan',
  '60-prep',
  '70-implement',
  '80-verify',
  '90-close',
] as const;

export const BRIEF_SECTIONS = [
  'What We Built',
  'Goal',
  'Approach',
  'Plan',
  'Acceptance Criteria',
  'Verification',
  'Conflicts',
  'Unknowns',
  'Constraints',
  'Decisions',
  'Progress',
] as const;

type BriefSectionType = 'A' | 'B' | 'C' | 'D';

export const SECTION_TYPES = {
  'What We Built': 'D',
  Goal: 'D',
  Approach: 'D',
  Plan: 'C',
  'Acceptance Criteria': 'C',
  Verification: 'D',
  Conflicts: 'B',
  Unknowns: 'B',
  Constraints: 'A',
  Decisions: 'A',
  Progress: 'D',
} satisfies Record<(typeof BRIEF_SECTIONS)[number], BriefSectionType>;
