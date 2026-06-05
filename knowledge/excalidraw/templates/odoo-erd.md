# Template: Odoo ERD (Entity-Relationship Diagram)

Use this template when generating ERD diagrams for Odoo modules.
Always read `references/alesco-palette.md` for colors before generating JSON.

---

## Purpose

Show the data model of an Odoo module: models, fields, and relationships
(`Many2one`, `One2many`, `Many2many`, computed fields, stored vs non-stored).

The diagram must ARGUE the architecture — show why fields are related,
not just list them.

---

## Layout Convention

```
┌─────────────────────┐          ┌─────────────────────┐
│  res.partner        │ ────────>│  sale.order         │
│  ─────────────────  │  M2o     │  ─────────────────  │
│  name: Char         │          │  partner_id: M2o    │
│  email: Char        │          │  state: Selection   │
│  company_id: M2o    │          │  amount_total: Float│
└─────────────────────┘          │  ○ line_ids: O2m    │
                                 └─────────────────────┘
                                          │ O2m
                                          ▼
                                 ┌─────────────────────┐
                                 │  sale.order.line    │
                                 │  ─────────────────  │
                                 │  order_id: M2o      │
                                 │  product_id: M2o    │
                                 │  qty: Float         │
                                 │  ◆ price_subtotal   │
                                 └─────────────────────┘
```

Legend symbols (embed as free-floating text in diagram):
- `◆` = computed field (store=True) — affects DB schema
- `○` = computed field (store=False) — no DB column
- `★` = required field
- `⊗` = deprecated / scheduled for removal

---

## Shape Semantics

| Element | Shape | Color (from alesco-palette.md) |
|---------|-------|-------------------------------|
| Model (abstract / mixin) | Rectangle, dashed stroke | Secondary fill (#7FA8D8) |
| Model (concrete, standalone) | Rectangle, solid stroke | Primary fill (#5B87C5) |
| Model (transient / wizard) | Rectangle, dotted stroke | Tertiary fill (#A8C4E8) |
| Field row (regular) | Free-floating text | Body/Detail color (#4A5568) |
| Field row (computed) | Free-floating text | Odoo label color (#875A7B) |
| Field row (required) | Free-floating text, bold | Title color (#1E3A5F) |

---

## Arrow Semantics

| Relationship | Arrow Style | Stroke Color |
|---|---|---|
| Many2one (M2o) | Solid, single arrowhead → | #1E3A5F (navy) |
| One2many (O2m) | Solid, crow-foot at source | #1E3A5F (navy) |
| Many2many (M2m) | Solid, crow-foot both ends | #875A7B (Odoo purple) |
| Inheritance `_inherit` | Dashed, single arrowhead → | #E8732A (orange) |
| Delegation `_inherits` | Dotted, single arrowhead → | #F39C12 (amber) |

Use `strokeStyle: "dashed"` for inheritance, `strokeStyle: "dotted"` for delegation.

---

## Required Sections in Every Odoo ERD

1. **Title block** (top-left): module name, Odoo version, edition (Community/Enterprise), date
2. **Legend** (bottom-right): all symbols used (◆, ○, ★, arrow types)
3. **Model cards**: one rectangle per model, with `_name` as header, fields listed below
4. **Relationship arrows**: bound to the correct field row inside each model card
5. **Computed field notes**: annotate `store=True/False`, `compute='_compute_...'`

---

## Evidence Artifacts to Include

For technical ERDs (implementation diagrams):
- Python field definition snippet for non-obvious computed fields
- `_sql_constraints` if the model has unique constraints
- `_order` value if non-default

---

## Design Checklist (Odoo ERD)

- [ ] `_name` visible as model header (not just Python class name)
- [ ] `_inherit` vs `_name` distinction clear (extension vs new model)
- [ ] All M2o arrows point from child → parent (arrow at parent end)
- [ ] O2m inverses labeled on both ends
- [ ] M2m junction table shown if custom (not auto-generated)
- [ ] `store=True` computed fields visually distinct from regular fields
- [ ] `ir.model.access.csv` groups referenced in a side note (R4 requirement)
- [ ] Render-validate loop completed (PNG reviewed)

---

## JSON Starter Skeleton

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "type": "text",
      "id": "title_text",
      "x": 40, "y": 20,
      "width": 400, "height": 30,
      "text": "ERD — {module_name} — Odoo {version}",
      "originalText": "ERD — {module_name} — Odoo {version}",
      "fontSize": 24,
      "fontFamily": 3,
      "textAlign": "left",
      "verticalAlign": "top",
      "strokeColor": "#1E3A5F",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "angle": 0,
      "seed": 10001,
      "version": 1,
      "versionNonce": 10002,
      "isDeleted": false,
      "groupIds": [],
      "boundElements": null,
      "link": null,
      "locked": false,
      "containerId": null,
      "lineHeight": 1.25
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": 20
  },
  "files": {}
}
```

Replace `{module_name}` and `{version}` with actual values from `__manifest__.py`.
