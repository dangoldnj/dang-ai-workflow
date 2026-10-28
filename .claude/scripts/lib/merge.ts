import type { DecisionEntry, ParsedBrief } from './types.ts';

// 90-close runs only after the verified work is merged into the default
// branch. The merge is recorded as `[90-close] [merged: <ref>] [how it was
// confirmed]`. Only a record after the latest 80-verify run counts, so rework
// that is verified again needs a new merge record.
export const hasMergeAfterLatestVerification = (brief: ParsedBrief): boolean =>
  brief.sections.Decisions.slice(
    getLatestVerifyRunIndex(brief.sections.Decisions) + 1,
  ).some(isMergeDecision);

const getLatestVerifyRunIndex = (decisions: DecisionEntry[]): number =>
  decisions.reduce(
    (latest, entry, index) =>
      entry.step === '80-verify' &&
      /^ran(:|$)/.test(entry.choice.toLowerCase())
        ? index
        : latest,
    -1,
  );

const isMergeDecision = (entry: DecisionEntry): boolean =>
  entry.step === '90-close' && /^merged(:|$)/.test(entry.choice.toLowerCase());
