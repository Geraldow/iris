import type { IAdapter, AdapterName } from '../types/index.js'

export abstract class BaseAdapter implements IAdapter {
  abstract name: AdapterName

  abstract execute(prompt: string, model: string, effort: string): Promise<string>

  isAvailable(): boolean {
    return true
  }
}
