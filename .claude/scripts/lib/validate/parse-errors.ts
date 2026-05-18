import type { ParsedBrief } from '../types.ts';
import { validationError } from './common.ts';
import type { ValidationViolation } from './types.ts';

export const checkParseErrors = (
  brief: ParsedBrief,
): ValidationViolation[] => {
  return brief.parseErrors.map(error =>
    validationError(error.code, error.message, error.location),
  );
};
