## Document Presentation

Final planning, research, and design documents must be easy to scan in a dark-themed markdown UI. The shape of the document carries information; the styling is a vocabulary that surfaces that shape.

This guidance applies to:

- Codebase research memos produced by `.claude/commands/20-research.md`
- Approach decisions produced by `.claude/commands/30-discuss.md`
- Implementation plans produced by `.claude/commands/50-plan.md`
- Verification reports produced by `.claude/commands/80-verify.md`
- Design documents stored in `thoughts/shared/design/`

### Core rules

- Use compact inline HTML/CSS callouts by default.
- Keep documents fully actionable as plain markdown even if styling is ignored.
- Prefer short bullets to long paragraphs.
- Keep file/path/line references concrete and visible.
- Do not use styling to hide unresolved questions, weak evidence, or missing success criteria.
- Do not convert research findings into recommendations unless the user asked for recommendations.

### Callout requirements

Every applicable document must include the required callouts below. A required callout may be active or explicitly waived. A waiver records that the question was considered and why it does not apply; absence is a defect. At a Glance is always active and never waived.

| Document type | Required callouts | Emphasis |
|---|---|---|
| Implementation plan | At a Glance; In / Out of Scope; Primary Risk; Guardrail active or waived; Open Question waiver | Verification steps belong in the plan body, not callouts. Final plans may not have unresolved open questions. |
| Codebase research memo | At a Glance; Open Question active or waived | Document current state, evidence, and inferences. Do not use Risk or Guardrail unless the user asked for recommendations. |
| Approach decision | At a Glance; Primary Risk; Open Question active or waived | State the chosen approach and confidence level: high, medium, or low. |
| Verification report | At a Glance; Primary Risk active or waived; Guardrail for blocking plan/implementation gaps | Lead with pass or fail. On fail, the risk callout is the single most critical issue. |
| Design document | At a Glance; In / Out of Scope; Guardrail active or waived; Open Question active or waived | Separate in-scope components from deferrals. Do not use implementation-plan language. |

Waiver labels should be specific: `Primary risk: none material.`, `Guardrail: none identified.`, or `Open question: none.`

### Style tokens

Use the active callout template with the label and colors from the options table. Replace all placeholders; do not emit bracketed placeholders in final documents.

```html
<div style="border-left: 4px solid [accent]; background: [background]; padding: 10px 12px; border-radius: 6px; margin: 12px 0;"><strong>[Label]:</strong> [content]</div>
```

| Callout | Label | Accent | Background |
|---|---|---|---|
| At a Glance | `At a Glance` | `rgba(148, 163, 184, 0.60)` | `rgba(148, 163, 184, 0.10)` |
| Guardrail | `Guardrail` | `rgba(251, 191, 36, 0.60)` | `rgba(251, 191, 36, 0.10)` |
| Primary Risk | `Primary risk` | `rgba(248, 113, 113, 0.60)` | `rgba(248, 113, 113, 0.10)` |
| Open Question | `Open question` | `rgba(167, 139, 250, 0.60)` | `rgba(167, 139, 250, 0.10)` |
| Waived | callout-specific, e.g. `Primary risk: none material.` | `rgba(100, 116, 139, 0.55)` | `rgba(100, 116, 139, 0.08)` |

Use this waived template when a required callout does not apply:

```html
<div style="border-left: 3px solid rgba(100, 116, 139, 0.55); background: rgba(100, 116, 139, 0.08); padding: 6px 10px; border-radius: 6px; margin: 8px 0; font-size: 0.9em; color: rgba(148, 163, 184, 0.85);"><strong>Primary risk: none material.</strong> [one-sentence rationale]</div>
```

Substitute the callout name (`Primary risk`, `Guardrail`, `Open question`, etc.) for each waived callout. The styling stays identical; only the label changes.

Use this scope table where In / Out of Scope is required:

```html
<table>
  <tr>
    <td style="background: rgba(34, 211, 238, 0.10); border-left: 4px solid rgba(34, 211, 238, 0.60); padding: 10px 12px; width: 50%; vertical-align: top;">
      <strong>In scope</strong><br />
      [what this document covers]
    </td>
    <td style="background: rgba(251, 146, 60, 0.10); border-left: 4px solid rgba(251, 146, 60, 0.60); padding: 10px 12px; width: 50%; vertical-align: top;">
      <strong>Out of scope</strong><br />
      [what this document does not cover]
    </td>
  </tr>
</table>
```

Use multi-line HTML only when a callout needs multiple paragraphs or a list. Keep the same outer style and avoid nested layout markup unless it materially improves readability.
