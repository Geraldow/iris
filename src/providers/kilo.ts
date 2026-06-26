import { execa } from 'execa'
import { execSync } from 'child_process'
import { BaseProvider } from './base.js'
import type { ProviderName } from '../types/index.js'

export class KiloProvider extends BaseProvider {
  name: ProviderName = 'kilo'

  isAvailable(): boolean {
    try {
      execSync('kilocode --version', { encoding: 'utf-8', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  async execute(prompt: string, model: string, _effort: string): Promise<string> {
    const result = await execa('kilocode', ['--model', model, prompt], {
      timeout: 10 * 60 * 1000,
      reject: false,
    })

    if (result.exitCode !== 0) {
      throw new Error(`Kilo exited ${result.exitCode}: ${result.stderr}`)
    }

    return result.stdout
  }
}
