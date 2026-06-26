import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { getAllBudgets } from '../store/budgets.js'
import { getAllStatuses } from '../router/circuit-breaker.js'
import { getConfig } from '../config.js'
import { getEngramClient } from '../engram/client.js'
import type { ProviderName } from '../types/index.js'
import { checkForUpdates } from '../updater.js'

// Known provider binaries and their commands for availability checking
const PROVIDER_BINARIES: Record<string, { checkCmd: string; installGuide: string }> = {
  claude:      { checkCmd: 'claude --version', installGuide: 'npm install -g @anthropic-ai/claude-code' },
  antigravity: { checkCmd: 'agy --version', installGuide: 'winget install agy' },
  copilot:     { checkCmd: 'github-copilot-cli --version', installGuide: 'npm install -g @githubnext/github-copilot-cli' },
  codex:       { checkCmd: 'codex --version', installGuide: 'npm install -g openai-codex' },
  kilo:        { checkCmd: 'kilocode --version', installGuide: 'npm install -g kilocode' },
  cursor:      { checkCmd: 'cursor --version', installGuide: 'Download from cursor.com' },
  opencode:    { checkCmd: 'opencode --version', installGuide: 'npm install -g @opencode/cli' },
  'odoo-sh':   { checkCmd: 'ssh -V', installGuide: 'Built into Windows — ssh.exe ships with OS' },
}

export async function handleStatus(_input: unknown): Promise<object> {
  const config = getConfig()
  const budgets = getAllBudgets()
  const circuitBreakers = getAllStatuses()

  const providers = (Object.keys(config.providers) as ProviderName[]).map(name => ({
    name,
    enabled: config.providers[name].enabled,
    circuit: circuitBreakers[name],
    budget: budgets.find(b => b.provider === name),
  }))

  const update = await checkForUpdates()

  return {
    confirm_threshold: config.confirm_threshold,
    providers,
    version: update.current,
    update_available: update.available,
    ...(update.available && {
      latest_version: update.latest,
      update_url: update.url,
    }),
  }
}

export async function handleSetup(input: unknown): Promise<object> {
  const params = input as { adapter?: string; provider?: string }
  const providerName = params.provider ?? params.adapter ?? ''
  const config = getConfig()

  // 1. Validate provider name
  const validProviders = Object.keys(config.providers)
  if (!validProviders.includes(providerName)) {
    return {
      provider: providerName,
      known: false,
      error: `Unknown provider '${providerName}'. Valid: ${validProviders.join(', ')}`,
      status: 'error',
    }
  }

  const providerConfig = config.providers[providerName as ProviderName]
  const binInfo = PROVIDER_BINARIES[providerName]

  // 2. Binary availability check
  let binaryFound = false
  let binaryVersion = ''
  let binaryPath = ''

  if (binInfo) {
    try {
      const result = execSync(binInfo.checkCmd, { encoding: 'utf-8', timeout: 5000 })
      binaryFound = true
      const lines = result.trim().split('\n')
      binaryVersion = lines.find(l => l.trim())?.trim() ?? ''
    } catch {
      binaryFound = false
    }

    // Fallback: try where/which in case --version failed but binary exists
    if (!binaryFound) {
    try {
      const cmd = process.platform === 'win32' ? 'where' : 'which'
      const result = execSync(`${cmd} ${providerName}`, { encoding: 'utf-8', timeout: 3000 })
        binaryPath = result.trim().split('\n')[0]
        binaryFound = true
      } catch {
        // Not in PATH
      }
    }
  }

  // 3. Engram connectivity test
  let engramReachable = false
  let engramError = ''
  try {
    const client = await getEngramClient()
    // Lightweight ping: call mem_stats (fast, always succeeds if Engram is up)
    const result = await client.callTool({
      name: 'mem_stats',
      arguments: {},
    })
    engramReachable = true
  } catch (e) {
    engramError = e instanceof Error ? e.message : String(e)
  }

  // 4. Provider config status
  const enabled = providerConfig?.enabled ?? false
  const priority = providerConfig?.priority ?? 0
  const dailyBudget = providerConfig?.daily_budget_usd ?? 0

  // 5. Overall health
  const healthy = binaryFound && engramReachable && enabled

  return {
    provider: providerName,
    known: true,
    enabled,
    configured: {
      priority,
      daily_budget_usd: dailyBudget,
    },
    binary: {
      found: binaryFound,
      ...(binaryVersion && { version: binaryVersion }),
      ...(binaryPath && { path: binaryPath }),
    },
    ...(binInfo && !binaryFound && { install_guide: binInfo.installGuide }),
    engram: {
      reachable: engramReachable,
      ...(engramError && { error: engramError }),
    },
    status: healthy ? 'ok' : 'degraded',
    ...(!binaryFound && { warnings: [`${providerName} CLI not found in PATH`] }),
    ...(!engramReachable && { warnings: [...(engramError ? [`Engram MCP unreachable: ${engramError}`] : ['Engram MCP unreachable'])] }),
  }
}
