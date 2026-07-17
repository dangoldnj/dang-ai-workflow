import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parseBrief } from '../parse-brief.ts';
import { parseFrontmatter } from '../parse-frontmatter.ts';
import {
  ACTIVE_WORK_ROOT,
  OPEN_STATUS_PRIORITIES,
  SHARED_ARTIFACT_TYPES,
  SHARED_ROOT,
} from './constants.ts';
import type {
  BriefReport,
  BriefSummary,
  ReportProblem,
  SharedArtifact,
  SharedArtifactType,
} from './types.ts';

export const createBriefReport = (repositoryRoot: string): BriefReport => {
  assertReportRoot(repositoryRoot);
  const problems: ReportProblem[] = [];
  const active = collectActiveBriefs(repositoryRoot, problems);
  const shared = collectSharedArtifacts(repositoryRoot, problems);

  return {
    active,
    activeByStatus: countBy(active, (brief) => brief.status),
    open: active
      .filter((brief) => !['complete', 'abandoned'].includes(brief.status))
      .sort(compareOpenBriefs),
    shared,
    sharedByType: countBy(shared, (artifact) => artifact.type),
    problems,
  };
};

const assertReportRoot = (repositoryRoot: string): void => {
  assertReadableDirectory(
    resolve(repositoryRoot, ACTIVE_WORK_ROOT),
    ACTIVE_WORK_ROOT,
  );
  assertReadableDirectory(resolve(repositoryRoot, SHARED_ROOT), SHARED_ROOT);
};

const assertReadableDirectory = (path: string, label: string): void => {
  try {
    readdirSync(path, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Expected readable ${label} directory at ${path}: ${errorMessage(error)}`,
    );
  }
};

const collectActiveBriefs = (
  repositoryRoot: string,
  problems: ReportProblem[],
): BriefSummary[] => {
  const briefs: BriefSummary[] = [];
  const workRoot = resolve(repositoryRoot, ACTIVE_WORK_ROOT);

  for (const path of walkFiles(workRoot, repositoryRoot, problems).filter(
    isBriefPath,
  )) {
    try {
      const brief = toBriefSummary(path, repositoryRoot);
      briefs.push(brief);
      if (brief.parseErrors > 0) {
        problems.push({
          path: brief.path,
          scope: 'active brief',
          message: `${brief.parseErrors} parse issue(s)`,
        });
      }
    } catch (error) {
      problems.push({
        path: reportPath(repositoryRoot, path),
        scope: 'active brief',
        message: errorMessage(error),
      });
    }
  }

  return briefs.sort((a, b) => a.slug.localeCompare(b.slug));
};

const isBriefPath = (path: string): boolean =>
  path.endsWith('/brief.md') || path.endsWith('\\brief.md');

const toBriefSummary = (path: string, repositoryRoot: string): BriefSummary => {
  const brief = parseBrief(path);
  const plan = brief.sections.Plan;
  const acceptanceCriteria = brief.sections['Acceptance Criteria'];

  return {
    path: reportPath(repositoryRoot, path),
    slug: brief.frontmatter.slug ?? dirname(path).split(/[\\/]/).pop() ?? path,
    status: brief.frontmatter.status ?? 'unknown',
    currentPhase: brief.frontmatter.current_phase ?? null,
    currentStep: brief.frontmatter.current_step ?? null,
    goal: firstLine(brief.sections.Goal),
    plan: {
      complete: plan.filter((item) => item.checked).length,
      total: plan.length,
    },
    acceptanceCriteria: {
      complete: acceptanceCriteria.filter((item) => item.checked).length,
      total: acceptanceCriteria.length,
    },
    verification: brief.sections.Verification?.status ?? null,
    conflicts: brief.sections.Conflicts.length,
    unknowns: brief.sections.Unknowns.length,
    parseErrors: brief.parseErrors.length,
  };
};

const collectSharedArtifacts = (
  repositoryRoot: string,
  problems: ReportProblem[],
): SharedArtifact[] => {
  const artifacts: SharedArtifact[] = [];

  for (const type of SHARED_ARTIFACT_TYPES) {
    const directory = resolve(repositoryRoot, SHARED_ROOT, type);
    for (const path of walkFiles(directory, repositoryRoot, problems).filter(
      (path) => path.endsWith('.md'),
    )) {
      try {
        artifacts.push(toSharedArtifact(path, type, repositoryRoot));
      } catch (error) {
        problems.push({
          path: reportPath(repositoryRoot, path),
          scope: 'shared artifact',
          message: errorMessage(error),
        });
      }
    }
  }

  return artifacts.sort((a, b) => b.path.localeCompare(a.path));
};

const toSharedArtifact = (
  path: string,
  type: SharedArtifactType,
  repositoryRoot: string,
): SharedArtifact => {
  const raw = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
  const { data } = parseFrontmatter(raw);
  return {
    type,
    path: reportPath(repositoryRoot, path),
    slug: scalarString(data.slug),
    closed: scalarString(data.closed),
    summary: scalarString(data.summary),
  };
};

const walkFiles = (
  directory: string,
  repositoryRoot: string,
  problems: ReportProblem[],
): string[] => {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(path, repositoryRoot, problems);
      return entry.isFile() ? [path] : [];
    });
  } catch (error) {
    problems.push({
      path: reportPath(repositoryRoot, directory),
      scope: 'directory',
      message: errorMessage(error),
    });
    return [];
  }
};

const countBy = <T>(
  items: T[],
  key: (item: T) => string,
): Record<string, number> =>
  items.reduce<Record<string, number>>((counts, item) => {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});

const compareOpenBriefs = (a: BriefSummary, b: BriefSummary): number =>
  openStatusPriority(a.status) - openStatusPriority(b.status) ||
  a.slug.localeCompare(b.slug);

const openStatusPriority = (status: string): number =>
  OPEN_STATUS_PRIORITIES[status] ?? 4;

const firstLine = (value: string | undefined): string | null => {
  const line = value
    ?.split('\n')
    .map((part) => part.trim())
    .find(Boolean);
  return line === undefined ? null : truncate(line, 180);
};

const truncate = (value: string, maxLength: number): string =>
  value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 1).trimEnd()}…`;

const scalarString = (value: unknown): string | null =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : null;

const reportPath = (repositoryRoot: string, path: string): string =>
  relative(repositoryRoot, path) || '.';

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
