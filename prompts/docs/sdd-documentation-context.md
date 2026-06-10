# Contexto de Documentación SDD — Alesco Perú

Este archivo es inyectado en TODOS los prompts de documentación de iris.
Define la estructura estándar de artefactos, convención de nombres y tipos de diagrama por fase.

---

## Estructura de Carpetas Obligatoria

Cuando documentas un cambio `{change}` dentro de un módulo `{module}`, los artefactos SDD se escriben en:

```
<modulo>/docs/{change}/
  sdd/
    1.PROPOSAL.md
    2.SPEC.md
    3.DESIGN.md
    4.TASKS.md
    5.REPORT.md
  diagramas/
    flujo-{change}.excalidraw
    erd-modelos.excalidraw
    arquitectura-{change}.excalidraw
```

**Regla**: Los archivos de texto SDD van en `sdd/` con número de prefijo. Los diagramas van en `diagramas/`. Nunca mezclar en la raíz.

---

## Convención de Numeración

| Número | Fase     | Nombre de archivo     |
|--------|----------|-----------------------|
| 1      | Propose  | `1.PROPOSAL.md`       |
| 2      | Spec     | `2.SPEC.md`           |
| 3      | Design   | `3.DESIGN.md`         |
| 4      | Tasks    | `4.TASKS.md`          |
| 5      | Report   | `5.REPORT.md`         |

---

## Diagramas por Fase

| Fase    | Diagrama                        | Nombre de archivo                    |
|---------|---------------------------------|--------------------------------------|
| Spec    | ERD — modelos involucrados      | `diagramas/erd-modelos.excalidraw`   |
| Design  | Flujo de proceso principal      | `diagramas/flujo-{change}.excalidraw` |
| Design  | Arquitectura técnica en capas   | `diagramas/arquitectura-{change}.excalidraw` |

---

## Reglas de Escritura

1. **Escribe los archivos a disco** con tu herramienta Write. No pongas el contenido de los archivos en tu respuesta stdout.
2. **Un archivo por Write call** — no concatenes varios artefactos en un solo archivo.
3. **Los diagramas son JSON puro** (formato `.excalidraw`) — ver `excalidraw-guide.md` para schema y templates.
4. Si el módulo aún no tiene carpeta `docs/`, créala al escribir el primer artefacto.
5. El número de prefijo en `sdd/` es obligatorio — `1.PROPOSAL.md` no es `PROPOSAL.md`.

---

## Referencia de Formato de Diagramas

Ver: [`excalidraw-guide.md`](excalidraw-guide.md)

Contiene:
- Schema JSON completo de excalidraw
- Propiedades mínimas por tipo de elemento
- Plantillas listas para flujo, ERD y arquitectura en capas
- Paleta de colores Alesco (naranja modelos, azul vistas, verde partners, púrpura tipos)
