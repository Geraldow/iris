import { execa } from 'execa'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { BaseAdapter } from './base.js'
import type { AdapterName } from '../types/index.js'

// Full path required — agy is not on PowerShell PATH (only CMD PATH)
const AGY_BIN = join(
  process.env['LOCALAPPDATA'] ?? join(homedir(), 'AppData', 'Local'),
  'agy', 'bin', 'agy.exe'
)

const SETTINGS_PATH = join(homedir(), '.gemini', 'antigravity-cli', 'settings.json')

interface AntigravitySettings {
  model?: string
  [key: string]: unknown
}

export class AntigravityAdapter extends BaseAdapter {
  name: AdapterName = 'antigravity'

  private readSettings(): AntigravitySettings {
    try {
      return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'))
    } catch {
      return {}
    }
  }

  private setModel(model: string): AntigravitySettings {
    const settings = this.readSettings()
    const previous = { ...settings }
    settings.model = model
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
    return previous
  }

  private restoreSettings(previous: AntigravitySettings): void {
    const settings = this.readSettings()
    settings.model = previous.model
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
  }

  async execute(prompt: string, model: string, _effort: string): Promise<string> {
    // D2: no --model CLI flag — write settings.json, restore after
    const previous = this.setModel(model)

    try {
      const result = await execa(
        AGY_BIN,
        ['--print', prompt, '--dangerously-skip-permissions', '--print-timeout', '15m0s'],
        { timeout: 16 * 60 * 1000, reject: false }
      )

      if (result.exitCode !== 0) {
        throw new Error(`Antigravity exited ${result.exitCode}: ${result.stderr}`)
      }

      return result.stdout
    } finally {
      this.restoreSettings(previous)
    }
  }
}
