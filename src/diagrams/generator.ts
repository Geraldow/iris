import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { AntigravityAdapter } from '../adapters/antigravity.js'

function getPackageRoot(): string {
  try {
    return join(fileURLToPath(import.meta.url), '..', '..', '..')
  } catch {
    return dirname(process.execPath)
  }
}
const PACKAGE_ROOT = getPackageRoot()
const KNOWLEDGE_EXCALIDRAW = join(PACKAGE_ROOT, 'knowledge', 'excalidraw')

export type DiagramTemplate = 'odoo-erd' | 'odoo-owl-flow' | 'sdd-architecture' | 'odoo-deployment'

export interface DiagramOptions {
  template: DiagramTemplate
  context: string
  outputPath: string
  changeName?: string
}

export interface DiagramResult {
  excalidrawPath: string
  prompt: string
}

function loadKnowledgeFile(relativePath: string): string {
  const fullPath = join(KNOWLEDGE_EXCALIDRAW, relativePath)
  if (!existsSync(fullPath)) return ''
  return readFileSync(fullPath, 'utf-8')
}

export async function generateDiagram(opts: DiagramOptions): Promise<DiagramResult> {
  // R-DG-1: Load SKILL.md as system context
  const skill = loadKnowledgeFile('SKILL.md')
  if (!skill) throw new Error('SKILL.md not found in knowledge/excalidraw/')

  // R-DG-2: Load template
  const template = loadKnowledgeFile(`templates/${opts.template}.md`)
  if (!template) throw new Error(`Template not found: templates/${opts.template}.md`)

  // R-DG-3: Load alesco-palette.md INSTEAD of color-palette.md (brand override)
  const palette = loadKnowledgeFile('references/alesco-palette.md')
  const elementTemplates = loadKnowledgeFile('references/element-templates.md')
  const jsonSchema = loadKnowledgeFile('references/json-schema.md')

  const prompt = [
    '# Excalidraw Diagram Generation',
    '',
    '## Skill Instructions (read and follow exactly)',
    skill,
    '',
    '## Color Palette (Alesco brand — overrides default palette)',
    palette,
    '',
    '## Element Templates',
    elementTemplates,
    '',
    '## JSON Schema Reference',
    jsonSchema,
    '',
    `## Diagram Template: ${opts.template}`,
    template,
    '',
    '## Your Task',
    opts.context,
    '',
    '## Output Requirements',
    '- Output ONLY the raw JSON of the .excalidraw file — no markdown fences, no explanation.',
    '- The JSON must start with `{` and be valid Excalidraw format.',
    '- Use the Alesco palette above for ALL colors. Never use the default color-palette.md values.',
    opts.changeName ? `- Change name: ${opts.changeName}` : '',
  ].filter(l => l !== undefined).join('\n')

  const adapter = new AntigravityAdapter()
  const raw = await adapter.execute(prompt, 'Gemini 2.5 Flash (Medium)', 'n/a')

  // Extract JSON from response (strip markdown fences if present)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null
  const jsonContent = jsonMatch ? jsonMatch[1].trim() : raw.trim()

  // R-DG-4: Save as {outputPath}.excalidraw
  const excalidrawPath = opts.outputPath.endsWith('.excalidraw')
    ? opts.outputPath
    : `${opts.outputPath}.excalidraw`

  mkdirSync(dirname(excalidrawPath), { recursive: true })
  writeFileSync(excalidrawPath, jsonContent, 'utf-8')

  return { excalidrawPath, prompt }
}
