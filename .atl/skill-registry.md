# Skill Registry — iris

## Metadata
- Version: 1.0.0
- Last Updated: 2026-06-10
- Project: iris
- Author: Alesco-Perú (Odoo Architects)
- Stack: Odoo 14-19, Go, Angular 19+, TypeScript, Tailwind CSS v4

---

## Tier 1 — Core Odoo (always loaded for Odoo work)

### odoo-ai
- **Path**: `~/.claude/skills/odoo-ai/`
- **Type**: Core Odoo — Hub Central
- **Description**: Hub central Odoo-AI — ORM, modelos, vistas, seguridad, testing, E2E. Enterprise First. Auto-detección de versión y workspace. Sin dependencia de plugins externos.
- **Triggers**: Cualquier trabajo con modelos Odoo, vistas XML, seguridad, ORM, testing Odoo, E2E
- **Agents**: Odoo Architect, Odoo Developer
- **Version**: 14–19
- **Plugin**: `odoo-source` (inteligencia completa de módulos Odoo con Module Intelligence Report)

### odoo-contribute
- **Path**: `~/.claude/skills/odoo-contribute/`
- **Type**: Core Odoo — Infrastructure
- **Description**: Hub VCS, git, infraestructura, Docker, OCA. Orquesta auto-detection en paralelo, carga plugins especializados.
- **Triggers**: Git, Docker, Odoo.sh, OCA contributions, environment setup
- **Agents**: Odoo Architect, DevOps
- **Version**: 14–19
- **Plugins**: odoo-ops, odoo-module, odoo-overview, odoo-oca, odoo-commit, odoo-pr, odoo-ci, odoo-changelog

### odoo-overview (plugin)
- **Path**: `~/.claude/skills/odoo-contribute/plugins/odoo-overview/`
- **Type**: Core Odoo — Ecosystem Knowledge
- **Description**: Gives AI agents a high-level understanding of the Odoo ecosystem: stack components, version matrix, Python compatibility, and module discovery.
- **Triggers**: General Odoo architecture questions, determining which skill to load, understanding version differences
- **Agents**: Odoo Architect, Odoo Developer
- **Version**: 17–18

### odoo-module (plugin)
- **Path**: `~/.claude/skills/odoo-contribute/plugins/odoo-module/`
- **Type**: Core Odoo — Module Structure
- **Description**: Guides creation of Odoo module structure, `__manifest__.py` fields, `__init__.py` patterns, and module discovery via addons_path.
- **Triggers**: Creating new Odoo modules, writing/editing `__manifest__.py`, structuring module folders
- **Agents**: Odoo Architect, Odoo Developer
- **Version**: 14–19

### odoo-ops (plugin)
- **Path**: `~/.claude/skills/odoo-contribute/plugins/odoo-ops/`
- **Type**: Core Odoo — Operations
- **Description**: Operaciones seguras SSH y de base de datos para servidores Odoo y Odoo.sh. Incluye resolución automática de URLs SSH de Odoo.sh y guardrails contra queries destructivos.
- **Triggers**: SSH connection to Odoo server, PostgreSQL queries, instance administration, log checking, service restart
- **Agents**: Odoo Architect, DevOps
- **Version**: 14–19

### odoo-oca (plugin)
- **Path**: `~/.claude/skills/odoo-contribute/plugins/odoo-oca/`
- **Type**: Core Odoo — Standards
- **Description**: Guides AI agents to follow OCA (Odoo Community Association) conventions for naming, versioning, folder structure, and Python style. Prevents common naming mistakes.
- **Triggers**: Creating Odoo modules, naming models/fields/methods, writing manifests, organizing module files
- **Agents**: Odoo Architect, Odoo Developer
- **Version**: 17–18

### odoo-source (plugin)
- **Path**: `~/.claude/skills/odoo-ai/plugins/odoo-source/`
- **Type**: Core Odoo — Module Intelligence
- **Description**: Inteligencia completa de un módulo Odoo: analiza manifest, modelos, campos, relaciones tipadas, vistas, controllers, flujo frontend→backend (OWL→RPC→Python), wizards, seguridad, cron, actions y xpaths. Produce un Module Intelligence Report autosuficiente.
- **Triggers**: `/odoo-source {module}`, `_inherit` detected, understanding a module before extending it
- **Agents**: Odoo Architect, Odoo Developer
- **Version**: 14–19

---

## Tier 2 — Development (Frontend & Backend)

### angular-core
- **Path**: `~/.config/opencode/skills/angular-core/`
- **Type**: Frontend — Angular
- **Description**: Angular core patterns: standalone components, signals, inject, control flow, zoneless.
- **Triggers**: Creating Angular components, using signals, setting up zoneless change detection
- **Agents**: Frontend Developer, Fullstack Developer
- **Version**: 19+

### angular-architecture
- **Path**: `~/.config/opencode/skills/angular-architecture/`
- **Type**: Frontend — Angular Architecture
- **Description**: Angular architecture: Scope Rule, project structure, file naming, style guide.
- **Triggers**: Structuring Angular projects, deciding where to place components
- **Agents**: Frontend Developer, Fullstack Developer
- **Version**: 19+

### angular-forms
- **Path**: `~/.config/opencode/skills/angular-forms/`
- **Type**: Frontend — Angular Forms
- **Description**: Angular forms: Signal Forms (experimental) and Reactive Forms. Validation, form state.
- **Triggers**: Working with forms, validation, or form state in Angular
- **Agents**: Frontend Developer, Fullstack Developer
- **Version**: 19+

### angular-performance
- **Path**: `~/.config/opencode/skills/angular-performance/`
- **Type**: Frontend — Angular Performance
- **Description**: Angular performance: NgOptimizedImage, @defer, lazy loading, SSR.
- **Triggers**: Optimizing Angular app performance, images, lazy loading
- **Agents**: Frontend Developer, Fullstack Developer
- **Version**: 19+

### typescript
- **Path**: `~/.config/opencode/skills/typescript/`
- **Type**: Frontend — Language
- **Description**: TypeScript strict patterns and best practices — types, interfaces, generics.
- **Triggers**: Writing TypeScript code, defining types/interfaces, generics
- **Agents**: All developers
- **Version**: 5.x

### tailwind-4
- **Path**: `~/.config/opencode/skills/tailwind-4/`
- **Type**: Frontend — Styling
- **Description**: Tailwind CSS 4 patterns and best practices — cn(), theme variables, no var() in className.
- **Triggers**: Styling with Tailwind, cn() utility, theme variables
- **Agents**: Frontend Developer, Fullstack Developer
- **Version**: 4

### material-design-ux
- **Path**: `~/.config/opencode/skills/material-design-ux/`
- **Type**: Frontend — UI/UX
- **Description**: Mejores prácticas de Google Material Design 2026, accesibilidad, y principios de Experiencia de Usuario (UX) e Interfaz (UI).
- **Triggers**: Designing components, layouts, buttons, defining colors, improving UX/UI
- **Agents**: Frontend Developer, UI/UX Designer
- **Version**: 2026

### go-patterns
- **Path**: `~/.config/opencode/skills/go-patterns/`
- **Type**: Backend — Go
- **Description**: Mejores prácticas idiomáticas de Go (Golang), manejo de errores, inyección de dependencias y concurrencia.
- **Triggers**: Writing Go code, handling errors, designing interfaces, structuring backend
- **Agents**: Backend Developer, Fullstack Developer
- **Version**: 1.22+

### go-testing
- **Path**: `~/.config/opencode/skills/go-testing/`
- **Type**: Backend — Go Testing
- **Description**: Go testing patterns for Gentleman.Dots, including Bubbletea TUI testing.
- **Triggers**: Writing Go tests, using teatest, adding test coverage
- **Agents**: Backend Developer, Fullstack Developer
- **Version**: 1.22+

### hexagonal-architecture
- **Path**: `~/.config/opencode/skills/hexagonal-architecture/`
- **Type**: Architecture — Design Pattern
- **Description**: Guía al agente para diseñar, estructurar y escribir código siguiendo estrictamente la Arquitectura Hexagonal al estilo de Gentleman Programming.
- **Triggers**: Structuring ports and adapters, applying Hexagonal Architecture, Clean Architecture
- **Agents**: All developers, Software Architect
- **Version**: N/A

### screaming-architecture
- **Path**: `~/.config/opencode/skills/screaming-architecture/`
- **Type**: Architecture — Project Structure
- **Description**: Mejores prácticas para Screaming Architecture: estructurar proyectos por contexto de negocio (features/dominios) y no por tipo técnico.
- **Triggers**: Structuring base project folders, defining domains, applying Screaming Architecture
- **Agents**: All developers, Software Architect
- **Version**: N/A

### skill-mapper
- **Path**: `~/.config/opencode/skills/skill-mapper/`
- **Type**: Development — Diagramming
- **Description**: Genera cualquier tipo de diagrama UML y arquitectura (Mermaid o PlantUML) según los requerimientos del usuario y lo guarda en el archivo que él desee.
- **Triggers**: Visualizing code, databases, architectures; creating UML diagrams, entity-relationship diagrams
- **Agents**: All developers
- **Version**: N/A

### mermaid
- **Path**: `~/.claude/skills/mermaid/`
- **Type**: Development — Diagramming
- **Description**: Creates professional, enterprise-grade Mermaid diagrams for architecture docs, process maps, data visualization.
- **Triggers**: Asked to diagram, create architecture docs, map processes, or visualize data
- **Agents**: All developers
- **Version**: N/A

### excalidraw-diagram
- **Path**: `~/.claude/skills/excalidraw-diagram-skill/`
- **Type**: Development — Diagramming
- **Description**: Create Excalidraw diagram JSON files that make visual arguments. Use to visualize workflows, architectures, or concepts.
- **Triggers**: Visualizing workflows, architectures, or concepts with hand-drawn style diagrams
- **Agents**: All developers
- **Version**: N/A

---

## Tier 3 — Infrastructure & DevOps

### odoo-docker (archived)
- **Path**: `~/.claude/skills/archived/odoo-development-ahmedlakos/odoo-docker-plugin/odoo-docker/`
- **Type**: Infrastructure — Docker
- **Description**: Docker infrastructure manager for Odoo — production deployment, nginx proxy, CI/CD pipelines, performance tuning, multi-version image management, container debugging.
- **Triggers**: Deploying Odoo with Docker, nginx configuration, container debugging, performance tuning
- **Agents**: DevOps, Odoo Architect
- **Version**: 14–19
- **Status**: Available (referenced)

### odoo-service (archived)
- **Path**: `~/.claude/skills/archived/odoo-development-ahmedlakos/odoo-service-plugin/odoo-service/`
- **Type**: Infrastructure — Server Lifecycle
- **Description**: Complete Odoo server lifecycle manager — run, deploy, initialize, and manage Odoo across local venv, Docker, and any IDE. Handles server startup/shutdown, database management, Docker orchestration, IDE configuration.
- **Triggers**: Starting/stopping Odoo server, database backup, environment initialization, IDE config, module scaffold, quality gates
- **Agents**: DevOps, Odoo Architect
- **Version**: 14–19
- **Status**: Available (referenced)

### odoo-security (archived)
- **Path**: `~/.claude/skills/archived/odoo-development-ahmedlakos/odoo-security-plugin/odoo-security/`
- **Type**: Infrastructure — Security Audit
- **Description**: Comprehensive Odoo security auditor for model access rules, HTTP route authentication, sudo() usage, SQL injection risks, and record rule completeness across Odoo 14-19.
- **Triggers**: Full security audit, checking access rules, sudo usage analysis, SQL injection audit
- **Agents**: Odoo Architect, Security Reviewer
- **Version**: 14–19
- **Status**: Available (referenced)

---

## Tier 4 — SDD Pipeline (Spec-Driven Development)

### sdd-init
- **Path**: `~/.config/opencode/skills/sdd-init/`
- **Type**: SDD — Initialize
- **Description**: Initialize Spec-Driven Development context in any project. Detects stack, conventions, and bootstraps the active persistence backend.
- **Triggers**: "sdd init", "iniciar sdd", "openspec init"
- **Agents**: Orchestrator
- **Version**: 2.0

### sdd-explore
- **Path**: `~/.config/opencode/skills/sdd-explore/`
- **Type**: SDD — Exploration
- **Description**: Explore and investigate ideas before committing to a change. Investigate codebase, clarify requirements.
- **Triggers**: Orchestrator launches to think through a feature, investigate codebase, or clarify requirements
- **Agents**: Orchestrator → Sub-agent
- **Version**: 2.0

### sdd-propose
- **Path**: `~/.config/opencode/skills/sdd-propose/`
- **Type**: SDD — Proposal
- **Description**: Create a change proposal with intent, scope, and approach.
- **Triggers**: Orchestrator launches to create or update a proposal for a change
- **Agents**: Orchestrator → Sub-agent
- **Version**: 2.0

### sdd-spec
- **Path**: `~/.config/opencode/skills/sdd-spec/`
- **Type**: SDD — Specifications
- **Description**: Write specifications with requirements and scenarios (delta specs for changes).
- **Triggers**: Orchestrator launches to write or update specs for a change
- **Agents**: Orchestrator → Sub-agent
- **Version**: 2.0

### sdd-design
- **Path**: `~/.config/opencode/skills/sdd-design/`
- **Type**: SDD — Technical Design
- **Description**: Create technical design document with architecture decisions and approach.
- **Triggers**: Orchestrator launches to write or update the technical design for a change
- **Agents**: Orchestrator → Sub-agent
- **Version**: 2.0

### sdd-tasks
- **Path**: `~/.config/opencode/skills/sdd-tasks/`
- **Type**: SDD — Task Breakdown
- **Description**: Break down a change into an implementation task checklist.
- **Triggers**: Orchestrator launches to create or update the task breakdown for a change
- **Agents**: Orchestrator → Sub-agent
- **Version**: 2.0

### sdd-apply
- **Path**: `~/.config/opencode/skills/sdd-apply/`
- **Type**: SDD — Implementation
- **Description**: Implement tasks from the change, writing actual code following the specs and design.
- **Triggers**: Orchestrator launches to implement one or more tasks from a change
- **Agents**: Orchestrator → Sub-agent
- **Version**: 2.0

### sdd-verify
- **Path**: `~/.config/opencode/skills/sdd-verify/`
- **Type**: SDD — Verification
- **Description**: Validate that implementation matches specs, design, and tasks.
- **Triggers**: Orchestrator launches to verify a completed or partially completed change
- **Agents**: Orchestrator → Sub-agent
- **Version**: 2.0

### sdd-archive
- **Path**: `~/.config/opencode/skills/sdd-archive/`
- **Type**: SDD — Archival
- **Description**: Sync delta specs to main specs and archive a completed change.
- **Triggers**: Orchestrator launches to archive a change after implementation and verification
- **Agents**: Orchestrator → Sub-agent
- **Version**: 2.0

### sdd-report
- **Path**: `~/.claude/skills/sdd-report/`
- **Type**: SDD — Closure Report
- **Description**: Generate complete professional closure report after a development task finishes. Read-only, no code changes.
- **Triggers**: Closure report generation after development task
- **Agents**: Orchestrator → Sub-agent
- **Version**: 1.0

### sdd-new (meta-command)
- **Path**: `~/.claude/skills/sdd-new/`
- **Type**: SDD — Meta-command
- **Description**: Start a new SDD change — runs explore + propose in sequence. Use as `/sdd-new {change-name}`.
- **Triggers**: `/sdd-new` command
- **Agents**: Orchestrator
- **Version**: 1.0

### sdd-ff (meta-command)
- **Path**: `~/.claude/skills/sdd-ff/`
- **Type**: SDD — Meta-command
- **Description**: Fast-forward through all SDD planning phases (propose → spec → design → tasks). Use as `/sdd-ff {change-name}`.
- **Triggers**: `/sdd-ff` command
- **Agents**: Orchestrator
- **Version**: 1.0

### sdd-continue (meta-command)
- **Path**: `~/.claude/skills/sdd-continue/`
- **Type**: SDD — Meta-command
- **Description**: Create the next missing artifact in the SDD dependency chain for a change. Use as `/sdd-continue {change-name}`.
- **Triggers**: `/sdd-continue` command
- **Agents**: Orchestrator
- **Version**: 1.0

### Shared SDD Conventions
- **Path**: `~/.claude/skills/_shared/`
- **Type**: SDD — Shared Knowledge
- **Description**: Shared conventions for all SDD phases: persistence contract (engram/openspec modes), engram artifact naming, openspec file layout.
- **Files**:
  - `persistence-contract.md` — mode resolution rules
  - `engram-convention.md` — artifact naming and two-step recovery
  - `openspec-convention.md` — file layout when mode is openspec
  - `sdd-workflow.md` — overall SDD workflow
- **Agents**: All SDD sub-agents

---

## Tier 5 — General & Utilities

### skill-creator
- **Path**: `~/.config/opencode/skills/skill-creator/`
- **Type**: Utility — Skill Authoring
- **Description**: Creates new AI agent skills following the Agent Skills spec.
- **Triggers**: Creating a new skill, adding agent instructions, documenting patterns for AI
- **Agents**: All developers

### skill-evolver
- **Path**: `~/.claude/skills/skill-evolver/`
- **Type**: Utility — Pattern Detection
- **Description**: Detecta patrones nuevos que emergen durante sesiones de trabajo, los clasifica al skill/script correcto, genera el cambio mínimo para automatizarlos.
- **Triggers**: `/skill-evolve` command
- **Agents**: All developers

### skill-registry
- **Path**: `~/.config/opencode/skills/skill-registry/`
- **Type**: Utility — Registry Management
- **Description**: Create or update the skill registry for the current project. Scans user skills and project conventions, writes `.atl/skill-registry.md`.
- **Triggers**: "update skills", "skill registry", "actualizar skills", "update registry"
- **Agents**: All developers

### engram-drive
- **Path**: `~/.claude/skills/engram-drive/`
- **Type**: Utility — Team Memory Sync
- **Description**: Team memory sync via Google Drive. Each person keeps their own engram memories in a personal subfolder; teammates' memories are imported automatically.
- **Triggers**: `/engram-drive [setup|sync|import <project>]`
- **Agents**: All developers

### odoo-commit
- **Path**: `~/.config/opencode/skills/odoo-commit/`
- **Type**: Odoo — Git Workflow
- **Description**: Creates professional git commits for Odoo projects following conventional-commits format.
- **Triggers**: Committing changes in an Odoo module or project
- **Agents**: All developers

### odoo-pr
- **Path**: `~/.config/opencode/skills/odoo-pr/`
- **Type**: Odoo — Pull Requests
- **Description**: Creates Pull Requests for any Odoo project following Odoo module conventions.
- **Triggers**: Creating PRs, reviewing PR requirements, checking PR title conventions
- **Agents**: All developers

### odoo-ci
- **Path**: `~/.config/opencode/skills/odoo-ci/`
- **Type**: Odoo — CI/CD
- **Description**: Manages GitHub Actions CI workflows for Odoo projects including lint, tests, and PR gates.
- **Triggers**: Investigating failing CI jobs, editing `.github/workflows/`, working with Odoo CI pipelines
- **Agents**: DevOps, All developers

### odoo-changelog
- **Path**: `~/.config/opencode/skills/odoo-changelog/`
- **Type**: Odoo — Changelog
- **Description**: Manages the CHANGELOG.md for any Odoo project following keepachangelog.com format.
- **Triggers**: Creating PRs, adding changelog entries, updating CHANGELOG.md
- **Agents**: All developers

### odoo-development-skill (universal)
- **Path**: `~/.agents/skills/odoo-development-skill/`
- **Type**: Odoo — Universal Development
- **Description**: Universal Odoo development skill based on strict OCA standards, covering versions 14-19. Includes agents for code review, upgrade analysis, and pattern discovery.
- **Triggers**: General Odoo module development, OCA compliance
- **Agents**: Odoo Developer
- **Version**: 14–19

### Archived Odoo Specialized Skills
These skills exist in the `~/.claude/skills/archived/` hierarchy and are available on demand:

| Skill | Path | Description |
|-------|------|-------------|
| odoo-general | `archived/odoo-development-peterurban/odoo-general/` | Core Odoo development playbook — environment, ORM, CRUD, record rules, Studio |
| odoo-api | `archived/odoo-development-peterurban/odoo-api/` | Odoo external API — JSON-2, XML-RPC, API keys |
| odoo-qweb | `archived/odoo-development-peterurban/odoo-qweb/` | QWeb — PDF reports, mail templates, view inheritance |
| odoo-visual | `archived/odoo-development-peterurban/odoo-visual/` | Odoo visual customization — backend views, PDF, mail, website theming |
| odoo-server-actions | `archived/odoo-development-peterurban/odoo-server-actions/` | Server actions safe_eval — forbidden builtins, patterns for 18/19 SaaS |
| odoo-actions-master | `archived/odoo-development-peterurban/odoo-actions-master/` | Action system encyclopedia — automated actions, cron, dispatch, model maps |
| odoo-skill | `archived/odoo-development-peterurban/odoo-skill/` | Functional Odoo consulting — business processes, configuration |
| odoo-upgrade | `archived/odoo-development-ahmedlakos/odoo-upgrade-plugin/odoo-upgrade/` | Odoo version migration assistant (14→19) |
| odoo-test | `archived/odoo-development-ahmedlakos/odoo-test-plugin/odoo-test/` | Odoo test toolkit — skeletons, mock data, coverage, E2E |
| odoo-report | `archived/odoo-development-ahmedlakos/odoo-report-plugin/odoo-report/` | Professional email templates & QWeb reports |
| odoo-i18n | `archived/odoo-development-ahmedlakos/odoo-i18n-plugin/odoo-i18n/` | i18n toolkit — extraction, PO validation, Arabic/RTL |
| odoo-docker | `archived/odoo-development-ahmedlakos/odoo-docker-plugin/odoo-docker/` | Docker infrastructure manager for Odoo |
| odoo-service | `archived/odoo-development-ahmedlakos/odoo-service-plugin/odoo-service/` | Server lifecycle manager |
| odoo-security | `archived/odoo-development-ahmedlakos/odoo-security-plugin/odoo-security/` | Security auditor — access rules, sudo, SQL injection |
| odoo-18 | `archived/odoo-development-unclecatvn/skills/odoo-18.0/` | Odoo 18 development reference — full knowledge base |
| odoo-19 | `archived/odoo-development-unclecatvn/skills/odoo-19.0/` | Odoo 19 development reference — full knowledge base |
| odoo-17 | `archived/odoo-development-unclecatvn/skills/odoo-17.0/` | Odoo 17 development reference — full knowledge base |
| theme-create | `archived/odoo-development-ahmedlakos/odoo-frontend-plugin/skills/theme-create/` | Odoo theme scaffolding |
| theme-scss | `archived/odoo-development-ahmedlakos/odoo-frontend-plugin/skills/theme-scss/` | SCSS variable reference for Odoo themes |
| theme-design | `archived/odoo-development-ahmedlakos/odoo-frontend-plugin/skills/theme-design/` | Figma-to-Odoo design workflow |
| theme-snippets | `archived/odoo-development-ahmedlakos/odoo-frontend-plugin/skills/theme-snippets/` | Website snippet reference and creation |
| frontend-js | `archived/odoo-development-ahmedlakos/odoo-frontend-plugin/skills/frontend-js/` | Odoo frontend JS — publicWidget, Owl, translations |
| brainstorming | `archived/odoo-development-unclecatvn/skills/brainstorming/` | Creative work exploration — features, components, functionality |
| code-review | `archived/odoo-development-unclecatvn/skills/code-review/` | Code review feedback practices and verification gates |
| mcp-builder | `archived/odoo-development-unclecatvn/skills/mcp-builder/` | MCP server creation guide |
| dtg-base | `archived/odoo-development-unclecatvn/skills/dtg-base/` | DTG Base module utilities reference |
| payment-integration | `archived/odoo-development-unclecatvn/skills/payment-integration/` | Payments with Stripe, SePay, Polar, Paddle, Creem.io |
| writing-skills | `archived/odoo-development-unclecatvn/skills/writing-skills/` | Creating, editing, and verifying skills |
| slide | `archived/odoo-development-unclecatvn/skills/slide/` | HTML/React slide deck creation |
| odoo-e2e-test | `archived/odoo-development-maingocdoan/skills/odoo-e2e-test/` | Self-healing Odoo E2E test framework |

### Project-Specific Prompts (Reciprocal Apprenticeship)
- **Path**: `C:\Development\iris\prompts\`
- **Type**: Project Conventions
- **Files**:
  - `sdd-explore.md`, `sdd-propose.md`, `sdd-spec.md`, `sdd-design.md`, `sdd-tasks.md`, `sdd-apply.md`, `sdd-verify.md` — phase prompts for the iris SDD pipeline
  - `docs/sdd-*.md` — documentation context for SDD phases
  - `docs/excalidraw-guide.md` — excalidraw diagramming conventions
  - `odoo/odoo-security.md` — security conventions for iris
  - `odoo/odoo-owl.md` — OWL component conventions for iris
  - `odoo/odoo-orm.md` — ORM conventions for iris
  - `odoo/odoo-migration.md` — migration conventions for iris
  - `odoo/module-intelligence.md` — module intelligence report conventions

---

## Future Skills (Planned)

### odoo-quality (to be created)
- **Path**: `~/.config/opencode/skills/odoo-quality/` *(planned)*
- **Type**: QE — Quality Engineering
- **Description**: Odoo quality assurance — static analysis, code coverage enforcement, linting standards, architecture validation gates for Odoo modules. CI-integrated quality gates.
- **Triggers**: Pre-commit, CI pipeline, code review gate, quality report generation
- **Agents**: Odoo Architect, CI/CD Pipeline
- **Version**: Planned

### odoo-observability (to be created)
- **Path**: `~/.config/opencode/skills/odoo-observability/` *(planned)*
- **Type**: Ops — Observability
- **Description**: Odoo observability stack — structured logging (stdout/JSON), Prometheus metrics export, OpenTelemetry tracing, Grafana dashboards, alerting rules. Log analysis patterns for Odoo.sh and on-prem.
- **Triggers**: Debugging production issues, setting up monitoring, performance analysis, log querying
- **Agents**: DevOps, Odoo Architect
- **Version**: Planned

### odoo-reliability (to be created)
- **Path**: `~/.config/opencode/skills/odoo-reliability/` *(planned)*
- **Type**: Ops — Reliability Engineering
- **Description**: Odoo reliability patterns — backup/restore automation, disaster recovery runbooks, high-availability configuration, connection pooling tuning, Odoo.sh autoscaling patterns, cron job reliability.
- **Triggers**: Production incident response, disaster recovery drill, HA setup, load testing
- **Agents**: DevOps, Odoo Architect
- **Version**: Planned

---

## Context Detection Rules

| Pattern | Skill(s) | Priority |
|---------|----------|----------|
| `*.py` in `models/` | odoo-ai | high |
| `__manifest__.py` | odoo-ai, odoo-module | high |
| `*.xml` with `<record model="ir.ui.view">` | odoo-ai, odoo-qweb | high |
| `ir.model.access.csv` | odoo-ai, odoo-security | high |
| `*security*` files | odoo-security | high |
| `*.ts` or `*.tsx` files | typescript | high |
| `*.component.ts` | angular-core, angular-architecture | high |
| `*.go` files | go-patterns | high |
| `*_test.go` | go-testing | medium |
| `cn()` or `className=` in TSX | tailwind-4 | high |
| `.github/workflows/*.yml` | odoo-ci | high |
| Dockerfile / docker-compose.yml | odoo-docker | medium |
| `CHANGELOG.md` | odoo-changelog | medium |
| `*service*` or `*handler*` in Go | hexagonal-architecture | medium |
| Project `/cmd/` structure | screaming-architecture | medium |
| `/sdd-*` command | Corresponding SDD skill | high |
| `/odoo-source` command | odoo-source | high |
| `/skill-evolve` command | skill-evolver | high |
| `/engram-drive` command | engram-drive | high |
| `*.excalidraw` / diagram request | excalidraw-diagram | medium |
| Mermaid block or diagram request | mermaid, skill-mapper | medium |
| PR creation | odoo-pr | high |
| git commit | odoo-commit | high |
| Angular `ReactiveFormsModule` | angular-forms | medium |
| `NgOptimizedImage` / `@defer` | angular-performance | medium |
| UI/UX / Material Design conversation | material-design-ux | medium |
| Skill creation request | skill-creator | high |
| `/sdd-init`, "sdd init" | sdd-init | high |
| QWeb / report / mail template | odoo-qweb | high |
| Server actions / automated actions | odoo-server-actions | high |
| Odoo API / JSON-2 / XML-RPC | odoo-api | medium |
| Odoo functional / business process | odoo-skill | medium |
| Theme creation / Figma design | theme-create, theme-design | medium |
| Odoo i18n / translation / RTL | odoo-i18n | medium |
| Odoo upgrade / migration | odoo-upgrade | medium |
| Odoo testing / test generation | odoo-test | medium |
| Stripe / Polar / Paddle payments | payment-integration | medium |
| MCP server creation | mcp-builder | medium |

---

## Agent-Skill Mapping

| Agent | Primary Skills | Secondary Skills |
|-------|---------------|------------------|
| **Orchestrator** | sdd-init, sdd-new, sdd-ff, sdd-continue, sdd-archive, skill-registry | engram-drive, skill-evolver |
| **Odoo Architect** | odoo-ai, odoo-contribute, odoo-source | odoo-module, odoo-overview, odoo-oca, odoo-security, odoo-docker, odoo-ops, odoo-service, odoo-observability (future) |
| **Odoo Developer** | odoo-ai, odoo-general, odoo-19, odoo-18 | odoo-qweb, odoo-visual, odoo-api, odoo-test, odoo-upgrade, odoo-report, odoo-i18n, odoo-server-actions, odoo-actions-master |
| **Frontend Developer** | angular-core, typescript, tailwind-4 | angular-architecture, angular-forms, angular-performance, material-design-ux, theme-create, theme-scss, frontend-js |
| **Backend Developer** | go-patterns, hexagonal-architecture | go-testing, screaming-architecture |
| **Fullstack Developer** | angular-core, go-patterns, typescript, hexagonal-architecture | angular-forms, tailwind-4, screaming-architecture |
| **DevOps** | odoo-ops, odoo-ci, odoo-docker | odoo-service, odoo-reliability (future) |
| **QA / Reviewer** | odoo-verify, odoo-security, odoo-test | odoo-quality (future), code-review |
| **Functional Consultant** | odoo-skill | odoo-overview |
| **UI/UX Designer** | material-design-ux | tailwind-4, theme-design |
