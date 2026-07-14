import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateBriefRaw } from './migrate-brief.ts';

test('migrates v1 brief text references to v2 IDs', () => {
  const result = migrateBriefRaw([
    '---',
    'slug: sample-task',
    'status: in-progress',
    'current_phase: 70-implement',
    'current_step: Add JSON output',
    'commits_authorized: false',
    'created: 2026-07-14',
    '---',
    '',
    '## Plan',
    '- [x] Add JSON output',
    '',
    '## Acceptance Criteria',
    '- [ ] CLI emits JSON',
    '',
    '## Decisions',
    '- [80-verify] [defer acceptance criterion: CLI emits JSON] [External check]',
    '',
    '## Progress',
    'Step: Add JSON output',
    'Status: complete',
    'Automated checks:',
    '- passed',
    'Manual verification:',
    '- confirmed',
    'Notes:',
    '- Done.',
    '',
  ].join('\n'));

  assert.deepEqual(result.errors, []);
  assert.equal(result.changed, true);
  assert.match(result.migrated, /brief_version: 2/);
  assert.match(result.migrated, /current_step: S1/);
  assert.match(result.migrated, /- \[x\] \[S1\] Add JSON output/);
  assert.match(result.migrated, /- \[ \] \[AC1\] CLI emits JSON/);
  assert.match(
    result.migrated,
    /- \[80-verify\] \[defer acceptance criterion: AC1\] \[External check\]/,
  );
  assert.match(result.migrated, /Step: S1/);
});

test('migration reports ambiguous duplicate Plan text', () => {
  const result = migrateBriefRaw([
    '---',
    'slug: sample-task',
    'status: in-progress',
    'current_phase: 70-implement',
    'current_step: Add JSON output',
    'commits_authorized: false',
    'created: 2026-07-14',
    '---',
    '',
    '## Plan',
    '- [ ] Add JSON output',
    '- [ ] Add JSON output',
    '',
  ].join('\n'));

  assert(
    result.errors.some(error =>
      error.includes('Plan item text is duplicated'),
    ),
  );
});
