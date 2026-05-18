import type { VerificationRecord } from '../types.ts';
import {
  extractField,
  extractListField,
  extractSingleListField,
  parseAutomated,
} from './common.ts';
import type { ParseResult, SectionContent } from './types.ts';

export const parseVerification = (
  section: SectionContent | undefined,
): ParseResult<VerificationRecord | undefined> => {
  if (!section) return { value: undefined, errors: [] };
  const body = section.body;
  const location = `Verification:${section.startLine}`;

  const status = extractField(body, /Status:\s*(.+)/);
  if (!status) {
    return {
      value: undefined,
      errors: [
        {
          code: 'verification-status-missing',
          message: 'Verification section is missing a Status field',
          location,
        },
      ],
    };
  }

  const automated = extractSingleListField(
    body,
    {
      label: 'Automated checks:',
      name: 'Automated checks',
      codePrefix: 'automated-checks',
    },
    location,
  );
  const manual = extractSingleListField(
    body,
    {
      label: 'Manual verification:',
      name: 'Manual verification',
      codePrefix: 'verification-manual',
    },
    location,
  );
  const notes = extractListField(body, 'Notes:');
  const parsedStatus = parseVerificationStatus(status, location);
  const parsedAutomated = parseAutomated(automated.value, location);
  const parsedManual = parseVerificationManual(manual.value, location);

  return {
    value: {
      status: parsedStatus.value,
      automatedChecks: parsedAutomated.value,
      manualVerification: parsedManual.value,
      notes: notes.join('\n').trim(),
      raw: body,
    },
    errors: [
      ...automated.errors,
      ...manual.errors,
      ...parsedStatus.errors,
      ...parsedAutomated.errors,
      ...parsedManual.errors,
    ],
  };
};

const parseVerificationStatus = (
  s: string,
  location: string,
): ParseResult<'pass' | 'fail'> => {
  const v = s.toLowerCase().trim();
  if (v === 'pass') return { value: 'pass', errors: [] };
  if (v === 'fail') return { value: 'fail', errors: [] };
  return {
    value: 'fail',
    errors: [
      {
        code: 'verification-status-invalid',
        message: `Verification status must be pass or fail; got: ${s}`,
        location,
      },
    ],
  };
};

const parseVerificationManual = (
  s: string,
  location: string,
): ParseResult<'confirmed' | 'needed' | 'deferred'> => {
  const v = s.toLowerCase().trim();
  if (v === 'confirmed') return { value: 'confirmed', errors: [] };
  if (v === 'needed') return { value: 'needed', errors: [] };
  if (v === 'deferred') return { value: 'deferred', errors: [] };
  return {
    value: 'needed',
    errors: [
      {
        code: 'verification-manual-invalid',
        message: `Verification manual verification must be confirmed, needed, or deferred; got: ${s || 'missing'}`,
        location,
      },
    ],
  };
};
