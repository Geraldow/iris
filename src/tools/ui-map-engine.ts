/**
 * UI Map Engine — iris
 *
 * Parses Odoo module source code (XML views, Python models, menu data) and
 * builds a UI Map that enables generating precise navigation routes.
 *
 * This is the technical foundation for Reciprocal Apprenticeship's
 * "show where to verify in UI" learning artifacts.
 *
 * Reference: docs/RECIPROCAL_APPRENTICESHIP.md §4
 */

import { readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { getCachedMap, setCachedMap } from '../context/map-cache.js'
import type {
  UIMap, ModelEntry, FieldEntry, RelationEntry,
  ViewEntry, ViewSection, MenuEntry, ActionEntry,
} from '../types/index.js'

export type { UIMap, ModelEntry, FieldEntry, RelationEntry, ViewEntry, ViewSection, MenuEntry, ActionEntry } from '../types/index.js'

export interface NavigationRoute {
  steps: string[]
  url?: string
  targetView?: string
  relatedButtons?: string[]
  raw: string
}

// ---------------------------------------------------------------------------
// Regex Patterns
// ---------------------------------------------------------------------------

const MODEL_NAME_PATTERN = /_name\s*=\s*['"](\w+(?:\.\w+)*)['"]/
const MODEL_DESC_PATTERN = /_description\s*=\s*['"]([^'"]+)['"]/

const FIELD_PATTERN = /(\w+)\s*=\s*fields\.(\w+)\(([^)]*)\)/g
const STRING_ATTR = /string\s*=\s*['"]([^'"]*)['"]/
const RELATION_ATTR = /(?:comodel_name|relation)\s*=\s*['"]([^'"]+)['"]/
const HELP_ATTR = /help\s*=\s*['"]([^'"]*)['"]/

const VIEW_RECORD_PATTERN = /<record\s+id="([^"]+)"\s+model="ir\.ui\.view">/g
const VIEW_MODEL_PATTERN = /<field\s+name="model">([^<]+)<\/field>/
const VIEW_NAME_PATTERN = /<field\s+name="name">([^<]+)<\/field>/
const VIEW_TYPE_PATTERN = /<(form|tree|kanban|search|list)\s/
const VIEW_INHERIT_PATTERN = /<field\s+name="inherit_id"\s+ref="([^"]+)"/
const FIELD_REF_PATTERN = /<field\s+name="(\w+)"/g

const MENU_RECORD_PATTERN = /<record\s+id="([^"]+)"\s+model="ir\.ui\.menu">/g
const MENU_NAME_PATTERN = /<field\s+name="name">([^<]+)<\/field>/
const MENU_PARENT_PATTERN = /<field\s+name="parent_id"\s+ref="([^"]+)"/
const MENU_ACTION_PATTERN = /<field\s+name="action"\s+ref="([^"]+)"/
const MENU_SEQUENCE_PATTERN = /<field\s+name="sequence">(\d+)<\/field>/

const MENUITEM_PATTERN = /<menuitem\s+id="([^"]+)"[^>]*\/?>/g
const MENUITEM_NAME = /name\s*=\s*"([^"]*)"/
const MENUITEM_PARENT = /parent\s*=\s*"([^"]*)"/
const MENUITEM_ACTION = /action\s*=\s*"([^"]*)"/
const MENUITEM_SEQUENCE = /sequence\s*=\s*"(\d+)"/

const ACTION_RECORD_PATTERN = /<record\s+id="([^"]+)"\s+model="(ir\.actions\.\w+)">/g
const ACTION_RES_MODEL = /<field\s+name="res_model">([^<]+)<\/field>/
const ACTION_NAME_PATTERN = /<field\s+name="name">([^<]+)<\/field>/
const ACTION_VIEW_MODE = /<field\s+name="view_mode">([^<]+)<\/field>/
const ACTION_VIEW_ID = /<field\s+name="([\w_]+_view_id)"\s+ref="([^"]+)"/

const MANIFEST_VERSION = /"version"\s*:\s*"([^"]+)"/
const MANIFEST_NAME = /"name"\s*:\s*"([^"]+)"/
const MANIFEST_DEPENDS = /"depends"\s*:\s*\[([^\]]*)\]/

const VIEW_TYPE_MAP: Record<string, ViewEntry['type']> = {
  form: 'form',
  tree: 'list',
  list: 'list',
  kanban: 'kanban',
  search: 'search',
  activity: 'activity',
  gantt: 'gantt',
  graph: 'graph',
  cohort: 'cohort',
  dashboard: 'dashboard',
}

// ---------------------------------------------------------------------------
// Core: buildUIMap
// ---------------------------------------------------------------------------

export async function buildUIMap(modulePath: string): Promise<UIMap> {
  const cached = getCachedMap(modulePath)
  if (cached) return cached

  const manifest = await parseManifest(modulePath)
  const moduleName = manifest.name || modulePath.split(/[/\\]/).pop() || 'unknown'
  const version = manifest.version || '0.0'

  const models: ModelEntry[] = []
  const views: ViewEntry[] = []
  const menus: MenuEntry[] = []
  const actions: ActionEntry[] = []

  try {
    await stat(modulePath)
  } catch {
    const empty: UIMap = { module: moduleName, version, models, views, menus, actions }
    setCachedMap(modulePath, empty)
    return empty
  }

  const [modelFiles, viewFiles, dataFiles, securityFiles] = await Promise.all([
    discoverFiles(modulePath, ['models']).catch(() => [] as string[]),
    discoverFiles(modulePath, ['views']).catch(() => [] as string[]),
    discoverFiles(modulePath, ['data']).catch(() => [] as string[]),
    discoverFiles(modulePath, ['security']).catch(() => [] as string[]),
  ])

  const allXmlFiles = [...viewFiles, ...dataFiles, ...securityFiles]

  const modelResults = await Promise.allSettled(
    modelFiles.filter(f => f.endsWith('.py')).map(f => parseModelFile(f)),
  )
  for (const r of modelResults) {
    if (r.status === 'fulfilled' && r.value) models.push(r.value)
  }

  const viewResults = await Promise.allSettled(
    allXmlFiles.filter(f => f.endsWith('.xml')).map(f => parseViewFile(f)),
  )
  for (const r of viewResults) {
    if (r.status === 'fulfilled' && r.value) views.push(...r.value)
  }

  const menuResults = await Promise.allSettled(
    allXmlFiles.filter(f => f.endsWith('.xml')).map(f => parseMenus(f)),
  )
  for (const r of menuResults) {
    if (r.status === 'fulfilled' && r.value) menus.push(...r.value)
  }

  const actionResults = await Promise.allSettled(
    allXmlFiles.filter(f => f.endsWith('.xml')).map(f => parseActions(f)),
  )
  for (const r of actionResults) {
    if (r.status === 'fulfilled' && r.value) actions.push(...r.value)
  }

  // Build full menu paths
  buildMenuPaths(menus)

  const result: UIMap = { module: moduleName, version, models, views, menus, actions }
  setCachedMap(modulePath, result)
  return result
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

async function parseManifest(modulePath: string): Promise<{ name: string; version: string; depends: string[] }> {
  try {
    const content = await readFile(join(modulePath, '__manifest__.py'), 'utf-8')
    const name = content.match(MANIFEST_NAME)?.[1] ?? ''
    const version = content.match(MANIFEST_VERSION)?.[1] ?? '0.0'
    const dependsMatch = content.match(MANIFEST_DEPENDS)
    const depends = dependsMatch
      ? [...dependsMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1])
      : []
    return { name, version, depends }
  } catch {
    return { name: '', version: '0.0', depends: [] }
  }
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

async function discoverFiles(modulePath: string, subdirs: string[]): Promise<string[]> {
  const results: string[] = []
  for (const dir of subdirs) {
    try {
      const fullPath = join(modulePath, dir)
      const entries = await readdir(fullPath)
      for (const entry of entries) {
        results.push(join(fullPath, entry))
      }
    } catch {
      // directory doesn't exist — skip
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Model file parsing
// ---------------------------------------------------------------------------

export async function parseModelFile(filePath: string): Promise<ModelEntry | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const modelName = content.match(MODEL_NAME_PATTERN)?.[1]
    if (!modelName) return null

    const displayName = content.match(MODEL_DESC_PATTERN)?.[1] ?? modelName

    const fields: FieldEntry[] = []
    const relations: RelationEntry[] = []

    let match: RegExpExecArray | null
    const fieldRegex = new RegExp(FIELD_PATTERN.source, 'g')

    while ((match = fieldRegex.exec(content)) !== null) {
      const fname = match[1]
      const ftype = match[2]
      const fargs = match[3]

      const entry: FieldEntry = {
        name: fname,
        type: ftype,
        displayName: fargs.match(STRING_ATTR)?.[1] ?? fname,
        help: fargs.match(HELP_ATTR)?.[1] ?? undefined,
      }

      if (['Many2one', 'One2many', 'Many2many'].includes(ftype)) {
        const target = fargs.match(RELATION_ATTR)?.[1]
        if (target) {
          entry.relation = target
          relations.push({
            field: fname,
            type: ftype.toLowerCase() as RelationEntry['type'],
            targetModel: target,
          })
        }
      }

      fields.push(entry)
    }

    return { name: modelName, displayName, fields, relations }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// View file parsing
// ---------------------------------------------------------------------------

export async function parseViewFile(filePath: string): Promise<ViewEntry[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const results: ViewEntry[] = []

    let recordMatch: RegExpExecArray | null
    const recordRegex = new RegExp(VIEW_RECORD_PATTERN.source, 'g')

    while ((recordMatch = recordRegex.exec(content)) !== null) {
      const recordStart = recordMatch.index
      const recordId = recordMatch[1]

      // Find the end of this record block
      const recordEnd = findClosingTag(content, recordStart, 'record')
      if (recordEnd < 0) continue

      const recordBody = content.slice(recordStart, recordEnd)

      const model = recordBody.match(VIEW_MODEL_PATTERN)?.[1] ?? ''
      const name = recordBody.match(VIEW_NAME_PATTERN)?.[1] ?? recordId
      const typeMatch = recordBody.match(VIEW_TYPE_PATTERN)
      const viewType: ViewEntry['type'] = typeMatch
        ? (VIEW_TYPE_MAP[typeMatch[1]] ?? 'form')
        : 'form'

      const inheritMatch = recordBody.match(VIEW_INHERIT_PATTERN)

      const fields: string[] = []
      let fieldMatch: RegExpExecArray | null
      const fieldRegex = new RegExp(FIELD_REF_PATTERN.source, 'g')
      while ((fieldMatch = fieldRegex.exec(recordBody)) !== null) {
        if (!fields.includes(fieldMatch[1])) fields.push(fieldMatch[1])
      }

      const structure = viewType === 'form' ? parseFormStructure(recordBody) : undefined

      results.push({
        id: recordId,
        name,
        model,
        type: viewType,
        inherit: !!inheritMatch,
        parentView: inheritMatch?.[1] ?? undefined,
        fields,
        structure,
      })
    }

    return results
  } catch {
    return []
  }
}

interface XmlNode {
  type: 'sheet' | 'notebook' | 'page' | 'group'
  name?: string
  string?: string
  fields: string[]
  children: XmlNode[]
}

function parseFormStructure(xml: string): ViewSection[] {
  const sheets: XmlNode[] = []
  let currentSheet: XmlNode | null = null
  let currentNotebook: XmlNode | null = null
  let currentPage: XmlNode | null = null
  let currentGroup: XmlNode | null = null

  const tagRegex = /<(sheet|notebook|\/sheet|\/notebook|page\s[^>]*|\/page|group\s[^>]*|\/group|field\s+name="\w+")/g

  let tagMatch: RegExpExecArray | null
  while ((tagMatch = tagRegex.exec(xml)) !== null) {
    const tag = tagMatch[0]

    if (tag.startsWith('<sheet')) {
      currentSheet = { type: 'sheet', fields: [], children: [] }
    } else if (tag.startsWith('</sheet>')) {
      if (currentSheet) {
        sheets.push(currentSheet)
        currentSheet = null
      }
    } else if (tag.startsWith('<notebook')) {
      const nb: XmlNode = { type: 'notebook', fields: [], children: [] }
      if (currentSheet) currentSheet.children.push(nb)
      else if (currentPage) currentPage.children.push(nb)
      else if (currentGroup) currentGroup.children.push(nb)
      else sheets.push(nb)
      currentNotebook = nb
    } else if (tag.startsWith('</notebook>')) {
      currentNotebook = null
    } else if (tag.startsWith('<page')) {
      const nameMatch = tag.match(/name="(\w+)"/)
      const strMatch = tag.match(/string="([^"]*)"/)
      const page: XmlNode = {
        type: 'page',
        name: nameMatch?.[1] ?? undefined,
        string: strMatch?.[1] ?? undefined,
        fields: [],
        children: [],
      }
      if (currentNotebook) currentNotebook.children.push(page)
      else if (currentSheet) currentSheet.children.push(page)
      currentPage = page
    } else if (tag.startsWith('</page>')) {
      currentPage = null
    } else if (tag.startsWith('<group')) {
      const nameMatch = tag.match(/name="(\w+)"/)
      const strMatch = tag.match(/string="([^"]*)"/)
      const g: XmlNode = {
        type: 'group',
        name: nameMatch?.[1] ?? undefined,
        string: strMatch?.[1] ?? undefined,
        fields: [],
        children: [],
      }
      if (currentPage) currentPage.children.push(g)
      else if (currentNotebook) currentNotebook.children.push(g)
      else if (currentSheet) currentSheet.children.push(g)
      else sheets.push(g)
      currentGroup = g
    } else if (tag.startsWith('</group>')) {
      currentGroup = null
    } else if (tag.startsWith('<field')) {
      const fieldName = tag.match(/name="(\w+)"/)?.[1] ?? ''
      if (currentGroup) currentGroup.fields.push(fieldName)
      else if (currentPage) currentPage.fields.push(fieldName)
      else if (currentSheet) currentSheet.fields.push(fieldName)
    }
  }

  return convertNodes(sheets)
}

function convertNodes(nodes: XmlNode[]): ViewSection[] {
  return nodes.map(n => ({
    type: n.type,
    name: n.name,
    string: n.string,
    fields: n.fields,
    children: convertNodes(n.children),
  }))
}

// ---------------------------------------------------------------------------
// Menu parsing
// ---------------------------------------------------------------------------

export async function parseMenus(filePath: string): Promise<MenuEntry[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const menus: MenuEntry[] = []

    // Parse <record model="ir.ui.menu"> blocks
    let recordMatch: RegExpExecArray | null
    const recordRegex = new RegExp(MENU_RECORD_PATTERN.source, 'g')
    while ((recordMatch = recordRegex.exec(content)) !== null) {
      const start = recordMatch.index
      const end = findClosingTag(content, start, 'record')
      if (end < 0) continue
      const body = content.slice(start, end)

      const id = recordMatch[1]
      const name = body.match(MENU_NAME_PATTERN)?.[1] ?? id
      const parent = body.match(MENU_PARENT_PATTERN)?.[1]
      const action = body.match(MENU_ACTION_PATTERN)?.[1]
      const seqText = body.match(MENU_SEQUENCE_PATTERN)?.[1]
      const sequence = seqText ? parseInt(seqText, 10) : 10

      menus.push({ id, name, parent, action, sequence, path: [] })
    }

    // Parse <menuitem /> shorthand
    let miMatch: RegExpExecArray | null
    const miRegex = new RegExp(MENUITEM_PATTERN.source, 'g')
    while ((miMatch = miRegex.exec(content)) !== null) {
      const tag = miMatch[0]
      const id = miMatch[1]
      const name = tag.match(MENUITEM_NAME)?.[1] ?? id
      const parent = tag.match(MENUITEM_PARENT)?.[1]
      const action = tag.match(MENUITEM_ACTION)?.[1]
      const seqText = tag.match(MENUITEM_SEQUENCE)?.[1]
      const sequence = seqText ? parseInt(seqText, 10) : 10

      menus.push({ id, name, parent, action, sequence, path: [] })
    }

    return menus
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Action parsing
// ---------------------------------------------------------------------------

export async function parseActions(filePath: string): Promise<ActionEntry[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const actions: ActionEntry[] = []

    let recordMatch: RegExpExecArray | null
    const recordRegex = new RegExp(ACTION_RECORD_PATTERN.source, 'g')
    while ((recordMatch = recordRegex.exec(content)) !== null) {
      const start = recordMatch.index
      const end = findClosingTag(content, start, 'record')
      if (end < 0) continue
      const body = content.slice(start, end)

      const id = recordMatch[1]
      const modelType = recordMatch[2] as ActionEntry['type']
      const name = body.match(ACTION_NAME_PATTERN)?.[1] ?? id
      const model = body.match(ACTION_RES_MODEL)?.[1] ?? ''

      let viewType: string | undefined
      let viewId: string | undefined

      if (modelType === 'ir.actions.act_window') {
        const viewMode = body.match(ACTION_VIEW_MODE)?.[1] ?? 'form'
        viewType = viewMode.split(',')[0]
        const viewMatch = body.match(ACTION_VIEW_ID)
        if (viewMatch) {
          viewId = viewMatch[2]
        }
      }

      actions.push({ id, name, model, type: modelType, viewType, viewId })
    }

    return actions
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Menu path resolution
// ---------------------------------------------------------------------------

function buildMenuPaths(menus: MenuEntry[]): void {
  const menuMap = new Map<string, MenuEntry>()
  for (const m of menus) menuMap.set(m.id, m)

  for (const menu of menus) {
    const path: string[] = [menu.name]
    let current = menu.parent
    const visited = new Set<string>()

    while (current && menuMap.has(current) && !visited.has(current)) {
      visited.add(current)
      const parent = menuMap.get(current)!
      path.unshift(parent.name)
      current = parent.parent
    }

    menu.path = path
  }
}

// ---------------------------------------------------------------------------
// Route generation
// ---------------------------------------------------------------------------

export function generateRoute(
  uiMap: UIMap,
  modelName: string,
  fieldName?: string,
): NavigationRoute {
  const steps: string[] = []

  // Find the model
  const model = uiMap.models.find(m => m.name === modelName)

  // Find the best menu for this model
  const menu = uiMap.menus.find(m => {
    if (!m.action) return false
    const action = uiMap.actions.find(a => a.id === m.action)
    return action?.model === modelName
  })

  if (menu) {
    steps.push(`📍 ${menu.path.join(' → ')}`)
  }

  // Find views for this model
  const formViews = uiMap.views.filter(v => v.model === modelName && v.type === 'form' && !v.inherit)
  const listViews = uiMap.views.filter(v => v.model === modelName && v.type === 'list' && !v.inherit)

  if (formViews.length > 0) {
    steps.push('   Abre cualquier registro existente o crea uno nuevo')
  } else if (listViews.length > 0) {
    steps.push('   Abre la vista lista — cualquier registro')
  }

  // If a specific field was requested, resolve its location
  if (fieldName && model) {
    const field = model.fields.find(f => f.name === fieldName)
    const fieldLabel = field?.displayName ?? fieldName

    // Try to find the field in form views
    for (const view of formViews) {
      const location = resolveFieldLocation(view, fieldName)
      if (location) {
        if (location.tab) steps.push(`   Pestaña: "${location.tab}"`)
        if (location.section) steps.push(`   Sección: "${location.section}"`)
        steps.push(`   Campo: ${fieldLabel} (${field?.type ?? 'field'})`)
        break
      }
    }

    // If field wasn't resolved in form, check list views
    if (!steps.some(s => s.includes(fieldLabel))) {
      for (const view of listViews) {
        if (view.fields.includes(fieldName)) {
          steps.push(`   Visible en columna de lista: ${fieldLabel}`)
          break
        }
      }
    }

    // If still not found, just show it as a model field
    if (!steps.some(s => s.includes(fieldLabel))) {
      const fieldType = field?.type ?? 'field'
      const relation = field?.relation ? ` → ${field.relation}` : ''
      steps.push(`   Campo: ${fieldLabel} (${fieldType}${relation})`)
    }
  }

  // Build URL
  const targetAction = menu ? uiMap.actions.find(a => a.id === menu.action) : undefined
  let url: string | undefined
  let targetView: string | undefined

  if (targetAction) {
    const viewType = targetAction.viewType ?? 'form'
    targetView = viewType
    url = `/web#action=${targetAction.id}&model=${modelName}&view_type=${viewType}`
  } else {
    targetView = formViews.length > 0 ? 'form' : 'list'
    url = `/web#model=${modelName}&view_type=${targetView}`
  }

  // Find smart buttons from views
  const relatedButtons = listRelatedButtons(uiMap, modelName)

  // Build raw text
  const raw = [steps.join('\n')]
  if (url) raw.push(`🔗 URL: ${url}`)
  if (targetView) raw.push(`📋 Vista: ${targetView}`)
  if (relatedButtons.length > 0) raw.push(`⚡ Smart buttons: [${relatedButtons.join(', ')}]`)
  if (model) {
    const fieldNames = model.fields.map(f => f.name)
    raw.push(`📦 Model fields: ${fieldNames.slice(0, 10).join(', ')}${fieldNames.length > 10 ? `... (+${fieldNames.length - 10} more)` : ''}`)
  }

  return { steps, url, targetView, relatedButtons, raw: raw.join('\n') }
}

// ---------------------------------------------------------------------------
// Field location resolution
// ---------------------------------------------------------------------------

export function resolveFieldLocation(
  view: ViewEntry,
  fieldName: string,
): { tab?: string; section?: string; position: string } | null {
  if (!view.structure) return null

  for (const section of view.structure) {
    const result = searchSection(section, fieldName, section.string)
    if (result) return result
  }

  return null
}

function searchSection(
  section: ViewSection,
  fieldName: string,
  currentTab?: string,
): { tab?: string; section?: string; position: string } | null {
  const tab = section.type === 'page' ? (section.string ?? section.name) : currentTab

  if (section.fields.includes(fieldName)) {
    const pos = section.fields.indexOf(fieldName)
    const total = section.fields.length
    const position = pos === 0 ? 'first' : pos === total - 1 ? 'last' : `position ${pos + 1} of ${total}`
    return {
      tab,
      section: section.type === 'group' ? (section.string ?? section.name) : undefined,
      position,
    }
  }

  for (const child of section.children) {
    const result = searchSection(child, fieldName, tab)
    if (result) return result
  }

  return null
}

// ---------------------------------------------------------------------------
// Smart buttons discovery
// ---------------------------------------------------------------------------

function listRelatedButtons(uiMap: UIMap, modelName: string): string[] {
  const buttons: string[] = []
  const modelViews = uiMap.views.filter(v => v.model === modelName)

  // Look for button names in view XML by scanning field references
  // and matching against action model relations
  const buttonFields = new Set<string>()
  for (const view of modelViews) {
    for (const f of view.fields) {
      // Fields ending in _id or _ids that are not in the model itself
      const model = uiMap.models.find(m => m.name === modelName)
      if (model && !model.fields.some(mf => mf.name === f)) {
        buttonFields.add(f)
      }
    }
  }

  for (const field of buttonFields) {
    buttons.push(field)
  }

  return buttons.slice(0, 5)
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function findClosingTag(xml: string, openIndex: number, tagName: string): number {
  const openTag = `<${tagName}`
  const closeTag = `</${tagName}>`
  let depth = 0
  let i = openIndex

  while (i < xml.length) {
    // Check for opening tag
    const nextOpen = xml.indexOf(openTag, i)
    // Check for closing tag
    const nextClose = xml.indexOf(closeTag, i)

    if (nextClose < 0) return -1

    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++
      i = nextOpen + openTag.length
    } else {
      depth--
      if (depth < 0) return nextClose + closeTag.length
      i = nextClose + closeTag.length
    }
  }

  return -1
}

// ---------------------------------------------------------------------------
// Summary helpers
// ---------------------------------------------------------------------------

export function summarizeUIMap(uiMap: UIMap): {
  module: string
  version: string
  models: number
  views: number
  menus: number
  actions: number
  fieldCount: number
} {
  const fieldCount = uiMap.models.reduce((sum, m) => sum + m.fields.length, 0)
  return {
    module: uiMap.module,
    version: uiMap.version,
    models: uiMap.models.length,
    views: uiMap.views.length,
    menus: uiMap.menus.length,
    actions: uiMap.actions.length,
    fieldCount,
  }
}
