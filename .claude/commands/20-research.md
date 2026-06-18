# 20-research

Answer questions using the codebase.

## Should I run
Run unless all of these are true:
- No codebase-answerable questions remain after 10-ask-questions
- No file references or patterns need verification
- The task is purely conceptual or external

When in doubt, run.

If skipped, record [20-research] [skipped] [no codebase questions to answer] in Decisions.

## Inherits
formats/phase.md

## Additional preconditions
- <workspace>/00-context.md if present
- <workspace>/10-ask-questions.md

## Optional inputs
- thoughts/shared/research/
- thoughts/shared/plans/

## Write
- <workspace>/20-research.md

## Do
- Answer each question
- Cite files and patterns
- Separate facts from inferences
- Note any historical files consulted
- Read mentioned files fully before summarizing them
- Verify user corrections against the codebase before accepting them
- Return specific file references when possible
- Follow presentation guidelines in: .claude/commands/formats/presentation.md
- Emphasize evidence, current state, and component relationships

## Constraints
- Read all mentioned files fully before doing anything else
- Do not spawn sub-agents before completing those direct related reads yourself
- For broad research questions, spawn parallel sub-agents unless the user explicitly asks you not to
- If sub-agents are not authorized, proceed sequentially
- If data is insufficient, say so
- Do not rely on prior knowledge when codebase evidence should exist
- Only use historical files when clearly relevant

## Do not
- Design solutions
- Convert findings into recommendations

## Output
- Unknowns
- Answers
- Inferences
- Files
- Patterns
- Historical references
