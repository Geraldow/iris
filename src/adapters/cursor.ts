import { execa } from 'execa'
import { execSync } from 'child_process'
import { BaseAdapter } from './base.js'
import type { AdapterName } from '../types/index.js'

export class CursorAdapter extends BaseAdapter {
  name: AdapterName = 'cursor'

  isAvailable(): boolean {
    try {
      execSync('cursor --version', { encoding: 'utf-8', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  async execute(prompt: string, model: string, _effort: string): Promise<string> {
    const result = await execa('cursor', ['agent', '--model', model, prompt], {
      timeout: 10 * 60 * 1000,
      reject: false,
    })

    if (result.exitCode !== 0) {
      throw new Error(`Cursor agent exited ${result.exitCode}: ${result.stderr}`)
    }

    return result.stdout
  }
}
