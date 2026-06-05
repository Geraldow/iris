import type { OdooTaskType } from './odoo-selector.js'
import { TASK_CONFIG } from './odoo-selector.js'

const BASE = `You are agy, operating as an iris sub-agent. Complete the delegated task below.

## Constraints
- Return only the requested output. No preamble, meta-commentary, or pleasantries.
- If the prompt specifies an outputPath: write the result to that path using your Write tool.
- No "Co-Authored-By" in commits. Conventional commits format only.`

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
  } else if (phase === 'document') {
    lines.push('Focus: Technical doc. Clear, concise, no filler.')
  } else if (phase === 'apply') {
    lines.push('Focus: Code implementation. Write files as specified.')
  }

  lines.push('', '---')
  return lines.join('\n')
}