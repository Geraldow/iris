# Odoo Stock — Moves, Pickings, Quants

You are implementing inventory flows: moves, pickings, routing, lots/serials.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R10: NEVER write directly to stock.quant or stock.move.line — use moves + assignments
- R13: Quantity changes go through stock.move.action_done / button_validate (not direct write)

## Your Task
{instruction}

## Required Patterns (Odoo 18)

### Core models
| Model | Role |
|---|---|
| `stock.warehouse` | Physical / logical warehouse |
| `stock.location` | Hierarchy: stock, customer, supplier, transit, inventory loss |
| `stock.picking` | Transfer (group of moves) |
| `stock.picking.type` | Operation type (receipt, internal, delivery, manufacture) |
| `stock.move` | One product flow between two locations |
| `stock.move.line` | Actual reservation/done qty + lot/serial/package |
| `stock.quant` | Current stock at (location, product, lot) |
| `stock.rule` | Routing rule (pull / push) |
| `stock.route` | Group of rules |

### Create a transfer programmatically
```python
picking_type = self.env.ref('stock.picking_type_in')   # Receipts
picking = self.env['stock.picking'].create({
    'partner_id': vendor.id,
    'picking_type_id': picking_type.id,
    'location_id': vendor.property_stock_supplier.id,
    'location_dest_id': picking_type.default_location_dest_id.id,
    'move_ids': [(0, 0, {
        'name': product.display_name,
        'product_id': product.id,
        'product_uom_qty': 10.0,
        'product_uom': product.uom_id.id,
        'location_id': vendor.property_stock_supplier.id,
        'location_dest_id': picking_type.default_location_dest_id.id,
    })],
})
picking.action_confirm()    # confirm moves
picking.action_assign()     # reserve from quants
picking.button_validate()   # mark done (validates lot/serial, ties up quants)
```

### MTO vs MTS
- **MTS (Make to Stock)**: pull from existing quants; default for most routes
- **MTO (Make to Order)**: each demand creates a procurement chain — direct link
  Set on product or product.template: `route_ids` includes the MTO route

### Lot & Serial
```python
# Lot per move line
move_line.lot_id = self.env['stock.lot'].create({
    'name': 'LOT-2026-001',
    'product_id': product.id,
    'company_id': self.env.company.id,
})

# Serial (one per quantity)
for i in range(qty):
    self.env['stock.move.line'].create({
        'move_id': move.id,
        'product_id': product.id,
        'qty_done': 1.0,
        'lot_id': self.env['stock.lot'].create({
            'name': f'SN-{i:05d}',
            'product_id': product.id,
        }).id,
        'location_id': move.location_id.id,
        'location_dest_id': move.location_dest_id.id,
    })
```

### Querying available quantity
```python
# Direct quant query (use _quantity, not free_qty)
qty_on_hand = sum(self.env['stock.quant'].search([
    ('product_id', '=', product.id),
    ('location_id.usage', '=', 'internal'),
]).mapped('quantity'))

# Reserved + on hand on a single product/location
quant = self.env['stock.quant']._gather(product, location)
free_qty = sum(q.quantity - q.reserved_quantity for q in quant)
```

### Inventory adjustment (Odoo 18)
```python
# Odoo 18 uses stock.quant.inventory_quantity directly
quant = self.env['stock.quant'].search([
    ('product_id', '=', product.id),
    ('location_id', '=', location.id),
], limit=1)
quant.inventory_quantity = 25.0
quant.action_apply_inventory()   # creates the adjustment move
```

### stock.rule (pull / push)
```python
# Pull rule: demand at location_dest creates move from location_src
self.env['stock.rule'].create({
    'name': 'Stock → Customers',
    'action': 'pull',
    'location_dest_id': customer_location.id,
    'location_src_id': stock_location.id,
    'picking_type_id': delivery_picking_type.id,
    'route_id': route.id,
    'company_id': self.env.company.id,
})
```

## Data Journey (Order → Delivery)

```
sale.order.action_confirm()
  ↓ creates stock.move via procurement (stock.rule)
stock.picking auto-created
  ↓ picking.action_confirm() → move state='confirmed'
picking.action_assign()
  ↓ stock.quant reservation → move.state='assigned'
  ↓ stock.move.line created with reserved_uom_qty
picking.button_validate()
  ↓ stock.move_line.qty_done required (lot/serial if tracked)
  ↓ move.state='done'
  ↓ stock.quant updated: at source qty -=, at dest qty +=
  ↓ valuation: stock.valuation.layer (if perpetual)
```

## Common Pitfalls
- Writing `move.product_uom_qty` after confirm → must use `_action_done` or `_action_cancel`
- `stock.move.move_orig_ids` / `move_dest_ids` define chained moves — never break manually
- Negative inventory: enabled per location (`allow_negative=True`) — usually undesirable
- Backorders: `button_validate()` on partial done → wizard offers backorder
- `product.qty_available` is cached — recompute via `_compute_quantities`
- Multi-step pickings (2-step/3-step receipts) split moves — chain not direct
- Removal strategies (FIFO/LIFO/FEFO) defined per location

## Checklist before responding
- [ ] __manifest__.py version + `stock` in depends
- [ ] picking_type_id set (drives default locations)
- [ ] location_id / location_dest_id explicit on every move
- [ ] product_uom matches product's uom_id (or convertible)
- [ ] action_confirm → action_assign → button_validate sequence respected
- [ ] No direct writes to stock.quant.quantity (use inventory_quantity flow)
- [ ] Lot/serial created BEFORE button_validate for tracked products
- [ ] No move.product_uom_qty edits after state='done'
- [ ] Routes/rules not deleted while moves reference them
