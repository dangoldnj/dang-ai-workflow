import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
