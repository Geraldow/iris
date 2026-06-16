export type Phase =
  | 'explore'
  | 'propose'
  | 'spec'
  | 'design'
  | 'tasks'
  | 'apply'
  | 'verify'
  | 'archive'

export type ComplexityLevel = 'low' | 'medium' | 'high'
export type AdapterName = 'claude' | 'antigravity' | 'copilot' | 'codex' | 'kilo' | 'cursor' | 'opencode' | 'odoo-sh'

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

export interface SkillRequirement {
  name: string
  path: string
  confidence: number
}

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
  detectedSkills?: SkillRequirement[]
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
  status: 'done' | 'pending_confirmation' | 'failed' | 'fallback' | 'dry_run'
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

export interface OdooShConfig {
  project_id?: string
  api_token?: string
  ssh_key_path?: string
  ssh_user?: string
}

export interface IrisConfig {
  confirm_threshold: ComplexityLevel | 'never'
  adapters: Record<AdapterName, AdapterConfig>
  odoo_sh?: OdooShConfig
}

// ---------- Quality Scanner ----------

export interface QualityDimension {
  name: string
  weight: number
  checks: string[]
}

export interface QualityIssue {
  rule: string
  severity: 'critical' | 'major' | 'minor' | 'info'
  deduction: number
  message: string
  fundamental?: string
  uiVerification?: string
  fix?: string
  referenceUrl?: string
}

export interface ScoredDimension {
  name: string
  weight: number
  weightLabel: string
  score: number
  scorePct: number
  penalties: QualityIssue[]
}

export interface LearningMoment {
  dimension: string
  severity: string
  concept: string
  summary: string
  referenceUrl: string
}

export interface QualityReport {
  meta: {
    module: string
    version: string
    odooVersion: string
    evaluator: string
    evaluatorVersion: string
  }
  overallScore: number
  threshold: 'green' | 'yellow' | 'red'
  dimensions: ScoredDimension[]
  learningMoments: LearningMoment[]
  reciprocalApprenticeship: {
    learningMomentsCount: number
    dimensionsWithExplanation: number
    pillarsApplied: string[]
    onionLevelTarget: number
    generatedAt: string
    methodologyReference: string
  }
}

export interface ScanOptions {
  modulePath: string
  moduleName?: string
  odooVersion?: string
  includeLearningArtifact?: boolean
}

export type CiGate = 'pre-commit' | 'pr' | 'merge' | 'deploy'

export interface CiGateResult {
  passed: boolean
  required: number
  actual: number
  message: string
}

// ---------- UI Map Engine ----------

export interface NavigationRoute {
  steps: string[]
  url?: string
  targetView?: string
  relatedButtons?: string[]
  raw: string
}

export interface UIMapEntry {
  module: string
  version: string
  modelCount: number
  viewCount: number
  menuCount: number
  lastParsed: string
}

export interface UIMapModelEntry {
  name: string
  displayName: string
}

export interface UIMapViewEntry {
  id: string
  name: string
  model: string
  type: string
}

export interface UIMapMenuEntry {
  id: string
  name: string
  parent?: string
  action?: string
  path: string[]
}

export interface FieldEntry {
  name: string
  type: string
  displayName: string
  relation?: string
  help?: string
}

export interface RelationEntry {
  field: string
  type: 'many2one' | 'one2many' | 'many2many'
  targetModel: string
}

export interface ModelEntry {
  name: string
  displayName: string
  fields: FieldEntry[]
  relations: RelationEntry[]
}

export interface ViewSection {
  type: 'tab' | 'page' | 'group' | 'notebook' | 'sheet'
  name?: string
  string?: string
  fields: string[]
  children: ViewSection[]
}

export interface ViewEntry {
  id: string
  name: string
  model: string
  type: 'form' | 'list' | 'kanban' | 'search' | 'activity' | 'gantt' | 'graph' | 'cohort' | 'dashboard'
  inherit?: boolean
  parentView?: string
  fields: string[]
  structure?: ViewSection[]
}

export interface MenuEntry {
  id: string
  name: string
  parent?: string
  action?: string
  sequence: number
  path: string[]
}

export interface ActionEntry {
  id: string
  name: string
  model: string
  type: 'ir.actions.act_window' | 'ir.actions.server' | 'ir.actions.report'
  viewType?: string
  viewId?: string
}

export interface UIMap {
  module: string
  version: string
  models: ModelEntry[]
  views: ViewEntry[]
  menus: MenuEntry[]
  actions: ActionEntry[]
}
