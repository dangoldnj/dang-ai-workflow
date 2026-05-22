## Common phase requirements

Input:
- Slug

Resolve workspace:
- thoughts/shared/work/<slug>/

Preconditions:
- <workspace>/brief.md
- <workspace>/task.md
- brief.md must pass validator with no errors for this phase
- Stop if precondition fails; report which file is missing

Write when the phase runs:
- <workspace>/<phase-output-file>.md
- <workspace>/brief.md (sections declared by the phase)
  Follow format guidelines in: .claude/commands/formats/brief.md
- <workspace>/brief.md frontmatter `current_phase` (set to this phase name)

After all writes, validate brief.md. Do not consider the phase complete until validation passes.

Output:
- Phase-specific output
- Next command to run: the next phase in pipeline order, regardless of whether this phase ran or skipped. The final phase (90-close) outputs no next command.

## Universal rules

- Do not rely on chat history.
- Do not modify code outside of 70-implement.
- If findings contradict the brief, follow the conflict protocol in brief.md.
- Append any newly discovered constraints to brief.md Constraints, tagged with the current phase.
- If this phase answers an open Unknown, follow the resolution protocol in brief.md: append a resolution note to the entry and move it to Decisions.
- Stop at every phase boundary. Do not auto-advance to the next phase. The user invokes each phase change explicitly.

## Validation

Before running, every phase must execute:

    node .claude/scripts/validate-brief.ts <workspace> <phase-name>

If the validator reports errors, the phase must not run. Report the violations to the user and stop.

After writing to brief.md, run the universal validator:

    node .claude/scripts/validate-brief.ts <workspace>

If it reports errors, the phase has produced an invalid state. Report the violations to the user and do not advance.

If the validator reports only warnings, the phase may proceed but must surface the warnings in its phase output.

The validator is the source of truth for brief.md structural invariants. Phases should not re-implement these checks in prose. Semantic correctness (whether the plan is good, whether the research is thorough) remains the phase's responsibility.

## Self-gating

Every phase begins with a "Should I run" check, which may place content at the top of the phase file immediately after the title. The phase decides whether its work is needed based on workspace state.

If the phase is "always run" by definition, this section does not need to be included in the phase file.

If the phase skips, it must:

- Skip writing any phase specific document
- Record the decision in brief.md Decisions, tagged with the phase name and reason
- Set frontmatter `current_phase` to its own name (skipped phases still count as the last completed phase)
- Output the next command to run

The skip check runs after preconditions and initial validation. A phase cannot skip an invalid brief; it must report the validation errors instead.

Skip criteria are phase-specific and documented in each phase file under "Should I run".

When in doubt, run. Skip criteria are written as guards, not optimizations. A phase that is unsure whether to skip must run.

The user may force a phase to run by invoking it directly. Forced runs ignore skip criteria but still follow the rest of the contract.
