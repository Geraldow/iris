# Phase: {phase}
<!-- Executed by: agy terminal executor -->
<!-- Purpose: Break down a change into an implementation task checklist -->

## Template Variables Provided
- `{phase}`: Current SDD phase
- `{change}`: Name of the change
- `{instruction}`: Specific instructions for this execution
- `{deliverable}`: Expected output format
- `{contextIds}`: Pre-fetched Engram observations
- `{outputPath}`: File path to write the final result

## Language Instruction
Analyze the language used in `{instruction}` and ensure all your generated text, responses, and artifacts are written in that same language.

## Context
The following Engram observations provide context for this execution:
{contextIds}

## Autonomous Execution Steps
1. **Initialize & Parse**: Read `{instruction}` and `{deliverable}`. Understand the specific goal for the `{phase}` phase.
2. **Context Analysis**: Read the provided `{contextIds}`. Grasp previous decisions, state, and dependencies for `{change}`.
3. **Codebase Mapping**: Use file reading and search tools to investigate the current codebase state. Verify paths, architecture, and existing patterns related to this phase.
4. **Execute Phase Objective**: 
   - Create a granular, actionable checklist of tasks.
   - Order the tasks logically, respecting dependencies and technical progression.
5. **Validation**: Check your task breakdown against `{instruction}` and the design. Ensure it meets the standard for `{phase}`.
6. **Save to Engram**: Save your finalized task list to Engram. You MUST use exactly this topic key: `sdd/{change}/{phase}`. Include standard type and project fields.
7. **Write Result**: Write your final result contract to `{outputPath}`.

## Result Contract
Your final output written to `{outputPath}` MUST include these sections:
- `status`: String (success/failed/partial)
- `executive_summary`: Brief summary of accomplishments
- `artifacts`: List of artifacts produced or modified
- `next_recommended`: Recommended next phase or action
- `risks`: Any identified risks or unresolved issues

## Watcher Sentinel
Ensure you follow the system's sentinel pattern. Do NOT remove the existing <!-- IRIS_COMPLETE --> marker pattern if it exists in the execution flow.
