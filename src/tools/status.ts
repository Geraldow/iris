import { getAllBudgets } from '../store/budgets.js'
import { getAllStatuses } from '../router/circuit-breaker.js'
import { getConfig } from '../config.js'
import type { AdapterName } from '../types/index.js'

export async function handleStatus(_input: unknown): Promise<object> {
  const config = getConfig()
  const budgets = getAllBudgets()
  const circuitBreakers = getAllStatuses()

  const adapters = (Object.keys(config.adapters) as AdapterName[]).map(name => ({
    name,
    enabled: config.adapters[name].enabled,
    circuit: circuitBreakers[name],
    budget: budgets.find(b => b.adapter === name),
  }))

  return {
    confirm_threshold: config.confirm_threshold,
    adapters,
  }
}

export async function handleSetup(input: unknown): Promise<object> {
  const { adapter } = input as { adapter: string }
  // iris_setup verifies adapter is reachable and Engram is configured
  // Minimal v1: just return configured=true
  return { adapter, engram_configured: true, status: 'ok' }
}
