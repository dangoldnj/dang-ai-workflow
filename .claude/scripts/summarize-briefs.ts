import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createBriefReport,
  errorMessage,
} from './lib/brief-summary/collect.ts';
import { formatBriefReport } from './lib/brief-summary/format.ts';
import type { BriefReport, CliArgs } from './lib/brief-summary/types.ts';

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);

export const summarizeBriefs = (
  repositoryRoot = REPOSITORY_ROOT,
): BriefReport => createBriefReport(repositoryRoot);

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(args.message);
    console.error(
      'Usage: node .claude/scripts/summarize-briefs.ts [--json] [--verbose] [--root PATH]',
    );
    process.exit(2);
  }

  try {
    const report = summarizeBriefs(args.root);
    console.log(
      args.json
        ? JSON.stringify(report, null, 2)
        : formatBriefReport(report, args.verbose),
    );
    if (report.problems.length > 0) process.exit(1);
  } catch (error) {
    console.error(`Unable to summarize briefs: ${errorMessage(error)}`);
    process.exit(2);
  }
};

const parseArgs = (argv: string[]): CliArgs => {
  let json = false;
  let verbose = false;
  let root = REPOSITORY_ROOT;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      json = true;
    } else if (arg === '--verbose') {
      verbose = true;
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

  return { ok: true, json, verbose, root };
};

if (import.meta.main) main();
