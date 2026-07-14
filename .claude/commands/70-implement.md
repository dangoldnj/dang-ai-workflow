# 70-implement

Implement one step.

## Should I run
Always runs to execute the prepared step.

## Inherits
formats/phase.md

## Write
- <workspace>/70-implement.md (scratch only)
- <workspace>/brief.md
  - frontmatter: status (set to in-progress on first run), current_step
  - sections: Progress (create or update current step record), Plan (check off completed step), Conflicts (if any)

brief.md is canonical for step status. 70-implement.md is scratch only.

## Progress tracking
- Record the step exactly as frontmatter `current_step`
- Mark step status as one of:
  - not-started
  - in-progress
  - blocked
  - automated-checks-passed
  - manual-verification-needed
  - complete
- Do not mark manual verification complete unless the user explicitly confirms it
- Keep one Progress record per Plan step. Update the existing record for the current step as it advances.

## Do
- Set frontmatter `status` to in-progress on first run
- Read the plan completely before implementing
- Follow existing patterns
- Work on only one step at a time
- Update Progress in brief.md
- Clear frontmatter `current_step` only when Progress for that step reaches complete
- Pause after automated checks for manual verification when required
- Trust existing checkmarks when resuming; do not re-verify completed work
- After completing one step, stop and report to the user - do not proceed to the next step until the user confirms

## Constraints
- Stop if the plan conflicts with the code
- Present conflicts in this format:
    Expected: [what the plan says]
    Found: [actual situation]
    Why this matters: [explanation]
- Do not improvise missing design
- Do not proceed past the current step
- Implementing additional steps without rerunning 60-prep and receiving user confirmation is a contract violation

## Do not
- Jump ahead
- Refactor unrelated code

## Output
- Changes
- Files changed
- Results
- Issues
- Progress record
- Next step

## Progress record format
Step: [frontmatter current_step]
Status: [step status]
Automated checks:
- [passed/failed/not run]
Manual verification:
- [needed/not needed/confirmed]
Notes:
- [anything relevant]
