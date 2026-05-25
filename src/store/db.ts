import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const IRIS_DIR = join(homedir(), '.iris')
const DB_PATH = join(IRIS_DIR, 'iris.db')

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// dist/store/db.js → ../../db/schema.sql = <project-root>/db/schema.sql
const SCHEMA_PATH = join(__dirname, '../../db/schema.sql')

let _db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!_db) {
    mkdirSync(IRIS_DIR, { recursive: true })
    _db = new DatabaseSync(DB_PATH)
    _db.exec('PRAGMA journal_mode = WAL')
    _db.exec('PRAGMA foreign_keys = ON')
    const schema = readFileSync(SCHEMA_PATH, 'utf-8')
    _db.exec(schema)
  }
  return _db
}

export function closeDb(): void {
  _db?.close()
  _db = null
}
