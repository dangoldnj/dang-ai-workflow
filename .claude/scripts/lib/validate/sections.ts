import { BRIEF_SECTIONS } from '../constants.ts';
import type { ParsedBrief } from '../types.ts';
import { validationError, validationWarning } from './common.ts';
import type { ValidationViolation } from './types.ts';

type Heading = { title: string; line: number };

export const checkSectionShape = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const headings = extractSectionHeadings(brief.raw);
  const headingTitles = new Set(headings.map(heading => heading.title));
  const expectedTitles = new Set<string>(BRIEF_SECTIONS);
  const violations: ValidationViolation[] = [];

  for (const section of BRIEF_SECTIONS) {
    if (!headingTitles.has(section)) {
      violations.push(
        validationError(
          'section-missing',
          `brief.md is missing required section heading: ## ${section}`,
          section,
        ),
      );
    }
  }

  for (const heading of headings) {
    if (!expectedTitles.has(heading.title)) {
      violations.push(
        validationError(
          'section-unknown',
          `brief.md has unknown section heading: ## ${heading.title}`,
          `line ${heading.line}`,
        ),
      );
    }
  }

  violations.push(...checkCanonicalOrder(headings));

  return violations;
};

const extractSectionHeadings = (raw: string): Heading[] =>
  raw.split('\n').flatMap((line, index) => {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    return heading === null ? [] : [{ title: heading[1], line: index + 1 }];
  });

const checkCanonicalOrder = (headings: Heading[]): ValidationViolation[] => {
  const expectedOrder = new Map(
    BRIEF_SECTIONS.map((section, index) => [section, index]),
  );
  let highestSeenIndex = -1;
  const violations: ValidationViolation[] = [];

  for (const heading of headings) {
    const sectionIndex = expectedOrder.get(
      heading.title as (typeof BRIEF_SECTIONS)[number],
    );
    if (sectionIndex === undefined) {
      continue;
    }

    if (sectionIndex < highestSeenIndex) {
      violations.push(
        validationWarning(
          'section-out-of-order',
          `brief.md section ## ${heading.title} is out of canonical order`,
          `line ${heading.line}`,
        ),
      );
      continue;
    }

    highestSeenIndex = sectionIndex;
  }

  return violations;
};
