import assert from 'node:assert/strict';
import test from 'node:test';
import { hasMergeAfterLatestVerification } from './lib/merge.ts';
import { parseBrief } from './lib/parse-brief.ts';
import {
  makeWorkspace,
  ranDecisionsThrough,
} from './test-support/brief-fixtures.ts';

const parseWithDecisions = (
  t: Parameters<typeof makeWorkspace>[0],
  decisions: string[],
) =>
  parseBrief(
    makeWorkspace(t, {
      frontmatter: { status: 'in-progress', current_phase: '80-verify' },
      decisions,
    }).briefPath,
  );

const mergeDecision = '- [90-close] [merged: PR #12] [gh reports MERGED]';

test('merge is missing when no merge decision is recorded', t => {
  assert.equal(
    hasMergeAfterLatestVerification(
      parseWithDecisions(t, ranDecisionsThrough('80-verify')),
    ),
    false,
  );
});

test('merge recorded after the latest verification counts', t => {
  assert.equal(
    hasMergeAfterLatestVerification(
      parseWithDecisions(t, [
        ...ranDecisionsThrough('80-verify'),
        mergeDecision,
      ]),
    ),
    true,
  );
});

test('merge recorded before a later verification does not count', t => {
  assert.equal(
    hasMergeAfterLatestVerification(
      parseWithDecisions(t, [
        ...ranDecisionsThrough('80-verify'),
        mergeDecision,
        '- [60-prep] [ran: B1] [Rework]',
        '- [70-implement] [ran: B1] [Rework]',
        '- [80-verify] [ran] [Verified again]',
      ]),
    ),
    false,
  );
});
