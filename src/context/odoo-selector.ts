import type { ProviderName, OdooTaskType } from '../types/index.js'

export interface TaskConfig {
  primaryProvider: ProviderName
  fallbackProvider: ProviderName
  knowledgeFiles: string[]
  activeRules: string[]
}

// 130+ keyword → task type mappings (all keys lowercase for case-insensitive matching)
export const TASK_KEYWORD_MAP: Record<string, OdooTaskType> = {
  // odoo-source — Module Intelligence Report
  'analizar módulo': 'odoo-source', 'module intelligence': 'odoo-source',
  'odoo-source': 'odoo-source', 'investigar módulo': 'odoo-source',
  'owl→backend': 'odoo-source', 'frontend flow': 'odoo-source',
  'analyze module': 'odoo-source', 'module analysis': 'odoo-source',
  'flujo owl': 'odoo-source', 'odoo source': 'odoo-source',

  // odoo-owl — OWL frontend components
  'owl': 'odoo-owl', 't-component': 'odoo-owl', 'useservice': 'odoo-owl',
  'usestore': 'odoo-owl', 'usestate': 'odoo-owl', 'willstart': 'odoo-owl',
  'willunmount': 'odoo-owl', 'patch(': 'odoo-owl', 'component js': 'odoo-owl',
  'component.js': 'odoo-owl', '.js component': 'odoo-owl', 'owl component': 'odoo-owl',
  'frontend component': 'odoo-owl', 'js widget': 'odoo-owl',
  'static/src/components': 'odoo-owl', 'usebusservice': 'odoo-owl',

  // odoo-view — XML views / QWeb
  'xpath': 'odoo-view', 'inherit_id': 'odoo-view', 'form view': 'odoo-view',
  'tree view': 'odoo-view', 'kanban view': 'odoo-view', 'qweb': 'odoo-view',
  't-if': 'odoo-view', 't-foreach': 'odoo-view', 'ir.ui.view': 'odoo-view',
  'vista formulario': 'odoo-view', 'vista árbol': 'odoo-view',
  'vista kanban': 'odoo-view', 'vista lista': 'odoo-view',
  'agregar campo': 'odoo-view', 'modificar vista': 'odoo-view',

  // odoo-orm — models, fields, ORM
  'fields.': 'odoo-orm', '@api.': 'odoo-orm', '_inherit': 'odoo-orm',
  'many2one': 'odoo-orm', 'one2many': 'odoo-orm', 'many2many': 'odoo-orm',
  'compute': 'odoo-orm', 'inverse': 'odoo-orm', 'search_read': 'odoo-orm',
  'recordset': 'odoo-orm', 'browse(': 'odoo-orm', 'create(': 'odoo-orm',
  'write(': 'odoo-orm', 'unlink(': 'odoo-orm', 'nuevo modelo': 'odoo-orm',
  'nuevo campo': 'odoo-orm', 'new model': 'odoo-orm', 'new field': 'odoo-orm',
  'modelo odoo': 'odoo-orm', 'campo computado': 'odoo-orm',

  // odoo-security — ACL, ir.rule, groups
  'ir.rule': 'odoo-security', 'ir.model.access': 'odoo-security',
  'access rights': 'odoo-security', 'reglas de acceso': 'odoo-security',
  'record rule': 'odoo-security', 'permisos': 'odoo-security',
  'security': 'odoo-security', 'grupos': 'odoo-security',
  'res.groups': 'odoo-security', 'domain filter': 'odoo-security',
  'access control': 'odoo-security',

  // odoo-migration — upgrades, pre-migrate
  'migrate': 'odoo-migration', 'pre-migrate': 'odoo-migration',
  'post-migrate': 'odoo-migration', 'noupdate': 'odoo-migration',
  'upgrade path': 'odoo-migration', 'openupgrade': 'odoo-migration',
  'migración': 'odoo-migration', 'upgrading': 'odoo-migration',
  'version bump': 'odoo-migration', 'module upgrade': 'odoo-migration',

  // odoo-wizard — transient models
  'wizard': 'odoo-wizard', 'transient': 'odoo-wizard', 'ir.actions.act_window': 'odoo-wizard',
  'transientmodel': 'odoo-wizard', 'asistente': 'odoo-wizard',

  // odoo-report — PDF reports, QWeb reports
  'report': 'odoo-report', 'reporte': 'odoo-report', 'ir.actions.report': 'odoo-report',
  'pdf report': 'odoo-report', 'qweb report': 'odoo-report',
  'report template': 'odoo-report', 'plantilla reporte': 'odoo-report',

  // odoo-controller — HTTP routes
  'http.route': 'odoo-controller', '@http.route': 'odoo-controller',
  'controller': 'odoo-controller', 'route': 'odoo-controller',
  'endpoint': 'odoo-controller', 'api endpoint': 'odoo-controller',
  'json route': 'odoo-controller', 'http controller': 'odoo-controller',

  // odoo-mail — chatter, followers, email templates
  'chatter': 'odoo-mail', 'mail.thread': 'odoo-mail', 'mail.activity': 'odoo-mail',
  'follower': 'odoo-mail', 'email template': 'odoo-mail', 'plantilla email': 'odoo-mail',
  'message_post': 'odoo-mail', 'mail_thread': 'odoo-mail',

  // odoo-portal — customer portal
  'portal': 'odoo-portal', 'portal.mixin': 'odoo-portal', 'customer portal': 'odoo-portal',
  'portal route': 'odoo-portal', 'portal template': 'odoo-portal',

  // odoo-test — unit/integration tests
  'test': 'odoo-test', 'tagged(': 'odoo-test', 'unittest': 'odoo-test',
  'common.savepointcase': 'odoo-test', 'test case': 'odoo-test',
  'prueba': 'odoo-test', 'testing': 'odoo-test',

  // odoo-debug — troubleshooting
  'debug': 'odoo-debug', 'error': 'odoo-debug', 'traceback': 'odoo-debug',
  'bug': 'odoo-debug', 'issue': 'odoo-debug', 'falla': 'odoo-debug',
  'problema': 'odoo-debug', 'no funciona': 'odoo-debug',

  // odoo-module — new module scaffold
  'nuevo módulo': 'odoo-module', 'new module': 'odoo-module', 'crear módulo': 'odoo-module',
  '__manifest__': 'odoo-module', 'scaffold': 'odoo-module', 'module structure': 'odoo-module',

  // odoo-accounting
  'account.move': 'odoo-accounting', 'account.journal': 'odoo-accounting',
  'diario contable': 'odoo-accounting', 'asiento': 'odoo-accounting',
  'factura': 'odoo-accounting', 'invoice': 'odoo-accounting',
  'tax': 'odoo-accounting', 'impuesto': 'odoo-accounting',
  'reconciliation': 'odoo-accounting', 'reconciliación': 'odoo-accounting',

  // odoo-stock
  'stock.move': 'odoo-stock', 'stock.picking': 'odoo-stock',
  'stock.quant': 'odoo-stock', 'almacén': 'odoo-stock',
  'warehouse': 'odoo-stock', 'inventory': 'odoo-stock',
  'inventario': 'odoo-stock', 'delivery': 'odoo-stock',
  'receipt': 'odoo-stock', 'picking': 'odoo-stock',

  // odoo-ops — server operations, Odoo.sh
  'odoo.sh': 'odoo-ops', 'staging': 'odoo-ops', 'production deploy': 'odoo-ops',
  'server': 'odoo-ops', 'log file': 'odoo-ops', 'restart': 'odoo-ops',

  // odoo-ci — CI/CD
  'ci': 'odoo-ci', 'pipeline': 'odoo-ci', 'github actions': 'odoo-ci',
  'automated test': 'odoo-ci', 'lint': 'odoo-ci',

  // odoo-api — external API / jsonrpc
  'jsonrpc': 'odoo-api', 'xml-rpc': 'odoo-api', 'external api': 'odoo-api',
  'api call': 'odoo-api', 'odoo api': 'odoo-api', 'web service': 'odoo-api',

  // odoo-commit
  'commit': 'odoo-commit', 'conventional commit': 'odoo-commit',

  // odoo-pr
  'pull request': 'odoo-pr', 'pr': 'odoo-pr', 'merge request': 'odoo-pr',

  // odoo-changelog
  'changelog': 'odoo-changelog', 'release notes': 'odoo-changelog',
  'history': 'odoo-changelog', 'cambios': 'odoo-changelog',

  // odoo-docs — documentation, diagrams, archival synthesis
  'documentar': 'odoo-docs', 'documentation': 'odoo-docs',
  'diagrama': 'odoo-docs', 'diagram': 'odoo-docs',
  'excalidraw': 'odoo-docs', 'mermaid': 'odoo-docs',
  'archivar': 'odoo-docs',
}

// 23 task types → provider + knowledge + rules
export const TASK_CONFIG: Record<OdooTaskType, TaskConfig> = {
  'odoo-source':     { primaryProvider: 'antigravity', fallbackProvider: 'claude',      knowledgeFiles: ['ai/plugins/odoo-source/SKILL.md'],                        activeRules: ['R1','R6','R12'] },
  'odoo-orm':        { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/core/orm-patterns.md'],                      activeRules: ['R1','R7','R10','R13'] },
  'odoo-view':       { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/patterns/xml-views.md'],                     activeRules: ['R1','R5','R7'] },
  'odoo-security':   { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/security/security-patterns.md'],             activeRules: ['R1','R4','R13'] },
  'odoo-wizard':     { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/patterns/wizards.md'],                       activeRules: ['R1','R4','R7'] },
  'odoo-report':     { primaryProvider: 'antigravity',  fallbackProvider: 'claude',      knowledgeFiles: ['ai/knowledge/patterns/reports.md'],                       activeRules: ['R1','R7'] },
  'odoo-owl':        { primaryProvider: 'antigravity',  fallbackProvider: 'claude',      knowledgeFiles: ['ai/knowledge/v18/owl-components.md'],                     activeRules: ['R1','R7','R13'] },
  'odoo-controller': { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/patterns/controllers.md'],                   activeRules: ['R1','R7','R13'] },
  'odoo-mail':       { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/patterns/mail.md'],                          activeRules: ['R1','R7'] },
  'odoo-portal':     { primaryProvider: 'antigravity',  fallbackProvider: 'claude',      knowledgeFiles: ['ai/knowledge/patterns/portal.md'],                        activeRules: ['R1','R7','R13'] },
  'odoo-migration':  { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/core/data-migration.md'],                    activeRules: ['R1','R5'] },
  'odoo-test':       { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/testing/patterns.md'],                       activeRules: ['R1','R7'] },
  'odoo-debug':      { primaryProvider: 'antigravity',  fallbackProvider: 'claude',      knowledgeFiles: ['ai/RULES.md'],                                            activeRules: ['R1'] },
  'odoo-ops':        { primaryProvider: 'claude',       fallbackProvider: 'copilot',     knowledgeFiles: ['contribute/plugins/odoo-ops/SKILL.md'],                   activeRules: ['R2','R3'] },
  'odoo-ci':         { primaryProvider: 'claude',       fallbackProvider: 'copilot',     knowledgeFiles: ['contribute/plugins/odoo-ci/SKILL.md'],                    activeRules: ['R9'] },
  'odoo-api':        { primaryProvider: 'claude',       fallbackProvider: 'antigravity', knowledgeFiles: ['ai/knowledge/patterns/external-api.md'],                  activeRules: ['R13'] },
  'odoo-commit':     { primaryProvider: 'claude',       fallbackProvider: 'claude',      knowledgeFiles: ['contribute/plugins/odoo-commit/SKILL.md'],                activeRules: ['R3','R9'] },
  'odoo-pr':         { primaryProvider: 'claude',       fallbackProvider: 'claude',      knowledgeFiles: ['contribute/plugins/odoo-pr/SKILL.md'],                    activeRules: ['R3','R9'] },
  'odoo-changelog':  { primaryProvider: 'claude',       fallbackProvider: 'claude',      knowledgeFiles: ['contribute/plugins/odoo-changelog/SKILL.md'],             activeRules: ['R9'] },
  'odoo-module':     { primaryProvider: 'antigravity',  fallbackProvider: 'claude',      knowledgeFiles: ['contribute/plugins/odoo-oca/SKILL.md'],                   activeRules: ['R1','R4','R7'] },
  'odoo-accounting': { primaryProvider: 'antigravity',  fallbackProvider: 'claude',      knowledgeFiles: ['ai/knowledge/business/accounting.md'],                   activeRules: ['R1','R7','R10'] },
  'odoo-stock':      { primaryProvider: 'antigravity',  fallbackProvider: 'claude',      knowledgeFiles: ['ai/knowledge/business/stock.md'],                        activeRules: ['R1','R7','R10'] },
  'odoo-docs':       { primaryProvider: 'opencode',     fallbackProvider: 'antigravity', knowledgeFiles: [],                                                         activeRules: [] },
}

export function detectTaskType(
  instruction: string,
): { type: OdooTaskType; config: TaskConfig } | null {
  const lower = instruction.toLowerCase()

  // Check multi-word keys first (longer matches = more specific)
  const sortedKeys = Object.keys(TASK_KEYWORD_MAP).sort((a, b) => b.length - a.length)
  for (const keyword of sortedKeys) {
    if (lower.includes(keyword)) {
      const type = TASK_KEYWORD_MAP[keyword]
      return { type, config: TASK_CONFIG[type] }
    }
  }

  return null
}
