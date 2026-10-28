import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeClaudeMd } from './sync-workflow.ts';

const upstream = [
  '# Project Agent Defaults',
  '',
  'Rules:',
  '- upstream rule one',
  '- upstream rule two',
  '## LOCAL OVERRIDES (edit me)',
  '- upstream sample override',
  '',
].join('\n');

test('CLAUDE.md merge keeps the local overrides section', () => {
  const local = [
    '# Project Agent Defaults',
    '',
    'Rules:',
    '- upstream rule one',
    '## LOCAL OVERRIDES (edit me)',
    '- my local override',
    '',
  ].join('\n');

  const result = mergeClaudeMd(upstream, local);

  assert.equal(result.changed, true);
  assert.equal(result.keptLocalOverrides, true);
  assert.deepEqual(result.dropped, []);
  assert.equal(
    result.merged,
    [
      '# Project Agent Defaults',
      '',
      'Rules:',
      '- upstream rule one',
      '- upstream rule two',
      '## LOCAL OVERRIDES (edit me)',
      '- my local override',
      '',
    ].join('\n'),
  );
});

test('CLAUDE.md merge reports local-only lines above the overrides', () => {
  const local = [
    '# Project Agent Defaults',
    '',
    'Rules:',
    '- upstream rule one',
    '- my hand-edited rule',
    '## LOCAL OVERRIDES (edit me)',
    '',
  ].join('\n');

  const result = mergeClaudeMd(upstream, local);

  assert.deepEqual(result.dropped, ['- my hand-edited rule']);
  assert.equal(result.merged.includes('my hand-edited rule'), false);
});

test('CLAUDE.md merge replaces a file without an overrides section', () => {
  const local = '# Custom\n- my rule\n';

  const result = mergeClaudeMd(upstream, local);

  assert.equal(result.keptLocalOverrides, false);
  assert.deepEqual(result.dropped, ['# Custom', '- my rule']);
  assert.equal(result.merged, upstream);
});

test('CLAUDE.md merge uses upstream as-is when no local file exists', () => {
  const result = mergeClaudeMd(upstream, undefined);

  assert.equal(result.changed, true);
  assert.equal(result.merged, upstream);
});

test('CLAUDE.md merge is unchanged when local already matches, ignoring CRLF', () => {
  const result = mergeClaudeMd(upstream, upstream.replace(/\n/g, '\r\n'));

  assert.equal(result.changed, false);
  assert.deepEqual(result.dropped, []);
});
