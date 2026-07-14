# run-workflow

Initialize and execute a workflow.

Input:
- Task

Do:
- Create a short kebab-case slug from the task
- Read .claude/commands/formats/phase.md
- Create workspace: thoughts/shared/work/<slug>/
- Write the task description to <workspace>/task.md
  - If the user provided the task as prose, write that prose
  - If the user referenced an external file (plan, spec, doc), read that file and write a 1-paragraph summary plus a reference to the original
- Write this workflow to: <workspace>/workflow.md
- Ask user if commits are authorized; record in brief.md frontmatter as commits_authorized
- Write <workspace>/brief.md:
  - Follow format guidelines in: .claude/commands/formats/brief.md
  - Frontmatter: slug, status: not-started, current_phase: null, current_step: null, commits_authorized (ask user), created (today)
  - Goal: 1-2 sentences describing what the completed work for this slug will look like. Derived from task.md. This describes the work the workflow will deliver, not the act of running the workflow.
  - Acceptance Criteria: if known, otherwise empty
  - Verification: write the initial non-passing Verification record from .claude/commands/formats/brief.md so the brief passes validation before 80-verify replaces it.
  - Constraints: derived from task.md, if any are stated. These describe constraints on the work itself, not on the workflow execution. Tag each entry with [init].
- Validate and route <workspace>/brief.md with: node .claude/scripts/validate-brief.ts --next <workspace>
- If validation reports errors, fix the initialized brief before stopping
- If the validator does not return NEXT 00-context, report the result and stop
- Stop after initialization

Output:
- Slug
- Workspace
- Next command to run: validator-reported NEXT phase
