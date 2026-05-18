import { PHASES } from '../constants.ts';
import type { Phase } from '../types.ts';
import type { ValidationViolation } from './types.ts';

export const isPhaseAtOrAfter = (
  phase: Phase | null,
  minimumPhase: Phase,
): boolean => {
  if (phase === null) return false;
  return PHASES.indexOf(phase) >= PHASES.indexOf(minimumPhase);
};

export const validationError = (
  invariant: string,
  message: string,
  location?: string,
): ValidationViolation => ({
  severity: 'error',
  invariant,
  message,
  ...(location !== undefined ? { location } : {}),
});

export const validationWarning = (
  invariant: string,
  message: string,
  location?: string,
): ValidationViolation => ({
  severity: 'warning',
  invariant,
  message,
  ...(location !== undefined ? { location } : {}),
});
