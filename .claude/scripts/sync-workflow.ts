import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { requireNodeVersion } from './lib/require-node-version.ts';

const UPSTREAM_REPOSITORY = 'https://github.com/dangoldnj/dang-ai-workflow.git';
const WORKFLOW_DIRECTORIES = ['commands', 'scripts'] as const;
type WorkflowDirectory = (typeof WORKFLOW_DIRECTORIES)[number];

type SyncOptions = {
  root: string;
  commit: string;
  directories: WorkflowDirectory[];
  dryRun: boolean;
  prune: boolean;
};

type ParsedArgs =
  | { ok: true; options: SyncOptions }
  | { ok: false; message: string };

type SyncResult = {
  commit: string;
  dryRun: boolean;
  filesCopied: number;
  pruned: string[];
  directories: WorkflowDirectory[];
};

export const syncWorkflow = ({
  root,
  commit,
  directories,
  dryRun,
  prune,
}: SyncOptions): SyncResult => {
  mkdirSync(root, { recursive: true });
  const temporaryRepository = mkdtempSync(join(root, '.dang-ai-workflow-'));

  try {
    runGit(temporaryRepository, ['init', '--quiet']);
    runGit(temporaryRepository, [
      'remote',
      'add',
      'origin',
      UPSTREAM_REPOSITORY,
    ]);
    let fetchedRequestedCommit = true;
    try {
      runGit(temporaryRepository, [
        'fetch',
        '--quiet',
        '--depth=1',
        '--no-tags',
        'origin',
        commit,
      ]);
    } catch {
      // Git hosts commonly reject abbreviated commit SHAs as fetch refspecs.
      // Fetching main gives us the history needed to resolve one locally.
      fetchedRequestedCommit = false;
      runGit(temporaryRepository, [
        'fetch',
        '--quiet',
        '--no-tags',
        'origin',
        'main',
      ]);
    }

    const resolvedCommit = fetchedRequestedCommit
      ? runGit(temporaryRepository, ['rev-parse', 'FETCH_HEAD']).trim()
      : runGit(temporaryRepository, [
          'rev-parse',
          '--verify',
          `${commit}^{commit}`,
        ]).trim();

    runGit(temporaryRepository, [
      'checkout',
      '--quiet',
      resolvedCommit,
      '--',
      ...directories.map(directory => `.claude/${directory}`),
    ]);

    const targetClaudeDirectory = join(root, '.claude');
    let filesCopied = 0;
    const pruned: string[] = [];

    for (const directory of directories) {
      const sourceDirectory = join(temporaryRepository, '.claude', directory);
      if (!existsSync(sourceDirectory)) {
        throw new Error(
          `Upstream commit ${resolvedCommit} does not contain .claude/${directory}`,
        );
      }

      const change = syncDirectory(
        sourceDirectory,
        join(targetClaudeDirectory, directory),
        { dryRun, prune },
      );
      filesCopied += change.copied.length;
      pruned.push(...change.pruned.map(file => `.claude/${directory}/${file}`));
    }

    return { commit: resolvedCommit, dryRun, filesCopied, pruned, directories };
  } finally {
    rmSync(temporaryRepository, { recursive: true, force: true });
  }
};

type DirectoryChange = { copied: string[]; pruned: string[] };

// Copies every upstream file onto `destination`. With `prune`, also removes
// downstream files (and the directories left empty) that upstream no longer
// ships, so synced repos stay convergent instead of accumulating retired files.
const syncDirectory = (
  source: string,
  destination: string,
  { dryRun, prune }: { dryRun: boolean; prune: boolean },
): DirectoryChange => {
  const copied = listFiles(source);
  const upstream = new Set(copied);
  const pruned = prune
    ? (existsSync(destination) ? listFiles(destination) : []).filter(
        file => !upstream.has(file),
      )
    : [];

  if (!dryRun) {
    for (const file of copied) {
      const destinationPath = join(destination, file);
      mkdirSync(dirname(destinationPath), { recursive: true });
      copyFileSync(join(source, file), destinationPath);
    }
    for (const file of pruned) {
      rmSync(join(destination, file));
    }
    if (prune) pruneEmptyDirectories(destination);
  }

  return { copied, pruned };
};

// Relative POSIX paths of every file under `directory`, recursively.
const listFiles = (directory: string, base: string = directory): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath, base));
    } else if (entry.isFile()) {
      files.push(relative(base, entryPath).replace(/\\/g, '/'));
    } else {
      throw new Error(`Unsupported entry: ${entryPath}`);
    }
  }
  return files;
};

// Removes empty subdirectories left behind by pruning, keeping `root` itself.
const pruneEmptyDirectories = (root: string): void => {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = join(root, entry.name);
    pruneEmptyDirectories(child);
    if (readdirSync(child, { withFileTypes: true }).length === 0) {
      rmSync(child, { recursive: true, force: true });
    }
  }
};

const runGit = (repository: string, args: string[]): string => {
  const result = spawnSync('git', ['-C', repository, ...args], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const details = result.stderr.trim() || result.stdout.trim();
    throw new Error(details || `git ${args.join(' ')} failed`);
  }

  return result.stdout;
};

const parseArgs = (argv: string[]): ParsedArgs => {
  let commit = 'main';
  let root = process.cwd();
  let dryRun = false;
  let prune = false;
  const directories: WorkflowDirectory[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--commands' || arg === '--scripts') {
      const directory = arg.slice(2) as WorkflowDirectory;
      if (!directories.includes(directory)) directories.push(directory);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--prune') {
      prune = true;
    } else if (arg === '--commit') {
      const value = argv[i + 1];
      if (value === undefined) {
        return { ok: false, message: '--commit requires a ref or commit' };
      }
      commit = value;
      i += 1;
    } else if (arg === '--root') {
      const value = argv[i + 1];
      if (value === undefined) {
        return { ok: false, message: '--root requires a path' };
      }
      root = resolve(value);
      i += 1;
    } else {
      return { ok: false, message: `Unknown argument: ${arg}` };
    }
  }

  if (directories.length === 0) {
    return {
      ok: false,
      message: 'Choose at least one directory with --commands or --scripts',
    };
  }

  return { ok: true, options: { root, commit, directories, dryRun, prune } };
};

const main = (): void => {
  requireNodeVersion();
  const args = parseArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(args.message);
    console.error(
      'Usage: node .claude/scripts/sync-workflow.ts (--commands | --scripts) [--commit REF] [--root PATH] [--prune] [--dry-run]',
    );
    process.exit(2);
  }

  try {
    const result = syncWorkflow(args.options);
    const directories = result.directories
      .map(directory => `.claude/${directory}`)
      .join(' and ');
    const summary = result.dryRun ? '[dry-run] Would sync' : 'Synced';
    console.log(
      `${summary} ${directories} from ${result.commit} (${result.filesCopied} files, ${result.pruned.length} pruned).`,
    );
    for (const file of result.pruned) {
      console.log(`  ${result.dryRun ? 'would remove' : 'removed'} ${file}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to sync workflow files: ${message}`);
    process.exit(2);
  }
};

if (import.meta.main) main();
