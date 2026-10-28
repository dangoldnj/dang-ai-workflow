# autopilot

Run consecutive phases without stopping at phase boundaries. Every other rule in formats/phase.md, formats/brief.md, and each phase file still applies. Invoking autopilot is the user's confirmation to advance past each phase boundary and completed step until a stop.

## Input
- Slug
- Optional target: `until <phase>` (stop after it completes or skips) or `until <step-id>` (stop when its Progress is `complete`)

## Do
- Run `node .claude/scripts/setup-hooks.ts`. If it does not exit 0, report its output and stop. Do not run it with `--write`; installing hooks is the user's decision.
- Read thoughts/shared/work/<slug>/brief.md and .claude/commands/formats/phase.md
- Repeat:
  - Run `continue` for the slug, stopping wherever it stops
  - Report one line: phase, ran or skipped, step ID if any
  - Stop if the target is reached or a stop below applies

## Stops
In addition to every stop from the validator, router, and phase files:
- 80-verify records `Status: fail`. Do not start rework until the user has discussed it.
- A test fails that is not declared as an expected failure (see formats/phase.md)
- A commit is needed that the plan does not list for the step
- `commits_authorized` is false and a step has finished 70-implement

## Commits
When `commits_authorized` is true, approving the plan approves its planned commits for each step. Make them as their changes pass automated checks, following .claude/CLAUDE.md commit rules. If a step lists no commits, stop and propose them. Do not include workspace files under thoughts/ in step commits.

## Output
- Stop reason
- Phases run or skipped, steps completed, and commits made (hash and message)
- Validator warnings raised during the run
- Next command to run
