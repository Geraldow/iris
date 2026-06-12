# Odoo Reliability — Estrategias de Resiliencia para Odoo Enterprise

## Metadata
- **Version**: 1.0.0
- **Updated**: 2026-06-10
- **Odoo Versions**: 18.0
- **License**: AGPL-3
- **Tags**: reliability, backup, recovery, circuit-breaker, Odoo.sh, upgrade, DR

## Description

Estrategias de resiliencia para despliegues Odoo Enterprise en Odoo.sh: backups automáticos, recuperación ante desastres, upgrades seguros, circuit breaker para SSH, y runbooks de procedimientos. Aplica los principios de Reliability Engineering (#13) del ecosistema iris: diseño para falla, recuperación automática, rollback siempre posible, y sin estado local.

## When to Use This Skill

- Configurar y verificar estrategia de backups Odoo.sh (`iris> tool: odoo-backups list`)
- Ejecutar recuperación ante desastres (módulo dañado, datos corruptos, build roto)
- Planificar upgrades de versión Odoo o módulos individuales
- Manejar fallos de conectividad SSH con circuit breaker
- Implementar health checks y monitoreo de confiabilidad
- Ejecutar runbooks de recuperación (bridge falla, CI falla, backup falla)

## Fundamentals (Reciprocal Apprenticeship)

### Diseño para Falla
- **What**: Todo componente puede fallar. El sistema debe degradarse gracefulmente, no colapsar. Los patrones de resiliencia (retry, circuit breaker, timeout, fallback, bulkhead, health check) se aplican a todas las conexiones externas.
- **Why in Odoo**: Odoo.sh tiene URLs SSH dinámicas que cambian en cada push. PostgreSQL puede tener failover. El bridge puede estar en mantenimiento. Sin resiliencia, cualquier fallo transitorio detiene el desarrollo.
- **Reference**: `docs/03-ARCHITECTURE.md §1`, `docs/03-ARCHITECTURE.md §5`

### Backup Strategy (3-2-1)
- **What**: 3 copias de datos, 2 medios diferentes, 1 fuera del sitio. Odoo.sh implementa backups diarios (retención 7 días), semanales (4 semanas) y mensuales (12 meses), más backups bajo demanda.
- **Why in Odoo**: La base de datos Odoo contiene transacciones, configuraciones y datos de negocio. Sin backups verificados, la pérdida de datos es irreversible. Un backup no verificado no es un backup.
- **Reference**: `docs/03-ARCHITECTURE.md §2`

### Circuit Breaker Pattern
- **What**: Patrón de resiliencia con 3 estados: **Closed** (operación normal, llamadas pasan), **Open** (3 fallos consecutivos, llamadas bloqueadas por 30s), **Half-Open** (después de 30s, 1 llamada de prueba permitida; si éxito → Closed, si fallo → Open).
- **Why in Odoo**: La conexión SSH a Odoo.sh es dinámica — el build_id cambia con cada push. Si la conexión falla, no tiene sentido reintentar inmediatamente. El circuit breaker evita llamadas innecesarias y permite rediscovery automático.
- **Reference**: `docs/03-ARCHITECTURE.md §5.2`, `docs/03-ARCHITECTURE.md §9`

## Core Content

### Estrategia de Backups

| Tipo | Frecuencia | Retención | Contenido | Verificación |
|------|-----------|-----------|-----------|--------------|
| Diario | Cada 24h | 7 días | DB completa + filestore | Automática (Odoo.sh) |
| Semanal | Cada 7 días | 4 semanas | DB completa + filestore | Restore trimestral |
| Mensual | Cada 30 días | 12 meses | DB completa + filestore | Integridad mensual |
| Bajo demanda | Manual | Hasta eliminación | DB completa + filestore | Manual |

**Comandos desde iris:**
```bash
# Listar backups disponibles
iris> tool: odoo-backups list

# Descargar backup
iris> tool: odoo-backups download --id 12345 --output ./backups/

# Restaurar en entorno de prueba
iris> tool: odoo-backups restore --id 12345 --target staging

# Verificar integridad de backup
iris> tool: odoo-backups verify --id 12345
```

### Recuperación ante Desastres

| Escenario | Procedimiento | Verificación |
|-----------|--------------|--------------|
| **Módulo dañado** | Desinstalar + reinstalar módulo, rollback de migración | Correr test suite del módulo |
| **Datos corruptos** | Restaurar backup desde Odoo.sh | Verificar conteo de registros críticos |
| **Build roto** | Corregir en staging, forzar rebuild CI | Build status = green |
| **Seguridad comprometida** | Rotar tokens, revocar accesos, auditar logs | Security audit completo |
| **iris caído** | Reiniciar iris, recuperar contexto de Engram | `tool: odoo-check-connections` |
| **Conexión SSH perdida** | Rediscovery de build via API Odoo.sh | `tool: odoo-check-connections` |

### Upgrade Strategy

**Fases**: Preparación → Staging → Producción

```
1. SEMANA 1: Auditoría
   - Revisar release notes de Odoo
   - Identificar breaking changes
   - Auditar módulos custom contra new API
   - Crear plan de migración

2. SEMANA 2: Staging
   - Crear branch de upgrade en Odoo.sh
   - Ejecutar upgrade y corregir errores
   - Ejecutar test suite completo
   - Validar funcionalmente con el equipo

3. SEMANA 3: Producción
   - Backup completo ANTES del upgrade
   - Ejecutar upgrade
   - Monitoreo intensivo (24h)
   - Rollback preparado antes de iniciar
```

**Upgrade de módulo individual:**
```bash
# 1. Backup del módulo actual
git tag pre-upgrade/alesco_api_bridge/1.0.0

# 2. Crear branch de upgrade
git checkout -b upgrade/alesco_api_bridge-1.1.0

# 3. Ejecutar SDD para el cambio
iris> sdd-ff alesco-api-bridge-upgrade

# 4. Probar en staging
iris> tool: odoo-build-status

# 5. Merge a producción
git checkout main && git merge upgrade/alesco_api_bridge-1.1.0 && git push
```

### Circuit Breaker para SSH

```
Estados:
  Closed:   Operación normal. Conexiones SSH pasan directamente.
  Open:     3 fallos consecutivos. Conexiones bloqueadas por 30s.
  Half-Open: Después de 30s, 1 conexión de prueba permitida.
    → Si éxito: retorna a Closed
    → Si fallo: retorna a Open por otros 30s

Tiempos:
  - Timeout de conexión SSH: 15s
  - Retry con backoff: 1s, 2s, 4s (3 intentos)
  - Tiempo en Open: 30s
  - Health check: cada 5 min
```

### Patrones de Resiliencia

| Patrón | Aplicación | Parámetros |
|--------|-----------|------------|
| **Retry con Backoff** | Conexiones a Odoo.sh, bridge | 3 intentos, backoff 1s/2s/4s |
| **Circuit Breaker** | Conexión SSH | 3 fallos → Open 30s |
| **Timeout** | Conexiones externas | Bridge 10s, SSH 15s, API Odoo.sh 5s |
| **Fallback** | Tools Odoo.sh | SSH falla → intentar vía API REST |
| **Bulkhead** | Pools de conexión | Bridge, SSH y API usan pools independientes |
| **Health Check** | iris al inicio | Verificar todas las conexiones |

### Failure Modes and Recovery

| Failure | Síntoma | Recovery | RTO |
|---------|---------|----------|-----|
| **Bridge unreachable** | Tools CRUD fallan | Rediscovery de build + verificar token | < 1 min |
| **SSH connection lost** | Tools shell/logs fallan | Circuit breaker 30s + rediscovery | < 1 min |
| **Engram unavailable** | mem_save/search fallan | Verificar daemon + reiniciar sesión | < 30s |
| **CodeGraph fails** | Explore bloqueado | Reindexar proyecto CodeGraph | < 1 min |
| **Odoo.sh API unavailable** | build_id no descubrible | Usar último build_id en cache | < 10s |
| **Token expirado** | Bridge devuelve 401 | Renovar token en settings Odoo | < 15 min |
| **PostgreSQL down** | Odoo no responde | Odoo.sh HA automático | < 10 min |

### Odoo.sh Built-in Reliability

- **HTTPS/TLS 1.3**: Terminación TLS automática en el Nginx de Odoo.sh
- **PostgreSQL**: Instancia administrada con replicación y failover automático
- **pg_stat_statements**: Extensión de PostgreSQL para monitoreo de queries — habilitada por defecto en Odoo.sh
- **Backups automáticos**: Diarios/semanales/mensuales gestionados por Odoo.sh
- **Builds CI**: Cada push genera un build con tests automáticos

## Verification

- Listar backups: `iris> tool: odoo-backups list` — verificar que hay backups diarios, semanales y mensuales
- Verificar integridad de backup: `iris> tool: odoo-backups verify`
- Probar health check: `iris> tool: odoo-check-connections` — todas las conexiones deben reportar OK
- Verificar circuit breaker: desconectar SSH → 3 intentos → estado Open → esperar 30s → Half-Open
- Verificar pg_stat_statements: `iris> tool: odoo-psql-query "SELECT * FROM pg_stat_statements LIMIT 5"`

## References

- **Odoo.sh Docs**: `odoo.com/documentation/18.0/administration/odoo_sh.html`
- **Odoo.sh Backups**: `odoo.com/documentation/18.0/administration/odoo_sh.html#backups`
- **pg_stat_statements**: `postgresql.org/docs/current/pgstatstatements.html`
- **iris Docs**: `docs/03-ARCHITECTURE.md` (autoridad), `docs/03-ARCHITECTURE.md §9` (Failure Modes), `docs/03-ARCHITECTURE.md §8` (Security-Critical Connections), `SECURITY.md §8.2` (SSH policy), `docs/01-PRD.md §3` (Reliability Engineering #13), `docs/01-PRD.md §6` (Harness), `AGENTS.md §3` (Odoo Ops agent)
