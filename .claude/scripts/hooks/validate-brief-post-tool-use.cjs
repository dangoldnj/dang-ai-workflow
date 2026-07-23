const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');

const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path;

if (typeof filePath !== 'string') {
  process.exit(0);
}

const workspacePath = findWorkflowWorkspace(filePath);

if (workspacePath === undefined) {
  process.exit(0);
}

// The validator is a .ts file that relies on Node's native TypeScript type
// stripping, unflagged only from 22.18.0 onward. On an older runtime,
// spawning it fails with a cryptic "unknown file extension .ts" error, so we
// check the version of *this* process (which needs no stripping to run)
// before spawning and fail with an actionable message instead.
const MINIMUM_NODE_VERSION = [22, 18, 0];

function isBelowMinimum(current, minimum) {
  for (let i = 0; i < minimum.length; i += 1) {
    const value = current[i] ?? 0;
    if (value !== minimum[i]) return value < minimum[i];
  }
  return false;
}

const currentVersion = process.versions.node.split('.').map(Number);
if (isBelowMinimum(currentVersion, MINIMUM_NODE_VERSION)) {
  process.stderr.write(
    `The brief validator requires Node >= ${MINIMUM_NODE_VERSION.join('.')}, but this hook is running on ${process.version}. Upgrade Node and retry.\n`,
  );
  process.exit(2);
}

const validatorPath = resolve(__dirname, '..', 'validate-brief.ts');

try {
  execFileSync(
    process.execPath,
    [validatorPath, '--format', 'json', workspacePath],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
} catch (err) {
  const stdout = typeof err.stdout === 'string' ? err.stdout : '';
  const stderr = typeof err.stderr === 'string' ? err.stderr : '';
  const output = `${stdout}${stderr}`;

  process.stderr.write(
    output.trim().length > 0
      ? output
      : `brief validator failed with exit code ${err.status ?? 'unknown'}\n`,
  );
  process.exit(2);
}

function findWorkflowWorkspace(filePath) {
  const match = filePath.match(
    /^(.*?(?:^|[/\\])thoughts[/\\]shared[/\\]work[/\\][^/\\]+)(?:[/\\].*)?$/,
  );

  return match?.[1];
}
