# 00-context

Define the task.

## Should I run
Run unless all of these are true:
- task.md is a single clear paragraph
- The deliverable is unambiguous
- No obvious unknowns or undefined terms

When in doubt, run.

If skipped, record [00-context] [skipped] [task already specific] in Decisions.

## Inherits
formats/phase.md

## Write
- <workspace>/00-context.md
- <workspace>/brief.md
  - frontmatter: status (if not-started, set to in-planning)
  - append to Constraints, tagged [00-context]

## Do
- Restate the task in 1-2 sentences
- List unknowns
- If the task implies more than one independently shippable deliverable, propose splitting into separate workflow slugs and stop for user confirmation

## Do not
- Propose solutions
- Assume missing information
- Replace Goal (Goal is set at init)

## Output
- Task
- Unknowns
- Historical references if any
