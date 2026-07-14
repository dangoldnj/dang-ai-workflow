import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import { BRIEF_SECTIONS, LAST_VALID_SNAPSHOT, PHASES } from '../lib/constants.ts';
import { parseBrief } from '../lib/parse-brief.ts';
import type { Phase } from '../lib/types.ts';
import { PHASE_OUTPUT_FILES } from '../lib/validate/phase-accounting.ts';
import type { ValidationResult } from '../lib/validate/types.ts';
import { validateBrief } from '../validate-brief.ts';

export type FrontmatterKey =
  | 'brief_version'
  | 'slug'
  | 'status'
  | 'current_phase'
  | 'current_step'
  | 'commits_authorized'
  | 'created';

export type FrontmatterValue = string | number | boolean | null;
export type BriefSectionTitle = (typeof BRIEF_SECTIONS)[number];

export type PlanItemFixture = {
  id?: string;
  text: string;
  checked?: boolean;
};

export type VerificationFixture = {
  status: 'pass' | 'fail';
  automatedChecks?: 'passed' | 'failed' | 'not-run';
  manualVerification?: 'confirmed' | 'needed' | 'deferred';
  notes?: string[];
};

export type ProgressFixture = {
  step: string;
  status?:
    | 'not-started'
    | 'in-progress'
    | 'blocked'
    | 'automated-checks-passed'
    | 'manual-verification-needed'
    | 'complete';
  automatedChecks?: 'passed' | 'failed' | 'not-run';
  manualVerification?: 'needed' | 'not-needed' | 'confirmed';
  notes?: string[];
};

export type WorkspaceFixture = {
  frontmatter?: Partial<Record<FrontmatterKey, FrontmatterValue>>;
  omitFrontmatter?: FrontmatterKey[];
  extraFrontmatter?: Record<string, FrontmatterValue>;
  plan?: PlanItemFixture[];
  acceptanceCriteria?: PlanItemFixture[];
  verification?: VerificationFixture;
  decisions?: string[];
  progress?: ProgressFixture[];
  conflicts?: string[];
  unknowns?: string[];
  constraints?: string[];
  outputs?: Record<string, string>;
  goal?: string;
  approach?: string;
  whatWeBuilt?: string;
  includeTask?: boolean;
  lineEnding?: '\n' | '\r\n';
  sectionTitleOverrides?: Partial<Record<BriefSectionTitle, string>>;
  lastValidBrief?: string;
  rawBrief?: string;
};

const DEFAULT_FRONTMATTER: Record<FrontmatterKey, FrontmatterValue> = {
  brief_version: 2,
  slug: 'sample-task',
  status: 'not-started',
  current_phase: null,
  current_step: null,
  commits_authorized: false,
  created: '2026-07-13',
};

export const makeWorkspace = (
  t: TestContext,
  fixture: WorkspaceFixture = {},
): { dir: string; briefPath: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'validate-brief-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const briefPath = join(dir, 'brief.md');
  writeFileSync(briefPath, fixture.rawBrief ?? buildBrief(fixture), 'utf8');

  if (fixture.lastValidBrief !== undefined) {
    writeFileSync(
      join(dir, LAST_VALID_SNAPSHOT),
      fixture.lastValidBrief,
      'utf8',
    );
  }

  if (fixture.includeTask !== false) {
    writeFileSync(join(dir, 'task.md'), 'Task fixture.\n', 'utf8');
  }

  for (const [file, content] of Object.entries(fixture.outputs ?? {})) {
    writeFileSync(join(dir, file), content, 'utf8');
  }

  return { dir, briefPath };
};

export const parseAndValidate = (
  t: TestContext,
  fixture: WorkspaceFixture = {},
  options: { beforePhase?: Phase; workspacePath?: boolean } = {},
): ValidationResult => {
  const workspace = makeWorkspace(t, fixture);
  return validateBrief(parseBrief(workspace.briefPath), {
    ...(options.beforePhase ? { beforePhase: options.beforePhase } : {}),
    ...(options.workspacePath ? { workspacePath: workspace.dir } : {}),
  });
};

export const buildBrief = (fixture: WorkspaceFixture): string => {
  const plan = withDefaultIds(fixture.plan ?? [], 'S');
  const acceptanceCriteria = withDefaultIds(
    fixture.acceptanceCriteria ?? [],
    'AC',
  );
  const planIdsByText = new Map(plan.map(item => [item.text, item.id]));
  const frontmatter = {
    ...DEFAULT_FRONTMATTER,
    ...fixture.frontmatter,
  };
  if (
    typeof frontmatter.current_step === 'string' &&
    planIdsByText.has(frontmatter.current_step)
  ) {
    frontmatter.current_step = planIdsByText.get(frontmatter.current_step)!;
  }
  const omittedFrontmatter = new Set<FrontmatterKey>(
    fixture.omitFrontmatter ?? [],
  );

  const lines = [
    '---',
    ...Object.entries(frontmatter)
      .filter(([key]) => !omittedFrontmatter.has(key as FrontmatterKey))
      .map(([key, value]) => `${key}: ${formatFrontmatterValue(value)}`),
    ...Object.entries(fixture.extraFrontmatter ?? {}).map(
      ([key, value]) => `${key}: ${formatFrontmatterValue(value)}`,
    ),
    '---',
    '',
    sectionHeading(fixture, 'What We Built'),
    fixture.whatWeBuilt ?? '',
    '',
    sectionHeading(fixture, 'Goal'),
    fixture.goal ?? 'Validate workflow state.',
    '',
    sectionHeading(fixture, 'Approach'),
    fixture.approach ?? '',
    '',
    sectionHeading(fixture, 'Plan'),
    ...formatChecklist(plan),
    '',
    sectionHeading(fixture, 'Acceptance Criteria'),
    ...formatChecklist(acceptanceCriteria),
    '',
    sectionHeading(fixture, 'Verification'),
    ...formatVerification(
      fixture.verification ?? {
        status: 'fail',
        automatedChecks: 'not-run',
        manualVerification: 'needed',
        notes: ['Initial state.'],
      },
    ),
    '',
    sectionHeading(fixture, 'Conflicts'),
    ...formatBullets(fixture.conflicts ?? []),
    '',
    sectionHeading(fixture, 'Unknowns'),
    ...formatBullets(fixture.unknowns ?? []),
    '',
    sectionHeading(fixture, 'Constraints'),
    ...(fixture.constraints ?? []),
    '',
    sectionHeading(fixture, 'Decisions'),
    ...(fixture.decisions ?? []),
    '',
    sectionHeading(fixture, 'Progress'),
    ...formatProgress(fixture.progress ?? [], planIdsByText),
    '',
  ];

  return lines.join(fixture.lineEnding ?? '\n');
};

const sectionHeading = (
  fixture: WorkspaceFixture,
  section: BriefSectionTitle,
): string => `## ${fixture.sectionTitleOverrides?.[section] ?? section}`;

const formatFrontmatterValue = (value: FrontmatterValue): string => {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return value;
};

const withDefaultIds = (
  items: PlanItemFixture[],
  prefix: 'S' | 'AC',
): Required<PlanItemFixture>[] =>
  items.map((item, index) => ({
    ...item,
    id: item.id ?? `${prefix}${index + 1}`,
    checked: item.checked ?? false,
  }));

const formatChecklist = (items: Required<PlanItemFixture>[]): string[] =>
  items.map(item => `- [${item.checked ? 'x' : ' '}] [${item.id}] ${item.text}`);

const formatBullets = (items: string[]): string[] =>
  items.map(item => `- ${item}`);

export const formatVerification = (verification: VerificationFixture): string[] => [
  `Status: ${verification.status}`,
  'Automated checks:',
  `- ${verification.automatedChecks ?? 'not-run'}`,
  'Manual verification:',
  `- ${verification.manualVerification ?? 'needed'}`,
  'Notes:',
  ...(verification.notes ?? ['Fixture verification.']).map(note => `- ${note}`),
];

const formatProgress = (
  records: ProgressFixture[],
  planIdsByText: Map<string, string>,
): string[] =>
  records.flatMap((record, index) => [
    ...(index === 0 ? [] : ['']),
    `Step: ${planIdsByText.get(record.step) ?? record.step}`,
    `Status: ${record.status ?? 'complete'}`,
    'Automated checks:',
    `- ${record.automatedChecks ?? 'passed'}`,
    'Manual verification:',
    `- ${record.manualVerification ?? 'confirmed'}`,
    'Notes:',
    ...(record.notes ?? ['Fixture progress.']).map(note => `- ${note}`),
  ]);

export const ranDecisionsThrough = (phase: Phase): string[] => {
  const phaseIndex = PHASES.indexOf(phase);
  return PHASES.slice(0, phaseIndex + 1).map(
    p => `- [${p}] [ran] [Fixture phase outcome]`,
  );
};

export const outputsThrough = (phase: Phase): Record<string, string> => {
  const phaseIndex = PHASES.indexOf(phase);
  const outputs: Record<string, string> = {};
  for (const p of PHASES.slice(0, phaseIndex + 1)) {
    const file = PHASE_OUTPUT_FILES[p];
    if (file !== null) {
      outputs[file] = `${p} output.\n`;
    }
  }
  return outputs;
};
