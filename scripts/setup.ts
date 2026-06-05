#!/usr/bin/env bun
/**
 * iris Setup — Alesco AI Ecosystem Installer
 * Compile: bun build scripts/setup.ts --compile --target bun-windows-x64 --outfile iris-setup.exe
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'

const PACKAGE_ROOT = join(import.meta.dir, '..')
const LOCAL_YAML = join(PACKAGE_ROOT, 'iris.local.yaml')
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
  const n = require('fs').readSync(0, buf, 0, 1024, null)  // blocking stdin read
  const answer = buf.subarray(0, n).toString().trim().toLowerCase()
  if (answer === '') return defaultY
  return answer === 'y' || answer === 'yes' || answer === 'sí' || answer === 'si'
}

async function main() {
  console.log()
  console.log(`${BOLD}${CYAN}iris Setup — Alesco AI Ecosystem${RESET}`)
  console.log('─'.repeat(50))

  const TOTAL = 7

  // ─── Step 1: Tool verification ───────────────────────
  step(1, TOTAL, 'Verificando herramientas CLI...')

  const tools = [
    { name: 'Node.js',    cmd: 'node --version',       install: 'winget install OpenJS.NodeJS.LTS' },
    { name: 'Claude Code',cmd: 'claude --version',      install: 'npm install -g @anthropic-ai/claude-code' },
    { name: 'Engram',     cmd: 'engram --version',      install: 'See: github.com/Geraldow/engram/releases' },
    { name: 'CodeGraph',  cmd: 'codegraph --version',   install: 'npm install -g @codegraph/cli' },
    { name: 'agy',        cmd: 'agy --version',         install: 'See: Antigravity releases' },
    { name: 'kilo',       cmd: 'kilocode --version',    install: 'See: Kilo releases' },
    { name: 'opencode',   cmd: 'opencode --version',    install: 'npm install -g opencode' },
    { name: 'gh',         cmd: 'gh --version',          install: 'winget install GitHub.cli' },
  ]

  for (const tool of tools) {
    const version = check(tool.cmd)
    if (version) {
      ok(`${tool.name} ${version}`)
    } else {
      fail(`${tool.name} → no encontrado`)
      warn(`  Instalar: ${tool.install}`)
    }
  }

  // ─── Step 2: Google Drive detection ──────────────────
  step(2, TOTAL, 'Detectando Google Drive...')

  const detectScript = join(PACKAGE_ROOT, 'scripts', 'detect-alesco-path.ps1')
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

  if (!alescoPath && existsSync(detectScript)) {
    info('Buscando carpeta Alesco en Google Drive...')
    const result = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-File', detectScript], {
      encoding: 'utf-8', timeout: 20000,
    })
    alescoPath = result.stdout?.trim() ?? null
    if (alescoPath && existsSync(alescoPath)) {
      ok(`Carpeta Alesco encontrada: ${alescoPath}`)
    } else {
      warn('No se encontró carpeta Alesco en Google Drive')
      alescoPath = null
    }
  }

  // ─── Step 3: Configure alesco_path ───────────────────
  step(3, TOTAL, 'Configurando alesco_path (iris.local.yaml)...')

  if (alescoPath) {
    const enterprise = join(alescoPath, 'Source', 'odoo-enterprise-18')
    const community = join(alescoPath, 'Source', 'odoo-community-18')
    writeFileSync(LOCAL_YAML, `alesco_path: ${alescoPath}\n`)
    ok(`alesco_path: ${alescoPath}`)
    existsSync(enterprise) ? ok(`enterprise: ${enterprise}`) : warn(`enterprise: no encontrado (${enterprise})`)
    existsSync(community)  ? ok(`community:  ${community}`)  : warn(`community:  no encontrado (${community})`)
  } else {
    warn('alesco_path no configurado — ejecuta: iris_setup para configurarlo manualmente')
  }

  // ─── Step 4: CodeGraph initialization ────────────────
  step(4, TOTAL, 'Inicializando CodeGraph...')

  const initScript = join(PACKAGE_ROOT, 'scripts', 'init-codegraph.ps1')
  if (existsSync(initScript)) {
    spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-File', initScript], {
      stdio: 'inherit', timeout: 120000,
    })
  } else {
    warn('init-codegraph.ps1 no encontrado — salteando')
  }

  // ─── Step 5: Engram configuration ────────────────────
  step(5, TOTAL, 'Verificando Engram...')

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
  step(6, TOTAL, 'Registrando MCPs en Claude Code...')

  try {
    let config: any = {}
    if (existsSync(CLAUDE_CONFIG)) {
      config = JSON.parse(readFileSync(CLAUDE_CONFIG, 'utf-8'))
    }
    config.mcpServers = config.mcpServers ?? {}

    const irisEntry = { command: 'node', args: [join(PACKAGE_ROOT, 'dist', 'index.js')] }
    config.mcpServers['iris'] = irisEntry
    ok('iris MCP registrado')

    writeFileSync(CLAUDE_CONFIG, JSON.stringify(config, null, 2))
    ok(`Config guardada: ${CLAUDE_CONFIG}`)
  } catch (err) {
    warn(`No se pudo actualizar claude_desktop_config.json: ${(err as Error).message}`)
  }

  // ─── Step 7: Connection check ─────────────────────────
  step(7, TOTAL, 'Verificando conexiones...')

  check('engram --version') ? ok('Engram MCP → OK') : warn('Engram MCP → no disponible')
  check('codegraph --version') ? ok('CodeGraph MCP → OK') : warn('CodeGraph MCP → no disponible')

  // ─── Complete ────────────────────────────────────────
  console.log()
  console.log('─'.repeat(50))
  console.log(`${BOLD}${GREEN}✅ Setup completo. Reinicia Claude Code.${RESET}`)
  console.log()
}

main().catch(err => {
  console.error(`\n${RED}Error durante el setup:${RESET}`, err)
  process.exit(1)
})
