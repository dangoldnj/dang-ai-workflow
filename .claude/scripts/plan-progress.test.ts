import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHasInvariant } from './test-support/assertions.ts';
import {
  buildBrief,
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

test('complete Progress records may defer manual verification', t => {
  const result = parseAndValidate(t, {
    plan: [{ text: 'Defer manual verification', checked: true }],
    progress: [
      {
        step: 'Defer manual verification',
        status: 'complete',
        automatedChecks: 'passed',
        manualVerification: 'deferred',
      },
    ],
  });

  assert.equal(
    result.violations.some(
      violation =>
        violation.invariant === 'manual-verification-invalid' ||
        violation.invariant === 'progress-complete-with-manual-needed',
    ),
    false,
  );
});

test('Plan and Acceptance Criteria items require stable unique IDs', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({
        plan: [{ text: 'Implement validator tests' }],
      }).replace(
        '- [ ] [S1] Implement validator tests',
        '- [ ] Implement validator tests',
      ),
    }),
    'plan-item-id-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      plan: [{ id: 'step-one', text: 'Implement validator tests' }],
    }),
    'plan-item-id-invalid',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      plan: [
        { id: 'A1', text: 'Implement first step' },
        { id: 'A1', text: 'Implement second step' },
      ],
    }),
    'plan-duplicate-step-id',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({
        acceptanceCriteria: [{ text: 'Validator behavior is covered' }],
      }).replace(
        '- [ ] [AC1] Validator behavior is covered',
        '- [ ] Validator behavior is covered',
      ),
    }),
    'acceptance-criteria-id-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      acceptanceCriteria: [{ id: 'C1', text: 'Validator behavior is covered' }],
    }),
    'acceptance-criteria-id-invalid',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      acceptanceCriteria: [
        { id: 'AC1', text: 'First criterion' },
        { id: 'AC1', text: 'Second criterion' },
      ],
    }),
    'acceptance-criteria-duplicate-id',
  );
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
