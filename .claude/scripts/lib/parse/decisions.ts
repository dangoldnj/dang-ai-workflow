import type { DecisionEntry } from '../types.ts';
import type { ParseIssue, ParseResult, SectionContent } from './types.ts';

export const parseDecisions = (
  section: SectionContent | undefined,
): ParseResult<DecisionEntry[]> => {
  if (!section) return { value: [], errors: [] };
  const value: DecisionEntry[] = [];
  const errors: ParseIssue[] = [];
  for (const [index, line] of section.body.split('\n').entries()) {
    if (line.trim() === '') continue;
    const m =
      line.match(
        /^-\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[(.+)\]\s+\[(user-confirmed)\]\s*$/,
      ) ?? line.match(/^-\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[(.+)\]\s*$/);
    if (!m) {
      errors.push({
        code: 'decision-line-unparseable',
        message: `Decision line must match "- [step] [choice] [why]" with optional "[user-confirmed]": ${line}`,
        location: `Decisions:${section.startLine + index}`,
      });
      continue;
    }
    value.push({
      step: m[1].trim(),
      choice: m[2].trim(),
      why: m[3].trim(),
      userConfirmed: m[4] === 'user-confirmed',
      raw: m[0],
    });
  }
  return { value, errors };
};
