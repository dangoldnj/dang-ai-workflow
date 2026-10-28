import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  makeWorkspace,
  outputsThrough,
  ranDecisionsThrough,
} from './test-support/brief-fixtures.ts';

const validatorPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'validate-brief.ts',
);

const PHASE_RUN = '.phase-run.json';

test('a passing precheck starts the run after the phase outcomes in Decisions', t => {
  const workspace = makeContextDoneWorkspace(t);

  const result = runValidator(workspace, '10-ask-questions');

  assert.equal(result.status, 0);
  assert.deepEqual(readPhaseRun(workspace), {
    run: 2,
    phase: '10-ask-questions',
  });
});

test('each passing precheck starts the next run', t => {
  const workspace = makeContextDoneWorkspace(t);

  runValidator(workspace, '10-ask-questions');
  const result = runValidator(workspace, '10-ask-questions');

  assert.equal(result.status, 0);
  assert.deepEqual(readPhaseRun(workspace), {
    run: 3,
    phase: '10-ask-questions',
  });
});

test('a failing precheck does not start a run', t => {
  const { dir } = makeWorkspace(t, { includeTask: false });

  const result = runValidator(dir, '00-context');

  assert.equal(result.status, 1);
  assert.equal(existsSync(join(dir, PHASE_RUN)), false);
});

test('validation and routing without a phase do not start a run', t => {
  const workspace = makeContextDoneWorkspace(t);

  assert.equal(runValidator(workspace).status, 0);
  assert.equal(runValidator('--next', workspace).status, 0);

  assert.equal(existsSync(join(workspace, PHASE_RUN)), false);
});

test('a precheck fails when it cannot record the run', t => {
  const workspace = makeContextDoneWorkspace(t);
  mkdirSync(join(workspace, PHASE_RUN));

  const result = runValidator(workspace, '10-ask-questions');

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Failed to record the phase run/);
});

const runValidator = (...args: string[]) =>
  spawnSync(process.execPath, [validatorPath, ...args], { encoding: 'utf8' });

const readPhaseRun = (workspace: string): unknown =>
  JSON.parse(readFileSync(join(workspace, PHASE_RUN), 'utf8'));

const makeContextDoneWorkspace = (t: TestContext): string =>
  makeWorkspace(t, {
    frontmatter: { status: 'in-planning', current_phase: '00-context' },
    decisions: ranDecisionsThrough('00-context'),
    outputs: outputsThrough('00-context'),
  }).dir;
