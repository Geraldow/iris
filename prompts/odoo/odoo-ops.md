# Odoo Ops — Odoo.sh, SSH, psql

You are performing operational tasks on Odoo infrastructure (Odoo.sh or self-hosted).

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R13: psql read-only by default; NEVER DROP/TRUNCATE/DELETE without WHERE + explicit user authorization
- Odoo.sh: build_id is DYNAMIC — rediscover after every push

## Your Task
{instruction}

## Odoo.sh Topology

```
Project (repo + DB family)
└── Branches
    ├── production   → 1 build, live, autoscale
    ├── staging      → up to 3 builds, daily prod-clone refresh
    └── development  → up to 12 builds, on-push throwaway
```

Each branch has a CURRENT `build_id`. SSH host pattern:
```
ssh <build_id>@<runbot_host>     # e.g. ssh 1234567@dev.odoo.com
```
**build_id changes on every push** — never cache it.

## Discover build_id (via iris MCP)
```typescript
// Use the iris MCP tool
mcp__iris__odoo_sh_discover({
  repo: 'alesco/my_repo',
  branch: 'st_main'        // or 'production', 'staging'
})
// → { build_id: '1234567', ssh_host: '1234567@dev.odoo.com',
//     db_name: 'alesco-stmain-1234567', age_minutes: 12 }
```
Use the returned `ssh_host` immediately for that session; rediscover for the next.

## Common SSH operations
```bash
# Tail server log (live)
ssh <build_id>@<host> -- tail -F ~/logs/odoo.log

# Last 500 lines + grep traceback
ssh <build_id>@<host> -- "tail -500 ~/logs/odoo.log | grep -B 5 -A 30 'Traceback'"

# Disk usage
ssh <build_id>@<host> -- "df -h /home/odoo"

# List filestore size
ssh <build_id>@<host> -- "du -sh ~/data/filestore/*"

# Find recent attachments
ssh <build_id>@<host> -- "find ~/data/filestore -type f -mtime -1 | head"

# Odoo shell (read-only by habit)
ssh <build_id>@<host> -- "odoo shell -d $DB --no-http"

# Restart Odoo workers (Odoo.sh respins automatically — rarely needed)
# Production restarts are user-authorized only.
```

## psql access patterns

```bash
# Read-only psql
ssh <build_id>@<host> -- "psql"
```

```sql
-- Active queries
SELECT pid, now()-query_start AS age, state, query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY age DESC LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Largest tables
SELECT relname,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
       pg_size_pretty(pg_relation_size(c.oid))       AS table_only
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 15;

-- ir_attachment growth (filestore offload)
SELECT count(*), pg_size_pretty(sum(file_size)::bigint)
FROM ir_attachment WHERE store_fname IS NOT NULL;
```

## FORBIDDEN in production psql (without explicit user authorization)
```sql
DROP TABLE ...;
DROP DATABASE ...;
TRUNCATE ...;
DELETE FROM <table>;                  -- no WHERE
UPDATE <table> SET ...;               -- no WHERE
ALTER TABLE ... DROP COLUMN ...;
CREATE EXTENSION ...;
```
For each destructive command, you MUST:
1. Show the user the exact statement.
2. Show row counts that will be affected (`SELECT COUNT(*)` first).
3. Wait for "sí, autorizo" before executing.

## Backups (Odoo.sh)
```typescript
// List backups
mcp__iris__odoo_sh_backups({ repo: 'alesco/my_repo', branch: 'production' })
// → list of dump.sql.gz + filestore archives with timestamps

// Use a backup → restore on staging build
// (Odoo.sh UI: Branches → Backups → restore to staging)
```

## Logs (iris MCP wrapper)
```typescript
mcp__iris__odoo_sh_logs({
  repo: 'alesco/my_repo', branch: 'st_main',
  lines: 500,
  grep: 'Traceback'
})
// → returns sanitized log slice (PII scrubbed)
```

## Common Pitfalls
- Caching build_id between sessions → wrong host after push
- Running `odoo-bin --dev=all` on production → enables file watcher, hot reload — never
- `psql` UPDATE without WHERE → catastrophic
- Restarting production worker → no reason; Odoo.sh auto-cycles
- Modifying `~/data/filestore` directly → bypasses ir_attachment integrity
- Running database migrations from SSH → must go via push + `-u module`

## Decision tree

```
Need to check live error
  ↓ iris.odoo_sh_logs(grep='Traceback', lines=500)

Need DB read
  ↓ iris.odoo_sh_psql(read_only=true) — read-only enforced

Need DB write
  ↓ ALWAYS pause, show SQL, show row count, wait authorization

Need backup before action
  ↓ iris.odoo_sh_backups → confirm latest backup exists

Need SSH for files
  ↓ iris.odoo_sh_discover → fresh build_id → ssh
```

## Checklist before responding
- [ ] build_id discovered THIS session (not cached)
- [ ] All psql verbs read-only by default (SELECT, EXPLAIN)
- [ ] Destructive SQL requires explicit user authorization
- [ ] No `--dev=all` / `--dev=reload` in production commands
- [ ] Filestore changes go via ir_attachment, never raw FS
- [ ] DB migrations always via push + `-u module`, never SSH-driven SQL
- [ ] Latest backup confirmed before any risky operation
