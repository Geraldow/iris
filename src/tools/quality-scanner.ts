/**
 * Odoo Quality Scanner — iris
 *
 * Analyzes an Odoo module directory against the 10-dimension QUALITY_SCORE system.
 * Follows Reciprocal Apprenticeship: every finding includes an explanation.
 *
 * Reference: docs/QUALITY_SCORE.md
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative, basename } from 'path'
import type {
  QualityDimension,
  QualityIssue,
  ScoredDimension,
  QualityReport,
  LearningMoment,
  ScanOptions,
  CiGate,
  CiGateResult,
} from '../types/index.js'

export const EVALUATOR_VERSION = '1.0.0'

export const DIMENSIONS: QualityDimension[] = [
  {
    name: 'Estructural',
    weight: 0.10,
    checks: [
      'OCA directory structure: models/, views/, security/, data/, tests/',
      '__init__.py imports correctly in each directory',
      'wizards/, report/, controllers/ present when needed',
    ],
  },
  {
    name: 'Manifest',
    weight: 0.10,
    checks: [
      '__manifest__.py exists and is valid',
      'Required fields: name, version, category, license, depends, author, data',
      'License is AGPL-3 for OCA modules',
      'Version follows OCA semver: 18.0.1.0.0',
    ],
  },
  {
    name: 'Modelos y ORM',
    weight: 0.20,
    checks: [
      '@api.depends declared on all computed fields',
      '@api.constrains for validation methods',
      'No sudo() without context comment',
      'No cr.execute() without parameterization',
      'No search() in loop (N+1 anti-pattern)',
      'Proper _rec_name, _order, _sql_constraints',
    ],
  },
  {
    name: 'Vistas y UX',
    weight: 0.15,
    checks: [
      'Uses list view (not tree) for Odoo 18',
      'Uses inline invisible instead of attrs',
      'Proper widget attributes (badge, statusbar, monetary)',
      'Search view with filters and favorites',
      'Form view organized with notebook, groups, pages',
    ],
  },
  {
    name: 'Seguridad',
    weight: 0.15,
    checks: [
      'Every model has entry in ir.model.access.csv',
      'Record rules for multi-company if applicable',
      'Field-level security via groups attribute',
      'Controller methods have proper auth=',
      'No hardcoded user IDs',
    ],
  },
  {
    name: 'Tests',
    weight: 0.15,
    checks: [
      'tests/ directory exists',
      'Uses TransactionCase or HttpCase',
      'Tests cover business logic (not just pass)',
      'Test methods count > 0',
    ],
  },
  {
    name: 'i18n',
    weight: 0.05,
    checks: [
      '_() calls on user-facing strings',
      'translate=True on relevant fields',
      'No hardcoded English in QWeb templates',
    ],
  },
  {
    name: 'Performance',
    weight: 0.05,
    checks: [
      'No search() in loop (N+1 queries)',
      'No browse() in loop for related fields',
      'Proper domain filter usage',
      'Computed stored fields have inverse methods',
    ],
  },
  {
    name: 'Documentación',
    weight: 0.03,
    checks: [
      'Methods have docstrings ("""...""")',
      'Complex logic has inline comments',
      'Field definitions have help parameter',
      '__manifest__.py has description and summary',
    ],
  },
  {
    name: 'Mantenibilidad',
    weight: 0.02,
    checks: [
      'Methods have single responsibility',
      'Constants extracted (no magic numbers/strings)',
      'Code follows PEP8 and OCA conventions',
    ],
  },
]

const OCA_DIRS = ['models', 'views', 'security', 'data', 'tests', 'wizards', 'report', 'controllers']

const REQUIRED_DIRS = ['models', 'views', 'security', 'data', 'tests']

const MANIFEST_FIELDS_REQUIRED = ['name', 'version', 'category', 'license', 'depends', 'author']

const ODOO_DOCS_BASE = 'https://www.odoo.com/documentation/18.0/developer/reference/backend'
const OCA_TOOLS_URL = 'https://github.com/OCA/maintainer-tools'

// ─── Helpers ──────────────────────────────────────────────────────────

function walkDir(dir: string, ext: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__pycache__') {
        results.push(...walkDir(fullPath, ext))
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(fullPath)
      }
    }
  } catch {
    /* directory doesn't exist */
  }
  return results
}

function readLines(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return content.split('\n')
  } catch {
    return []
  }
}

function parseManifestField(content: string, field: string): string | null {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`['"]${escaped}['"]\\s*:\\s*['"]([^'"]+)['"]`)
  const match = content.match(re)
  return match ? match[1] : null
}

function parseManifestList(content: string, field: string): string[] {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`['"]${escaped}['"]\\s*:\\s*\\[([\\s\\S]*?)\\]`)
  const match = content.match(re)
  if (!match) return []
  return match[1]
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(Boolean)
}

function getThreshold(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 90) return 'green'
  if (score >= 70) return 'yellow'
  return 'red'
}

function calcScore(penalties: QualityIssue[]): number {
  let s = 1.0
  for (const p of penalties) {
    s *= 1 - p.deduction
  }
  return Math.max(0, Math.round(s * 1000) / 1000)
}

function weightLabel(w: number): string {
  return `${Math.round(w * 100)}%`
}

function findInsideLoop(lines: string[], pattern: RegExp): string[] {
  const results: string[] = []
  let loopStack: { line: number; indent: string }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (!trimmed || trimmed.startsWith('#')) continue

    const indent = line.slice(0, line.length - trimmed.length)
    const stripped = trimmed.replace(/#.*$/, '').trim()

    while (loopStack.length > 0 && indent.length <= loopStack[loopStack.length - 1].indent.length) {
      loopStack.pop()
    }

    if (/^(for|while)\s/.test(stripped)) {
      loopStack.push({ line: i, indent })
    }

    if (loopStack.length > 0 && pattern.test(stripped)) {
      results.push(`Line ${i + 1}: ${trimmed.slice(0, 80)} (inside loop at line ${loopStack[loopStack.length - 1].line + 1})`)
    }
  }

  return results
}

// ─── Dimension Scanners ──────────────────────────────────────────────

export function scanEstructural(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const name = 'Estructural'

  const hasModels = existsSync(join(modulePath, 'models'))
  const hasSecurity = existsSync(join(modulePath, 'security'))

  if (!hasModels) {
    penalties.push({
      rule: 'missing_models_dir',
      severity: 'critical',
      deduction: 0.50,
      message: "Missing required 'models/' directory — Odoo cannot discover model classes",
      fundamental: "Odoo's ORM loader scans the 'models/' directory for Python files with Model classes. Without it, no models are loaded and the module is inert.",
      uiVerification: 'ls <module>/models/ in the filesystem. If missing, add it.',
      fix: 'Create models/ directory with __init__.py and model files.',
      referenceUrl: `${OCA_TOOLS_URL}`,
    })
  }

  if (!hasSecurity) {
    penalties.push({
      rule: 'missing_security_dir',
      severity: 'critical',
      deduction: 0.50,
      message: "Missing required 'security/' directory — ACL and record rules cannot be defined",
      fundamental: "The 'security/' directory holds ir.model.access.csv and ir.rule XML files. Without it, no model access is defined and models are only accessible via sudo().",
      uiVerification: 'Settings → Technical → Security → Access Rights — models without ACL show no entries.',
      fix: 'Create security/ directory with ir.model.access.csv.',
      referenceUrl: `${ODOO_DOCS_BASE}/security.html`,
    })
  }

  for (const dir of REQUIRED_DIRS) {
    if (dir === 'models' || dir === 'security') continue
    if (!existsSync(join(modulePath, dir))) {
      penalties.push({
        rule: `missing_${dir}_dir`,
        severity: 'major',
        deduction: 0.25,
        message: `Missing required '${dir}/' directory`,
        fundamental: `OCA convention requires '${dir}/' for a well-structured module. Each directory has a specific purpose in the Odoo module loader.`,
        uiVerification: `ls <module>/${dir}/ — should exist (can be empty with __init__.py).`,
        fix: `Create ${dir}/ directory.`,
        referenceUrl: `${OCA_TOOLS_URL}`,
      })
    }
  }

  if (existsSync(join(modulePath, 'tests'))) {
    const testFiles = walkDir(join(modulePath, 'tests'), '.py')
    if (testFiles.length === 0 || testFiles.every(f => basename(f) === '__init__.py')) {
      penalties.push({
        rule: 'empty_tests_dir',
        severity: 'minor',
        deduction: 0.10,
        message: "tests/ directory exists but contains no test files",
        fundamental: 'An empty tests/ directory suggests tests were planned but not written. OCA expects meaningful tests for every module.',
        uiVerification: 'Apps → module → Technical → Tests — run tests to verify.',
        fix: 'Add test files to tests/ directory with actual test cases.',
        referenceUrl: `${ODOO_DOCS_BASE}/testing.html`,
      })
    }
  }

  return {
    name,
    weight: 0.10,
    weightLabel: weightLabel(0.10),
    score: calcScore(penalties),
    scorePct: Math.round(calcScore(penalties) * 100),
    penalties,
  }
}

export function scanManifest(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const manifestPath = join(modulePath, '__manifest__.py')

  if (!existsSync(manifestPath)) {
    penalties.push({
      rule: 'missing_manifest',
      severity: 'critical',
      deduction: 1.0,
      message: '__manifest__.py does not exist — module cannot be installed',
      fundamental: "Odoo discovers modules by scanning for __manifest__.py in addons_path. Without it, the module is invisible to Odoo's module system.",
      uiVerification: 'Apps → search for the module. If not listed, manifest is missing.',
      fix: 'Create __manifest__.py with all required fields.',
      referenceUrl: `${ODOO_DOCS_BASE}/module.html`,
    })
    return {
      name: 'Manifest',
      weight: 0.10,
      weightLabel: weightLabel(0.10),
      score: 0,
      scorePct: 0,
      penalties,
    }
  }

  const content = readFileSync(manifestPath, 'utf-8')

  for (const field of MANIFEST_FIELDS_REQUIRED) {
    const val = parseManifestField(content, field)
    if (!val) {
      penalties.push({
        rule: `missing_manifest_field_${field}`,
        severity: 'major',
        deduction: 0.20,
        message: `Missing required manifest field: '${field}'`,
        fundamental: `The '${field}' field in __manifest__.py is required by Odoo for proper module registration and discovery.`,
        uiVerification: 'Apps → module form → verify the field appears correctly.',
        fix: `Add '${field}': 'value' to __manifest__.py.`,
        referenceUrl: `${ODOO_DOCS_BASE}/module.html`,
      })
    }
  }

  const license = parseManifestField(content, 'license')
  if (license && license.toUpperCase() !== 'AGPL-3') {
    penalties.push({
      rule: 'non_agpl_license',
      severity: 'major',
      deduction: 0.50,
      message: `License is '${license}' instead of 'AGPL-3' (required for OCA modules)`,
      fundamental: 'OCA requires AGPL-3 license for all contributed modules to ensure legal compatibility across the community.',
      uiVerification: 'Apps → module form → License field.',
      fix: "Change license to 'AGPL-3'.",
      referenceUrl: `${OCA_TOOLS_URL}`,
    })
  }

  const version = parseManifestField(content, 'version')
  if (version) {
    const versionPattern = /^\d{2}\.\d+\.\d+\.\d+\.\d+$/
    if (!versionPattern.test(version)) {
      penalties.push({
        rule: 'invalid_version_format',
        severity: 'minor',
        deduction: 0.15,
        message: `Version '${version}' does not follow OCA semver format (e.g., 18.0.1.0.0)`,
        fundamental: 'OCA version format is {odoo_series}.{major}.{minor}.{patch}.{build}. This ensures consistent version comparison across the OCA ecosystem.',
        uiVerification: 'Apps → module form → Version field.',
        fix: `Update version to follow OCA format, e.g., '${version?.split('.')[0] ?? '18'}.0.1.0.0'.`,
        referenceUrl: `${OCA_TOOLS_URL}`,
      })
    }
  }

  const summary = parseManifestField(content, 'summary')
  if (!summary) {
    penalties.push({
      rule: 'missing_summary',
      severity: 'minor',
      deduction: 0.15,
      message: "Missing 'summary' in __manifest__.py",
      fundamental: 'The summary field provides a short description shown in module search results. Without it, users cannot quickly understand the module purpose.',
      uiVerification: 'Apps → search — the summary appears in the module card.',
      fix: "Add 'summary': 'Short module description' to __manifest__.py.",
      referenceUrl: `${ODOO_DOCS_BASE}/module.html`,
    })
  }

  const depends = parseManifestList(content, 'depends')
  if (depends.length === 0 && parseManifestField(content, 'depends') !== null) {
    penalties.push({
      rule: 'empty_depends',
      severity: 'minor',
      deduction: 0.10,
      message: "'depends' list exists but is empty",
      fundamental: 'Odoo modules typically depend on at least base. An empty depends may cause load order issues.',
      uiVerification: 'Apps → module form → Dependencies tab.',
      fix: "Add minimum dependencies: 'base'.",
      referenceUrl: `${ODOO_DOCS_BASE}/module.html`,
    })
  }

  return {
    name: 'Manifest',
    weight: 0.10,
    weightLabel: weightLabel(0.10),
    score: calcScore(penalties),
    scorePct: Math.round(calcScore(penalties) * 100),
    penalties,
  }
}

export function scanOrm(modulePath: string, _odooVersion?: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const pyFiles = walkDir(modulePath, '.py')

  if (pyFiles.length === 0) {
    return {
      name: 'Modelos y ORM',
      weight: 0.20,
      weightLabel: weightLabel(0.20),
      score: 1.0,
      scorePct: 100,
      penalties: [],
    }
  }

  let sudoCount = 0
  let executeCount = 0
  let searchInLoopCount = 0
  let hasDepends = false
  let hasConstrains = false
  let hasRecName = false
  let hasOrder = false
  let hasSqlConstraints = false
  let hasModelConstraint = false
  let computeFieldCount = 0

  for (const filePath of pyFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const relativePath = relative(modulePath, filePath)

    for (const line of lines) {
      const stripped = line.replace(/#.*$/, '').trim()
      if (stripped.includes('@api.depends')) hasDepends = true
      if (stripped.includes('@api.constrains')) hasConstrains = true
      if (/\.sudo\s*\(/.test(stripped)) sudoCount++
      if (/\bcr\.execute\s*\(/.test(stripped)) executeCount++
      if (/fields\.\w+\(.*compute\s*=\s*['"]/.test(stripped)) computeFieldCount++
      if (/\b_rec_name\b/.test(stripped)) hasRecName = true
      if (/\b_order\b/.test(stripped)) hasOrder = true
      if (/\b_sql_constraints\b/.test(stripped)) hasSqlConstraints = true
      if (/models\.Constraint\b/.test(stripped)) hasModelConstraint = true
    }

    if (/\.sudo\s*\(/.test(content)) {
      const sudoLines = lines
        .map((line, i) => ({ line: i + 1, text: line }))
        .filter(l => l.text.includes('.sudo('))
      for (const sl of sudoLines) {
        const lineBefore = sl.line > 1 ? lines[sl.line - 2] : ''
        const hasComment = lineBefore.trim().startsWith('#')
        if (!hasComment) {
          penalties.push({
            rule: 'sudo_without_comment',
            severity: 'major',
            deduction: 0.30,
            message: `sudo() call in ${relativePath}:${sl.line} without context comment`,
            fundamental: 'sudo() bypasses ALL security rules (ACL, record rules, field-level permissions). Every use must be justified with a comment explaining WHY it is necessary. Uncommented sudo() is a security risk.',
            uiVerification: 'Code review: search for .sudo() in Python files. Check if each has a comment above it.',
            fix: `Add comment above line ${sl.line}: # sudo required because <reason>`,
            referenceUrl: `${ODOO_DOCS_BASE}/security.html#sudo`,
          })
        }
      }
    }

    const execPattern = /\bcr\.execute\s*\(\s*(['"`])/g
    const execMatches = content.match(execPattern) ?? []
    if (execMatches.length > 0) {
      for (const match of execMatches) {
        const lineIdx = lines.findIndex(l => l.includes(match))
        if (lineIdx >= 0) {
          const lineText = lines[lineIdx]
          if (lineText.includes('%') || lineText.includes('+' + ' ')) {
            penalties.push({
              rule: 'sql_parameterization',
              severity: 'critical',
              deduction: 0.30,
              message: `Possible unparameterized SQL in ${relativePath}:${lineIdx + 1}`,
              fundamental: 'String formatting in cr.execute() opens the door to SQL injection. Always use parameterized queries with %s placeholders and a parameters tuple as second argument.',
              uiVerification: 'Code review: search for cr.execute() with % or + operators.',
              fix: `Use: cr.execute("SELECT * FROM table WHERE id = %s", [record_id])`,
              referenceUrl: `${ODOO_DOCS_BASE}/orm.html#sql-queries`,
            })
          }
        }
      }
    }

    if (computeFieldCount > 0) {
      const computeMethods = lines.filter(l => /\bdef _compute_/.test(l))
      const computeLines = lines
        .map((l, i) => ({ line: i + 1, text: l }))
        .filter(l => /\bdef _compute_/.test(l.text))

      for (const cm of computeLines) {
        const hasDecorator = cm.line > 1 && lines[cm.line - 2].includes('@api.depends')
        if (!hasDecorator) {
          penalties.push({
            rule: 'compute_without_depends',
            severity: 'major',
            deduction: 0.25,
            message: `Compute method '${cm.text.trim().replace(/^def\s+/, '')}' in ${relativePath}:${cm.line} has no @api.depends decorator`,
            fundamental: 'Without @api.depends, Odoo does not know when to recompute the field. It will compute once and never update, leading to stale data.',
            uiVerification: 'Technical → Fields → search for computed field → check depends.',
            fix: "Add @api.depends('field1', 'field2') above the compute method.",
            referenceUrl: `${ODOO_DOCS_BASE}/orm.html#computed-fields`,
          })
        }
      }
    }

    const searchInLoop = findInsideLoop(lines, /\bsearch\s*\(/)
    searchInLoopCount += searchInLoop.length
    for (const finding of searchInLoop) {
      penalties.push({
        rule: 'search_in_loop',
        severity: 'major',
        deduction: 0.20,
        message: `search() in loop in ${relativePath}:${finding}`,
        fundamental: 'Calling search() inside a for loop creates N+1 queries: 1 for the outer search + N for each iteration. With 100 records, this becomes 101 SQL queries instead of 2. Use search() once with a domain filter and process the result set, or use mapped() and prefetch.',
        uiVerification: 'Enable "Debug with tools" → Query Count. Open the view and check the query count in the top-right corner.',
        fix: 'Move search() outside the loop. Use search() with a combined domain that covers all records at once.',
        referenceUrl: `${ODOO_DOCS_BASE}/orm.html#performance`,
      })
    }
  }

  if (!hasRecName && pyFiles.length > 0) {
    penalties.push({
      rule: 'missing_rec_name',
      severity: 'minor',
      deduction: 0.10,
      message: "No '_rec_name' found in any model class",
      fundamental: "_rec_name defines which field is used when representing a record as a string (e.g., in many2one dropdowns). Without it, Odoo uses 'name' by default, which may not be the right field.",
      uiVerification: 'Technical → Models → select model → check "Record Name" field.',
      fix: "Add _rec_name = 'field_name' to the Model class.",
      referenceUrl: `${ODOO_DOCS_BASE}/orm.html#fields`,
    })
  }

  if (!hasOrder && pyFiles.length > 0) {
    penalties.push({
      rule: 'missing_order',
      severity: 'minor',
      deduction: 0.05,
      message: "No '_order' found in any model class",
      fundamental: "_order defines the default sort order for records. Without it, records are returned in undefined order (usually by id).",
      uiVerification: 'Technical → Models → select model → check "Default Order" field.',
      fix: "Add _order = 'field_name desc' or similar to the Model class.",
      referenceUrl: `${ODOO_DOCS_BASE}/orm.html#fields`,
    })
  }

  if (!hasSqlConstraints && !hasModelConstraint && pyFiles.length > 0) {
    penalties.push({
      rule: 'missing_constraints',
      severity: 'info',
      deduction: 0.05,
      message: "No '_sql_constraints' or 'models.Constraint' found",
      fundamental: 'SQL constraints enforce data integrity at the database level (unique, check). They catch invalid data before it reaches the application layer.',
      uiVerification: 'Technical → Models → select model → check Constraints tab.',
      fix: "Add _sql_constraints or models.Constraint for fields that need uniqueness or validation.",
      referenceUrl: `${ODOO_DOCS_BASE}/orm.html#constraints`,
    })
  }

  return {
    name: 'Modelos y ORM',
    weight: 0.20,
    weightLabel: weightLabel(0.20),
    score: calcScore(penalties),
    scorePct: Math.round(calcScore(penalties) * 100),
    penalties,
  }
}

export function scanViews(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const xmlFiles = walkDir(modulePath, '.xml').filter(f => {
    const content = readFileSync(f, 'utf-8')
    return content.includes('<record') || content.includes('<field name="inherit_id"') || content.includes('model="ir.ui.view"')
  })

  if (xmlFiles.length === 0) {
    return {
      name: 'Vistas y UX',
      weight: 0.15,
      weightLabel: weightLabel(0.15),
      score: 1.0,
      scorePct: 100,
      penalties: [],
    }
  }

  for (const filePath of xmlFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const relativePath = relative(modulePath, filePath)

    const hasTreeView = /<tree\s/.test(content)
    const hasListView = /<list\s/.test(content)
    const hasAttrs = /\battrs\s*=\s*['"][^'"]*['"]/.test(content)
    const hasFormView = /<form\s/.test(content)
    const hasSearchView = /<search\s/.test(content)
    const hasKanban = /<kanban\s/.test(content)
    const hasNotebook = /<notebook>/.test(content) || /<notebook\s/.test(content)
    const hasWidget = /widget\s*=\s*['"]/.test(content)
    const hasInvisible = /\binvisible\s*=\s*['"]/.test(content)

    if (hasTreeView && !hasListView) {
      penalties.push({
        rule: 'uses_tree_instead_of_list',
        severity: 'minor',
        deduction: 0.10,
        message: `Uses <tree> instead of <list> in ${relativePath} (Odoo 18)`,
        fundamental: 'Odoo 18 renamed <tree> views to <list>. While <tree> still works for backward compatibility, <list> is the modern standard.',
        uiVerification: 'Settings → Technical → Views → open the view → check the Type field.',
        fix: "Rename <tree> to <list> in the view definition.",
        referenceUrl: `${ODOO_DOCS_BASE}/views.html#list`,
      })
    }

    if (hasAttrs && !hasInvisible) {
      const attrsMatches = content.match(/\battrs\s*=\s*['"][^'"]*['"]/g) ?? []
      if (attrsMatches.length > 2) {
        penalties.push({
          rule: 'attrs_over_invisible',
          severity: 'minor',
          deduction: 0.10,
          message: `Heavy use of 'attrs' in ${relativePath} — prefer inline 'invisible' (Odoo 18)`,
          fundamental: 'Odoo 18 supports inline invisible attribute which is more readable and maintainable than attrs="{ \'invisible\': [(\'state\', \'=\', \'draft\')] }".',
          uiVerification: 'Settings → Technical → Views → view architecture → check attrs usage.',
          fix: "Replace attrs with inline invisible where possible: invisible=\"state == 'draft'\"",
          referenceUrl: `${ODOO_DOCS_BASE}/views.html#attributes`,
        })
      }
    }

    if (hasFormView && !hasNotebook) {
      penalties.push({
        rule: 'form_without_notebook',
        severity: 'minor',
        deduction: 0.15,
        message: `Form view in ${relativePath} lacks <notebook> organization`,
        fundamental: 'OCA best practice recommends using notebook tabs to organize form views with many fields. A flat form is harder to navigate.',
        uiVerification: 'Open the form view in Odoo → check if it uses tabs.',
        fix: "Add <notebook> with <page> elements to organize fields by category.",
        referenceUrl: `${ODOO_DOCS_BASE}/views.html#form`,
      })
    }

    if (!hasSearchView) {
      penalties.push({
        rule: 'missing_search_view',
        severity: 'minor',
        deduction: 0.10,
        message: `No search view found for ${relativePath}`,
        fundamental: 'Search views define filters, groupings, and favorites that make the list/kanban view usable. Without them, users can only do basic searches.',
        uiVerification: 'Open a list view → focus on search bar → check if filters/group by are defined.',
        fix: "Add a <search> view with <filter> and <group> elements.",
        referenceUrl: `${ODOO_DOCS_BASE}/views.html#search`,
      })
    }
  }

  return {
    name: 'Vistas y UX',
    weight: 0.15,
    weightLabel: weightLabel(0.15),
    score: calcScore(penalties),
    scorePct: Math.round(calcScore(penalties) * 100),
    penalties,
  }
}

export function scanSecurity(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const securityDir = join(modulePath, 'security')
  const csvPath = join(securityDir, 'ir.model.access.csv')

  const pyFiles = walkDir(modulePath, '.py')
  const modelNames: string[] = []

  for (const filePath of pyFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    for (const line of lines) {
      const match = line.match(/class\s+(\w+)\(/)
      if (match) {
        const name = match[1]
        if (name !== 'IrModelAccess') {
          modelNames.push(name)
        }
      }
    }
  }

  if (!existsSync(csvPath)) {
    penalties.push({
      rule: 'missing_access_csv',
      severity: 'critical',
      deduction: 1.0,
      message: 'ir.model.access.csv does not exist — no model ACL defined',
      fundamental: 'Every model needs explicit access rights in ir.model.access.csv. Without it, only sudo() can access the model. Regular users see "Record does not exist" or cannot see the menu at all.',
      uiVerification: 'Settings → Technical → Security → Access Rights → filter by model. If no entries appear, ACL is missing.',
      fix: 'Create security/ir.model.access.csv with entries for all models.',
      referenceUrl: `${ODOO_DOCS_BASE}/security.html#access-rights`,
    })
  } else {
    const csvLines = readLines(csvPath).filter(l => l.trim() && !l.startsWith('#'))
    if (csvLines.length <= 1) {
      penalties.push({
        rule: 'empty_access_csv',
        severity: 'major',
        deduction: 0.30,
        message: 'ir.model.access.csv has no ACL entries (only header or comments)',
        fundamental: 'An ACL file without entries provides no access to any model. Every model needs at minimum read access for base.group_user.',
        uiVerification: 'Settings → Technical → Security → Access Rights → model has no ACL entry.',
        fix: 'Add ACL entries for each model in ir.model.access.csv.',
        referenceUrl: `${ODOO_DOCS_BASE}/security.html#access-rights`,
      })
    }

    if (modelNames.length > 0) {
      const modelIds = csvLines
        .map(l => l.split(',')[2]?.trim())
        .filter(Boolean)
      const missingModels = modelNames.filter(m => {
        const modelId = `model_${m.toLowerCase().replace(/\./g, '_')}`
        return !modelIds.some(mid => mid === modelId)
      })
      if (missingModels.length > 0) {
        penalties.push({
          rule: 'models_without_acl',
          severity: 'critical',
          deduction: 0.50,
          message: `Models missing from ir.model.access.csv: ${missingModels.join(', ')}`,
          fundamental: 'Each model requires an ACL entry. Missing ACL means only superuser can access the model data.',
          uiVerification: 'Settings → Technical → Security → Access Rights → filter by model.',
          fix: `Add ACL entries for: ${missingModels.join(', ')}`,
          referenceUrl: `${ODOO_DOCS_BASE}/security.html#access-rights`,
        })
      }
    }
  }

  const ruleFiles = walkDir(securityDir, '.xml')
  const hasRecordRules = ruleFiles.some(f => {
    const content = readFileSync(f, 'utf-8')
    return content.includes('ir.rule') || content.includes('ir.rule')
  })

  if (!hasRecordRules && modelNames.length > 0) {
    penalties.push({
      rule: 'missing_record_rules',
      severity: 'minor',
      deduction: 0.15,
      message: 'No record rules (ir.rule) found — consider multi-company or multi-user isolation',
      fundamental: 'Without record rules, all users with access to a model can see ALL records. For multi-company setups, this is a data leak.',
      uiVerification: 'Settings → Technical → Security → Record Rules → filter by model.',
      fix: 'Add ir.rule entries with domain_force for data isolation (e.g., company_id or user_id).',
      referenceUrl: `${ODOO_DOCS_BASE}/security.html#record-rules`,
    })
  }

  const controllerFiles = walkDir(modulePath, '.py').filter(f => {
    const content = readFileSync(f, 'utf-8')
    return content.includes('@http.route')
  })

  for (const filePath of controllerFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const relativePath = relative(modulePath, filePath)
    const publicRoutes: string[] = []
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("auth='public'")) {
        const routeMatch = lines[i - 1]?.match(/route\s*=\s*['"]([^'"]+)['"]/)
        if (routeMatch) publicRoutes.push(routeMatch[1])
      }
    }
    if (publicRoutes.length > 0) {
      penalties.push({
        rule: 'public_controller_routes',
        severity: 'major',
        deduction: 0.20,
        message: `Public routes (auth='public') in ${relativePath}: ${publicRoutes.join(', ')}`,
        fundamental: "Public routes require NO authentication. Anyone with the URL can access them. Ensure they do not expose sensitive data or operations.",
        uiVerification: 'Browse to the route without being logged in. If data is exposed, it is a security issue.',
        fix: "Change auth='public' to auth='user' if the route does not need anonymous access.",
        referenceUrl: `${ODOO_DOCS_BASE}/security.html`,
      })
    }
  }

  return {
    name: 'Seguridad',
    weight: 0.15,
    weightLabel: weightLabel(0.15),
    score: calcScore(penalties),
    scorePct: Math.round(calcScore(penalties) * 100),
    penalties,
  }
}

export function scanTests(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const testsDir = join(modulePath, 'tests')

  if (!existsSync(testsDir)) {
    penalties.push({
      rule: 'missing_tests_dir',
      severity: 'critical',
      deduction: 1.0,
      message: "tests/ directory does not exist",
      fundamental: 'OCA requires tests for every module. Without tests, regressions go undetected and business logic is unverified.',
      uiVerification: 'Apps → module → Technical → Tests — no tests available.',
      fix: 'Create tests/ directory with __init__.py and test files.',
      referenceUrl: `${ODOO_DOCS_BASE}/testing.html`,
    })
    return {
      name: 'Tests',
      weight: 0.15,
      weightLabel: weightLabel(0.15),
      score: 0,
      scorePct: 0,
      penalties,
    }
  }

  const testFiles = walkDir(testsDir, '.py').filter(f => basename(f) !== '__init__.py')
  let hasTransactionalCase = false
  let hasHttpCase = false
  let emptyTestCount = 0
  let testMethodCount = 0

  for (const filePath of testFiles) {
    const content = readFileSync(filePath, 'utf-8')
    if (content.includes('TransactionCase')) hasTransactionalCase = true
    if (content.includes('HttpCase')) hasHttpCase = true

    const lines = content.split('\n')
    for (const line of lines) {
      const testMatch = line.match(/def\s+(test_\w+)\s*\(/)
      if (testMatch) testMethodCount++
    }

    if (content.includes('def test_') && content.trim().endsWith('pass')) {
      emptyTestCount++
    }
  }

  if (testFiles.length === 0) {
    penalties.push({
      rule: 'no_test_files',
      severity: 'major',
      deduction: 0.30,
      message: 'tests/ directory exists but no test files found',
      fundamental: 'Test files are how Odoo discovers and runs tests. Without files, the test framework has nothing to execute.',
      uiVerification: 'Apps → module → Technical → Tests → run tests. Nothing to run.',
      fix: 'Create test files with TransactionCase subclasses.',
      referenceUrl: `${ODOO_DOCS_BASE}/testing.html`,
    })
  }

  if (!hasTransactionalCase && testFiles.length > 0) {
    penalties.push({
      rule: 'missing_transaction_case',
      severity: 'minor',
      deduction: 0.10,
      message: 'Tests do not use TransactionCase',
      fundamental: 'TransactionCase provides automatic transaction rollback after each test, keeping test data isolated. It is the standard base class for Odoo tests.',
      uiVerification: 'Open test files → check the class inherits from TransactionCase.',
      fix: 'Have test classes inherit from TransactionCase.',
      referenceUrl: `${ODOO_DOCS_BASE}/testing.html`,
    })
  }

  if (emptyTestCount > 0) {
    penalties.push({
      rule: 'empty_tests',
      severity: 'minor',
      deduction: 0.15,
      message: `${emptyTestCount} test method(s) contain only 'pass' — no real assertions`,
      fundamental: 'Tests that only pass() do not verify any behavior. They create false confidence in test coverage.',
      uiVerification: 'Open the test file → check test methods for actual assertions (assertEqual, assertTrue, etc.).',
      fix: 'Replace pass with real assertions that verify business logic.',
      referenceUrl: `${ODOO_DOCS_BASE}/testing.html`,
    })
  }

  if (testMethodCount < 3 && testFiles.length > 0) {
    penalties.push({
      rule: 'too_few_tests',
      severity: 'minor',
      deduction: 0.10,
      message: `Only ${testMethodCount} test method(s) found — consider adding more coverage`,
      fundamental: 'OCA recommends at least 3-5 test methods per module covering CRUD operations and business logic edge cases.',
      uiVerification: 'Apps → module → Technical → Tests → run tests to see count.',
      fix: 'Add more test methods covering edge cases and business logic.',
      referenceUrl: `${ODOO_DOCS_BASE}/testing.html`,
    })
  }

  return {
    name: 'Tests',
    weight: 0.15,
    weightLabel: weightLabel(0.15),
    score: calcScore(penalties),
    scorePct: Math.round(calcScore(penalties) * 100),
    penalties,
  }
}

export function scanI18n(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const pyFiles = walkDir(modulePath, '.py')
  const xmlFiles = walkDir(modulePath, '.xml')
  let underscoreCount = 0
  let translateCount = 0
  let hardcodedStrings = 0

  for (const filePath of pyFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const relativePath = relative(modulePath, filePath)
    const lines = content.split('\n')

    for (const line of lines) {
      const stripped = line.replace(/#.*$/, '').trim()
      if (/_\s*\(\s*['"`]/.test(stripped)) underscoreCount++
      if (/translate\s*=\s*True/.test(stripped)) translateCount++
    }

    const warningPattern = /(Warning|Error|Success|Failed|Cancel|Save|Delete)\s*['"`:]/g
    const warningMatches = content.match(warningPattern)
    if (warningMatches) {
      const relativeFile = relativePath
      const matchLines = lines
        .map((l, i) => ({ line: i + 1, text: l }))
        .filter(l => /['"][A-Z][a-z]+[^'"]*['"]/.test(l.text) && !l.text.includes('_('))
      for (const ml of matchLines.slice(0, 3)) {
        hardcodedStrings++
        if (hardcodedStrings <= 3) {
          penalties.push({
            rule: 'hardcoded_string',
            severity: 'major',
            deduction: 0.25,
            message: `Possible hardcoded string in ${relativeFile}:${ml.line} — "${ml.text.trim().slice(0, 60)}"`,
            fundamental: 'User-facing strings must use _() for translation. Hardcoded English strings cannot be translated to other languages.',
            uiVerification: 'Settings → Technical → Translations → Translatable Terms → search for the string. If not found, it is hardcoded.',
            fix: "Wrap the string in _(): _('Original String')",
            referenceUrl: `${ODOO_DOCS_BASE}/i18n.html`,
          })
        }
      }
    }
  }

  for (const filePath of xmlFiles) {
    const content = readFileSync(filePath, 'utf-8')
    if (content.includes('QWeb') || content.includes('t-')) {
      const relativePath = relative(modulePath, filePath)
      const lines = content.split('\n')

      const viewStrings = lines
        .map((l, i) => ({ line: i + 1, text: l }))
        .filter(l => {
          const trimmed = l.text.trim()
          return (
            !trimmed.startsWith('<!--') &&
            !trimmed.includes('_(') &&
            !trimmed.includes('translate=') &&
            /(>[A-Z][a-z]+[\s\S]*?<)/.test(trimmed) &&
            !trimmed.includes('string="') &&
            !trimmed.includes('help="')
          )
        })

      for (const vl of viewStrings.slice(0, 2)) {
        hardcodedStrings++
        penalties.push({
          rule: 'hardcoded_qweb_string',
          severity: 'major',
          deduction: 0.25,
          message: `Possible hardcoded UI string in QWeb template ${relativePath}:${vl.line}`,
          fundamental: 'QWeb templates should use t-out with translated strings, not raw English text. Hardcoded text in templates is invisible to Odoo translation system.',
          uiVerification: 'Switch user language → check if the string is still in English.',
          fix: "Use t-out='_(\"Translated String\")' or define the string in a field with translate=True.",
          referenceUrl: `${ODOO_DOCS_BASE}/i18n.html`,
        })
      }
    }
  }

  if (underscoreCount === 0 && pyFiles.length > 0) {
    penalties.push({
      rule: 'no_translation_calls',
      severity: 'minor',
      deduction: 0.25,
      message: 'No _() translation calls found in Python files',
      fundamental: 'User-facing strings in Python (error messages, warnings, notifications) should use _() for internationalization.',
      uiVerification: 'Search Python files for _("string") pattern.',
      fix: 'Wrap user-facing strings with _() function.',
      referenceUrl: `${ODOO_DOCS_BASE}/i18n.html`,
    })
  }

  return {
    name: 'i18n',
    weight: 0.05,
    weightLabel: weightLabel(0.05),
    score: calcScore(penalties),
    scorePct: Math.round(calcScore(penalties) * 100),
    penalties,
  }
}

export function scanPerformance(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const pyFiles = walkDir(modulePath, '.py')

  for (const filePath of pyFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const relativePath = relative(modulePath, filePath)

    const browseInLoop = findInsideLoop(lines, /\bbrowse\s*\(/)
    for (const finding of browseInLoop.slice(0, 5)) {
      penalties.push({
        rule: 'browse_in_loop',
        severity: 'major',
        deduction: 0.30,
        message: `browse() inside loop in ${relativePath}: ${finding}`,
        fundamental: 'browse() inside a loop generates N+1 SQL queries. Use mapped() or prefetch to load related records in bulk before the loop.',
        uiVerification: 'Enable Query Count in debug tools. Open the view that triggers this method and monitor the query count.',
        fix: "Move browse() outside the loop or use prefetch/mapped(): records.mapped('field_id')",
        referenceUrl: `${ODOO_DOCS_BASE}/orm.html#performance`,
      })
    }

    const searchInLoop = findInsideLoop(lines, /\bsearch\s*\(/)
    if (searchInLoop.length > 0) {
      penalties.push({
        rule: 'search_in_loop_perf',
        severity: 'major',
        deduction: 0.40,
        message: `${searchInLoop.length} search() inside loop occurrence(s) in ${relativePath} — N+1 anti-pattern`,
        fundamental: 'Each search() inside a loop is a separate SQL query. With 100 iterations, this produces 100+ queries instead of 2. This is the most common Odoo performance anti-pattern.',
        uiVerification: 'Debug Tools → Query Count. If you see queries growing linearly with record count, N+1 is happening.',
        fix: "Collect all values first, then do a single search() with a domain using 'in' operator.",
        referenceUrl: `${ODOO_DOCS_BASE}/orm.html#performance`,
      })
    }

    const computeStored = content.match(/fields\.\w+\([^)]*compute\s*=\s*['"]([^'"]+)['"][^)]*store\s*=\s*True[^)]*\)/g)
    if (computeStored) {
      for (const match of computeStored) {
        const methodName = match.match(/compute\s*=\s*['"]([^'"]+)['"]/)?.[1]
        if (methodName) {
          const methodDef = new RegExp(`def\\s+${methodName}\\s*\\(`)
          const methodContent = content.match(methodDef)
          if (methodContent) {
            const hasInverse = content.includes(`def inverse_${methodName}`) || content.includes(`${methodName}_inverse`)
            if (!hasInverse) {
              penalties.push({
                rule: 'stored_compute_no_inverse',
                severity: 'minor',
                deduction: 0.20,
                message: `Stored computed field method '${methodName}' in ${relativePath} has no inverse method`,
                fundamental: 'Stored computed fields should have an inverse method to allow direct writing. Without it, the field is read-only even in forms.',
                uiVerification: 'Technical → Fields → search for the field → check if "Read-only" is checked.',
                fix: `Add an inverse method: def inverse_${methodName}(self): ...`,
                referenceUrl: `${ODOO_DOCS_BASE}/orm.html#computed-fields`,
              })
            }
          }
        }
      }
    }
  }

  if (penalties.length === 0) {
    return {
      name: 'Performance',
      weight: 0.05,
      weightLabel: weightLabel(0.05),
      score: 1.0,
      scorePct: 100,
      penalties: [],
    }
  }

  const score = calcScore(penalties)
  return {
    name: 'Performance',
    weight: 0.05,
    weightLabel: weightLabel(0.05),
    score,
    scorePct: Math.round(score * 100),
    penalties: penalties.slice(0, 10),
  }
}

export function scanDocumentation(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const pyFiles = walkDir(modulePath, '.py')

  let docstringCount = 0
  let methodCount = 0
  let fieldCount = 0
  let fieldHelpCount = 0
  let totalLines = 0

  for (const filePath of pyFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    totalLines += lines.length
    const relativePath = relative(modulePath, filePath)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.match(/def\s+\w+\s*\(/)) {
        methodCount++
        const nextLine = lines[i + 1]?.trim() ?? ''
        if (nextLine.startsWith('"""') || nextLine.startsWith("'''")) {
          docstringCount++
        }
      }
      if (line.match(/fields\.\w+\(/)) {
        fieldCount++
        if (line.includes('help=')) {
          fieldHelpCount++
        }
      }
    }

    const linesWithoutDocs = lines
      .map((l, i) => ({ line: i + 1, text: l }))
      .filter(l => {
        const trimmed = l.text.trim()
        return (
          !trimmed.startsWith('#') &&
          !trimmed.startsWith('"""') &&
          !trimmed.startsWith("'''") &&
          /^\s+def\s+\w+\s*\(/.test(trimmed) &&
          l.line < lines.length &&
          !lines[l.line]?.trim().startsWith('"""') &&
          !lines[l.line]?.trim().startsWith("'''")
        )
      })

    for (const nd of linesWithoutDocs.slice(0, 5)) {
      penalties.push({
        rule: 'missing_docstring',
        severity: 'minor',
        deduction: 0.10,
        message: `Method '${nd.text.trim().match(/def\s+(\w+)/)?.[1] ?? 'unknown'}' in ${relativePath}:${nd.line} has no docstring`,
        fundamental: 'Docstrings explain WHY a method exists and WHAT it does, not HOW. They are essential for maintainability and are part of OCA coding standards.',
        uiVerification: 'Open the Python file in an editor and check for """ documentation.',
        fix: 'Add a docstring explaining the purpose, args, and return value.',
        referenceUrl: `${OCA_TOOLS_URL}`,
      })
    }
  }

  if (fieldCount > 0 && fieldHelpCount < fieldCount * 0.5) {
    penalties.push({
      rule: 'missing_field_help',
      severity: 'minor',
      deduction: 0.15,
      message: `Only ${fieldHelpCount}/${fieldCount} fields have 'help' parameter`,
      fundamental: "The 'help' parameter on fields provides tooltip documentation visible in the UI. It helps users understand what each field does without external documentation.",
      uiVerification: 'Hover over any field in a form view — if no tooltip appears, help is missing.',
      fix: "Add help='Description of the field' to each field definition.",
      referenceUrl: `${ODOO_DOCS_BASE}/orm.html#fields`,
    })
  }

  const manifestPath = join(modulePath, '__manifest__.py')
  if (existsSync(manifestPath)) {
    const manifestContent = readFileSync(manifestPath, 'utf-8')
    const description = parseManifestField(manifestContent, 'description')
    const summary = parseManifestField(manifestContent, 'summary')

    if (!description) {
      penalties.push({
        rule: 'missing_manifest_description',
        severity: 'minor',
        deduction: 0.20,
        message: "__manifest__.py has no 'description' field",
        fundamental: 'The description field provides detailed module documentation shown in the Apps module view.',
        uiVerification: 'Apps → module form → check the description section.',
        fix: "Add 'description': 'Detailed module description...' to __manifest__.py.",
        referenceUrl: `${ODOO_DOCS_BASE}/module.html`,
      })
    }

    if (!summary) {
      penalties.push({
        rule: 'missing_manifest_summary',
        severity: 'minor',
        deduction: 0.15,
        message: "__manifest__.py has no 'summary' field",
        fundamental: 'The summary appears in module search results and cards, helping users quickly understand the module purpose.',
        uiVerification: 'Apps → search module → check the subtitle text.',
        fix: "Add 'summary': 'Short module summary' to __manifest__.py.",
        referenceUrl: `${ODOO_DOCS_BASE}/module.html`,
      })
    }
  }

  const score = calcScore(penalties)
  return {
    name: 'Documentación',
    weight: 0.03,
    weightLabel: weightLabel(0.03),
    score,
    scorePct: Math.round(score * 100),
    penalties,
  }
}

export function scanMaintainability(modulePath: string): ScoredDimension {
  const penalties: QualityIssue[] = []
  const pyFiles = walkDir(modulePath, '.py')

  for (const filePath of pyFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const relativePath = relative(modulePath, filePath)

    let currentMethod = ''
    let methodStartLine = 0
    let methodIndent = ''
    let methodLineCount = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trimStart()

      if (trimmed.startsWith('def ') && trimmed.endsWith(':')) {
        if (methodLineCount > 100) {
          penalties.push({
            rule: 'method_too_long',
            severity: 'minor',
            deduction: 0.30,
            message: `Method '${currentMethod}' in ${relativePath}:${methodStartLine} is ${methodLineCount} lines (max recommended: 50)`,
            fundamental: 'Long methods violate the Single Responsibility Principle. They are harder to test, review, and maintain. OCA recommends methods under 50 lines.',
            uiVerification: 'Open the file in an editor and check method length.',
            fix: 'Refactor the method into smaller helper methods, each with a single responsibility.',
            referenceUrl: `${OCA_TOOLS_URL}`,
          })
        }

        const methodName = trimmed.match(/def\s+(\w+)/)?.[1] ?? 'unknown'
        currentMethod = `${methodName}()`
        methodStartLine = i + 1
        methodIndent = line.slice(0, line.length - trimmed.length)
        methodLineCount = 0
        continue
      }

      if (currentMethod) {
        if (line.trim().length === 0 || line.trimStart().startsWith('#')) {
          methodLineCount++
          continue
        }
        const currentIndent = line.slice(0, line.length - line.trimStart().length)
        if (currentIndent.length <= methodIndent.length && line.trim().length > 0) {
          if (methodLineCount > 100) {
            penalties.push({
              rule: 'method_too_long',
              severity: 'minor',
              deduction: 0.30,
              message: `Method '${currentMethod}' in ${relativePath}:${methodStartLine} is ${methodLineCount} lines (max recommended: 50)`,
              fundamental: 'Long methods are a maintainability risk. They accumulate complexity and become untestable.',
              uiVerification: 'Count lines between def and next def at same indent level.',
              fix: 'Extract logical blocks into separate methods.',
              referenceUrl: `${OCA_TOOLS_URL}`,
            })
          }
          currentMethod = ''
          methodLineCount = 0
          continue
        }
        methodLineCount++
      }
    }

    const magicNumberPattern = /[=!<>]+\s*\d{4,}\b|==\s*\d{4,}\b/g
    const magicMatches = content.match(magicNumberPattern) ?? []
    if (magicMatches.length > 0) {
      penalties.push({
        rule: 'magic_numbers',
        severity: 'minor',
        deduction: 0.20,
        message: `${magicMatches.length} possible magic number(s) in ${relativePath} — extract to named constants`,
        fundamental: 'Magic numbers make code hard to understand and modify. A named constant (e.g., MAX_RETRIES = 3) is self-documenting.',
        uiVerification: 'Code review: search for numeric literals that are not 0, 1, or obvious counters.',
        fix: 'Extract magic numbers to module-level constants with descriptive names.',
        referenceUrl: `${OCA_TOOLS_URL}`,
      })
    }
  }

  const score = calcScore(penalties)
  return {
    name: 'Mantenibilidad',
    weight: 0.02,
    weightLabel: weightLabel(0.02),
    score,
    scorePct: Math.round(score * 100),
    penalties,
  }
}

// ─── Main Scanner ────────────────────────────────────────────────────

export async function scanModule(options: ScanOptions): Promise<QualityReport> {
  const modulePath = options.modulePath
  const odooVersion = options.odooVersion ?? '18.0'

  let moduleName = options.moduleName
  if (!moduleName) {
    moduleName = basename(modulePath)
  }

  let moduleVersion = '0.0'
  const manifestPath = join(modulePath, '__manifest__.py')
  if (existsSync(manifestPath)) {
    const content = readFileSync(manifestPath, 'utf-8')
    const ver = parseManifestField(content, 'version')
    if (ver) moduleVersion = ver
  }

  const dimensions: ScoredDimension[] = [
    scanEstructural(modulePath),
    scanManifest(modulePath),
    scanOrm(modulePath, odooVersion),
    scanViews(modulePath),
    scanSecurity(modulePath),
    scanTests(modulePath),
    scanI18n(modulePath),
    scanPerformance(modulePath),
    scanDocumentation(modulePath),
    scanMaintainability(modulePath),
  ]

  let overallScore = 0
  const learningMoments: LearningMoment[] = []
  let dimensionsWithExplanation = 0

  for (const dim of dimensions) {
    const weight = DIMENSIONS.find(d => d.name === dim.name)?.weight ?? 0
    overallScore += weight * dim.score * 100

    for (const penalty of dim.penalties) {
      if (penalty.fundamental) {
        learningMoments.push({
          dimension: dim.name,
          severity: penalty.severity,
          concept: penalty.rule.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          summary: penalty.fundamental.split('.')[0] + '.',
          referenceUrl: penalty.referenceUrl ?? ODOO_DOCS_BASE,
        })
      }
    }

    if (dim.penalties.some(p => p.fundamental)) {
      dimensionsWithExplanation++
    }
  }

  overallScore = Math.round(overallScore)
  const threshold = getThreshold(overallScore)

  const generatedAt = new Date().toISOString()

  const report: QualityReport = {
    meta: {
      module: moduleName,
      version: moduleVersion,
      odooVersion,
      evaluator: 'iris-quality-engine',
      evaluatorVersion: EVALUATOR_VERSION,
    },
    overallScore,
    threshold,
    dimensions,
    learningMoments,
    reciprocalApprenticeship: {
      learningMomentsCount: learningMoments.length,
      dimensionsWithExplanation,
      pillarsApplied: ['Human-First', 'Fundamentals-First', 'Transparency'],
      onionLevelTarget: 2,
      generatedAt,
      methodologyReference: 'RECIPROCAL_APPRENTICESHIP.md',
    },
  }

  return report
}

// ─── JSON Serialization ──────────────────────────────────────────────

export function reportToJson(report: QualityReport): string {
  const json: Record<string, unknown> = {
    meta: {
      module: report.meta.module,
      version: report.meta.version,
      odoo_version: report.meta.odooVersion,
      evaluator: report.meta.evaluator,
      evaluator_version: report.meta.evaluatorVersion,
    },
    overall_score: report.overallScore,
    threshold: report.threshold,
    dimensions: report.dimensions.map(d => ({
      name: d.name,
      weight: d.weight,
      weight_label: d.weightLabel,
      score: d.score,
      score_pct: d.scorePct,
      penalties: d.penalties.map(p => ({
        rule: p.rule,
        severity: p.severity,
        deduction: p.deduction,
        message: p.message,
        ...(p.fundamental ? { fundamental: p.fundamental } : {}),
        ...(p.uiVerification ? { ui_verification: p.uiVerification } : {}),
        ...(p.fix ? { fix: p.fix } : {}),
        ...(p.referenceUrl ? { reference_url: p.referenceUrl } : {}),
      })),
    })),
    learning_moments: report.learningMoments.map(lm => ({
      dimension: lm.dimension,
      severity: lm.severity,
      concept: lm.concept,
      summary: lm.summary,
      reference_url: lm.referenceUrl,
    })),
    reciprocal_apprenticeship: {
      learning_moments_count: report.reciprocalApprenticeship.learningMomentsCount,
      dimensions_with_explanation: report.reciprocalApprenticeship.dimensionsWithExplanation,
      pillars_applied: report.reciprocalApprenticeship.pillarsApplied,
      onion_level_target: report.reciprocalApprenticeship.onionLevelTarget,
      generated_at: report.reciprocalApprenticeship.generatedAt,
      methodology_reference: report.reciprocalApprenticeship.methodologyReference,
    },
  }

  return JSON.stringify(json, null, 2)
}

// ─── CI Gate ─────────────────────────────────────────────────────────

export function checkCiGate(report: QualityReport, gate: CiGate): CiGateResult {
  const gateConfig: Record<CiGate, { required: number; blockBelow: number; label: string }> = {
    'pre-commit': { required: 70, blockBelow: 50, label: 'Pre-commit Hook' },
    'pr': { required: 80, blockBelow: 80, label: 'PR Gate' },
    'merge': { required: 85, blockBelow: 85, label: 'Merge Gate' },
    'deploy': { required: 90, blockBelow: 90, label: 'Deploy Gate' },
  }

  const config = gateConfig[gate]
  const score = report.overallScore

  if (score < config.blockBelow) {
    return {
      passed: false,
      required: config.required,
      actual: score,
      message: `❌ ${config.label}: Score ${score} < ${config.blockBelow} (required: ${config.required}). Blocking.`,
    }
  }

  if (gate === 'pre-commit' && score >= config.blockBelow && score < config.required) {
    return {
      passed: true,
      required: config.required,
      actual: score,
      message: `⚠️  ${config.label}: Score ${score} is below recommended ${config.required}. Review critical dimensions before committing.`,
    }
  }

  return {
    passed: true,
    required: config.required,
    actual: score,
    message: `✅ ${config.label}: Score ${score} >= ${config.required}. Passed.`,
  }
}

// ─── Report Formatting ───────────────────────────────────────────────

export function formatReport(report: QualityReport): string {
  const lines: string[] = []

  const colorMap = { green: '🟢', yellow: '🟡', red: '🔴' }
  const indicator = colorMap[report.threshold]

  lines.push('')
  lines.push('╔══════════════════════════════════════════════════╗')
  lines.push(`║  ${indicator}  QUALITY SCORE: ${report.overallScore}/100  (${report.threshold.toUpperCase()})`)
  lines.push('╚══════════════════════════════════════════════════╝')
  lines.push('')
  lines.push(`  Module:   ${report.meta.module} v${report.meta.version}`)
  lines.push(`  Odoo:     ${report.meta.odooVersion}`)
  lines.push(`  Evaluator: ${report.meta.evaluator} v${report.meta.evaluatorVersion}`)
  lines.push(`  Generated: ${report.reciprocalApprenticeship.generatedAt}`)
  lines.push('')

  lines.push('  Dimensions:')
  for (const dim of report.dimensions) {
    const dimDef = DIMENSIONS.find(d => d.name === dim.name)
    const bar = scoreBar(dim.scorePct)
    const color = dim.score >= 0.9 ? '🟢' : dim.score >= 0.7 ? '🟡' : '🔴'
    lines.push(`    ${color} ${dimDef?.weight !== undefined ? `${dim.weightLabel.padStart(3)}` : '   '}  ${dim.name.padEnd(20)} ${bar} ${dim.scorePct}%  (${dim.penalties.length} issues)`)
  }

  lines.push('')
  lines.push(`  Threshold: ${indicator} ${report.threshold.toUpperCase()}`)
  lines.push('')

  const issues = report.dimensions.flatMap(d =>
    d.penalties.map(p => ({ ...p, dimension: d.name }))
  )

  if (issues.length > 0) {
    const criticalCount = issues.filter(i => i.severity === 'critical').length
    const majorCount = issues.filter(i => i.severity === 'major').length
    const minorCount = issues.filter(i => i.severity === 'minor' || i.severity === 'info').length

    lines.push(`  Issues: ${criticalCount} critical, ${majorCount} major, ${minorCount} minor/info`)
    lines.push('')

    for (const issue of issues.slice(0, 15)) {
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'major' ? '🟡' : '🟢'
      lines.push(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.message.slice(0, 100)}`)
      if (issue.fundamental) {
        lines.push(`     📖 ${issue.fundamental.slice(0, 120)}`)
      }
      if (issue.fix) {
        lines.push(`     🔧 ${issue.fix.slice(0, 120)}`)
      }
      lines.push('')
    }

    if (issues.length > 15) {
      lines.push(`  ... and ${issues.length - 15} more issue(s)`)
      lines.push('')
    }
  }

  const ra = report.reciprocalApprenticeship
  lines.push('  ── Reciprocal Apprenticeship ──')
  lines.push(`     Learning Moments: ${ra.learningMomentsCount}`)
  lines.push(`     Dimensions with Explanation: ${ra.dimensionsWithExplanation}/10`)
  lines.push(`     Pillars Applied: ${ra.pillarsApplied.join(', ')}`)
  lines.push(`     Onion Level Target: ${ra.onionLevelTarget}`)
  lines.push(`     Methodology: ${ra.methodologyReference}`)
  lines.push('')

  return lines.join('\n')
}

function scoreBar(pct: number, width: number = 16): string {
  const filled = Math.round((pct / 100) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}
