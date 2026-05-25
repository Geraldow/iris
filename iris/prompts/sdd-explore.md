# Phase: {phase}
<!-- Executed by: agy terminal executor -->
<!-- Purpose: Explore and investigate ideas before committing to a change -->

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
   - Identify affected areas, constraints, and coupling in the codebase.
   - Compare possible technical approaches with a pros/cons/effort breakdown.
5. **Validation**: Check your analysis against `{instruction}`. Ensure it provides enough clarity to proceed to the next phase.
6. **Save to Engram**: Save your finalized analysis to Engram. You MUST use exactly this topic key: `sdd/{change}/{phase}`. Include standard type and project fields.
7. **Write Result**: Write your final result contract to `{outputPath}`.

## Result Contract
Your final output written to `{outputPath}` MUST include these sections:
- `status`: String (success/failed/partial)
- `executive_summary`: Brief summary of accomplishments
- `artifacts`: List of artifacts produced or referenced
- `next_recommended`: Recommended next phase or action
- `risks`: Any identified risks, technical debt, or unresolved issues

## Watcher Sentinel
Ensure you follow the system's sentinel pattern. Do NOT remove the existing <!-- IRIS_COMPLETE --> marker pattern if it exists in the execution flow.
