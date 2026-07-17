import type { SHARED_ARTIFACT_TYPES } from './constants.ts';

export type SharedArtifactType = (typeof SHARED_ARTIFACT_TYPES)[number];

export type BriefSummary = {
  path: string;
  slug: string;
  status: string;
  currentPhase: string | null;
  currentStep: string | null;
  goal: string | null;
  plan: { complete: number; total: number };
  acceptanceCriteria: { complete: number; total: number };
  verification: string | null;
  conflicts: number;
  unknowns: number;
  parseErrors: number;
};

export type SharedArtifact = {
  type: SharedArtifactType;
  path: string;
  slug: string | null;
  closed: string | null;
  summary: string | null;
};

export type ReportProblem = {
  path: string;
  scope: 'active brief' | 'shared artifact' | 'directory';
  message: string;
};

export type BriefReport = {
  active: BriefSummary[];
  activeByStatus: Record<string, number>;
  open: BriefSummary[];
  shared: SharedArtifact[];
  sharedByType: Record<string, number>;
  problems: ReportProblem[];
};

export type CliArgs =
  | { ok: true; json: boolean; verbose: boolean; root: string }
  | { ok: false; message: string };
