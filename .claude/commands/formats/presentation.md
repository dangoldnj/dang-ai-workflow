## Document Presentation

Final planning, research, and design documents must be easy to scan in a dark-themed markdown UI. The shape of the document carries information; the styling is a vocabulary that surfaces that shape.

This guidance applies to:

- Codebase research memos produced by `.claude/commands/20-research.md`
- Approach decisions produced by `.claude/commands/30-discuss.md`
- Implementation plans produced by `.claude/commands/50-plan.md`
- Verification reports produced by `.claude/commands/80-verify.md`
- Design documents stored in `thoughts/shared/design/`

### Required callouts

Every applicable document must include each of these callouts (or an explicit waiver). A waiver uses the Waived Callout pattern in the styling reference; it states that the callout was considered and why it does not apply. Absence is a defect; explicit waiver is not.

- **At a Glance** required at the top of every document. One to two sentences. Never waived.
- **In / Out of Scope** required for implementation plans and design documents. Optional but encouraged elsewhere when scope is non-obvious.
- **Primary Risk** required for plans, approach decisions, and verification reports. Waive with "Primary risk: none material" plus rationale if no significant risk exists.
- **Guardrail** required for design documents and implementation plans wherever a non-obvious failure mode exists. Waive with "Guardrail: none identified" plus a sentence on what was considered.
- **Open Question** required wherever unresolved decisions remain. Waive with "Open question: none" when none remain. Final implementation plans may not waive this with open questions outstanding; they must be resolved before the plan is finalized.

The waiver pattern matches the acceptance criteria deferral pattern: the document records that the question was considered, not just that it was omitted.

### Document-specific emphasis

Use the same callout vocabulary across document types. Emphasize different content.

#### Implementation Plans

Lead with At a Glance. Use the In/Out of Scope table to prevent creep. Risk callout near the end. Guardrails where migration concerns or implementation traps exist. Open questions must be resolved before finalization. Verification steps belong in the plan body, not in callouts.

#### Codebase Research Memos

Lead with At a Glance summarizing the research question and the headline finding. Use Open Question callouts for investigation gaps (framed as "what evidence is missing," not "what to build"). Do not use Risk or Guardrail callouts unless the user explicitly asked for recommendations. Research memos document current state, not next actions.

#### Approach Decisions

Lead with At a Glance stating the chosen approach and confidence level (high / medium / low). Use Risk callouts for the option risks considered. Use Open Question callouts for decisions deferred to the plan phase.

#### Verification Reports

Lead with pass or fail immediately, in the At a Glance card. On fail, the Risk callout is the single most critical issue. Guardrail callouts mark gaps between plan and implementation that block progression. Recommended next action is in the body.

#### Design Documents

Lead with At a Glance summarizing what the document covers and what it defers. Use the In/Out of Scope table to separate in-scope components from explicitly deferred ones. Guardrail callouts mark implementation traps that are easy to get wrong (e.g. "client state must not drive lock behavior"). Open Question callouts mark unresolved decisions that affect implementation. Do not use plan language (steps, commands, verification) in design documents.

### Default visual structure

Most final documents include:

1. At a Glance card at the top
2. In/Out of Scope where scope is non-trivial
3. The required callouts above, applied to the document type
4. Short bullets in place of long paragraphs wherever possible
5. Clear section breaks; no walls of prose

### Constraints

Presentation styling must never:

- replace technical specificity
- hide unresolved questions
- weaken file/path/line references
- substitute for concrete success criteria
- convert research findings into recommendations
- make the document harder to copy, edit, or diff

The document must remain fully actionable as plain markdown even if inline styling is ignored.

### Styling reference

Inline HTML/CSS is supported. Use translucent dark-theme-friendly styling. Each callout has a distinct hue so a reader can identify the callout type at a glance. Waived callouts use a muted neutral hue and a compact single-line shape; an active callout and its waived form must never look the same.

Color assignments:

| Callout | Hue | RGB |
|---|---|---|
| At a Glance | slate | `148, 163, 184` |
| In Scope | cyan | `34, 211, 238` |
| Out of Scope | orange | `251, 146, 60` |
| Guardrail | amber | `251, 191, 36` |
| Risk | red | `248, 113, 113` |
| Open Question | violet | `167, 139, 250` |
| Waived (any) | muted slate | `100, 116, 139` |

Opacity conventions (apply to whichever hue):

- Backgrounds: `rgba(..., 0.08-0.12)`
- Borders: `rgba(..., 0.24-0.30)`
- Accent borders: `rgba(..., 0.50-0.60)`

#### At A Glance Card

```html
<div style="border: 1px solid rgba(148, 163, 184, 0.28); background: rgba(148, 163, 184, 0.10); padding: 16px; border-radius: 10px; margin: 16px 0;">
  <strong style="font-size: 16px;">At a Glance</strong>
  <div style="margin-top: 8px;">
    [1-2 sentence summary]
  </div>
</div>
```

#### Guardrail Callout

```html
<div style="border-left: 4px solid rgba(251, 191, 36, 0.55); background: rgba(251, 191, 36, 0.10); padding: 12px 14px; border-radius: 8px; margin: 12px 0;">
  <strong>Guardrail:</strong> [short warning]
</div>
```

#### Risk Callout

```html
<div style="border: 1px solid rgba(248, 113, 113, 0.28); background: rgba(248, 113, 113, 0.10); padding: 14px; border-radius: 10px; margin: 16px 0;">
  <strong>Primary risk</strong>
  <div style="margin-top: 8px;">
    [main thing to avoid]
  </div>
</div>
```

#### Open Question Callout

```html
<div style="border: 1px solid rgba(167, 139, 250, 0.28); background: rgba(167, 139, 250, 0.10); padding: 14px; border-radius: 10px; margin: 16px 0;">
  <strong>Open question</strong>
  <div style="margin-top: 8px;">
    [specific unanswered question and what evidence is missing]
  </div>
</div>
```

#### In Scope / Out Of Scope Table

```html
<table>
  <tr>
    <td style="background: rgba(34, 211, 238, 0.10); border: 1px solid rgba(34, 211, 238, 0.28); padding: 12px; border-radius: 8px; width: 50%; vertical-align: top;">
      <strong>In scope</strong><br />
      [what this document covers]
    </td>
    <td style="background: rgba(251, 146, 60, 0.10); border: 1px solid rgba(251, 146, 60, 0.28); padding: 12px; border-radius: 8px; width: 50%; vertical-align: top;">
      <strong>Out of scope</strong><br />
      [what this document does not cover]
    </td>
  </tr>
</table>
```

#### Waived Callout

Use this compact one-liner whenever a required callout does not apply. The label names the waived callout type; the rationale follows the colon.

```html
<div style="border-left: 3px solid rgba(100, 116, 139, 0.50); background: rgba(100, 116, 139, 0.08); padding: 6px 12px; border-radius: 6px; margin: 8px 0; font-size: 0.9em; color: rgba(148, 163, 184, 0.85);">
  <strong>Primary risk: none material.</strong> [one-sentence rationale]
</div>
```

Substitute the callout name (`Primary risk`, `Guardrail`, `Open question`, etc.) for each waived callout. The styling stays identical; only the label changes.
