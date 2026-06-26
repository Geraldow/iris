import { execa } from 'execa'
import { execSync } from 'child_process'
import { BaseProvider } from './base.js'
import type { ProviderName } from '../types/index.js'

const PRIMARY_MODEL = 'opencode/big-pickle'
const FALLBACK_MODEL = 'opencode/deepseek-v4-flash-free'

function resolveModel(model: string): string {
  if (model.startsWith('opencode/') || model.startsWith('openrouter/')) {
    return model
  }
  return PRIMARY_MODEL
}

export class OpenCodeProvider extends BaseProvider {
  name: ProviderName = 'opencode'

  isAvailable(): boolean {
    try {
      execSync('opencode --version', { encoding: 'utf-8', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  async execute(prompt: string, model: string, _effort: string): Promise<string> {
    const resolvedModel = resolveModel(model)

    const result = await execa('opencode', ['run', '--model', resolvedModel, prompt], {
      timeout: 10 * 60 * 1000,
      reject: false,
    })

    if (result.exitCode !== 0) {
      throw new Error(`OpenCode exited ${result.exitCode}: ${result.stderr}`)
    }

    return result.stdout
  }
}
