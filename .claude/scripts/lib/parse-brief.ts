import { readFileSync } from 'node:fs';
import { parseFrontmatter } from './parse-frontmatter.ts';
import type { BriefFrontmatter, ParsedBrief } from './types.ts';
import { parseConstraints } from './parse/constraint.ts';
import { parseDecisions } from './parse/decisions.ts';
import { parseList } from './parse/list.ts';
import { parsePlan } from './parse/plan.ts';
import { parseProgress } from './parse/progress.ts';
import { splitSections } from './parse/section.ts';
import { parseVerification } from './parse/verification.ts';

export const parseBrief = (path: string): ParsedBrief => {
  const raw = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
  const {
    data,
    body,
    bodyStartLine,
    errors: frontmatterErrors,
  } = parseFrontmatter(raw);
  const frontmatter = data as unknown as BriefFrontmatter;
  const sections = splitSections(body, bodyStartLine);
  const acceptanceCriteria = parsePlan(
    sections['Acceptance Criteria'],
    'Acceptance Criteria',
  );
  const constraints = parseConstraints(sections.Constraints);
  const conflicts = parseList(sections.Conflicts, 'Conflicts');
  const unknowns = parseList(sections.Unknowns, 'Unknowns');
  const decisions = parseDecisions(sections.Decisions);
  const plan = parsePlan(sections.Plan, 'Plan');
  const verification = parseVerification(sections.Verification);
  const progress = parseProgress(sections.Progress);

  return {
    frontmatter,
    sections: {
      'What We Built': sections['What We Built']?.body,
      Goal: sections.Goal?.body,
      Approach: sections.Approach?.body,
      Plan: plan.value,
      'Acceptance Criteria': acceptanceCriteria.value,
      Verification: verification.value,
      Conflicts: conflicts.value,
      Unknowns: unknowns.value,
      Constraints: constraints.value,
      Decisions: decisions.value,
      Progress: progress.value,
    },
    parseErrors: [
      ...frontmatterErrors,
      ...acceptanceCriteria.errors,
      ...constraints.errors,
      ...conflicts.errors,
      ...unknowns.errors,
      ...decisions.errors,
      ...plan.errors,
      ...verification.errors,
      ...progress.errors,
    ],
    raw,
  };
};
