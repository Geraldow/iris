import { createRequire } from 'module'
import { existsSync, readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import DatabaseBetterSqlite3 from 'better-sqlite3'

// ─── Compat: createRequire en ESM y CJS bundles (pkg) ────────────────────
// En ESM nativo: import.meta.url → file:///.../dist/store/db.js
// En bundle CJS (esbuild+pkg): import_meta = {} → import_meta.url = undefined
//   → try-catch atrapa el error de fileURLToPath(undefined)
//   → fallback a process.cwd() que funciona para built-in modules
let _require: ReturnType<typeof createRequire>
try {
  // En bundle CJS (pkg), import.meta es {} y fileURLToPath(undefined) lanza error
  const metaUrl = (import.meta as unknown as { url?: string }).url
  if (metaUrl) {
    _require = createRequire(fileURLToPath(metaUrl))
  } else {
    throw new Error('import.meta.url not available')
  }
} catch {
  _require = createRequire(process.cwd())
}

// ─── SQLite compatibility layer ──────────────────────────────────────────
// Soporta 3 engines en orden de preferencia:
//   1. better-sqlite3 (npm) — funciona con pkg, Node 18+
//   2. node:sqlite        — nativo Node 22.5+, desarrollo
//   3. bun:sqlite         — runtime Bun
// Todos mapean a la misma interfaz { exec, prepare, close }.

interface Statement {
  run(...params: unknown[]): void
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

interface Database {
  exec(sql: string): void
  prepare(sql: string): Statement
  close(): void
}

function createDatabase(path: string): Database {
  // Priority 1: Bun runtime
  if (typeof process.versions.bun === 'string') {
    const { Database: BunDb } = _require('bun:sqlite') as { Database: new (path: string) => Database }
    return new BunDb(path)
  }

  // Priority 2: better-sqlite3 (funciona con pkg, Node 18+)
  try {
    const db = new DatabaseBetterSqlite3(path)
    return {
      exec(sql: string) { db.exec(sql) },
      prepare(sql: string) {
        const stmt = db.prepare(sql)
        return {
          run(...params: unknown[]) { stmt.run(...params) },
          get(...params: unknown[]) { return stmt.get(...params) },
          all(...params: unknown[]) { return stmt.all(...params) },
        }
      },
      close() { db.close() },
    }
  } catch {
    // better-sqlite3 no disponible — continuar con fallback
  }

  // Priority 3: node:sqlite (nativo Node 22.5+)
  try {
    const nodeSqlite = _require('node:sqlite') as { DatabaseSync: new (path: string) => any }
    return {
      exec(sql: string) { new nodeSqlite.DatabaseSync(path).exec(sql) },
      prepare(sql: string) {
        const db = new nodeSqlite.DatabaseSync(path)
        const stmt = db.prepare(sql)
        return {
          run(...params: unknown[]) { stmt.run(...params) },
          get(...params: unknown[]) { return stmt.get(...params) },
          all(...params: unknown[]) { return stmt.all(...params) },
        }
      },
      close() { /* node:sqlite cierra con db.close() pero no guardamos ref */ },
    }
  } catch {
    throw new Error(
      'No SQLite engine available. Install better-sqlite3 or use Node >= 22.5'
    )
  }
}

// ─── Configurable schema path ────────────────────────────────────────────
// Priority: IRIS_DB_SCHEMA env var > iris.local.yaml db_schema > CWD fallback
function resolveSchemaPath(): string {
  // Priority 1: environment variable
  const envPath = process.env.IRIS_DB_SCHEMA
  if (envPath) return envPath

  // Priority 2: iris.local.yaml (db_schema key)
  // En ESM: busca relativo a dist/store/db.js → ../../iris.local.yaml
  // En CJS bundle: busca en process.cwd()/iris.local.yaml
  try {
    let projectRoot: string
    try {
      const metaUrl = (import.meta as unknown as { url?: string }).url
      const curFile = fileURLToPath(metaUrl!)
      projectRoot = join(dirname(curFile), '../..')
    } catch {
      // CJS bundle (pkg/SEA) — usar CWD
      projectRoot = process.cwd()
    }
    const localYamlPath = join(projectRoot, 'iris.local.yaml')
    if (existsSync(localYamlPath)) {
      const content = readFileSync(localYamlPath, 'utf-8')
      const match = content.match(/^db_schema:\s*(.+)$/m)
      const value = match?.[1]?.trim()
      if (value && !value.startsWith('#')) return value
    }
  } catch {
    // iris.local.yaml not available — fall through
  }

  // Priority 3: CWD fallback (schema.sql relativo al directorio de trabajo)
  return join(process.cwd(), 'db', 'schema.sql')
}

// ─── Singleton ───────────────────────────────────────────────────────────
const IRIS_DIR = join(homedir(), '.iris')
const DB_PATH = join(IRIS_DIR, 'iris.db')
const SCHEMA_PATH = resolveSchemaPath()

let _db: Database | null = null

export function getDb(): Database {
  if (!_db) {
    mkdirSync(IRIS_DIR, { recursive: true })
    _db = createDatabase(DB_PATH)
    _db.exec('PRAGMA journal_mode = WAL')
    _db.exec('PRAGMA foreign_keys = ON')
    const schema = readFileSync(SCHEMA_PATH, 'utf-8')
    _db.exec(schema)
    _db.exec("UPDATE tasks SET status = 'failed', output = 'Process interrupted at startup', completed_at = datetime('now') WHERE status = 'running'")
  }
  return _db
}

export function closeDb(): void {
  _db?.close()
  _db = null
}
