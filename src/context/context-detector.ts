import type { SkillRequirement, Phase } from '../types/index.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PACKAGE_ROOT = join(__dirname, '../../')

interface SkillDef {
  name: string
  path: string
  tier: 1 | 2 | 3 | 4 | 5
  triggers: {
    extensions?: string[]
    patterns?: RegExp[]
    phases?: Phase[]
    commands?: string[]
    taskTypes?: string[]
  }
}

const SKILL_REGISTRY: SkillDef[] = [
  {
    name: 'odoo-ai',
    path: join(PACKAGE_ROOT, 'skills/odoo-ai'),
    tier: 1,
    triggers: {
      extensions: ['.py', '.xml'],
      patterns: [/models\//, /__manifest__\.py$/, /ir\.ui\.view/, /fields\.\w+/],
      taskTypes: ['odoo-orm', 'odoo-view', 'odoo-security', 'odoo-source'],
    },
  },
  {
    name: 'odoo-contribute',
    path: join(PACKAGE_ROOT, 'skills/odoo-contribute'),
    tier: 1,
    triggers: {
      extensions: ['.yml', '.yaml'],
      patterns: [/.github\/workflows/, /Dockerfile/, /docker-compose/],
      taskTypes: ['odoo-commit', 'odoo-pr', 'odoo-ci', 'odoo-changelog'],
    },
  },
  {
    name: 'odoo-quality',
    path: join(PACKAGE_ROOT, 'skills/odoo-quality'),
    tier: 2,
    triggers: {
      phases: ['verify'],
      commands: ['quality', 'score', 'review', 'audit'],
      taskTypes: ['odoo-security'],
    },
  },
  {
    name: 'odoo-observability',
    path: join(PACKAGE_ROOT, 'skills/odoo-observability'),
    tier: 2,
    triggers: {
      commands: ['otel', 'trace', 'observability', 'performance', 'slow'],
    },
  },
  {
    name: 'odoo-reliability',
    path: join(PACKAGE_ROOT, 'skills/odoo-reliability'),
    tier: 2,
    triggers: {
      commands: ['backup', 'reliability', 'disaster', 'recovery', 'circuit breaker'],
    },
  },
  {
    name: 'odoo-module',
    path: join(PACKAGE_ROOT, 'skills/odoo-contribute/plugins/odoo-module'),
    tier: 3,
    triggers: {
      patterns: [/__manifest__\.py$/],
      commands: ['scaffold', 'new module', 'module structure'],
    },
  },
  {
    name: 'odoo-ops',
    path: join(PACKAGE_ROOT, 'skills/odoo-contribute/plugins/odoo-ops'),
    tier: 3,
    triggers: {
      commands: ['odoo.sh', 'ssh', 'deploy', 'server', 'staging'],
    },
  },
  {
    name: 'odoo-security',
    path: join(PACKAGE_ROOT, 'skills/odoo-contribute/plugins/odoo-security'),
    tier: 3,
    triggers: {
      patterns: [/ir\.model\.access/, /ir\.rule/, /res\.groups/],
      commands: ['security', 'permissions', 'access rights'],
    },
  },
]

export interface DetectionInput {
  filePath?: string
  fileContent?: string
  phase?: Phase
  command?: string
  instruction?: string
  taskType?: string
}

export interface DetectionResult {
  primary: SkillRequirement[]
  secondary: SkillRequirement[]
  all: SkillRequirement[]
  log: string[]
}

export function extractFilePath(instruction: string): string | undefined {
  const pathRegex = /(?:[a-zA-Z]:)?[\\/][\w.-]+(?:[\\/][\w.-]+)*\.(?:py|xml|js|ts|scss|yml|yaml|md|css|html)/i
  const match = instruction.match(pathRegex)
  return match?.[0].trim() ?? undefined
}

export function detectSkills(input: DetectionInput): DetectionResult {
  const matches: SkillRequirement[] = []
  const log: string[] = []

  const ext = input.filePath ? getExtension(input.filePath) : undefined
  const lowerInstruction = (input.instruction ?? '').toLowerCase()
  const lowerCommand = (input.command ?? '').toLowerCase()

  log.push(`[detect] ext=${ext} phase=${input.phase} command=${input.command}`)

  for (const skill of SKILL_REGISTRY) {
    let confidence = 0
    const reasons: string[] = []

    if (ext && skill.triggers.extensions?.includes(ext)) {
      confidence = Math.max(confidence, 0.6)
      reasons.push(`ext:${ext}`)
    }

    if (input.fileContent && skill.triggers.patterns) {
      for (const p of skill.triggers.patterns) {
        if (p.test(input.fileContent)) {
          confidence = Math.max(confidence, 0.8)
          reasons.push(`pattern:${p}`)
          break
        }
      }
    }

    if (input.phase && skill.triggers.phases?.includes(input.phase)) {
      confidence = Math.max(confidence, 0.85)
      reasons.push(`phase:${input.phase}`)
    }

    if (lowerCommand && skill.triggers.commands) {
      for (const cmd of skill.triggers.commands) {
        if (lowerCommand.includes(cmd)) {
          confidence = Math.max(confidence, 0.75)
          reasons.push(`cmd:${cmd}`)
          break
        }
      }
    }

    if (lowerInstruction && skill.triggers.commands) {
      for (const cmd of skill.triggers.commands) {
        if (lowerInstruction.includes(cmd)) {
          confidence = Math.max(confidence, 0.5)
          reasons.push(`instr:${cmd}`)
          break
        }
      }
    }

    if (input.taskType && skill.triggers.taskTypes?.includes(input.taskType)) {
      confidence = Math.max(confidence, 0.9)
      reasons.push(`taskType:${input.taskType}`)
    }

    if (confidence > 0) {
      matches.push({
        name: skill.name,
        path: skill.path,
        confidence: Math.round(confidence * 100) / 100,
      })
      log.push(`[detect] MATCH ${skill.name} (confidence=${confidence}) reasons=${reasons.join(',')}`)
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence)

  return {
    primary: matches.filter(m =>
      m.confidence >= 0.8 && (SKILL_REGISTRY.find(s => s.name === m.name)?.tier ?? 5) <= 2
    ),
    secondary: matches.filter(m =>
      m.confidence < 0.8 || (SKILL_REGISTRY.find(s => s.name === m.name)?.tier ?? 5) > 2
    ),
    all: matches,
    log,
  }
}

function getExtension(fp: string): string {
  const idx = fp.lastIndexOf('.')
  return idx >= 0 ? fp.slice(idx).toLowerCase() : ''
}
