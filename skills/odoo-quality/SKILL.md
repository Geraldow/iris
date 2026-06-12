# Odoo Quality — Sistema de Puntuación de Calidad para Módulos Odoo

## Metadata
- **Version**: 1.0.0
- **Updated**: 2026-06-10
- **Odoo Versions**: 18.0
- **License**: AGPL-3
- **Tags**: quality, testing, OCA, code-review, CI-gates, scoring

## Description

Sistema de evaluación de calidad para módulos Odoo basado en 10 dimensiones ponderadas. Cada dimensión mide un aspecto específico del desarrollo Odoo (ORM, seguridad, vistas, tests, manifest, etc.) y produce un score numérico (0–100) consumible por CI/CD y almacenable en Engram. Integrado con la metodología Reciprocal Apprenticeship: cada penalización incluye fundamento, ruta UI de verificación y fix explicado.

## When to Use This Skill

- Evaluar calidad de un módulo Odoo antes de merge/deploy (`iris> tool: odoo-quality-score`)
- Generar reporte de calidad en formato JSON para CI gates
- Revisar cumplimiento OCA en PRs (`iris> tool: odoo-quality-review`)
- Auditar seguridad, performance y estructura de módulos
- Integrar quality gates en pipeline CI/CD (pre-commit, PR, merge, deploy)
- Almacenar reportes históricos en Engram para tracking de mejora continua

## Fundamentals (Reciprocal Apprenticeship)

### Quality Philosophy
- **What**: La calidad no es un semáforo — es una oportunidad de aprendizaje. Cada medición responde: ¿Qué falló? ¿Por qué importa? ¿Cómo verificarlo en UI? ¿Cómo arreglarlo con comprensión?
- **Why in Odoo**: Un módulo Odoo puede funcionar correctamente y aun así violar principios de seguridad, performance o mantenibilidad que se manifiestan como problemas graves en producción.
- **Reference**: `docs/04-CONTRIBUTING.md §1`, `docs/04-CONTRIBUTING.md §2`

### Scoring Formula
- **What**: `QUALITY_SCORE = Σ(weight_i × score_i)` para 10 dimensiones. Cada dimensión empieza en 1.0 y aplica penalizaciones multiplicativas.
- **Why in Odoo**: La ponderación refleja el impacto real en producción — ORM (20%) y Seguridad (15%) tienen el mayor peso porque sus fallas son las más costosas.
- **Reference**: `docs/04-CONTRIBUTING.md §3`

### Quality Thresholds
- 🟢 **≥ 90**: Production ready — merge/deploy automático
- 🟡 **70–89**: Needs improvement — revisión humana requerida
- 🔴 **< 70**: Blocking — no merge, no deploy

## Core Content

### Las 10 Dimensiones de Calidad

| # | Dimensión | Weight | ¿Qué mide? | Penalizaciones clave |
|---|-----------|--------|------------|----------------------|
| 1 | **Estructural** | 10% | Directorios OCA obligatorios | -50% si falta `models/` o `security/` |
| 2 | **Manifest** | 10% | `__manifest__.py` completo | -50% si license no es AGPL-3 |
| 3 | **Modelos y ORM** | 20% | Uso correcto del ORM Odoo | -30% por `sudo()` sin comentario; -30% por `cr.execute()` sin parametrización |
| 4 | **Vistas y UX** | 15% | Calidad de vistas XML Odoo 18 | -15% por `attrs` en vez de `invisible` inline |
| 5 | **Seguridad** | 15% | ACL, record rules, sudo(), field-level | -100% si modelo sin `ir.model.access.csv` |
| 6 | **Tests** | 15% | Cobertura y calidad de tests | -100% si no existe `tests/` |
| 7 | **i18n** | 5% | Preparación para internacionalización | -50% por string hardcoded en QWeb |
| 8 | **Performance** | 5% | Anti-patrones N+1, índices, domains | -40% por `search()` dentro de `for` loop |
| 9 | **Documentación** | 3% | Docstrings, help, comments | -30% si métodos públicos sin docstring |
| 10 | **Mantenibilidad** | 2% | Código limpio, PEP8, OCA conventions | -30% por método >100 líneas |

### Generación de Quality Report (JSON)

Cada evaluación produce un reporte JSON estándar:

```json
{
  "meta": {
    "module": "alesco_api_bridge",
    "version": "18.0.1.0.0",
    "odoo_version": "18.0",
    "evaluator": "iris-quality-engine",
    "evaluator_version": "1.0.0"
  },
  "overall_score": 72,
  "threshold": "yellow",
  "dimensions": [
    {
      "name": "Seguridad",
      "weight": 0.15,
      "weight_label": "15%",
      "score": 0.4,
      "score_pct": 40,
      "penalties": [
        {
          "rule": "missing_acl",
          "severity": "critical",
          "deduction": 1.0,
          "message": "Model 'alesco.api.log' missing from ir.model.access.csv",
          "fundamental": "Every model needs explicit access rights in ir.model.access.csv. Without it, only sudo can access.",
          "ui_verification": "Settings → Technical → Security → Access Rights → filter by model",
          "fix": "Add entry to security/ir.model.access.csv",
          "reference_url": "https://www.odoo.com/documentation/18.0/developer/reference/backend/security.html"
        }
      ]
    }
  ],
  "learning_moments": [],
  "reciprocal_apprenticeship": {
    "learning_moments_count": 0,
    "dimensions_with_explanation": 10,
    "pillars_applied": ["Human-First", "Fundamentals-First", "Transparency"],
    "onion_level_target": 2,
    "generated_at": "2026-06-10T12:00:00Z",
    "methodology_reference": "docs/04-CONTRIBUTING.md"
  }
}
```

### Reciprocal Apprenticeship en cada Hallazgo

Cada penalización debe incluir obligatoriamente el formato RA:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📖 WHAT failed: [descripción del hallazgo]                          │
│ 📖 WHY it matters: [fundamento Odoo + referencia a docs oficiales]  │
│ 🖥️ HOW to verify in UI: [ruta exacta: menú → acción → campo]       │
│ 🔧 HOW to fix with understanding: [código + explicación conceptual]  │
└─────────────────────────────────────────────────────────────────────┘
```

### CI Gates Integration

| Gate | Mínimo | Acción si falla |
|------|--------|-----------------|
| **Pre-commit hook** | 70 | Warn si < 70, bloquea si < 50 |
| **PR submission** | 80 | Bloquea revisión humana hasta corregir |
| **Merge a main** | 85 | Bloquea merge |
| **Producción** | 90 | Bloquea deploy (requiere aprobación manual si < 90) |

Los gates se implementan como parte del Harness de Enforcement (`docs/01-PRD.md §6`):

```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates
on: [push, pull_request]

jobs:
  quality-score:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run quality scorer
        run: iris quality-score --module ./alesco_api_bridge --output report.json
      - name: Check pre-commit gate (≥ 70)
        if: github.event_name == 'push'
        run: |
          SCORE=$(jq '.overall_score' report.json)
          if [ "$SCORE" -lt 50 ]; then exit 1; fi
          if [ "$SCORE" -lt 70 ]; then echo "⚠️ Score $SCORE — review recommended"; fi
      - name: Check PR gate (≥ 80)
        if: github.event_name == 'pull_request'
        run: |
          SCORE=$(jq '.overall_score' report.json)
          if [ "$SCORE" -lt 80 ]; then exit 1; fi
      - name: Archive report in Engram
        run: iris quality-archive --report report.json
```

### Almacenamiento en Engram

Los reportes se guardan con topic key: `sdd/{module-name}/quality-report/{timestamp}`
Esto permite trazabilidad histórica, detección de regresiones, y comparación entre módulos.

## Verification

- Verificar que el reporte JSON contiene TODAS las 10 dimensiones
- Confirmar que cada penalización incluye fundamento, ruta UI y fix
- Ejecutar `iris quality-score --module <path>` y verificar que el score es reproducible
- Verificar que CI gates bloquean correctamente según umbrales

## References

- **Odoo Docs**: `odoo.com/documentation/18.0/developer/reference/backend/`
- **OCA Quality Guidelines**: `github.com/OCA/maintainer-tools/blob/master/tools/quality.md`
- **OCA Module Structure**: `github.com/OCA/maintainer-tools`
- **iris Docs**: `docs/04-CONTRIBUTING.md` (autoridad), `docs/01-PRD.md §3` (Quality Engineering #12), `docs/01-PRD.md §6` (Harness), `docs/04-CONTRIBUTING.md §4.4` (Learning Artifact), `AGENTS.md §3` (Agentes Reviewer y Tester)
- **Research**: Comeau (2026), DORA (2024), METR (2025), Sonar (2025)
