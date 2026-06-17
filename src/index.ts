import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerTools } from './server.js'
import { closeDb } from './store/db.js'
import { closeEngramClient } from './engram/client.js'
import { closeCodeGraphClient } from './codegraph/client.js'
// closeCodeGraphClient kept for graceful shutdown in case cgClient is used in future flows
import pkgJson from '../package.json' with { type: 'json' }

// CLI interface — show help when run interactively (not piped by MCP client)
{
  const args = process.argv.slice(2)
  const arg0 = args[0]
  const isInteractive = process.stdin.isTTY === true

  if (arg0 === 'version' || arg0 === '--version') {
    process.stdout.write(`iris v${pkgJson.version}\n`)
    process.exit(0)
  }

  if (isInteractive && arg0 !== 'mcp') {
    process.stdout.write([
      `iris v${pkgJson.version} — MCP orchestrator for Alesco Perú Odoo development`,
      '',
      'Usage:',
      '  iris <command>',
      '',
      'Commands:',
      '  mcp        Start MCP server (stdio transport, for AI agents)',
      '  version    Print version',
      '  help       Show this help',
      '',
      'MCP Configuration:',
      '  {',
      '    "iris": {',
      '      "type": "stdio",',
      '      "command": "iris",',
      '      "args": ["mcp"]',
      '    }',
      '  }',
      '',
    ].join('\n'))
    process.exit(0)
  }
}

const server = new McpServer({
  name: 'iris',
  version: pkgJson.version,
})

registerTools(server)

// ─── Bootstrap ───────────────────────────────────────────────────────────´
// Envuelto en IIFE async para compatibilidad con bundlers CJS (pkg).
// En ESM nativo funciona igual — sin top-level await.
;(async () => {
  const transport = new StdioServerTransport()

  process.on('SIGINT', async () => {
    await closeEngramClient()
    await closeCodeGraphClient()
    closeDb()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await closeEngramClient()
    await closeCodeGraphClient()
    closeDb()
    process.exit(0)
  })

  await server.connect(transport)
})().catch((err: unknown) => {
  console.error('[iris] fatal:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
