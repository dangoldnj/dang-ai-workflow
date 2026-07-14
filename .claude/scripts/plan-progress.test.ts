import test from 'node:test';
import { assertHasInvariant } from './test-support/assertions.ts';
import {
  parseAndValidate,
  ranDecisionsThrough,
} from './test-support/brief-fixtures.ts';

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

test('Progress records must be internally consistent', t => {
  const plan = [
    { text: 'Complete with manual needed' },
    { text: 'Complete with failed checks' },
    { text: 'Checks passed mismatch' },
  ];
  const result = parseAndValidate(t, {
    plan,
    progress: [
      {
        step: 'Complete with manual needed',
        status: 'complete',
        automatedChecks: 'passed',
        manualVerification: 'needed',
      },
      {
        step: 'Complete with failed checks',
        status: 'complete',
        automatedChecks: 'failed',
        manualVerification: 'confirmed',
      },
      {
        step: 'Checks passed mismatch',
        status: 'automated-checks-passed',
        automatedChecks: 'not-run',
      },
    ],
  });

  assertHasInvariant(result, 'progress-complete-with-manual-needed');
  assertHasInvariant(result, 'progress-complete-with-failed-checks');
  assertHasInvariant(result, 'progress-checks-passed-mismatch');
});

test('complete Progress records require checked Plan items', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      plan: [{ text: 'Implement validator tests' }],
      progress: [{ step: 'Implement validator tests' }],
    }),
    'plan-unchecked-with-complete-progress',
  );
});

test('Plan must be populated once planning has run', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '50-plan',
      },
      decisions: ranDecisionsThrough('50-plan'),
    }),
    'plan-empty-after-plan-phase',
  );
});

test('Acceptance Criteria should be populated once planning has run', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '50-plan',
      },
      plan: [{ text: 'Implement validator tests' }],
      decisions: ranDecisionsThrough('50-plan'),
    }),
    'acceptance-criteria-empty-after-plan-phase',
  );
});

test('plan and progress consistency invariants are reported', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      plan: [{ text: 'Implement validator tests' }],
      progress: [{ step: 'Different step', status: 'in-progress' }],
    }),
    'progress-step-not-in-plan',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      plan: [{ text: 'Implement validator tests', checked: true }],
    }),
    'plan-checked-without-progress',
  );
});
