import { execa } from 'execa'
import { BaseAdapter } from './base.js'
import type { AdapterName } from '../types/index.js'

export class CopilotAdapter extends BaseAdapter {
  name: AdapterName = 'copilot'

  async execute(prompt: string, model: string, effort: string): Promise<string> {
    const result = await execa(
      'gh',
      ['copilot', '-p', prompt, '--model', model, '--reasoning-effort', effort],
      { timeout: 10 * 60 * 1000, reject: false }
    )

    if (result.exitCode !== 0) {
      throw new Error(`Copilot exited ${result.exitCode}: ${result.stderr}`)
    }

    return result.stdout
  }
}
