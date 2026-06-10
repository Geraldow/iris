import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { IrisConfig } from './types/index.js'

const IRIS_DIR = join(homedir(), '.iris')
const CONFIG_PATH = join(IRIS_DIR, 'config.json')

const DEFAULT_CONFIG: IrisConfig = {
  confirm_threshold: 'high',
  adapters: {
    claude:       { enabled: true, priority: 3, daily_budget_usd: 5.0 },
    antigravity:  { enabled: true, priority: 1, daily_budget_usd: 0.0 },
    copilot:      { enabled: true, priority: 2, daily_budget_usd: 0.0 },
    codex:        { enabled: true, priority: 2, daily_budget_usd: 2.0 },
    kilo:         { enabled: true, priority: 2, daily_budget_usd: 0.0 },
    cursor:       { enabled: true, priority: 2, daily_budget_usd: 0.0 },
    opencode:     { enabled: true, priority: 2, daily_budget_usd: 0.0 },
    'odoo-sh':    { enabled: true, priority: 1, daily_budget_usd: 0.0 },
  },
  odoo_sh: {
    project_id: '',
    api_token: '',
    ssh_key_path: '',
    ssh_user: 'odoo',
  },
}

let _config: IrisConfig | null = null

export function getConfig(): IrisConfig {
  if (_config) return _config

  if (!existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG)
    _config = DEFAULT_CONFIG
    return _config
  }

  try {
    _config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as IrisConfig
    return _config
  } catch {
    _config = DEFAULT_CONFIG
    return _config
  }
}

export function saveConfig(config: IrisConfig): void {
  mkdirSync(IRIS_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  _config = config
}

export function updateConfig(patch: Partial<IrisConfig>): IrisConfig {
  const current = getConfig()
  const updated = { ...current, ...patch }
  saveConfig(updated)
  return updated
}
