import { execa } from 'execa'
import { BaseAdapter } from './base.js'
import type { AdapterName } from '../types/index.js'

export class ClaudeAdapter extends BaseAdapter {
  name: AdapterName = 'claude'

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
