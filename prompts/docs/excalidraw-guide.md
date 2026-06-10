# Guía Técnica para Generación de Archivos Excalidraw (.excalidraw)

Este documento sirve como guía para la generación programática de diagramas en formato JSON nativo de Excalidraw (`.excalidraw`).

## Estructura General del JSON (Schema)

Un archivo `.excalidraw` válido consta de la siguiente estructura raíz:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

### Propiedades Comunes de los Elementos en `elements`

Cada objeto dentro del array `elements` debe incluir como mínimo las siguientes propiedades:

- `id` (string): Identificador único global (e.g., `"rect-123"` o un UUID v4).
- `type` (string): Tipo de elemento (`"rectangle"`, `"text"`, `"arrow"`, `"ellipse"`, `"line"`, `"diamond"`).
- `x` (number): Coordenada X del punto de origen (esquina superior izquierda).
- `y` (number): Coordenada Y del punto de origen (esquina superior izquierda).
- `width` (number): Ancho en píxeles.
- `height` (number): Alto en píxeles.
- `strokeColor` (string): Color del trazo (código hexadecimal o `"transparent"`).
- `backgroundColor` (string): Color de fondo (código hexadecimal o `"transparent"`).
- `fillStyle` (string): Estilo de relleno (`"solid"`, `"hachure"`, `"cross-hatch"`).
- `strokeWidth` (number): Grosor del borde (habitualmente `1` o `2`).
- `strokeStyle` (string): Estilo de línea (`"solid"`, `"dashed"`, `"dotted"`).
- `roughness` (number): Estilo mano alzada (`0` para líneas perfectas, `1` para estilo bosquejo normal, `2` para bosquejo rudo).
- `opacity` (number): Opacidad de `0` a `100` (habitualmente `100`).
- `seed` (number): Número aleatorio entero largo usado para los trazos mano alzada.

---

## Convención de Colores Alesco

Para asegurar la coherencia visual en todos los diagramas de arquitectura y especificación, se debe aplicar la siguiente paleta de colores:

| Categoría | Color Trazo/Fondo | Hexadecimal | Uso Recomendado |
| :--- | :--- | :--- | :--- |
| **Modelos** | Naranja | `#e67700` | Entidades del ORM, modelos de negocio, tablas de base de datos. |
| **Vistas** | Azul | `#1971c2` | Elementos de interfaz de usuario, vistas XML, componentes OWL, clientes. |
| **Partners** | Verde | `#2f9e44` | Integraciones externas, terceras partes, clientes externos, partners. |
| **Tipos / Catálogos** | Púrpura | `#862e9c` | Enumerados, constantes, tablas de configuración, tipos de datos. |

---

## Tipos de Elementos Específicos

### 1. Elemento de Texto (`"text"`)
Requiere propiedades adicionales:
- `text` (string): El texto a mostrar (admite saltos de línea con `\n`).
- `fontSize` (number): Tamaño de la fuente (e.g., `16`, `20`).
- `fontFamily` (number): Familia tipográfica (`1` para Virgil/mano alzada, `2` para Helvetica/Sans-Serif, `3` para Cascadia/Monospace).
- `textAlign` (string): Alineación horizontal (`"left"`, `"center"`, `"right"`).
- `verticalAlign` (string): Alineación vertical (`"top"`, `"middle"`).

### 2. Elemento de Flecha (`"arrow"`)
Requiere propiedades adicionales:
- `points` (array of arrays): Puntos que componen el trayecto de la flecha. **IMPORTANTE:** El primer punto siempre debe ser `[0, 0]`, representando la coordenada inicial `(x, y)`. Todos los puntos subsiguientes representan desplazamientos (offsets) relativos a `(x, y)`.
  - *Ejemplo de flecha horizontal hacia la derecha de longitud 100:* `x: 100, y: 150`, `points: [[0, 0], [100, 0]]`.
- `endArrowhead` (string / null): Tipo de cabeza de flecha al final (habitualmente `"arrow"`, `"triangle"`, `"dot"`, `"bar"` o `null`).
- `startArrowhead` (string / null): Tipo de cabeza de flecha al inicio (habitualmente `null` o `"arrow"`).

---

## Plantillas de Diagramas (Ejemplos JSON Completos)

### A. Diagrama de Flujo (Mínimo 3 Nodos + 2 Flechas)

Este diagrama modela un flujo de proceso secuencial: `Inicio` -> `Procesar` -> `Fin`.

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "node-start",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 120,
      "height": 50,
      "strokeColor": "#1971c2",
      "backgroundColor": "#e7f5ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 123456
    },
    {
      "id": "text-start",
      "type": "text",
      "x": 110,
      "y": 115,
      "width": 100,
      "height": 20,
      "strokeColor": "#1c7ed6",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 234567,
      "text": "Inicio",
      "fontSize": 16,
      "fontFamily": 2,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
    {
      "id": "arrow-1",
      "type": "arrow",
      "x": 220,
      "y": 125,
      "width": 80,
      "height": 0,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 345678,
      "points": [[0, 0], [80, 0]],
      "endArrowhead": "arrow"
    },
    {
      "id": "node-process",
      "type": "rectangle",
      "x": 300,
      "y": 100,
      "width": 120,
      "height": 50,
      "strokeColor": "#862e9c",
      "backgroundColor": "#f3e8ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 456789
    },
    {
      "id": "text-process",
      "type": "text",
      "x": 310,
      "y": 115,
      "width": 100,
      "height": 20,
      "strokeColor": "#9c27b0",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 567890,
      "text": "Procesar",
      "fontSize": 16,
      "fontFamily": 2,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
    {
      "id": "arrow-2",
      "type": "arrow",
      "x": 420,
      "y": 125,
      "width": 80,
      "height": 0,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 678901,
      "points": [[0, 0], [80, 0]],
      "endArrowhead": "arrow"
    },
    {
      "id": "node-end",
      "type": "rectangle",
      "x": 500,
      "y": 100,
      "width": 120,
      "height": 50,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#e6fcf5",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 789012
    },
    {
      "id": "text-end",
      "type": "text",
      "x": 510,
      "y": 115,
      "width": 100,
      "height": 20,
      "strokeColor": "#2f9e44",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 890123,
      "text": "Fin",
      "fontSize": 16,
      "fontFamily": 2,
      "textAlign": "center",
      "verticalAlign": "middle"
    }
  ],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

### B. Diagrama de Relación de Entidades ERD (2 Entidades + Relación M:N con Etiqueta)

Modelado de la relación muchos a muchos entre `sale.order` (naranja) y `res.partner` (verde) mediante un rombo (`diamond`) intermedio.

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "ent-order",
      "type": "rectangle",
      "x": 100,
      "y": 300,
      "width": 160,
      "height": 100,
      "strokeColor": "#e67700",
      "backgroundColor": "#fff4e6",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 101010
    },
    {
      "id": "text-ent-order-title",
      "type": "text",
      "x": 110,
      "y": 310,
      "width": 140,
      "height": 20,
      "strokeColor": "#e67700",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 101011,
      "text": "sale.order",
      "fontSize": 14,
      "fontFamily": 3,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
    {
      "id": "text-ent-order-fields",
      "type": "text",
      "x": 110,
      "y": 335,
      "width": 140,
      "height": 50,
      "strokeColor": "#495057",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 101012,
      "text": "- name: char\n- partner_id: m2o\n- line_ids: o2m",
      "fontSize": 12,
      "fontFamily": 3,
      "textAlign": "left",
      "verticalAlign": "top"
    },
    {
      "id": "rel-diamond",
      "type": "diamond",
      "x": 340,
      "y": 315,
      "width": 80,
      "height": 70,
      "strokeColor": "#862e9c",
      "backgroundColor": "#f3e8ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 202020
    },
    {
      "id": "text-rel-label",
      "type": "text",
      "x": 355,
      "y": 340,
      "width": 50,
      "height": 20,
      "strokeColor": "#862e9c",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 202021,
      "text": "relación\nM:N",
      "fontSize": 11,
      "fontFamily": 2,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
    {
      "id": "arrow-rel-ent1",
      "type": "arrow",
      "x": 340,
      "y": 350,
      "width": 80,
      "height": 0,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 303030,
      "points": [[0, 0], [-80, 0]],
      "endArrowhead": "arrow"
    },
    {
      "id": "arrow-rel-ent2",
      "type": "arrow",
      "x": 420,
      "y": 350,
      "width": 80,
      "height": 0,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 404040,
      "points": [[0, 0], [80, 0]],
      "endArrowhead": "arrow"
    },
    {
      "id": "ent-partner",
      "type": "rectangle",
      "x": 500,
      "y": 300,
      "width": 160,
      "height": 100,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#ebfbee",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 505050
    },
    {
      "id": "text-ent-partner-title",
      "type": "text",
      "x": 510,
      "y": 310,
      "width": 140,
      "height": 20,
      "strokeColor": "#2f9e44",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 505051,
      "text": "res.partner",
      "fontSize": 14,
      "fontFamily": 3,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
    {
      "id": "text-ent-partner-fields",
      "type": "text",
      "x": 510,
      "y": 335,
      "width": 140,
      "height": 50,
      "strokeColor": "#495057",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 505052,
      "text": "- name: char\n- email: char\n- is_company: bool",
      "fontSize": 12,
      "fontFamily": 3,
      "textAlign": "left",
      "verticalAlign": "top"
    }
  ],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

### C. Diagrama de Arquitectura en Capas (3 Capas Horizontales)

Modelado de la separación de responsabilidades: UI / Lógica de Negocio / Persistencia.

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "layer-ui",
      "type": "rectangle",
      "x": 100,
      "y": 500,
      "width": 500,
      "height": 70,
      "strokeColor": "#1971c2",
      "backgroundColor": "#e7f5ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 606060
    },
    {
      "id": "text-layer-ui",
      "type": "text",
      "x": 120,
      "y": 525,
      "width": 460,
      "height": 20,
      "strokeColor": "#1971c2",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 606061,
      "text": "Presentación / UI (Vistas XML / QWeb / Componentes OWL)",
      "fontSize": 14,
      "fontFamily": 2,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
    {
      "id": "arrow-ui-logic",
      "type": "arrow",
      "x": 350,
      "y": 570,
      "width": 0,
      "height": 30,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 707070,
      "points": [[0, 0], [0, 30]],
      "endArrowhead": "arrow"
    },
    {
      "id": "layer-logic",
      "type": "rectangle",
      "x": 100,
      "y": 600,
      "width": 500,
      "height": 70,
      "strokeColor": "#862e9c",
      "backgroundColor": "#f3e8ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 808080
    },
    {
      "id": "text-layer-logic",
      "type": "text",
      "x": 120,
      "y": 625,
      "width": 460,
      "height": 20,
      "strokeColor": "#862e9c",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 808081,
      "text": "Lógica de Negocio (Modelos Python / Odoo ORM / Servicios API)",
      "fontSize": 14,
      "fontFamily": 2,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
    {
      "id": "arrow-logic-data",
      "type": "arrow",
      "x": 350,
      "y": 670,
      "width": 0,
      "height": 30,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 909090,
      "points": [[0, 0], [0, 30]],
      "endArrowhead": "arrow"
    },
    {
      "id": "layer-data",
      "type": "rectangle",
      "x": 100,
      "y": 700,
      "width": 500,
      "height": 70,
      "strokeColor": "#e67700",
      "backgroundColor": "#fff4e6",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 919191
    },
    {
      "id": "text-layer-data",
      "type": "text",
      "x": 120,
      "y": 725,
      "width": 460,
      "height": 20,
      "strokeColor": "#e67700",
      "backgroundColor": "transparent",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "seed": 919192,
      "text": "Persistencia de Datos (Base de Datos PostgreSQL)",
      "fontSize": 14,
      "fontFamily": 2,
      "textAlign": "center",
      "verticalAlign": "middle"
    }
  ],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```
