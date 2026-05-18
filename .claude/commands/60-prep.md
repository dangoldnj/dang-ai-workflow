# 60-prep

Package execution context for one implementation step.

## Should I run
Always runs before each implementation step.

## Inherits
formats/phase.md

## Input
- Slug
- Step selector

Step selector may be:
- step number
- phase name
- next unchecked step
- explicit user instruction

If Step selector is "next unchecked step":
- Read <workspace>/brief.md
- Identify the next unchecked step in the Plan section
- Cross-reference the latest Progress entry; if status is manual-verification-needed, stop until user confirmation
- If no Progress entries exist, select the first step from the Plan in execution order

## Additional preconditions
- <workspace>/50-plan.md
- <workspace>/70-implement.md if present

## Write
- <workspace>/60-prep.md
- <workspace>/brief.md
  - frontmatter: current_step (set to selected step name)

## Do
- Select exactly one implementation step
- Write `Selected step: [exact Plan item text]` in 60-prep.md
- Reduce the plan to only what is needed for that step
- List required files, commands, constraints, and stop conditions

## Constraints
- The selected step must exactly match a Plan item.
- If the current step cannot be identified confidently, stop
- Do not prepare multiple steps
- Do not include unrelated phases

## Do not
- Modify code

## Output
- Minimal execution brief, including:
  - Selected step: [exact Plan item text]
  - Selection rationale
  - Files
  - Commands
  - Constraints
  - Stop conditions
