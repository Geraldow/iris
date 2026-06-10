# Template: Mermaid Guide

## Purpose
Quick reference for Mermaid diagrams — embedded in design/architecture templates.

## Variables
None

## Prompt
When generating Mermaid diagrams, you must adhere to the following enterprise standards:

1. **Diagram first, explanation below**: Always output the diagram before explaining it.
2. **The Iris dark palette**:
   - Background: `#0d1117` (dark) via `theme: 'dark'`
   - Primary color: `#1f6feb` (blue)
   - Text: `#ffffff` (pure white)
   - Cyan accent: `#22d3ee`
   - Lines: `#8b949e` (gray)

3. **Design decision — why `theme: 'dark'`**:
   - `theme: 'dark'` is a built-in, well-tested Mermaid theme with guaranteed contrast across ALL diagram types (flowchart, sequence, class, ER, state, gantt).
   - Using `theme: 'base'` requires manually setting 12+ variables including sequence diagram actors, which are easy to get wrong.
   - `theme: 'dark'` + minimal `themeVariables` overrides gives brand identity + professional readability.
   - Dark palette is the standard: developer tools audience uses dark mode predominantly.

4. **Initialization Block**: Prepend your diagrams with this EXACT `%%{init: ...}%%` block — copy it verbatim, do NOT modify colors:
```
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1f6feb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#22d3ee', 'lineColor': '#8b949e'}}}%%
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
