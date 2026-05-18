import { validationError } from './common.ts';
import { PHASES, WORKFLOW_STATUSES } from '../constants.ts';
import type { ParsedBrief, Phase } from '../types.ts';
import type { ValidationViolation } from './types.ts';

export const checkFrontmatterShape = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const fm = brief.frontmatter;

  if (!fm) {
    return [
      validationError(
        'frontmatter-missing',
        'Frontmatter is missing or unparseable',
      ),
    ];
  }

  if (typeof fm.slug !== 'string' || fm.slug.length === 0) {
    v.push(validationError('frontmatter-slug', 'slug is missing or empty'));
  }

  if (!WORKFLOW_STATUSES.includes(fm.status)) {
    v.push(
      validationError(
        'frontmatter-status',
        `status must be one of: ${WORKFLOW_STATUSES.join(', ')}; got: ${fm.status}`,
      ),
    );
  }

  if (
    fm.current_phase !== null &&
    !PHASES.includes(fm.current_phase as Phase)
  ) {
    v.push(
      validationError(
        'frontmatter-current-phase',
        `current_phase must be null or a known phase; got: ${fm.current_phase}`,
      ),
    );
  }

  if (typeof fm.commits_authorized !== 'boolean') {
    v.push(
      validationError(
        'frontmatter-commits-authorized',
        'commits_authorized must be a boolean',
      ),
    );
  }

  if (
    typeof fm.created !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fm.created)
  ) {
    v.push(
      validationError(
        'frontmatter-created',
        'created must be an ISO date (YYYY-MM-DD)',
      ),
    );
  }

  return v;
};
