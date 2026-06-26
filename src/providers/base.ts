import type { IProvider, ProviderName } from '../types/index.js'

export abstract class BaseProvider implements IProvider {
  abstract name: ProviderName

  abstract execute(prompt: string, model: string, effort: string): Promise<string>

  isAvailable(): boolean {
    return true
  }
}
