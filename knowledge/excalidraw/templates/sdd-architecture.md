# Template: SDD Architecture Diagram

Use this template for the `sdd-design` phase architecture diagram in iris.
Always read `references/alesco-palette.md` for colors before generating JSON.

---

## Purpose

Visualize the technical architecture proposed in an SDD design artifact:
file structure, component relationships, data flow, and integration points.

One diagram per SDD change. Generated automatically at the end of `sdd-design`.

---

## Layout Convention (Top-Down)

```
┌────────────────────────────────────────────────────┐
│  Change: {change-name}  │  Adapter: {primary}      │
│  Type: {task-type}      │  Branch: {branch}         │
└────────────────────────────────────────────────────┘
              │
     ┌────────┴────────┐
     │                 │
  NEW FILES        MODIFIED FILES
  ─────────        ──────────────
  src/foo.ts       src/bar.ts
  src/baz.ts       config.ts

              │
     ┌────────┴────────┐
     │                 │
  READS              WRITES
  ──────             ──────
  knowledge/         docs/sdd/
  prompts/
```

---

## Shape Semantics

| Element | Shape | Color |
|---------|-------|-------|
| New file | Rectangle, solid thick | Success fill (#A8C4E8), stroke #27AE60 |
| Modified file | Rectangle, dashed | Primary fill (#5B87C5), stroke #1E3A5F |
| Deleted file | Rectangle, strikethrough label | Error fill (#FECACA), stroke #E74C3C |
| Module/package | Frame (grouping container) | Transparent, dashed border #1E3A5F |
| External system | Ellipse | Tertiary fill (#A8C4E8) |
| Data/config flow | Arrow → | Alesco orange (#E8732A) |
| Import/dependency | Dashed arrow → | Navy (#1E3A5F) |
| Knowledge file | Rectangle, dark | Evidence artifact style (#1A252F fill) |

---

## Required Sections

1. **Header block**: change name, task type, primary adapter, branch
2. **File impact zone**: new vs modified vs deleted, grouped by directory
3. **Data flow**: what reads what, what writes where
4. **Integration points**: external MCP tools, engram, codegraph, adapters
5. **Risk callouts**: free-floating orange text for high-risk areas

---

## Evidence Artifacts to Include

- Key TypeScript interface/type definitions (the contract, not the implementation)
- Critical function signatures: `export async function foo(bar: Bar): Promise<Baz>`
- Engram topic keys used: `odoo/dev/{module}/{feature}`

---

## Design Checklist (SDD Architecture)

- [ ] All new files visible with their directory path
- [ ] All modified files distinguished from new (dashed vs solid)
- [ ] Data flow arrows show direction (reads vs writes)
- [ ] Primary adapter visible with model name
- [ ] R-referenced rules cited if risk is present (e.g., "R6: search Enterprise first")
- [ ] Render-validate loop completed (PNG reviewed)
