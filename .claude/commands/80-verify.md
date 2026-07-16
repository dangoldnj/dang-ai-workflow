# 80-verify

Verify implementation.

## Should I run
Always runs after 70-implement.

## Inherits
formats/phase.md

## Additional preconditions
- Current diff

## Write
- <workspace>/80-verify.md
- <workspace>/brief.md
  - frontmatter: status (set to blocked if Conflicts appended)
  - sections: Verification (set), Decisions (append deferrals if any), Conflicts with `CF` IDs (append if any)

## Do
- Compare changes to the plan
- Check success criteria
- Identify gaps and risks
- Identify the single most critical issue
- Separate automated verification from manual verification
- Do not mark manual checks complete unless confirmed by the user
- Follow presentation guidelines in: .claude/commands/formats/presentation.md
- Lead with pass or fail. If fail, surface the critical issue prominently.
- Write the same result to brief.md Verification using the format in formats/brief.md

## Constraints
- Treat unrelated changes as a failure unless justified
- Do not mark automated checks passed when none apply; set Automated checks to deferred and add `[80-verify] [defer automated checks] [rationale]` in Decisions.
- Do not infer manual verification; it must be confirmed by the user or explicitly deferred with `[80-verify] [defer manual verification] [rationale]` in Decisions.
- Unmet Acceptance Criteria may be deferred only by ID, e.g. `[80-verify] [defer acceptance criterion: AC2] [rationale]`.

## Do not
- Modify code

## Output
- Pass or fail
- brief.md Verification record
- Matches
- Gaps
- Risks
- Critical issue
- Recommended next action
