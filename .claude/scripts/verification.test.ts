import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHasInvariant } from './test-support/assertions.ts';
import {
  buildBrief,
  parseAndValidate,
  ranDecisionsThrough,
  type WorkspaceFixture,
} from './test-support/brief-fixtures.ts';

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
        automatedChecks: 'deferred',
        manualVerification: 'confirmed',
      },
      progress: [{ step: 'Implement validator tests' }],
    }),
    'verification-pass-with-automated-checks-deferred-without-decision',
  );

  const automatedDeferredResult = parseAndValidate(t, {
    ...base,
    decisions: [
      ...base.decisions,
      '- [80-verify] [defer automated checks] [No applicable automated checks for this change]',
    ],
    verification: {
      status: 'pass',
      automatedChecks: 'deferred',
      manualVerification: 'confirmed',
    },
    progress: [{ step: 'Implement validator tests' }],
  });

  assert.equal(automatedDeferredResult.ok, true);
  assert.deepEqual(automatedDeferredResult.violations, []);

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

test('progress automated checks do not accept deferred', t => {
  const rawBrief = buildBrief({
    plan: [{ text: 'Implement validator tests', checked: true }],
    progress: [{ step: 'Implement validator tests' }],
  }).replace(
    'Step: S1\nStatus: complete\nAutomated checks:\n- passed',
    'Step: S1\nStatus: complete\nAutomated checks:\n- deferred',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief,
    }),
    'automated-checks-invalid',
  );
});

test('verification pass invariants are reported', t => {
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
    progress: [{ step: 'Implement validator tests' }],
    verification: {
      status: 'pass',
      automatedChecks: 'passed',
      manualVerification: 'confirmed',
    },
  } satisfies WorkspaceFixture;

  assertHasInvariant(
    parseAndValidate(t, {
      ...base,
      plan: [{ text: 'Implement validator tests' }],
    }),
    'verification-pass-with-unchecked-plan',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      ...base,
      acceptanceCriteria: [
        { text: 'Validator behavior is covered', checked: false },
      ],
    }),
    'verification-pass-with-unmet-acceptance-criteria',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      ...base,
      conflicts: ['Resolve release blocker'],
    }),
    'verification-pass-with-conflicts',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      ...base,
      verification: {
        status: 'pass',
        automatedChecks: 'failed',
        manualVerification: 'confirmed',
      },
    }),
    'verification-pass-without-automated-checks',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      ...base,
      verification: {
        status: 'pass',
        automatedChecks: 'passed',
        manualVerification: 'needed',
      },
    }),
    'verification-pass-without-manual-verification',
  );
});
