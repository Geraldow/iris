# Template: Meta

## Purpose
The foundational seed. Used to generate any missing template dynamically.

## Variables
- {phase}: The current phase to generate a template for.
- {change}: The change request details.
- {instruction}: Specific instructions.
- {contextIds}: Relevant context IDs.
- {deliverable}: The expected deliverable.

## Prompt
You are tasked with generating a new prompt template for Iris.

### What is a prompt template in Iris?
A prompt template in Iris is used to seed prompts for each AI delegation. When Iris delegates a phase task, it reads the template, substitutes variables, and sends it to the AI.

### The universal format all templates must follow
1. Start with a `# Template: {Phase Name}` heading
2. Have a `## Purpose` section (what this template is for)
3. Have a `## Variables` section (list of {variable} placeholders)
4. Have a `## Prompt` section with the actual prompt text the AI receives
5. The prompt text uses {variable} placeholders that Iris substitutes at runtime.
6. Reference the `mermaid-guide.md` for any diagram instructions.
7. End with `<!-- IRIS_COMPLETE -->`

Variables available to use in templates: {phase}, {change}, {instruction}, {contextIds}, {deliverable}

### How to derive a new template from context
Understand the goals of the new phase, define the output format it should produce, and write clear, imperative instructions ("Write", "Create", "List", "Analyze"). Specify exactly what sections the output MUST have. Ensure it is self-contained so an AI with no prior context can produce excellent output.

Create the template for: {phase}
Change context: {change}
Instruction: {instruction}
Deliverable: {deliverable}

<!-- IRIS_COMPLETE -->
