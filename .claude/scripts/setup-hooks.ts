import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { requireNodeVersion } from './lib/require-node-version.ts';

type HookSpec = {
  event: 'PreToolUse' | 'PostToolUse';
  matcher: string;
  command: string;
};

type Settings = Record<string, unknown>;

type HookEntry = {
  matcher?: unknown;
  hooks?: unknown;
};

export type SetupOptions = {
  root: string;
  write: boolean;
  local: boolean;
  permissions: boolean;
};

export type SetupResult =
  | {
      ok: true;
      targetPath: string;
      missing: HookSpec[];
      missingPermissions: string[];
      written: boolean;
    }
  | { ok: false; message: string };

export const WORKFLOW_HOOKS: HookSpec[] = [
  {
    event: 'PreToolUse',
    matcher: 'Write|Edit|MultiEdit',
    command:
      'node .claude/scripts/hooks/archive-workspace-file-pre-tool-use.cjs',
  },
  {
    event: 'PostToolUse',
    matcher: 'Write|Edit|MultiEdit',
    command: 'node .claude/scripts/hooks/validate-brief-post-tool-use.cjs',
  },
];

// Permission allowlist entries for the commands the workflow runs. Optional:
// autopilot requires only the hooks, so these are checked only with
// --permissions.
export const WORKFLOW_PERMISSIONS: string[] = [
  'Bash(git checkout -b *)',
  'Bash(git status)',
  'Bash(git diff *)',
  'Bash(node .claude/scripts/validate-brief.ts *)',
  'Bash(node .claude/scripts/migrate-brief.ts *)',
  'Bash(node .claude/scripts/setup-hooks.ts)',
];

const SETTINGS_FILE = 'settings.json';
const LOCAL_SETTINGS_FILE = 'settings.local.json';

export const isHookInstalled = (settings: Settings, hook: HookSpec): boolean =>
  eventEntries(settings, hook.event).some(entry =>
    entryCommands(entry).includes(hook.command),
  );

export const addHooks = (settings: Settings, hooks: HookSpec[]): Settings => {
  const existingHooks = isRecord(settings.hooks) ? settings.hooks : {};
  const mergedHooks = hooks.reduce<Settings>(
    (merged, hook) => ({
      ...merged,
      [hook.event]: [
        ...(Array.isArray(merged[hook.event])
          ? (merged[hook.event] as unknown[])
          : []),
        {
          matcher: hook.matcher,
          hooks: [{ type: 'command', command: hook.command }],
        },
      ],
    }),
    existingHooks,
  );

  return { ...settings, hooks: mergedHooks };
};

export const isPermissionAllowed = (
  settings: Settings,
  permission: string,
): boolean => allowList(settings).includes(permission);

export const addPermissions = (
  settings: Settings,
  permissions: string[],
): Settings => {
  if (permissions.length === 0) return settings;
  const existing = isRecord(settings.permissions) ? settings.permissions : {};

  return {
    ...settings,
    permissions: {
      ...existing,
      allow: [...allowList(settings), ...permissions],
    },
  };
};

export const setupHooks = (options: SetupOptions): SetupResult => {
  const claudeDir = join(options.root, '.claude');
  const sharedPath = join(claudeDir, SETTINGS_FILE);
  const localPath = join(claudeDir, LOCAL_SETTINGS_FILE);
  const targetPath = options.local ? localPath : sharedPath;

  const shared = readSettings(sharedPath);
  if (!shared.ok) return shared;
  const local = readSettings(localPath);
  if (!local.ok) return local;

  const missing = WORKFLOW_HOOKS.filter(
    hook =>
      !isHookInstalled(shared.settings, hook) &&
      !isHookInstalled(local.settings, hook),
  );

  const missingPermissions = options.permissions
    ? WORKFLOW_PERMISSIONS.filter(
        permission =>
          !isPermissionAllowed(shared.settings, permission) &&
          !isPermissionAllowed(local.settings, permission),
      )
    : [];

  if (
    !options.write ||
    (missing.length === 0 && missingPermissions.length === 0)
  ) {
    return { ok: true, targetPath, missing, missingPermissions, written: false };
  }

  const target = options.local ? local.settings : shared.settings;
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(
    targetPath,
    `${JSON.stringify(addPermissions(addHooks(target, missing), missingPermissions), null, 2)}\n`,
    'utf8',
  );

  return { ok: true, targetPath, missing, missingPermissions, written: true };
};

const readSettings = (
  path: string,
): { ok: true; settings: Settings } | { ok: false; message: string } => {
  if (!existsSync(path)) {
    return { ok: true, settings: {} };
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return isRecord(parsed)
      ? { ok: true, settings: parsed }
      : { ok: false, message: `${path} must contain a JSON object` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Unable to parse ${path}: ${message}` };
  }
};

const eventEntries = (settings: Settings, event: string): HookEntry[] => {
  const hooks = settings.hooks;
  if (!isRecord(hooks)) return [];
  const entries = hooks[event];
  return Array.isArray(entries) ? entries.filter(isRecord) : [];
};

const entryCommands = (entry: HookEntry): string[] =>
  Array.isArray(entry.hooks)
    ? entry.hooks.flatMap(hook =>
        isRecord(hook) && typeof hook.command === 'string'
          ? [hook.command]
          : [],
      )
    : [];

const allowList = (settings: Settings): unknown[] => {
  const permissions = settings.permissions;
  return isRecord(permissions) && Array.isArray(permissions.allow)
    ? permissions.allow
    : [];
};

const isRecord = (value: unknown): value is Settings =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formatMissing = (missing: HookSpec[], permissions: string[]): string =>
  JSON.stringify(addPermissions(addHooks({}, missing), permissions), null, 2);

const usage = (): string =>
  'Usage: node .claude/scripts/setup-hooks.ts [--write] [--local] [--permissions] [--root PATH]';

const FLAGS = ['--write', '--local', '--permissions', '--root'];

const main = (): void => {
  requireNodeVersion();
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf('--root');
  const root = rootIndex === -1 ? process.cwd() : args[rootIndex + 1];
  const flags =
    rootIndex === -1 ? args : args.filter((_, index) => index !== rootIndex + 1);
  const unknown = flags.filter(arg => !FLAGS.includes(arg));

  if (root === undefined || unknown.length > 0) {
    console.error(usage());
    process.exit(2);
  }

  const permissions = flags.includes('--permissions');
  const result = setupHooks({
    root: resolve(root),
    write: flags.includes('--write'),
    local: flags.includes('--local'),
    permissions,
  });

  if (!result.ok) {
    console.error(result.message);
    process.exit(2);
  }

  const { missing, missingPermissions } = result;
  if (missing.length === 0 && missingPermissions.length === 0) {
    console.log(
      permissions
        ? 'Workflow hooks and permissions are installed.'
        : 'Workflow hooks are installed.',
    );
    return;
  }

  console.log(
    result.written
      ? `Added to ${result.targetPath}:`
      : 'Missing from workflow settings:',
  );
  missing.forEach(hook => console.log(`  ${hook.event}: ${hook.command}`));
  missingPermissions.forEach(permission =>
    console.log(`  permission: ${permission}`),
  );

  if (result.written) return;

  console.log(`\nWould add to ${result.targetPath}:`);
  console.log(formatMissing(missing, missingPermissions));
  console.log('\nDry run only. Re-run with --write to add them.');
  process.exit(1);
};

if (import.meta.main) main();
