import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHasInvariant } from './test-support/assertions.ts';
import {
  buildBrief,
  formatVerification,
  parseAndValidate,
} from './test-support/brief-fixtures.ts';

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

test('frontmatter parser and shape errors are reported', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({}).replace('slug: sample-task', 'slug sample-task'),
    }),
    'frontmatter-line-unparseable',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: '---\nslug: sample-task\n',
    }),
    'frontmatter-unterminated',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({}).replace(/^---\n[\s\S]+?\n---\n/, ''),
    }),
    'frontmatter-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: { status: 'invalid-status' },
    }),
    'frontmatter-status',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: { brief_version: 1 },
    }),
    'frontmatter-brief-version',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: { current_phase: '99-done' },
    }),
    'frontmatter-current-phase',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: { current_step: true },
    }),
    'frontmatter-current-step',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: { commits_authorized: 'yes' },
    }),
    'frontmatter-commits-authorized',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      frontmatter: { created: 'July 14, 2026' },
    }),
    'frontmatter-created',
  );
});

test('section order warnings are reported', t => {
  const frontmatter = buildBrief({}).match(/^---\n[\s\S]+?\n---\n/)?.[0] ?? '';
  const rawBrief = [
    frontmatter,
    '## What We Built',
    '',
    '## Approach',
    '',
    '## Goal',
    'Validate workflow state.',
    '',
    '## Plan',
    '',
    '## Acceptance Criteria',
    '',
    '## Verification',
    ...formatVerification({
      status: 'fail',
      automatedChecks: 'not-run',
      manualVerification: 'needed',
      notes: ['Initial state.'],
    }),
    '',
    '## Conflicts',
    '',
    '## Unknowns',
    '',
    '## Constraints',
    '',
    '## Decisions',
    '',
    '## Progress',
    '',
  ].join('\n');

  assertHasInvariant(parseAndValidate(t, { rawBrief }), 'section-out-of-order');
});

test('parse errors for structured sections are reported', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      plan: [{ text: 'Implement validator tests' }],
      rawBrief: buildBrief({
        plan: [{ text: 'Implement validator tests' }],
      }).replace(
        '- [ ] [S1] Implement validator tests',
        '- Implement validator tests',
      ),
    }),
    'plan-line-unparseable',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({
        conflicts: ['Conflict requires decision'],
      }).replace('- Conflict requires decision', 'Conflict requires decision'),
    }),
    'list-line-unparseable',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      constraints: ['Constraint without phase tag'],
    }),
    'constraint-line-unparseable',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      decisions: ['- [30-discuss] [ran]'],
    }),
    'decision-line-unparseable',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      decisions: ['- [   ] [selected approach] [User chose it]'],
    }),
    'decision-empty-field',
  );
});

test('Verification parser errors are reported', t => {
  const verificationRaw = buildBrief({}).replace('Status: fail\n', '');
  assertHasInvariant(
    parseAndValidate(t, { rawBrief: verificationRaw }),
    'verification-status-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      verification: {
        status: 'fail',
        automatedChecks: 'not-run',
        manualVerification: 'needed',
      },
      rawBrief: buildBrief({
        verification: {
          status: 'fail',
          automatedChecks: 'not-run',
          manualVerification: 'needed',
        },
      }).replace('Status: fail', 'Status: maybe'),
    }),
    'verification-status-invalid',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({}).replace(
        'Automated checks:\n- not-run\n',
        'Automated checks:\n',
      ),
    }),
    'automated-checks-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({}).replace(
        'Automated checks:\n- not-run\n',
        'Automated checks:\n- not-run\n- passed\n',
      ),
    }),
    'automated-checks-too-many-items',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({}).replace('- not-run', '- unknown'),
    }),
    'automated-checks-invalid',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({}).replace(
        'Manual verification:\n- needed\n',
        'Manual verification:\n',
      ),
    }),
    'verification-manual-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({}).replace(
        'Manual verification:\n- needed\n',
        'Manual verification:\n- needed\n- confirmed\n',
      ),
    }),
    'verification-manual-too-many-items',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: buildBrief({}).replace('- needed', '- unknown'),
    }),
    'verification-manual-invalid',
  );
});

test('Progress parser errors are reported', t => {
  const base = buildBrief({
    verification: {
      status: 'fail',
      automatedChecks: 'not-run',
      manualVerification: 'confirmed',
    },
    plan: [{ text: 'Implement validator tests' }],
    progress: [
      {
        step: 'Implement validator tests',
        status: 'in-progress',
        automatedChecks: 'not-run',
        manualVerification: 'needed',
      },
    ],
  });

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: base.replace('Step: S1\n', ''),
    }),
    'progress-step-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: base.replace('Status: in-progress\n', ''),
    }),
    'progress-status-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: base.replace('Status: in-progress', 'Status: waiting'),
    }),
    'progress-status-invalid',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: base.replace(
        'Manual verification:\n- needed\n',
        'Manual verification:\n',
      ),
    }),
    'manual-verification-missing',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: base.replace(
        'Manual verification:\n- needed\n',
        'Manual verification:\n- needed\n- confirmed\n',
      ),
    }),
    'manual-verification-too-many-items',
  );

  assertHasInvariant(
    parseAndValidate(t, {
      rawBrief: base.replace('- needed', '- later'),
    }),
    'manual-verification-invalid',
  );
});

test('Goal is required', t => {
  assertHasInvariant(
    parseAndValidate(t, {
      goal: '  ',
    }),
    'goal-missing',
  );
});
