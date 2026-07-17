# dang-ai-workflow

Structured workflows for AI-assisted software engineering.

Created by Daniel Goldshlack <daniel@goldshlack.net>
Initial version: 2026-05-15

A structured AI-assisted engineering workflow for transforming ambiguous ideas into validated implementations through staged reasoning, planning, execution, and verification.

This repository contains a modular workflow system designed for use with modern coding agents such as Claude Code, Cursor, Codex, ChatGPT, and related AI-assisted development environments.

The core philosophy is simple:

- Separate thinking stages explicitly
- Preserve reasoning artifacts
- Reduce hidden assumptions
- Improve reproducibility
- Enable cross-thread continuity
- Make agent collaboration inspectable
- Treat workflows as first-class engineering primitives

---

## Quick Start

The included scripts require Node >= 22.18.

**Installation**

Unpack this repository to the root of any project. The workflow files live in `.claude/` and a root-level `AGENTS.md` (which simply delegates to `.claude/CLAUDE.md`).

Alternatively, install once into a shared environment directory (e.g. `~/my-projects`) and open all your repos inside a single Cursor workspace - the workflow commands will be available across all of them.

**Summarize briefs**

To summarize active briefs and promoted artifacts:

```bash
node .claude/scripts/summarize-briefs.ts
node .claude/scripts/summarize-briefs.ts --json
node .claude/scripts/summarize-briefs.ts --verbose
```

**Update workflow directories in-place**

To update an existing project's workflow files, run this from that project's root:

```bash
node .claude/scripts/sync-workflow.ts --commands
node .claude/scripts/sync-workflow.ts --scripts --commit <commit>
```

Pass both flags to update both directories explicitly. Matching files are overwritten and project-specific extra files are retained.

**Starting a new task**

```
execute .claude/commands/run-workflow.md
task: [linear ticket url]
<title>[linear title]</title>
<description>[linear description]</description>
<additional_context>[any additional context that might help]</additional_context>
```

Let the context window fill to roughly 60-80% before moving on - still experimenting with this threshold.

**Continuing an existing task in a new thread**

```
execute .claude/commands/continue.md
slug: [workflow slug]
```

The workflow automatically builds a shared knowledge base upon completion of each workflow run, stored under `thoughts/shared/`.

---

## Repository Structure

```
.claude/
  CLAUDE.md                        # Root agent directives (role, rules, environment, style)
  settings.local.json              # Local agent settings
  commands/
    run-workflow.md                # Entry point: initializes a new workflow
    continue.md                   # Resume an existing workflow in a new thread
    README.md                     # Commands reference and pipeline overview
    00-context.md                 # Phase 00: establish task context
    10-ask-questions.md           # Phase 10: clarify unknowns (self-gating)
    20-research.md                # Phase 20: research codebase/domain (self-gating)
    30-discuss.md                 # Phase 30: discuss approach
    40-structure.md               # Phase 40: break down the work
    50-plan.md                    # Phase 50: create the implementation plan
    60-prep.md                    # Phase 60: prepare for implementation
    70-implement.md               # Phase 70: implement a plan step
    80-verify.md                  # Phase 80: verify the implementation
    90-close.md                   # Phase 90: close and promote artifacts
    formats/
      brief.md                    # Canonical state format for a unit of work
      phase.md                    # Universal contract every phase inherits
      presentation.md             # Styling guidance for research and plan phases
    legacy/                       # Retired commands (reference only)
      create_plan.md
      implement_plan.md
      research_codebase.md
  scripts/
    sync-workflow.ts              # Pull commands and scripts from the upstream repo
    summarize-briefs.ts            # Summarize active briefs and promoted artifacts
    validate-brief.ts             # Structural validator - run after every phase write
    lib/
      types.ts
      parse-brief.ts
      parse-frontmatter.ts
      parse/                      # Section-level parsers (plan, constraints, decisions, etc.)
      validate/                   # Validators (frontmatter, phase transitions, terminal state, etc.)
    package.json
    tsconfig.json
AGENTS.md                         # One-liner: delegates to .claude/CLAUDE.md
```

**Generated at runtime** (not in repo, created per-project):

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

---

## Core Concepts

The workflow is intentionally staged.

Typical progression:

```
00  Context
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

Each stage produces explicit artifacts that become inputs to later stages.

The workflow is designed to:

- Reduce hallucinated implementation drift
- Preserve architectural intent
- Improve long-running agent continuity
- Enable resumable execution
- Support human oversight without micromanagement
- Scale from solo development to multi-agent orchestration

---

## Design Principles

### Explicit State Over Implicit Context

Important decisions should exist in artifacts, not only inside transient model context windows.

### Workflow As Infrastructure

The workflow itself is treated as a system deserving:

- invariants
- validation
- evolution
- tooling
- observability

### Human-Guided Agentic Development

The workflow is not intended to replace human judgment.

Instead, it creates a structured collaboration layer between:

- humans
- AI agents
- implementation artifacts
- validation systems

### Artifact-Centric Operation

Plans, research, execution notes, verification results, and implementation progress are all durable artifacts.

This enables:

- replayability
- auditing
- branch experimentation
- long-horizon continuity

---

## Known Limitations / In Progress

This is an actively evolving workflow used in production. Rough edges being worked on:

- **Scratch file retention**: canonical phase scratch files such as `60-prep.md` represent the current phase state and may be overwritten. If per-step prep history is useful, archive copies such as `60-prep.<step-id>.md`; keep `60-prep.md` current so validator checks remain deterministic.
- **Git authorization**: the agent can be zealous with commits. Recommend adding context comments to constrain this, or explicitly set `commits_authorized: true` only when intended.

---

## Intended Usage

This repository is primarily intended for:

- Software engineering workflows
- AI-assisted development
- Long-running implementation efforts
- Multi-threaded AI collaboration
- Research-to-implementation pipelines
- Architecture-heavy systems work
- Agent orchestration experimentation

---

## Philosophy

Large language models are powerful amplifiers, but raw generation alone is insufficient for reliable engineering.

Reliable outcomes require:

- staged reasoning
- constraint preservation
- explicit verification
- durable context
- architectural continuity

This repository explores what happens when those concerns are treated as core system design problems instead of prompt engineering afterthoughts.

---

## License

This work is licensed under the Creative Commons Attribution 4.0 International License.

See the `LICENSE` file for details.
