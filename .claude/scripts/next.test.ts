import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextWorkflowAction } from './lib/next.ts';
import { parseBrief } from './lib/parse-brief.ts';
import {
  makeWorkspace,
  outputsThrough,
  ranDecisionsThrough,
} from './test-support/brief-fixtures.ts';

const parseFixture = (
  t: Parameters<typeof makeWorkspace>[0],
  fixture: Parameters<typeof makeWorkspace>[1],
) => parseBrief(makeWorkspace(t, fixture).briefPath);

test('next action starts a new workflow at 00-context', t => {
  assert.deepEqual(getNextWorkflowAction(parseFixture(t, {})), {
    kind: 'phase',
    phase: '00-context',
    reason: 'No current phase is recorded',
  });
});

test('next action advances planning by phase order', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'in-planning',
          current_phase: '30-discuss',
        },
        decisions: ranDecisionsThrough('30-discuss'),
      }),
    ),
    {
      kind: 'phase',
      phase: '40-structure',
      reason: 'Continue after 30-discuss',
    },
  );
});

test('next action routes active implementation steps to 70-implement', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'in-progress',
          current_phase: '60-prep',
          current_step: 'Implement validator tests',
        },
        plan: [{ text: 'Implement validator tests' }],
        decisions: ranDecisionsThrough('60-prep'),
        outputs: {
          ...outputsThrough('60-prep'),
          '60-prep.md': 'Selected step: S1\n',
        },
      }),
    ),
    {
      kind: 'phase',
      phase: '70-implement',
      reason: 'An active current_step is ready for implementation',
    },
  );
});

test('next action routes unchecked plan items to 60-prep', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'in-progress',
          current_phase: '70-implement',
        },
        plan: [
          { text: 'Implement validator tests', checked: true },
          { text: 'Document validator CLI' },
        ],
        decisions: ranDecisionsThrough('70-implement'),
        progress: [{ step: 'Implement validator tests' }],
      }),
    ),
    {
      kind: 'phase',
      phase: '60-prep',
      reason: 'Plan has unchecked items and no active current_step',
    },
  );
});

test('next action routes completed plan to 80-verify', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'in-progress',
          current_phase: '70-implement',
        },
        plan: [{ text: 'Implement validator tests', checked: true }],
        decisions: ranDecisionsThrough('70-implement'),
        progress: [{ step: 'Implement validator tests' }],
      }),
    ),
    {
      kind: 'phase',
      phase: '80-verify',
      reason: 'All Plan items are checked',
    },
  );
});

test('next action routes verified completed plan to 90-close', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
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
          status: 'pass',
          automatedChecks: 'passed',
          manualVerification: 'confirmed',
        },
        outputs: outputsThrough('80-verify'),
      }),
    ),
    {
      kind: 'phase',
      phase: '90-close',
      reason: 'Verification passed; ready to close',
    },
  );
});

test('next action routes failed verification to 60-prep for rework', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'in-progress',
          current_phase: '80-verify',
        },
        plan: [{ text: 'Implement validator tests', checked: true }],
        decisions: ranDecisionsThrough('80-verify'),
        progress: [{ step: 'Implement validator tests' }],
        verification: {
          status: 'fail',
          automatedChecks: 'failed',
          manualVerification: 'confirmed',
        },
        outputs: outputsThrough('80-verify'),
      }),
    ),
    {
      kind: 'phase',
      phase: '60-prep',
      reason: 'Verification failed; select a rework step',
    },
  );
});

test('next action routes completed rework back to 80-verify', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'in-progress',
          current_phase: '80-verify',
        },
        plan: [{ text: 'Implement validator tests', checked: true }],
        decisions: [
          ...ranDecisionsThrough('80-verify'),
          '- [60-prep] [ran] [Selected rework after verification failed]',
          '- [70-implement] [ran] [Rework completed]',
        ],
        progress: [{ step: 'Implement validator tests' }],
        verification: {
          status: 'fail',
          automatedChecks: 'failed',
          manualVerification: 'confirmed',
        },
        outputs: outputsThrough('80-verify'),
      }),
    ),
    {
      kind: 'phase',
      phase: '80-verify',
      reason: 'All Plan items are checked',
    },
  );
});

test('next action routes rework recorded as [ran: <step>] back to 80-verify', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'in-progress',
          current_phase: '80-verify',
        },
        plan: [{ text: 'Implement validator tests', checked: true }],
        // Only the [ran: S3] entry follows the stale [80-verify] [ran] from
        // ranDecisionsThrough. If the router falls back to exact `=== 'ran'`
        // matching, it skips this entry and (wrongly) treats the earlier
        // [80-verify] [ran] as the latest rework-loop run, routing back to
        // 60-prep instead of forward to 80-verify.
        decisions: [
          ...ranDecisionsThrough('80-verify'),
          '- [70-implement] [ran: S3] [Reworked step 3]',
        ],
        progress: [{ step: 'Implement validator tests' }],
        verification: {
          status: 'fail',
          automatedChecks: 'failed',
          manualVerification: 'confirmed',
        },
        outputs: outputsThrough('80-verify'),
      }),
    ),
    {
      kind: 'phase',
      phase: '80-verify',
      reason: 'All Plan items are checked',
    },
  );
});

test('next action stops for terminal or blocked statuses', t => {
  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'complete',
          current_phase: '90-close',
        },
        whatWeBuilt: 'Finished work.',
      }),
    ),
    {
      kind: 'stop',
      reason: 'complete',
      message: 'Workflow is already complete',
    },
  );

  assert.deepEqual(
    getNextWorkflowAction(
      parseFixture(t, {
        frontmatter: {
          status: 'blocked',
          current_phase: '50-plan',
        },
        conflicts: ['Need user decision.'],
      }),
    ),
    {
      kind: 'stop',
      reason: 'blocked',
      message: 'Workflow is blocked',
    },
  );
});
