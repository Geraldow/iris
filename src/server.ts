import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { handleDelegate, DelegateInputSchema } from './tools/delegate.js'
import { handleStatus, handleSetup } from './tools/status.js'
import { handleHistory, HistoryInputSchema } from './tools/history.js'
import { handleTask, TaskInputSchema } from './tools/task.js'
import { handleConfig, ConfigInputSchema } from './tools/config.js'

export function registerTools(server: McpServer): void {
  // iris_delegate — core orchestration tool
  server.tool(
    'iris_delegate',
    'Delegate a task to the best AI adapter based on phase and complexity',
    DelegateInputSchema.shape,
    async (input) => {
      const result = await handleDelegate(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_status — health + budget overview
  server.tool(
    'iris_status',
    'Get status of all adapters including circuit breaker state and daily budget',
    {},
    async () => {
      const result = await handleStatus({})
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_history — task execution log
  server.tool(
    'iris_history',
    'Retrieve task execution history',
    HistoryInputSchema.shape,
    async (input) => {
      const result = await handleHistory(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_task — single task detail
  server.tool(
    'iris_task',
    'Get details of a specific task by ID',
    TaskInputSchema.shape,
    async (input) => {
      const result = await handleTask(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_config — read/write configuration
  server.tool(
    'iris_config',
    'Get or update Iris configuration',
    ConfigInputSchema.shape,
    async (input) => {
      const result = await handleConfig(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_setup — verify and configure Engram per adapter
  server.tool(
    'iris_setup',
    'Verify and auto-configure Engram MCP for a given adapter',
    { adapter: z.string() },
    async (input) => {
      const result = await handleSetup(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )
}
