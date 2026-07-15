import { existsSync } from 'node:fs';
import { LAST_VALID_SNAPSHOT, PHASES } from '../constants.ts';
import { parseBrief } from '../parse-brief.ts';
import type { BlockerEntry, DecisionEntry, ParsedBrief } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

type AppendOnlySection = {
  name: string;
  previousEntries: string[];
  currentEntries: string[];
};

type BlockerSection = {
  name: string;
  previousEntries: BlockerEntry[];
  currentEntries: BlockerEntry[];
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
  const resolvingDecisionsByBlockerId = getNewResolvingDecisionsByBlockerId(
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

  return sections.flatMap(section => {
    const currentEntriesById = new Map<string, BlockerEntry>(
      section.currentEntries.flatMap(blockerEntryIdPair),
    );

    return section.previousEntries.flatMap((previousEntry, index) => {
      if (previousEntry.id === undefined) {
        if (
          section.currentEntries.some(entry => entry.raw === previousEntry.raw)
        ) {
          return [];
        }

        return reportMissingBlocker(
          section.name,
          index,
          section.currentEntries,
        );
      }

      const currentEntry = currentEntriesById.get(previousEntry.id);
      if (currentEntry !== undefined) {
        if (currentEntry.raw === previousEntry.raw) {
          return [];
        }

        return [
          validationError(
            'append-only-entry-modified',
            `${section.name} entry ${previousEntry.id} from ${LAST_VALID_SNAPSHOT} was modified instead of preserved or moved to Decisions`,
            section.name,
          ),
        ];
      }

      const resolvingDecision = resolvingDecisionsByBlockerId.get(
        previousEntry.id,
      );
      if (resolvingDecision !== undefined) {
        if (resolvingDecision.why.includes(previousEntry.text)) {
          return [];
        }

        return [
          validationError(
            'append-only-entry-removed',
            `${section.name} entry ${previousEntry.id} from ${LAST_VALID_SNAPSHOT} was moved to Decisions, but the resolving Decision does not preserve the original text`,
            section.name,
          ),
        ];
      }

      return reportMissingBlocker(section.name, index, section.currentEntries);
    });
  });
};

const blockerEntryIdPair = (entry: BlockerEntry): [string, BlockerEntry][] =>
  entry.id === undefined ? [] : [[entry.id, entry]];

const reportMissingBlocker = (
  sectionName: string,
  index: number,
  currentEntries: BlockerEntry[],
): ValidationViolation[] => {
  if (currentEntries[index] !== undefined) {
    return [
      validationError(
        'append-only-entry-modified',
        `${sectionName} entry ${index + 1} from ${LAST_VALID_SNAPSHOT} was modified instead of preserved or moved to Decisions`,
        sectionName,
      ),
    ];
  }

  return [
    validationError(
      'append-only-entry-removed',
      `${sectionName} entry ${index + 1} from ${LAST_VALID_SNAPSHOT} was removed instead of preserved or moved to Decisions`,
      sectionName,
    ),
  ];
};

const getNewResolvingDecisionsByBlockerId = (
  previousDecisions: DecisionEntry[],
  currentDecisions: DecisionEntry[],
): Map<string, DecisionEntry> =>
  new Map(
    currentDecisions.slice(previousDecisions.length).flatMap(decision => {
      if (isPhaseAccountingDecision(decision)) {
        return [];
      }

      const id = decision.choice.match(/^resolved\s+(CF\S+|UK\S+)$/)?.[1];
      return id === undefined
        ? []
        : ([[id, decision]] as [string, DecisionEntry][]);
    }),
  );

const isPhaseAccountingDecision = (decision: DecisionEntry): boolean =>
  PHASES.includes(decision.step as (typeof PHASES)[number]) &&
  (decision.choice.toLowerCase() === 'ran' ||
    decision.choice.toLowerCase() === 'skipped');
