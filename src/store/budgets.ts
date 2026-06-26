import { getDb } from './db.js'
import type { ProviderName, BudgetStatus } from '../types/index.js'

const DEFAULT_LIMITS: Record<ProviderName, number> = {
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
  provider: string
  daily_limit_usd: number
  current_spend_usd: number
  reset_date: string
}

function ensureRow(providerName: ProviderName): void {
  getDb().prepare(`
    INSERT OR IGNORE INTO provider_budget (provider, daily_limit_usd, current_spend_usd, reset_date)
    VALUES (?, ?, 0.0, ?)
  `).run(providerName, DEFAULT_LIMITS[providerName], nextMidnight())
}

function resetIfExpired(providerName: ProviderName): void {
  const row = getDb().prepare('SELECT reset_date FROM provider_budget WHERE provider = ?').get(providerName) as
    | { reset_date: string }
    | undefined

  if (row && new Date() >= new Date(row.reset_date)) {
    getDb().prepare('UPDATE provider_budget SET current_spend_usd = 0.0, reset_date = ? WHERE provider = ?')
      .run(nextMidnight(), providerName)
  }
}

export function recordUsage(providerName: ProviderName, costUsd: number): void {
  ensureRow(providerName)
  resetIfExpired(providerName)
  getDb().prepare('UPDATE provider_budget SET current_spend_usd = current_spend_usd + ? WHERE provider = ?')
    .run(costUsd, providerName)
}

export function getDailyBudget(providerName: ProviderName): BudgetStatus {
  ensureRow(providerName)
  resetIfExpired(providerName)

  const row = getDb().prepare('SELECT * FROM provider_budget WHERE provider = ?').get(providerName) as unknown as BudgetRow

  return {
    provider: providerName,
    daily_limit_usd: row.daily_limit_usd,
    current_spend_usd: row.current_spend_usd,
    reset_date: row.reset_date,
    is_over_budget: row.daily_limit_usd > 0 && row.current_spend_usd >= row.daily_limit_usd,
  }
}

export function isOverBudget(providerName: ProviderName): boolean {
  return getDailyBudget(providerName).is_over_budget
}

export function getAllBudgets(): BudgetStatus[] {
  const providers: ProviderName[] = ['claude', 'antigravity', 'copilot', 'codex', 'kilo', 'cursor', 'opencode', 'odoo-sh']
  return providers.map(getDailyBudget)
}
