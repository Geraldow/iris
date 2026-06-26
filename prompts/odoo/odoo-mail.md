# Odoo Mail — Chatter, Activities, Templates

You are implementing Odoo mail.thread / mail.activity / templates / chatter.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R4: New model with chatter needs ir.model.access.csv
- R7: Odoo 18 — `<chatter/>` shortcut, t-out not t-raw in templates

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```python
# models/my_model.py
from odoo import api, fields, models, _


class MyModel(models.Model):
    _name = 'my.model'
    _description = 'My Model'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'

    name = fields.Char(required=True, tracking=True)  # tracking=True → chatter log
    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('done', 'Done'),
    ], default='draft', tracking=True)
    partner_id = fields.Many2one('res.partner', tracking=True)
    user_id = fields.Many2one('res.users', tracking=True,
                              default=lambda self: self.env.user)

    def action_confirm(self):
        for record in self:
            record.state = 'confirmed'
            record.message_post(
                body=_("Confirmed by %s") % self.env.user.name,
                subject=_("Confirmation"),
                message_type='comment',
                subtype_xmlid='mail.mt_comment',
            )

    def _schedule_followup(self):
        """Create activity for follow-up."""
        self.activity_schedule(
            'mail.mail_activity_data_todo',
            summary=_("Follow up with customer"),
            note=_("Check status with %s") % self.partner_id.name,
            date_deadline=fields.Date.today() + relativedelta(days=3),
            user_id=self.user_id.id,
        )

    def action_send_email(self):
        template = self.env.ref('my_module.email_template_my_model')
        for record in self:
            template.send_mail(record.id, force_send=True)
```

```xml
<!-- views/my_model_views.xml -->
<record id="view_my_model_form" model="ir.ui.view">
    <field name="name">my.model.form</field>
    <field name="model">my.model</field>
    <field name="arch" type="xml">
        <form>
            <sheet>
                <group>
                    <field name="name"/>
                    <field name="partner_id"/>
                    <field name="state"/>
                </group>
            </sheet>
            <!-- Odoo 18 shortcut — replaces the old div.oe_chatter block -->
            <chatter/>
        </form>
    </field>
</record>
```

```xml
<!-- data/mail_template.xml -->
<odoo>
    <record id="email_template_my_model" model="mail.template">
        <field name="name">My Model: Confirmation</field>
        <field name="model_id" ref="model_my_model"/>
        <field name="subject">Order {{ object.name }} confirmed</field>
        <field name="email_from">{{ object.user_id.email_formatted }}</field>
        <field name="email_to">{{ object.partner_id.email_formatted }}</field>
        <field name="body_html" type="html">
            <div>
                <p>Hello <t t-out="object.partner_id.name"/>,</p>
                <p>Your order <t t-out="object.name"/> has been confirmed.</p>
                <p>Best regards,<br/><t t-out="object.user_id.name"/></p>
            </div>
        </field>
        <field name="lang">{{ object.partner_id.lang }}</field>
        <field name="auto_delete" eval="True"/>
    </record>
</odoo>
```

## Key Mixins
| Mixin | Purpose |
|---|---|
| `mail.thread` | Chatter, message_post, followers, tracking |
| `mail.activity.mixin` | Activities (kanban dot, calendar) |
| `mail.alias.mixin` | Incoming email → record |
| `mail.composer.mixin` | Internal composer reuse |
| `portal.mixin` | Portal access + access_url |

## Tracking
- `tracking=True` on a field → automatic chatter log on change
- `tracking=N` (integer) → custom sequence in tracking log
- Only Char, Float, Integer, Monetary, Date, Datetime, Selection, Many2one, Boolean

## message_post Parameters
```python
record.message_post(
    body="Plain or HTML body",
    subject="Subject",
    message_type='comment',      # 'comment' | 'notification' | 'email'
    subtype_xmlid='mail.mt_comment',  # comment vs notification subtype
    partner_ids=[partner.id],    # add followers / notify
    attachment_ids=[(4, attach_id)],
)
```

## Activities
```python
record.activity_schedule(
    'mail.mail_activity_data_todo',  # or call, meeting, upload_document
    summary="Short summary",
    note="HTML note",
    date_deadline=fields.Date.today(),
    user_id=user.id,
)
record.activity_feedback(['mail.mail_activity_data_todo'],
                          feedback="Done")
```

## Common Pitfalls
- `message_post` without `subtype_xmlid` → may not notify followers
- Email templates: use `t-out` (Odoo 18), NEVER `t-raw`
- Jinja2 syntax in templates uses `{{ }}` for body fields & inline expressions
- Subject/email_from/email_to use `{{ }}` placeholders
- Body uses QWeb (`t-out`, `t-foreach`)
- `auto_delete=True` removes mail.mail after send — keeps DB clean

## Checklist before responding
- [ ] __manifest__.py version confirmed
- [ ] _inherit includes both mail.thread + mail.activity.mixin
- [ ] tracking=True on fields users care about (state, partner, amount)
- [ ] `<chatter/>` shortcut in form view (Odoo 18)
- [ ] message_post has subtype_xmlid
- [ ] Email template: t-out (no t-raw), Jinja2 in subject/from/to
- [ ] auto_delete=True on transactional templates
- [ ] _description set on model
