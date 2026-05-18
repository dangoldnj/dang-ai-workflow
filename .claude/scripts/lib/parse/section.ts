import type { SectionContent } from './types.ts';

export const splitSections = (
  body: string,
  bodyStartLine: number,
): Record<string, SectionContent> => {
  const lines = body.split('\n');
  const sections: Record<string, SectionContent> = {};
  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  let currentStartLine = 1;

  const flush = (): void => {
    if (currentTitle !== null) {
      sections[currentTitle] = trimSection(currentLines, currentStartLine);
    }
  };

  for (const [index, line] of lines.entries()) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      flush();
      currentTitle = heading[1];
      currentLines = [];
      currentStartLine = bodyStartLine + index + 1;
    } else if (currentTitle !== null) {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
};

const trimSection = (lines: string[], startLine: number): SectionContent => {
  const firstContent = lines.findIndex(line => line.trim() !== '');
  if (firstContent === -1) {
    return { body: '', startLine };
  }

  let lastContent = lines.length - 1;
  while (lastContent > firstContent && lines[lastContent].trim() === '') {
    lastContent -= 1;
  }
  return {
    body: lines.slice(firstContent, lastContent + 1).join('\n'),
    startLine: startLine + firstContent,
  };
};
