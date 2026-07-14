# 50-plan

Create an implementation plan.

## Should I run
Always runs. A plan is required before implementation.

## Inherits
formats/phase.md

## Optional inputs
- thoughts/shared/plans/

## Write
- <workspace>/50-plan.md
- <workspace>/brief.md (sections: Plan)

## Do
- Map slices to implementation steps in execution order
- Assign every Plan item a stable ID in the checkbox text, e.g. `- [ ] [S1] Step title`
- Use grouped Plan IDs when helpful for larger plans, e.g. `A1`, `A2`, `B1`; IDs must be unique and end with a number
- Add verification per step
- List likely files and commands
- Note any historical files consulted
- Include what we are not doing
- Separate automated checks from manual verification
- Include rollback or migration notes when relevant
- Follow presentation guidelines in: .claude/commands/formats/presentation.md
- Include an "At a Glance" summary
- Highlight scope, guardrails, verification, and primary risk
- Keep the plan fully actionable even without styling

## Constraints
- Do not add new features
- Do not skip structure
- Stop if requirements are unclear
- Stop if no validated approach is present
- If 30-discuss recorded low confidence and the approach is unvalidated, stop and instruct the user to rerun 30-discuss
- If multiple valid approaches exist and none is validated, stop
- Do not write a final plan with unresolved questions

## Do not
- Refactor broadly
- Write code

## Finalization
- The plan must be:
  - technically complete
  - free of unresolved questions
  - fully readable without styling
- Presentation styling must not:
  - hide missing details
  - replace concrete success criteria

## Output
- Steps (in execution order)
- Explicit "Not doing" list
- Files
- Commands
- Checks
- Stop conditions
- Historical references
