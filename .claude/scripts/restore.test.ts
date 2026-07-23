import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const validatorPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'validate-brief.ts',
);

const SNAPSHOT = '.brief.last-valid.md';

test('--restore overwrites brief.md with the last valid snapshot', t => {
  const workspace = makeWorkspace(t, {
    brief: 'BROKEN CURRENT STATE\n',
    snapshot: 'SNAPSHOT CONTENT\n',
  });

  const result = runRestore(validatorPath, workspace);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Restored/);
  assert.equal(
    readFileSync(join(workspace, 'brief.md'), 'utf8'),
    'SNAPSHOT CONTENT\n',
  );
});

test('--restore fails and leaves brief.md untouched when no snapshot exists', t => {
  const workspace = makeWorkspace(t, { brief: 'CURRENT STATE\n' });

  const result = runRestore(validatorPath, workspace);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /\.brief\.last-valid\.md/);
  assert.equal(
    readFileSync(join(workspace, 'brief.md'), 'utf8'),
    'CURRENT STATE\n',
  );
});

test('--restore rejects a before-phase argument before touching brief.md', t => {
  const workspace = makeWorkspace(t, {
    brief: 'CURRENT STATE\n',
    snapshot: 'SNAPSHOT CONTENT\n',
  });

  const result = spawnSync(
    process.execPath,
    [validatorPath, '--restore', workspace, '70-implement'],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /before-phase/);
  assert.equal(
    readFileSync(join(workspace, 'brief.md'), 'utf8'),
    'CURRENT STATE\n',
  );
});

const runRestore = (validator: string, workspace: string) =>
  spawnSync(process.execPath, [validator, '--restore', workspace], {
    encoding: 'utf8',
  });

const makeWorkspace = (
  t: TestContext,
  options: { brief: string; snapshot?: string },
): string => {
  const root = join(
    tmpdir(),
    `validate-brief-restore-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  const workspace = join(root, 'thoughts', 'shared', 'work', 'sample-task');
  mkdirSync(workspace, { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  writeFileSync(join(workspace, 'brief.md'), options.brief, 'utf8');
  if (options.snapshot !== undefined) {
    writeFileSync(join(workspace, SNAPSHOT), options.snapshot, 'utf8');
  }

  return workspace;
};
