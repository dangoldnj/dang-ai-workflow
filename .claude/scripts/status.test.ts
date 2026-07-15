import test from 'node:test';
import { assertHasInvariant } from './test-support/assertions.ts';
import {
  buildBrief,
  parseAndValidate,
  ranDecisionsThrough,
} from './test-support/brief-fixtures.ts';

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

test('Constraints warn when tagged with a future phase', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '30-discuss',
      },
      decisions: ranDecisionsThrough('30-discuss'),
      constraints: ['- [80-verify] Run final manual smoke test'],
    }),
    'constraint-future-phase-tag',
  );
});

test('Constraint tags must be known phases or init', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      constraints: ['- [later] Invalid phase tag'],
    }),
    'constraint-invalid-tag',
  );
});

test('Conflicts and Unknowns require stable unique IDs', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({
        conflicts: ['Choose an API shape'],
      }).replace('- [CF1] Choose an API shape', '- Choose an API shape'),
    }),
    'conflict-id-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      conflicts: [{ id: 'C1', text: 'Choose an API shape' }],
    }),
    'conflict-id-invalid',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      conflicts: [
        { id: 'CF1', text: 'Choose an API shape' },
        { id: 'CF1', text: 'Choose a storage shape' },
      ],
    }),
    'conflict-duplicate-id',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({
        unknowns: ['Need user decision'],
      }).replace('- [UK1] Need user decision', '- Need user decision'),
    }),
    'unknown-id-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      unknowns: [{ id: 'U1', text: 'Need user decision' }],
    }),
    'unknown-id-invalid',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      unknowns: [
        { id: 'UK1', text: 'Need user decision' },
        { id: 'UK1', text: 'Need product decision' },
      ],
    }),
    'unknown-duplicate-id',
  );
});

test('status transition invariants are reported', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '50-plan',
      },
      plan: [{ text: 'Implement validator tests', checked: true }],
      decisions: ranDecisionsThrough('50-plan'),
    }),
    'in-planning-with-checked-plan',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '50-plan',
      },
      plan: [{ text: 'Implement validator tests' }],
      decisions: ranDecisionsThrough('50-plan'),
      progress: [{ step: 'Implement validator tests', status: 'in-progress' }],
    }),
    'in-planning-with-progress',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-progress',
        current_phase: '50-plan',
      },
      plan: [{ text: 'Implement validator tests' }],
      decisions: ranDecisionsThrough('50-plan'),
    }),
    'in-progress-before-prep',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: { status: 'blocked' },
    }),
    'blocked-without-conflicts',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      conflicts: ['Choose an API shape'],
    }),
    'conflicts-without-blocked-status',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'complete',
        current_phase: '90-close',
      },
      verification: {
        status: 'pass',
        automatedChecks: 'passed',
        manualVerification: 'confirmed',
      },
    }),
    'status-complete-missing-what-we-built',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-progress',
        current_phase: '60-prep',
      },
      decisions: ranDecisionsThrough('60-prep'),
      whatWeBuilt: 'Finished work.',
    }),
    'what-we-built-premature',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'complete',
        current_phase: '90-close',
        current_step: 'Implement validator tests',
      },
      plan: [{ text: 'Implement validator tests', checked: true }],
      verification: {
        status: 'pass',
        automatedChecks: 'passed',
        manualVerification: 'confirmed',
      },
      whatWeBuilt: 'Finished work.',
    }),
    'current-step-stale',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-progress',
        current_phase: '60-prep',
        current_step: 'Missing plan item',
      },
      plan: [{ text: 'Implement validator tests' }],
      decisions: ranDecisionsThrough('60-prep'),
    }),
    'current-step-not-in-plan',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-progress',
        current_phase: '60-prep',
        current_step: 'Implement validator tests',
      },
      plan: [{ text: 'Implement validator tests', checked: true }],
      decisions: ranDecisionsThrough('60-prep'),
      progress: [{ step: 'Implement validator tests' }],
    }),
    'current-step-not-active',
  );
});

test('unresolved Unknowns block planning', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'in-planning',
        current_phase: '50-plan',
      },
      decisions: ranDecisionsThrough('50-plan'),
      unknowns: ['Need user decision'],
    }),
    'planning-with-unresolved-unknowns',
  );
});

test('terminal state invariants are reported', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'complete',
        current_phase: '80-verify',
      },
      verification: {
        status: 'pass',
        automatedChecks: 'passed',
        manualVerification: 'confirmed',
      },
      whatWeBuilt: 'Finished work.',
    }),
    'complete-without-close',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'complete',
        current_phase: '90-close',
      },
      whatWeBuilt: 'Finished work.',
    }),
    'complete-without-verification-pass',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: {
        status: 'abandoned',
      },
    }),
    'abandoned-without-decision-rationale',
  );
});
