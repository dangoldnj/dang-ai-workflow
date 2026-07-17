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
node .claude/scripts/migrate-brief.ts --write thoughts/shared/work/<slug>
```

`--json` is accepted as an alias for `--format json`.

## Validator Exit Codes

- `0`: validation passed. Warnings may still be present.
- `1`: validation completed and one or more errors were found.
- `2`: usage error, parse failure, or validator runtime failure.

## Brief Summary

Summarize active work briefs and promoted artifacts:

```bash
node .claude/scripts/summarize-briefs.ts
node .claude/scripts/summarize-briefs.ts --json
node .claude/scripts/summarize-briefs.ts --verbose
```

The report requires `thoughts/shared/work` and `thoughts/shared` beneath the
selected root. It summarizes shared artifacts first, then puts the active-brief
summary and open-brief details at the end. Promoted briefs list only their slug
and close date by default; `--verbose` includes their summaries. Shared
artifacts are counted under `thoughts/shared/{briefs,research,discussions,plans}`.

## Brief Summary Exit Codes

- `0`: summary completed with no reported problems.
- `1`: summary completed, but one or more files could not be read or parsed.
- `2`: usage error or the selected root does not contain the required directories.

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

Claude Code can run the validator after workflow workspace writes with a `PostToolUse` hook. Keep this in a shared settings example or project documentation, not `settings.local.json`.

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

The hook helper reads Claude Code's hook payload from stdin and ignores writes outside `thoughts/shared/work/*/`. If validation fails, it writes the validator JSON to stderr and exits 2 so Claude Code can feed the violations back to the agent.

## Invariant Catalog

Run `node .claude/scripts/validate-brief.ts --list-invariants` to print every invariant code that the validator can emit. Use `--format json` when another tool needs the list.

## Brief Migration

`migrate-brief.ts` upgrades old text-keyed briefs to `brief_version: 2`.

```bash
node .claude/scripts/migrate-brief.ts thoughts/shared/work/<slug>
node .claude/scripts/migrate-brief.ts --write thoughts/shared/work/<slug>
```

The migrator rewrites only `brief.md`. It adds IDs to Plan, Acceptance Criteria, Conflicts, and Unknowns; rewrites `current_step`; rewrites Progress `Step:` references; and rewrites Acceptance Criteria deferral Decisions. It does not edit phase scratch files such as `60-prep.md`; update those manually if validation reports a stale `Selected step:` line.
