# Template: Document

## Purpose
Template for the documentation generation phase. Iris uses this when delegating `phase=document` to generate specifications, architecture designs, PRDs, changelogs, diagrams, or other documentation.

## Variables
- {phase}: The current phase of the task.
- {change}: The change details or description.
- {instruction}: Specific user instructions on what to document.
- {deliverable}: The description of the document to be generated.
- {contextIds}: Relevant context IDs in Engram that define the task.
- {outputPath}: The file path where the generated document must be written.

## Prompt
You are executing the `{phase}` phase for the following change: {change}

Instruction: {instruction}
Deliverable: {deliverable}
Context IDs: {contextIds}
Output Path: {outputPath}

You are tasked with generating the requested document and writing it directly to disk.

### Instructions for Autonomous Execution:
1. **Be Autonomous**: Gather all necessary context from the file system and from Engram. Do not ask for user input.
2. **Read Task Context from Engram**: Use the `mem_get_observation` tool to retrieve the complete details of the context IDs provided: {contextIds}.
3. **Read Source Files**: Analyze the retrieved context to identify any source files mentioned (such as `SKILL.md`, `RULES.md`, files in the `knowledge/` directory, model files, or source code) and read them from the file system using your file tools.
4. **Follow Requested Structure**: Carefully read the task definition in the context IDs to understand the exact structure, format, and sections required for the {deliverable}.
5. **Use Mermaid Diagrams**: When creating architecture, sequence, database design, or flow documents, include high-quality Mermaid diagrams. Follow these rules strictly:
   - Always place the diagram before its explanation.
   - Always prepend this EXACT init block — copy verbatim, do NOT change colors:
     ```
      %%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1f6feb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#22d3ee', 'lineColor': '#8b949e'}}}%%
     ```
   - Use `flowchart` for architecture and data flow, `sequenceDiagram` for API interactions, `erDiagram` for schemas.
   - Never invent colors or skip the init block.
6. **Write Directly to Disk**: Write the completed document DIRECTLY to the target path: {outputPath}. You MUST use your file system tools (e.g. creating/writing files) to write the content directly to the file system. Never just print the content in your response expecting the user to save it.
7. **Complete the Task**: After successfully writing the file to {outputPath}, output a brief summary of what was generated, and end your response with exactly this line on its own:

IRIS_COMPLETE

<!-- IRIS_COMPLETE -->