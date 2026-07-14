import { existsSync } from 'node:fs';
import { LAST_VALID_SNAPSHOT, PHASES } from '../constants.ts';
import { parseBrief } from '../parse-brief.ts';
import type { DecisionEntry, ParsedBrief } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

type AppendOnlySection = {
  name: string;
  previousEntries: string[];
  currentEntries: string[];
};

type BlockerSection = {
  name: string;
  previousEntries: string[];
  currentEntries: string[];
};

export const checkAppendOnlySnapshot = (
  brief: ParsedBrief,
  workspacePath: string | undefined,
): ValidationViolation[] => {
  if (workspacePath === undefined) {
    return [];
  }

  const snapshotPath = `${workspacePath}/${LAST_VALID_SNAPSHOT}`;
  if (!existsSync(snapshotPath)) {
    return [];
  }

  const previous = parseBrief(snapshotPath);
  return [
    ...checkAppendOnlySections(previous, brief),
    ...checkBlockerSections(previous, brief),
  ];
};

const checkAppendOnlySections = (
  previous: ParsedBrief,
  current: ParsedBrief,
): ValidationViolation[] => {
  const sections: AppendOnlySection[] = [
    {
      name: 'Constraints',
      previousEntries: previous.sections.Constraints.map(entry => entry.raw),
      currentEntries: current.sections.Constraints.map(entry => entry.raw),
    },
    {
      name: 'Decisions',
      previousEntries: previous.sections.Decisions.map(entry => entry.raw),
      currentEntries: current.sections.Decisions.map(entry => entry.raw),
    },
  ];

  return sections.flatMap(section =>
    checkPrefixEntries(
      section.name,
      section.previousEntries,
      section.currentEntries,
    ),
  );
};

const checkPrefixEntries = (
  sectionName: string,
  previousEntries: string[],
  currentEntries: string[],
): ValidationViolation[] =>
  previousEntries.flatMap((previousEntry, index) => {
    const currentEntry = currentEntries[index];
    if (currentEntry === undefined) {
      return [
        validationError(
          'append-only-entry-removed',
          `${sectionName} entry ${index + 1} from ${LAST_VALID_SNAPSHOT} was removed`,
          sectionName,
        ),
      ];
    }

    if (currentEntry !== previousEntry) {
      return [
        validationError(
          'append-only-entry-modified',
          `${sectionName} entry ${index + 1} from ${LAST_VALID_SNAPSHOT} was modified`,
          sectionName,
        ),
      ];
    }

    return [];
  });

const checkBlockerSections = (
  previous: ParsedBrief,
  current: ParsedBrief,
): ValidationViolation[] => {
  const resolvingDecisionCount = countNewResolvingDecisions(
    previous.sections.Decisions,
    current.sections.Decisions,
  );
  const sections: BlockerSection[] = [
    {
      name: 'Conflicts',
      previousEntries: previous.sections.Conflicts,
      currentEntries: current.sections.Conflicts,
    },
    {
      name: 'Unknowns',
      previousEntries: previous.sections.Unknowns,
      currentEntries: current.sections.Unknowns,
    },
  ];

  let movedBlockerCount = 0;
  return sections.flatMap(section => {
    return section.previousEntries.flatMap((previousEntry, index) => {
      if (section.currentEntries.includes(previousEntry)) {
        return [];
      }

      movedBlockerCount += 1;
      if (movedBlockerCount <= resolvingDecisionCount) {
        return [];
      }

      if (section.currentEntries[index] !== undefined) {
        return [
          validationError(
            'append-only-entry-modified',
            `${section.name} entry ${index + 1} from ${LAST_VALID_SNAPSHOT} was modified instead of preserved or moved to Decisions`,
            section.name,
          ),
        ];
      }

      return [
        validationError(
          'append-only-entry-removed',
          `${section.name} entry ${index + 1} from ${LAST_VALID_SNAPSHOT} was removed instead of preserved or moved to Decisions`,
          section.name,
        ),
      ];
    });
  });
};

const countNewResolvingDecisions = (
  previousDecisions: DecisionEntry[],
  currentDecisions: DecisionEntry[],
): number =>
  currentDecisions
    .slice(previousDecisions.length)
    .filter(decision => !isPhaseAccountingDecision(decision)).length;

const isPhaseAccountingDecision = (decision: DecisionEntry): boolean =>
  PHASES.includes(decision.step as (typeof PHASES)[number]) &&
  (decision.choice.toLowerCase() === 'ran' ||
    decision.choice.toLowerCase() === 'skipped');
