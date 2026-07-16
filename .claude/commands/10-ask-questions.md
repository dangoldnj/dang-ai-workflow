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

## Write
- <workspace>/10-ask-questions.md
- <workspace>/brief.md
  - frontmatter: status (set to in-planning on first run)
  - sections: Unknowns with `UK` IDs

## Do
- List only necessary questions
- Prefer codebase-answerable questions
- Mark user-blocking questions clearly
- For user-blocking questions, conduct an interview: ask one question at a time, offer your best-guess answer with each, and wait for the user's reply
- Record each interview answer as a resolved UK Decision tagged [user-confirmed]
- Bias the interview toward shrinking scope: probe what can be cut, deferred, or split

## Do not
- Answer questions
- Propose solutions

## Output
- User-blocking questions
- Questions
- Assumptions
