import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BRIEF_VERSION } from './lib/constants.ts';
import { parseFrontmatter } from './lib/parse-frontmatter.ts';
import { requireNodeVersion } from './lib/require-node-version.ts';

type MigrationResult = {
  changed: boolean;
  migrated: string;
  report: string[];
  errors: string[];
};

type ChecklistItem = {
  prefix: string;
  id?: string;
  text: string;
};

type BlockerItem = {
  prefix: string;
  id?: string;
  text: string;
};

type Section =
  | 'Plan'
  | 'Acceptance Criteria'
  | 'Conflicts'
  | 'Unknowns'
  | 'Progress'
  | 'Decisions'
  | null;

export const migrateBriefRaw = (raw: string): MigrationResult => {
  const normalized = raw.replace(/\r\n?/g, '\n');
  const frontmatter = parseFrontmatter(normalized);
  const lines = normalized.split('\n');
  const errors: string[] = [...frontmatter.errors.map(error => error.message)];
  const report: string[] = [];
  let changed = false;

  const frontmatterEnd = findFrontmatterEnd(lines);
  if (frontmatterEnd === undefined) {
    return {
      changed: false,
      migrated: normalized,
      report,
      errors: ['Cannot migrate a brief without a complete frontmatter block'],
    };
  }

  const planTextToId = new Map<string, string>();
  const acTextToId = new Map<string, string>();
  const planIds = new Set<string>();
  const acIds = new Set<string>();
  const conflictIds = new Set<string>();
  const unknownIds = new Set<string>();
  const duplicatePlanTexts = new Set<string>();
  const duplicateAcTexts = new Set<string>();
  const assignedPlanIds: string[] = [];
  const assignedAcIds: string[] = [];
  const assignedConflictIds: string[] = [];
  const assignedUnknownIds: string[] = [];
  let planCounter = 1;
  let acCounter = 1;
  let conflictCounter = 1;
  let unknownCounter = 1;
  let rewrittenProgressRecords = 0;
  let rewrittenDecisionDeferrals = 0;
  let section: Section = null;

  for (let i = frontmatterEnd + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = line.match(/^##\s+(.+?)\s*$/)?.[1];
    if (heading !== undefined) {
      section = isMigratedSection(heading) ? heading : null;
      continue;
    }

    if (section === 'Plan' || section === 'Acceptance Criteria') {
      const item = parseChecklistItem(line);
      if (item === undefined) {
        continue;
      }

      const ids = section === 'Plan' ? planIds : acIds;
      const textToId = section === 'Plan' ? planTextToId : acTextToId;
      const duplicateTexts =
        section === 'Plan' ? duplicatePlanTexts : duplicateAcTexts;
      const id =
        item.id ??
        (section === 'Plan'
          ? nextId('S', planIds, planCounter++)
          : nextId('AC', acIds, acCounter++));

      if (item.id !== undefined) {
        ids.add(item.id);
      }

      if (textToId.has(item.text)) {
        duplicateTexts.add(item.text);
      } else {
        textToId.set(item.text, id);
      }

      ids.add(id);

      if (item.id === undefined) {
        lines[i] = `${item.prefix}[${id}] ${item.text}`;
        changed = true;
        if (section === 'Plan') {
          assignedPlanIds.push(`${id}: ${item.text}`);
        } else {
          assignedAcIds.push(`${id}: ${item.text}`);
        }
      }

      continue;
    }

    if (section === 'Conflicts' || section === 'Unknowns') {
      const item = parseBlockerItem(line);
      if (item === undefined) {
        continue;
      }

      const ids = section === 'Conflicts' ? conflictIds : unknownIds;
      const id =
        item.id ??
        (section === 'Conflicts'
          ? nextId('CF', conflictIds, conflictCounter++)
          : nextId('UK', unknownIds, unknownCounter++));

      if (item.id !== undefined) {
        ids.add(item.id);
      }

      ids.add(id);

      if (item.id === undefined) {
        lines[i] = `${item.prefix}[${id}] ${item.text}`;
        changed = true;
        if (section === 'Conflicts') {
          assignedConflictIds.push(`${id}: ${item.text}`);
        } else {
          assignedUnknownIds.push(`${id}: ${item.text}`);
        }
      }

      continue;
    }

    if (section === 'Progress') {
      const step = line.match(/^(\s*Step:\s*)(.+?)\s*$/);
      if (step === null) {
        continue;
      }

      const currentStep = step[2];
      const migratedStep = migrateReference(currentStep, planIds, planTextToId);
      if (migratedStep === undefined) {
        errors.push(
          `Progress Step "${currentStep}" does not match any Plan item text or ID`,
        );
        continue;
      }

      if (migratedStep !== currentStep) {
        lines[i] = `${step[1]}${migratedStep}`;
        rewrittenProgressRecords += 1;
        changed = true;
      }

      continue;
    }

    if (section === 'Decisions') {
      const decision = line.match(
        /^(\s*-\s+\[[^\]]+\]\s+\[)([^\]]+)(\]\s+\[[^\]]+\]\s*)$/,
      );
      if (decision === null) {
        continue;
      }

      const prefix = 'defer acceptance criterion:';
      const choice = decision[2];
      if (!choice.toLowerCase().startsWith(prefix)) {
        continue;
      }

      const currentCriterion = choice.slice(prefix.length).trim();
      const migratedCriterion = migrateReference(
        currentCriterion,
        acIds,
        acTextToId,
      );
      if (migratedCriterion === undefined) {
        errors.push(
          `Decision defers unknown Acceptance Criteria item "${currentCriterion}"`,
        );
        continue;
      }

      if (migratedCriterion !== currentCriterion) {
        lines[i] =
          `${decision[1]}defer acceptance criterion: ${migratedCriterion}${decision[3]}`;
        rewrittenDecisionDeferrals += 1;
        changed = true;
      }
    }
  }

  for (const text of duplicatePlanTexts) {
    errors.push(`Plan item text is duplicated and cannot be migrated: ${text}`);
  }

  for (const text of duplicateAcTexts) {
    errors.push(
      `Acceptance Criteria text is duplicated and cannot be migrated: ${text}`,
    );
  }

  const frontmatterResult = migrateFrontmatter(
    lines,
    frontmatterEnd,
    frontmatter.data.current_step,
    planIds,
    planTextToId,
  );
  changed = changed || frontmatterResult.changed;
  report.push(...frontmatterResult.report);
  errors.push(...frontmatterResult.errors);

  if (assignedPlanIds.length > 0) {
    report.push('Assigned Plan IDs:');
    report.push(...assignedPlanIds.map(entry => `  ${entry}`));
  }

  if (assignedAcIds.length > 0) {
    report.push('Assigned Acceptance Criteria IDs:');
    report.push(...assignedAcIds.map(entry => `  ${entry}`));
  }

  if (assignedConflictIds.length > 0) {
    report.push('Assigned Conflict IDs:');
    report.push(...assignedConflictIds.map(entry => `  ${entry}`));
  }

  if (assignedUnknownIds.length > 0) {
    report.push('Assigned Unknown IDs:');
    report.push(...assignedUnknownIds.map(entry => `  ${entry}`));
  }

  if (rewrittenProgressRecords > 0) {
    report.push(
      `Rewrote ${rewrittenProgressRecords} Progress Step reference(s).`,
    );
  }

  if (rewrittenDecisionDeferrals > 0) {
    report.push(
      `Rewrote ${rewrittenDecisionDeferrals} Acceptance Criteria deferral Decision(s).`,
    );
  }

  if (!changed && errors.length === 0) {
    report.push('Brief is already migrated.');
  }

  return {
    changed,
    migrated: lines.join('\n'),
    report,
    errors,
  };
};

const migrateFrontmatter = (
  lines: string[],
  frontmatterEnd: number,
  currentStep: unknown,
  planIds: Set<string>,
  planTextToId: Map<string, string>,
): { changed: boolean; report: string[]; errors: string[] } => {
  const report: string[] = [];
  const errors: string[] = [];
  let changed = false;
  let foundVersion = false;

  for (let i = 1; i < frontmatterEnd; i += 1) {
    if (/^brief_version:\s*/.test(lines[i])) {
      foundVersion = true;
      if (lines[i] !== `brief_version: ${BRIEF_VERSION}`) {
        lines[i] = `brief_version: ${BRIEF_VERSION}`;
        changed = true;
        report.push(`Set brief_version to ${BRIEF_VERSION}.`);
      }
    }
  }

  if (!foundVersion) {
    lines.splice(1, 0, `brief_version: ${BRIEF_VERSION}`);
    changed = true;
    report.push(`Added brief_version: ${BRIEF_VERSION}.`);
  }

  if (typeof currentStep === 'string') {
    const migratedStep = migrateReference(currentStep, planIds, planTextToId);
    if (migratedStep === undefined) {
      errors.push(
        `current_step "${currentStep}" does not match any Plan item text or ID`,
      );
    } else if (migratedStep !== currentStep) {
      const currentStepLine = lines.findIndex(line =>
        /^current_step:\s*/.test(line),
      );
      if (currentStepLine === -1) {
        errors.push('current_step line is missing from frontmatter');
      } else {
        lines[currentStepLine] = `current_step: ${migratedStep}`;
        changed = true;
        report.push(`Rewrote current_step to ${migratedStep}.`);
      }
    }
  }

  return { changed, report, errors };
};

const migrateReference = (
  reference: string,
  knownIds: Set<string>,
  textToId: Map<string, string>,
): string | undefined => {
  if (knownIds.has(reference)) {
    return reference;
  }

  return textToId.get(reference);
};

const findFrontmatterEnd = (lines: string[]): number | undefined => {
  if (lines[0] !== '---') {
    return undefined;
  }

  const end = lines.slice(1).findIndex(line => line === '---');
  return end === -1 ? undefined : end + 1;
};

const parseChecklistItem = (line: string): ChecklistItem | undefined => {
  const m = line.match(/^(\s*-\s+\[[ xX]\]\s+)(?:(\[[^\]]+\])\s+)?(.+)$/);
  if (m === null) {
    return undefined;
  }

  return {
    prefix: m[1],
    ...(m[2] !== undefined ? { id: m[2].slice(1, -1).trim() } : {}),
    text: m[3].trim(),
  };
};

const parseBlockerItem = (line: string): BlockerItem | undefined => {
  const m = line.match(/^(\s*-\s+)(?:(\[[^\]]+\])\s+)?(.+)$/);
  if (m === null) {
    return undefined;
  }

  return {
    prefix: m[1],
    ...(m[2] !== undefined ? { id: m[2].slice(1, -1).trim() } : {}),
    text: m[3].trim(),
  };
};

const nextId = (
  prefix: 'S' | 'AC' | 'CF' | 'UK',
  existingIds: Set<string>,
  start: number,
): string => {
  let index = start;
  let id = `${prefix}${index}`;
  while (existingIds.has(id)) {
    index += 1;
    id = `${prefix}${index}`;
  }
  return id;
};

const isMigratedSection = (
  heading: string,
): heading is Exclude<Section, null> =>
  heading === 'Plan' ||
  heading === 'Acceptance Criteria' ||
  heading === 'Conflicts' ||
  heading === 'Unknowns' ||
  heading === 'Progress' ||
  heading === 'Decisions';

const main = (): void => {
  requireNodeVersion();
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const print = args.includes('--print');
  const positional = args.filter(arg => !arg.startsWith('--'));

  if (positional.length !== 1 || args.some(isUnknownOption)) {
    console.error(usage());
    process.exit(2);
  }

  const workspace = positional[0];
  const briefPath = `${workspace}/brief.md`;
  const result = migrateBriefRaw(readFileSync(briefPath, 'utf8'));

  for (const line of result.report) {
    console.log(line);
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`ERROR ${error}`);
    }
    process.exit(1);
  }

  if (print) {
    console.log(result.migrated);
  }

  if (write) {
    writeFileSync(briefPath, result.migrated, 'utf8');
    console.log(`Wrote ${briefPath}`);
  } else if (result.changed && !print) {
    console.log('Dry run only. Re-run with --write to update brief.md.');
  }
};

const isUnknownOption = (arg: string): boolean =>
  arg.startsWith('--') && arg !== '--write' && arg !== '--print';

const usage = (): string =>
  [
    'Usage:',
    '  node .claude/scripts/migrate-brief.ts <workspace-path>',
    '  node .claude/scripts/migrate-brief.ts --write <workspace-path>',
    '  node .claude/scripts/migrate-brief.ts --print <workspace-path>',
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
