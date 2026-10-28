const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} = require('node:fs');
const { basename, dirname, extname, join, relative } = require('node:path');

// Workflow scratch files (60-prep.md, 70-implement.md, 50-plan.md, ...) are
// overwritten as phases rerun. This hook copies the current contents into
// <workspace>/history/ before every write, so no workspace content is lost.
// brief.md is excluded: its history is protected by the validator snapshot
// and append-only rules.
const HISTORY_DIR = 'history';
const EXCLUDED_FILES = new Set(['brief.md', '.brief.last-valid.md']);

const input = JSON.parse(readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path;

if (typeof filePath !== 'string') {
  process.exit(0);
}

const workspacePath = findWorkflowWorkspace(filePath);

if (
  workspacePath === undefined ||
  !existsSync(filePath) ||
  !statSync(filePath).isFile()
) {
  process.exit(0);
}

const relativePath = relative(workspacePath, filePath);
const [topLevel] = relativePath.split(/[/\\]/);

if (EXCLUDED_FILES.has(relativePath) || topLevel === HISTORY_DIR) {
  process.exit(0);
}

try {
  archive(filePath, join(workspacePath, HISTORY_DIR, dirname(relativePath)));
} catch (err) {
  process.stderr.write(
    `Refusing to overwrite ${filePath}: failed to archive its current contents to ${HISTORY_DIR}/: ${err instanceof Error ? err.message : err}\n`,
  );
  process.exit(2);
}

function archive(sourcePath, archiveDir) {
  const extension = extname(sourcePath);
  const step = findStepLabel(readFileSync(sourcePath, 'utf8'));
  const stem =
    step === undefined
      ? basename(sourcePath, extension)
      : `${basename(sourcePath, extension)}.${step}`;
  const archivePattern = new RegExp(
    `^${escapeRegExp(stem)}\\.(\\d{3,})${escapeRegExp(extension)}$`,
  );

  mkdirSync(archiveDir, { recursive: true });

  const latest = readdirSync(archiveDir)
    .map(name => ({ name, match: name.match(archivePattern) }))
    .filter(entry => entry.match !== null)
    .map(entry => ({ name: entry.name, number: Number(entry.match[1]) }))
    .reduce(
      (max, entry) =>
        max === undefined || entry.number > max.number ? entry : max,
      undefined,
    );

  if (
    latest !== undefined &&
    readFileSync(join(archiveDir, latest.name)).equals(readFileSync(sourcePath))
  ) {
    return;
  }

  const next = String((latest?.number ?? 0) + 1).padStart(3, '0');
  copyFileSync(sourcePath, join(archiveDir, `${stem}.${next}${extension}`));
}

// 60-prep.md names its step with `Selected step: <id>` and 70-implement.md
// with `Step: <id>`. The label comes from the archived contents, so it always
// names the step those contents belong to.
function findStepLabel(contents) {
  const step = contents.match(
    /^\s*(?:-\s*)?(?:Selected step|Step):\s*(.+?)\s*$/m,
  )?.[1];

  return step !== undefined && /^[A-Za-z0-9_-]+$/.test(step)
    ? step
    : undefined;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findWorkflowWorkspace(filePath) {
  const match = filePath.match(
    /^(.*?(?:^|[/\\])thoughts[/\\]shared[/\\]work[/\\][^/\\]+)(?:[/\\].*)?$/,
  );

  return match?.[1];
}
