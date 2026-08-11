# dang-ai-workflow

Structured workflows for AI-assisted software engineering.

Created by Daniel Goldshlack <daniel@goldshlack.net>
Initial version: 2026-05-15

A structured, artifact-centric workflow for turning ambiguous ideas into validated implementations through staged reasoning, planning, execution, and verification.

Designed for modern coding agents such as Claude Code, Cursor, Codex, ChatGPT, and related AI-assisted development environments, it is suited to long-running, research-to-implementation, and architecture-heavy engineering work.

It provides:

- Explicit stages and human-confirmed phase boundaries
- Durable plans, decisions, progress, and verification records
- Validation and routing for resumable, cross-thread execution
- A searchable shared record of completed work

---

## Quick Start

> [!IMPORTANT]
> The included scripts require Node `>=22.18`.

### Installation

Copy the `.claude/` directory to the project root. For agents that read `AGENTS.md`, also copy the root-level `AGENTS.md` helper; it delegates to `.claude/CLAUDE.md`.

Alternatively, install once into a shared environment directory (e.g. `~/my-projects`) and open all your repos inside a single Cursor workspace - the workflow commands will be available across all of them.

### Updating an installed copy

Once installed, `sync-workflow.ts` pulls newer workflow files from upstream in place, so you do not have to re-copy directories by hand:

```bash
# preview what would change
node .claude/scripts/sync-workflow.ts --commands --scripts --dry-run

# apply the update, dropping files upstream no longer ships
node .claude/scripts/sync-workflow.ts --commands --scripts --prune
```

Pass `--commit` to pin to a specific commit instead of tracking upstream `main`, and `--root` to update a repository other than the current one. `--prune` deletes downstream files, so preview with `--dry-run` before the first pruning sync in a repo. See the [scripts reference](.claude/scripts/README.md#workflow-sync) for the full flag list.

### Starting a new task

```
execute .claude/commands/run-workflow.md
task: [ticket url]
<title>[ticket title]</title>
<description>[ticket description]</description>
<additional_context>[any additional context that might help]</additional_context>
```

Let the context window fill to roughly 60-80% before moving on, or start a new thread if you think the next phase would benefit from a fresh context window.

### Continuing in a new thread

```
execute .claude/commands/continue.md
slug: [workflow slug]
```

The workflow automatically builds a shared knowledge base upon completion of each workflow run, stored under `thoughts/shared/` - see [Generated at runtime](#generated-at-runtime), below.

### Workflow documentation

- [Commands reference](.claude/commands/README.md): workflow phases, routing, resumptions, and command behavior.
- [Scripts reference](.claude/scripts/README.md): validation, migration, recovery, summaries, hooks, and in-place synchronization.

---

## Workflow at a Glance

```
00  Context             (self-gating: skips if not needed)
  |
10  Ask Questions       (self-gating: skips if not needed)
  |
20  Research            (self-gating: skips if not needed)
  |
30  Discuss
  |
40  Structure
  |
50  Plan
  |
60  Prep
  |
70  Implement           (loops between 60 & 70 for each plan step)
  |
80  Verify
  |
90  Close
```

Phases 00, 10, and 20 are self-gating and record a Decision when skipped. Phases 30 through 90 always run. Each phase stops at its boundary and waits for explicit user confirmation before advancing.

The workflow treats plans, decisions, implementation progress, and verification results as durable artifacts that later phases—and later sessions—can inspect and validate.

---

## Repository Structure

### In the repository

```
.claude/
  CLAUDE.md                       # Root agent directives (role, rules, environment, style)
  settings.example.json           # PostToolUse validator-hook configuration (optional)
  commands/                       # Workflow phases, helpers, formats, and command reference
    formats/                      # Brief, phase, and presentation contracts
    legacy/                       # Retired command set, kept for reference only
  scripts/                        # Workflow tooling and scripts reference
    validate-brief.ts             # Structural validator and phase router
    migrate-brief.ts              # Brief format migration
    summarize-briefs.ts           # Report on active work and promoted artifacts
    sync-workflow.ts              # In-place update from upstream
    hooks/                        # PostToolUse hook helper (.cjs, runs on any Node)
    lib/                          # Parsing, validation, and reporting internals
    *.test.ts                     # Node test-runner suites
.github/workflows/ci.yml          # Type-check and test on push and pull request
AGENTS.md                         # One-liner: delegates to .claude/CLAUDE.md (optional)
LICENSE                           # Apache-2.0
```

### Generated at runtime

Not in the repository; created per-project.

```
thoughts/
  shared/
    work/<slug>/                  # Active workflow workspace (complete run record)
    research/<date>-<slug>.md     # Promoted on close
    discussions/<date>-<slug>.md  # Promoted on close
    plans/<date>-<slug>.md        # Promoted on close
    briefs/<date>-<slug>.md       # Promoted on close
  archived/
    work/<slug>/                  # Archived workspaces (optional)
```

Shared artifacts accumulate over time as a searchable long-term record:

```bash
grep -r "auth flow" thoughts/shared/
```
... and appear in a human-readable summary:
```bash
node .claude/scripts/summarize-briefs.ts
```

---

## Known Limitations / In Progress

This is an actively evolving workflow used in production. Rough edges being worked on:

- **Scratch file retention**: canonical phase scratch files such as `60-prep.md` represent the current phase state and may be overwritten. `60-prep.md` must stay current for validator checks to remain deterministic, so per-step history is best preserved alongside it - archive copies such as `60-prep.<step-id>.md` if that history is useful to you.
- **Git authorization**: the agent can be zealous with commits. If you intend to use `commits_authorized: true`, add additional context comments to constrain this as desired.

---

## License

Licensed under the Apache License, Version 2.0.

Copyright 2026 Daniel Goldshlack. See the [LICENSE](LICENSE) file for the full terms.
