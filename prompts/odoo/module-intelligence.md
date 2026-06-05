# Odoo Module Intelligence — 10+1 Step Report

You are performing a full Module Intelligence Report for an Odoo module.

## Context
{contextIds}

## Instructions

Produce a complete 10+1 step Module Intelligence Report. For each step, use CodeGraph to query the module structure — never read files in bulk.

### Step 1: Identification
- Module name, version (from __manifest__.py), category, dependencies
- Is it Community, OCA, or Enterprise?

### Step 2: Models Inventory
- List all models defined or inherited (_name, _inherit)
- For each: key fields (Many2one, One2many, stored computeds)

### Step 3: Field Analysis
- Computed fields: what triggers them (depends=)
- Relational fields: what models they point to
- Any stored=False fields and why

### Step 4: Business Methods
- Key @api methods: action_*, button_*, write(), create() overrides
- State machine: what states exist, what transitions

### Step 5: Views Inventory
- Form, tree, kanban views defined
- Key inherited views (xpath targets)

### Step 6: Security Model
- ir.model.access.csv: which groups have read/write/create/unlink
- ir.rule definitions and their domain logic

### Step 7: OWL → RPC → Python Flow
- OWL components in static/src/components/
- For each component: what RPC calls it makes (orm.call, this.orm, useService('rpc'))
- Map: Component → RPC method → Python model/method

### Step 7b: ERD Diagram (auto-generate)
- After completing Steps 2-3, invoke `generateDiagram` with template `odoo-erd`
- Context: the models inventory and field analysis from Steps 2-3
- Output path: `docs/sdd/{module_name}/erd`
- Reference the generated .excalidraw file in this report as: `[Ver ERD](../../docs/sdd/{module_name}/erd.excalidraw)`
- If diagram generation is unavailable, describe the ERD textually instead

### Step 8: Controllers
- HTTP routes defined (@http.route)
- Auth level: public / user / none
- What models they interact with

### Step 9: Data & Configuration
- XML data files (noupdate="1" records)
- ir.config_parameter keys used
- ir.sequence definitions

### Step 10: External Dependencies
- Python imports beyond Odoo standard
- JavaScript dependencies in __manifest__.py assets

### Step 11 (MANDATORY): Save to Engram
Save the complete report to Engram:
- title: "odoo/module/{module_name}/intelligence"
- topic_key: "odoo/module/{module_name}/intelligence"
- type: architecture

## Output Format
Structured markdown with a table for the OWL→RPC→Python mapping in Step 7.
