import { STEP_STATUSES } from '../constants.ts';
import type { ProgressRecord, StepStatus } from '../types.ts';
import {
  extractField,
  extractListField,
  extractSingleListField,
  parseAutomated,
  parseManual,
} from './common.ts';
import type { ParseIssue, ParseResult, SectionContent } from './types.ts';

export const parseProgress = (
  section: SectionContent | undefined,
): ParseResult<ProgressRecord[]> => {
  if (!section) return { value: [], errors: [] };
  const blocks = splitBlocks(section.body, section.startLine);
  const parsed = blocks.map(block =>
    parseProgressBlock(block.body, `Progress:${block.startLine}`),
  );
  return {
    value: parsed
      .map(result => result.value)
      .filter((r): r is ProgressRecord => r !== undefined),
    errors: parsed.flatMap(result => result.errors),
  };
};

const parseProgressBlock = (
  block: string,
  location: string,
): ParseResult<ProgressRecord | undefined> => {
  const step = extractField(block, /Step:\s*(.+)/);
  const status = extractField(block, /Status:\s*(.+)/);
  const errors: ParseIssue[] = [];
  if (!step) {
    errors.push({
      code: 'progress-step-missing',
      message: 'Progress block is missing a Step field',
      location,
    });
  }
  if (!status) {
    errors.push({
      code: 'progress-status-missing',
      message: 'Progress block is missing a Status field',
      location,
    });
  }
  if (!step || !status) {
    return { value: undefined, errors };
  }

  const automated = extractSingleListField(
    block,
    {
      label: 'Automated checks:',
      name: 'Automated checks',
      codePrefix: 'automated-checks',
    },
    location,
  );
  const manual = extractSingleListField(
    block,
    {
      label: 'Manual verification:',
      name: 'Manual verification',
      codePrefix: 'manual-verification',
    },
    location,
  );
  const notes = extractListField(block, 'Notes:');
  const parsedStatus = parseProgressStatus(status, location);
  const parsedAutomated = parseAutomated(automated.value, location, [
    'passed',
    'failed',
    'not-run',
  ]);
  const parsedManual = parseManual(manual.value, location);

  return {
    value: {
      step: step.trim(),
      status: parsedStatus.value,
      automatedChecks: parsedAutomated.value,
      manualVerification: parsedManual.value,
      notes: notes.join('\n').trim(),
      raw: block,
    },
    errors: [
      ...errors,
      ...automated.errors,
      ...manual.errors,
      ...parsedStatus.errors,
      ...parsedAutomated.errors,
      ...parsedManual.errors,
    ],
  };
};

const splitBlocks = (
  body: string,
  sectionStartLine: number,
): { body: string; startLine: number }[] => {
  const blocks: { body: string; startLine: number }[] = [];
  const current: string[] = [];
  let currentStartLine: number | undefined;

  const flush = (): void => {
    if (current.length === 0 || currentStartLine === undefined) return;
    blocks.push({
      body: current.join('\n').trim(),
      startLine: currentStartLine,
    });
    current.length = 0;
    currentStartLine = undefined;
  };

  for (const [index, line] of body.split('\n').entries()) {
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (currentStartLine === undefined) {
      currentStartLine = sectionStartLine + index;
    }
    current.push(line);
  }
  flush();

  return blocks;
};

const parseProgressStatus = (
  s: string,
  location: string,
): ParseResult<StepStatus> => {
  const v = s.toLowerCase().trim();
  if (STEP_STATUSES.includes(v as StepStatus)) {
    return { value: v as StepStatus, errors: [] };
  }
  return {
    value: 'blocked',
    errors: [
      {
        code: 'progress-status-invalid',
        message: `Progress status must be one of: ${STEP_STATUSES.join(', ')}; got: ${s}`,
        location,
      },
    ],
  };
};
