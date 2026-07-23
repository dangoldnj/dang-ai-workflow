## Common phase requirements

Input:
- Slug

Resolve workspace:
- thoughts/shared/work/<slug>/

Preconditions:
- <workspace>/brief.md
- <workspace>/task.md
- brief.md must pass validator with no errors for this phase; write this file last, after any other file changes
- Stop if precondition fails; report which file is missing

The phase precheck enforces workspace files, prior phase dependencies, and validator-owned state rules. Phase-specific command files should list only preconditions that are not represented in the validator.

Write when the phase runs:
- <workspace>/<phase-output-file>.md
- <workspace>/brief.md (sections declared by the phase)
  Follow format guidelines in: .claude/commands/formats/brief.md
- <workspace>/brief.md Decisions entry: `[phase] [ran] [phase completed]` (or `[ran: S7]` if it ran Step 7, for example)
- <workspace>/brief.md frontmatter `status` (if `not-started`, set to `in-planning`)
- <workspace>/brief.md frontmatter `current_phase` (set to this phase name only if it is later than the current value)

After all writes, validate brief.md. Do not consider the phase complete until validation passes.

If validation fails and the state cannot be repaired, restore brief.md from the last valid snapshot:

    node .claude/scripts/validate-brief.ts --restore <workspace>

This overwrites brief.md with .brief.last-valid.md and discards the unrepairable state.

Output:
- Phase-specific output
- Next command to run: the next phase in pipeline order, regardless of whether this phase ran or skipped. The final phase (90-close) outputs no next command.

## Universal rules

- Do not rely on chat history.
- Do not modify code outside of 70-implement.
- If findings contradict the brief, follow the conflict protocol in brief.md.
- Append any newly discovered constraints to brief.md Constraints, tagged with the current phase.
- If this phase answers an open Unknown, follow the resolution protocol in brief.md: move it to Decisions with a `resolved UK` reference and preserve the original Unknown text in the Decision rationale.
- Stop at every phase boundary. Do not auto-advance to the next phase. The user invokes each phase change explicitly.

## Validation

Before running, every phase must execute:

    node .claude/scripts/validate-brief.ts <workspace> <phase-name>

If the validator reports errors, the phase must not run. Report the violations to the user and stop.

After writing to brief.md, run the universal validator:

    node .claude/scripts/validate-brief.ts <workspace>

If it reports errors, the phase has produced an invalid state. Report the violations to the user and do not advance.

If the validator reports only warnings, the phase may proceed but must surface the warnings in its phase output.

Successful validation refreshes `<workspace>/.brief.last-valid.md`. This file is validator-owned; do not edit it manually.

The validator is the source of truth for brief.md structural invariants. Phases should not re-implement these checks in prose. Semantic correctness (whether the plan is good, whether the research is thorough) remains the phase's responsibility.

## Self-gating

Every phase begins with a "Should I run" check, which may place content at the top of the phase file immediately after the title. The phase decides whether its work is needed based on workspace state.

If the phase is "always run" by definition, this section does not need to be included in the phase file.

If the phase skips, it must:

- Skip writing any phase specific document
- Record the decision in brief.md Decisions as `[phase] [skipped] [reason]`
- If frontmatter `status` is `not-started`, set it to `in-planning`
- Set frontmatter `current_phase` to its own name only if it is later than the current value
- Output the next command to run

The skip check runs after preconditions and initial validation. A phase cannot skip an invalid brief; it must report the validation errors instead.

Skip criteria are phase-specific and documented in each phase file under "Should I run".

When in doubt, run. Skip criteria are written as guards, not optimizations. A phase that is unsure whether to skip must run.

The user may force a phase to run by invoking it directly. Forced runs ignore skip criteria but still follow the rest of the contract.
