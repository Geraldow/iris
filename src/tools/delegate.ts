import { randomUUID } from 'crypto'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'
import { scoreComplexity } from '../router/classifier.js'
import { selectProvider, ANTIGRAVITY_MODELS } from '../router/selector.js'
import { isAvailable, recordFailure, recordSuccess } from '../router/circuit-breaker.js'
import { isOverBudget, recordUsage } from '../store/budgets.js'
import { createTask, completeTask, failTask, updateTask } from '../store/tasks.js'
import { getConfig } from '../config.js'
import { getObservation, saveResult } from '../engram/sync.js'
import { ClaudeProvider } from '../providers/claude.js'
import { AntigravityProvider } from '../providers/antigravity.js'
import { CopilotProvider } from '../providers/copilot.js'
import { CodexProvider } from '../providers/codex.js'
import { KiloProvider } from '../providers/kilo.js'
import { CursorProvider } from '../providers/cursor.js'
import { OpenCodeProvider } from '../providers/opencode.js'
import { homedir } from 'os'
import { buildTaskPreamble } from '../context/slim-md.js'
import { runSubprocess } from '../executor/subprocess.js'
import { runInTerminal } from '../executor/terminal.js'
import { saveTaskPrompt } from '../engram/sync.js'
import { buildOdooContext, formatOdooContextForPrompt } from '../context/odoo.js'
import { detectTaskType } from '../context/odoo-selector.js'
import { detectSkills, extractFilePath } from '../context/context-detector.js'
import { injectKnowledgeContext } from '../context/rules.js'
import { generateDiagram } from '../diagrams/generator.js'
import type { IProvider, ProviderName, OdooTaskType, DelegateRequest, DelegateResult, PendingPlan } from '../types/index.js'

function extractAgyOutput(raw: string): string {
  try {
    const parsed = JSON.parse(raw.trim())
    if (parsed && typeof parsed.result === 'string') return parsed.result
  } catch { /* not JSON — return raw */ }
  return raw
}

function getPackageRoot(): string {
  try {
    return join(fileURLToPath(import.meta.url), '..', '..')
  } catch {
    return dirname(process.execPath)
  }
}
const PACKAGE_ROOT = getPackageRoot()
// Resolved relative to src/tools/delegate.ts → ../../ = package root → prompts/
const PROMPTS_DIR = join(PACKAGE_ROOT, 'prompts')

// D4: Two-phase commit token store (in-memory, expires with process)
const pendingTokens = new Map<string, { plan: PendingPlan; expiresAt: number; request: DelegateRequest }>()
const TOKEN_TTL_MS = 10 * 60 * 1000

export const DelegateInputSchema = z.object({
  phase: z.enum(['explore', 'propose', 'spec', 'design', 'tasks', 'apply', 'verify', 'archive']),
  instruction: z.string().min(1),
  change: z.string().optional(),
  contextIds: z.array(z.number()).optional(),
  deliverable: z.string().optional(),
  outputPath: z.string().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  dry_run: z.boolean().optional(),
  fire_and_forget: z.boolean().optional(),
  confirm: z.string().optional(),
  override: z.object({ model: z.string().optional(), effort: z.string().optional() }).optional(),
  provider: z.enum(['claude', 'antigravity', 'copilot', 'codex', 'kilo', 'cursor', 'opencode']).optional().describe('Force a specific AI provider. If omitted, iris auto-selects based on phase and task type.'),
})

const PROVIDERS = {
  claude: new ClaudeProvider(),
  antigravity: new AntigravityProvider(),
  copilot: new CopilotProvider(),
  codex: new CodexProvider(),
  kilo: new KiloProvider(),
  cursor: new CursorProvider(),
  opencode: new OpenCodeProvider(),
} as unknown as Record<ProviderName, IProvider>

function loadTemplate(phase: string): string {
  const templatePath = join(PROMPTS_DIR, `${phase}.md`)
  if (existsSync(templatePath)) return readFileSync(templatePath, 'utf-8')
  // Fallback to meta.md
  const metaPath = join(PROMPTS_DIR, 'meta.md')
  if (existsSync(metaPath)) return readFileSync(metaPath, 'utf-8')
  return ''
}

async function buildPrompt(req: DelegateRequest, odooTaskType?: OdooTaskType): Promise<string> {
  const template = loadTemplate(`sdd-${req.phase}`)

  // Fetch contextIds from Engram
  let contextContent = ''
  if (req.contextIds && req.contextIds.length > 0) {
    const observations = await Promise.all(
      req.contextIds.map(id => getObservation(id).catch(() => null))
    )
    contextContent = observations
      .filter(Boolean)
      .map((obs, i) => `### Context ${req.contextIds![i]}\n${obs}`)
      .join('\n\n')
  }

  // Substitute template variables
  let prompt = template
    .replace(/\{phase\}/g, req.phase)
    .replace(/\{change\}/g, req.change ?? '')
    .replace(/\{instruction\}/g, req.instruction)
    .replace(/\{deliverable\}/g, req.deliverable ?? '')
    .replace(/\{contextIds\}/g, contextContent)
    .replace(/\{outputPath\}/g, req.outputPath ?? '')

  // Append raw instruction + context if no template substitution happened
  if (!template || prompt === template) {
    prompt = req.instruction
    if (contextContent) prompt += `\n\n${contextContent}`
    if (req.deliverable) prompt += `\n\nExpected deliverable: ${req.deliverable}`
  }

  // Odoo context injection
  try {
    const odooCtx = await buildOdooContext(req.instruction)
    if (odooCtx) {
      prompt += `\n\n${formatOdooContextForPrompt(odooCtx)}`
    }
    if (odooTaskType) {
      const knowledge = injectKnowledgeContext(odooTaskType)
      if (knowledge) prompt += `\n\n${knowledge}`
    }
  } catch { /* non-Odoo project — skip silently */ }

  // Detected skills section
  if (req.detectedSkills && req.detectedSkills.length > 0) {
    const primarySkills = req.detectedSkills.filter(s => s.confidence >= 0.8)
    if (primarySkills.length > 0) {
      prompt += `\n\n## Detected Skills (auto-loaded)\n`
      prompt += primarySkills.map(s =>
        `- **${s.name}** (confidence: ${s.confidence})`
      ).join('\n')
      prompt += '\n'
    }
  }

  // Language detection: respond in the same language as the instruction
  prompt += `\n\n---\nDetect the language of the instruction above and respond entirely in that language. If the instruction is in Spanish, respond in Spanish. If in English, respond in English.`

  return buildTaskPreamble(req.phase, odooTaskType) + '\n\n' + prompt
}

async function triggerHumanFirstDoc(
  output: string,
  phase: string,
  change: string | undefined,
  taskType: OdooTaskType | undefined,
): Promise<void> {
  const docTemplate = loadTemplate(`docs/sdd-${phase}`)
  if (!docTemplate) return

  const prompt = docTemplate
    .replace(/\{phase\}/g, phase)
    .replace(/\{work_output\}/g, output.slice(0, 8000))
    .replace(/\{task_type\}/g, taskType ?? 'general')
    .replace(/\{change\}/g, change ?? 'unknown')

  const provider = PROVIDERS['antigravity']
  const model = 'Gemini 3.5 Flash (Medium)'
  const docContent = await provider.execute(prompt, model, 'n/a')

  // R-HF-5: save .md to docs/sdd/{change}/{phase}.md
  const changeName = change ?? 'unknown'
  const docsDir = join(PACKAGE_ROOT, 'docs', 'sdd', changeName)
  mkdirSync(docsDir, { recursive: true })
  writeFileSync(join(docsDir, `${phase}.md`), docContent, 'utf-8')
}

export async function handleDelegate(input: unknown): Promise<DelegateResult> {
  const req = DelegateInputSchema.parse(input) as DelegateRequest
  const config = getConfig()

  // --- Two-phase commit: confirmation path ---
  if (req.confirm) {
    const pending = pendingTokens.get(req.confirm)
    if (!pending) throw new Error('confirm_token invalid or expired')
    if (Date.now() > pending.expiresAt) {
      pendingTokens.delete(req.confirm)
      throw new Error('confirm_token expired (10 minute TTL)')
    }
    pendingTokens.delete(req.confirm)
    return executeTask({ ...pending.request, complexity: pending.plan.complexity }, pending.plan)
  }

  // --- Detect Odoo task type (if applicable) ---
  const odooDetected = detectTaskType(req.instruction)
  const odooTaskType = odooDetected?.type

  // --- Context Detection (auto-detect skills based on phase, instruction, task type) ---
  const ctxDetected = detectSkills({
    phase: req.phase,
    instruction: req.instruction,
    filePath: extractFilePath(req.instruction),
    taskType: odooTaskType,
  })
  req.detectedSkills = ctxDetected.all

  // --- Score complexity & select provider ---
  const score = scoreComplexity(req)
  const selection = selectProvider(
    req.phase,
    score.level,
    req.provider,
    req.override?.model,
    req.override?.effort,
    odooTaskType,
  )

  // --- Two-phase commit: HIGH complexity gate ---
  const threshold = config.confirm_threshold
  if (
    threshold !== 'never' &&
    score.level === threshold &&
    !req.dry_run
  ) {
    const confirmToken = randomUUID()
    const plan: PendingPlan = {
      provider: selection.primary,
      model: selection.model,
      effort: selection.effort,
      complexity: score.level,
      prompt: await buildPrompt(req, odooTaskType),
    }
    pendingTokens.set(confirmToken, { plan, expiresAt: Date.now() + TOKEN_TTL_MS, request: req })

    return {
      taskId: randomUUID(),
      provider: selection.primary,
      model: selection.model,
      effort: selection.effort,
      complexity: score.level,
      status: 'pending_confirmation',
      plan,
      confirm_token: confirmToken,
    }
  }

  const plan: PendingPlan = {
    provider: selection.primary,
    model: selection.model,
    effort: selection.effort,
    complexity: score.level,
    prompt: await buildPrompt(req, odooTaskType),
  }

  if (req.dry_run) {
    return {
      taskId: 'dry-run',
      provider: plan.provider,
      model: plan.model,
      effort: plan.effort,
      complexity: plan.complexity,
      status: 'dry_run',
      plan,
    }
  }

  return executeTask(req, plan, odooTaskType)
}

async function executeTask(req: DelegateRequest, plan: PendingPlan, odooTaskType?: OdooTaskType): Promise<DelegateResult> {
  // --- Circuit breaker + budget + enabled check with fallback ---
  let providerName = plan.provider
  const cfg = getConfig()
  const providersCfg = cfg.providers ?? (cfg as unknown as Record<string, unknown>)['adapters'] as typeof cfg.providers ?? {}
  const isEnabled = (name: ProviderName) => providersCfg[name]?.enabled !== false
  if (!isEnabled(providerName) || !isAvailable(providerName) || isOverBudget(providerName)) {
    const { fallback } = selectProvider(req.phase, plan.complexity, req.provider, undefined, undefined, odooTaskType)
    if (!fallback || !isEnabled(fallback) || !isAvailable(fallback) || isOverBudget(fallback)) {
      throw new Error(`All providers unavailable or over budget for phase=${req.phase}`)
    }
    providerName = fallback
  }

  const provider = PROVIDERS[providerName]
  const task = createTask({
    provider: providerName,
    phase: req.phase,
    complexity: plan.complexity,
    prompt: plan.prompt,
  })

  updateTask(task.id, { status: 'running' })
  const start = Date.now()

  // fire_and_forget: launch terminal without awaiting — return immediately with status "running"
  if (req.fire_and_forget && providerName === 'antigravity') {
    saveTaskPrompt(task.id, plan.prompt).then(obsId => {
      if (!obsId) { failTask(task.id, 'Failed to save task prompt to Engram'); return }
      runInTerminal(task.id, obsId, plan.model, 16 * 60 * 1000)
        .then(result => saveResult({
          taskId: task.id, phase: req.phase, provider: providerName,
          change: req.change, project: 'iris', content: extractAgyOutput(result.output),
        }).then(engramId => {
          recordSuccess(providerName)
          completeTask(task.id, extractAgyOutput(result.output), engramId)
        }))
        .catch(err => {
          recordFailure(providerName)
          failTask(task.id, err instanceof Error ? err.message : String(err))
        })
    }).catch(err => failTask(task.id, err instanceof Error ? err.message : String(err)))

    return {
      taskId: task.id,
      provider: providerName,
      model: plan.model,
      effort: plan.effort,
      complexity: plan.complexity,
      status: 'running' as const,
      summary: `Running in background. Check status with iris_task("${task.id}")`,
    }
  }

  const startTime = new Date()

  try {
    let output: string

    if (providerName === 'antigravity') {
      const obsId = await saveTaskPrompt(task.id, plan.prompt)
      if (!obsId) throw new Error('Failed to save task prompt to Engram')
      const result = await runInTerminal(task.id, obsId, plan.model, 16 * 60 * 1000)
      output = extractAgyOutput(result.output)
    } else {
      const result = await runSubprocess(provider, plan.prompt, plan.model, plan.effort)
      output = result.output
    }

    const durationMs = Date.now() - start

    // Save to Engram
    const engramId = await saveResult({
      taskId: task.id,
      phase: req.phase,
      provider: providerName,
      change: req.change,
      project: 'iris',
      content: output,
    })

    recordSuccess(providerName)
    completeTask(task.id, output, engramId)

    // outputPath is passed to the provider via the prompt template — the provider writes
    // the file directly with its own tools (Write/Edit). iris does NOT overwrite here
    // because the provider's stdout is a conversational summary, not the file content.

    // Auto-generate excalidraw diagram on design phase (fire-and-forget)
    if (req.phase === 'design' && req.change) {
      const diagramOutputPath = join(PACKAGE_ROOT, 'docs', 'sdd', req.change, 'design-arch')
      generateDiagram({
        template: 'sdd-architecture',
        context: output.slice(0, 6000),
        outputPath: diagramOutputPath,
        changeName: req.change,
      }).catch(err =>
        console.warn('[diagram] skipped:', (err as Error).message)
      )
    }

    // Human First documentation — fire-and-forget (non-blocking)
    triggerHumanFirstDoc(output, req.phase, req.change, odooTaskType).catch(err =>
      console.warn('[human-first] doc generation skipped:', (err as Error).message)
    )

    // Return only a brief summary to keep Claude's context thin.
    // Full content is in Engram at engramId — fetch with mem_get_observation if needed.
    const firstLine = output.split('\n').find(l => l.trim().length > 0) ?? ''
    const summary = firstLine.length > 200 ? firstLine.slice(0, 200) + '…' : firstLine

    return {
      taskId: task.id,
      provider: providerName,
      model: plan.model,
      effort: plan.effort,
      complexity: plan.complexity,
      engramId,
      duration_ms: durationMs,
      startedAt: startTime.toISOString(),
      completedAt: new Date().toISOString(),
      status: 'done',
      summary,
    }
  } catch (err) {
    recordFailure(providerName)
    const msg = err instanceof Error ? err.message : String(err)
    failTask(task.id, msg)
    return {
      taskId: task.id,
      provider: providerName,
      model: plan.model,
      effort: plan.effort,
      complexity: plan.complexity,
      duration_ms: Date.now() - start,
      status: 'failed',
      error: msg,
    }
  }
}
