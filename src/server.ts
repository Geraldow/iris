import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { handleDelegate, DelegateInputSchema } from './tools/delegate.js'
import { handleStatus, handleSetup } from './tools/status.js'
import { handleHistory, HistoryInputSchema } from './tools/history.js'
import { handleTask, TaskInputSchema } from './tools/task.js'
import { handleConfig, ConfigInputSchema } from './tools/config.js'
import {
  handleDiscover, DiscoverInputSchema,
  handleLogs, LogsInputSchema,
  handlePsql, PsqlInputSchema,
  handleStatus as handleOdooStatus, StatusInputSchema,
  handleBackups, BackupsInputSchema,
} from './tools/odoo-sh.js'

export function registerTools(server: McpServer): void {
  // iris_delegate — core orchestration tool
  server.tool(
    'delegate',
    'Delegate a task to the best AI adapter based on phase and complexity',
    DelegateInputSchema.shape,
    async (input) => {
      const result = await handleDelegate(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_status — health + budget overview
  server.tool(
    'status',
    'Get status of all adapters including circuit breaker state and daily budget',
    {},
    async () => {
      const result = await handleStatus({})
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_history — task execution log
  server.tool(
    'history',
    'Retrieve task execution history',
    HistoryInputSchema.shape,
    async (input) => {
      const result = await handleHistory(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_task — single task detail
  server.tool(
    'task',
    'Get details of a specific task by ID',
    TaskInputSchema.shape,
    async (input) => {
      const result = await handleTask(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_config — read/write configuration
  server.tool(
    'config',
    'Get or update Iris configuration',
    ConfigInputSchema.shape,
    async (input) => {
      const result = await handleConfig(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_setup — verify and configure Engram per adapter
  server.tool(
    'setup',
    'Verify and auto-configure Engram MCP for a given adapter',
    { adapter: z.string() },
    async (input) => {
      const result = await handleSetup(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // --- Odoo.sh tools ---

  // iris_odoo_sh_discover — dynamic SSH build discovery
  server.tool(
    'odoo_sh_discover',
    'Discover Odoo.sh SSH build URLs via API. Never hardcode build URLs.',
    DiscoverInputSchema.shape,
    async (input) => {
      const result = await handleDiscover(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_odoo_sh_logs — fetch Odoo.sh logs via SSH
  server.tool(
    'odoo_sh_logs',
    'Fetch Odoo.sh logs via SSH (odoo.log, web.log, longpolling.log)',
    LogsInputSchema.shape,
    async (input) => {
      const result = await handleLogs(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_odoo_sh_psql — read-only PostgreSQL query
  server.tool(
    'odoo_sh_psql',
    'Execute read-only PostgreSQL query via SSH on Odoo.sh. Destructive SQL blocked.',
    PsqlInputSchema.shape,
    async (input) => {
      const result = await handlePsql(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_odoo_sh_status — instance health + resource status
  server.tool(
    'odoo_sh_status',
    'Get Odoo.sh instance health, memory, disk, DB size, and process info via SSH.',
    StatusInputSchema.shape,
    async (input) => {
      const result = await handleOdooStatus(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  // iris_odoo_sh_backups — list or create backups
  server.tool(
    'odoo_sh_backups',
    'List available backups or trigger a new backup on Odoo.sh.',
    BackupsInputSchema.shape,
    async (input) => {
      const result = await handleBackups(input)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )
}
