import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { WORKFLOW_HOOKS, isHookInstalled, setupHooks } from './setup-hooks.ts';

test('setup-hooks reports missing hooks without writing by default', t => {
  const root = makeRoot(t);

  const result = setupHooks({ root, write: false, local: false });

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.missing, WORKFLOW_HOOKS);
  assert.equal(result.ok && result.written, false);
  assert.equal(existsSync(join(root, '.claude', 'settings.json')), false);
});

test('setup-hooks --write adds missing hooks and preserves existing settings', t => {
  const root = makeRoot(t);
  writeSettings(root, 'settings.json', {
    permissions: { allow: ['Bash(git status)'] },
    hooks: {
      PostToolUse: [
        { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] },
      ],
    },
  });

  const result = setupHooks({ root, write: true, local: false });
  const settings = readSettings(root, 'settings.json');

  assert.equal(result.ok && result.written, true);
  assert.deepEqual(settings.permissions, { allow: ['Bash(git status)'] });
  assert.equal(settings.hooks.PostToolUse[0].hooks[0].command, 'echo hi');
  WORKFLOW_HOOKS.forEach(hook =>
    assert.equal(isHookInstalled(settings, hook), true),
  );
});

test('setup-hooks --write is idempotent', t => {
  const root = makeRoot(t);
  setupHooks({ root, write: true, local: false });
  const first = readFileSync(join(root, '.claude', 'settings.json'), 'utf8');

  const result = setupHooks({ root, write: true, local: false });

  assert.deepEqual(result.ok && result.missing, []);
  assert.equal(result.ok && result.written, false);
  assert.equal(
    readFileSync(join(root, '.claude', 'settings.json'), 'utf8'),
    first,
  );
});

test('setup-hooks counts hooks installed in either settings file', t => {
  const root = makeRoot(t);
  const [archiveHook, validateHook] = WORKFLOW_HOOKS;
  writeSettings(root, 'settings.local.json', {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [{ type: 'command', command: validateHook.command }],
        },
      ],
    },
  });

  const result = setupHooks({ root, write: false, local: false });

  assert.deepEqual(result.ok && result.missing, [archiveHook]);
});

test('setup-hooks --local writes to settings.local.json', t => {
  const root = makeRoot(t);

  setupHooks({ root, write: true, local: true });

  assert.equal(existsSync(join(root, '.claude', 'settings.json')), false);
  const settings = readSettings(root, 'settings.local.json');
  WORKFLOW_HOOKS.forEach(hook =>
    assert.equal(isHookInstalled(settings, hook), true),
  );
});

test('setup-hooks refuses to write over invalid settings JSON', t => {
  const root = makeRoot(t);
  const settingsPath = join(root, '.claude', 'settings.json');
  writeFileSync(settingsPath, '{ not json', 'utf8');

  const result = setupHooks({ root, write: true, local: false });

  assert.equal(result.ok, false);
  assert.equal(readFileSync(settingsPath, 'utf8'), '{ not json');
});

test('setup-hooks installs the hooks shipped in settings.example.json', () => {
  const example = JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'settings.example.json'),
      'utf8',
    ),
  );

  WORKFLOW_HOOKS.forEach(hook =>
    assert.equal(isHookInstalled(example, hook), true),
  );
});

const makeRoot = (t: TestContext): string => {
  const root = join(
    tmpdir(),
    `setup-hooks-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  mkdirSync(join(root, '.claude'), { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

const writeSettings = (root: string, file: string, settings: object): void =>
  writeFileSync(
    join(root, '.claude', file),
    JSON.stringify(settings, null, 2),
    'utf8',
  );

const readSettings = (root: string, file: string): any =>
  JSON.parse(readFileSync(join(root, '.claude', file), 'utf8'));
