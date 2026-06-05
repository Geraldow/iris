export type Phase =
  | 'explore'
  | 'propose'
  | 'spec'
  | 'design'
  | 'tasks'
  | 'apply'
  | 'verify'
  | 'report'
  | 'document'

export type ComplexityLevel = 'low' | 'medium' | 'high'
export type AdapterName = 'claude' | 'antigravity' | 'copilot' | 'codex' | 'kilo' | 'cursor' | 'opencode'

export type OdooTaskType =
  | 'odoo-source' | 'odoo-orm' | 'odoo-view' | 'odoo-security'
  | 'odoo-wizard' | 'odoo-report' | 'odoo-owl' | 'odoo-controller'
  | 'odoo-mail' | 'odoo-portal' | 'odoo-migration' | 'odoo-test'
  | 'odoo-debug' | 'odoo-ops' | 'odoo-ci' | 'odoo-api'
  | 'odoo-commit' | 'odoo-pr' | 'odoo-changelog' | 'odoo-module'
  | 'odoo-accounting' | 'odoo-stock'
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'pending_confirmation'
  | 'cancelled'

// ---------- Domain entities ----------

export interface ITask {
  id: string
  session_id: string | null
  adapter: AdapterName
  phase: Phase
  complexity: ComplexityLevel
  status: TaskStatus
  created_at: string
  completed_at: string | null
  prompt: string | null
  output: string | null
  engram_id: number | null
  cost_usd: number
}

export interface IAdapter {
  name: AdapterName
  execute(prompt: string, model: string, effort: string): Promise<string>
  isAvailable(): boolean
}

// ---------- Delegation flow ----------

export interface DelegateRequest {
  phase: Phase
  instruction: string
  change?: string
  contextIds?: number[]
  deliverable?: string
  outputPath?: string
  complexity?: ComplexityLevel
  dry_run?: boolean
  fire_and_forget?: boolean
  confirm?: string
  override?: { model?: string; effort?: string }
}

export interface PendingPlan {
  adapter: AdapterName
  model: string
  effort: string
  complexity: ComplexityLevel
  prompt: string
  estimatedTokens?: number
}

export interface DelegateResult {
  taskId: string
  adapter: AdapterName
  model: string
  effort: string
  complexity: ComplexityLevel
  engramId?: number
  tokens?: number
  cost_usd?: number
  duration_ms?: number
  status: 'done' | 'pending_confirmation' | 'failed' | 'fallback'
  plan?: PendingPlan
  confirm_token?: string
  summary?: string   // first line of output — full content is in Engram at engramId
  error?: string
}

// ---------- Router ----------

export interface ComplexityScore {
  total: number
  level: ComplexityLevel
  breakdown: {
    scope: number
    contextSize: number
    architecturalImpact: number
    dependencyResolution: number
  }
}

export interface AdapterSelection {
  primary: AdapterName
  fallback: AdapterName | null
  model: string
  effort: string
}

export interface CircuitBreakerState {
  failures: number
  lastFailure: number | null
  unavailableUntil: number | null
}

// ---------- Budget ----------

export interface BudgetStatus {
  adapter: AdapterName
  daily_limit_usd: number
  current_spend_usd: number
  reset_date: string
  is_over_budget: boolean
}

// ---------- Odoo ----------

export interface OdooContext {
  version: string
  edition: 'community' | 'enterprise'
  moduleName: string
  alesco_path: string
  enterprise_path: string
  community_path: string
  activeBranch: string
  taskType?: OdooTaskType
  activeRules: string[]
  knowledgeFiles: string[]
}

export interface IrisLocalConfig {
  alesco_path: string
  enterprise_path: string
  community_path: string
}

export interface OdooRule {
  id: string
  title: string
  description: string
  triggerOn: string[]
}

export interface EnterpriseSearchResult {
  file: string
  line: number
  content: string
}

// ---------- Config ----------

export interface AdapterConfig {
  enabled: boolean
  priority: number
  daily_budget_usd: number
}

export interface IrisConfig {
  confirm_threshold: ComplexityLevel | 'never'
  adapters: Record<AdapterName, AdapterConfig>
}
