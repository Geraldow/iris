import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import type { IrisLocalConfig } from '../types/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PACKAGE_ROOT = join(__dirname, '../../')
const LOCAL_YAML_PATH = join(PACKAGE_ROOT, 'iris.local.yaml')
const DETECT_SCRIPT = join(PACKAGE_ROOT, 'scripts/detect-alesco-path.ps1')

function buildConfig(alesco_path: string): IrisLocalConfig {
  return {
    alesco_path,
    enterprise_path: join(alesco_path, 'Source', 'odoo-enterprise-18'),
    community_path: join(alesco_path, 'Source', 'odoo-community-18'),
  }
}

function parseLocalYaml(content: string): string | null {
  const match = content.match(/^alesco_path:\s*(.+)$/m)
  const value = match?.[1]?.trim()
  return value && value !== '#' && !value.startsWith('#') ? value : null
}

export async function resolveAlescoPaths(): Promise<IrisLocalConfig | null> {
  // Priority 1: environment variable
  const envPath = process.env.ALESCO_PATH
  if (envPath && existsSync(envPath)) {
    return buildConfig(envPath)
  }

  // Priority 2: iris.local.yaml
  if (existsSync(LOCAL_YAML_PATH)) {
    const content = readFileSync(LOCAL_YAML_PATH, 'utf-8')
    const alesco_path = parseLocalYaml(content)
    if (alesco_path && existsSync(alesco_path)) {
      return buildConfig(alesco_path)
    }
  }

  // Priority 3: auto-detect via PowerShell script (Windows only)
  if (process.platform === 'win32' && existsSync(DETECT_SCRIPT)) {
    try {
      const detected = execSync(
        `pwsh -NoProfile -NonInteractive -File "${DETECT_SCRIPT}"`,
        { encoding: 'utf-8', timeout: 15000 }
      ).trim()

      if (detected && existsSync(detected)) {
        writeFileSync(LOCAL_YAML_PATH, `alesco_path: ${detected}\n`)
        return buildConfig(detected)
      }
    } catch {
      // Google Drive not mounted or script not available — silent fail
    }
  }

  return null
}
