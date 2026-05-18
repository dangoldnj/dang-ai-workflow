# continue

Resume a workflow at the next step.

## Input
- Slug

## Do
- Read thoughts/shared/work/<slug>/brief.md
- Run universal validator: node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug>
- Identify next phase based on frontmatter current_phase and status

## Phase routing
- If status is complete or abandoned, report and stop
- If status is blocked, report the blocking condition and stop
- If current_phase is null, run 00-context (or the first phase that should run)
- If status is in-progress and current_step is set, run 70-implement with that step
- Otherwise, continue by phase order from current_phase
- After selecting a next phase, run phase precheck: node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug> <next-phase>
- If the phase precheck reports errors, report the violations and stop

## Output
- Current state summary
- Next phase being run (or stop reason)
