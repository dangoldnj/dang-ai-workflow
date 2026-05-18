import type { ParseIssue, ParseResult, SectionContent } from './types.ts';

export const parseList = (
  section: SectionContent | undefined,
  sectionName: string,
): ParseResult<string[]> => {
  if (!section) return { value: [], errors: [] };
  const lines = section.body.split('\n');
  const value: string[] = [];
  const errors: ParseIssue[] = [];
  for (const [index, line] of lines.entries()) {
    if (line.trim() === '') continue;
    const parsed = line.match(/^-\s+(.+)$/)?.[1];
    if (parsed === undefined) {
      errors.push({
        code: 'list-line-unparseable',
        message: `${sectionName} line must be a markdown bullet: ${line}`,
        location: `${sectionName}:${section.startLine + index}`,
      });
      continue;
    }
    value.push(parsed);
  }
  return { value, errors };
};
