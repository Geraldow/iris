import { randomUUID } from 'crypto'
import { getDb } from './db.js'
import type { ITask, AdapterName, Phase, ComplexityLevel, TaskStatus } from '../types/index.js'

type SQLValue = string | number | bigint | null

export function createTask(data: {
  session_id?: string
  adapter: AdapterName
  phase: Phase
  complexity: ComplexityLevel
  prompt?: string
}): ITask {
  const db = getDb()
  const id = randomUUID()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO tasks (id, session_id, adapter, phase, complexity, status, created_at, prompt)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, data.session_id ?? null, data.adapter, data.phase, data.complexity, now, data.prompt ?? null)

  return getTask(id)!
}

export function updateTask(
  id: string,
  updates: Partial<Pick<ITask, 'status' | 'output' | 'engram_id' | 'cost_usd' | 'completed_at'>>
): void {
  const db = getDb()
  const fields: string[] = []
  const values: SQLValue[] = []

  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
  if (updates.output !== undefined) { fields.push('output = ?'); values.push(updates.output) }
  if (updates.engram_id !== undefined) { fields.push('engram_id = ?'); values.push(updates.engram_id) }
  if (updates.cost_usd !== undefined) { fields.push('cost_usd = ?'); values.push(updates.cost_usd) }
  if (updates.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(updates.completed_at) }

  if (fields.length === 0) return
  values.push(id)

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function getTask(id: string): ITask | null {
  const row = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  if (!row) return null
  return row as unknown as ITask
}

export function listTasks(opts: { limit?: number; phase?: string; adapter?: string } = {}): ITask[] {
  const db = getDb()
  const conditions: string[] = []
  const values: SQLValue[] = []

  if (opts.phase) { conditions.push('phase = ?'); values.push(opts.phase) }
  if (opts.adapter) { conditions.push('adapter = ?'); values.push(opts.adapter) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  values.push(opts.limit ?? 50)

  return db.prepare(`SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT ?`).all(...values) as unknown as ITask[]
}

export function completeTask(id: string, output: string, engramId?: number, costUsd?: number): void {
  updateTask(id, {
    status: 'done' as TaskStatus,
    output,
    engram_id: engramId,
    cost_usd: costUsd,
    completed_at: new Date().toISOString(),
  })
}

export function failTask(id: string, error: string): void {
  updateTask(id, {
    status: 'failed' as TaskStatus,
    output: error,
    completed_at: new Date().toISOString(),
  })
}
