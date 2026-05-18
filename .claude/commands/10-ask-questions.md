# 10-ask-questions

Generate research questions.

## Should I run
Run unless all of these are true:
- The task has no obvious unknowns
- Acceptance Criteria is already populated
- No user-blocking questions can be anticipated

When in doubt, run.

If skipped, record [10-ask-questions] [skipped] [no unknowns to surface] in Decisions.

## Inherits
formats/phase.md

## Additional preconditions
- <workspace>/00-context.md if present

## Write
- <workspace>/10-ask-questions.md
- <workspace>/brief.md
  - frontmatter: status (set to in-planning on first run)
  - sections: Unknowns

## Do
- List only necessary questions
- Prefer codebase-answerable questions
- Mark user-blocking questions clearly

## Do not
- Answer questions
- Propose solutions

## Output
- Questions
- Assumptions
- User-blocking questions
