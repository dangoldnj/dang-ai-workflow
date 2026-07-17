import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const UPSTREAM_REPOSITORY = 'https://github.com/dangoldnj/dang-ai-workflow.git';
const WORKFLOW_DIRECTORIES = ['commands', 'scripts'] as const;
type WorkflowDirectory = (typeof WORKFLOW_DIRECTORIES)[number];

type SyncOptions = {
  root: string;
  commit: string;
  directories: WorkflowDirectory[];
};

type ParsedArgs =
  | { ok: true; options: SyncOptions }
  | { ok: false; message: string };

type SyncResult = {
  commit: string;
  filesCopied: number;
  directories: WorkflowDirectory[];
};

export const syncWorkflow = ({
  root,
  commit,
  directories,
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

    for (const directory of directories) {
      const sourceDirectory = join(temporaryRepository, '.claude', directory);
      if (!existsSync(sourceDirectory)) {
        throw new Error(
          `Upstream commit ${resolvedCommit} does not contain .claude/${directory}`,
        );
      }

      filesCopied += copyDirectory(
        sourceDirectory,
        join(targetClaudeDirectory, directory),
      );
    }

    return { commit: resolvedCommit, filesCopied, directories };
  } finally {
    rmSync(temporaryRepository, { recursive: true, force: true });
  }
};

const copyDirectory = (source: string, destination: string): number => {
  mkdirSync(destination, { recursive: true });
  let filesCopied = 0;

  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);

    if (entry.isDirectory()) {
      filesCopied += copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      copyFileSync(sourcePath, destinationPath);
      filesCopied += 1;
    } else {
      throw new Error(`Unsupported upstream entry: ${sourcePath}`);
    }
  }

  return filesCopied;
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
  const directories: WorkflowDirectory[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--commands' || arg === '--scripts') {
      const directory = arg.slice(2) as WorkflowDirectory;
      if (!directories.includes(directory)) directories.push(directory);
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

  return { ok: true, options: { root, commit, directories } };
};

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(args.message);
    console.error(
      'Usage: node .claude/scripts/sync-workflow.ts (--commands | --scripts) [--commit REF] [--root PATH]',
    );
    process.exit(2);
  }

  try {
    const result = syncWorkflow(args.options);
    const directories = result.directories
      .map(directory => `.claude/${directory}`)
      .join(' and ');
    console.log(
      `Synced ${directories} from ${result.commit} (${result.filesCopied} files).`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to sync workflow files: ${message}`);
    process.exit(2);
  }
};

if (import.meta.main) main();
