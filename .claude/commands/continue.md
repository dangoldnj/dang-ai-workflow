# continue

Resume a workflow at the next step.

## Input
- Slug

## Do
- Read thoughts/shared/work/<slug>/brief.md
- Read .claude/commands/formats/phase.md
- Run universal validator and router: node .claude/scripts/validate-brief.ts --next thoughts/shared/work/<slug>
- If validation reports errors, report the violations and stop
- If the validator returns STOP, report the stop reason and stop
- If the validator returns NEXT, run phase precheck: node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug> <next-phase>
- If the phase precheck reports errors, report the violations and stop
- Run the prechecked next phase
- If the next phase is 70-implement and the active Progress status is `manual-verification-needed`, use 70-implement only to record explicit user confirmation before advancing
- If resuming after failed 80-verify, route through the validator result; the expected rework loop is 60-prep -> 70-implement -> 80-verify

## Output
- Current state summary
- Next phase being run (or stop reason)
