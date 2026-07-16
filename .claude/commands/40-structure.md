# 40-structure

Break work into vertical slices.

## Should I run
Always runs. Structure is required before planning.

## Inherits
formats/phase.md

## Write
- <workspace>/40-structure.md
- <workspace>/brief.md (append to Decisions)

## Do
- Define vertical slices
- Assign each slice a stable `SL` ID in its heading, e.g. `### SL1 - Slice title`
- Map each slice to the Acceptance Criteria IDs it covers; every AC ID must appear in at least one slice
- Make each slice testable
- Order slices by execution dependency
- Identify the first slice

## Constraints
- Avoid horizontal-only slices unless required
- If no chosen approach exists, use the most obvious approach and state that it is unvalidated

## Do not
- Write code

## Output
- Slices
- Order (execution-dependency order)
- Dependency rationale for the slice ordering
- First slice
- Validation status
