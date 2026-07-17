import { WORKFLOW_STATUSES } from '../constants.ts';
import { SHARED_ARTIFACT_TYPES } from './constants.ts';
import type { BriefReport, BriefSummary } from './types.ts';

export const formatBriefReport = (
  report: BriefReport,
  verbose: boolean,
): string => {
  const lines = [
    'Brief summary',
    '',
    `Shared artifacts: ${report.shared.length}`,
    'Shared artifacts by type:',
    ...orderedCounts(report.sharedByType, SHARED_ARTIFACT_TYPES),
    '',
    'Promoted briefs:',
  ];

  const promotedBriefs = report.shared.filter((file) => file.type === 'briefs');
  if (promotedBriefs.length === 0) {
    lines.push('  (none)');
  } else {
    for (const file of promotedBriefs) {
      const date = file.closed ?? 'closed date unknown';
      const summary =
        verbose && file.summary !== null ? ` — ${file.summary}` : '';
      lines.push(`  - ${file.slug ?? file.path} (${date})${summary}`);
    }
  }

  lines.push(
    '',
    `Work briefs: ${report.active.length}`,
    '',
    'Briefs by status:',
    ...orderedCounts(report.activeByStatus, [
      'complete',
      ...WORKFLOW_STATUSES.filter((s) => s !== 'complete'),
    ]),
    '',
    `Open briefs: ${report.open.length}`,
  );

  if (report.open.length === 0) {
    lines.push('  (none)');
  } else {
    for (const brief of report.open) lines.push(...formatOpenBrief(brief));
  }

  if (report.problems.length > 0) {
    lines.push('', `Problems: ${report.problems.length}`);
    for (const problem of report.problems) {
      lines.push(`  - ${problem.scope}: ${problem.path} — ${problem.message}`);
    }
  }

  return lines.join('\n');
};

const formatOpenBrief = (brief: BriefSummary): string[] => {
  const lines = [
    `  - ${brief.slug} [${brief.status}]`,
    `    phase: ${brief.currentPhase ?? '—'}; step: ${brief.currentStep ?? '—'}`,
    `    plan: ${brief.plan.complete}/${brief.plan.total}; acceptance: ${brief.acceptanceCriteria.complete}/${brief.acceptanceCriteria.total}; verification: ${brief.verification ?? '—'}`,
    `    blockers: ${brief.conflicts} conflict(s), ${brief.unknowns} unknown(s)`,
  ];
  if (brief.goal !== null) lines.push(`    goal: ${brief.goal}`);
  if (brief.parseErrors > 0) {
    lines.push(`    parse warnings/errors: ${brief.parseErrors}`);
  }
  lines.push('');
  return lines;
};

const orderedCounts = (
  counts: Record<string, number>,
  preferred: readonly string[],
): string[] => {
  const keys = [
    ...preferred.filter((key) => counts[key] !== undefined),
    ...Object.keys(counts)
      .filter((key) => !preferred.includes(key))
      .sort(),
  ];
  return keys.map((key) => `  ${key}: ${counts[key]}`);
};
