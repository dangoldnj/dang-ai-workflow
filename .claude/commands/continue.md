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

## Output
- Current state summary
- Next phase being run (or stop reason)
