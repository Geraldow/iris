import type { IAdapter } from '../types/index.js'

export interface SubprocessResult {
  output: string
  durationMs: number
}

export async function runSubprocess(
  adapter: IAdapter,
  prompt: string,
  model: string,
  effort: string,
): Promise<SubprocessResult> {
  const start = Date.now()
  const output = await adapter.execute(prompt, model, effort)
  return { output, durationMs: Date.now() - start }
}
