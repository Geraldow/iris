# Odoo Accounting — account.move & l10n_pe

You are implementing accounting flows: invoices, journal entries, tax, reconciliation.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R10: NEVER hand-craft journal entries — use account.move + account.move.line APIs
- R13: sudo() forbidden on accounting writes — accounting needs audit trail

## Your Task
{instruction}

## Required Patterns (Odoo 18)

### account.move (invoice / journal entry)
```python
# Customer invoice
invoice = self.env['account.move'].create({
    'move_type': 'out_invoice',           # in_invoice (vendor), out_refund, in_refund, entry
    'partner_id': partner.id,
    'invoice_date': fields.Date.today(),
    'journal_id': sale_journal.id,
    'invoice_line_ids': [(0, 0, {
        'product_id': product.id,
        'quantity': 1.0,
        'price_unit': 100.0,
        'tax_ids': [(6, 0, tax.ids)],
        'account_id': product.property_account_income_id.id or
                      product.categ_id.property_account_income_categ_id.id,
    })],
})

# Post (validates, locks)
invoice.action_post()
```

### move_type
| Type | Doc |
|---|---|
| `out_invoice` | Customer invoice |
| `out_refund`  | Customer credit note |
| `in_invoice`  | Vendor bill |
| `in_refund`   | Vendor credit note |
| `out_receipt` | Sales receipt |
| `in_receipt`  | Purchase receipt |
| `entry`       | Misc. journal entry |

### account.move.line (line model)
```python
# Balanced manual entry (debits = credits)
entry = self.env['account.move'].create({
    'move_type': 'entry',
    'journal_id': misc_journal.id,
    'date': fields.Date.today(),
    'line_ids': [
        (0, 0, {
            'account_id': debit_account.id,
            'debit': 100.0,
            'credit': 0.0,
            'partner_id': partner.id,
            'name': "Reclass adjustment",
        }),
        (0, 0, {
            'account_id': credit_account.id,
            'debit': 0.0,
            'credit': 100.0,
            'partner_id': partner.id,
            'name': "Reclass adjustment",
        }),
    ],
})
entry.action_post()
```

### Reconciliation
```python
# Match invoice payment with bank statement line
invoice_receivable = invoice.line_ids.filtered(
    lambda l: l.account_id.account_type == 'asset_receivable'
)
payment_receivable = payment.move_id.line_ids.filtered(
    lambda l: l.account_id.account_type == 'asset_receivable'
)
(invoice_receivable + payment_receivable).reconcile()
```

### Tax computation
```python
# Get tax breakdown for a line
tax_result = invoice_line.tax_ids.compute_all(
    price_unit=invoice_line.price_unit,
    currency=invoice_line.currency_id,
    quantity=invoice_line.quantity,
    product=invoice_line.product_id,
    partner=invoice.partner_id,
)
# Returns: {'total_excluded': ..., 'total_included': ..., 'taxes': [...]}
```

## Peru Localization (l10n_pe)

```python
# Common l10n_pe modules
# - l10n_pe: chart of accounts, tax codes
# - l10n_pe_edi: SUNAT EDI (XML, CDR)
# - l10n_pe_edi_odoofact (OCA): Odoofact gateway
# - l10n_pe_edi_stock: GRE (Guía de Remisión)

# Document type (SUNAT catalog 01)
# 01: Factura, 03: Boleta, 07: Nota de crédito, 08: Nota de débito, 09: Guía
partner.l10n_latam_identification_type_id  # RUC, DNI, CE, Pasaporte
partner.vat                                  # the actual number

# Journal for electronic docs
journal.l10n_pe_edi_provider                 # 'odoofact', 'digiflow', etc.
journal.l10n_latam_use_documents = True      # enables document_type_id

# Invoice document
invoice.l10n_latam_document_type_id          # 01, 03, 07, etc.
invoice.l10n_latam_document_number           # F001-00000123

# Post triggers EDI send
invoice.action_post()  # → edi_document_ids → SUNAT call
invoice.edi_document_ids.action_process()    # retry
invoice.edi_document_ids[0].sunat_state      # 'ACEPTADO', 'RECHAZADO'
```

## Common Pitfalls
- Writing directly to `account_move_line` table → corrupts move balance
- `sudo()` on `action_post` → bypasses access checks but ALSO journal locks
- Modifying a POSTED move → forbidden; must reset to draft (with admin perms)
- `currency_id` on lines MUST match move.currency_id (single currency per move)
- l10n_pe: missing `l10n_latam_document_type_id` → EDI cannot send
- Date locks (`fiscalyear_lock_date`) → posting in a closed period fails

## Reset to draft (with care)
```python
# Only with accountant/manager rights; logs in audit trail
invoice.button_draft()
invoice.write({'invoice_date': new_date})
invoice.action_post()
```

## Account types (Odoo 18)
| account_type | Group |
|---|---|
| `asset_receivable` | Trade receivables |
| `liability_payable` | Trade payables |
| `asset_cash` | Bank & cash |
| `income` | Sales |
| `expense` | Cost / OPEX |
| `equity` | Equity |
| `off_balance` | Off-balance sheet |

## Checklist before responding
- [ ] __manifest__.py version + l10n_pe modules in depends if applicable
- [ ] move_type explicit on every account.move.create
- [ ] invoice_line_ids (not line_ids) for invoice types — line_ids for 'entry'
- [ ] Lines balanced: sum(debit) == sum(credit) for 'entry'
- [ ] tax_ids set via (6, 0, [...]) command
- [ ] action_post() not direct state='posted' write
- [ ] No sudo() on posting flow
- [ ] l10n_latam_document_type_id present for PE / LATAM
- [ ] Reconciliation via .reconcile() on filtered move lines
