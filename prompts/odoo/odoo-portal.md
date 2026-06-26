# Odoo Portal — portal.mixin & Public Routes

You are implementing Odoo portal pages (portal.mixin, _compute_access_url, public/portal controllers).

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R13: sudo() scope minimum, signed tokens for public access, never expose internal IDs

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```python
# models/my_model.py
from odoo import api, fields, models
from odoo.addons.portal.controllers.portal import CustomerPortal


class MyModel(models.Model):
    _name = 'my.model'
    _inherit = ['portal.mixin', 'mail.thread']

    name = fields.Char(required=True)
    partner_id = fields.Many2one('res.partner', required=True)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('done', 'Done'),
    ], default='draft')

    def _compute_access_url(self):
        super()._compute_access_url()
        for record in self:
            record.access_url = f'/my/order/{record.id}'

    def _get_report_base_filename(self):
        return self.name
```

```python
# controllers/portal.py
from collections import OrderedDict
from odoo import http, _
from odoo.exceptions import AccessError, MissingError
from odoo.http import request
from odoo.addons.portal.controllers.portal import (
    CustomerPortal, pager as portal_pager
)


class MyCustomerPortal(CustomerPortal):

    def _prepare_home_portal_values(self, counters):
        """Add counter to /my home dashboard."""
        values = super()._prepare_home_portal_values(counters)
        if 'my_order_count' in counters:
            values['my_order_count'] = request.env['my.model'].search_count(
                self._get_my_order_domain()
            )
        return values

    def _get_my_order_domain(self):
        return [('partner_id', '=', request.env.user.partner_id.id)]

    @http.route(['/my/orders', '/my/orders/page/<int:page>'],
                type='http', auth='user', website=True)
    def portal_my_orders(self, page=1, sortby=None, **kw):
        MyModel = request.env['my.model']
        domain = self._get_my_order_domain()

        sortings = {
            'date': {'label': _('Date'), 'order': 'create_date desc'},
            'name': {'label': _('Name'), 'order': 'name'},
        }
        sortby = sortby or 'date'
        order = sortings[sortby]['order']

        total = MyModel.search_count(domain)
        pager = portal_pager(
            url='/my/orders',
            url_args={'sortby': sortby},
            total=total, page=page, step=20,
        )
        orders = MyModel.search(domain, order=order,
                                limit=20, offset=pager['offset'])

        return request.render('my_module.portal_my_orders', {
            'orders': orders,
            'page_name': 'my_orders',
            'pager': pager,
            'sortings': sortings,
            'sortby': sortby,
            'default_url': '/my/orders',
        })

    @http.route(['/my/order/<int:order_id>'],
                type='http', auth='public', website=True)
    def portal_my_order(self, order_id, access_token=None, **kw):
        try:
            order_sudo = self._document_check_access(
                'my.model', order_id, access_token=access_token)
        except (AccessError, MissingError):
            return request.redirect('/my')

        return request.render('my_module.portal_my_order_page', {
            'order': order_sudo,
            'page_name': 'my_order',
        })
```

```xml
<!-- views/portal_templates.xml -->
<odoo>
    <!-- Home counter -->
    <template id="portal_my_home_inherit" inherit_id="portal.portal_my_home">
        <xpath expr="//div[hasclass('o_portal_docs')]" position="inside">
            <t t-call="portal.portal_docs_entry">
                <t t-set="title">My Orders</t>
                <t t-set="url" t-value="'/my/orders'"/>
                <t t-set="placeholder_count">my_order_count</t>
            </t>
        </xpath>
    </template>

    <!-- List page -->
    <template id="portal_my_orders" name="My Orders">
        <t t-call="portal.portal_layout">
            <t t-set="breadcrumbs_searchbar" t-value="True"/>
            <t t-call="portal.portal_searchbar"/>
            <t t-if="not orders">
                <p>No orders yet.</p>
            </t>
            <t t-if="orders" t-call="portal.portal_table">
                <thead><tr><th>Name</th><th>State</th></tr></thead>
                <tbody>
                    <tr t-foreach="orders" t-as="order">
                        <td>
                            <a t-att-href="order.get_portal_url()">
                                <span t-out="order.name"/>
                            </a>
                        </td>
                        <td><span t-field="order.state"/></td>
                    </tr>
                </tbody>
            </t>
        </t>
    </template>
</odoo>
```

## Data Journey (Front → Back)

```
Customer browser
  ↓ GET /my/order/42?access_token=xyz
@http.route auth='public', website=True
  ↓ _document_check_access('my.model', 42, access_token='xyz')
  ↓ portal.mixin verifies hashed token vs record.access_token
ORM with sudo() (scoped) → my.model.browse(42)
  ↓ ir.rule still applied (sudo bypasses access rights, not record rules)
QWeb renders portal_my_order_page
  ↓ portal.portal_layout wrapper → branding, breadcrumbs
HTML response → browser
```

## Token-Based Access
- `portal.mixin` adds `access_token` field (UUID, generated on demand)
- `_document_check_access()` validates: record exists, user has access OR token matches
- Public URL pattern: `/my/<doc>/<id>?access_token=<token>`
- Emails send the URL via `record.get_portal_url()`

## Common Pitfalls
- `auth='user'` → only authenticated users (Internal + Portal)
- `auth='public'` + access_token → unauthenticated access with verification
- Never expose record.id without an access_token check
- Never `record.sudo().write(...)` from public route without verification
- `website=True` adds the website layout — required for portal templates
- `_compute_access_url` must be defined per model (portal mixin hook)

## Checklist before responding
- [ ] __manifest__.py version + depends includes 'portal'
- [ ] portal.mixin in _inherit
- [ ] _compute_access_url overridden with stable URL pattern
- [ ] Controllers extend CustomerPortal (don't re-implement /my)
- [ ] _document_check_access called BEFORE rendering any record
- [ ] Public routes use access_token verification
- [ ] sudo() scoped to specific browse call after verification
- [ ] Templates wrapped in portal.portal_layout
- [ ] portal_searchbar / portal_pager used for list views
