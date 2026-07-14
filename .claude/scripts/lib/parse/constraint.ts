import { PHASES } from '../constants.ts';
import type { ConstraintEntry, ConstraintPhase } from '../types.ts';
import type { ParseIssue, ParseResult, SectionContent } from './types.ts';

const CONSTRAINT_PHASES: readonly ConstraintPhase[] = ['init', ...PHASES];

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
    const phase = m[1].trim();
    if (!isConstraintPhase(phase)) {
      errors.push({
        code: 'constraint-invalid-tag',
        message: `Constraint tagged [${phase}] is not a known phase or [init]`,
        location: `Constraints:${section.startLine + index}`,
      });
      continue;
    }
    value.push({
      phase,
      text: m[2].trim(),
      raw: m[0],
    });
  }
  return { value, errors };
};

const isConstraintPhase = (phase: string): phase is ConstraintPhase =>
  CONSTRAINT_PHASES.includes(phase as ConstraintPhase);
