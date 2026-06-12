#!/usr/bin/env bun
/**
 * iris Setup — Alesco AI Ecosystem Installer
 * Compile: bun build scripts/setup.ts --compile --target bun-windows-x64 --outfile iris-setup.exe
 *
 * Hybrid approach:
 *   - Google Drive (Source of truth for Odoo enterprise/community)
 *   - Local C:\Development\Odoo\{version} (Working copy for fast development + CodeGraph)
 *   - Auto-sync from Drive to local when missing
 *   - Auto-index all projects and source with CodeGraph
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync, readdirSync, copyFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── Helpers ────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function detectPackageRoot(): string {
  const candidates = [
    join(__dirname, '..'),          // running from scripts/ inside project
    __dirname,                      // running from project root
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

function ok(msg: string) { console.log(`  ${GREEN}OK${RESET} ${msg}`) }
function warn(msg: string) { console.log(`  ${YELLOW}!!${RESET} ${msg}`) }
function fail(msg: string) { console.log(`  ${RED}XX${RESET} ${msg}`) }
function info(msg: string) { console.log(`  ${CYAN}->${RESET}  ${msg}`) }
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

function promptUser(question: string, defaultY = true): boolean {
  const def = defaultY ? '[Y/n]' : '[y/N]'
  process.stdout.write(`     ${question} ${def} `)
  const buf = Buffer.alloc(1024)
  const n = require('fs').readSync(0, buf, 0, 1024, null)
  const answer = buf.subarray(0, n).toString().trim().toLowerCase()
  if (answer === '') return defaultY
  return answer === 'y' || answer === 'yes' || answer === 's' || answer === 'si'
}

// ─── Google Drive detection ──────────────────────────────────────────────────────
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

// ─── Engram installer ────────────────────────────────────────────────────────────
async function installEngram(): Promise<void> {
  const tmpDir = process.env.TEMP ?? 'C:\\Temp'
  const zipPath = join(tmpDir, 'engram-windows.zip')
  const installDir = join(process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? 'C:\\Users\\Public', 'AppData', 'Local'), 'Programs', 'engram')

  info('Descargando Engram desde GitHub releases...')
  try {
    spawnSync('gh', [
      'release', 'download',
      '--repo', 'Gentleman-Programming/engram',
      '--pattern', '*Windows_x86_64.zip',
      '--output', zipPath,
      '--clobber',
    ], { stdio: 'inherit', timeout: 60000 })

    info('Instalando Engram...')
    spawnSync('powershell', [
      '-Command',
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${installDir}' -Force`,
    ], { stdio: 'inherit', timeout: 30000 })

    spawnSync('powershell', [
      '-Command',
      `$p = [Environment]::GetEnvironmentVariable('PATH','User'); if ($p -notlike '*engram*') { [Environment]::SetEnvironmentVariable('PATH', "$p;${installDir}", 'User') }`,
    ], { stdio: 'inherit', timeout: 10000 })

    ok(`Engram instalado -> ${installDir}`)
    warn('Reinicia la terminal para que Engram este en PATH')
  } catch (err) {
    warn(`No se pudo instalar Engram: ${(err as Error).message}`)
    info('Descarga manual: https://github.com/Gentleman-Programming/engram/releases/latest')
  }
}

// ─── Odoo versions ───────────────────────────────────────────────────────────────
const VERSIONS = ['14', '15', '16', '17', '18', '19']
const LOCAL_ODOO_ROOT = 'C:\\Development\\Odoo'

/**
 * Detecta Odoo source (enterprise + community) en Google Drive
 * Estructura real: alesco_path/Source/{version}/Source/{enterprise|odoo}
 */
function detectSourceInDrive(alescoPath: string, version: string): { enterprise: string | null; community: string | null } {
  const versionSource = join(alescoPath, 'Source', version, 'Source')
  const enterprise = join(versionSource, 'enterprise')
  const community = join(versionSource, 'odoo')
  return {
    enterprise: existsSync(enterprise) ? enterprise : existsSync(join(versionSource, 'enterprise')) ? join(versionSource, 'enterprise') : null,
    community: existsSync(community) ? community : null,
  }
}

/**
 * Detecta proyectos Odoo en una version local
 * Un proyecto es un directorio que contiene subdirectorios con __manifest__.py
 */
function detectProjects(versionRoot: string): string[] {
  if (!existsSync(versionRoot)) return []
  const SKIP = new Set(['Source', 'source', 'node_modules', '.git', '.atl', '.vscode', '__pycache__'])
  const dirs: string[] = []
  try {
    const entries = readdirSync(versionRoot, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP.has(entry.name)) continue
      const fullPath = join(versionRoot, entry.name)
      // Check if this directory contains subdirectories with __manifest__.py
      try {
        const subs = readdirSync(fullPath, { withFileTypes: true })
        const hasOdooModule = subs.some(s => s.isDirectory() && existsSync(join(fullPath, s.name, '__manifest__.py')))
        if (hasOdooModule) dirs.push(fullPath)
      } catch { /* skip unreadable dirs */ }
    }
  } catch { /* skip */ }
  return dirs
}

/**
 * Indexa un directorio con CodeGraph si no tiene indice
 */
function ensureCodeGraphIndex(dirPath: string): boolean {
  const name = basename(dirPath)
  if (existsSync(join(dirPath, '.codegraph'))) {
    ok(`${name} (CodeGraph OK)`)
    return true
  }
  warn(`${name} -- sin indice CodeGraph`)
  if (promptUser(`Indexar ${name} con CodeGraph?`)) {
    info(`Indexando ${name}...`)
    const result = spawnSync('codegraph', ['init', '-i'], { cwd: dirPath, stdio: 'inherit', timeout: 180000 })
    if (result.status === 0) {
      ok(`${name} indexado`)
      return true
    } else {
      warn(`Error al indexar ${name}`)
      return false
    }
  }
  return false
}

// ─── Tool list ───────────────────────────────────────────────────────────────────
interface Tool { name: string; cmd: string; winget?: string; npm?: string; note?: string }

const TOOLS: Tool[] = [
  { name: 'Node.js',    cmd: 'node --version',      winget: 'OpenJS.NodeJS.LTS' },
  { name: 'Bun',        cmd: 'bun --version',        npm: 'bun' },
  { name: 'Claude Code',cmd: 'claude --version',     npm: '@anthropic-ai/claude-code' },
  { name: 'gh',         cmd: 'gh --version',         winget: 'GitHub.cli' },
  { name: 'CodeGraph',  cmd: 'codegraph --version',  npm: '@codegraph/cli' },
  { name: 'agy',        cmd: 'agy --version',        winget: 'Google.AntigravityCLI' },
  { name: 'kilo',       cmd: 'kilocode --version',   npm: '@kilocode/cli' },
  { name: 'opencode',   cmd: 'opencode --version',   npm: 'opencode' },
  { name: 'codex',      cmd: 'codex --version',      npm: '@openai/codex' },
  { name: 'cursor',     cmd: 'cursor --version',     winget: 'Anysphere.Cursor' },
  { name: 'Engram',     cmd: 'engram --version',     note: '__engram_download__' },
]

async function main() {
  console.log()
  console.log(`${BOLD}${CYAN}iris Setup -- Alesco AI Ecosystem${RESET}`)
  console.log('-'.repeat(50))

  const TOTAL = 12

  // ─── Step 0: npm install ─────────────────────────────
  step(0, TOTAL, 'Verificando dependencias Node...')
  if (!existsSync(join(PACKAGE_ROOT, 'node_modules'))) {
    info('node_modules/ no encontrado -- instalando...')
    spawnSync('npm', ['install'], { cwd: PACKAGE_ROOT, stdio: 'inherit', timeout: 300000 })
    ok('npm install completado')
  } else {
    ok('node_modules/ presente')
  }

  // ─── Step 1: Build dist ──────────────────────────────
  step(1, TOTAL, 'Verificando build TypeScript...')
  if (!existsSync(DIST_ENTRY)) {
    info('dist/index.js no existe -- compilando TypeScript...')
    const result = spawnSync('npx', ['tsc'], { cwd: PACKAGE_ROOT, stdio: 'inherit', timeout: 120000 })
    if (result.status === 0) {
      ok('TypeScript compilado -> dist/index.js')
    } else {
      warn('Error al compilar TypeScript -- revise los errores arriba')
    }
  } else {
    ok('dist/index.js presente')
  }

  // ─── Step 2: Tool verification ───────────────────────
  step(2, TOTAL, 'Verificando herramientas CLI...')

  const missing: Tool[] = []
  for (const tool of TOOLS) {
    const version = check(tool.cmd)
    if (version) {
      ok(`${tool.name}: ${version}`)
    } else {
      fail(`${tool.name} -> no encontrado`)
      missing.push(tool)
    }
  }

  for (const tool of missing) {
    if (tool.note === '__engram_download__') {
      warn('Engram -> no encontrado')
      if (promptUser('Instalar Engram automaticamente?')) {
        await installEngram()
      } else {
        info('Descarga manual: https://github.com/Gentleman-Programming/engram/releases/latest')
      }
      continue
    }
    if (tool.winget) {
      warn(`Instalar: winget install ${tool.winget}`)
      if (promptUser(`Instalar ${tool.name} ahora?`)) {
        info(`Instalando ${tool.name}...`)
        try {
          execSync(`winget install ${tool.winget} --silent --accept-package-agreements --accept-source-agreements`, { stdio: 'inherit', timeout: 120000 } as any)
          ok(`${tool.name} instalado`)
        } catch { warn(`No se pudo instalar ${tool.name}`) }
      }
    } else if (tool.npm) {
      warn(`Instalar: npm install -g ${tool.npm}`)
      if (promptUser(`Instalar ${tool.name} ahora?`)) {
        info(`Instalando ${tool.name}...`)
        try {
          execSync(`npm install -g ${tool.npm}`, { stdio: 'inherit', timeout: 120000 } as any)
          ok(`${tool.name} instalado`)
        } catch { warn(`No se pudo instalar ${tool.name}`) }
      }
    } else if (tool.note) {
      warn(`Descarga manual: ${tool.note}`)
    }
  }

  // ─── Step 3: Google Drive detection ──────────────────
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
      warn('No se encontro carpeta Alesco -- configure iris.local.yaml manualmente')
    }
  }

  // ─── Step 4: Scannear versiones activas ───────────────
  step(4, TOTAL, 'Escaneando versiones Odoo activas...')

  // Detectar que versiones tienen contenido local (Source o projects)
  const activeVersions: string[] = []
  for (const ver of VERSIONS) {
    const vp = join(LOCAL_ODOO_ROOT, ver)
    if (!existsSync(vp)) continue
    const projects = detectProjects(vp)
    const hasSource = existsSync(join(vp, 'Source', 'enterprise')) || existsSync(join(vp, 'Source', 'odoo'))
    if (projects.length > 0 || hasSource) {
      activeVersions.push(ver)
    }
  }
  if (activeVersions.length > 0) {
    ok(`Versiones activas detectadas: ${activeVersions.join(', ')}`)
  } else {
    warn('No se detectaron versiones Odoo activas')
  }

  // ─── Step 5: Configurar iris.local.yaml ───────────────
  step(5, TOTAL, 'Configurando iris.local.yaml...')

  const configLines: string[] = []
  if (alescoPath) {
    configLines.push(`alesco_path: ${alescoPath}`)
  }

  // Solo detectar rutas Drive para versiones activas
  if (alescoPath) {
    let enterpriseCount = 0
    let communityCount = 0
    for (const ver of activeVersions) {
      const drive = detectSourceInDrive(alescoPath, ver)
      if (drive.enterprise) {
        configLines.push(`odoo_${ver}_enterprise: ${drive.enterprise}`)
        enterpriseCount++
      }
      if (drive.community) {
        configLines.push(`odoo_${ver}_community: ${drive.community}`)
        communityCount++
      }
    }

    writeFileSync(LOCAL_YAML, configLines.join('\n') + '\n')
    ok(`alesco_path: ${alescoPath}`)
    if (enterpriseCount > 0) ok(`enterprise: ${enterpriseCount} versiones en Google Drive`)
    if (communityCount > 0) ok(`community: ${communityCount} versiones en Google Drive`)
    if (enterpriseCount === 0 && communityCount === 0) {
      warn('Source no encontrado en Google Drive para versiones activas')
    }
  } else {
    warn('alesco_path no configurado -- edite iris.local.yaml manualmente')
    writeFileSync(LOCAL_YAML, '# Configura alesco_path para usar Google Drive\n')
  }

  // ─── Step 6: Sync Source de Drive a local ─────────────
  step(6, TOTAL, 'Sincronizando Source de Google Drive a local...')

  if (alescoPath) {
    let syncedAny = false
    for (const ver of activeVersions) {
      const drive = detectSourceInDrive(alescoPath, ver)
      const localSourceDir = join(LOCAL_ODOO_ROOT, ver, 'Source')
      const localEnterprise = join(localSourceDir, 'enterprise')
      const localCommunity = join(localSourceDir, 'odoo')

      const driveHasEnterprise = drive.enterprise !== null && existsSync(drive.enterprise)
      const driveHasCommunity = drive.community !== null && existsSync(drive.community)
      const localMissingEnterprise = driveHasEnterprise && !existsSync(localEnterprise)
      const localMissingCommunity = driveHasCommunity && !existsSync(localCommunity)

      if (!localMissingEnterprise && !localMissingCommunity) continue

      if (!syncedAny) console.log('')
      if (localMissingEnterprise || localMissingCommunity) {
        console.log(`   Odoo ${ver}: Source en Drive pero falta en local`)
        if (!existsSync(localSourceDir)) mkdirSync(localSourceDir, { recursive: true })
      }
      if (localMissingEnterprise) {
        if (promptUser(`Copiar enterprise v${ver} desde Google Drive a local?`)) {
          info(`Copiando enterprise v${ver}...`)
          spawnSync('robocopy', [drive.enterprise!, localEnterprise, '/E', '/NFL', '/NDL', '/NJH', '/NJS'], { stdio: 'inherit', timeout: 300000 })
          ok(`enterprise v${ver} copiado a local`)
          syncedAny = true
        }
      }
      if (localMissingCommunity) {
        if (promptUser(`Copiar community v${ver} desde Google Drive a local?`)) {
          info(`Copiando community v${ver}...`)
          spawnSync('robocopy', [drive.community!, localCommunity, '/E', '/NFL', '/NDL', '/NJH', '/NJS'], { stdio: 'inherit', timeout: 300000 })
          ok(`community v${ver} copiado a local`)
          syncedAny = true
        }
      }
    }
    if (!syncedAny) ok('Source local ya sincronizado -- nada que copiar')
  } else {
    warn('Google Drive no detectado -- no se puede sincronizar source')
  }

  // ─── Step 7: CodeGraph — Indexar Source local ─────────
  step(7, TOTAL, 'Indexando Source local con CodeGraph...')

  let indexedAny = false
  for (const ver of activeVersions) {
    // Preferir Source/ (mayuscula) o source/ (minuscula) como fallback
    let localSource = join(LOCAL_ODOO_ROOT, ver, 'Source')
    if (!existsSync(localSource)) {
      localSource = join(LOCAL_ODOO_ROOT, ver, 'source')
      if (!existsSync(localSource)) continue
    }

    const hasEnterprise = existsSync(join(localSource, 'enterprise'))
    const hasCommunity = existsSync(join(localSource, 'odoo'))
    if (!hasEnterprise && !hasCommunity) continue

    if (!indexedAny) console.log('')
    // Indexar a nivel de raiz Source/, no dentro de enterprise/odoo
    console.log(`   Odoo ${ver}:`)
    ensureCodeGraphIndex(localSource)
    indexedAny = true
  }
  if (!indexedAny) ok('No hay Source local que indexar')

  // ─── Step 8: CodeGraph — Indexar Projects ─────────────
  step(8, TOTAL, 'Indexando Projects locales con CodeGraph...')

  let indexedProjects = false
  for (const ver of activeVersions) {
    const versionRoot = join(LOCAL_ODOO_ROOT, ver)
    const projects = detectProjects(versionRoot)
    if (projects.length === 0) continue

    if (!indexedProjects) console.log('')
    console.log(`   Odoo ${ver} (${projects.length} projects):`)
    for (const project of projects) {
      ensureCodeGraphIndex(project)
    }
    indexedProjects = true
  }
  if (!indexedProjects) ok('No hay projects que indexar')

  // ─── Step 9: Engram configuration ─────────────────────
  step(9, TOTAL, 'Verificando Engram...')

  const engramOk = check('engram --version')
  if (engramOk) {
    ok(`Engram ${engramOk}`)
    if (alescoPath) {
      const engramDir = join(alescoPath, 'Engram')
      existsSync(engramDir) ? ok(`Engram dir: ${engramDir}`) : warn(`Engram dir no encontrado: ${engramDir}`)
    }
  } else {
    warn('Engram no disponible -- instalar desde GitHub releases')
  }

  // ─── Step 10: Register MCPs ───────────────────────────
  step(10, TOTAL, 'Registrando MCPs en Claude Code...')

  if (!existsSync(DIST_ENTRY)) {
    warn('dist/index.js no existe -- MCP iris NO registrado')
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
      ok(`iris MCP registrado -> ${DIST_ENTRY}`)
      ok(`Config: ${CLAUDE_CONFIG}`)
    } catch (err) {
      warn(`No se pudo actualizar claude_desktop_config.json: ${(err as Error).message}`)
    }
  }

  // ─── Step 11: Connection check ────────────────────────
  step(11, TOTAL, 'Verificando conexiones...')

  check('engram --version')    ? ok('Engram MCP -> OK')     : warn('Engram MCP -> no disponible')
  check('codegraph --version') ? ok('CodeGraph MCP -> OK')  : warn('CodeGraph MCP -> no disponible')
  existsSync(DIST_ENTRY)       ? ok('iris dist -> OK')       : warn('iris dist -> no compilado')

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
          warn(`iris ${current} -> nueva version disponible: v${latest}`)
          info(`Descarga el nuevo installer: ${data.html_url}`)
        } else {
          ok(`iris ${current} -- version mas reciente`)
        }
      }
    } catch { /* GitHub API no disponible */ }
  }

  // ─── Step 12: Install CLAUDE.md ──────────────────────
  step(12, TOTAL, 'Instalando CLAUDE.md en ~/.claude/...')

  const claudeDir = join(process.env['USERPROFILE'] ?? homedir(), '.claude')
  const claudeMdPath = join(claudeDir, 'CLAUDE.md')
  const claudeTemplatePath = join(PACKAGE_ROOT, 'iris', 'prompts', 'CLAUDE.md')

  if (!existsSync(claudeTemplatePath)) {
    warn('Template CLAUDE.md no encontrado en iris/prompts/ -- saltando')
  } else if (existsSync(claudeMdPath)) {
    warn('~/.claude/CLAUDE.md ya existe')
    if (promptUser('Sobreescribir con la version del template de iris?', false)) {
      copyFileSync(claudeTemplatePath, claudeMdPath)
      ok(`CLAUDE.md actualizado -> ${claudeMdPath}`)
    } else {
      info('CLAUDE.md existente conservado -- sin cambios')
    }
  } else {
    mkdirSync(claudeDir, { recursive: true })
    copyFileSync(claudeTemplatePath, claudeMdPath)
    ok(`CLAUDE.md instalado -> ${claudeMdPath}`)
  }

  // ─── Complete ─────────────────────────────────────────
  console.log()
  console.log('-'.repeat(50))
  console.log(`${BOLD}${GREEN}Setup completo. Reinicia Claude Code.${RESET}`)
  console.log()

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
