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
};

export type SetupResult =
  | {
      ok: true;
      targetPath: string;
      missing: HookSpec[];
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

  if (!options.write || missing.length === 0) {
    return { ok: true, targetPath, missing, written: false };
  }

  const target = options.local ? local.settings : shared.settings;
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(
    targetPath,
    `${JSON.stringify(addHooks(target, missing), null, 2)}\n`,
    'utf8',
  );

  return { ok: true, targetPath, missing, written: true };
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

const isRecord = (value: unknown): value is Settings =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formatMissing = (missing: HookSpec[]): string =>
  JSON.stringify(addHooks({}, missing), null, 2);

const usage = (): string =>
  'Usage: node .claude/scripts/setup-hooks.ts [--write] [--local] [--root PATH]';

const main = (): void => {
  requireNodeVersion();
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf('--root');
  const root = rootIndex === -1 ? process.cwd() : args[rootIndex + 1];
  const flags =
    rootIndex === -1 ? args : args.filter((_, index) => index !== rootIndex + 1);
  const unknown = flags.filter(
    arg => arg !== '--write' && arg !== '--local' && arg !== '--root',
  );

  if (root === undefined || unknown.length > 0) {
    console.error(usage());
    process.exit(2);
  }

  const result = setupHooks({
    root: resolve(root),
    write: flags.includes('--write'),
    local: flags.includes('--local'),
  });

  if (!result.ok) {
    console.error(result.message);
    process.exit(2);
  }

  if (result.missing.length === 0) {
    console.log('Workflow hooks are installed.');
    return;
  }

  if (result.written) {
    console.log(`Added workflow hooks to ${result.targetPath}:`);
    result.missing.forEach(printHook);
    return;
  }

  console.log('Missing workflow hooks:');
  result.missing.forEach(printHook);
  console.log(`\nWould add to ${result.targetPath}:`);
  console.log(formatMissing(result.missing));
  console.log('\nDry run only. Re-run with --write to add them.');
  process.exit(1);
};

const printHook = (hook: HookSpec): void =>
  console.log(`  ${hook.event}: ${hook.command}`);

if (import.meta.main) main();
