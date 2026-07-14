import type { PlanItem } from '../types.ts';
import type { ParseIssue, ParseResult, SectionContent } from './types.ts';

export const parsePlan = (
  section: SectionContent | undefined,
  sectionName: string,
): ParseResult<PlanItem[]> => {
  if (!section) return { value: [], errors: [] };
  const value: PlanItem[] = [];
  const errors: ParseIssue[] = [];
  for (const [index, line] of section.body.split('\n').entries()) {
    if (line.trim() === '') continue;
    const m = line.match(/^-\s+\[([ xX])\]\s+(?:(\[[^\]]+\])\s+)?(.+)$/);
    if (!m) {
      errors.push({
        code: 'plan-line-unparseable',
        message: `${sectionName} line must be a markdown checkbox: ${line}`,
        location: `${sectionName}:${section.startLine + index}`,
      });
      continue;
    }
    value.push({
      checked: m[1].toLowerCase() === 'x',
      ...(m[2] !== undefined ? { id: m[2].slice(1, -1).trim() } : {}),
      text: m[3].trim(),
      raw: m[0],
    });
  }
  return { value, errors };
};
