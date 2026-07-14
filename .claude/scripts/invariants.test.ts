import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { INVARIANTS, type Invariant } from './lib/invariants.ts';
import { COVERED_INVARIANTS } from './test-support/invariant-coverage.ts';

const scriptsLibPath = fileURLToPath(new URL('./lib', import.meta.url));

const collectTypeScriptFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(path);
    }
    return entry.isFile() && path.endsWith('.ts') ? [path] : [];
  });

const extractLiteralInvariantCodes = (source: string): string[] => [
  ...[...source.matchAll(/validation(?:Error|Warning)\(\s*'([^']+)'/g)].map(
    match => match[1],
  ),
  ...[...source.matchAll(/code:\s*'([^']+)'/g)].map(match => match[1]),
];

test('all invariant codes are cataloged and covered by focused assertions', () => {
  const catalogedInvariants = new Set(INVARIANTS);
  const coveredInvariants = new Set(Object.values(COVERED_INVARIANTS).flat());
  const emittedLiteralInvariants = new Set(
    collectTypeScriptFiles(scriptsLibPath).flatMap(path =>
      extractLiteralInvariantCodes(readFileSync(path, 'utf8')),
    ),
  );
  const uncatalogedInvariants = [...emittedLiteralInvariants]
    .filter(invariant => !catalogedInvariants.has(invariant as Invariant))
    .sort();
  const unknownCoveredInvariants = [...coveredInvariants]
    .filter(invariant => !catalogedInvariants.has(invariant))
    .sort();
  const missingCoverage = INVARIANTS.filter(
    invariant => !coveredInvariants.has(invariant),
  );

  assert.deepEqual(uncatalogedInvariants, []);
  assert.deepEqual(unknownCoveredInvariants, []);
  assert.deepEqual(missingCoverage, []);
});
