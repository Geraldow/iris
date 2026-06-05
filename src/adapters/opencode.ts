import { execa } from 'execa'
import { execSync } from 'child_process'
import { BaseAdapter } from './base.js'
import type { AdapterName } from '../types/index.js'

// Only OpenCode Zen models are supported (no OpenRouter authentication)
const ZEN_DEFAULT = 'opencode/zen'
const ZEN_PREFIX = 'opencode/'

function resolveModel(model: string): string {
  if (model.startsWith('openrouter/') || !model.startsWith(ZEN_PREFIX)) {
    return ZEN_DEFAULT
  }
  return model
}

export class OpenCodeAdapter extends BaseAdapter {
  name: AdapterName = 'opencode'

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
