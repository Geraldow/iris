import { getEngramClient } from './client.js'

type McpTextResult = { content?: Array<{ type: string; text: string }> }

function extractText(result: unknown): string {
  const typed = result as McpTextResult
  return typed?.content?.[0]?.text ?? JSON.stringify(result)
}

export async function waitForEngramCompletion(taskId: string, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs
  const statusKey = `iris/task/${taskId}/status`
  const outputKey = `iris/task/${taskId}/output`

  while (Date.now() < deadline) {
    try {
      const client = await getEngramClient()
      const statusResult = await client.callTool({
        name: 'mem_search',
        arguments: { query: statusKey, project: 'iris' },
      })
      const statusText = extractText(statusResult)
      if (statusText.includes('DONE') && statusText.includes(taskId)) {
        const outputResult = await client.callTool({
          name: 'mem_search',
          arguments: { query: outputKey, project: 'iris' },
        })
        return extractText(outputResult)
      }
    } catch {
      // Engram temporarily unavailable — keep polling
    }
    await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error(`Engram IPC timeout after ${timeoutMs}ms for task ${taskId}`)
}

export interface SaveResultOptions {
  taskId: string
  phase: string
  adapter: string
  change?: string
  project?: string
  content: string
}

export async function saveResult(opts: SaveResultOptions): Promise<number | undefined> {
  try {
    const client = await getEngramClient()
    const topicKey = `iris/${opts.project ?? 'default'}/${opts.change ?? opts.taskId}/${opts.phase}/${opts.adapter}`

    const result = await client.callTool({
      name: 'mem_save',
      arguments: {
        title: topicKey,
        topic_key: topicKey,
        type: 'manual',
        project: opts.project ?? 'iris',
        content: opts.content,
      },
    })

    const text = extractText(result)
    const match = text.match(/"id"\s*:\s*(\d+)/)
    return match ? parseInt(match[1], 10) : undefined
  } catch {
    return undefined
  }
}

export async function getObservation(id: number): Promise<string | null> {
  try {
    const client = await getEngramClient()
    const result = await client.callTool({
      name: 'mem_get_observation',
      arguments: { id },
    })
    const text = extractText(result)
    const match = text.match(/"result"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
    return match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : null
  } catch {
    return null
  }
}

export async function saveTaskPrompt(
  taskId: string,
  prompt: string,
): Promise<number | undefined> {
  try {
    const client = await getEngramClient()
    const topicKey = `iris/task/${taskId}/prompt`
    const content = `${prompt}\n\n---\nWhen you finish, perform these two mem_save calls IN ORDER:\n1. Save your complete output:\n   topic_key: "iris/task/${taskId}/output"\n   title: "iris/task/${taskId}/output"\n   content: [your full response]\n   project: "iris"\n   type: "manual"\n2. Signal completion (LAST action):\n   topic_key: "iris/task/${taskId}/status"\n   title: "iris/task/${taskId}/status"\n   content: "DONE:${taskId}"\n   project: "iris"\n   type: "manual"\nThe status save MUST be the final step — iris polls this key to know you are done.`

    const result = await client.callTool({
      name: 'mem_save',
      arguments: {
        title: topicKey,
        topic_key: topicKey,
        type: 'manual',
        project: 'iris',
        content,
      },
    })
    const text = extractText(result)
    const match = text.match(/"id"\s*:\s*(\d+)/)
    return match ? parseInt(match[1], 10) : undefined
  } catch {
    return undefined
  }
}

export async function searchMemory(query: string, project = 'iris'): Promise<string | null> {
  try {
    const client = await getEngramClient()
    const result = await client.callTool({
      name: 'mem_search',
      arguments: { query, project },
    })
    return JSON.stringify(result)
  } catch {
    return null
  }
}
