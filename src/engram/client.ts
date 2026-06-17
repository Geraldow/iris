import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

let _client: Client | null = null

function resolveEngramBin(): string {
  // VS Code / MCP server processes inherit a restricted PATH — resolve explicitly
  const candidates = [
    process.env['ENGRAM_BIN'],
    join('C:', 'Development', 'engram', 'engram.exe'),
    join(homedir(), 'go', 'bin', 'engram.exe'),
    'engram', // fallback to PATH
  ]
  for (const c of candidates) {
    if (!c) continue
    if (c === 'engram') return c
    if (existsSync(c)) return c
  }
  return 'engram'
}

export async function getEngramClient(): Promise<Client> {
  if (_client) return _client

  const transport = new StdioClientTransport({
    command: resolveEngramBin(),
    args: ['mcp'],
  })

  const client = new Client(
    { name: 'iris', version: '1.0.0' },
    { capabilities: {} },
  )

  await Promise.race([
    client.connect(transport),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('engram connect timeout')), 8000)
    ),
  ])

  _client = client
  return _client
}

export async function closeEngramClient(): Promise<void> {
  if (_client) {
    await _client.close()
    _client = null
  }
}
