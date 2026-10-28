import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { requireNodeVersion } from './lib/require-node-version.ts';

type HookSpec = {
  event: 'PreToolUse' | 'PostToolUse';
  matcher: string;
  script: string;
  command: string;
};

type HookState = 'installed' | 'outdated' | 'missing';

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
      outdated: HookSpec[];
      missingPermissions: string[];
      written: boolean;
    }
  | { ok: false; message: string };

// Commands resolve the script from $CLAUDE_PROJECT_DIR so hooks work when
// Claude Code runs from a directory other than the repository root.
const hookSpec = (
  event: HookSpec['event'],
  script: string,
): HookSpec => ({
  event,
  matcher: 'Write|Edit|MultiEdit',
  script,
  command: `node "$CLAUDE_PROJECT_DIR/.claude/scripts/hooks/${script}"`,
});

export const WORKFLOW_HOOKS: HookSpec[] = [
  hookSpec('PreToolUse', 'archive-workspace-file-pre-tool-use.cjs'),
  hookSpec('PostToolUse', 'validate-brief-post-tool-use.cjs'),
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
  hookState(settings, hook) === 'installed';

// A hook is outdated when an entry runs the same hook script with a different
// command, e.g. the earlier relative `node .claude/scripts/hooks/...` form.
export const hookState = (settings: Settings, hook: HookSpec): HookState => {
  const commands = eventEntries(settings, hook.event).flatMap(entryCommands);
  if (commands.includes(hook.command)) return 'installed';
  return commands.some(command => referencesScript(command, hook))
    ? 'outdated'
    : 'missing';
};

// Removes every command that runs each hook's script (dropping entries left
// empty), then adds the current form.
export const replaceHooks = (
  settings: Settings,
  hooks: HookSpec[],
): Settings => {
  if (hooks.length === 0) return settings;
  const existingHooks = isRecord(settings.hooks) ? settings.hooks : {};
  const cleanedHooks = hooks.reduce<Settings>(
    (cleaned, hook) =>
      Array.isArray(cleaned[hook.event])
        ? {
            ...cleaned,
            [hook.event]: (cleaned[hook.event] as unknown[]).flatMap(entry =>
              withoutScript(entry, hook),
            ),
          }
        : cleaned,
    existingHooks,
  );

  return addHooks({ ...settings, hooks: cleanedHooks }, hooks);
};

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

  const pending = WORKFLOW_HOOKS.filter(
    hook =>
      !isHookInstalled(shared.settings, hook) &&
      !isHookInstalled(local.settings, hook),
  );
  const outdatedIn = (settings: Settings): HookSpec[] =>
    pending.filter(hook => hookState(settings, hook) === 'outdated');
  const outdatedShared = outdatedIn(shared.settings);
  const outdatedLocal = outdatedIn(local.settings);
  const outdated = pending.filter(
    hook => outdatedShared.includes(hook) || outdatedLocal.includes(hook),
  );
  const missing = pending.filter(hook => !outdated.includes(hook));

  const missingPermissions = options.permissions
    ? WORKFLOW_PERMISSIONS.filter(
        permission =>
          !isPermissionAllowed(shared.settings, permission) &&
          !isPermissionAllowed(local.settings, permission),
      )
    : [];

  const result = { targetPath, missing, outdated, missingPermissions };
  if (
    !options.write ||
    (pending.length === 0 && missingPermissions.length === 0)
  ) {
    return { ok: true, ...result, written: false };
  }

  // Outdated entries are replaced in whichever file holds them; missing hooks
  // and permissions go to the target file.
  const files = [
    {
      path: sharedPath,
      settings: shared.settings,
      outdatedHere: outdatedShared,
      isTarget: !options.local,
    },
    {
      path: localPath,
      settings: local.settings,
      outdatedHere: outdatedLocal,
      isTarget: options.local,
    },
  ];
  const update = (file: (typeof files)[number]): Settings =>
    file.isTarget
      ? addPermissions(
          replaceHooks(file.settings, [...file.outdatedHere, ...missing]),
          missingPermissions,
        )
      : replaceHooks(file.settings, file.outdatedHere);

  mkdirSync(claudeDir, { recursive: true });
  files
    .filter(
      file =>
        file.outdatedHere.length > 0 ||
        (file.isTarget &&
          (missing.length > 0 || missingPermissions.length > 0)),
    )
    .forEach(file =>
      writeFileSync(
        file.path,
        `${JSON.stringify(update(file), null, 2)}\n`,
        'utf8',
      ),
    );

  return { ok: true, ...result, written: true };
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

const referencesScript = (command: string, hook: HookSpec): boolean =>
  command.includes(`hooks/${hook.script}`);

const withoutScript = (entry: unknown, hook: HookSpec): unknown[] => {
  if (!isRecord(entry) || !Array.isArray(entry.hooks)) return [entry];
  const remaining = entry.hooks.filter(
    command =>
      !(
        isRecord(command) &&
        typeof command.command === 'string' &&
        referencesScript(command.command, hook)
      ),
  );
  if (remaining.length === entry.hooks.length) return [entry];
  return remaining.length === 0 ? [] : [{ ...entry, hooks: remaining }];
};

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

  const { missing, outdated, missingPermissions } = result;
  if (
    missing.length === 0 &&
    outdated.length === 0 &&
    missingPermissions.length === 0
  ) {
    console.log(
      permissions
        ? 'Workflow hooks and permissions are installed.'
        : 'Workflow hooks are installed.',
    );
    return;
  }

  console.log(
    result.written ? 'Updated workflow settings:' : 'Workflow settings need changes:',
  );
  outdated.forEach(hook =>
    console.log(`  outdated ${hook.event}: ${hook.script} -> ${hook.command}`),
  );
  missing.forEach(hook => console.log(`  missing ${hook.event}: ${hook.command}`));
  missingPermissions.forEach(permission =>
    console.log(`  missing permission: ${permission}`),
  );

  if (result.written) return;

  if (missing.length > 0 || missingPermissions.length > 0) {
    console.log(`\nWould add to ${result.targetPath}:`);
    console.log(formatMissing(missing, missingPermissions));
  }
  if (outdated.length > 0) {
    console.log('\nOutdated entries would be replaced in the file that holds them.');
  }
  console.log('\nDry run only. Re-run with --write to apply.');
  process.exit(1);
};

if (import.meta.main) main();
