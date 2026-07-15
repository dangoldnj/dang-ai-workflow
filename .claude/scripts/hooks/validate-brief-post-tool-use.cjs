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
