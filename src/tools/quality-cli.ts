#!/usr/bin/env node

/**
 * Quality Scanner CLI — iris
 *
 * Usage:
 *   npx tsx src/tools/quality-cli.ts --module ./path/to/module
 *   npx tsx src/tools/quality-cli.ts --module ./path/to/module --gate pr
 *   npx tsx src/tools/quality-cli.ts --module ./path/to/module --json
 *   npx tsx src/tools/quality-cli.ts --module ./path/to/module --gate deploy --json
 */

import { existsSync } from 'fs'
import { resolve } from 'path'
import { scanModule, checkCiGate, formatReport, reportToJson } from './quality-scanner.js'
import type { CiGate } from '../types/index.js'

function parseArgs(): Record<string, string | boolean> {
  const args = process.argv.slice(2)
  const result: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--json') {
      result.json = true
    } else if (arg === '--help' || arg === '-h') {
      result.help = true
    } else if (arg.startsWith('--module=')) {
      result.module = arg.split('=')[1]
    } else if (arg === '--module' && i + 1 < args.length) {
      result.module = args[++i]
    } else if (arg.startsWith('--gate=')) {
      result.gate = arg.split('=')[1]
    } else if (arg === '--gate' && i + 1 < args.length) {
      result.gate = args[++i]
    } else if (arg.startsWith('--name=')) {
      result.name = arg.split('=')[1]
    } else if (arg === '--name' && i + 1 < args.length) {
      result.name = args[++i]
    } else if (arg.startsWith('--odoo-version=')) {
      result.odooVersion = arg.split('=')[1]
    } else if (arg === '--odoo-version' && i + 1 < args.length) {
      result.odooVersion = args[++i]
    } else if (arg.startsWith('--learning-artifact')) {
      result.learningArtifact = true
    }
  }

  return result
}

function printUsage(): void {
  console.log(`
  Quality Scanner CLI — iris v1.0.0

  Usage:
    npx tsx src/tools/quality-cli.ts --module <path> [options]

  Options:
    --module <path>         Path to Odoo module directory (required)
    --name <name>           Module name (auto-detected from path if omitted)
    --odoo-version <ver>    Odoo version (default: 18.0)
    --gate <gate>           CI gate to check: pre-commit | pr | merge | deploy
    --json                  Output JSON report (default: formatted text)
    --learning-artifact     Include Reciprocal Apprenticeship learning artifact
    --help, -h              Show this help

  Examples:
    npx tsx src/tools/quality-cli.ts --module ./alesco_api_bridge
    npx tsx src/tools/quality-cli.ts --module ./my_module --gate pr --json
    npx tsx src/tools/quality-cli.ts --module ./my_module --gate deploy
`)
}

async function main(): Promise<void> {
  const args = parseArgs()

  if (args.help) {
    printUsage()
    process.exit(0)
  }

  if (!args.module) {
    console.error('❌ Error: --module argument is required')
    printUsage()
    process.exit(1)
  }

  const modulePath: string = resolve(String(args.module))

  if (!existsSync(modulePath)) {
    console.error(`❌ Error: Module path does not exist: ${modulePath}`)
    process.exit(1)
  }

  const validGates: CiGate[] = ['pre-commit', 'pr', 'merge', 'deploy']
  let gate: CiGate | undefined
  if (args.gate) {
    const gateStr = String(args.gate)
    if (!validGates.includes(gateStr as CiGate)) {
      console.error(`❌ Error: Invalid gate '${gateStr}'. Must be one of: ${validGates.join(', ')}`)
      process.exit(1)
    }
    gate = gateStr as CiGate
  }

  const report = await scanModule({
    modulePath,
    moduleName: args.name ? String(args.name) : undefined,
    odooVersion: args.odooVersion ? String(args.odooVersion) : '18.0',
    includeLearningArtifact: Boolean(args.learningArtifact),
  })

  if (args.json) {
    console.log(reportToJson(report))
  } else {
    console.log(formatReport(report))
    console.log(`  Full JSON report available via --json flag`)
    console.log('')
  }

  if (gate) {
    const result = checkCiGate(report, gate)

    if (!args.json) {
      console.log(result.message)
      console.log('')
    }

    if (!result.passed) {
      process.exit(1)
    }
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
