import { getDb } from './db.js'
import type { AdapterName, BudgetStatus } from '../types/index.js'

const DEFAULT_LIMITS: Record<AdapterName, number> = {
  claude: 5.0,
  antigravity: 0.0,
  copilot: 0.0,
  codex: 2.0,
  kilo: 0.0,
  cursor: 0.0,
  opencode: 0.0,
  'odoo-sh': 0.0,
}

function nextMidnight(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

interface BudgetRow {
  adapter: string
  daily_limit_usd: number
  current_spend_usd: number
  reset_date: string
}

function ensureRow(adapter: AdapterName): void {
  getDb().prepare(`
    INSERT OR IGNORE INTO adapter_budget (adapter, daily_limit_usd, current_spend_usd, reset_date)
    VALUES (?, ?, 0.0, ?)
  `).run(adapter, DEFAULT_LIMITS[adapter], nextMidnight())
}

function resetIfExpired(adapter: AdapterName): void {
  const row = getDb().prepare('SELECT reset_date FROM adapter_budget WHERE adapter = ?').get(adapter) as
    | { reset_date: string }
    | undefined

  if (row && new Date() >= new Date(row.reset_date)) {
    getDb().prepare('UPDATE adapter_budget SET current_spend_usd = 0.0, reset_date = ? WHERE adapter = ?')
      .run(nextMidnight(), adapter)
  }
}

export function recordUsage(adapter: AdapterName, costUsd: number): void {
  ensureRow(adapter)
  resetIfExpired(adapter)
  getDb().prepare('UPDATE adapter_budget SET current_spend_usd = current_spend_usd + ? WHERE adapter = ?')
    .run(costUsd, adapter)
}

export function getDailyBudget(adapter: AdapterName): BudgetStatus {
  ensureRow(adapter)
  resetIfExpired(adapter)

  const row = getDb().prepare('SELECT * FROM adapter_budget WHERE adapter = ?').get(adapter) as unknown as BudgetRow

  return {
    adapter,
    daily_limit_usd: row.daily_limit_usd,
    current_spend_usd: row.current_spend_usd,
    reset_date: row.reset_date,
    is_over_budget: row.daily_limit_usd > 0 && row.current_spend_usd >= row.daily_limit_usd,
  }
}

export function isOverBudget(adapter: AdapterName): boolean {
  return getDailyBudget(adapter).is_over_budget
}

export function getAllBudgets(): BudgetStatus[] {
  const adapters: AdapterName[] = ['claude', 'antigravity', 'copilot', 'codex', 'kilo', 'cursor', 'opencode', 'odoo-sh']
  return adapters.map(getDailyBudget)
}
