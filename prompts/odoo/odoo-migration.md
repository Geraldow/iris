# Odoo Migration — Upgrade Scripts

You are writing Odoo migration scripts.

## Context
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py
- R5: pre-migrate.py mandatory when XML views change + version bump in same commit

## Your Task
{instruction}

## Required Structure

```
module/
  migrations/
    18.0.x.y.z/
      pre-migrate.py   ← runs BEFORE ORM loads (XML changes, column renames)
      post-migrate.py  ← runs AFTER ORM loads (data transforms, compute triggers)
```

## pre-migrate.py Pattern
```python
def migrate(cr, version):
    if not version:
        return
    # Safe: direct SQL before ORM
    cr.execute("ALTER TABLE res_partner ADD COLUMN IF NOT EXISTS custom_field VARCHAR")
```

## Checklist
- [ ] Version in filename matches __manifest__.py version
- [ ] pre-migrate for structural changes (XML, column rename, field type)
- [ ] post-migrate for data transforms
- [ ] Both files handle `if not version: return`
