import { z } from 'zod'
import { getTask } from '../store/tasks.js'

export const TaskInputSchema = z.object({
  taskId: z.string().uuid(),
})

export async function handleTask(input: unknown): Promise<object> {
  const { taskId } = TaskInputSchema.parse(input)
  const task = getTask(taskId)
  if (!task) throw new Error(`Task not found: ${taskId}`)
  return task
}
