import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HISTORY_DIR, PHASE_RUN_FILE } from './constants.ts';
import type { ParsedBrief, Phase } from './types.ts';
import { parsePhaseOutcome } from './validate/phase-accounting.ts';

export type PhaseRun = { run: number; phase: Phase };

// A passing phase precheck starts a phase run. The run is recorded in its
// own file so the workspace history hook can tell a phase's late writes from
// the next run's first write, which the count of phase outcomes in Decisions
// cannot. Without an earlier record, numbering continues past both that count
// and the highest run already archived, since a late write may have taken
// the archive slot the count would assign next.
export const startPhaseRun = (
  workspace: string,
  brief: ParsedBrief,
  phase: Phase,
): PhaseRun => {
  const path = join(workspace, PHASE_RUN_FILE);
  const previous = existsSync(path)
    ? readPhaseRun(path)
    : Math.max(
        countPhaseOutcomes(brief),
        findHighestArchivedRun(join(workspace, HISTORY_DIR)),
      );
  const phaseRun: PhaseRun = { run: previous + 1, phase };

  writeFileSync(path, `${JSON.stringify(phaseRun)}\n`, 'utf8');
  return phaseRun;
};

const readPhaseRun = (path: string): number => {
  const run: unknown = JSON.parse(readFileSync(path, 'utf8'))?.run;

  if (typeof run !== 'number' || !Number.isInteger(run) || run < 1) {
    throw new Error(`${PHASE_RUN_FILE} has no positive integer "run"`);
  }

  return run;
};

// Archives are named <name>[.<step>].<NNN>[<ext>]; the extension is never
// all digits, so the run is the last all-digit segment before it.
const ARCHIVE_RUN_PATTERN = /\.(\d{3,})(?:\.(?!\d+$)[^.]+)?$/;

const findHighestArchivedRun = (dir: string): number =>
  existsSync(dir)
    ? Math.max(
        0,
        ...readdirSync(dir, { withFileTypes: true }).map(entry =>
          entry.isDirectory()
            ? findHighestArchivedRun(join(dir, entry.name))
            : Number(entry.name.match(ARCHIVE_RUN_PATTERN)?.[1] ?? 0),
        ),
      )
    : 0;

const countPhaseOutcomes = (brief: ParsedBrief): number =>
  brief.sections.Decisions.filter(
    entry => parsePhaseOutcome(entry.choice) !== undefined,
  ).length;
