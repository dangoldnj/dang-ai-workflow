import {
  BRIEF_SECTIONS,
  PHASES,
  STEP_STATUSES,
  WORKFLOW_STATUSES,
} from './constants.ts';
import type { ParseIssue } from './parse/types.ts';

type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export type StepStatus = (typeof STEP_STATUSES)[number];

export type Phase = (typeof PHASES)[number];

type BriefSection = (typeof BRIEF_SECTIONS)[number];

export type BriefFrontmatter = {
  brief_version: number;
  slug: string;
  status: WorkflowStatus;
  current_phase: Phase | null;
  current_step: string | null;
  commits_authorized: boolean;
  created: string;
};

export type ConstraintPhase = Phase | 'init';

export type ConstraintEntry = {
  phase: ConstraintPhase;
  text: string;
  raw: string;
};

export type DecisionEntry = {
  step: string;
  choice: string;
  why: string;
  raw: string;
};

export type PlanItem = {
  id?: string;
  text: string;
  checked: boolean;
  raw: string;
};

export type ProgressRecord = {
  step: string;
  status: StepStatus;
  automatedChecks: 'passed' | 'failed' | 'not-run';
  manualVerification: 'needed' | 'not-needed' | 'confirmed';
  notes: string;
  raw: string;
};

export type VerificationRecord = {
  status: 'pass' | 'fail';
  automatedChecks: 'passed' | 'failed' | 'not-run';
  manualVerification: 'confirmed' | 'needed' | 'deferred';
  notes: string;
  raw: string;
};

type ParsedBriefSections = {
  [K in BriefSection]: unknown;
} & {
  'What We Built': string | undefined;
  Goal: string | undefined;
  Approach: string | undefined;
  Plan: PlanItem[];
  'Acceptance Criteria': PlanItem[];
  Verification: VerificationRecord | undefined;
  Conflicts: string[];
  Unknowns: string[];
  Constraints: ConstraintEntry[];
  Decisions: DecisionEntry[];
  Progress: ProgressRecord[];
};

export type ParsedBrief = {
  frontmatter: BriefFrontmatter;
  sections: ParsedBriefSections;
  parseErrors: ParseIssue[];
  raw: string;
};
