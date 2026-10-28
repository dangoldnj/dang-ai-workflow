import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildBrief } from './test-support/brief-fixtures.ts';

const hookPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'hooks',
  'validate-brief-post-tool-use.cjs',
);

const archiveHookPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'hooks',
  'archive-workspace-file-pre-tool-use.cjs',
);

test('PostToolUse hook ignores writes outside workflow workspaces', () => {
  const result = runHook('/tmp/not-a-workspace/brief.md');

  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('PostToolUse hook reports validator failures to stderr with exit code 2', t => {
  const workspace = makeHookWorkspace(t, {
    brief: buildBrief({ omitFrontmatter: ['status'] }),
  });

  const result = runHook(join(workspace, 'brief.md'));

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /"ok": false/);
  assert.match(result.stderr, /frontmatter-missing-key/);
});

test('PostToolUse hook validates phase output writes in workflow workspaces', t => {
  const workspace = makeHookWorkspace(t, {
    brief: buildBrief({
      frontmatter: {
        status: 'in-progress',
        current_phase: '60-prep',
        current_step: 'Implement validator tests',
      },
      plan: [{ text: 'Implement validator tests' }],
      decisions: ['- [60-prep] [ran] [Fixture phase outcome]'],
    }),
    phaseOutput: 'No selected step here.\n',
  });

  const result = runHook(join(workspace, '60-prep.md'));

  assert.equal(result.status, 2);
  assert.match(result.stderr, /selected-step-missing/);
});

test('PreToolUse archive hook ignores writes outside workflow workspaces', () => {
  const result = runArchiveHook('/tmp/not-a-workspace/60-prep.md');

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('PreToolUse archive hook ignores files that do not exist yet', t => {
  const workspace = makeArchiveWorkspace(t);

  const result = runArchiveHook(join(workspace, '60-prep.md'));

  assert.equal(result.status, 0);
  assert.equal(existsSync(join(workspace, 'history')), false);
});

test('PreToolUse archive hook archives existing files with increasing numbers', t => {
  const workspace = makeArchiveWorkspace(t);
  const planPath = join(workspace, '50-plan.md');

  writeFileSync(planPath, 'Plan v1\n', 'utf8');
  assert.equal(runArchiveHook(planPath).status, 0);
  writeFileSync(planPath, 'Plan v2\n', 'utf8');
  assert.equal(runArchiveHook(planPath).status, 0);

  assert.deepEqual(listHistory(workspace), [
    '50-plan.001.md',
    '50-plan.002.md',
  ]);
  assert.equal(
    readFileSync(join(workspace, 'history', '50-plan.001.md'), 'utf8'),
    'Plan v1\n',
  );
  assert.equal(
    readFileSync(join(workspace, 'history', '50-plan.002.md'), 'utf8'),
    'Plan v2\n',
  );
});

test('PreToolUse archive hook labels archives with the step named in their contents', t => {
  const workspace = makeArchiveWorkspace(t);
  const prepPath = join(workspace, '60-prep.md');
  const implementPath = join(workspace, '70-implement.md');

  writeFileSync(prepPath, '# 60-prep\n\nSelected step: B1\n', 'utf8');
  runArchiveHook(prepPath);
  writeFileSync(prepPath, '# 60-prep\n\nSelected step: B2\n', 'utf8');
  runArchiveHook(prepPath);
  writeFileSync(prepPath, '# 60-prep\n\nSelected step: B2\nRevised.\n', 'utf8');
  runArchiveHook(prepPath);
  writeFileSync(implementPath, '# 70-implement\n\nStep: B1\n', 'utf8');
  runArchiveHook(implementPath);

  assert.deepEqual(listHistory(workspace), [
    '60-prep.B1.001.md',
    '60-prep.B2.001.md',
    '60-prep.B2.002.md',
    '70-implement.B1.001.md',
  ]);
});

test('PreToolUse archive hook ignores step lines that are not plain IDs', t => {
  const workspace = makeArchiveWorkspace(t);
  const prepPath = join(workspace, '60-prep.md');

  writeFileSync(prepPath, 'Selected step: B1 and B2\n', 'utf8');
  runArchiveHook(prepPath);

  assert.deepEqual(listHistory(workspace), ['60-prep.001.md']);
});

test('PreToolUse archive hook skips contents identical to the latest archive', t => {
  const workspace = makeArchiveWorkspace(t);
  const planPath = join(workspace, '50-plan.md');

  writeFileSync(planPath, 'Plan v1\n', 'utf8');
  runArchiveHook(planPath);
  runArchiveHook(planPath);

  assert.deepEqual(listHistory(workspace), ['50-plan.001.md']);
});

test('PreToolUse archive hook mirrors nested paths under history', t => {
  const workspace = makeArchiveWorkspace(t);
  const notesPath = join(workspace, 'notes', 'a.md');
  mkdirSync(join(workspace, 'notes'));
  writeFileSync(notesPath, 'Notes\n', 'utf8');

  runArchiveHook(notesPath);

  assert.equal(existsSync(join(workspace, 'history', 'notes', 'a.001.md')), true);
});

test('PreToolUse archive hook leaves brief, snapshot, and history files alone', t => {
  const workspace = makeArchiveWorkspace(t);
  mkdirSync(join(workspace, 'history'));
  const paths = [
    join(workspace, 'brief.md'),
    join(workspace, '.brief.last-valid.md'),
    join(workspace, 'history', '60-prep.001.md'),
  ];
  paths.forEach(path => writeFileSync(path, 'contents\n', 'utf8'));

  paths.forEach(path => assert.equal(runArchiveHook(path).status, 0));

  assert.deepEqual(listHistory(workspace), ['60-prep.001.md']);
});

test('PreToolUse archive hook blocks the write when archiving fails', t => {
  const workspace = makeArchiveWorkspace(t);
  const prepPath = join(workspace, '60-prep.md');
  writeFileSync(prepPath, 'Selected step: B1\n', 'utf8');
  writeFileSync(join(workspace, 'history'), 'not a directory\n', 'utf8');

  const result = runArchiveHook(prepPath);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Refusing to overwrite/);
});

const runArchiveHook = (filePath: string) =>
  spawnSync(process.execPath, [archiveHookPath], {
    cwd: tmpdir(),
    input: JSON.stringify({ tool_input: { file_path: filePath } }),
    encoding: 'utf8',
  });

const listHistory = (workspace: string): string[] =>
  readdirSync(join(workspace, 'history'), { withFileTypes: true })
    .map(entry => entry.name)
    .sort();

const makeArchiveWorkspace = (t: TestContext): string => {
  const root = join(
    tmpdir(),
    `archive-hook-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  const workspace = join(root, 'thoughts', 'shared', 'work', 'sample-task');
  mkdirSync(workspace, { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  return workspace;
};

const runHook = (filePath: string) =>
  spawnSync(process.execPath, [hookPath], {
    cwd: tmpdir(),
    input: JSON.stringify({ tool_input: { file_path: filePath } }),
    encoding: 'utf8',
  });

const makeHookWorkspace = (
  t: TestContext,
  options: { brief: string; phaseOutput?: string },
): string => {
  const root = join(
    tmpdir(),
    `validate-brief-hook-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  const workspace = join(root, 'thoughts', 'shared', 'work', 'sample-task');
  mkdirSync(workspace, { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  writeFileSync(join(workspace, 'brief.md'), options.brief, 'utf8');
  writeFileSync(join(workspace, 'task.md'), 'Task fixture.\n', 'utf8');

  if (options.phaseOutput !== undefined) {
    writeFileSync(join(workspace, '60-prep.md'), options.phaseOutput, 'utf8');
  }

  return workspace;
};
