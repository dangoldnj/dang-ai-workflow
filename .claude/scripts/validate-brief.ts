import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseBrief } from './lib/parse-brief.ts';
import { LAST_VALID_SNAPSHOT, PHASES } from './lib/constants.ts';
import { INVARIANTS } from './lib/invariants.ts';
import { getNextWorkflowAction, type NextWorkflowAction } from './lib/next.ts';
import type { ParsedBrief, Phase } from './lib/types.ts';
import { checkAppendOnlySnapshot } from './lib/validate/append-only.ts';
import { checkConstraintsTagging } from './lib/validate/constraints.ts';
import { checkRequiredContent } from './lib/validate/content.ts';
import { checkDecisionsShape } from './lib/validate/decisions.ts';
import { checkFrontmatterShape } from './lib/validate/frontmatter.ts';
import { checkParseErrors } from './lib/validate/parse-errors.ts';
import { checkPhaseAccounting } from './lib/validate/phase-accounting.ts';
import { checkPhasePreconditions } from './lib/validate/phase-preconditions.ts';
import { checkPlanProgressConsistency } from './lib/validate/plan.ts';
import { checkProgressConsistency } from './lib/validate/progress.ts';
import { checkSelectedStep } from './lib/validate/selected-step.ts';
import { checkSectionShape } from './lib/validate/sections.ts';
import { checkStatusTransitions } from './lib/validate/status-transitions.ts';
import { checkTerminalState } from './lib/validate/terminal-state.ts';
import { checkUnresolvedUnknowns } from './lib/validate/unknowns.ts';
import { checkVerificationPreconditions } from './lib/validate/verification.ts';
import type {
  ValidationResult,
  ValidationViolation,
} from './lib/validate/types.ts';

// ---------- public ----------

export type ValidateBriefOptions = {
  beforePhase?: Phase;
  workspacePath?: string;
};

export const validateBrief = (
  brief: ParsedBrief,
  options: ValidateBriefOptions = {},
): ValidationResult => {
  const violations: ValidationViolation[] = [
    ...checkParseErrors(brief),
    ...checkFrontmatterShape(brief),
    ...checkSectionShape(brief),
    ...checkAppendOnlySnapshot(brief, options.workspacePath),
    ...checkRequiredContent(brief),
    ...checkStatusTransitions(brief),
    ...checkProgressConsistency(brief),
    ...checkPlanProgressConsistency(brief),
    ...checkConstraintsTagging(brief),
    ...checkDecisionsShape(brief),
    ...checkPhaseAccounting(brief, options.workspacePath),
    ...checkSelectedStep(brief, options.workspacePath),
    ...checkUnresolvedUnknowns(brief, options.beforePhase),
    ...checkVerificationPreconditions(brief),
    ...checkTerminalState(brief),
    ...(options.beforePhase
      ? checkPhasePreconditions(
          brief,
          options.beforePhase,
          options.workspacePath,
        )
      : []),
  ];
  return {
    ok: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
};

// ---------- CLI ----------

type OutputFormat = 'text' | 'json';

type CliMode = 'validate' | 'next' | 'list-invariants';

type CliArgs = {
  mode: CliMode;
  format: OutputFormat;
  workspace?: string;
  beforePhase?: Phase;
};

type CliParseResult =
  | { ok: true; args: CliArgs }
  | { ok: false; message: string };

type CliResult = ValidationResult & {
  next?:
    | NextWorkflowAction
    | { kind: 'stop'; reason: 'validation-errors'; message: string };
};

const main = (): void => {
  const parsedArgs = parseCliArgs(process.argv.slice(2));
  if (!parsedArgs.ok) {
    console.error(parsedArgs.message);
    console.error(usage());
    process.exit(2);
  }

  const { mode, format, workspace, beforePhase } = parsedArgs.args;

  if (mode === 'list-invariants') {
    if (format === 'json') {
      console.log(JSON.stringify({ invariants: INVARIANTS }, null, 2));
    } else {
      for (const invariant of INVARIANTS) {
        console.log(invariant);
      }
    }
    process.exit(0);
  }

  if (workspace === undefined) {
    console.error('Missing workspace path.');
    console.error(usage());
    process.exit(2);
  }

  let brief: ParsedBrief;
  try {
    brief = parseBrief(`${workspace}/brief.md`);
  } catch (err) {
    console.error(
      `Failed to parse ${workspace}/brief.md:`,
      err instanceof Error ? err.message : err,
    );
    process.exit(2);
    return;
  }

  const result = validateBrief(brief, {
    ...(beforePhase !== undefined ? { beforePhase } : {}),
    workspacePath: workspace,
  });

  const cliResult: CliResult =
    mode === 'next'
      ? {
          ...result,
          next: result.ok
            ? getNextWorkflowAction(brief)
            : {
                kind: 'stop',
                reason: 'validation-errors',
                message: 'Validation errors must be fixed before routing',
              },
        }
      : result;

  if (result.ok) {
    try {
      copyFileSync(
        `${workspace}/brief.md`,
        `${workspace}/${LAST_VALID_SNAPSHOT}`,
      );
    } catch (err) {
      console.error(
        `Failed to update ${workspace}/${LAST_VALID_SNAPSHOT}:`,
        err instanceof Error ? err.message : err,
      );
      process.exit(2);
    }
  }

  if (format === 'json') {
    console.log(JSON.stringify(cliResult, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (result.violations.length === 0 && mode === 'validate') {
    console.log('ok');
    process.exit(0);
  }

  for (const v of result.violations) {
    const tag = v.severity === 'error' ? 'ERROR' : 'WARN ';
    const loc = v.location ? ` [${v.location}]` : '';
    console.log(`${tag} ${v.invariant}${loc}: ${v.message}`);
  }

  if (mode === 'next' && cliResult.next !== undefined) {
    if (cliResult.next.kind === 'phase') {
      console.log(`NEXT ${cliResult.next.phase}: ${cliResult.next.reason}`);
    } else {
      console.log(`STOP ${cliResult.next.reason}: ${cliResult.next.message}`);
    }
  }

  process.exit(result.ok ? 0 : 1);
};

const parseCliArgs = (argv: string[]): CliParseResult => {
  let mode: CliMode = 'validate';
  let format: OutputFormat = 'text';
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      return { ok: false, message: usage() };
    }

    if (arg === '--next') {
      mode = 'next';
      continue;
    }

    if (arg === '--list-invariants') {
      mode = 'list-invariants';
      continue;
    }

    if (arg === '--json') {
      format = 'json';
      continue;
    }

    if (arg === '--format') {
      const value = argv[i + 1];
      if (value !== 'text' && value !== 'json') {
        return {
          ok: false,
          message: `Invalid --format value "${value ?? ''}". Expected text or json.`,
        };
      }
      format = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      return { ok: false, message: `Unknown option "${arg}".` };
    }

    positional.push(arg);
  }

  if (mode === 'list-invariants') {
    if (positional.length > 0) {
      return {
        ok: false,
        message: '--list-invariants does not accept positional arguments.',
      };
    }
    return { ok: true, args: { mode, format } };
  }

  if (positional.length === 0 || positional.length > 2) {
    return {
      ok: false,
      message: 'Expected <workspace-path> and optional [before-phase].',
    };
  }

  if (mode === 'next' && positional[1] !== undefined) {
    return {
      ok: false,
      message:
        '--next computes the next phase and does not accept [before-phase].',
    };
  }

  const beforePhase = positional[1];
  if (beforePhase !== undefined && !PHASES.includes(beforePhase as Phase)) {
    return {
      ok: false,
      message: `Invalid before-phase "${beforePhase}". Expected one of: ${PHASES.join(', ')}`,
    };
  }

  return {
    ok: true,
    args: {
      mode,
      format,
      workspace: positional[0],
      ...(beforePhase !== undefined
        ? { beforePhase: beforePhase as Phase }
        : {}),
    },
  };
};

const usage = (): string =>
  [
    'Usage:',
    '  node .claude/scripts/validate-brief.ts [--format text|json] <workspace-path> [before-phase]',
    '  node .claude/scripts/validate-brief.ts --next [--format text|json] <workspace-path>',
    '  node .claude/scripts/validate-brief.ts --list-invariants [--format text|json]',
  ].join('\n');

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];
  return (
    entrypoint !== undefined &&
    import.meta.url === pathToFileURL(resolve(entrypoint)).href
  );
};

if (isCliEntrypoint()) {
  main();
}
