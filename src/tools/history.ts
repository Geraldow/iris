import { z } from 'zod'
import { listTasks } from '../store/tasks.js'

export const HistoryInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  phase: z.string().optional(),
  adapter: z.string().optional(),
})

export async function handleHistory(input: unknown): Promise<object> {
  const { limit, phase, adapter } = HistoryInputSchema.parse(input)
  const tasks = listTasks({ limit: limit ?? 20, phase, adapter })
  return { tasks, count: tasks.length }
}
