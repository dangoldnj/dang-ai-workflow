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
import {
  WORKFLOW_HOOKS,
  WORKFLOW_PERMISSIONS,
  isHookInstalled,
  isPermissionAllowed,
  setupHooks,
} from './setup-hooks.ts';

test('setup-hooks reports missing hooks without writing by default', t => {
  const root = makeRoot(t);

  const result = setupHooks({ root, write: false, local: false, permissions: false });

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

  const result = setupHooks({ root, write: true, local: false, permissions: false });
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
  setupHooks({ root, write: true, local: false, permissions: false });
  const first = readFileSync(join(root, '.claude', 'settings.json'), 'utf8');

  const result = setupHooks({ root, write: true, local: false, permissions: false });

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

  const result = setupHooks({ root, write: false, local: false, permissions: false });

  assert.deepEqual(result.ok && result.missing, [archiveHook]);
});

test('setup-hooks --local writes to settings.local.json', t => {
  const root = makeRoot(t);

  setupHooks({ root, write: true, local: true, permissions: false });

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

  const result = setupHooks({ root, write: true, local: false, permissions: false });

  assert.equal(result.ok, false);
  assert.equal(readFileSync(settingsPath, 'utf8'), '{ not json');
});

test('setup-hooks installs the hooks shipped in settings.example.json', t => {
  const examplePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'settings.example.json',
  );
  // Workflow sync installs scripts/ but not settings.example.json, so this
  // parity check only applies in the upstream repository.
  if (!existsSync(examplePath)) {
    t.skip('settings.example.json is not installed in this repository');
    return;
  }
  const example = JSON.parse(readFileSync(examplePath, 'utf8'));

  WORKFLOW_HOOKS.forEach(hook =>
    assert.equal(isHookInstalled(example, hook), true),
  );
  assert.deepEqual(
    [...example.permissions.allow].sort(),
    [...WORKFLOW_PERMISSIONS].sort(),
  );
});

test('setup-hooks ignores permissions unless asked', t => {
  const root = makeRoot(t);

  const result = setupHooks({ root, write: true, local: false, permissions: false });
  const settings = readSettings(root, 'settings.json');

  assert.deepEqual(result.ok && result.missingPermissions, []);
  assert.equal(settings.permissions, undefined);
});

test('setup-hooks --permissions adds only missing permissions', t => {
  const root = makeRoot(t);
  writeSettings(root, 'settings.json', {
    permissions: { allow: ['Bash(git status)', 'Bash(ls *)'], deny: ['Read(.env)'] },
  });
  writeSettings(root, 'settings.local.json', {
    permissions: { allow: ['Bash(git diff *)'] },
  });

  const result = setupHooks({ root, write: true, local: false, permissions: true });
  const settings = readSettings(root, 'settings.json');

  assert.deepEqual(
    result.ok && result.missingPermissions,
    WORKFLOW_PERMISSIONS.filter(
      permission =>
        permission !== 'Bash(git status)' && permission !== 'Bash(git diff *)',
    ),
  );
  assert.deepEqual(settings.permissions.deny, ['Read(.env)']);
  assert.deepEqual(settings.permissions.allow.slice(0, 2), [
    'Bash(git status)',
    'Bash(ls *)',
  ]);
  WORKFLOW_PERMISSIONS.filter(permission => permission !== 'Bash(git diff *)')
    .forEach(permission =>
      assert.equal(isPermissionAllowed(settings, permission), true),
    );
});

test('setup-hooks --permissions reports missing permissions without writing', t => {
  const root = makeRoot(t);
  setupHooks({ root, write: true, local: false, permissions: false });

  const result = setupHooks({ root, write: false, local: false, permissions: true });

  assert.deepEqual(result.ok && result.missing, []);
  assert.deepEqual(result.ok && result.missingPermissions, WORKFLOW_PERMISSIONS);
  assert.equal(result.ok && result.written, false);
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
