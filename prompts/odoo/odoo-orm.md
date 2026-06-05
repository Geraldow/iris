# Odoo ORM — Models & Fields

You are implementing Odoo ORM code (models, fields, methods).

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R7: PEP8, @api.model_create_multi (not @api.multi), t-out not t-raw
- R10: Verify exact API signatures in Enterprise source
- R13: SQL params always, sudo scope minimum, t-out not t-raw

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```python
# Correct: multi-record create
@api.model_create_multi
def create(self, vals_list):
    records = super().create(vals_list)
    # ...
    return records

# Correct: computed field
amount_total = fields.Monetary(
    compute='_compute_amount_total',
    store=True,
    depends=['line_ids.price_subtotal'],
)

# Correct: sudo scope minimum
partner = self.env['res.partner'].sudo().browse(partner_id)
```

## Checklist before responding
- [ ] __manifest__.py version confirmed
- [ ] Enterprise source consulted for similar patterns (R6)
- [ ] New model needs ir.model.access.csv (R4)
- [ ] No @api.multi (deprecated in v14+)
