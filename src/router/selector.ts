import type { Phase, ComplexityLevel, ProviderName, ProviderSelection, OdooTaskType } from '../types/index.js'
import type { TaskConfig } from '../context/odoo-selector.js'
import { TASK_CONFIG } from '../context/odoo-selector.js'

const PHASE_PROVIDER: Record<Phase, ProviderName> = {
  explore:  'antigravity',  // Gemini: semantic search + Engram retrieval
  propose:  'claude',       // Claude: reasoning about intent and scope
  spec:     'claude',       // Claude: behavioral specs, RFC 2119
  design:   'antigravity',  // Gemini: architecture design, Mermaid diagrams
  tasks:    'claude',       // Claude: dependency-ordered task breakdown
  apply:    'claude',       // Claude first; codex fallback for pure code
  verify:   'claude',       // Claude: behavioral validation
  archive:  'opencode',     // documentation, archival — low-cost synthesis
}

const PHASE_FALLBACK_PROVIDER: Partial<Record<Phase, ProviderName>> = {
  explore:  'claude',
  propose:  'antigravity',
  spec:     'antigravity',
  design:   'claude',
  tasks:    'copilot',
  apply:    'codex',        // codex is the fallback for code generation
  verify:   'antigravity',
  archive:  'claude',
}

// Model maps per adapter × complexity
const CLAUDE_MODELS: Record<ComplexityLevel, string> = {
  low: 'claude-haiku-4-5-20251001', medium: 'claude-sonnet-4-6', high: 'claude-opus-4-7',
}
const CLAUDE_EFFORTS: Record<ComplexityLevel, string> = {
  low: 'low', medium: 'high', high: 'high',
}

const ANTIGRAVITY_MODELS: Record<ComplexityLevel, string> = {
  low:    'Gemini 3.5 Flash (Medium)',
  medium: 'Gemini 3.5 Flash (High)',
  high:   'Gemini 3.1 Pro (High)',
}

const COPILOT_MODELS: Record<ComplexityLevel, string> = {
  low: 'gpt-4.1-mini', medium: 'gpt-4o', high: 'gpt-5.2',
}
const COPILOT_EFFORTS: Record<ComplexityLevel, string> = {
  low: 'low', medium: 'medium', high: 'high',
}

const CODEX_MODELS: Record<ComplexityLevel, string> = {
  low: 'o4-mini', medium: 'o4-mini', high: 'o3',
}
const CODEX_EFFORTS: Record<ComplexityLevel, string> = {
  low: 'low', medium: 'high', high: 'high',
}

const KILO_MODELS: Record<ComplexityLevel, string> = {
  low: 'claude-3-5-haiku', medium: 'claude-sonnet-4', high: 'claude-opus-4',
}
const CURSOR_MODELS: Record<ComplexityLevel, string> = {
  low: 'claude-3-5-haiku', medium: 'claude-sonnet-4', high: 'claude-opus-4',
}
const OPENCODE_MODELS: Record<ComplexityLevel, string> = {
  low:    'opencode/deepseek-v4-flash-free',
  medium: 'opencode/big-pickle',
  high:   'opencode/big-pickle',
}

function resolveModelAndEffort(provider: ProviderName, complexity: ComplexityLevel): { model: string; effort: string } {
  switch (provider) {
    case 'claude':
      return { model: CLAUDE_MODELS[complexity], effort: CLAUDE_EFFORTS[complexity] }
    case 'antigravity':
      return { model: ANTIGRAVITY_MODELS[complexity], effort: 'n/a' }
    case 'copilot':
      return { model: COPILOT_MODELS[complexity], effort: COPILOT_EFFORTS[complexity] }
    case 'codex':
      return { model: CODEX_MODELS[complexity], effort: CODEX_EFFORTS[complexity] }
    case 'kilo':
      return { model: KILO_MODELS[complexity], effort: 'n/a' }
    case 'cursor':
      return { model: CURSOR_MODELS[complexity], effort: 'n/a' }
    case 'opencode':
      return { model: OPENCODE_MODELS[complexity], effort: 'n/a' }
    case 'odoo-sh':
      return { model: 'n/a', effort: 'n/a' }
    default:
      const _exhaustive: never = provider
      throw new Error(`Unknown provider: ${provider}`)
  }
}

export function selectProvider(
  phase: Phase,
  complexity: ComplexityLevel,
  forcedProvider?: ProviderName,
  overrideModel?: string,
  overrideEffort?: string,
  odooTaskType?: OdooTaskType,
): ProviderSelection {
  // Odoo task type overrides phase-based routing
  let primary: ProviderName
  let fallback: ProviderName | null

  if (odooTaskType && TASK_CONFIG[odooTaskType]) {
    const cfg: TaskConfig = TASK_CONFIG[odooTaskType]
    primary = forcedProvider ?? cfg.primaryProvider
    fallback = cfg.fallbackProvider
  } else {
    primary = forcedProvider ?? PHASE_PROVIDER[phase]
    fallback = PHASE_FALLBACK_PROVIDER[phase] ?? null
  }

  const { model, effort } = resolveModelAndEffort(primary, complexity)

  return {
    primary,
    fallback,
    model: overrideModel ?? model,
    effort: overrideEffort ?? effort,
  }
}

export { ANTIGRAVITY_MODELS }
