# Template: Mermaid Guide

## Purpose
Quick reference for Mermaid diagrams — embedded in design/architecture templates.

## Variables
None

## Prompt
When generating Mermaid diagrams, you must adhere to the following enterprise standards:

1. **Diagram first, explanation below**: Always output the diagram before explaining it.
2. **The Iris dark palette**:
   - Background: `#0d1117` (dark)
   - Cyan accent: `#22d3ee`
   - Purple accent: `#a855f7`
   - Text: `#e6edf3`

3. **Design decision — why dark + themeVariables**:
   - Built-in themes (`dark`, `default`) use generic mermaid colors — no brand identity.
   - `theme: 'base'` + `themeVariables` gives full control over brand colors.
   - Dark palette is the standard: developer tools audience uses dark mode predominantly.
   - Light mode users are a minority — acceptable tradeoff for consistent brand identity.

4. **Initialization Block**: Prepend your diagrams with this EXACT `%%{init: ...}%%` block — copy it verbatim, do NOT modify colors:
```
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#161b22', 'primaryTextColor': '#e6edf3', 'primaryBorderColor': '#22d3ee', 'lineColor': '#a855f7', 'secondaryColor': '#1e1e2e', 'tertiaryColor': '#0d2a2a', 'background': '#0d1117', 'clusterBkg': '#0a1628', 'clusterBorder': '#22d3ee'}}}%%
```

4. **When to use each diagram type**:
   - `flowchart`: System architectures, data flow diagrams, decision trees, and processes.
   - `sequenceDiagram`: API call sequences, component interactions, and authentication flows.
   - `classDiagram`: Object models, TypeScript interfaces.
   - `erDiagram`: Database schemas.
   - `stateDiagram-v2`: State machines, object lifecycles.
   - `gantt`: Project timelines.
   - `mindmap`: Brainstorming and tree-based data.

<!-- IRIS_COMPLETE -->
