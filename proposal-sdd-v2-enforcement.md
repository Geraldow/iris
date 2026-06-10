# Proposal: sdd-v2-enforcement

## Intent

SDD phases currently run without ordering guarantees. Any phase (`explore`, `propose`, `spec`, `design`, `tasks`, `apply`, `verify`) can be called at any time and in any sequence. Missing phases (`archive`) and missing prompt templates (`report`, `archive`) create gaps in the pipeline. CodeGraph MCP transport is broken (`codegraph mcp` instead of `codegraph serve`), and the orchestrator's `sdd-ff` command is not implemented. The result is fragile orchestration that cannot enforce a DAG, cannot produce reliable closure, and silently skips critical validation.

This proposal delivers a proper SDD harness with phase ordering enforcement, CodeGraph fixes, missing templates, and the `sdd-ff` fast-forward pipeline.

## Scope

### In Scope

1. **SDD Harness Core** — New `src/sdd/harness.ts` with:
   - Phase DAG definition (explore→propose→spec→design→tasks→apply→verify→archive)
   - In-memory state machine tracking completed phases per change
   - `transition(current: Phase, target: Phase)` with validation against the DAG
   - `strict_mode: boolean` flag; when true, also validates against Engram observations
   - `allowList` / `denyList` for skipping phases in CI contexts
   - Public API: `getStatus(change)`, `transition(change, phase)`, `canTransition(change, from, to)`

2. **`archive` phase** — Add to the `Phase` union type in `src/types/index.ts`, add to `PHASE_ADAPTER`/`PHASE_FALLBACK` maps in `src/router/selector.ts`, create `prompts/sdd-archive.md` template

3. **`report` phase template** — Create `prompts/sdd-report.md` (exists in the type but has no file on disk)

4. **`archive` phase template** — Create `prompts/sdd-archive.md`

5. **CodeGraph MCP fix** — Change `src/codegraph/client.ts:31` from `args: ['mcp']` to `args: ['serve']` so the transport connects correctly

6. **Phase validation in `delegate.ts`** — Integrate the harness `checkGate()` call at the top of `handleDelegate()` (line 149) that validates the requested phase is reachable given the current state for the given change

7. **`sdd-ff` pipeline** — Implement a helper that auto-executes all phases in DAG order with validation gates between each transition

8. **Architecture doc fixes** — Convert ASCII art diagrams in `docs/iris-v2-architecture.md` to Mermaid:
   - §3 Decision tree (ASCII → flowchart)
   - §5 executeTask() (ASCII → activity diagram)
   - §2 Simplify crossing arrows in SDD→Tool map
   - §10 Priority algorithm (ASCII → flowchart)

9. **Templates v2 rewrite** — Rewrite all `prompts/sdd-{phase}.md` files with OpenAI best practices:
   - Identity section first
   - Instructions with XML tags for structure
   - Few-shot examples per phase
   - Role separation (developer vs user content)
   - Optimized for prompt caching

### Out of Scope

- PRD.md rewrite (only architecture docs updated)
- Adding new CLI adapters (`/sdd` subcommands)
- Changing the adapter selection algorithm or routing logic
- Database or filesystem persistence (stays in-memory + Engram)
- Rewriting `delegate.ts` entirely (only adding validation gate hooks)
- Creating an `archive` CLI handler (the orchestrator already handles this)
- Backfilling Engram state for existing in-flight changes

## Approach

**Hybrid in-memory + configurable strictness:**

1. **In-memory DAG** — A `Map<string, Set<Phase>>` (per change → completed phases) provides zero-latency gate checks. No I/O for the common path.
2. **Engram fallback for strict mode** — When `strict_mode: true`, `transition()` also reads from Engram (`mem_search`) to recover state across restarts, and writes the completed phase to Engram (`mem_save` with `topic_key: "sdd/{change}/state"`).
3. **Default: permissive** — `strict_mode` defaults to `false`, meaning the in-memory gate runs but missing prior phases only log warnings. No hard block by default — teams migrating to the harness won't break.
4. **CodeGraph transport fix** — Single-line change from `'mcp'` to `'serve'`, matching the current CLI API.
5. **Template rewrite** — Each template gets a consistent structure: identity, XML-tagged instructions, few-shot, role separation, caching hints.
6. **Architecture doc diagrams** — Replace ASCII decision trees and activity charts with semantically equivalent Mermaid `flowchart` and `stateDiagram-v2` blocks.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/types/index.ts:1-11` | Modified | Add `'archive'` to `Phase` union, add `SddState` interface |
| `src/codegraph/client.ts:31` | Modified | Change `'mcp'` → `'serve'` |
| `src/tools/delegate.ts:149` | Modified | Insert harness gate check at top of `handleDelegate()` |
| `src/router/selector.ts:5-15` | Modified | Add `archive` to `PHASE_ADAPTER` and `PHASE_FALLBACK` maps |
| `src/sdd/harness.ts` | **New** | Phase DAG, state machine, gate validation, `sdd-ff` pipeline |
| `prompts/sdd-report.md` | **New** | Report phase prompt template |
| `prompts/sdd-archive.md` | **New** | Archive phase prompt template |
| `prompts/sdd-{phase}.md` | Modified | Rewrite all existing templates with v2 structure |
| `docs/iris-v2-architecture.md` | Modified | Replace ASCII diagrams with Mermaid |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Teams relying on unordered phases break at runtime | Medium | `strict_mode: false` by default — only warnings, no hard blocks |
| Engram unavailability blocks strict-mode transitions | Low | Skip Engram validation with a warning; proceed with in-memory state only |
| In-memory state is lost on process restart | High | Engram persistence in strict mode; graceful degradation in permissive mode |
| New template structure changes sub-agent behavior | Medium | Keep existing `{phase}`, `{change}`, `{instruction}` variable placeholders — only restructure the static prose |
| Mermaid diagram changes shift layout vs ASCII original | Low | Mermaid auto-layout is close enough; docs already use Mermaid in other sections |

## Rollback Plan

1. Revert `src/sdd/harness.ts` creation
2. Revert `src/types/index.ts` — remove `'archive'` from Phase
3. Revert `src/router/selector.ts` — remove archive entries
4. Revert `src/tools/delegate.ts` — remove harness gate import and call
5. Revert `src/codegraph/client.ts` — change `'serve'` back to `'mcp'`
6. Delete new template files (`prompts/sdd-report.md`, `prompts/sdd-archive.md`)
7. Revert template rewrites from git history
8. Revert Mermaid changes in `docs/iris-v2-architecture.md`

## Dependencies

- TypeScript interfaces must be updated before harness implementation (no circular imports)
- Engram `mem_search`/`mem_save` functions must be available in `src/engram/sync.ts` (checked: they exist)
- The `Phase` type change must precede `selector.ts` changes (TS strict mode will catch mismatches)
- CodeGraph binary must support the `serve` subcommand (verified: `codegraph serve --help` succeeds)

## Success Criteria

- [ ] `Phase` type includes `'archive'` and all type references compile without error
- [ ] `handleDelegate()` rejects transitions that violate the DAG when `strict_mode: true`
- [ ] `handleDelegate()` logs warnings (but does not reject) for DAG violations when `strict_mode: false`
- [ ] `src/sdd/harness.ts` exposes `getStatus`, `transition`, and `canTransition` with correct DAG semantics
- [ ] `sdd-ff` executes all 8 phases in order without manual intervention
- [ ] CodeGraph MCP transport connects successfully with `codegraph serve`
- [ ] `prompts/sdd-report.md` and `prompts/sdd-archive.md` exist and follow the v2 template structure
- [ ] All 7 existing templates (`explore`, `propose`, `spec`, `design`, `tasks`, `apply`, `verify`) are rewritten with v2 structure
- [ ] `docs/iris-v2-architecture.md` has no remaining ASCII art diagrams — all use Mermaid
- [ ] `npm run typecheck` passes with zero errors
