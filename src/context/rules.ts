import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { OdooRule, OdooTaskType } from '../types/index.js'
import { TASK_CONFIG } from './odoo-selector.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const KNOWLEDGE_ROOT = join(__dirname, '../../knowledge/odoo')
const RULES_PATH = join(KNOWLEDGE_ROOT, 'ai/RULES.md')

let _rules: OdooRule[] | null = null

export function parseRulesFile(path = RULES_PATH): OdooRule[] {
  if (!existsSync(path)) return []

  const content = readFileSync(path, 'utf-8')
  const rules: OdooRule[] = []

  // Match patterns like: ## R1 — Title or **R1**: Title
  const rulePattern = /(?:^#{1,3}\s*|^\*\*)(R\d{1,2})(?:\s*[—:-]\s*|\*\*\s*)(.*?)(?=\n#{1,3}\s*R\d|\n\*\*R\d|$)/gms

  let match
  while ((match = rulePattern.exec(content)) !== null) {
    const id = match[1].trim()
    const rest = match[0].replace(match[1], '').replace(/^[*#\s—:-]+/, '').trim()
    const lines = rest.split('\n').filter(l => l.trim())
    const title = lines[0]?.replace(/\*+/g, '').trim() ?? id
    const description = lines.slice(1).join(' ').replace(/\*+/g, '').trim()

    rules.push({ id, title, description, triggerOn: [] })
  }

  return rules.length > 0 ? rules : parseFallbackRules(content)
}

function parseFallbackRules(content: string): OdooRule[] {
  const rules: OdooRule[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const m = line.match(/\b(R\d{1,2})\b[:\s—-]+(.+)/)
    if (m) {
      rules.push({ id: m[1], title: m[2].trim(), description: '', triggerOn: [] })
    }
  }

  return [...new Map(rules.map(r => [r.id, r])).values()]
}

export function getRules(): OdooRule[] {
  if (!_rules) _rules = parseRulesFile()
  return _rules
}

export function selectRulesForTask(type: OdooTaskType): OdooRule[] {
  const config = TASK_CONFIG[type]
  if (!config) return []
  const allRules = getRules()
  return allRules.filter(r => config.activeRules.includes(r.id))
}

export function loadKnowledgeFile(relativePath: string): string {
  const fullPath = join(KNOWLEDGE_ROOT, relativePath)
  if (!existsSync(fullPath)) return ''
  try {
    return readFileSync(fullPath, 'utf-8')
  } catch {
    return ''
  }
}

export function injectKnowledgeContext(type: OdooTaskType): string {
  const config = TASK_CONFIG[type]
  if (!config || config.knowledgeFiles.length === 0) return ''

  const sections: string[] = []
  for (const file of config.knowledgeFiles) {
    const content = loadKnowledgeFile(file)
    if (content) {
      sections.push(`### Knowledge: ${file}\n\n${content}`)
    }
  }

  return sections.length > 0
    ? `## Odoo Knowledge Context\n\n${sections.join('\n\n---\n\n')}`
    : ''
}
