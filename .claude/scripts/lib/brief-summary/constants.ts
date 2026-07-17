export const ACTIVE_WORK_ROOT = 'thoughts/shared/work';
export const SHARED_ROOT = 'thoughts/shared';

export const SHARED_ARTIFACT_TYPES = [
  'briefs',
  'research',
  'discussions',
  'plans',
] as const;

export const OPEN_STATUS_PRIORITIES: Record<string, number> = {
  blocked: 0,
  'in-progress': 1,
  'in-planning': 2,
  'not-started': 3,
};
