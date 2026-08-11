# Commands

## Running a workflow

Invoke `run-workflow` with a task description (or a reference to an existing plan or spec). The command creates a workspace and writes the initial brief.

After init, run `continue` to pick up where you left off. The command routes to the correct next phase, and self-gating phases decide whether their work is needed for this task. Phases that skip record a Decision and advance to the next phase.

## Pipeline

| Phase | Runs | Purpose |
|---|---|---|
| `00-context` | Self-gating | Defines the task |
| `10-ask-questions` | Self-gating | Generates research questions |
| `20-research` | Self-gating | Answers those questions using the codebase |
| `30-discuss` | Always | Evaluates approaches |
| `40-structure` | Always | Breaks work into vertical slices |
| `50-plan` | Always | Creates an implementation plan |
| `60-prep` | Per step | Packages execution context for one implementation step |
| `70-implement` | Per step | Implements one step |
| `80-verify` | Always | Verifies the implementation |
| `90-close` | Always | Finalizes the work record |

Self-gating phases record a Decision when they skip. `60-prep` and `70-implement` repeat as a pair for each plan step. Every phase stops at its boundary and waits for explicit user confirmation before advancing.

### Rework after failed verification

> [!IMPORTANT]
> If `80-verify` fails, the workflow does not jump directly to `90-close`.
> Rework runs back through prep and implement before verification is
> attempted again.

```
80-verify fail -> 60-prep -> 70-implement -> 80-verify
```

### Deferred manual verification

Implementation progress may mark a plan step's manual verification as `deferred` when confirmation cannot yet occur. Before `80-verify` can pass with deferred manual verification, the rationale will be recorded in Decisions:

```
[80-verify] [defer manual verification] [rationale]
```

## Supporting commands

| Command | Purpose |
|---|---|
| `continue.md` | Resume a workspace by validating and following the router's next result |
| `explain-diff.md` | Create a self-contained interactive HTML explanation of a code change, diff, branch, or pull request |

## Formats

| File | Purpose |
|---|---|
| `formats/brief.md` | Canonical state for a unit of work |
| `formats/phase.md` | Universal contract every phase inherits |
| `formats/presentation.md` | Presentation and callout guidance for durable workflow documents |

## Scripts

The validator runs after every phase write. Errors block the phase from advancing.

```bash
# validate the current state of a workspace
node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug>

# validate the preconditions for entering the next phase
node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug> <next-phase>

# ask the router which phase should run next
node .claude/scripts/validate-brief.ts --next thoughts/shared/work/<slug>
```

> [!TIP]
> The validator's `--next` result is authoritative when resuming a workspace.

Flags, exit codes, JSON output, the invariant catalog, hook setup, and the other workflow scripts are documented in [scripts/README.md](../scripts/README.md).

## Shared artifacts

When a workflow closes successfully, `90-close` promotes durable artifacts to shared directories:

- `thoughts/shared/research/<date>-<slug>.md`
- `thoughts/shared/discussions/<date>-<slug>.md`
- `thoughts/shared/plans/<date>-<slug>.md`
- `thoughts/shared/briefs/<date>-<slug>.md`

These accumulate over time and form the long-term record of what was built and what was decided.

```bash
# search the shared record
grep -r "auth flow" thoughts/shared/

# or read a human-readable summary
node .claude/scripts/summarize-briefs.ts
```

The active workspace (`thoughts/shared/work/<slug>/`) remains the complete record of how a workflow proceeded. The promoted artifacts are an index optimized for discovery, not a replacement.

After close, workspaces may be archived (moved to `thoughts/archived/work/`) or deleted. The shared artifacts persist either way.

## Legacy

The pipeline was previously expressed as three entry modes (run-default, run-fast, run-unclear) and a separate legacy command set (research_codebase, create_plan, implement_plan). Both are retired. If the legacy command files remain on disk, they are reference only.
