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
- slug: kebab-case identifier, set at init
- status: not-started / in-planning / in-progress / blocked / complete / abandoned
- current_phase: null at init, last completed or skipped phase otherwise
- current_step: null until 60-prep selects an implementation step, then the selected step name; cleared when that step reaches complete
- commits_authorized: boolean, set at init by run-default
- created: ISO date, set at init

These are the exact frontmatter keys. Do not add, omit, or rename keys.

Frontmatter is the source of truth for these fields. The markdown body must not restate them in a way that could disagree.

## Sections

- What We Built `D` - Written only by 90-close.
- Goal `D` - 1-2 sentences describing what the completed work will look like. Describes the deliverable, not the act of building it.
- Approach `D`
- Plan `C`
- Acceptance Criteria `C`
- Verification `D` - Initialized by run-workflow with a non-passing default record, then set by 80-verify. Machine-readable verification result for close.
- Conflicts `B`
- Unknowns `B`
- Constraints `A` - Format: [phase] [constraint]. Initial entries written at init from task.md. Later phases append discovered constraints.
- Decisions `A` - Format: [step] [choice] [why]
- Progress `A` - One record per implementation step.

## Frontmatter status details

Transitions:
- not-started to in-planning: set by the first phase that runs or skips
- in-planning to in-progress: set by 70-implement on first run
- in-progress to blocked: set by any phase via conflict protocol
- blocked to in-progress: set by the phase that resolves the conflict after user confirmation
- in-progress to complete: set by 90-close only
- any status to abandoned: manually set by the user upon abandonment

`not-started` is init-only. Once any phase runs or skips, `status` must be `in-planning` or later.
60-prep sets `current_step` to the selected Plan step without changing `status`.
70-implement sets `status` to in-progress on first run and clears `current_step` when Progress for that step reaches complete.
If work blocks, leave `current_step` set so the blocked step remains visible.

Step-level status (not-started / in-progress / blocked / automated-checks-passed / manual-verification-needed / complete) lives inside Progress records and is distinct from the frontmatter `status`.

## Verification Format

Status: pass / fail
Automated checks:
- passed / failed / not run
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
- Append to Conflicts
- Set frontmatter `status` to blocked
- Stop. Do not proceed until the user resolves it.

When the user confirms resolution:
- Append a resolution note to the Conflicts entry
- Move the entry to Decisions with format: [step] [choice] [why]
- Set frontmatter `status` back to in-progress

When a step obtains enough information to answer an Unknown:
- Append a resolution note to the Unknown entry
- Move the entry to Decisions with format: [step] [choice] [why]

## Skipped Phases

Skipped phases are recorded as Decisions. Do not write placeholder phase documents or placeholder section contents for skipped work.
