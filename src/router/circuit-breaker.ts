import type { AdapterName, CircuitBreakerState } from '../types/index.js'

const MAX_FAILURES = 3
const RESET_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

// In-memory state — resets on process restart (by design, see Decision D1)
const states = new Map<AdapterName, CircuitBreakerState>()

function getState(adapter: AdapterName): CircuitBreakerState {
  if (!states.has(adapter)) {
    states.set(adapter, { failures: 0, lastFailure: null, unavailableUntil: null })
  }
  return states.get(adapter)!
}

export function isAvailable(adapter: AdapterName): boolean {
  const state = getState(adapter)

  if (state.unavailableUntil === null) return true

  if (Date.now() >= state.unavailableUntil) {
    // Half-open: allow one test request through
    state.unavailableUntil = null
    return true
  }

  return false
}

export function recordFailure(adapter: AdapterName): void {
  const state = getState(adapter)
  state.failures += 1
  state.lastFailure = Date.now()

  if (state.failures >= MAX_FAILURES) {
    state.unavailableUntil = Date.now() + RESET_TIMEOUT_MS
  }
}

export function recordSuccess(adapter: AdapterName): void {
  // Reset on any success (handles half-open recovery)
  states.set(adapter, { failures: 0, lastFailure: null, unavailableUntil: null })
}

export function getStatus(adapter: AdapterName): { state: 'closed' | 'open' | 'half-open'; failures: number; unavailableUntil: number | null } {
  const s = getState(adapter)
  let circuitState: 'closed' | 'open' | 'half-open' = 'closed'

  if (s.unavailableUntil !== null) {
    circuitState = Date.now() >= s.unavailableUntil ? 'half-open' : 'open'
  }

  return { state: circuitState, failures: s.failures, unavailableUntil: s.unavailableUntil }
}

export function getAllStatuses(): Record<AdapterName, ReturnType<typeof getStatus>> {
  const adapters: AdapterName[] = ['claude', 'antigravity', 'copilot', 'codex', 'kilo', 'cursor', 'opencode']
  return Object.fromEntries(adapters.map(a => [a, getStatus(a)])) as Record<AdapterName, ReturnType<typeof getStatus>>
}
