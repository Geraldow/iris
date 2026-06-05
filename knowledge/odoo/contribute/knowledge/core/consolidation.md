# odoo-contribute Consolidation

## Source of Truth

Author all durable changes in:

```text
~/.claude/skills/odoo-contribute
```

Other agent folders are mirrors. Do not treat `~/.codex/skills/odoo-contribute`
or other destinations as authoritative authoring locations.

## Runtime Skill Root

At runtime, scripts and plugins are relative to the directory that contains the
active `SKILL.md`.

Examples:

```text
scripts/detect-environment.ps1
scripts/branch-safety-check.ps1
plugins/odoo-commit/SKILL.md
```

Claude resolves those paths under `~/.claude/skills/odoo-contribute`; Codex
resolves them under `~/.codex/skills/odoo-contribute` after sync.

## Sync Command

Synchronize all agent skills from the canonical source:

```powershell
pwsh -NoProfile -File ~/.config/ai-agents/sync-agents.ps1
```

That script mirrors `~/.claude/skills` into Codex, Cursor, Kilo, Qwen, and
Windsurf destinations.

## Verification Command

Verify Codex after sync:

```powershell
pwsh ~/.claude/skills/odoo-contribute/scripts/verify-consolidation.ps1 `
  -SourcePath ~/.claude/skills/odoo-contribute `
  -DestinationPaths ~/.codex/skills/odoo-contribute
```

Expected result: `PASS` and exit code `0`.

## Drift Policy

- Missing files, extra files, or changed hashes in a mirror mean drift.
- Repair drift by updating the canonical source and running `sync-agents.ps1`.
- Do not patch mirror folders directly unless the change is temporary debugging
  and will be discarded by the next sync.

## Rollback

Rollback is file-based:

1. Revert the source change under `~/.claude/skills/odoo-contribute`.
2. Run `sync-agents.ps1`.
3. Run `verify-consolidation.ps1` to confirm mirrors match the restored source.

## Maintenance Checklist

- Edit only the canonical source tree.
- Preserve child plugin behavior unless the change explicitly targets it.
- Run PowerShell AST checks for changed `.ps1` files.
- Run the consolidation verifier after sync.
- Save SDD apply/verify progress to Engram under the active project.
