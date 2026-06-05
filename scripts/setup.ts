#!/usr/bin/env bun
/**
 * iris Setup — Alesco AI Ecosystem Installer
 * Compile: bun build scripts/setup.ts --compile --target bun-windows-x64 --outfile iris-setup.exe
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'

function detectPackageRoot(): string {
  const candidates = [
    join(import.meta.dir, '..'),   // running from scripts/ inside project
    import.meta.dir,                // running from project root
    process.cwd(),                  // current working directory
    'C:\\Development\\iris',        // default Alesco installation path
  ]
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'package.json'))) return candidate
  }
  return 'C:\\Development\\iris'
}
const PACKAGE_ROOT = detectPackageRoot()
const LOCAL_YAML = join(PACKAGE_ROOT, 'iris.local.yaml')
const DIST_ENTRY = join(PACKAGE_ROOT, 'dist', 'index.js')
const CLAUDE_CONFIG = join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.claude', 'claude_desktop_config.json')

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'

function ok(msg: string) { console.log(`  ${GREEN}✅${RESET} ${msg}`) }
function warn(msg: string) { console.log(`  ${YELLOW}⚠️ ${RESET} ${msg}`) }
function fail(msg: string) { console.log(`  ${RED}❌${RESET} ${msg}`) }
function info(msg: string) { console.log(`  ${CYAN}→${RESET}  ${msg}`) }
function step(n: number, total: number, label: string) {
  console.log(`\n${BOLD}[${n}/${total}] ${label}${RESET}`)
}

function check(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim().split('\n')[0] ?? null
  } catch {
    return null
  }
}

function prompt(question: string, defaultY = true): boolean {
  const def = defaultY ? '[Y/n]' : '[y/N]'
  process.stdout.write(`     ${question} ${def} `)
  const buf = Buffer.alloc(1024)
  const n = require('fs').readSync(0, buf, 0, 1024, null)
  const answer = buf.subarray(0, n).toString().trim().toLowerCase()
  if (answer === '') return defaultY
  return answer === 'y' || answer === 'yes' || answer === 'sí' || answer === 'si'
}

// ─── Inline: Google Drive detection (replaces detect-alesco-path.ps1) ─────────
function detectGoogleDrivePath(): string | null {
  const regKeys = [
    'HKCU\\Software\\Google\\DriveFS\\Share',
    'HKCU\\Software\\Google\\Drive',
    'HKLM\\Software\\Google\\DriveFS',
  ]
  for (const key of regKeys) {
    try {
      const out = execSync(`reg query "${key}" 2>nul`, { encoding: 'utf-8', timeout: 5000 })
      const m = out.match(/(?:MountPoint|FSMountPoint|InstallLocation)\s+REG_SZ\s+(.+)/)
      const mp = m?.[1]?.trim()
      if (mp && existsSync(mp)) return mp
    } catch { /* key not found */ }
  }
  return null
}

function findAlescoFolder(root: string, depth = 4): string | null {
  if (depth === 0) return null
  try {
    const entries = readdirSync(root, { withFileTypes: true })
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (e.name === 'Alesco') return join(root, e.name)
      const found = findAlescoFolder(join(root, e.name), depth - 1)
      if (found) return found
    }
  } catch { /* permission error — skip */ }
  return null
}

// ─── Inline: CodeGraph init (replaces init-codegraph.ps1) ─────────────────────
function initCodeGraph(): void {
  const searchRoot = 'C:\\Development\\Odoo\\18'
  if (!existsSync(searchRoot)) {
    warn('Directorio Odoo no encontrado — saltando CodeGraph init')
    return
  }
  let dirs: string[] = []
  try {
    dirs = readdirSync(searchRoot, { withFileTypes: true })
      .filter(d => d.isDirectory() && existsSync(join(searchRoot, d.name, '__manifest__.py')))
      .map(d => join(searchRoot, d.name))
  } catch { return }

  if (dirs.length === 0) {
    info('No se encontraron proyectos Odoo en ' + searchRoot)
    return
  }

  for (const project of dirs) {
    const name = basename(project)
    if (existsSync(join(project, '.codegraph'))) {
      ok(`${name} (CodeGraph ✓)`)
      continue
    }
    warn(`${name} — sin índice CodeGraph`)
    if (prompt(`¿Indexar ${name}?`)) {
      info(`Indexando ${name}...`)
      spawnSync('codegraph', ['init', '-i'], { cwd: project, stdio: 'inherit', timeout: 120000 })
    }
  }
}

// ─── Tool list ─────────────────────────────────────────────────────────────────
interface Tool { name: string; cmd: string; winget?: string; npm?: string; note?: string }

const TOOLS: Tool[] = [
  { name: 'Node.js',    cmd: 'node --version',      winget: 'OpenJS.NodeJS.LTS' },
  { name: 'Bun',        cmd: 'bun --version',        npm: 'bun' },
  { name: 'Claude Code',cmd: 'claude --version',     npm: '@anthropic-ai/claude-code' },
  { name: 'gh',         cmd: 'gh --version',         winget: 'GitHub.cli' },
  { name: 'Engram',     cmd: 'engram --version',     note: 'github.com/Geraldow/engram/releases' },
  { name: 'CodeGraph',  cmd: 'codegraph --version',  npm: '@codegraph/cli' },
  { name: 'agy',        cmd: 'agy --version',        note: 'Antigravity releases' },
  { name: 'kilo',       cmd: 'kilocode --version',   note: 'Kilo releases' },
  { name: 'opencode',   cmd: 'opencode --version',   npm: 'opencode' },
  { name: 'codex',      cmd: 'codex --version',      npm: '@openai/codex' },
  { name: 'cursor',     cmd: 'cursor --version',     note: 'https://cursor.sh' },
]

async function main() {
  console.log()
  console.log(`${BOLD}${CYAN}iris Setup — Alesco AI Ecosystem${RESET}`)
  console.log('─'.repeat(50))

  const TOTAL = 9

  // ─── Step 0: npm install ─────────────────────────────
  step(0, TOTAL, 'Verificando dependencias Node...')
  if (!existsSync(join(PACKAGE_ROOT, 'node_modules'))) {
    info('node_modules/ no encontrado — instalando dependencias...')
    spawnSync('npm', ['install'], { cwd: PACKAGE_ROOT, stdio: 'inherit', timeout: 300000 })
    ok('npm install completado')
  } else {
    ok('node_modules/ presente')
  }

  // ─── Step 0b: Build dist ─────────────────────────────
  step(1, TOTAL, 'Verificando build TypeScript...')
  if (!existsSync(DIST_ENTRY)) {
    info('dist/index.js no existe — compilando TypeScript...')
    const result = spawnSync('npx', ['tsc'], { cwd: PACKAGE_ROOT, stdio: 'inherit', timeout: 120000 })
    if (result.status === 0) {
      ok('TypeScript compilado → dist/index.js')
    } else {
      warn('Error al compilar TypeScript — revise los errores arriba')
    }
  } else {
    ok('dist/index.js presente')
  }

  // ─── Step 1: Tool verification ───────────────────────
  step(2, TOTAL, 'Verificando herramientas CLI...')

  const missing: Tool[] = []
  for (const tool of TOOLS) {
    const version = check(tool.cmd)
    if (version) {
      ok(`${tool.name}: ${version}`)
    } else {
      fail(`${tool.name} → no encontrado`)
      missing.push(tool)
    }
  }

  // Auto-install missing tools with winget/npm
  for (const tool of missing) {
    if (tool.winget) {
      warn(`Instalar: winget install ${tool.winget}`)
      if (prompt(`¿Instalar ${tool.name} ahora?`)) {
        info(`Instalando ${tool.name}...`)
        try {
          execSync(`winget install ${tool.winget} --silent --accept-package-agreements --accept-source-agreements`, { stdio: 'inherit', timeout: 120000 } as any)
          ok(`${tool.name} instalado`)
        } catch { warn(`No se pudo instalar ${tool.name} — intente manualmente`) }
      }
    } else if (tool.npm) {
      warn(`Instalar: npm install -g ${tool.npm}`)
      if (prompt(`¿Instalar ${tool.name} ahora?`)) {
        info(`Instalando ${tool.name}...`)
        try {
          execSync(`npm install -g ${tool.npm}`, { stdio: 'inherit', timeout: 120000 } as any)
          ok(`${tool.name} instalado`)
        } catch { warn(`No se pudo instalar ${tool.name} — intente manualmente`) }
      }
    } else if (tool.note) {
      warn(`Descarga manual: ${tool.note}`)
    }
  }

  // ─── Step 2: Google Drive detection ──────────────────
  step(3, TOTAL, 'Detectando Google Drive...')

  let alescoPath: string | null = null

  if (existsSync(LOCAL_YAML)) {
    const content = readFileSync(LOCAL_YAML, 'utf-8')
    const match = content.match(/^alesco_path:\s*(.+)$/m)
    alescoPath = match?.[1]?.trim() ?? null
    if (alescoPath && existsSync(alescoPath)) {
      ok(`alesco_path (desde iris.local.yaml): ${alescoPath}`)
    } else {
      alescoPath = null
    }
  }

  if (!alescoPath) {
    info('Buscando Google Drive via registry...')
    const gdrivePath = detectGoogleDrivePath()
    if (gdrivePath) {
      ok(`Google Drive: ${gdrivePath}`)
      info('Buscando carpeta Alesco...')
      alescoPath = findAlescoFolder(gdrivePath, 5)
    }

    if (!alescoPath) {
      info('Buscando Alesco en todas las unidades...')
      try {
        const drivesOut = execSync('fsutil fsinfo drives', { encoding: 'utf-8', timeout: 5000 })
        const drives = (drivesOut.match(/[A-Z]:\\/g) ?? [])
        for (const drive of drives) {
          alescoPath = findAlescoFolder(drive, 4)
          if (alescoPath) break
        }
      } catch { /* fsutil not available */ }
    }

    if (alescoPath) {
      ok(`Carpeta Alesco encontrada: ${alescoPath}`)
    } else {
      warn('No se encontró carpeta Alesco — configure iris.local.yaml manualmente')
    }
  }

  // ─── Step 3: Configure alesco_path ───────────────────
  step(4, TOTAL, 'Configurando iris.local.yaml...')

  if (alescoPath) {
    const enterprise = join(alescoPath, 'Source', 'odoo-enterprise-18')
    const community = join(alescoPath, 'Source', 'odoo-community-18')
    writeFileSync(LOCAL_YAML, `alesco_path: ${alescoPath}\n`)
    ok(`alesco_path: ${alescoPath}`)
    existsSync(enterprise) ? ok(`enterprise: ${enterprise}`) : warn(`enterprise: no encontrado`)
    existsSync(community)  ? ok(`community:  ${community}`)  : warn(`community:  no encontrado`)
  } else {
    warn('alesco_path no configurado — edite iris.local.yaml manualmente')
  }

  // ─── Step 4: CodeGraph initialization ────────────────
  step(5, TOTAL, 'Inicializando CodeGraph...')
  initCodeGraph()

  // ─── Step 5: Engram configuration ────────────────────
  step(6, TOTAL, 'Verificando Engram...')

  const engramOk = check('engram --version')
  if (engramOk) {
    ok(`Engram ${engramOk}`)
    if (alescoPath) {
      const engramDir = join(alescoPath, 'Engram')
      existsSync(engramDir) ? ok(`Engram dir: ${engramDir}`) : warn(`Engram dir no encontrado: ${engramDir}`)
    }
  } else {
    warn('Engram no disponible — instalar desde GitHub releases')
  }

  // ─── Step 6: Register MCPs ───────────────────────────
  step(7, TOTAL, 'Registrando MCPs en Claude Code...')

  if (!existsSync(DIST_ENTRY)) {
    warn('dist/index.js no existe — MCP iris NO registrado')
    warn('Corra: npx tsc en el directorio del proyecto')
  } else {
    try {
      let config: any = {}
      if (existsSync(CLAUDE_CONFIG)) {
        config = JSON.parse(readFileSync(CLAUDE_CONFIG, 'utf-8'))
      }
      config.mcpServers = config.mcpServers ?? {}
      config.mcpServers['iris'] = { command: 'node', args: [DIST_ENTRY] }
      writeFileSync(CLAUDE_CONFIG, JSON.stringify(config, null, 2))
      ok(`iris MCP registrado → ${DIST_ENTRY}`)
      ok(`Config: ${CLAUDE_CONFIG}`)
    } catch (err) {
      warn(`No se pudo actualizar claude_desktop_config.json: ${(err as Error).message}`)
    }
  }

  // ─── Step 7: Connection check ─────────────────────────
  step(8, TOTAL, 'Verificando conexiones...')

  check('engram --version')    ? ok('Engram MCP → OK')    : warn('Engram MCP → no disponible')
  check('codegraph --version') ? ok('CodeGraph MCP → OK') : warn('CodeGraph MCP → no disponible')
  existsSync(DIST_ENTRY)       ? ok('iris dist → OK')      : warn('iris dist → no compilado')

  // Check for iris updates
  if (existsSync(join(PACKAGE_ROOT, 'package.json'))) {
    try {
      const current = (JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')).version ?? '0.0.0') as string
      const res = await fetch('https://api.github.com/repos/Geraldow/iris/releases/latest', {
        headers: { 'User-Agent': 'iris-setup' },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json() as { tag_name: string; html_url: string }
        const latest = data.tag_name.replace(/^v/, '')
        const pa = current.split('.').map(Number)
        const pb = latest.split('.').map(Number)
        const newer = pb.some((n, i) => n > (pa[i] ?? 0))
        if (newer) {
          warn(`iris ${current} → nueva versión disponible: v${latest}`)
          info(`Descarga el nuevo installer: ${data.html_url}`)
        } else {
          ok(`iris ${current} — versión más reciente`)
        }
      }
    } catch { /* GitHub API no disponible */ }
  }

  // ─── Complete ────────────────────────────────────────
  console.log()
  console.log('─'.repeat(50))
  console.log(`${BOLD}${GREEN}✅ Setup completo. Reinicia Claude Code.${RESET}`)
  console.log()

  // Keep window open so user can read results
  process.stdout.write('  Presiona Enter para cerrar...')
  await new Promise<void>(resolve => {
    process.stdin.setRawMode?.(true)
    process.stdin.resume()
    process.stdin.once('data', () => {
      process.stdin.pause()
      resolve()
    })
  })
}

main().catch(err => {
  console.error(`\n${RED}Error durante el setup:${RESET}`, err)
  process.exit(1)
})
