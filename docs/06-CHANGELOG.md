# 06-CHANGELOG.md — Historial de Versiones

> **Formato:** [Keep a Changelog](https://keepachangelog.com/)
> **Versionado:** [SemVer](https://semver.org/)

---

## [Unreleased]

### Added
- `src/tools/status.ts` — `handleSetup` ahora verifica realmente:
  - Binario del adapter via `--version` + fallback `where`/`which`
  - Conectividad Engram MCP vía `mem_stats`
  - Estado del adapter en configuración
  - Health general compuesto (binary + engram + enabled)
  - Mensajes de instalación cuando el binario no se encuentra
  - `src/adapters/claude.ts`: `isAvailable()` — detecta si `claude` CLI está instalado
  - `src/adapters/antigravity.ts`: `isAvailable()` — detecta si `agy.exe` existe en disco
  - `src/adapters/codex.ts`: `isAvailable()` — detecta si `codex` CLI está instalado
  - `src/adapters/copilot.ts`: `isAvailable()` — detecta si `gh` CLI está instalado

### Fixed
- `src/index.ts`: `McpServer` tenía versión hardcodeada `'1.0.0'` — ahora lee dinámicamente de `pkgJson.version`. El MCP server reportaba v1.0.0 aunque iris estuviera en v1.1.7.
- `src/server.ts`: tool `status` renombrado a `iris_status` para consistencia con la convención `iris_*` de todos los demás tools y con lo documentado en README y docs.
- `AGENTS.md`: versión actualizada de `1.0.0` → `1.1.7` y fecha `2026-06-10` → `2026-06-16`.
- `README.md`: badge de versión actualizado `1.1.6` → `1.1.7`.
- `src/tools/delegate.ts`: `dry_run: true` no prevenía la ejecución — solo saltaba el two-phase commit gate. Ahora retorna early con `status: 'dry_run'` antes de llamar `executeTask`.
- `src/tools/delegate.ts`: ternario dead code `req.override ? undefined : undefined` reemplazado con `undefined` directo en llamada a `selectAdapter`.
- `src/updater.ts`: `getCurrentVersion()` fallaba con `'0.0.0'` al ejecutar iris como SEA binary — `import.meta.url` no apunta a disco en ese contexto. Ahora usa import estático de `pkgJson.version`.
- `src/types/index.ts`: `DelegateResult.status` no incluía `'dry_run'` en el union type — causaría error TypeScript al compilar tras el fix en delegate.ts.
- `src/adapters/codex.ts`: prompt pasado como CLI arg causaba `"command line too long"` en Windows para prompts grandes. Ahora se pasa via `input` (stdin) en execa.


---

## [1.1.7] - 2026-06-12

### Added
- `docs/SYSTEM-GUIDE.md` (3,345 líneas) — guía sistémica completa del ecosistema iris: arquitectura, flujos SDD, delegación, contexto, calidad, seguridad, resiliencia, 13 ingenierías, conectividad y mapa de aprendizaje
- `IRIS.excalidraw` (432 elementos) — diagrama arquitectónico completo con 7 secciones, paleta Alesco, conexiones validadas
- `docs/proposals/setup-hybrid-source-sync.md` — propuesta de sincronización híbrida Source Drive → local

### Changed
- `scripts/setup.ts` — instalador reestructurado de 10 a 12 pasos:
  - Paso 4: escanea versiones Odoo activas (solo las que tienen contenido)
  - Paso 5: configura `iris.local.yaml` con rutas enterprise/community para versiones activas
  - Paso 6: sincroniza Source de Google Drive a local si falta (robocopy, con confirmación)
  - Paso 7: indexa Source local con CodeGraph a nivel de raíz (no dentro de enterprise/odoo)
  - Paso 8: indexa Projects locales con CodeGraph (solo versiones activas)
  - Corrección: ya no itera ciegamente v14-v19, solo versiones con contenido detectado
- `iris-setup.exe` recompilado (110 MB) con la nueva lógica

### Fixed
- CodeGraph: indexación correcta de `Source/` a nivel raíz (no dentro de subdirectorios enterprise/odoo)
- CodeGraph: indexación de proyectos con detección correcta de sub-módulos (`__manifest.py`)

---

## [1.1.6] - 2026-06-05

### Added
- `iris setup`: Step 8 — instalación de `CLAUDE.md` en `~/.claude/`
- README actualizado con adapters kilo, cursor, opencode
- Fix en comandos de First Run

### Fixed
- README: comandos de primera ejecución corregidos

---

## [1.1.5] - 2026-06-04

### Added
- 11 herramientas completamente auto-instalables via `iris setup`
  - `agy` y `cursor` via winget
  - `kilo` via npm
  - Engram via GitHub CLI (`gh download`)
  - Detección dinámica de Google Drive para Assets

---

## [1.1.4] - 2026-06-04

### Removed
- Adaptador `kiro` — no forma parte de la arquitectura de adapters de iris

---

## [1.1.3] - 2026-06-04

### Added
- `iris_status`: update checker que notifica al usuario cuando hay una nueva versión disponible

---

## [1.1.2] - 2026-06-04

### Fixed
- `iris setup`: detección dinámica de `PACKAGE_ROOT` (ya no hardcodea rutas)
- `iris setup`: reemplazo de `wmic` por `fsutil` (compatible con Windows sin WMIC)

---

## [1.1.1] - 2026-06-04

### Fixed
- `iris setup`: la ventana se mantiene abierta hasta que el usuario presiona Enter

---

## [1.1.0] - 2026-06-04

### Added
- **iris v2 — Odoo Orchestration**: integración completa con el ecosistema Odoo
  - Arquitectura de agentes especialistas Odoo (7 agentes: Architect, Modeler, Viewer, Tester, Reviewer, Ops, Observable)
  - Pipeline SDD completo (8 fases: explore, propose, spec, design, tasks, apply, verify, archive)
  - Despliegue Odoo.sh con descubrimiento dinámico de build_id
  - Memoria persistente vía Engram (contexto cross-session, learnings, ADRs)
  - CodeGraph client para análisis estático del código Odoo
- **Excalidraw Diagram Integration**: generación de diagramas visuales de arquitectura
- **Módulo `delegate`**: garantiza escritura de `outputPath` e inyecta preámbulo slim en tareas delegadas
- **Instalador autónomo**: `iris setup` con detección de Google Drive, instalación de +12 herramientas, pasos `npm install` y build
- **CI/CD**: pipeline de release con build de ejecutable Windows (`.exe`)

### Fixed
- Import de `OdooTaskType` corregido apuntando a `types/index` en lugar de `odoo-selector`

### Changed
- Arquitectura del proyecto migrada a Screaming Architecture por dominio Odoo
- Documentación actualizada: `ARCHITECTURE.md`, `PRD.md` reflejan Odoo orchestration

---

## [1.0.0] - 2026-05-25

### Added
- Implementación inicial del MCP Server de iris
  - Orquestador MCP core con soporte para herramientas
  - Integración con CodeGraph para análisis de código
  - Soporte para agentes sub-agentes vía Task
- Documentación fundacional: `PRD.md`, `ARCHITECTURE.md`, `README.md`
- Banner ASCII y paleta Mermaid dark mode

---

## [0.1.0-beta] - 2026-05-26

### Added
- Scaffolding inicial del proyecto
- Estructura base TypeScript + Go
- `DOCUMENTATION.md` como guía de referencia del proyecto
- Archivo `.codegraph/index` añadido a `.gitignore`

---

## Template de versionado

```markdown
## [X.Y.Z] - YYYY-MM-DD
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
```

[Unreleased]: https://github.com/Geraldow/iris/compare/v1.1.7...HEAD
[1.1.7]: https://github.com/Geraldow/iris/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/Geraldow/iris/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/Geraldow/iris/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/Geraldow/iris/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/Geraldow/iris/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/Geraldow/iris/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/Geraldow/iris/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/Geraldow/iris/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Geraldow/iris/compare/v0.1.0-beta...v1.0.0
[0.1.0-beta]: https://github.com/Geraldow/iris/releases/tag/v0.1.0-beta
