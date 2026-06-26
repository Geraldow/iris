import { z } from 'zod'
import { listTasks } from '../store/tasks.js'

export const HistoryInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  phase: z.string().optional(),
  provider: z.string().optional(),
  // Legacy alias for backward compatibility
  adapter: z.string().optional(),
})

export async function handleHistory(input: unknown): Promise<object> {
  const { limit, phase, provider, adapter } = HistoryInputSchema.parse(input)
  const providerFilter = provider ?? adapter
  const tasks = listTasks({ limit: limit ?? 20, phase, provider: providerFilter })
    .map(({ prompt: _omit, ...task }) => task)
  return { tasks, count: tasks.length }
}
