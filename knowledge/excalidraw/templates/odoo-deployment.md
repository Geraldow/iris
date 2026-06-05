# Template: Odoo Deployment Diagram (Odoo.sh)

Use this template for deployment and infrastructure diagrams for Alesco Perú projects.
Always read `references/alesco-palette.md` for colors before generating JSON.
Platform: Odoo.sh (not self-hosted, not Docker in prod).

---

## Purpose

Show the deployment topology: branches, environments, CI/CD triggers,
and how code flows from development to production on Odoo.sh.

---

## Layout Convention (Left-to-Right, branch flow)

```
Developer (local)          Odoo.sh Platform
─────────────────────────────────────────────────────
  ┌──────────┐   push     ┌────────────────────────┐
  │  local   │ ────────>  │  st_produccion         │
  │  dev env │            │  (staging branch)      │
  │  Docker  │            │  auto-rebuild on push  │
  └──────────┘            └────────────┬───────────┘
                                       │ validated ✓
                                       │ manual merge
                                       ▼
                           ┌────────────────────────┐
                           │  produccion            │
                           │  (production branch)   │
                           │  live database         │
                           └────────────────────────┘
```

---

## Odoo.sh Branch Naming Convention (Alesco)

| Branch | Environment | Action |
|--------|-------------|--------|
| `st_produccion` | Staging | Auto-rebuild, test DB copy |
| `st_{project}` | Staging (project-specific) | Auto-rebuild |
| `produccion` | Production | Manual merge only, NEVER direct push |
| `db_{project}` | DB branch | RESTRICTED — no code changes |

Show these as distinct zones in the diagram with color coding:
- Staging: Warning fill (#FDE8A8), stroke #F39C12
- Production: Error fill (#FECACA), stroke #E74C3C (restricted)
- Local/Dev: Primary fill (#5B87C5)

---

## Shape Semantics

| Element | Shape | Color |
|---------|-------|-------|
| Developer machine | Rectangle | Primary fill (#5B87C5) |
| Odoo.sh staging branch | Rectangle | Warning fill (#FDE8A8), stroke #F39C12 |
| Odoo.sh production branch | Rectangle | Error fill (#FECACA), stroke #E74C3C |
| Git push (allowed) | Arrow → solid | Success stroke (#27AE60) |
| Git push (blocked) | Arrow → dashed+red | Error stroke (#E74C3C) |
| Database (PostgreSQL) | Cylinder (ellipse+rectangle) | Tertiary fill (#A8C4E8) |
| Auto-rebuild trigger | Diamond | Decision fill (#FEF3C7) |
| Manual approval gate | Diamond with lock icon text | Accent (#F5A06A), stroke #E8732A |

---

## Alesco Branch Safety (R2) — Must Be Visible in Diagram

Show the governance layer explicitly:
- Green zone: `st_*` branches — auto push allowed
- Red zone: `produccion`, `db_*` — requires "sí, autorizo" confirmation
- Forbidden: `git push --force`, `git rebase`, `git reset` — show as ⊗ symbols

---

## Required Sections

1. **Developer zone** (left): local Docker + Claude Code + iris
2. **Git push flow** (center): which branches allow auto-push vs require approval
3. **Odoo.sh zone** (right): staging + production + database copy behavior
4. **CI/CD annotations**: what triggers rebuild (push? module update? config param?)
5. **R2 governance callout**: branch safety rules as a sidebar legend

---

## Evidence Artifacts to Include

- Actual branch names for the project (e.g., `st_conservial`, `produccion`)
- `git push origin st_conservial` command as code snippet
- Odoo.sh rebuild webhook URL pattern (if known)
- Module list updated with `-u {module}` on rebuild

---

## Design Checklist (Odoo Deployment)

- [ ] Staging and production visually distinct (color + label)
- [ ] Manual approval gate visible before production push
- [ ] `git push --force` shown as blocked (⊗)
- [ ] Database copy behavior annotated (staging gets copy of prod DB on rebuild)
- [ ] Odoo.sh platform shown as external boundary (not local)
- [ ] R2 branch safety rules visible in diagram
- [ ] Render-validate loop completed (PNG reviewed)
