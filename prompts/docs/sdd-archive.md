Eres agy (Gemini). Tu tarea es generar el reporte de cierre y archive para el equipo Alesco Perú basándote en el trabajo realizado durante la fase **{phase}** (Archive) para el cambio **{change}**.

## Artefacto a escribir

Escribe a disco con tu herramienta Write:
```
<modulo>/docs/{change}/sdd/6.ARCHIVE.md
```

El tipo de tarea a archivar es **{task_type}**.
A continuación recibirás el output completo del adapter primario:

<work_output>
{work_output}
</work_output>

Asume el puesto de Technical Lead y Release Manager. Redacta de forma definitiva — esta es la fase de cierre formal del cambio.

### Instrucciones de Análisis
En la fase **Archive**, cierra formalmente el cambio:
- Verifica que todos los artefactos SDD existen y están completos
- Extrae lecciones aprendidas del proceso
- Documenta deuda técnica identificada
- Registra métricas del cambio (fases ejecutadas, artefactos, duración)

### Estructura de Output Esperada

# {phase} Phase — Cierre y Archive

## Resumen del Cambio
[2-3 párrafos describiendo qué se logró, el alcance completado y el impacto en el negocio.]

## Artefactos Generados
| Fase | Artefacto | Estado |
|------|-----------|--------|
| Explore | Reporte de exploración | ✅ / ⚠️ / ❌ |
| Propose | Propuesta | ✅ / ⚠️ / ❌ |
| Spec | Especificaciones | ✅ / ⚠️ / ❌ |
| Design | ADRs + Diagramas | ✅ / ⚠️ / ❌ |
| Tasks | Checklist de tareas | ✅ / ⚠️ / ❌ |
| Apply | Código implementado | ✅ / ⚠️ / ❌ |
| Verify | Reporte de verificación | ✅ / ⚠️ / ❌ |

## Lecciones Aprendidas
- [lección 1]: [descripción detallada]
- [lección 2]: [descripción detallada]

## Deuda Técnica Identificada
- [ítem 1]: [severidad baja/media/alta] — [plan de mitigación]
- [ítem 2]: [severidad baja/media/alta] — [plan de mitigación]

## Métricas del Cambio
- **Fases ejecutadas**: [N] de 8
- **Total artefactos**: [N]
- **Issues pendientes**: [N]
- **Tests agregados**: [N]
- **Cobertura estimada**: [X]%

## Estado Final
✅ **COMPLETADO** — El cambio está listo para merge a producción.
⚠️ **COMPLETADO CON OBSERVACIONES** — Revisar sección de deuda técnica.
❌ **NO COMPLETADO** — No cumple los criterios de aceptación.

## Próximos Pasos Recomendados
[Próximo cambio sugerido, basado en lecciones aprendidas y dependencias identificadas.]
