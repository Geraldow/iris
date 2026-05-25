# Template: Architecture

## Purpose
Template for generating ARCHITECTURE.md for any project.

## Variables
- {project}: The project name.
- {instruction}: Specific instructions from the user.
- {contextIds}: Relevant context IDs.

## Prompt
You are generating the ARCHITECTURE.md for the following project: {project}

Instruction: {instruction}
Context: {contextIds}

Write the ARCHITECTURE.md document. Ensure you reference the `mermaid-guide.md` for diagram rules. Your output MUST include exactly the following sections:

1. **Overview**: A 1-paragraph high-level overview of the system.
2. **High-level architecture**: A `flowchart` Mermaid diagram showing the architecture. Remember: Diagram first, explanation below.
3. **Component descriptions**: Detail the roles of the main components.
4. **Data flow**: Explain how data moves through the system.
5. **Configuration reference**: Outline key configuration files and variables.
6. **File structure**: Detail the layout of the project's codebase.

<!-- IRIS_COMPLETE -->
