import { execSync } from 'child_process'

export type BranchClass = 'allowed' | 'blocked' | 'warn'

// R2 — branch classification
export function classifyBranch(branch: string): BranchClass {
  if (/^st_/.test(branch) || branch === 'st_produccion') return 'allowed'
  if (branch === 'produccion' || /^db_/.test(branch)) return 'blocked'
  return 'warn'
}

export function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8', timeout: 5000 }).trim()
  } catch {
    return 'unknown'
  }
}

// R3 — returns git identity for logging; authorization managed externally by CLAUDE.md
export function checkIdentity(): { authorized: boolean; name: string; email: string; login: string } {
  let name = '', email = '', login = ''
  try {
    name = execSync('git config user.name', { encoding: 'utf-8', timeout: 3000 }).trim()
    email = execSync('git config user.email', { encoding: 'utf-8', timeout: 3000 }).trim()
  } catch { /* git config not set */ }

  try {
    login = execSync('gh api user --jq .login', { encoding: 'utf-8', timeout: 5000 }).trim()
  } catch { /* gh not available */ }

  return { authorized: true, name, email, login }
}

// R5 — detect XML changes + __manifest__.py version bump in same diff
export function checkR5PreMigrate(): boolean {
  try {
    const diff = execSync('git diff --cached --name-only', { encoding: 'utf-8', timeout: 5000 })
    const files = diff.split('\n').filter(Boolean)
    const hasXml = files.some(f => f.endsWith('.xml'))
    const hasManifest = files.some(f => f.endsWith('__manifest__.py'))
    if (!hasXml || !hasManifest) return false

    const manifestDiff = execSync('git diff --cached -- "**/__manifest__.py"', {
      encoding: 'utf-8', timeout: 5000
    })
    return /['"]version['"]/.test(manifestDiff) && manifestDiff.includes('+')
  } catch {
    return false
  }
}

// Operations that always require explicit "sí" before execution
const REQUIRES_APPROVAL = new Set(['push', 'cherry-pick', 'merge'])
const PERMANENTLY_BLOCKED = new Set(['push --force', 'push -f', 'rebase', 'reset'])

export function requiresExplicitApproval(operation: string): boolean {
  const op = operation.toLowerCase().trim()
  if (PERMANENTLY_BLOCKED.has(op) || op.includes('--force') || op.includes('-f')) {
    throw new Error(
      `[iris R2] Operación '${operation}' está BLOQUEADA permanentemente.\n` +
      `push --force, rebase, y reset no están permitidos bajo ninguna circunstancia.`
    )
  }
  return REQUIRES_APPROVAL.has(op)
}
