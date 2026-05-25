import type { DelegateRequest, ComplexityScore, ComplexityLevel } from '../types/index.js'

// Scoring weights: total 100 points → LOW 0-35 / MEDIUM 36-70 / HIGH 71-100
const WEIGHTS = {
  scope: 30,
  contextSize: 30,
  architecturalImpact: 20,
  dependencyResolution: 20,
}

const HIGH_IMPACT_PHASES = new Set(['design', 'apply', 'spec'])
const ARCH_KEYWORDS = [
  'architecture', 'refactor', 'redesign', 'migrate', 'rewrite',
  'module', 'schema', 'database', 'api', 'interface', 'pattern',
]
const DEPENDENCY_KEYWORDS = [
  'install', 'package', 'library', 'dependency', 'npm', 'pip',
  'integration', 'external', 'third-party', 'sdk',
]

function scoreScope(req: DelegateRequest): number {
  const words = req.instruction.split(/\s+/).length
  if (words < 20) return 5
  if (words < 60) return 15
  if (words < 150) return 22
  return WEIGHTS.scope
}

function scoreContextSize(req: DelegateRequest): number {
  const contextCount = req.contextIds?.length ?? 0
  if (contextCount === 0) return 5
  if (contextCount <= 2) return 12
  if (contextCount <= 5) return 22
  return WEIGHTS.contextSize
}

function scoreArchitecturalImpact(req: DelegateRequest): number {
  const text = req.instruction.toLowerCase()
  if (HIGH_IMPACT_PHASES.has(req.phase)) return WEIGHTS.architecturalImpact
  const hits = ARCH_KEYWORDS.filter(k => text.includes(k)).length
  if (hits === 0) return 2
  if (hits <= 2) return 10
  return WEIGHTS.architecturalImpact
}

function scoreDependencyResolution(req: DelegateRequest): number {
  const text = req.instruction.toLowerCase()
  const hits = DEPENDENCY_KEYWORDS.filter(k => text.includes(k)).length
  if (hits === 0) return 2
  if (hits <= 2) return 10
  return WEIGHTS.dependencyResolution
}

function levelFromScore(score: number): ComplexityLevel {
  if (score <= 35) return 'low'
  if (score <= 70) return 'medium'
  return 'high'
}

export function scoreComplexity(req: DelegateRequest): ComplexityScore {
  // Allow caller to override complexity entirely
  if (req.complexity) {
    const override = req.complexity
    const fakeScore = override === 'low' ? 20 : override === 'medium' ? 50 : 85
    return {
      total: fakeScore,
      level: override,
      breakdown: { scope: 0, contextSize: 0, architecturalImpact: 0, dependencyResolution: 0 },
    }
  }

  const breakdown = {
    scope: scoreScope(req),
    contextSize: scoreContextSize(req),
    architecturalImpact: scoreArchitecturalImpact(req),
    dependencyResolution: scoreDependencyResolution(req),
  }
  const total = breakdown.scope + breakdown.contextSize + breakdown.architecturalImpact + breakdown.dependencyResolution

  return { total, level: levelFromScore(total), breakdown }
}
