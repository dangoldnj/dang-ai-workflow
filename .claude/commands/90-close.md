# 90-close

Finalize the work record.

## Should I run
Always runs as the terminal phase.

This phase outputs no "Next command to run."

## Inherits
formats/phase.md

## Write
- <workspace>/brief.md
  - frontmatter: status, current_step (set to null)
  - sections: What We Built

## Do
- Double check with the user that they agree it is complete
- Set frontmatter `status` to complete
- Set frontmatter `current_step` to null
- Write What We Built: what was done, what was deferred, final state
- Derive a 1-2 sentence summary from What We Built for use in the promoted brief frontmatter
- Summarize deferred work and relevant final decisions in What We Built
- Promote durable artifacts to shared directories:
  - Copy 20-research.md to thoughts/shared/research/<date>-<slug>.md if present
  - Copy 30-discuss.md to thoughts/shared/discussions/<date>-<slug>.md if present
  - Copy 50-plan.md to thoughts/shared/plans/<date>-<slug>.md
  - Copy brief.md to thoughts/shared/briefs/<date>-<slug>.md with transformed frontmatter:
    - Keep: slug, status, created
    - Add: closed (today), summary (derived from What We Built)
    - Drop: current_phase, current_step, commits_authorized
- Promotion overwrites existing files at destination paths when the local file is newer - otherwise, raise a Conflict

## Do not
- Modify code
- Modify any append-only sections beyond their normal append behavior

## Output
- Final brief.md
  Do not rewrite the whole brief; only update owned sections.
