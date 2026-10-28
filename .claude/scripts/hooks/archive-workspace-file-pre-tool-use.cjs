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
// <workspace>/history/ before the first write in each phase run, so no phase
// loses what an earlier phase wrote. Later writes in the same run are not
// archived: they are that run's own work in progress.
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
  archive(
    filePath,
    join(workspacePath, HISTORY_DIR, dirname(relativePath)),
    findPhaseRun(workspacePath),
  );
} catch (err) {
  process.stderr.write(
    `Refusing to overwrite ${filePath}: failed to archive its current contents to ${HISTORY_DIR}/: ${err instanceof Error ? err.message : err}\n`,
  );
  process.exit(2);
}

// Archives are named <name>[.<step>].<NNN><ext>, where NNN is the phase run,
// and taken once per file per run. The archive itself marks the run as done,
// so it is taken even when its contents match an earlier archive.
function archive(sourcePath, archiveDir, run) {
  const extension = extname(sourcePath);
  const name = basename(sourcePath, extension);
  const archivePattern = new RegExp(
    `^${escapeRegExp(name)}(?:\\.[A-Za-z0-9_-]+)?\\.(\\d{3,})${escapeRegExp(extension)}$`,
  );

  mkdirSync(archiveDir, { recursive: true });

  if (
    readdirSync(archiveDir).some(
      entry => Number(entry.match(archivePattern)?.[1]) === run,
    )
  ) {
    return;
  }

  const step = findStepLabel(readFileSync(sourcePath, 'utf8'));
  const stem = step === undefined ? name : `${name}.${step}`;
  copyFileSync(
    sourcePath,
    join(archiveDir, `${stem}.${String(run).padStart(3, '0')}${extension}`),
  );
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

// Each phase appends `[<phase>] [ran]`, `[ran: <step>]`, or `[skipped]` to
// brief.md Decisions when it finishes, so the count of those entries stays
// fixed while a phase runs and grows by one before the next phase starts.
// The current run is that count plus one; without brief.md it is run 1.
function findPhaseRun(workspacePath) {
  const briefPath = join(workspacePath, 'brief.md');

  if (!existsSync(briefPath)) {
    return 1;
  }

  const lines = readFileSync(briefPath, 'utf8').split(/\r?\n/);
  const start = lines.findIndex(line => /^##\s+Decisions\s*$/.test(line));
  const end = lines.findIndex(
    (line, index) => index > start && /^##\s/.test(line),
  );
  const outcomes =
    start === -1
      ? []
      : lines
          .slice(start + 1, end === -1 ? undefined : end)
          .filter(line =>
            /^-\s+\[[^\]]+\]\s+\[(?:ran|ran:[^\]]*|skipped)\]/i.test(line),
          );

  return outcomes.length + 1;
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
