import { execSync } from 'child_process'
import { existsSync } from 'fs'
import type { EnterpriseSearchResult, IrisLocalConfig } from '../types/index.js'

export function searchEnterprise(
  query: string,
  cfg: IrisLocalConfig | null,
  fileTypes: string[] = ['py', 'xml', 'js'],
): EnterpriseSearchResult[] | { error: string } {
  if (!cfg) {
    return { error: 'enterprise_path not configured. Run iris_setup to set alesco_path.' }
  }

  if (!existsSync(cfg.enterprise_path)) {
    return { error: `enterprise_path not found: ${cfg.enterprise_path}. Copy Odoo Enterprise source to this location.` }
  }

  // Verify rg is available
  try {
    execSync('rg --version', { encoding: 'utf-8', timeout: 3000 })
  } catch {
    return { error: 'ripgrep (rg) not found. Install via: winget install BurntSushi.ripgrep.MSVC' }
  }

  try {
    const typeArgs = fileTypes.flatMap(t => ['--type', t])
    const args = [
      query,
      cfg.enterprise_path,
      ...typeArgs,
      '--json',
      '--max-count', '20',
    ]

    const stdout = execSync(`rg ${args.map(a => `"${a}"`).join(' ')}`, {
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10,
    })

    const results: EnterpriseSearchResult[] = []
    for (const line of stdout.split('\n').filter(Boolean)) {
      try {
        const obj = JSON.parse(line)
        if (obj.type === 'match') {
          results.push({
            file: obj.data.path.text.replace(cfg.enterprise_path, '').replace(/^[/\\]/, ''),
            line: obj.data.line_number,
            content: obj.data.lines.text.trim(),
          })
        }
      } catch { /* skip malformed lines */ }
    }
    return results
  } catch (err: any) {
    // Exit code 1 = no matches (not an error)
    if (err.status === 1) return []
    return { error: `rg failed: ${err.message}` }
  }
}
