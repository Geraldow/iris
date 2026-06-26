import type { IProvider } from '../types/index.js'

export interface SubprocessResult {
  output: string
  durationMs: number
}

export async function runSubprocess(
  provider: IProvider,
  prompt: string,
  model: string,
  effort: string,
): Promise<SubprocessResult> {
  const start = Date.now()
  const output = await provider.execute(prompt, model, effort)
  return { output, durationMs: Date.now() - start }
}
