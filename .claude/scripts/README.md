# Brief Validator

`validate-brief.ts` checks `thoughts/shared/work/<slug>/brief.md` against the workflow invariants.

## Runtime

Use Node `>=22.18.0`. The scripts rely on Node's native TypeScript type stripping for `.ts` files.

## Usage

```bash
node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug>
node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug> 70-implement
node .claude/scripts/validate-brief.ts --format json thoughts/shared/work/<slug>
node .claude/scripts/validate-brief.ts --next thoughts/shared/work/<slug>
node .claude/scripts/validate-brief.ts --list-invariants
```

`--json` is accepted as an alias for `--format json`.

## Exit Codes

- `0`: validation passed. Warnings may still be present.
- `1`: validation completed and one or more errors were found.
- `2`: usage error, parse failure, or validator runtime failure.

## JSON Output

`--format json` emits:

```json
{
  "ok": false,
  "violations": [
    {
      "severity": "error",
      "invariant": "goal-missing",
      "message": "Goal must not be empty",
      "location": "Goal"
    }
  ]
}
```

With `--next`, the output also includes `next`:

```json
{
  "ok": true,
  "violations": [],
  "next": {
    "kind": "phase",
    "phase": "60-prep",
    "reason": "Plan has unchecked items and no active current_step"
  }
}
```

If validation has errors, `--next` returns a stop action with reason `validation-errors`.

## Hook

Claude Code can run the validator after brief writes with a `PostToolUse` hook. Keep this in a shared settings example or project documentation, not `settings.local.json`.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/scripts/hooks/validate-brief-post-tool-use.cjs"
          }
        ]
      }
    ]
  }
}
```

The hook helper reads Claude Code's hook payload from stdin and ignores writes outside `thoughts/shared/work/*/brief.md`.

## Invariant Catalog

Run `node .claude/scripts/validate-brief.ts --list-invariants` to print every invariant code that the validator can emit. Use `--format json` when another tool needs the list.
