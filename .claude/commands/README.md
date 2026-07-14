# Commands

## Running a workflow

Invoke `run-workflow` with a task description (or a reference to an existing plan or spec). The command creates a workspace and writes the initial brief.

After init, run phases in pipeline order. Each phase decides whether its work is needed for this task. Phases that skip record a Decision and advance to the next phase.

## Pipeline order

00-context -> 10-ask-questions -> 20-research -> 30-discuss -> 40-structure -> 50-plan -> 60-prep -> 70-implement -> 80-verify -> 90-close

Phases 00, 10, and 20 are self-gating and may skip when their work is not needed. Phases 30 through 90 always run.

## Formats

- formats/brief.md - canonical state for a unit of work
- formats/phase.md - universal contract every phase inherits
- formats/presentation.md - styling guidance for 20-research and 50-plan

## Scripts

- scripts/validate-brief.ts - structural validator for brief.md

Run after every phase write. Errors block the phase from advancing.

Common validator commands:

```bash
node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug>
node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug> <next-phase>
node .claude/scripts/validate-brief.ts --format json thoughts/shared/work/<slug>
node .claude/scripts/validate-brief.ts --next thoughts/shared/work/<slug>
node .claude/scripts/migrate-brief.ts --write thoughts/shared/work/<slug>
```

The validator requires Node `>=22.18.0`.

Exit codes:

- `0`: validation passed; warnings may be present
- `1`: validation found one or more errors
- `2`: usage error, parse failure, or validator runtime failure

For hook setup, JSON output, and invariant catalog details, see `.claude/scripts/README.md`.

## Shared artifacts

When a workflow closes successfully, 90-close promotes durable artifacts to shared directories:

- thoughts/shared/research/<date>-<slug>.md
- thoughts/shared/discussions/<date>-<slug>.md
- thoughts/shared/plans/<date>-<slug>.md
- thoughts/shared/briefs/<date>-<slug>.md

These accumulate over time and form the long-term record of what was built and what was decided. Search them via grep:

    grep -r "auth flow" thoughts/shared/

The active workspace (thoughts/shared/work/<slug>/) remains the complete record of how a workflow proceeded. The promoted artifacts are an index optimized for discovery, not a replacement.

After close, workspaces may be archived (moved to thoughts/archived/work/) or deleted. The shared artifacts persist either way.

## Legacy

The pipeline was previously expressed as three entry modes (run-default, run-fast, run-unclear) and a separate legacy command set (research_codebase, create_plan, implement_plan). Both are retired. If the legacy command files remain on disk, they are reference only.
