import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

let _client: Client | null = null

const NOT_INITIALIZED = { error: 'CodeGraph not initialized. Run: codegraph init -i in your project root.' }

function resolveCodeGraphBin(): string {
  const candidates = [
    process.env['CODEGRAPH_BIN'],
    join('C:', 'Users', homedir().split(/[\\/]/).pop() ?? '', 'AppData', 'Local', 'Programs', 'codegraph', 'codegraph.exe'),
    join(homedir(), '.local', 'bin', 'codegraph'),
    'codegraph',
  ]
  for (const c of candidates) {
    if (!c) continue
    if (c === 'codegraph') return c
    if (existsSync(c)) return c
  }
  return 'codegraph'
}

async function getClient(): Promise<Client | null> {
  if (_client) return _client
  try {
    const transport = new StdioClientTransport({
      command: resolveCodeGraphBin(),
      args: ['mcp'],
    })
    _client = new Client(
      { name: 'iris-codegraph', version: '1.0.0' },
      { capabilities: {} },
    )
    await _client.connect(transport)
    return _client
  } catch {
    return null
  }
}

async function callTool(name: string, args: Record<string, unknown>) {
  const client = await getClient()
  if (!client) return NOT_INITIALIZED
  try {
    return await client.callTool({ name, arguments: args })
  } catch (err: any) {
    if (err?.message?.includes('not initialized') || err?.message?.includes('no index')) {
      return NOT_INITIALIZED
    }
    return { error: `CodeGraph error: ${err?.message ?? String(err)}` }
  }
}

export async function cgStatus() {
  return callTool('codegraph_status', {})
}

export async function cgFiles(path: string) {
  return callTool('codegraph_files', { path })
}

export async function cgSearch(query: string) {
  return callTool('codegraph_search', { query })
}

export async function cgContext(task: string, maxNodes = 20) {
  return callTool('codegraph_context', { task, maxNodes })
}

export async function cgExplore(symbols: string) {
  return callTool('codegraph_explore', { symbols })
}

export async function cgNode(symbol: string) {
  return callTool('codegraph_node', { symbol })
}

export async function cgTrace(from: string, to: string) {
  return callTool('codegraph_trace', { from, to })
}

export async function cgCallers(symbol: string) {
  return callTool('codegraph_callers', { symbol })
}

export async function cgCallees(symbol: string) {
  return callTool('codegraph_callees', { symbol })
}

export async function cgImpact(symbol: string) {
  return callTool('codegraph_impact', { symbol })
}

export async function closeCodeGraphClient(): Promise<void> {
  if (_client) {
    await _client.close()
    _client = null
  }
}
