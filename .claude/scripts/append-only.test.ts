import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHasInvariant } from './test-support/assertions.ts';
import {
  buildBrief,
  outputsThrough,
  parseAndValidate,
  ranDecisionsThrough,
} from './test-support/brief-fixtures.ts';

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
  outputs['60-prep.md'] = 'Selected step: S1\n';

  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'in-progress',
        current_phase: '70-implement',
        current_step: 'Implement validator tests',
      },
      plan: [{ text: 'Implement validator tests' }],
      acceptanceCriteria: [
        { text: 'Validator behavior is covered', checked: true },
      ],
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

test('last-valid snapshot allows blockers moved to Decisions', t => {
  const result = parseAndValidate(
    t,
    {
      decisions: [
        '- [30-discuss] [resolved UK1] [Need user approval before committing. User confirmed commits are authorized]',
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

test('last-valid snapshot requires moved blocker decisions to preserve text', t => {
  assertHasInvariant(
    parseAndValidate(
      t,
      {
        decisions: [
          '- [30-discuss] [resolved UK1] [User confirmed commits are authorized]',
        ],
        lastValidBrief: buildBrief({
          unknowns: ['Need user approval before committing'],
        }),
      },
      { workspacePath: true },
    ),
    'append-only-entry-removed',
  );
});

test('last-valid snapshot requires blocker resolution decisions to reference IDs', t => {
  assertHasInvariant(
    parseAndValidate(
      t,
      {
        decisions: [
          '- [30-discuss] [chose TypeScript] [Matches project style]',
        ],
        lastValidBrief: buildBrief({
          unknowns: ['Need user approval before committing'],
        }),
      },
      { workspacePath: true },
    ),
    'append-only-entry-removed',
  );
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
