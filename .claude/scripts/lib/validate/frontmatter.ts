import { validationError } from './common.ts';
import { PHASES, WORKFLOW_STATUSES } from '../constants.ts';
import type { ParsedBrief, Phase } from '../types.ts';
import type { ValidationViolation } from './types.ts';

const EXPECTED_FRONTMATTER_KEYS = [
  'slug',
  'status',
  'current_phase',
  'current_step',
  'commits_authorized',
  'created',
] as const;

export const checkFrontmatterShape = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  const fm = brief.frontmatter;

  if (!brief.raw.startsWith('---\n')) {
    v.push(
      validationError(
        'frontmatter-missing',
        'Frontmatter is missing or unparseable',
      ),
    );
  }

  const keys = Object.keys(fm as unknown as Record<string, unknown>);
  const actualKeys = new Set(keys);

  const expectedKeys = new Set<string>(EXPECTED_FRONTMATTER_KEYS);
  for (const key of EXPECTED_FRONTMATTER_KEYS) {
    if (!actualKeys.has(key)) {
      v.push(
        validationError(
          'frontmatter-missing-key',
          `Frontmatter is missing required key: ${key}`,
        ),
      );
    }
  }

  for (const key of keys) {
    if (!expectedKeys.has(key)) {
      v.push(
        validationError(
          'frontmatter-unknown-key',
          `Frontmatter has unknown key: ${key}`,
        ),
      );
    }
  }

  if (actualKeys.has('slug') && typeof fm.slug !== 'string') {
    v.push(validationError('frontmatter-slug', 'slug must be a string'));
  } else if (actualKeys.has('slug') && fm.slug.length === 0) {
    v.push(validationError('frontmatter-slug', 'slug is missing or empty'));
  } else if (
    actualKeys.has('slug') &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fm.slug)
  ) {
    v.push(
      validationError(
        'frontmatter-slug',
        `slug must be kebab-case; got: ${fm.slug}`,
      ),
    );
  }

  if (actualKeys.has('status') && !WORKFLOW_STATUSES.includes(fm.status)) {
    v.push(
      validationError(
        'frontmatter-status',
        `status must be one of: ${WORKFLOW_STATUSES.join(', ')}; got: ${fm.status}`,
      ),
    );
  }

  if (
    actualKeys.has('current_phase') &&
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

  if (
    actualKeys.has('current_step') &&
    fm.current_step !== null &&
    typeof fm.current_step !== 'string'
  ) {
    v.push(
      validationError(
        'frontmatter-current-step',
        'current_step must be null or a string',
      ),
    );
  }

  if (
    actualKeys.has('commits_authorized') &&
    typeof fm.commits_authorized !== 'boolean'
  ) {
    v.push(
      validationError(
        'frontmatter-commits-authorized',
        'commits_authorized must be a boolean',
      ),
    );
  }

  if (actualKeys.has('created')) {
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
  }

  return v;
};
