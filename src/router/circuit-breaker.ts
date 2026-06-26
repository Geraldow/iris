import type { ProviderName, CircuitBreakerState } from '../types/index.js'

const MAX_FAILURES = 3
const RESET_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

// In-memory state — resets on process restart (by design, see Decision D1)
const states = new Map<ProviderName, CircuitBreakerState>()

function getState(providerName: ProviderName): CircuitBreakerState {
  if (!states.has(providerName)) {
    states.set(providerName, { failures: 0, lastFailure: null, unavailableUntil: null })
  }
  return states.get(providerName)!
}

export function isAvailable(providerName: ProviderName): boolean {
  const state = getState(providerName)

  if (state.unavailableUntil === null) return true

  if (Date.now() >= state.unavailableUntil) {
    // Half-open: allow one test request through
    state.unavailableUntil = null
    return true
  }

  return false
}

export function recordFailure(providerName: ProviderName): void {
  const state = getState(providerName)
  state.failures += 1
  state.lastFailure = Date.now()

  if (state.failures >= MAX_FAILURES) {
    state.unavailableUntil = Date.now() + RESET_TIMEOUT_MS
  }
}

export function recordSuccess(providerName: ProviderName): void {
  // Reset on any success (handles half-open recovery)
  states.set(providerName, { failures: 0, lastFailure: null, unavailableUntil: null })
}

export function getStatus(providerName: ProviderName): { state: 'closed' | 'open' | 'half-open'; failures: number; unavailableUntil: number | null } {
  const s = getState(providerName)
  let circuitState: 'closed' | 'open' | 'half-open' = 'closed'

  if (s.unavailableUntil !== null) {
    circuitState = Date.now() >= s.unavailableUntil ? 'half-open' : 'open'
  }

  return { state: circuitState, failures: s.failures, unavailableUntil: s.unavailableUntil }
}

export function getAllStatuses(): Record<ProviderName, ReturnType<typeof getStatus>> {
  const providers: ProviderName[] = ['claude', 'antigravity', 'copilot', 'codex', 'kilo', 'cursor', 'opencode']
  return Object.fromEntries(providers.map(p => [p, getStatus(p)])) as Record<ProviderName, ReturnType<typeof getStatus>>
}
