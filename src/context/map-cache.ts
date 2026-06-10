import type { UIMap } from '../types/index.js'

interface CacheEntry {
  map: UIMap
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30 * 60 * 1000

export function getCachedMap(modulePath: string): UIMap | null {
  const entry = cache.get(modulePath)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(modulePath)
    return null
  }
  return entry.map
}

export function setCachedMap(modulePath: string, map: UIMap): void {
  cache.set(modulePath, { map, timestamp: Date.now() })
}

export function invalidateCache(modulePath?: string): void {
  if (modulePath) {
    cache.delete(modulePath)
  } else {
    cache.clear()
  }
}

export function getCacheStats(): { size: number; entries: string[] } {
  const entries: string[] = []
  for (const [key, val] of cache) {
    const age = Math.round((Date.now() - val.timestamp) / 1000)
    entries.push(`${key} (${age}s old)`)
  }
  return { size: cache.size, entries }
}
