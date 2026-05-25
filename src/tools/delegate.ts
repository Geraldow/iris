import { randomUUID } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'
import { scoreComplexity } from '../router/classifier.js'
import { selectAdapter, ANTIGRAVITY_MODELS } from '../router/selector.js'
import { isAvailable, recordFailure, recordSuccess } from '../router/circuit-breaker.js'
import { isOverBudget, recordUsage } from '../store/budgets.js'
import { createTask, completeTask, failTask, updateTask } from '../store/tasks.js'
import { getConfig } from '../config.js'
import { getObservation, saveResult } from '../engram/sync.js'
import { ClaudeAdapter } from '../adapters/claude.js'
import { AntigravityAdapter } from '../adapters/antigravity.js'
import { CopilotAdapter } from '../adapters/copilot.js'
import { CodexAdapter } from '../adapters/codex.js'
import { homedir } from 'os'
import { runSubprocess } from '../executor/subprocess.js'
import { runInTerminal } from '../executor/terminal.js'
import { saveTaskPrompt } from '../engram/sync.js'
import type { IAdapter, AdapterName, DelegateRequest, DelegateResult, PendingPlan } from '../types/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROMPTS_DIR = join(__dirname, '../../../iris/prompts')

// D4: Two-phase commit token store (in-memory, expires with process)
const pendingTokens = new Map<string, { plan: PendingPlan; expiresAt: number; request: DelegateRequest }>()
const TOKEN_TTL_MS = 10 * 60 * 1000

export const DelegateInputSchema = z.object({
  phase: z.enum(['explore', 'propose', 'spec', 'design', 'tasks', 'apply', 'verify', 'report', 'document']),
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
})

const ADAPTERS: Record<AdapterName, IAdapter> = {
  claude: new ClaudeAdapter(),
  antigravity: new AntigravityAdapter(),
  copilot: new CopilotAdapter(),
  codex: new CodexAdapter(),
}

function loadTemplate(phase: string): string {
  const templatePath = join(PROMPTS_DIR, `${phase}.md`)
  if (existsSync(templatePath)) return readFileSync(templatePath, 'utf-8')
  // Fallback to meta.md
  const metaPath = join(PROMPTS_DIR, 'meta.md')
  if (existsSync(metaPath)) return readFileSync(metaPath, 'utf-8')
  return ''
}

async function buildPrompt(req: DelegateRequest): Promise<string> {
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

  // Language detection: respond in the same language as the instruction
  prompt += `\n\n---\nDetect the language of the instruction above and respond entirely in that language. If the instruction is in Spanish, respond in Spanish. If in English, respond in English.`

  return prompt
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

  // --- Score complexity & select adapter ---
  const score = scoreComplexity(req)
  const selection = selectAdapter(
    req.phase,
    score.level,
    req.override ? undefined : undefined,
    req.override?.model,
    req.override?.effort,
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
      adapter: selection.primary,
      model: selection.model,
      effort: selection.effort,
      complexity: score.level,
      prompt: await buildPrompt(req),
    }
    pendingTokens.set(confirmToken, { plan, expiresAt: Date.now() + TOKEN_TTL_MS, request: req })

    return {
      taskId: randomUUID(),
      adapter: selection.primary,
      model: selection.model,
      effort: selection.effort,
      complexity: score.level,
      status: 'pending_confirmation',
      plan,
      confirm_token: confirmToken,
    }
  }

  const plan: PendingPlan = {
    adapter: selection.primary,
    model: selection.model,
    effort: selection.effort,
    complexity: score.level,
    prompt: await buildPrompt(req),
  }

  return executeTask(req, plan)
}

async function executeTask(req: DelegateRequest, plan: PendingPlan): Promise<DelegateResult> {
  // --- Circuit breaker + budget check with fallback ---
  let adapterName = plan.adapter
  if (!isAvailable(adapterName) || isOverBudget(adapterName)) {
    const { fallback } = selectAdapter(req.phase, plan.complexity)
    if (!fallback || !isAvailable(fallback) || isOverBudget(fallback)) {
      throw new Error(`All adapters unavailable or over budget for phase=${req.phase}`)
    }
    adapterName = fallback
  }

  const adapter = ADAPTERS[adapterName]
  const task = createTask({
    adapter: adapterName,
    phase: req.phase,
    complexity: plan.complexity,
    prompt: plan.prompt,
  })

  updateTask(task.id, { status: 'running' })
  const start = Date.now()

  // fire_and_forget: launch terminal without awaiting — return immediately with status "running"
  if (req.fire_and_forget && adapterName === 'antigravity') {
    saveTaskPrompt(task.id, plan.prompt).then(obsId => {
      if (!obsId) { failTask(task.id, 'Failed to save task prompt to Engram'); return }
      runInTerminal(task.id, obsId, plan.model, 16 * 60 * 1000)
        .then(result => saveResult({
          taskId: task.id, phase: req.phase, adapter: adapterName,
          change: req.change, project: 'iris', content: result.output,
        }).then(engramId => {
          recordSuccess(adapterName)
          completeTask(task.id, result.output, engramId)
        }))
        .catch(err => {
          recordFailure(adapterName)
          failTask(task.id, err instanceof Error ? err.message : String(err))
        })
    }).catch(err => failTask(task.id, err instanceof Error ? err.message : String(err)))

    return {
      taskId: task.id,
      adapter: adapterName,
      model: plan.model,
      effort: plan.effort,
      complexity: plan.complexity,
      status: 'done' as const,
      summary: `Running in background. Check status with iris_task("${task.id}")`,
    }
  }

  try {
    let output: string

    if (adapterName === 'antigravity') {
      const obsId = await saveTaskPrompt(task.id, plan.prompt)
      if (!obsId) throw new Error('Failed to save task prompt to Engram')
      const result = await runInTerminal(task.id, obsId, plan.model, 16 * 60 * 1000)
      output = result.output
    } else {
      const result = await runSubprocess(adapter, plan.prompt, plan.model, plan.effort)
      output = result.output
    }

    const durationMs = Date.now() - start

    // Save to Engram
    const engramId = await saveResult({
      taskId: task.id,
      phase: req.phase,
      adapter: adapterName,
      change: req.change,
      project: 'iris',
      content: output,
    })

    recordSuccess(adapterName)
    completeTask(task.id, output, engramId)

    // Return only a brief summary to keep Claude's context thin.
    // Full content is in Engram at engramId — fetch with mem_get_observation if needed.
    const firstLine = output.split('\n').find(l => l.trim().length > 0) ?? ''
    const summary = firstLine.length > 200 ? firstLine.slice(0, 200) + '…' : firstLine

    return {
      taskId: task.id,
      adapter: adapterName,
      model: plan.model,
      effort: plan.effort,
      complexity: plan.complexity,
      engramId,
      duration_ms: durationMs,
      status: 'done',
      summary,
    }
  } catch (err) {
    recordFailure(adapterName)
    const msg = err instanceof Error ? err.message : String(err)
    failTask(task.id, msg)
    return {
      taskId: task.id,
      adapter: adapterName,
      model: plan.model,
      effort: plan.effort,
      complexity: plan.complexity,
      duration_ms: Date.now() - start,
      status: 'failed',
      error: msg,
    }
  }
}
