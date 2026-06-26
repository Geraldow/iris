import { execa } from 'execa'
import { execSync } from 'child_process'
import { BaseProvider } from './base.js'
import type { ProviderName } from '../types/index.js'

export class ClaudeProvider extends BaseProvider {
  name: ProviderName = 'claude'

  isAvailable(): boolean {
    try {
      execSync('claude --version', { encoding: 'utf-8', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  async execute(prompt: string, model: string, effort: string): Promise<string> {
    const args = ['-p', prompt, '--model', model, '--output-format', 'text']
    if (effort && effort !== 'low' && effort !== 'n/a') {
      args.push('--effort', effort)
    }

    const result = await execa('claude', args, {
      timeout: 10 * 60 * 1000,
      reject: false,
      stdin: 'ignore',
    })

    if (result.exitCode !== 0) {
      throw new Error(`Claude exited ${result.exitCode}: ${result.stderr}`)
    }

    return result.stdout
  }
}
