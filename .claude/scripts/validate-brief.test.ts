import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import {
  BRIEF_SECTIONS,
  LAST_VALID_SNAPSHOT,
  PHASES,
} from './lib/constants.ts';
import { parseBrief } from './lib/parse-brief.ts';
import type { Phase } from './lib/types.ts';
import { PHASE_OUTPUT_FILES } from './lib/validate/phase-accounting.ts';
import type { ValidationResult } from './lib/validate/types.ts';
import { validateBrief } from './validate-brief.ts';

type FrontmatterKey =
  | 'slug'
  | 'status'
  | 'current_phase'
  | 'current_step'
  | 'commits_authorized'
  | 'created';

type FrontmatterValue = string | boolean | null;
type BriefSectionTitle = (typeof BRIEF_SECTIONS)[number];

type PlanItemFixture = {
  text: string;
  checked?: boolean;
};

type VerificationFixture = {
  status: 'pass' | 'fail';
  automatedChecks?: 'passed' | 'failed' | 'not-run';
  manualVerification?: 'confirmed' | 'needed' | 'deferred';
  notes?: string[];
};

type ProgressFixture = {
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

type WorkspaceFixture = {
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
};

const DEFAULT_FRONTMATTER: Record<FrontmatterKey, FrontmatterValue> = {
  slug: 'sample-task',
  status: 'not-started',
  current_phase: null,
  current_step: null,
  commits_authorized: false,
  created: '2026-07-13',
};

const makeWorkspace = (
  t: TestContext,
  fixture: WorkspaceFixture = {},
): { dir: string; briefPath: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'validate-brief-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const briefPath = join(dir, 'brief.md');
  writeFileSync(briefPath, buildBrief(fixture), 'utf8');

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

const parseAndValidate = (
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

const buildBrief = (fixture: WorkspaceFixture): string => {
  const frontmatter = {
    ...DEFAULT_FRONTMATTER,
    ...fixture.frontmatter,
  };
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
    ...formatChecklist(fixture.plan ?? []),
    '',
    sectionHeading(fixture, 'Acceptance Criteria'),
    ...formatChecklist(fixture.acceptanceCriteria ?? []),
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
    ...formatProgress(fixture.progress ?? []),
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

const formatChecklist = (items: PlanItemFixture[]): string[] =>
  items.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`);

const formatBullets = (items: string[]): string[] =>
  items.map(item => `- ${item}`);

const formatVerification = (verification: VerificationFixture): string[] => [
  `Status: ${verification.status}`,
  'Automated checks:',
  `- ${verification.automatedChecks ?? 'not-run'}`,
  'Manual verification:',
  `- ${verification.manualVerification ?? 'needed'}`,
  'Notes:',
  ...(verification.notes ?? ['Fixture verification.']).map(note => `- ${note}`),
];

const formatProgress = (records: ProgressFixture[]): string[] =>
  records.flatMap((record, index) => [
    ...(index === 0 ? [] : ['']),
    `Step: ${record.step}`,
    `Status: ${record.status ?? 'complete'}`,
    'Automated checks:',
    `- ${record.automatedChecks ?? 'passed'}`,
    'Manual verification:',
    `- ${record.manualVerification ?? 'confirmed'}`,
    'Notes:',
    ...(record.notes ?? ['Fixture progress.']).map(note => `- ${note}`),
  ]);

const ranDecisionsThrough = (phase: Phase): string[] => {
  const phaseIndex = PHASES.indexOf(phase);
  return PHASES.slice(0, phaseIndex + 1).map(
    p => `- [${p}] [ran] [Fixture phase outcome]`,
  );
};

const outputsThrough = (phase: Phase): Record<string, string> => {
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

const assertHasInvariant = (
  result: ValidationResult,
  invariant: string,
): void => {
  assert(
    result.violations.some(v => v.invariant === invariant),
    `Expected invariant ${invariant}; got ${result.violations
      .map(v => v.invariant)
      .join(', ')}`,
  );
};

test('valid initialized brief passes, including CRLF input normalization', t => {
  const result = parseAndValidate(t, { lineEnding: '\r\n' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('00-context completion with in-planning state passes', t => {
  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'in-planning',
        current_phase: '00-context',
      },
      decisions: ['- [00-context] [ran] [Context recorded]'],
      outputs: {
        '00-context.md': 'Context output.\n',
      },
    },
    { workspacePath: true },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('early phase state rejects stale current fields', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'not-started',
        current_phase: '00-context',
      },
      decisions: ['- [00-context] [ran] [Context recorded]'],
    }),
    'not-started-with-current-phase',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'not-started',
        current_step: 'Implement validator tests',
      },
    }),
    'not-started-with-current-step',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '50-plan',
        current_step: 'Implement validator tests',
      },
      plan: [{ text: 'Implement validator tests' }],
      decisions: ranDecisionsThrough('50-plan'),
    }),
    'current-step-before-prep',
  );
});

test('frontmatter accepts only intended keys and value formats', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      extraFrontmatter: {
        commits_authorize: true,
      },
    }),
    'frontmatter-unknown-key',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      omitFrontmatter: ['commits_authorized'],
    }),
    'frontmatter-missing-key',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        slug: 'Bad Slug',
      },
    }),
    'frontmatter-slug',
  );
});

test('section headings must match the canonical brief shape', t => {
  const typoResult = parseAndValidate(t, {
    sectionTitleOverrides: {
      Plan: 'Plans',
    },
  });

  assertHasInvariant(typoResult, 'section-missing');
  assert(
    typoResult.violations.some(
      v => v.invariant === 'section-missing' && v.message.includes('## Plan'),
    ),
    'Expected missing canonical Plan section',
  );
  assertHasInvariant(typoResult, 'section-unknown');
  assert(
    typoResult.violations.some(
      v => v.invariant === 'section-unknown' && v.message.includes('## Plans'),
    ),
    'Expected unknown typo section Plans',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      sectionTitleOverrides: {
        Progress: 'Progres',
      },
    }),
    'section-missing',
  );
});

test('last-valid snapshot enforces append-only section prefixes', t => {
  const result = parseAndValidate(
    t,
    {
      constraints: ['- [init] Preserve public API'],
      lastValidBrief: buildBrief({
        constraints: [
          '- [init] Preserve CLI behavior',
          '- [init] Keep validation deterministic',
        ],
      }),
    },
    { workspacePath: true },
  );

  assertHasInvariant(result, 'append-only-entry-modified');
  assertHasInvariant(result, 'append-only-entry-removed');
});

test('last-valid snapshot allows Progress records to be updated in place', t => {
  const outputs = outputsThrough('70-implement');
  outputs['60-prep.md'] = 'Selected step: Implement validator tests\n';

  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'in-progress',
        current_phase: '70-implement',
        current_step: 'Implement validator tests',
      },
      plan: [{ text: 'Implement validator tests' }],
      decisions: ranDecisionsThrough('70-implement'),
      progress: [
        {
          step: 'Implement validator tests',
          status: 'in-progress',
          automatedChecks: 'not-run',
          manualVerification: 'needed',
        },
      ],
      outputs,
      lastValidBrief: buildBrief({
        frontmatter: {
          status: 'in-progress',
          current_phase: '70-implement',
          current_step: 'Implement validator tests',
        },
        plan: [{ text: 'Implement validator tests' }],
        decisions: ranDecisionsThrough('70-implement'),
        progress: [
          {
            step: 'Implement validator tests',
            status: 'not-started',
            automatedChecks: 'not-run',
            manualVerification: 'needed',
          },
        ],
      }),
    },
    { workspacePath: true },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('Progress allows only one record per step', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      plan: [{ text: 'Implement validator tests' }],
      progress: [
        { step: 'Implement validator tests', status: 'in-progress' },
        { step: 'Implement validator tests', status: 'complete' },
      ],
    }),
    'progress-duplicate-step',
  );
});

test('last-valid snapshot allows blockers moved to Decisions', t => {
  const result = parseAndValidate(
    t,
    {
      decisions: [
        '- [30-discuss] [resolved unknown] [User confirmed commits are authorized]',
      ],
      lastValidBrief: buildBrief({
        unknowns: ['Need user approval before committing'],
      }),
    },
    { workspacePath: true },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('last-valid snapshot does not count phase accounting as blocker resolution', t => {
  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-planning',
          current_phase: '30-discuss',
        },
        decisions: [
          ...ranDecisionsThrough('20-research'),
          '- [30-discuss] [ran] [Discussed approach]',
        ],
        lastValidBrief: buildBrief({
          frontmatter: {
            status: 'in-planning',
            current_phase: '20-research',
          },
          decisions: ranDecisionsThrough('20-research'),
          unknowns: ['Need user approval before committing'],
        }),
      },
      { workspacePath: true },
    ),
    'append-only-entry-removed',
  );
});

test('last-valid snapshot rejects modified unresolved blockers', t => {
  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'blocked',
        },
        conflicts: ['API choice needs confirmation'],
        lastValidBrief: buildBrief({
          frontmatter: {
            status: 'blocked',
          },
          conflicts: ['API direction needs confirmation'],
        }),
      },
      { workspacePath: true },
    ),
    'append-only-entry-modified',
  );
});

test('phase preconditions distinguish missing outputs from skipped phases', t => {
  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'in-planning',
        current_phase: '20-research',
      },
      decisions: [
        '- [00-context] [ran] [Context recorded]',
        '- [10-ask-questions] [skipped] [No questions needed]',
        '- [20-research] [ran] [Research recorded]',
      ],
      outputs: {
        '00-context.md': 'Context output.\n',
      },
    },
    { beforePhase: '30-discuss', workspacePath: true },
  );

  assertHasInvariant(result, 'phase-precondition-unaccounted-prior-phase');
  assert(
    result.violations.some(v => v.message.includes('20-research')),
    'Expected missing 20-research output to fail',
  );
  assert(
    !result.violations.some(v => v.message.includes('10-ask-questions')),
    'Expected skipped 10-ask-questions without output to be accepted',
  );
});

test('skip contract is enforced through Decisions', t => {
  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-planning',
          current_phase: '00-context',
        },
      },
      { workspacePath: true },
    ),
    'phase-accounting-missing-decision',
  );

  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-planning',
          current_phase: '10-ask-questions',
        },
        decisions: [
          '- [00-context] [ran] [Context recorded]',
          '- [10-ask-questions] [skipped] [No questions needed]',
        ],
        outputs: {
          '00-context.md': 'Context output.\n',
          '10-ask-questions.md': 'Placeholder output.\n',
        },
      },
      { workspacePath: true },
    ),
    'phase-accounting-skipped-phase-has-output',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '30-discuss',
      },
      decisions: [
        '- [00-context] [ran] [Context recorded]',
        '- [10-ask-questions] [skipped] [No questions needed]',
        '- [20-research] [skipped] [No research needed]',
        '- [30-discuss] [skipped] [Invalid skip]',
      ],
    }),
    'phase-accounting-non-self-gated-skip',
  );
});

test('earlier phase reruns preserve current_phase high-water mark', t => {
  const outputs = outputsThrough('80-verify');
  outputs['60-prep.md'] = 'Selected step: Implement validator tests\n';

  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'in-progress',
        current_phase: '80-verify',
      },
      plan: [{ text: 'Implement validator tests', checked: true }],
      decisions: [
        ...ranDecisionsThrough('80-verify'),
        '- [60-prep] [ran] [Reworked after verification failed]',
      ],
      progress: [{ step: 'Implement validator tests' }],
      outputs,
    },
    { workspacePath: true },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('60-prep selected step must match the Plan and current_step', t => {
  const outputs = outputsThrough('60-prep');
  outputs['60-prep.md'] = 'Selected step: Implement a different step\n';

  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'in-progress',
        current_phase: '60-prep',
        current_step: 'Implement validator tests',
      },
      plan: [{ text: 'Implement validator tests' }],
      decisions: ranDecisionsThrough('60-prep'),
      outputs,
    },
    { workspacePath: true },
  );

  assertHasInvariant(result, 'selected-step-not-in-plan');
  assertHasInvariant(result, 'selected-step-current-step-mismatch');
});

test('verification pass requires closed implementation state', t => {
  const base = {
    frontmatter: {
      status: 'in-progress',
      current_phase: '80-verify',
    },
    plan: [{ text: 'Implement validator tests', checked: true }],
    acceptanceCriteria: [
      { text: 'Validator behavior is covered', checked: true },
    ],
    decisions: ranDecisionsThrough('80-verify'),
    verification: {
      status: 'pass',
      automatedChecks: 'passed',
      manualVerification: 'confirmed',
    },
  } satisfies WorkspaceFixture;

  assertHasInvariant(
    parseAndValidate(t, {
      ...base,
      frontmatter: {
        ...base.frontmatter,
        current_step: 'Implement validator tests',
      },
      progress: [{ step: 'Implement validator tests' }],
    }),
    'verification-pass-with-active-current-step',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      ...base,
      progress: [
        {
          step: 'Implement validator tests',
          status: 'manual-verification-needed',
          manualVerification: 'needed',
        },
      ],
    }),
    'verification-pass-without-latest-complete-progress',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      ...base,
      verification: {
        status: 'pass',
        automatedChecks: 'passed',
        manualVerification: 'deferred',
      },
      progress: [{ step: 'Implement validator tests' }],
    }),
    'verification-pass-with-manual-verification-deferred-without-decision',
  );

  const deferredResult = parseAndValidate(t, {
    ...base,
    decisions: [
      ...base.decisions,
      '- [80-verify] [defer manual verification] [External runner owns manual verification]',
    ],
    verification: {
      status: 'pass',
      automatedChecks: 'passed',
      manualVerification: 'deferred',
    },
    progress: [{ step: 'Implement validator tests' }],
  });

  assert.equal(deferredResult.ok, true);
  assert.deepEqual(deferredResult.violations, []);
});

test('90-close precheck requires passing verification', t => {
  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'in-progress',
        current_phase: '80-verify',
      },
      decisions: ranDecisionsThrough('80-verify'),
      outputs: outputsThrough('80-verify'),
    },
    { beforePhase: '90-close', workspacePath: true },
  );

  assertHasInvariant(result, 'close-without-verification-pass');
});
