# 30-discuss

Evaluate approaches.

## Should I run
Always runs. Every task needs at least a brief approach decision.

For trivial tasks, the output may be a single paragraph identifying the obvious approach.

## Inherits
formats/phase.md

## Optional inputs
- thoughts/shared/research/
- thoughts/shared/plans/

## Write
- <workspace>/30-discuss.md
- <workspace>/brief.md (sections: Approach, Acceptance Criteria, Decisions)

## Do
- Describe current state
- Describe desired state
- List viable approaches ranked by fit
- Choose and validate one approach
- Note any historical files consulted
- Present current state, design options, and open questions
- Ask only questions that cannot be answered from codebase research
- Write Acceptance Criteria as checkbox items with stable `AC` IDs, e.g. `- [ ] [AC1] Criterion`
- Follow presentation guidelines in: .claude/commands/formats/presentation.md
- Lead with the chosen approach and confidence level
- Present the chosen approach to the user and wait for explicit approval before recording it as a Decision
- After explicit approval, append `- [30-discuss] [approach: <name>] [rationale] [user-confirmed]` to Decisions

## Constraints
- Present risks before benefits
- Do not assume missing data
- Only use historical files when clearly relevant
- Never record an unconfirmed approach Decision

## Do not
- Plan implementation steps

## Output
- Open decisions
- Current
- Desired
- Choice
- Risks
- Options ranked
- Validation rationale
- Confidence level (high / medium / low)
- Confidence level justification per option
- Historical references

After presenting the output, stop for user approval. Only after approval write the
Approach section, Acceptance Criteria, and confirmed approach Decision.
