export type ValidationSeverity = 'error' | 'warning';

export type ValidationViolation = {
  severity: ValidationSeverity;
  invariant: string;
  message: string;
  location?: string;
};

export type ValidationResult = {
  ok: boolean;
  violations: ValidationViolation[];
};
