## Documentation Requests

Claude can write standalone documents (reports, evaluations, comparatives, business docs, README files, marketing copy) when explicitly requested by the user. Use Gemini 3.1 Pro via Antigravity only when the user explicitly prefers it.

Always handle with Claude:
- README updates tied to a code change already in progress
- Docstrings or inline comments as part of a coding task
- SDD artifacts (proposals, specs, designs) — these are part of the dev workflow
- Academic university assignments (essays, thesis sections, research papers, group work)
- Business reports, evaluations, comparatives, and any document the user explicitly requests

## Model Selection for Sub-Agents

When spawning agents via the Agent tool, select the model automatically based on task complexity:

- **haiku**: search, formatting, simple file edits, changelog entries, README updates, quick grep/glob tasks
- **haiku**: `sdd-report` — spawn via Agent tool with `model: "haiku"` (read-only, no code, just structured markdown)
- **sonnet**: general coding, feature implementation, bug fixes, PR creation, code reviews (default)
- **opus**: NEVER auto-select — only use when the user explicitly requests it

## Jira

- Default project key: `OSK`
- Board: https://odoo-skills.atlassian.net/jira/software/projects/OSK/boards/1
- When creating issues, stories, or tasks without a specified project, always use `OSK`.

## Contributor Authorization — Alesco Perú

Before ANY git commit or push in an Alesco project, verify the committer identity against the authorized list in:

```
~/.claude/skills/odoo-ai/plugins/odoo-development-alesco/CONTRIBUTING.md
```

Verification: cross-check `git config user.name`, `git config user.email`, and `gh api user --jq .login` against the authorized contributor entries. If NO match found → **STOP immediately and alert the user before proceeding.**

Authorized contributors and projects are defined exclusively in that file. Do not proceed with commits from unrecognized identities.

## Rules

- NEVER add "Co-Authored-By" or any AI attribution to commits. Use conventional commits format only.
- Never build after changes.
- When asking user a question, STOP and wait for response. Never continue or assume answers. Do NOT write filler text like ".", "Esperando su respuesta", or any placeholder — just stop outputting and stay silent.
- Always verify technical claims before stating them. If unsure, investigate gently first.
- If the user makes a mistake, DO NOT scold them. Point it out kindly and explain the "why" in detail.
- Always propose alternatives with tradeoffs, taking the time to explain the differences clearly.

## iris Ecosystem

**iris** (v1.1.5) is the TypeScript MCP orchestrator for Alesco Perú Odoo development at `C:\Development\iris`. It routes SDD tasks to AI adapter CLIs via `iris_delegate` and exposes status, config, and history through named MCP tools.

### iris Project Detection

**Trigger:** Working directory is `C:\Development\iris` OR user references iris tools, adapters, or `iris_delegate`.

### Non-Negotiable Rules

- **NEVER** use `Edit`, `Write`, or `Bash` to write files in the iris project — ALL file writes MUST go through `iris_delegate` (MCP tool). agy writes files with its own tools via `--dangerously-skip-permissions`; iris writes after receiving adapter output (iris owns the write lifecycle).
- **NEVER auto-build** after changes. User runs `npx tsc` manually when ready to test.
- iris is a **stdio MCP server** — NOT a daemon. No persistent process management needed.
- **NEVER** put version numbers ("v1/v2", "v1.1.x") in commit messages. Use conventional commits only.
- Versions ONLY via `git tag v<major>.<minor>.<patch>` → push tag → GitHub Actions builds `iris-setup.exe` + `.zip` automatically.

### iris GitFlow

- Push always requires explicit "sí, autorizo" — never automatic
- `git push --force`, `git rebase`, `git reset` → BLOCKED, no exceptions
- Versions ONLY via `git tag v<major>.<minor>.<patch>` — never in commit messages

---

## Post-Compaction Protocol

When context has been compacted (a summary appears at the top of your context window), your **mandatory first action** is:

1. Call `mem_context(project='<active-project>')` — restores session history from Engram in a single call
2. **DO NOT** read any files, grep, or explore the codebase to rebuild context
3. **DO NOT** rely solely on the compaction summary — always augment with what Engram returns
4. Resume work based on `mem_context` output, not from re-reading the filesystem

**Why**: Every file read after compaction bloats the new context window unnecessarily. Engram already holds the session summary; one `mem_context` call replaces dozens of file reads.

## Odoo Project Auto-Detection

**Trigger:** `__manifest__.py` exists in working directory OR in any subdirectory at depth ≤ 2 (workspace multiproyecto Odoo)

Delegar a skills (ellos orquestan ejecución en paralelo donde sea posible):

**odoo-contribute ejecuta:**
- `scripts/detect-environment.ps1` (PARALELO) → Odoo.sh vs local/Docker
- `scripts/branch-safety-check.ps1` (PARALELO) → rama actual, ramas remotas, validación
- `scripts/docker-setup.ps1` (SECUENCIAL si LOCAL_DEV) → verificar/iniciar Docker

**odoo-ai ejecuta:**
- `scripts/odoo-version-detect.ps1` (PARALELO) → versión Odoo, edition (Community/Enterprise)
- `scripts/module-intelligence.ps1` (PARALELO) → análisis 10 pasos del módulo

Los skills orquestan orden, paralelo, y decisiones. CLAUDE.md solo delega.

---

## Odoo Branch Safety Protocol

Execute this BEFORE starting ANY Odoo development work or at the start of any new session in an Odoo project.

Ejecutar el script:
```powershell
~/.claude/skills/odoo-contribute/scripts/branch-safety-check.ps1
```

| Branch | Status | Action |
|--------|--------|--------|
| `st_<project_name>` | ✅ Allowed | Proceed normally |
| `st_produccion` | ✅ Allowed | Proceed normally |
| `produccion` | 🔒 Restricted | STOP — ask authorization |
| `db_<project_name>` | 🔒 Restricted | STOP — ask authorization |
| Any other branch | ⚠️ Unknown | Warn and ask before proceeding |

**Operaciones git — qué requiere autorización:**

| Operación | Auth requerida | Notas |
|-----------|---------------|-------|
| `git commit` | ❌ No — automático | Solo afecta repo local |
| `git add`, `status`, `log`, `diff`, `fetch`, `branch` | ❌ No — automático | Solo lectura o local |
| `git push` (cualquier variante) | ✅ SIEMPRE pausar | Nunca automatizar |
| `git cherry-pick` | ✅ SIEMPRE pausar | Transfiere commits entre ramas |
| `git merge` (hacia staging o producción) | ✅ SIEMPRE pausar | Integra en rama protegida |
| `git tag` + push de tag | ✅ SIEMPRE pausar | Crea release en remoto |
| `git push --force` / `-f` | 🔒 BLOQUEADO | Prohibido sin excepción |
| `git push origin --delete {branch}` | 🔒 BLOQUEADO | Nunca eliminar rama remota |
| `git rebase` (cualquier variante) | 🔒 BLOQUEADO | Nunca reescribir historial |
| `git reset` (cualquier variante) | 🔒 BLOQUEADO | Nunca resetear — ni --soft, --mixed, --hard |

**Push flow — OBLIGATORIO en este orden:**
1. Commit en `st_<project>` **o** `st_produccion`
2. Pausar → mostrar resumen → esperar "sí, autorizo" antes del push
3. Push a staging → validar → esperar "sí, autorizo" para producción
4. Push a `produccion` o `db_<project>`

**NEVER** ejecutar push, cherry-pick, merge, rebase, tag push, o reset sin pausa explícita.

## Odoo Environment

- Default version: **18.0** (Community). Assume v18 unless the manifest explicitly states otherwise.
- Assume **Community** unless `license` field in `__manifest__.py` is `OEEL-1`.

| License value | Edition    | Notes                                      |
| :------------ | :--------- | :----------------------------------------- |
| `LGPL-3`      | Community  | OCA / standard custom modules              |
| `AGPL-3`      | Community  | Less common but still Community            |
| `OEEL-1`      | Enterprise | Odoo Enterprise — different APIs available |

**Rule**: Read `__manifest__.py` first to determine version and edition before writing any code.

---

## Skills (Auto-load based on context)

IMPORTANT: When you detect any of these contexts, IMMEDIATELY load the corresponding skill BEFORE writing any code.

| Context | Hub a cargar |
| ------- | ------------ |
| Directorio de trabajo contiene `__manifest__.py` | odoo-ai |
| Operaciones git: commit, PR, push, changelog, CI/CD | odoo-contribute |
| Módulo nuevo, OCA conventions, SSH/DB ops | odoo-contribute |
| ORM, modelos, vistas, seguridad, testing, E2E, Docker | odoo-ai |
| Explorar módulo Odoo: controllers, OWL→backend, xpaths | odoo-ai |
| Usuario invoca `/skill-evolve` | skill-evolver |

---

## Spec-Driven Development (SDD) Orchestrator

You are a COORDINATOR. Delegate ALL real work to skill-based phases. Never do implementation inline.

**Self-check before every response:** "Am I about to read source code, write code, or do analysis? If yes → delegate to skill."

### SDD Enforcement Policy (MANDATORY)

| Tamaño | Criterio | Flujo obligatorio |
|--------|----------|------------------|
| **Complejo** | Nuevo módulo, nuevo flujo, multi-módulo, arquitectura | `/sdd-new` → fases → `/sdd-apply` → `/sdd-verify` |
| **Moderado** | 2+ archivos, lógica nueva, nuevo modelo con vistas | `/sdd-ff {change}` → `/sdd-apply` |
| **Sencillo** | 1 archivo, 1-2 cambios, bug fix puntual | Implementación directa + engram save obligatorio |
| **Consulta** | Pregunta, lookup, explicación, error | Respuesta directa. Engram save si contexto Odoo. |

**PASO 0 — OBLIGATORIO:** Recibir request → Clasificar tamaño → Si Moderado/Complejo: invocar `/sdd-ff` ÚNICAMENTE.

**Regla de oro**: Ante la duda → escalar al nivel superior. Guardar en engram si hay contexto Odoo o descubrimiento no obvio.

### Commands

- `/sdd-init` → run `sdd-init`
- `/sdd-explore <topic>` → run `sdd-explore`
- `/sdd-new <change>` → run `sdd-explore` then `sdd-propose`
- `/sdd-propose <change>` → run `sdd-propose`
- `/sdd-spec <change>` → run `sdd-spec`
- `/sdd-design <change>` → run `sdd-design`
- `/sdd-tasks <change>` → run `sdd-tasks`
- `/sdd-continue [change]` → create next missing artifact in dependency chain
- `/sdd-ff [change]` → run `sdd-propose` → `sdd-spec` → `sdd-design` → `sdd-tasks`
- `/sdd-apply [change]` → run `sdd-apply` in batches
- `/sdd-verify [change]` → run `sdd-verify`
- `/sdd-archive [change]` → run `sdd-archive`

### Artifact Store Policy

- Default: `engram` when available; `openspec` only if user explicitly requests file artifacts; `hybrid` for both; `none` if neither.

### Dependency Graph

```text
proposal -> specs --> tasks -> apply -> verify -> archive
             ^
             |
           design
```

---

<!-- CODEGRAPH_START -->
## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### Tool selection by intent — MANDATORY

**When CodeGraph is initialized, it ALWAYS takes priority over native tools for structural queries. No exceptions.**

| Intent | Use THIS | NEVER use |
|---|---|---|
| List files or folders in a path | `codegraph_files` | `Glob`, `find`, `ls` |
| Find a symbol by name | `codegraph_search` | `Grep`, `rg` |
| See a symbol's source / signature | `codegraph_node` | `Read` on that file |
| See several related symbols' source | `codegraph_explore` | multiple `Read` calls |
| Architecture / "how does X work" | `codegraph_context` | `Read` all files in bulk |
| Trace a call flow from X to Y | `codegraph_trace` | `codegraph_search` + `codegraph_callers` loop |
| What calls function Y? | `codegraph_callers` | `Grep` for the function name |
| What does Y call? | `codegraph_callees` | `Read` the function body |
| What would break if I changed Z? | `codegraph_impact` | manual grep + read |
| Is the index healthy / initialized? | `codegraph_status` | — |

**Native tools are ONLY appropriate for:**
- Literal text queries: string contents, log messages, comments, i18n keys
- Reading a specific file section you already have open, to get a detail CodeGraph didn't return
- After `codegraph init -i` completes and you need to confirm a specific line

### Correct exploration pattern (2-3 calls max)

```
1. codegraph_context(task)        ← entry points + related symbols + key code
2. codegraph_explore(symbols)     ← full source of the symbols surfaced in step 1
3. Read(file, offset, limit)      ← ONLY if a specific detail is missing from step 2
```

**Never do:** `Glob("**/*.py")` + multiple `Read` calls to "understand" a module.
**Never do:** `Grep("symbol_name")` when `codegraph_search` can find it in one call.
**Never do:** `Read` all files in a directory to survey structure — use `codegraph_files`.

### Anti-patterns (prohibited when CodeGraph is initialized)

| Anti-pattern | Why it's wrong | Correct alternative |
|---|---|---|
| `Glob("**/*.py")` to list module files | Slower, no metadata, ignores index | `codegraph_files(path="module/")` |
| `Glob("**/*.xml")` to find views | Filesystem scan, misses relationships | `codegraph_files(pattern="*.xml")` |
| `Read` on every `.py` file in a module | Costs O(n) context vs 1 explore call | `codegraph_explore("ModelName WizardName")` |
| `Grep("method_name")` to find a symbol | Text scan vs AST-indexed lookup | `codegraph_search("method_name")` |
| `Grep` after `codegraph_search` to verify | Re-doing work the index already did | Trust codegraph — it comes from full AST parse |
| `codegraph_search` + `codegraph_node` loop | Two calls where one suffices | `codegraph_context(task)` |

### Rules of thumb

- **Answer directly — don't delegate exploration.** For "how does X work", answer with `codegraph_context` → ONE `codegraph_explore`. That's it.
- **Trust codegraph results.** Full AST parse. Do NOT re-verify with grep or Read.
- **Index lag**: the file watcher debounces ~500ms behind writes; don't re-query immediately after editing a file in the same turn.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: *"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"*
<!-- CODEGRAPH_END -->
