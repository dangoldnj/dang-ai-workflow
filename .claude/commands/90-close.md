# 90-close

Finalize the work record.

## Should I run
Always runs as the terminal phase, and only after the verified work is merged into the default branch. The merge is recorded in Decisions as `[90-close] [merged: <PR, branch, or commit>] [how it was confirmed]` after the latest 80-verify run. The router stops with `awaiting-merge` until that Decision exists; `continue` records it.

This phase outputs no "Next command to run."

## Inherits
formats/phase.md

## Write
- <workspace>/brief.md
  - frontmatter: status, current_step (set to null)
  - sections: What We Built

## Do
- If no merge Decision follows the latest 80-verify run, stop and tell the user to run `continue` to confirm the merge
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
    - Keep: brief_version, slug, status, created
    - Add: closed (today), summary (derived from What We Built)
    - Drop: current_phase, current_step, commits_authorized
- Promotion may overwrite an existing destination only when the destination already came from the same workspace slug and the source content differs. If the destination exists for a different workspace or cannot be proven to be the same workspace, raise a Conflict.

## Do not
- Modify code
- Modify any append-only sections beyond their normal append behavior

## Output
- Final brief.md
  Do not rewrite the whole brief; only update owned sections.
