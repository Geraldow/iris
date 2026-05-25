import { join } from 'path'
import { homedir } from 'os'
import { readFileSync, writeFileSync } from 'fs'
import { execa } from 'execa'
import { waitForEngramCompletion } from '../engram/sync.js'

const AGY_SETTINGS = join(homedir(), '.gemini', 'antigravity-cli', 'settings.json')

// Full path required — agy is not on PowerShell PATH (only CMD PATH)
const AGY_BIN = join(
  process.env['LOCALAPPDATA'] ?? join(homedir(), 'AppData', 'Local'),
  'agy', 'bin', 'agy.exe'
)

export interface TerminalResult {
  output: string
  durationMs: number
}

function swapModel(model: string): string | null {
  try {
    const settings = JSON.parse(readFileSync(AGY_SETTINGS, 'utf-8'))
    const previous: string = settings.model ?? null
    settings.model = model
    writeFileSync(AGY_SETTINGS, JSON.stringify(settings, null, 2), 'utf-8')
    return previous
  } catch {
    return null
  }
}

function restoreModel(model: string | null): void {
  if (!model) return
  try {
    const settings = JSON.parse(readFileSync(AGY_SETTINGS, 'utf-8'))
    settings.model = model
    writeFileSync(AGY_SETTINGS, JSON.stringify(settings, null, 2), 'utf-8')
  } catch {
    // Non-fatal
  }
}

export async function runInTerminal(
  taskId: string,
  obsId: number,
  model: string,
  timeoutMs = 15 * 60 * 1000,
): Promise<TerminalResult> {
  // All values are ASCII-safe: obsId is integer, paths contain no Unicode.
  // Full prompt lives in Engram; agy reads it via mem_get_observation(obsId).
  const instruction = `Execute obs ${obsId} from Engram using mem_get_observation(${obsId}) and follow the instructions exactly.`

  const previousModel = swapModel(model)

  // -EncodedCommand (Base64 UTF-16LE): wt treats ';' as tab separator, so we can't
  // use -Command with semicolons. Encoding hides all special chars from wt.
  const psScript = [
    `& '${AGY_BIN}' '--print' '${instruction}' '--dangerously-skip-permissions' '--print-timeout' '15m0s'`,
    `Write-Host ''`,
    `Write-Host 'Task complete. Window closes in 60 seconds...'`,
    `Start-Sleep 60`,
  ].join('; ')
  const encoded = Buffer.from(psScript, 'utf16le').toString('base64')

  const start = Date.now()

  await execa('wt', [
    'new-tab', '--',
    'powershell', '-EncodedCommand', encoded,
  ], { reject: false })

  // Poll Engram for completion signal — agy writes to iris/task/{taskId}/status when done
  const output = await waitForEngramCompletion(taskId, timeoutMs)
  restoreModel(previousModel)
  return { output, durationMs: Date.now() - start }
}
