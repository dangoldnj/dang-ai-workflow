import { parseBrief } from './lib/parse-brief.ts';
import { PHASES } from './lib/constants.ts';
import type { ParsedBrief, Phase } from './lib/types.ts';
import { checkConstraintsTagging } from './lib/validate/constraints.ts';
import { checkDecisionsShape } from './lib/validate/decisions.ts';
import { checkFrontmatterShape } from './lib/validate/frontmatter.ts';
import { checkParseErrors } from './lib/validate/parse-errors.ts';
import { checkPhasePreconditions } from './lib/validate/phase-preconditions.ts';
import { checkPlanProgressConsistency } from './lib/validate/plan.ts';
import { checkStatusTransitions } from './lib/validate/status-transitions.ts';
import { checkTerminalState } from './lib/validate/terminal-state.ts';
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
    ...checkStatusTransitions(brief),
    ...checkPlanProgressConsistency(brief),
    ...checkConstraintsTagging(brief),
    ...checkDecisionsShape(brief),
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

const main = (): void => {
  const workspace = process.argv[2];
  const beforePhase = process.argv[3];
  if (!workspace || process.argv[4] !== undefined) {
    console.error('Usage: node validate-brief.ts <workspace-path> [before-phase]');
    process.exit(2);
  }

  if (
    beforePhase !== undefined &&
    !PHASES.includes(beforePhase as Phase)
  ) {
    console.error(
      `Invalid before-phase "${beforePhase}". Expected one of: ${PHASES.join(', ')}`,
    );
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
    ...(beforePhase !== undefined ? { beforePhase: beforePhase as Phase } : {}),
    workspacePath: workspace,
  });

  if (result.violations.length === 0) {
    console.log('ok');
    process.exit(0);
  }

  for (const v of result.violations) {
    const tag = v.severity === 'error' ? 'ERROR' : 'WARN ';
    const loc = v.location ? ` [${v.location}]` : '';
    console.log(`${tag} ${v.invariant}${loc}: ${v.message}`);
  }

  process.exit(result.ok ? 0 : 1);
};

main();
