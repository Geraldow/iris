# Odoo Report — QWeb PDF & ir.actions.report

You are implementing an Odoo QWeb PDF report.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R7: t-out NOT t-raw (XSS prevention), Odoo 18 — list not tree
- R13: Sudo scope minimum, no t-raw in templates

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```xml
<!-- reports/my_report.xml -->
<odoo>
    <!-- Paperformat (optional, A4 default) -->
    <record id="paperformat_my_report" model="report.paperformat">
        <field name="name">My Report A4</field>
        <field name="format">A4</field>
        <field name="orientation">Portrait</field>
        <field name="margin_top">40</field>
        <field name="margin_bottom">23</field>
        <field name="margin_left">7</field>
        <field name="margin_right">7</field>
        <field name="header_line">False</field>
        <field name="header_spacing">35</field>
    </record>

    <!-- Report action -->
    <record id="action_report_my_model" model="ir.actions.report">
        <field name="name">My Report</field>
        <field name="model">my.model</field>
        <field name="report_type">qweb-pdf</field>
        <field name="report_name">my_module.report_my_model_template</field>
        <field name="report_file">my_module.report_my_model_template</field>
        <field name="paperformat_id" ref="paperformat_my_report"/>
        <field name="binding_model_id" ref="model_my_model"/>
        <field name="binding_type">report</field>
    </record>

    <!-- Template -->
    <template id="report_my_model_template">
        <t t-call="web.html_container">
            <t t-foreach="docs" t-as="doc">
                <t t-call="web.external_layout">
                    <div class="page">
                        <h2>
                            <span t-field="doc.name"/>
                        </h2>
                        <div class="row">
                            <div class="col-6">
                                <strong>Customer:</strong>
                                <span t-field="doc.partner_id"/>
                            </div>
                            <div class="col-6">
                                <strong>Date:</strong>
                                <span t-field="doc.date" t-options="{'widget': 'date'}"/>
                            </div>
                        </div>
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th class="text-end">Qty</th>
                                    <th class="text-end">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr t-foreach="doc.line_ids" t-as="line">
                                    <td>
                                        <!-- t-out NOT t-raw (XSS) -->
                                        <span t-out="line.product_id.display_name"/>
                                    </td>
                                    <td class="text-end">
                                        <span t-field="line.quantity"/>
                                    </td>
                                    <td class="text-end">
                                        <span t-field="line.price_subtotal"
                                              t-options="{'widget': 'monetary',
                                                          'display_currency': doc.currency_id}"/>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="row">
                            <div class="col-4 offset-8">
                                <strong>Total:</strong>
                                <span t-field="doc.amount_total"
                                      t-options="{'widget': 'monetary',
                                                  'display_currency': doc.currency_id}"/>
                            </div>
                        </div>
                    </div>
                </t>
            </t>
        </t>
    </template>
</odoo>
```

```python
# Custom report model (for computed values not on the record)
class MyReport(models.AbstractModel):
    _name = 'report.my_module.report_my_model_template'
    _description = 'My Report'

    @api.model
    def _get_report_values(self, docids, data=None):
        docs = self.env['my.model'].browse(docids)
        return {
            'doc_ids': docids,
            'doc_model': 'my.model',
            'docs': docs,
            'data': data,
            'extra_value': self._compute_something(docs),
        }
```

## Data Journey (Front → Back)

```
User clicks "Print" on form/list view
  ↓ ir.actions.report (binding_model_id, binding_type=report)
Server: report.render_qweb_pdf(docids)
  ↓ Look up report_name → template
  ↓ Call AbstractModel._get_report_values() if defined
QWeb engine renders template with docs
  ↓ HTML output → wkhtmltopdf (or odoo.tools.report)
PDF binary → /report/download/ → browser download
```

## Common Pitfalls
- **t-raw is forbidden** in Odoo 18 — always use `t-out` (XSS safe)
- `web.external_layout` for header/footer with company branding
- `web.internal_layout` for cleaner internal docs
- `t-call="web.html_container"` is mandatory wrapper
- `paperformat_id` only needed if non-default
- `binding_model_id` adds "Print" menu on target model views
- For multi-record reports, iterate `t-foreach="docs" t-as="doc"`

## Asset Loading (CSS/JS)
```xml
<template id="assets_my_report" inherit_id="web.report_assets_common">
    <xpath expr="." position="inside">
        <link rel="stylesheet" type="text/css"
              href="/my_module/static/src/css/report.css"/>
    </xpath>
</template>
```

## Checklist before responding
- [ ] __manifest__.py version confirmed
- [ ] report_name matches `<module>.<template_id>`
- [ ] t-out used (NOT t-raw)
- [ ] web.html_container + web.external_layout wrappers present
- [ ] Monetary fields use t-options with display_currency
- [ ] binding_model_id declared if "Print" menu desired
- [ ] AbstractModel only if custom data needed beyond docs
- [ ] No SQL in template — pre-compute in _get_report_values
