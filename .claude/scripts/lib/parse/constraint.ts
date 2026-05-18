import type { ConstraintEntry, Phase } from '../types.ts';
import type { ParseIssue, ParseResult, SectionContent } from './types.ts';

export const parseConstraints = (
  section: SectionContent | undefined,
): ParseResult<ConstraintEntry[]> => {
  if (!section) return { value: [], errors: [] };
  const value: ConstraintEntry[] = [];
  const errors: ParseIssue[] = [];
  for (const [index, line] of section.body.split('\n').entries()) {
    if (line.trim() === '') continue;
    const m = line.match(/^-\s+\[([^\]]+)\]\s+(.+)$/);
    if (!m) {
      errors.push({
        code: 'constraint-line-unparseable',
        message: `Constraint line must match "- [phase] text": ${line}`,
        location: `Constraints:${section.startLine + index}`,
      });
      continue;
    }
    value.push({
      phase: m[1] as Phase,
      text: m[2].trim(),
      raw: m[0],
    });
  }
  return { value, errors };
};
