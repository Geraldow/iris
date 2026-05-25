import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerTools } from './server.js'
import { closeDb } from './store/db.js'
import { closeEngramClient } from './engram/client.js'

const server = new McpServer({
  name: 'iris',
  version: '1.0.0',
})

registerTools(server)

const transport = new StdioServerTransport()

process.on('SIGINT', async () => {
  await closeEngramClient()
  closeDb()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeEngramClient()
  closeDb()
  process.exit(0)
})

await server.connect(transport)
