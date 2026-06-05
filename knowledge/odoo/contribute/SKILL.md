---
name: odoo-contribute
description: Hub VCS, git, infraestructura, Docker, OCA. Orquesta auto-detection en paralelo, carga plugins especializados.
license: MIT
metadata:
  author: Geraldow
  version: "1.4"
---

## Inicialización — Auto-Detection (PARALELO + SECUENCIAL)

### Fase 1: Auto-Detection (PARALELO)

Ejecutar en paralelo:
- `scripts/detect-environment.ps1` → Odoo.sh vs local/Docker status
- `scripts/branch-safety-check.ps1` → rama actual, ramas remotas, validación

Esperar a que ambos completen.

### Fase 2: Interpretación (SECUENCIAL)

Según resultado de detect-environment:

**SI ODOO_SH:**
- Proceder con contexto remoto
- No necesita Docker

**SI LOCAL_DEV:**
- `scripts/docker-setup.ps1` → verificar/iniciar Docker
- Proceder con contexto local

### Fase 3: Clasificación (SEGÚN CONTEXTO)

Detectar necesidad del usuario usando tabla abajo → cargar plugin hijo correspondiente

> Runtime base: directorio activo que contiene este `SKILL.md`.
> Fuente maestra: `~/.claude/skills/odoo-contribute/`.
> Mirrors: `~/.codex/skills/odoo-contribute/` y otros destinos sincronizados por `~/.config/ai-agents/sync-agents.ps1`.

---

## Consolidación / Sync

Leer `knowledge/core/consolidation.md` antes de modificar este hub.

- Editar siempre la fuente maestra `~/.claude/skills/odoo-contribute/`.
- Sincronizar mirrors con `~/.config/ai-agents/sync-agents.ps1`.
- Verificar drift con `scripts/verify-consolidation.ps1`.
- En runtime, resolver scripts y plugins relativos al directorio activo del skill.

---

## Tabla de Detección

| Contexto | Plugin | Script | Leer |
|----------|--------|--------|------|
| Detectar Odoo.sh vs local Docker | — | `scripts/detect-environment.ps1` | — |
| Branch safety, rama actual, ramas remotas | — | `scripts/branch-safety-check.ps1` | — |
| Docker setup, docker-compose | — | `scripts/docker-setup.ps1` | — |
| Git commit, "commitea", "sube" | odoo-commit | — | `plugins/odoo-commit/SKILL.md` |
| PR, MR, pull request | odoo-pr | — | `plugins/odoo-pr/SKILL.md` |
| Changelog, CHANGELOG | odoo-changelog | — | `plugins/odoo-changelog/SKILL.md` |
| CI, GitHub Actions, pipeline | odoo-ci | — | `plugins/odoo-ci/SKILL.md` |
| Nuevo módulo, estructura | odoo-module | — | `plugins/odoo-module/SKILL.md` |
| OCA standards, pre-commit | odoo-oca | — | `plugins/odoo-oca/SKILL.md` |
| SSH, DB, psql, backup, logs | odoo-ops | — | `plugins/odoo-ops/SKILL.md` |
| Orientación Odoo, stack, arquitectura | odoo-overview | — | `plugins/odoo-overview/SKILL.md` |

---

## Critical Rules

- **Scripts primero** — ejecutar script antes de leer plugin
- **Trigger explícito** — solo leer plugin si usuario lo pide o contexto lo requiere
- **Branch safety** → ejecutar `scripts/branch-safety-check.ps1` ANTES de push/commit
- **No "Co-Authored-By"** — commits convencionales solo
- Confirmar antes de push (acción irreversible)
- **Idioma de mensajes** — detectar automáticamente el idioma del prompt del usuario:
  - Prompt en español → descripciones de commit, PR y changelog en español
  - Prompt en inglés → descripciones en inglés
  - Los keywords de tipo (`feat`, `fix`, `chore`, etc.) son SIEMPRE en inglés sin excepción

---

## Scripts Disponibles

- `detect-environment.ps1` — Odoo.sh vs local; Docker status
- `branch-safety-check.ps1` — rama actual, ramas remotas, validación
- `docker-setup.ps1` — verificar Docker, iniciar containers
