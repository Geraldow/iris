import type { OdooTaskType } from '../types/index.js'
import { TASK_CONFIG } from './odoo-selector.js'
import { loadKnowledgeFile } from './rules.js'

const AGENT_FOR_TYPE: Partial<Record<OdooTaskType, string>> = {
  'odoo-orm':        'orm-architect',
  'odoo-source':     'orm-architect',
  'odoo-wizard':     'orm-architect',
  'odoo-migration':  'orm-architect',
  'odoo-view':       'view-architect',
  'odoo-report':     'view-architect',
  'odoo-owl':        'view-architect',
  'odoo-portal':     'view-architect',
  'odoo-security':   'security-auditor',
  'odoo-controller': 'integration-engineer',
  'odoo-api':        'integration-engineer',
  'odoo-mail':       'integration-engineer',
  'odoo-ops':        'devops-engineer',
  'odoo-ci':         'devops-engineer',
  'odoo-debug':      'devops-engineer',
  'odoo-accounting': 'business-analyst',
  'odoo-stock':      'business-analyst',
  'odoo-module':     'business-analyst',
  'odoo-test':       'quality-engineer',
  'odoo-commit':     'quality-engineer',
  'odoo-pr':         'quality-engineer',
  'odoo-changelog':  'quality-engineer',
}

const BASE = `You are agy, operating as an iris sub-agent. Complete the delegated task below.

## Constraints
- Return only the requested output. No preamble, meta-commentary, or pleasantries.
- If the prompt specifies an outputPath: write the result to that path using your Write tool.
- No "Co-Authored-By" in commits. Conventional commits format only.`

function loadAgentPersona(type: OdooTaskType): string {
  const key = AGENT_FOR_TYPE[type]
  if (!key) return ''
  const content = loadKnowledgeFile('ai/AGENTS.md')
  if (!content) return ''
  const match = content.match(new RegExp(`## ${key}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`))
  return match ? `## Specialized Agent\n\n${match[1].trim()}` : ''
}

export function buildTaskPreamble(phase: string, odooTaskType?: OdooTaskType): string {
  const lines = ['# iris Sub-Agent Context', '', BASE, '', '## Task']
  lines.push(`Phase: ${phase}`)

  if (odooTaskType) {
    const cfg = TASK_CONFIG[odooTaskType]
    lines.push(`Type: ${odooTaskType}`)
    lines.push(`Rules: ${cfg.activeRules.join(', ')}`)
    lines.push(`Knowledge: ${cfg.knowledgeFiles[0]}`)
  } else if (['propose', 'spec', 'design', 'tasks'].includes(phase)) {
    lines.push('Focus: SDD artifact. Follow template structure exactly.')
  } else if (phase === 'apply') {
    lines.push('Focus: Code implementation. Write files as specified.')
  }

  if (odooTaskType) {
    const persona = loadAgentPersona(odooTaskType)
    if (persona) lines.push('', persona)
  }

  lines.push('', '---')
  return lines.join('\n')
}