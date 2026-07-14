const { execFileSync } = require('node:child_process');
const { dirname } = require('node:path');

const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path;

if (typeof filePath !== 'string') {
  process.exit(0);
}

const pathSegments = filePath.split(/[\\/]+/).filter(Boolean);
const briefIndex = pathSegments.length - 1;
const isWorkflowBrief =
  pathSegments[briefIndex] === 'brief.md' &&
  pathSegments[briefIndex - 2] === 'work' &&
  pathSegments[briefIndex - 3] === 'shared' &&
  pathSegments[briefIndex - 4] === 'thoughts';

if (!isWorkflowBrief) {
  process.exit(0);
}

execFileSync(
  process.execPath,
  ['.claude/scripts/validate-brief.ts', '--format', 'json', dirname(filePath)],
  { stdio: 'inherit' },
);
