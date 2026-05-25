# Template: Mermaid Guide

## Purpose
Quick reference for Mermaid diagrams — embedded in design/architecture templates.

## Variables
None

## Prompt
When generating Mermaid diagrams, you must adhere to the following enterprise standards:

1. **Diagram first, explanation below**: Always output the diagram before explaining it.
2. **The enterprise palette**: 
   - Navy: `#1E3A5F`
   - Gray: `#6B7280`
   - Teal: `#0D9488`

3. **Initialization Block**: Prepend your diagrams with this exact `%%{init: ...}%%` block (copy-paste ready):
```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#F9FAFB',
    'primaryColor': '#1E3A5F',
    'primaryTextColor': '#FFFFFF',
    'primaryBorderColor': '#1E3A5F',
    'secondaryColor': '#6B7280',
    'secondaryTextColor': '#FFFFFF',
    'secondaryBorderColor': '#475569',
    'tertiaryColor': '#0D9488',
    'tertiaryTextColor': '#FFFFFF',
    'tertiaryBorderColor': '#0D9488',
    'noteBkgColor': '#F3F4F6',
    'noteTextColor': '#111827',
    'noteBorderColor': '#D1D5DB',
    'lineColor': '#9CA3AF',
    'textColor': '#111827',
    'mainBkg': '#1E3A5F',
    'nodeBorder': '#1E3A5F',
    'clusterBkg': '#F3F4F6',
    'clusterBorder': '#D1D5DB',
    'fontFamily': 'Inter, Roboto, sans-serif'
  }
}}%%
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
