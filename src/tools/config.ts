import { z } from 'zod'
import { getConfig, saveConfig } from '../config.js'

export const ConfigInputSchema = z.object({
  action: z.enum(['get', 'set']),
  key: z.string().optional(),
  value: z.unknown().optional(),
})

export async function handleConfig(input: unknown): Promise<object> {
  const { action, key, value } = ConfigInputSchema.parse(input)
  const config = getConfig()

  if (action === 'get') {
    if (!key) return config
    const keys = key.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = config
    for (const k of keys) current = current?.[k]
    return { key, value: current }
  }

  // action === 'set'
  if (!key) throw new Error('key is required for set action')
  const keys = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated: any = { ...config }
  let ref = updated
  for (let i = 0; i < keys.length - 1; i++) {
    ref[keys[i]] = { ...ref[keys[i]] }
    ref = ref[keys[i]]
  }
  ref[keys[keys.length - 1]] = value
  saveConfig(updated)
  return { key, value, status: 'saved' }
}
