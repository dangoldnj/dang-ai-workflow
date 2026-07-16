import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHasInvariant } from './test-support/assertions.ts';
import {
  outputsThrough,
  parseAndValidate,
  ranDecisionsThrough,
  type WorkspaceFixture,
} from './test-support/brief-fixtures.ts';

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

test('60-prep may select rework after failed verification', t => {
  const outputs = outputsThrough('80-verify');
  outputs['60-prep.md'] = 'Selected step: S1\n';

  const failedVerification = {
    frontmatter: {
      status: 'in-progress',
      current_phase: '80-verify',
    },
    plan: [{ text: 'Implement validator tests', checked: true }],
    acceptanceCriteria: [
      { text: 'Validator behavior is covered', checked: true },
    ],
    decisions: ranDecisionsThrough('80-verify'),
    progress: [{ step: 'Implement validator tests' }],
    verification: {
      status: 'fail',
      automatedChecks: 'failed',
      manualVerification: 'confirmed',
    },
    outputs,
  } satisfies WorkspaceFixture;

  assert.equal(
    parseAndValidate(t, failedVerification, {
      beforePhase: '60-prep',
      workspacePath: true,
    }).ok,
    true,
  );

  assert.equal(
    parseAndValidate(
      t,
      {
        ...failedVerification,
        frontmatter: {
          ...failedVerification.frontmatter,
          current_step: 'Implement validator tests',
        },
        plan: [{ text: 'Implement validator tests' }],
        decisions: [
          ...failedVerification.decisions,
          '- [60-prep] [ran] [Selected rework after verification failed]',
        ],
        progress: [
          {
            step: 'Implement validator tests',
            status: 'in-progress',
            automatedChecks: 'not-run',
            manualVerification: 'not-needed',
          },
        ],
      },
      { beforePhase: '70-implement', workspacePath: true },
    ).ok,
    true,
  );
});

test('phase accounting detects future and missing ran outputs', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '00-context',
      },
      decisions: [
        '- [00-context] [ran] [Context recorded]',
        '- [10-ask-questions] [ran] [Future phase recorded]',
      ],
    }),
    'phase-accounting-future-phase-decision',
  );

  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-planning',
          current_phase: '00-context',
        },
        decisions: ['- [00-context] [ran] [Context recorded]'],
      },
      { workspacePath: true },
    ),
    'phase-accounting-ran-phase-missing-output',
  );
});

test('phase precheck invariants are reported', t => {
  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-planning',
          current_phase: '00-context',
        },
        decisions: ['- [00-context] [ran] [Context recorded]'],
      },
      { beforePhase: '10-ask-questions' },
    ),
    'phase-precheck-without-workspace-path',
  );

  assertHasInvariant(
    parseAndValidate(
      t,
      {
        includeTask: false,
      },
      { beforePhase: '00-context', workspacePath: true },
    ),
    'phase-precondition-missing-file',
  );

  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-progress',
          current_phase: '60-prep',
          current_step: 'Implement validator tests',
        },
        plan: [{ text: 'Implement validator tests' }],
        decisions: ranDecisionsThrough('60-prep'),
        outputs: outputsThrough('60-prep'),
      },
      { beforePhase: '60-prep', workspacePath: true },
    ),
    'prep-with-active-current-step',
  );

  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-progress',
          current_phase: '60-prep',
        },
        plan: [{ text: 'Implement validator tests' }],
        decisions: ranDecisionsThrough('60-prep'),
        outputs: outputsThrough('60-prep'),
      },
      { beforePhase: '70-implement', workspacePath: true },
    ),
    'implement-without-current-step',
  );

  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-progress',
          current_phase: '70-implement',
        },
        plan: [{ text: 'Implement validator tests' }],
        decisions: ranDecisionsThrough('70-implement'),
        outputs: outputsThrough('70-implement'),
      },
      { beforePhase: '80-verify', workspacePath: true },
    ),
    'verify-without-progress',
  );

  assertHasInvariant(
    parseAndValidate(
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
          { step: 'Implement validator tests', status: 'in-progress' },
        ],
        outputs: outputsThrough('70-implement'),
      },
      { beforePhase: '80-verify', workspacePath: true },
    ),
    'verify-with-active-current-step',
  );

  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-progress',
          current_phase: '70-implement',
        },
        plan: [{ text: 'Implement validator tests', checked: true }],
        decisions: ranDecisionsThrough('70-implement'),
        progress: [
          {
            step: 'Implement validator tests',
            manualVerification: 'needed',
          },
        ],
        outputs: outputsThrough('70-implement'),
      },
      { beforePhase: '80-verify', workspacePath: true },
    ),
    'verify-with-manual-verification-needed',
  );
});

test('50-plan precheck requires a confirmed approach Decision', t => {
  const baseFixture = {
    frontmatter: {
      status: 'in-planning',
      current_phase: '40-structure',
    },
    outputs: outputsThrough('40-structure'),
  } satisfies WorkspaceFixture;

  const missing = parseAndValidate(
    t,
    {
      ...baseFixture,
      decisions: ranDecisionsThrough('40-structure'),
    },
    { beforePhase: '50-plan', workspacePath: true },
  );
  assert.equal(missing.ok, true);
  assertHasInvariant(missing, 'plan-without-approach-decision');

  const unconfirmed = parseAndValidate(
    t,
    {
      ...baseFixture,
      decisions: [
        ...ranDecisionsThrough('40-structure'),
        '- [30-discuss] [approach: minimal validator change] [Lowest risk]',
      ],
    },
    { beforePhase: '50-plan', workspacePath: true },
  );
  assert.equal(unconfirmed.ok, true);
  assertHasInvariant(unconfirmed, 'plan-without-confirmed-approach');

  const confirmed = parseAndValidate(
    t,
    {
      ...baseFixture,
      decisions: [
        ...ranDecisionsThrough('40-structure'),
        {
          step: '30-discuss',
          choice: 'approach: minimal validator change',
          why: 'User approved the approach',
          userConfirmed: true,
        },
      ],
    },
    { beforePhase: '50-plan', workspacePath: true },
  );
  assert.equal(confirmed.ok, true);
  assert.deepEqual(
    confirmed.violations.filter(v =>
      v.invariant.startsWith('plan-without-'),
    ),
    [],
  );
});

test('selected step output shape is validated', t => {
  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-progress',
          current_phase: '60-prep',
          current_step: 'Implement validator tests',
        },
        plan: [{ text: 'Implement validator tests' }],
        decisions: ranDecisionsThrough('60-prep'),
        outputs: {
          ...outputsThrough('60-prep'),
          '60-prep.md': 'No selected step here.\n',
        },
      },
      { workspacePath: true },
    ),
    'selected-step-missing',
  );

  assertHasInvariant(
    parseAndValidate(
      t,
      {
        frontmatter: {
          status: 'in-progress',
          current_phase: '60-prep',
          current_step: 'Implement validator tests',
        },
        plan: [{ text: 'Implement validator tests' }],
        decisions: ranDecisionsThrough('60-prep'),
        outputs: {
          ...outputsThrough('60-prep'),
          '60-prep.md': 'Selected step: S1\nSelected step: S1\n',
        },
      },
      { workspacePath: true },
    ),
    'selected-step-multiple',
  );
});
