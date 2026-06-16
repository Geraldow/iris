import { execa } from 'execa'
import { BaseAdapter } from './base.js'
import type { AdapterName } from '../types/index.js'

export class CodexAdapter extends BaseAdapter {
  name: AdapterName = 'codex'

  async execute(prompt: string, model: string, effort: string): Promise<string> {
    const result = await execa(
      'codex',
      ['exec', '-m', model, '-c', `reasoning_effort="${effort}"`],
      { input: prompt, timeout: 15 * 60 * 1000, reject: false }
    )

    if (result.exitCode !== 0) {
      throw new Error(`Codex exited ${result.exitCode}: ${result.stderr}`)
    }

    return result.stdout
  }
}
