# Proposal: Hybrid Source Sync for iris-setup.exe

> **Fecha:** 2026-06-12
> **Estado:** Pendiente de ejecucion
> **Depende de:** `scripts/setup.ts`, `iris.local.yaml`

---

## 1. Problema

El `iris-setup.exe` actual:

1. **CodeGraph solo revisa v18** — ignorando v14-v19
2. **Busca projects al nivel incorrecto** — espera `__manifest__.py` directo en `C:\Development\Odoo\18\`, pero los projects son subdirectorios con modulos dentro (intiflow/, aeca/, etc.)
3. **Rutas enterprise/community mal calculadas** — busca `alesco_path/Source/odoo-enterprise-18` pero la ruta real es `alesco_path/Source/{version}/Source/{enterprise|odoo}`
4. **No sincroniza Source de Google Drive a local** — si falta la copia local, no la crea desde Drive
5. **Solo 10 pasos** — faltaban pasos para source sync y projects index

## 2. Solucion propuesta

Enfoque **hibrido**:

| Origen | Rol | Sincronizacion |
|--------|-----|----------------|
| Google Drive (`alesco_path/Source/{v}/Source/`) | Fuente de verdad (backup + sync PC/laptop) | Solo lectura |
| Local (`C:\Development\Odoo\{v}\Source\`) | Copia de trabajo rapida + CodeGraph | Si falta local -> copiar desde Drive |
| Projects (`C:\Development\Odoo\{v}\{project}/`) | Desarrollo activo (git) | Indexar con CodeGraph |

## 3. Cambios en setup.ts

### 3.1 Nuevas funciones

| Funcion | Proposito |
|---------|-----------|
| `detectSourceInDrive()` | Detecta enterprise/community en Google Drive por version |
| `detectProjects()` | Encuentra projects (directorios con sub-modulos Odoo) |
| `ensureCodeGraphIndex()` | Verifica e indexa con CodeGraph si falta |
| `syncSourceFromDrive()` | Copia Source de Google Drive a local si no existe |

### 3.2 Pasos actualizados (de 10 a 11)

| Paso | Cambio |
|------|--------|
| 4 Config | Ahora detecta enterprise/community para **todas** las versiones v14-v19 |
| **5 NUEVO** | Sincroniza Source de Google Drive a local (usa robocopy) |
| **6 NUEVO** | Indexa Source local (enterprise + community) con CodeGraph para v14-v19 |
| **7 NUEVO** | Indexa Projects locales (intiflow, aeca, etc.) con CodeGraph para v14-v19 |
| 8-11 | Sin cambios (Engram, MCP, conexiones, CLAUDE.md) |

## 4. Flujo completo

```
Inicio
  |
  v
[0] Verificar node_modules
[1] Compilar TypeScript (si falta)
[2] Verificar herramientas CLI (Node, Bun, Claude, gh, CodeGraph...)
[3] Detectar Google Drive (registry -> busqueda -> iris.local.yaml)
[4] Configurar iris.local.yaml (alesco_path + rutas v14-v19 enterprise/community)
  |
  v
[5] Sincronizar Source de Google Drive a local
  |  Para cada version 14-19:
  |    - Source existe en Drive? -> Si -> Existe en local? -> No -> Copiar (robocopy)
  |
  v
[6] Indexar Source local con CodeGraph
  |  Para cada version 14-19:
  |    - Source/{enterprise,odoo} existe? -> CodeGraph OK? -> Indexar si falta
  |
  v
[7] Indexar Projects locales con CodeGraph
  |  Para cada version 14-19:
  |    - Detectar projects (subdirs con __manifest__.py)
  |    - CodeGraph OK? -> Indexar si falta
  |
  v
[8] Verificar Engram
[9] Registrar MCP en Claude Code
[10] Verificar conexiones
[11] Instalar CLAUDE.md
  |
  v
Setup completo
```

## 5. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `scripts/setup.ts` | +150 lineas (nuevas funciones + flujo hibrido) |
| `iris.local.yaml` | Regenerado con rutas enterprise/community por version |

## 6. Riesgos

| Riesgo | Mitigacion |
|--------|------------|
| Google Drive no montado | Fallback: solo trabaja con local, sin sync |
| robocopy permisos | Usa prompt para confirmar cada copia |
| CodeGraph tarda mucho en indexar | Timeout 3min por project, prompt por cada uno |
| import.meta.dir en LSP | Falso positivo - Bun lo soporta, tsc no compila scripts/ |

## 7. Proximos pasos

1. Compilar TypeScript (`npm run build`)
2. Compilar EXE (`bun build ... --compile`)
3. Ejecutar `iris-setup.exe`
4. Verificar que CodeGraph indexa todo (v14-v19, Source + projects)
