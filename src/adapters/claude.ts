import { execa } from 'execa'
import { execSync } from 'child_process'
import { BaseAdapter } from './base.js'
import type { AdapterName } from '../types/index.js'

export class ClaudeAdapter extends BaseAdapter {
  name: AdapterName = 'claude'

  isAvailable(): boolean {
    try {
      execSync('claude --version', { encoding: 'utf-8', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  async execute(prompt: string, model: string, effort: string): Promise<string> {
    const args = ['-p', prompt, '--model', model, '--effort', effort, '--output-format', 'text']

    const result = await execa('claude', args, {
      timeout: 10 * 60 * 1000,
      reject: false,
    })

    if (result.exitCode !== 0) {
      throw new Error(`Claude exited ${result.exitCode}: ${result.stderr}`)
    }

    return result.stdout
  }
}
