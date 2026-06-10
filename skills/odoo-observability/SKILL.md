# Odoo Observability — OpenTelemetry Tracing para Odoo Enterprise

## Metadata
- **Version**: 1.0.0
- **Updated**: 2026-06-10
- **Odoo Versions**: 18.0
- **License**: AGPL-3
- **Tags**: opentelemetry, tracing, observability, performance, monitoring, SRE

## Description

Instrumentación de módulos Odoo con OpenTelemetry para tracing de ORM calls, HTTP requests y RPC calls. Exporta trazas vía OTLP a Grafana Cloud Free Tier para debugging de performance, análisis de queries lentas y monitoreo proactivo. Basado en `opentelemetry-distro-odoo` (Apache-2.0, $0) — prohibición explícita de usar `dkn_otel` ($24.99/mes, OPL-1).

## When to Use This Skill

- Instrumentar módulos Odoo con OpenTelemetry (`iris> tool: odoo-observability-setup`)
- Diagnosticar queries lentas mediante spans OTel
- Analizar trazas de ORM search/read/create/write/unlink
- Configurar export OTLP a Grafana Cloud (gRPC :4317, HTTP :4318)
- Debuggear slow paths en producción
- Implementar health checks y monitoreo de integridad OTel
- Verificar cumplimiento de ADR-005 (costo $0)

## Fundamentals (Reciprocal Apprenticeship)

### OpenTelemetry en Odoo
- **What**: OpenTelemetry es un framework de observabilidad open source que permite generar, recolectar y exportar trazas, métricas y logs. En Odoo, se integra a nivel de ORM, HTTP controllers y RPC calls para medir latencia de cada operación.
- **Why in Odoo**: Las queries lentas en Odoo son el problema de performance más común. Sin tracing, es imposible saber qué operación específica está causando lentitud. Con OTel, cada llamada ORM genera un span con duración, query SQL, modelo y método.
- **Reference**: `CONNECTIVITY.md §4.4`, `odoo.com/documentation/18.0/developer/reference/backend/orm.html#performance`

### CRITICAL: opentelemetry-distro-odoo (free) vs dkn_otel (paid)
- **What**: `opentelemetry-distro-odoo` es una distribución gratuita (Apache-2.0) de OpenTelemetry para Odoo. `dkn_otel` es una alternativa paga ($24.99/mes, OPL-1). `az_opentelemetry` también es paga ($20.00/mes, OPL-1).
- **Why in Odoo**: El principio de costo cero operativo del ecosistema iris (`docs/ECOSYSTEM.md §9`) exige que ningún componente requiera suscripción de pago. `dkn_otel` está explícitamente prohibido por ADR-005.
- **Reference**: `pypi.org/project/opentelemetry-distro-odoo/`, `ARCHITECTURE.md ADR-005`, `ECOSYSTEM.md §9`

### OTLP Protocol
- **What**: OpenTelemetry Protocol (OTLP) es el protocolo estándar para exportar datos de observabilidad. Soporta transporte gRPC (puerto 4317) y HTTP (puerto 4318).
- **Why in Odoo**: La elección entre gRPC y HTTP depende del entorno: gRPC es más eficiente para alto throughput (producción); HTTP es más simple para debugging local o detrás de proxies que no soportan HTTP/2.
- **Reference**: `CONNECTIVITY.md §5`, `opentelemetry.io/docs/reference/specification/protocol/`

## Core Content

### Prohibición Absoluta

| Opción | Costo | Licencia | Estado |
|--------|-------|----------|--------|
| `opentelemetry-distro-odoo` | **$0** (gratis, open source) | Apache-2.0 | ✅ Siempre recomendado |
| `dkn_otel` | $24.99/mes | OPL-1 (pago) | ❌ PROHIBIDO |
| `az_opentelemetry` | $20.00/mes | OPL-1 (pago) | ❌ PROHIBIDO |

**Regla del harness**: Cualquier import de `dkn_otel` o `az_opentelemetry` en el código bloquea el CI gate.

### Instalación

```bash
pip install opentelemetry-distro-odoo
```

### Tracing de ORM Calls

El módulo `alesco_observability` instrumenta automáticamente las operaciones del ORM:

```python
# Ejemplo: cada search/read/create/write/unlink genera un span
# Atributos del span:
#   - db.name: nombre de la base de datos
#   - orm.query: consulta SQL generada
#   - orm.model: modelo Odoo (res.partner, sale.order, etc.)
#   - orm.method: search, read, create, write, unlink
#   - duration_ms: tiempo de ejecución en milisegundos

# Los spans se exportan en batch cada 5s o 512 items
```

### Tracing de HTTP Requests

```python
# Cada request HTTP a Odoo (incluyendo RPC calls) se traza con:
#   - http.method: GET, POST, etc.
#   - http.route: /alesco/api/query, /web, /jsonrpc, etc.
#   - http.status_code: 200, 401, 500, etc.
#   - duration_ms: tiempo total del request
```

### Configuración OTLP

```yaml
# OTLP gRPC endpoint (recomendado para producción)
OTEL_EXPORTER_OTLP_ENDPOINT: "https://otlp.grafana.com:4317"
OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Basic <base64(instance-id:api-key)>"

# OTLP HTTP endpoint (alternativa para debugging)
OTEL_EXPORTER_OTLP_ENDPOINT: "https://otlp.grafana.com:4318"
OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf"

# Configuración del servicio
OTEL_SERVICE_NAME: "alesco_observability"
OTEL_RESOURCE_ATTRIBUTES: "odoo.version=18.0,odoo.db=corporacion-benest"
```

### Interpretación de Trazas para Debugging

Para diagnosticar queries lentas:

1. Consultar trazas en Grafana Cloud: `iris> tool: odoo-observability-query`
2. Filtrar por `orm.model` y `duration > 100ms`
3. Identificar el span más lento y revisar la query SQL
4. Ejecutar `EXPLAIN ANALYZE` de la query identificada
5. Sugerir índices faltantes o refactorizar el método

### Flujo de Observabilidad Completo

```
Odoo ORM → alesco_observability (instrumentación) → OTLP gRPC :4317
→ OpenTelemetry Collector → OTLP HTTP :443 → Grafana Cloud
→ Developer consulta vía iris
```

### Uso del Módulo alesco_observability

```bash
# Verificar health del módulo OTel
iris> tool: odoo-observability-health

# Consultar trazas lentas de un modelo específico
iris> tool: odoo-observability-query --model res.partner --min-duration 100

# Ver dashboard de performance
iris> tool: odoo-observability-dashboard

# Verificar que NO se usa dkn_otel
iris> tool: odoo-cost-audit
```

## Verification

- Verificar que `opentelemetry-distro-odoo` está instalado: `pip show opentelemetry-distro-odoo`
- Confirmar que NO hay import de `dkn_otel` ni `az_opentelemetry` en el código: `rg "dkn_otel|az_opentelemetry"`
- Verificar que los spans aparecen en Grafana Cloud: consultar por `service.name = alesco_observability`
- Verificar health endpoint: `GET /alesco/otel/health` → debe responder 200 OK
- Verificar costo: `iris> tool: odoo-cost-audit` → debe reportar $0

## References

- **opentelemetry-distro-odoo (gratis)**: `pypi.org/project/opentelemetry-distro-odoo/`
- **OpenTelemetry Python**: `opentelemetry.io/docs/python/`
- **OpenTelemetry Protocol**: `opentelemetry.io/docs/reference/specification/protocol/`
- **Grafana Cloud Free Tier**: `grafana.com/products/cloud/`
- **Odoo ORM Performance**: `odoo.com/documentation/18.0/developer/reference/backend/orm.html#performance`
- **iris Docs**: `CONNECTIVITY.md §4.4` (Observability Flow), `CONNECTIVITY.md §5` (Port and Endpoint Reference), `ECOSYSTEM.md §9` (Zero Cost), `ARCHITECTURE.md ADR-005` (OTel gratis), `AGENTS.md §3` (Odoo Observable agent), `SECURITY.md` (audit trails)
