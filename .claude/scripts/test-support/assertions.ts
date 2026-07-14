import assert from 'node:assert/strict';
import type { Invariant } from '../lib/invariants.ts';
import type { ValidationResult } from '../lib/validate/types.ts';

export const assertHasInvariant = (
  result: ValidationResult,
  invariant: Invariant,
): void => {
  assert(
    result.violations.some(v => v.invariant === invariant),
    'Expected invariant ' +
      invariant +
      '; got ' +
      result.violations.map(v => v.invariant).join(', '),
  );
};
