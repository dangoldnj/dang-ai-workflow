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
- step ID
- phase name
- next unchecked step
- explicit user instruction

If Step selector is "next unchecked step":
- Read <workspace>/brief.md
- Identify the next unchecked Plan item by ID
- Cross-reference the latest Progress entry; if status is manual-verification-needed, stop until user confirmation
- If no Progress entries exist, select the first step from the Plan in execution order

## Write
- <workspace>/60-prep.md
- <workspace>/brief.md
  - frontmatter: current_step (set to selected Plan item ID)
  - sections: Plan and Progress, only when reopening a completed step for failed-verification rework

The canonical `60-prep.md` is overwritten for each selected step. If per-step history is needed, create an archive copy such as `60-prep.<step-id>.md`, but keep `60-prep.md` as the current selected-step scratch file.

## Do
- Select exactly one implementation step
- Write a `Selected step:` line containing only the chosen Plan item ID in 60-prep.md
- Reduce the plan to only what is needed for that step
- List required files, commands, constraints, and stop conditions

## Rework after failed verification
- If `Verification` is `Status: fail` and all Plan items are checked, select exactly one Plan item to rework.
- Reopen that selected item by unchecking it in Plan.
- Update the selected item's existing Progress record away from `complete` to the active status that represents the rework state.
- Do not create a second Progress record for the same Plan item.
- Leave `Verification` as failed. 80-verify owns replacing it after rework is implemented.

## Constraints
- If the current step cannot be identified confidently, stop
- Do not prepare multiple steps
- Do not include unrelated phases

## Do not
- Modify code

## Output
- Minimal execution brief, including:
  - Selected step
  - Selection rationale
  - Files
  - Commands
  - Constraints
  - Stop conditions
