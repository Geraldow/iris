import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { homedir, platform } from 'os'
import { z } from 'zod'
import { getConfig } from '../config.js'
import { isAvailable, recordFailure, recordSuccess } from '../router/circuit-breaker.js'
import type { AdapterName } from '../types/index.js'

const execAsync = promisify(exec)

const CB_ADAPTER = 'odoo-sh' as AdapterName

export interface OdooShConfig {
  projectId: string
  apiToken: string
  sshKeyPath: string
  sshUser: string
}

export interface BuildInfo {
  id: number
  branch: string
  url: string
  status: string
  lastCommit: string
  createdAt: string
}

export interface ToolResult {
  success: boolean
  output: string
  error?: string
}

function resolveConfig(overrides?: Partial<OdooShConfig>): OdooShConfig {
  const irisConfig = getConfig()
  const cfg = irisConfig.odoo_sh ?? {}
  return {
    projectId: overrides?.projectId ?? cfg.project_id ?? '',
    apiToken: overrides?.apiToken ?? cfg.api_token ?? '',
    sshKeyPath: overrides?.sshKeyPath ?? cfg.ssh_key_path ?? '',
    sshUser: overrides?.sshUser ?? cfg.ssh_user ?? 'odoo',
  }
}

function validateConfig(config: OdooShConfig): string | null {
  if (!config.projectId) return 'Odoo.sh project_id not configured. Set via iris_config or ~/.iris/config.json'
  if (!config.apiToken) return 'Odoo.sh api_token not configured. Set via iris_config or ~/.iris/config.json'
  if (!config.sshKeyPath) return 'SSH key path not configured. Set ssh_key_path in odoo_sh config'
  return null
}

function resolveKeyPath(keyPath: string): string {
  if (keyPath.startsWith('~/')) return join(homedir(), keyPath.slice(2))
  return keyPath
}

function shellEscape(cmd: string): string {
  return cmd.replace(/"/g, '\\"').replace(/\\/g, '\\\\')
}

export async function discoverBuilds(config: OdooShConfig): Promise<BuildInfo[]> {
  const url = `https://www.odoo.sh/api/v1/projects/${config.projectId}/builds`

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      if (response.status === 401) return []
      if (response.status === 404) return []
      return []
    }

    const json = await response.json() as { data?: Array<Record<string, unknown>> }
    const data = json.data ?? []
    return data.map((b: Record<string, unknown>) => ({
      id: b.id as number,
      branch: b.branch as string,
      url: b.url as string,
      status: b.status as string,
      lastCommit: b.commit as string,
      createdAt: b.created_at as string,
    }))
  } catch {
    return []
  }
}

export async function getSshUrl(config: OdooShConfig, branch?: string): Promise<string> {
  const builds = await discoverBuilds(config)
  const target = branch ? builds.find(b => b.branch === branch) : builds[0]
  if (!target) {
    const msg = branch
      ? `No build found for branch "${branch}". Is the project ID correct?`
      : 'No builds found. Is the project ID correct?'
    throw new Error(msg)
  }
  return `${config.sshUser}@${target.url}`
}

export async function sshExec(config: OdooShConfig, command: string, branch?: string): Promise<ToolResult> {
  if (!isAvailable(CB_ADAPTER)) {
    recordFailure(CB_ADAPTER)
    return { success: false, output: '', error: 'Circuit breaker open — SSH unavailable. Wait 5 minutes or check Odoo.sh connectivity.' }
  }

  try {
    const sshUrl = await getSshUrl(config, branch)
    const keyPath = resolveKeyPath(config.sshKeyPath)
    const hostDevNull = platform() === 'win32' ? 'NUL' : '/dev/null'
    const escapedCmd = shellEscape(command)
    const sshCmd = `ssh -i "${keyPath}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=${hostDevNull} -o ConnectTimeout=15 -o BatchMode=yes ${sshUrl} "${escapedCmd}"`

    const { stdout, stderr } = await execAsync(sshCmd, { timeout: 30_000 })
    recordSuccess(CB_ADAPTER)
    const combined = stdout + (stderr ? `\n${stderr}` : '')
    return { success: true, output: combined }
  } catch (err) {
    recordFailure(CB_ADAPTER)
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, output: '', error: msg }
  }
}

export async function fetchLogs(config: OdooShConfig, logType?: string, lines?: number): Promise<ToolResult> {
  const n = Math.min(Math.max(lines ?? 100, 1), 5000)
  let logFile: string
  switch (logType) {
    case 'web.log':
      logFile = '/var/log/odoo/web.log'
      break
    case 'longpolling.log':
      logFile = '/var/log/odoo/longpolling.log'
      break
    default:
      logFile = '/var/log/odoo/odoo.log'
  }
  return sshExec(config, `tail -n ${n} ${logFile}`)
}

const DESTRUCTIVE_PATTERN = /\b(DROP\s+(TABLE|DATABASE|INDEX|VIEW)|TRUNCATE\s|DELETE\s+FROM\s+\w+\s+(?!WHERE)|INSERT\s+INTO|UPDATE\s+\w+\s+SET\s+(?!.*\bWHERE\b)|ALTER\s+(TABLE|DATABASE|INDEX|COLUMN)|CREATE\s+(TABLE|DATABASE|INDEX)|GRANT\s|REVOKE\s|TRUNCATE)\b/i

export async function psqlQuery(config: OdooShConfig, query: string): Promise<ToolResult> {
  if (!query.trim()) {
    return { success: false, output: '', error: 'Query is empty' }
  }

  if (DESTRUCTIVE_PATTERN.test(query)) {
    return {
      success: false,
      output: '',
      error: 'Destructive SQL operations are not allowed. Only SELECT and read-only queries are permitted.',
    }
  }

  const safeQuery = query.replace(/'/g, "'\\''")
  return sshExec(config, `psql -d odoo -c "BEGIN READ ONLY; ${safeQuery}; COMMIT;" 2>&1 || echo 'QUERY_ERROR'`)
}

export async function getStatus(config: OdooShConfig): Promise<ToolResult> {
  const script = [
    "echo '--- Health Check ---'",
    "curl -s -o /dev/null -w 'HTTP %{http_code}' --connect-timeout 5 http://localhost:8069/web/health 2>/dev/null || echo 'unreachable'",
    "echo",
    "echo '--- Memory ---'",
    "free -h 2>/dev/null | head -3 || echo 'unavailable'",
    "echo '--- Disk ---'",
    "df -h / 2>/dev/null | tail -1 || echo 'unavailable'",
    "echo '--- DB Size ---'",
    `psql -d odoo -c "SELECT pg_size_pretty(pg_database_size('odoo'))" -t 2>/dev/null || echo 'unavailable'`,
    "echo '--- Uptime ---'",
    "uptime 2>/dev/null || echo 'unavailable'",
    "echo '--- Processes ---'",
    "ps aux --sort=-%mem 2>/dev/null | head -8 || echo 'unavailable'",
  ].join(' && ')

  return sshExec(config, script)
}

export async function manageBackups(config: OdooShConfig, action: 'list' | 'create'): Promise<ToolResult> {
  try {
    const url = `https://www.odoo.sh/api/v1/projects/${config.projectId}/backups`

    if (action === 'create') {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30_000),
      })
      const text = await response.text()
      return { success: response.ok, output: text || 'Backup created successfully' }
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
      signal: AbortSignal.timeout(15_000),
    })
    const text = await response.text()
    if (!response.ok) return { success: false, output: '', error: `API error ${response.status}: ${text}` }
    return { success: true, output: text }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, output: '', error: msg }
  }
}

export const DiscoverInputSchema = z.object({
  project_id: z.string().optional(),
  api_token: z.string().optional(),
  branch: z.string().optional(),
})

export const LogsInputSchema = z.object({
  log_type: z.enum(['odoo.log', 'web.log', 'longpolling.log']).optional(),
  lines: z.number().int().min(1).max(5000).optional(),
  branch: z.string().optional(),
  project_id: z.string().optional(),
  api_token: z.string().optional(),
})

export const PsqlInputSchema = z.object({
  query: z.string().min(1),
  branch: z.string().optional(),
  project_id: z.string().optional(),
  api_token: z.string().optional(),
})

export const StatusInputSchema = z.object({
  branch: z.string().optional(),
  project_id: z.string().optional(),
  api_token: z.string().optional(),
})

export const BackupsInputSchema = z.object({
  action: z.enum(['list', 'create']),
  project_id: z.string().optional(),
  api_token: z.string().optional(),
})

export async function handleDiscover(input: unknown): Promise<object> {
  const params = DiscoverInputSchema.parse(input)
  const config = resolveConfig({ projectId: params.project_id, apiToken: params.api_token })
  const err = validateConfig(config)
  if (err) return { success: false, error: err }

  const builds = await discoverBuilds(config)
  return {
    success: true,
    builds,
    count: builds.length,
  }
}

export async function handleLogs(input: unknown): Promise<object> {
  const params = LogsInputSchema.parse(input)
  const config = resolveConfig({ projectId: params.project_id, apiToken: params.api_token })
  const err = validateConfig(config)
  if (err) return { success: false, error: err }

  const result = await fetchLogs(config, params.log_type, params.lines)
  return result
}

export async function handlePsql(input: unknown): Promise<object> {
  const params = PsqlInputSchema.parse(input)
  const config = resolveConfig({ projectId: params.project_id, apiToken: params.api_token })
  const err = validateConfig(config)
  if (err) return { success: false, error: err }

  const result = await psqlQuery(config, params.query)
  return result
}

export async function handleStatus(input: unknown): Promise<object> {
  const params = StatusInputSchema.parse(input)
  const config = resolveConfig({ projectId: params.project_id, apiToken: params.api_token })
  const err = validateConfig(config)
  if (err) return { success: false, error: err }

  const result = await getStatus(config)
  return result
}

export async function handleBackups(input: unknown): Promise<object> {
  const params = BackupsInputSchema.parse(input)
  const config = resolveConfig({ projectId: params.project_id, apiToken: params.api_token })
  const err = validateConfig(config)
  if (err) return { success: false, error: err }

  const result = await manageBackups(config, params.action)
  return result
}
