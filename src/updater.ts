import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import pkgJson from '../package.json' with { type: 'json' }

const PACKAGE_ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const REPO = 'Geraldow/iris'
const CACHE_TTL_MS = 60 * 60 * 1000

interface UpdateCache {
  available: boolean
  current: string
  latest: string
  url: string
  checkedAt: number
}

let _cache: UpdateCache | null = null

export function getCurrentVersion(): string {
  return String(pkgJson.version)
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1
  }
  return 0
}

export async function checkForUpdates(): Promise<UpdateCache> {
  const now = Date.now()
  if (_cache && (now - _cache.checkedAt) < CACHE_TTL_MS) return _cache

  const current = getCurrentVersion()
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': 'iris-mcp-server' },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const data = await res.json() as { tag_name: string; html_url: string }
    const latest = data.tag_name.replace(/^v/, '')
    const available = compareVersions(latest, current) > 0
    _cache = { available, current, latest, url: data.html_url, checkedAt: now }
  } catch {
    _cache = { available: false, current, latest: current, url: '', checkedAt: now }
  }
  return _cache
}