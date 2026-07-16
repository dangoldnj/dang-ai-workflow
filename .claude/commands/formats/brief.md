# formats/brief.md

## Role

Apply the role and priorities defined in .claude/CLAUDE.md to every step.

## Purpose

`brief.md` is the living record for a unit of work.
It exists from init to close. Step files are scratchpads. This is the truth.

## Section Types

- `A` append-only - entries never removed or modified, add at end
- `B` blockers - entries never modified, but can be moved to become a Decision when resolved. See conflict protocol.
- `C` checkboxes - updated in place after completion
- `D` defined - the designated step sets and may revise this section

## Frontmatter

Every brief.md begins with a YAML frontmatter block. This is the machine-readable state of the work. The markdown body is the human-readable record.

Fields:
- brief_version: 2
- slug: kebab-case identifier, set at init
- status: not-started / in-planning / in-progress / blocked / complete / abandoned
- current_phase: null at init, highest completed or skipped phase otherwise. Reruns of earlier phases must not move it backward.
- current_step: null until 60-prep selects an implementation step, then the selected Plan item ID; cleared when that step reaches complete
- commits_authorized: boolean, set at init by run-workflow
- created: ISO date, set at init

These are the exact frontmatter keys. Do not add, omit, or rename keys.

Frontmatter is the source of truth for these fields. The markdown body must not restate them in a way that could disagree.

## Sections

- What We Built `D` - Written only by 90-close.
- Goal `D` - 1-2 sentences describing what the completed work will look like. Describes the deliverable, not the act of building it.
- Approach `D`
- Plan `C` - Markdown checkbox items with stable IDs: `- [ ] [S1] Step title`. IDs may be grouped, e.g. `A1`, `A2`, `B1`; they must be unique and end with a number.
- Acceptance Criteria `C` - Markdown checkbox items with stable IDs: `- [ ] [AC1] Criterion title`. IDs must start with `AC`, be unique, and end with a number.
- Verification `D` - Initialized by run-workflow with a non-passing default record, then set by 80-verify. Machine-readable verification result for close.
- Conflicts `B` - Markdown bullet items with stable IDs: `- [CF1] Conflict text`.
- Unknowns `B` - Markdown bullet items with stable IDs: `- [UK1] Unknown text`.
- Constraints `A` - Format: [phase] [constraint]. Initial entries written at init from task.md. Later phases append discovered constraints.
- Decisions `A` - Format: [step] [choice] [why]. Phase accounting decisions use [phase] [ran|skipped] [why].
- Progress `D` - One record per implementation step. Update the existing record in place as that step advances.

## Frontmatter status details

Transitions:
- not-started to in-planning: set by the first phase that runs or skips
- in-planning to in-progress: set by 70-implement on first run
- in-progress to blocked: set by any phase via conflict protocol
- blocked to in-progress: set by the phase that resolves the conflict after user confirmation
- in-progress to complete: set by 90-close only
- any status to abandoned: manually set by the user upon abandonment

`not-started` is init-only. Once any phase runs or skips, `status` must be `in-planning` or later.
When a phase runs or skips, set `current_phase` to that phase only if it is later than the current value.
60-prep sets `current_step` to the selected Plan step ID without changing `status`.
70-implement sets `status` to in-progress on first run and clears `current_step` when Progress for that step reaches complete.
If work blocks, leave `current_step` set so the blocked step remains visible.

Step-level status (not-started / in-progress / blocked / automated-checks-passed / manual-verification-needed / complete) lives inside Progress records and is distinct from the frontmatter `status`.

## Verification Format

Status: pass / fail
Automated checks:
- passed / failed / not run / deferred
Manual verification:
- confirmed / needed / deferred
Notes:
- [anything relevant]

Initial Verification record:

Status: fail
Automated checks:
- not run
Manual verification:
- needed
Notes:
- Not verified yet.

## Conflict Protocol

If any step finds reality contradicts the brief:
- Append to Conflicts with a `CF` ID
- Set frontmatter `status` to blocked
- Stop. Do not proceed until the user resolves it.

When the user confirms resolution:
- Move the entry to Decisions with format: [step-or-phase] [resolved CF-id] [original Conflict text; resolution]. Preserve the original Conflict text and record the actual resolution.
- Set frontmatter `status` back to in-progress

When a step obtains enough information to answer an Unknown:
- Move the entry to Decisions with format: [step-or-phase] [resolved UK-id] [original Unknown text; answer]. Preserve the original Unknown text and record the actual answer.

## Skipped Phases

Phase runs and skips are recorded as Decisions. Skipped phases must not write placeholder phase documents or placeholder section contents.
