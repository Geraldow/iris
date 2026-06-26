# Odoo View — XML Views & Inheritance

You are implementing Odoo XML views (form, list, kanban, search) and inheritance via xpath.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R4: New model needs ir.model.access.csv + menu/action/view
- R7: PEP8 + Odoo 18 — list (NOT tree), invisible inline (NOT attrs)

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```xml
<!-- Odoo 18: <list> NOT <tree> -->
<record id="view_my_model_list" model="ir.ui.view">
    <field name="name">my.model.list</field>
    <field name="model">my.model</field>
    <field name="arch" type="xml">
        <list string="My Records" sample="1">
            <field name="name"/>
            <field name="state" widget="badge"
                   decoration-success="state == 'done'"
                   decoration-info="state == 'draft'"/>
            <field name="amount_total" sum="Total"/>
        </list>
    </field>
</record>

<!-- Odoo 18: invisible="expr" inline (NOT attrs) -->
<record id="view_my_model_form" model="ir.ui.view">
    <field name="name">my.model.form</field>
    <field name="model">my.model</field>
    <field name="arch" type="xml">
        <form>
            <header>
                <button name="action_confirm" string="Confirm" type="object"
                        class="oe_highlight" invisible="state != 'draft'"/>
                <field name="state" widget="statusbar"
                       statusbar_visible="draft,confirmed,done"/>
            </header>
            <sheet>
                <group>
                    <field name="partner_id" options="{'no_create': True}"/>
                    <field name="amount_total" widget="monetary"
                           readonly="state != 'draft'"/>
                </group>
                <notebook>
                    <page string="Lines" name="lines">
                        <field name="line_ids">
                            <list editable="bottom">
                                <field name="product_id"/>
                                <field name="quantity"/>
                            </list>
                        </field>
                    </page>
                </notebook>
            </sheet>
            <chatter/>
        </form>
    </field>
</record>

<!-- Inheritance via xpath -->
<record id="view_partner_form_inherit_my_module" model="ir.ui.view">
    <field name="name">res.partner.form.inherit.my.module</field>
    <field name="model">res.partner</field>
    <field name="inherit_id" ref="base.view_partner_form"/>
    <field name="arch" type="xml">
        <xpath expr="//field[@name='vat']" position="after">
            <field name="x_custom_id"/>
        </xpath>
    </field>
</record>

<!-- Search view -->
<record id="view_my_model_search" model="ir.ui.view">
    <field name="name">my.model.search</field>
    <field name="model">my.model</field>
    <field name="arch" type="xml">
        <search>
            <field name="name"/>
            <field name="partner_id"/>
            <filter name="draft" string="Draft" domain="[('state','=','draft')]"/>
            <separator/>
            <filter name="group_state" string="State" context="{'group_by':'state'}"/>
        </search>
    </field>
</record>
```

## Data Journey (Front → Back)

```
User Action (XML View)
  ↓ widget="badge" / button name="action_confirm"
RPC call → /web/dataset/call_kw
  ↓ method = create / write / action_confirm
ORM (ir.ui.view → my.model)
  ↓ @api.constrains, @api.onchange, @api.depends
PostgreSQL (write row, recompute stored)
  ↓ return dict / ir.actions
View refresh
```

## Odoo 18 Breaking Changes
- `<tree>` → `<list>` everywhere
- `attrs="{'invisible': [...]}"` → `invisible="expr"` inline
- `states="draft,confirmed"` → `invisible="state not in ('draft','confirmed')"`
- `<chatter/>` shortcut (no need for `<div class="oe_chatter">`)

## Checklist before responding
- [ ] __manifest__.py version confirmed (Odoo 18 → list, not tree)
- [ ] xpath expressions use stable references (not position by index)
- [ ] All view IDs follow convention: `view_<model>_<type>`
- [ ] Inherited view ID follows: `view_<model>_<type>_inherit_<module>`
- [ ] Field `invisible/readonly/required` use inline syntax
- [ ] No deprecated `attrs=` or `states=` attributes
- [ ] Window action + menuitem + access rights declared
