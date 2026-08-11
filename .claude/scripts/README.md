# Workflow Scripts

Tooling that supports the workflow commands. Each script is standalone and dependency-free.

| Script | Purpose |
|---|---|
| [`validate-brief.ts`](#brief-validator) | Check `brief.md` against the workflow invariants |
| [`migrate-brief.ts`](#brief-migration) | Upgrade old text-keyed briefs to `brief_version: 2` |
| [`summarize-briefs.ts`](#brief-summary) | Report on active work and promoted artifacts |
| [`sync-workflow.ts`](#workflow-sync) | Pull upstream `.claude/` updates into this repository |

## Runtime

> [!IMPORTANT]
> These scripts require Node `>=22.18.0`. They rely on Node's native TypeScript
> type stripping to run `.ts` files directly, with no build step.

On older versions the failure mode depends on whether type stripping is available at all:

| Node version | What happens |
|---|---|
| `>= 22.18` | Supported. Type stripping is on by default |
| `22.6 - 22.17` | Type stripping sits behind `--experimental-strip-types`. With that flag, the scripts exit `2` with a `requires Node >= 22.18.0` message. Without it, Node cannot load the file |
| `< 22.6` | No type stripping. Node cannot load the file |

When Node cannot load the file, the error is `TypeError: Unknown file extension ".ts"` or `ERR_UNKNOWN_FILE_EXTENSION`. That message means "upgrade Node," not a bug in the script.

The `PostToolUse` hook (`hooks/validate-brief-post-tool-use.cjs`) checks the Node version itself before spawning the validator. It is plain `.cjs`, so it runs on any Node version and reports the problem even when the validator could not have started.

---

## Brief Validator

`validate-brief.ts` checks `thoughts/shared/work/<slug>/brief.md` against the workflow invariants. It runs after every phase write, and errors block the phase from advancing.

### Usage

```bash
# validate the current state of a workspace
node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug>

# validate the preconditions for entering a specific phase
node .claude/scripts/validate-brief.ts thoughts/shared/work/<slug> 70-implement

# ask the router which phase should run next
node .claude/scripts/validate-brief.ts --next thoughts/shared/work/<slug>

# machine-readable output for tooling
node .claude/scripts/validate-brief.ts --format json thoughts/shared/work/<slug>

# print every invariant code the validator can emit
node .claude/scripts/validate-brief.ts --list-invariants

# recover a workspace left in an unrepairable state
node .claude/scripts/validate-brief.ts --restore thoughts/shared/work/<slug>
```

### Arguments

| Argument | Effect |
|---|---|
| `<workspace-path>` | Required, except with `--list-invariants` |
| `[before-phase]` | Optional second positional. Validates the preconditions for entering that phase. Rejected with `--next` and `--restore` |

### Flags

| Flag | Effect |
|---|---|
| `--next` | Report the next phase instead of validating a transition |
| `--format text\|json` | Output format, default `text`. `--json` is an alias for `--format json` |
| `--list-invariants` | Print the full invariant catalog. Takes no positional arguments |
| `--restore` | Overwrite `brief.md` with the validator-owned `.brief.last-valid.md` snapshot, discarding current state. Fails if no snapshot exists yet |
| `--help`, `-h` | Print usage. Note that usage goes to stderr and the process exits `2` |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Validation passed. Warnings may still be present |
| `1` | Validation completed and one or more errors were found |
| `2` | Usage error, parse failure, or validator runtime failure |

### JSON output

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

### Invariant catalog

Run `node .claude/scripts/validate-brief.ts --list-invariants` to print every invariant code that the validator can emit. Use `--format json` when another tool needs the list.

### Hook

Claude Code can run the validator after workflow workspace writes with a `PostToolUse` hook. This configuration belongs in a shared settings example or project documentation rather than `settings.local.json`.

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

The hook helper:

- Reads Claude Code's hook payload from stdin.
- Ignores writes outside `thoughts/shared/work/*/`.
- On failure, writes the validator JSON to stderr and exits `2`, so Claude Code can feed the violations back to the agent.

---

## Brief Migration

`migrate-brief.ts` upgrades old text-keyed briefs to `brief_version: 2`.

### Usage

```bash
# preview the rewrite
node .claude/scripts/migrate-brief.ts thoughts/shared/work/<slug>

# apply it
node .claude/scripts/migrate-brief.ts --write thoughts/shared/work/<slug>
```

### Flags

| Flag | Effect |
|---|---|
| `--write` | Apply the migration. Without it, the migrator reports what would change and writes nothing |

### Behavior

The migrator rewrites only `brief.md`. It:

- Adds IDs to Plan, Acceptance Criteria, Conflicts, and Unknowns.
- Rewrites `current_step`.
- Rewrites Progress `Step:` references.
- Rewrites Acceptance Criteria deferral Decisions.

It does not edit phase scratch files such as `60-prep.md`. Those must be updated manually if validation reports a stale `Selected step:` line.

---

## Brief Summary

`summarize-briefs.ts` summarizes active work briefs and promoted artifacts.

### Usage

```bash
# human-readable report
node .claude/scripts/summarize-briefs.ts

# include summaries for promoted briefs, not just slug and close date
node .claude/scripts/summarize-briefs.ts --verbose

# machine-readable output
node .claude/scripts/summarize-briefs.ts --json

# report on a repository other than the one containing this script
node .claude/scripts/summarize-briefs.ts --root /path/to/repo
```

### Flags

| Flag | Effect |
|---|---|
| `--verbose` | Include summaries for promoted briefs. By default they list only slug and close date |
| `--json` | Emit the report as JSON instead of formatted text |
| `--root PATH` | Repository root to scan. Defaults to the repository containing this script |

### Behavior

The report requires `thoughts/shared/work` and `thoughts/shared` beneath the selected root. It orders output as:

1. Shared artifacts, counted under `thoughts/shared/{briefs,research,discussions,plans}`.
2. The active-brief summary.
3. Open-brief details.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Summary completed with no reported problems |
| `1` | Summary completed, but one or more files could not be read or parsed |
| `2` | Usage error, or the selected root does not contain the required directories |

---

## Workflow Sync

`sync-workflow.ts` copies a selected upstream workflow directory into the current repository's `.claude` directory, so an installed copy of the workflow can be updated in place.

### Usage

```bash
# preview what a full update would change
node .claude/scripts/sync-workflow.ts --commands --scripts --dry-run

# update the commands directory from upstream main
node .claude/scripts/sync-workflow.ts --commands

# pin to a specific commit
node .claude/scripts/sync-workflow.ts --scripts --commit 7438941

# update another repository, staying convergent with upstream
node .claude/scripts/sync-workflow.ts --commands --scripts --root /path/to/repo --prune
```

### Flags

| Flag | Effect |
|---|---|
| `--commands`, `--scripts` | Which directories to update. At least one is required; pass both to update both |
| `--commit REF` | Upstream ref to sync from. Defaults to `main` |
| `--root PATH` | Repository to update. Defaults to the current working directory |
| `--prune` | Also delete downstream files that the upstream commit no longer ships. Off by default |
| `--dry-run` | Report what would be copied and pruned without writing anything |

### Behavior

By default the script overwrites matching files but leaves additional files already present in the destination untouched. `--prune` also removes downstream files, and any directories left empty, that upstream no longer ships, so the destination stays convergent with upstream.

> [!WARNING]
> `--prune` deletes files. Combine it with `--dry-run` to preview the deletions
> before the first pruning sync in a repository.

Ref resolution has two paths:

- Branches, tags, and full commit SHAs are fetched directly.
- If the upstream host rejects the ref, which is common for abbreviated SHAs, the script falls back to fetching `main` and resolving the ref locally. This succeeds only when the commit is reachable from `main`.

The upstream repository does not publish tags, so pinning currently means naming a branch or a commit SHA.

---

## Development

The scripts have no dependencies and no build step. Both commands run from the `.claude/scripts` directory.

```bash
# run the full test suite on Node's built-in runner
node --test "*.test.ts"

# type-check without emitting
npx --yes -p typescript@5.7.3 tsc --noEmit
```

`npm test` is equivalent to the first command; there is nothing to install beforehand.

CI runs both on every push to `main` and on every pull request, pinning TypeScript to the version above.
