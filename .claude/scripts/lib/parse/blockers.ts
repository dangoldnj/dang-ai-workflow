import type { BlockerEntry } from '../types.ts';
import type { ParseIssue, ParseResult, SectionContent } from './types.ts';

export const parseBlockers = (
  section: SectionContent | undefined,
  sectionName: 'Conflicts' | 'Unknowns',
): ParseResult<BlockerEntry[]> => {
  if (!section) return { value: [], errors: [] };
  const value: BlockerEntry[] = [];
  const errors: ParseIssue[] = [];

  for (const [index, line] of section.body.split('\n').entries()) {
    if (line.trim() === '') continue;
    const m = line.match(/^-\s+(?:(\[[^\]]+\])\s+)?(.+)$/);
    if (m === null) {
      errors.push({
        code: 'list-line-unparseable',
        message: `${sectionName} line must be a markdown bullet: ${line}`,
        location: `${sectionName}:${section.startLine + index}`,
      });
      continue;
    }

    value.push({
      ...(m[1] !== undefined ? { id: m[1].slice(1, -1).trim() } : {}),
      text: m[2].trim(),
      raw: m[0],
    });
  }

  return { value, errors };
};
