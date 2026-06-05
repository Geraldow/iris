import { join } from 'path'
import { cgSearch } from '../codegraph/client.js'
import { resolveAlescoPaths } from '../config/local.js'
import { getCurrentBranch } from '../executor/git.js'
import { detectTaskType, TASK_CONFIG } from './odoo-selector.js'
import type { OdooContext } from '../types/index.js'

function parseManifestField(content: string, field: string): string | null {
  const re = new RegExp(`['"]${field}['"]\\s*:\\s*['"]([^'"]+)['"]`)
  return content.match(re)?.[1] ?? null
}

function detectEdition(license: string | null): 'community' | 'enterprise' {
  if (license === 'OEEL-1') return 'enterprise'
  return 'community'
}

function getModuleName(): string {
  return process.cwd().split(/[/\\]/).filter(Boolean).pop() ?? 'unknown'
}

export async function buildOdooContext(
  instruction?: string,
): Promise<OdooContext | null> {
  // Use CodeGraph to find __manifest__.py
  const searchResult = await cgSearch('__manifest__.py') as any
  if (searchResult?.error) return null

  // Extract manifest content from CodeGraph result
  const files = searchResult?.result?.content ?? searchResult?.content ?? []
  const manifestEntry = Array.isArray(files)
    ? files.find((f: any) => f?.name?.includes('__manifest__.py') || f?.path?.includes('__manifest__.py'))
    : null

  const manifestContent: string = manifestEntry?.content ?? manifestEntry?.text ?? ''
  if (!manifestContent) return null

  const version = parseManifestField(manifestContent, 'version') ?? '18.0'
  const license = parseManifestField(manifestContent, 'license')
  const edition = detectEdition(license)

  const cfg = await resolveAlescoPaths()
  if (!cfg) {
    // Can still build partial context without alesco_path
    return {
      version,
      edition,
      moduleName: getModuleName(),
      alesco_path: '',
      enterprise_path: '',
      community_path: '',
      activeBranch: getCurrentBranch(),
      activeRules: [],
      knowledgeFiles: [],
    }
  }

  const activeBranch = getCurrentBranch()
  const detected = instruction ? detectTaskType(instruction) : null
  const config = detected ? TASK_CONFIG[detected.type] : null

  return {
    version,
    edition,
    moduleName: getModuleName(),
    alesco_path: cfg.alesco_path,
    enterprise_path: cfg.enterprise_path,
    community_path: cfg.community_path,
    activeBranch,
    taskType: detected?.type,
    activeRules: config?.activeRules ?? [],
    knowledgeFiles: config?.knowledgeFiles ?? [],
  }
}

export function formatOdooContextForPrompt(ctx: OdooContext): string {
  return `## Odoo Context

- **Version**: ${ctx.version}
- **Edition**: ${ctx.edition}
- **Module**: ${ctx.moduleName}
- **Branch**: ${ctx.activeBranch}
- **Task Type**: ${ctx.taskType ?? 'general'}
- **Active Rules**: ${ctx.activeRules.join(', ') || 'none'}
- **Enterprise Source**: ${ctx.enterprise_path || 'not configured'}

${ctx.edition === 'enterprise'
  ? '> Enterprise edition — search Enterprise source first (R6).'
  : '> Community edition — OCA conventions apply (LGPL-3).'
}`
}
