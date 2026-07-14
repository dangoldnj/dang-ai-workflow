import assert from 'node:assert/strict';
import test from 'node:test';
import {
  outputsThrough,
  parseAndValidate,
  ranDecisionsThrough,
} from './test-support/brief-fixtures.ts';

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

test('earlier phase reruns preserve current_phase high-water mark', t => {
  const outputs = outputsThrough('80-verify');
  outputs['60-prep.md'] = 'Selected step: S1\n';

  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'in-progress',
        current_phase: '80-verify',
      },
      plan: [{ text: 'Implement validator tests', checked: true }],
      acceptanceCriteria: [
        { text: 'Validator behavior is covered', checked: true },
      ],
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

test('complete lifecycle fixture passes', t => {
  const result = parseAndValidate(
    t,
    {
      frontmatter: {
        status: 'complete',
        current_phase: '90-close',
      },
      plan: [{ text: 'Implement validator tests', checked: true }],
      acceptanceCriteria: [
        { text: 'Validator behavior is covered', checked: true },
      ],
      decisions: ranDecisionsThrough('90-close'),
      progress: [{ step: 'Implement validator tests' }],
      verification: {
        status: 'pass',
        automatedChecks: 'passed',
        manualVerification: 'confirmed',
      },
      outputs: {
        ...outputsThrough('80-verify'),
        '60-prep.md': 'Selected step: S1\n',
      },
      whatWeBuilt: 'Implemented validator tests.',
    },
    { workspacePath: true },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});
