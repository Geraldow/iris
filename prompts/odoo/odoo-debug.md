# Odoo Debug — Logging, Tracebacks, Profiling

You are debugging an Odoo error / performance issue.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R13: psql read-only by default, never DROP/TRUNCATE/DELETE without WHERE
- Branches: Odoo.sh build_id is dynamic — discover before SSH

## Your Task
{instruction}

## Required Patterns (Odoo 18)

### Python logging
```python
import logging
_logger = logging.getLogger(__name__)

# Levels
_logger.debug("Fine-grained: %s", payload)       # disabled in prod
_logger.info("Lifecycle event: %s", record)      # production-visible
_logger.warning("Recoverable issue: %s", e)      # ops attention
_logger.error("Operation failed: %s", e)         # incident-worthy
_logger.exception("Unhandled in flow")           # logs traceback
```

### Server log levels (per logger)
```bash
# odoo.conf
log_handler = :INFO,my_module:DEBUG,werkzeug:WARNING,odoo.sql_db:DEBUG
log_level = info

# odoo-bin
odoo-bin --log-handler=my_module:DEBUG --log-handler=odoo.sql_db:DEBUG
```

### Debug mode URL
```
?debug=1            → developer mode (menus, tooltips, technical)
?debug=assets       → unminified JS/CSS, full source maps
?debug=tests        → also load test assets
```

### ir.logging table (in-DB log)
```python
self.env['ir.logging'].sudo().create({
    'name': 'my_module',
    'type': 'server',
    'level': 'INFO',
    'message': f"Operation {ref} OK",
    'path': __name__,
    'line': '0',
    'func': 'action_confirm',
})
```
Read it from UI: Settings → Technical → Logging.

### Traceback patterns (Odoo.sh)
```bash
# Real-time tail
ssh build@host odoo.log --lines=0

# Search for error
grep -A 30 "Traceback" ~/logs/odoo.log | tail -100

# Filter by request (X-Odoo-Request-ID header)
grep "X-Odoo-Request-ID=abc123" ~/logs/odoo.log
```

### Odoo.sh dynamic build_id
build_id changes on EVERY push. Discover it before SSH:
```python
# via iris MCP
mcp__iris__odoo_sh_discover(repo='alesco/my_repo', branch='st_main')
# returns: { build_id: 'xxxx', ssh_host: 'xxxx.dev.odoo.com', ... }
```
Then:
```bash
ssh -t <build_id>@<ssh_host> tail -f ~/logs/odoo.log
```

### psql diagnostics
```sql
-- READ-ONLY by default — never DROP/TRUNCATE/DELETE without WHERE
-- Locks blocking transactions
SELECT pid, query, state, wait_event
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%';

-- Long queries
SELECT pid, now()-query_start AS age, query
FROM pg_stat_activity
WHERE state='active' ORDER BY age DESC LIMIT 5;

-- Explain a slow ORM query (log it first via odoo.sql_db:DEBUG)
EXPLAIN (ANALYZE, BUFFERS, COSTS, FORMAT TEXT)
SELECT ... -- paste the query from logs
;

-- Index usage
SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes WHERE schemaname='public'
ORDER BY idx_scan DESC LIMIT 20;

-- Table bloat suspect
SELECT relname, n_live_tup, n_dead_tup,
       round(n_dead_tup::numeric/NULLIF(n_live_tup,0),2) AS dead_ratio
FROM pg_stat_user_tables
ORDER BY dead_ratio DESC NULLS LAST LIMIT 10;
```

### Forbidden in production psql
```sql
-- NEVER run these without explicit user authorization:
DROP TABLE ...;
DROP DATABASE ...;
TRUNCATE ...;
DELETE FROM <table>;          -- no WHERE = entire table
UPDATE <table> SET ...;       -- no WHERE = every row
ALTER TABLE ... DROP COLUMN;
```

### Performance profiling
```python
from odoo.tools.profiler import Profiler

with Profiler(db=self.env.cr.dbname) as p:
    # code to profile
    record.action_confirm()

# Then read from: Settings → Technical → Profiling Session
```

### Query count assertion
```python
with self.assertQueryCount(__system__=10):
    for r in records:
        _ = r.partner_id.name  # likely N+1
```

### Debug a specific request
```
# Add to URL:
?debug=1&debug_perf=1
# Response includes server-time, query count, ORM cache stats
```

## Decision tree

```
Symptom: HTTP 500
  ↓ tail ~/logs/odoo.log → look for Traceback
  ↓ grep request_id from response header
  ↓ Identify python frame → read source via codegraph_node

Symptom: Slow page
  ↓ debug=1&debug_perf=1 → see query count
  ↓ If N+1: prefetch_ids / read() / assertQueryCount baseline
  ↓ If single slow query: log SQL, EXPLAIN ANALYZE in psql

Symptom: ORM cache wrong value
  ↓ self.env.cr.commit() in middle of method? → forbidden
  ↓ self.invalidate_recordset(['field']) to flush cache

Symptom: ir.rule denies access
  ↓ with_user(target).read() → reproduce
  ↓ Inspect ir.rule rows: SELECT * FROM ir_rule WHERE model_id=...
  ↓ Use sudo() with documented justification
```

## Checklist before responding
- [ ] __manifest__.py version + edition confirmed
- [ ] Reproduce in TransactionCase first (deterministic)
- [ ] Logs sanitized (no PII, no secrets) before sharing
- [ ] No DELETE/TRUNCATE/DROP without WHERE + user authorization
- [ ] EXPLAIN ANALYZE on read-replica when possible
- [ ] build_id rediscovered after each push (Odoo.sh)
- [ ] Fix verified with test case (regression guard)
