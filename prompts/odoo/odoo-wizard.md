# Odoo Wizard — TransientModel & Action Flow

You are implementing an Odoo wizard (TransientModel) with form view and action.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R4: Wizard needs ir.model.access.csv entry for the TransientModel
- R7: Odoo 18 — invisible/readonly inline, list not tree

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```python
# models/my_wizard.py
from odoo import api, fields, models, _
from odoo.exceptions import UserError


class MyWizard(models.TransientModel):
    _name = 'my.wizard'
    _description = 'My Wizard'
    _transient_max_hours = 1.0  # auto-vacuum after 1 hour

    partner_id = fields.Many2one('res.partner', required=True)
    date = fields.Date(default=fields.Date.context_today, required=True)
    note = fields.Text()
    line_ids = fields.One2many('my.wizard.line', 'wizard_id')

    @api.onchange('partner_id')
    def _onchange_partner_id(self):
        if self.partner_id:
            self.note = self.partner_id.comment

    def action_confirm(self):
        self.ensure_one()
        if not self.line_ids:
            raise UserError(_("At least one line is required."))
        # Apply to real (persistent) model
        target = self.env['my.target.model'].create({
            'partner_id': self.partner_id.id,
            'date': self.date,
            'line_ids': [(0, 0, {
                'product_id': line.product_id.id,
                'quantity': line.quantity,
            }) for line in self.line_ids],
        })
        # Return action — open the created record
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'my.target.model',
            'res_id': target.id,
            'view_mode': 'form',
            'target': 'current',
        }


class MyWizardLine(models.TransientModel):
    _name = 'my.wizard.line'
    _description = 'My Wizard Line'

    wizard_id = fields.Many2one('my.wizard', required=True, ondelete='cascade')
    product_id = fields.Many2one('product.product', required=True)
    quantity = fields.Float(default=1.0)
```

```xml
<!-- views/my_wizard_views.xml -->
<odoo>
    <record id="view_my_wizard_form" model="ir.ui.view">
        <field name="name">my.wizard.form</field>
        <field name="model">my.wizard</field>
        <field name="arch" type="xml">
            <form string="My Wizard">
                <sheet>
                    <group>
                        <field name="partner_id"/>
                        <field name="date"/>
                        <field name="note"/>
                    </group>
                    <field name="line_ids">
                        <list editable="bottom">
                            <field name="product_id"/>
                            <field name="quantity"/>
                        </list>
                    </field>
                </sheet>
                <footer>
                    <button name="action_confirm" string="Confirm"
                            type="object" class="btn-primary"/>
                    <button string="Cancel" class="btn-secondary" special="cancel"/>
                </footer>
            </form>
        </field>
    </record>

    <record id="action_my_wizard" model="ir.actions.act_window">
        <field name="name">My Wizard</field>
        <field name="res_model">my.wizard</field>
        <field name="view_mode">form</field>
        <field name="target">new</field>  <!-- modal -->
        <field name="binding_model_id" ref="model_my_target_model"/>
        <field name="binding_view_types">list,form</field>
    </record>
</odoo>
```

```csv
# security/ir.model.access.csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_my_wizard,my.wizard,model_my_wizard,base.group_user,1,1,1,1
access_my_wizard_line,my.wizard.line,model_my_wizard_line,base.group_user,1,1,1,1
```

## Data Journey (Front → Back)

```
User clicks button (form view of target model)
  ↓ ir.actions.act_window (binding_model_id) with target='new'
Modal opens with TransientModel record
  ↓ User fills fields, on save → temp row in DB (will vacuum)
User clicks "Confirm" → button name="action_confirm" type="object"
  ↓ RPC → /web/dataset/call_kw → wizard.action_confirm()
ORM writes/creates on persistent model (my.target.model)
  ↓ Returns ir.actions dict
Client renders next action (open created record / close modal)
```

## Key Concepts
- **TransientModel** rows auto-vacuum (default 12h, override via `_transient_max_hours`)
- **target='new'** in act_window → modal popup
- **special="cancel"** button closes wizard without saving
- **binding_model_id** → wizard appears as Action menu on target model views
- Always `ensure_one()` in action methods (wizard is one record per session)

## Checklist before responding
- [ ] __manifest__.py version confirmed
- [ ] TransientModel (not Model) for ephemeral data
- [ ] ir.model.access.csv entry for wizard + lines
- [ ] action_confirm returns an ir.actions dict (or close)
- [ ] target='new' for modal behavior
- [ ] ensure_one() in action methods
- [ ] `_transient_max_hours` if non-default vacuum needed
- [ ] No business logic stored in TransientModel — delegate to real model
