# Iris — Architecture Reference

## 1. Overview
Iris is a Model Context Protocol (MCP) server built in TypeScript/Node.js that acts as a central orchestration bus between AI CLI tools. It eliminates manual context pasting between AI sessions, intelligently routes tasks to the right AI based on phase and complexity, and ensures all results persist in Engram so no AI ever starts from scratch.

## 2. High-Level Architecture
```mermaid
flowchart TD
    CC[Claude Code] -->|MCP client| Iris[Iris MCP Server]
    Iris --> Router[Router]
    Router --> Adapter[Adapter]
    Adapter --> Executor[Executor]
    Executor --> Result[Result]
    Result --> Engram[Engram MCP]
    Result --> SQLite[(SQLite)]
```

## 3. Main Delegation Flow (iris_delegate)
```mermaid
sequenceDiagram
    participant C as Claude Code
    participant I as Iris
    participant R as Classifier
    participant S as Selector
    participant CB as CircuitBreaker
    participant A as Adapter
    participant CLI as CLI Tool
    participant E as Engram
    participant DB as SQLite

    C->>I: iris_delegate(phase, instruction, ...)
    I->>R: scoreComplexity()
    I->>S: selectAdapter(phase, complexity)
    I->>CB: isAvailable(adapter)
    
    alt HIGH complexity and confirm_threshold=high
        I-->>C: pending_confirmation + confirm_token + plan
        C->>I: iris_delegate(confirm=token)
    end
    
    I->>A: execute(prompt, model, effort)
    A->>CLI: (agy / claude / codex / gh copilot)
    CLI-->>A: output
    A-->>I: result
    I->>E: saveResult()
    I->>DB: updateTask()
    I-->>C: DelegateResult
```

## 4. Router — Complexity Scoring
```mermaid
flowchart TD
    Input[Input: DelegateRequest] --> S1
    Input --> S2
    Input --> S3
    Input --> S4
    
    S1[Signal 1: Scope<br/>instruction word count] -->|0-30pts| Total
    S2[Signal 2: Context Size<br/>contextIds.length] -->|0-30pts| Total
    S3[Signal 3: Architectural Impact<br/>phase + keywords] -->|0-20pts| Total
    S4[Signal 4: Dependency Resolution<br/>dep keywords] -->|0-20pts| Total
    
    Total[Total Score] -->|0-35| LOW
    Total -->|36-70| MEDIUM
    Total -->|71-100| HIGH
```

## 5. Phase → Adapter Routing Table
| Phase | Adapter (Primary) | Fallback Adapter |
|-------|-------------------|------------------|
| sdd-init | antigravity | claude |
| sdd-explore | antigravity | claude |
| sdd-propose | antigravity | claude |
| sdd-spec | claude | antigravity |
| sdd-design | claude | antigravity |
| sdd-tasks | claude | copilot |
| sdd-apply | codex | copilot |
| sdd-verify | antigravity | claude |
| sdd-archive | antigravity | copilot |

## 6. Adapter Model Selection Matrix
| Complexity | claude | antigravity | copilot | codex |
|---|---|---|---|---|
| LOW | sonnet / low | Gemini 3.5 Flash (Medium) | gpt-4.1-mini / low | o4-mini / low |
| MEDIUM | sonnet / high | Gemini 3.5 Flash (High) | gpt-4o / medium | o4-mini / high |
| HIGH | opus / xhigh | Gemini 3.1 Pro (High) | gpt-5.2 / high | o3 / high |

## 7. Two-Phase Commit Flow (HIGH complexity)
```mermaid
sequenceDiagram
    participant U as User
    participant I as iris_delegate
    participant A as Adapter
    
    U->>I: (phase, instruction)
    Note over I: Score = HIGH
    I->>I: generate plan
    I-->>U: Return pending_confirmation + confirm_token (10min TTL)
    Note over U: User reviews plan
    U->>I: (confirm=token)
    I->>A: Execute adapter
    A-->>I: Return result
    I-->>U: Return result
```

## 8. Circuit Breaker States
```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Open : 3 consecutive failures
    Open --> HalfOpen : 5min timeout elapsed
    HalfOpen --> Closed : next request succeeds
    HalfOpen --> Open : next request fails
```

## 9. Engram Integration Flow
```mermaid
flowchart TD
    Exec[Adapter executes] --> Res[Result available]
    Res --> Sync[engram/sync.ts: saveResult]
    Sync --> MemSave[mem_save to topic:<br/>iris/project/change/phase/adapter]
    MemSave --> ReturnId[Return engramId]
    ReturnId --> Store[Store engramId in SQLite tasks.engram_id]
```

## 10. Template System — Fallback Resolver
```mermaid
flowchart TD
    Start[iris_delegate called with phase] --> CheckMem[Check Engram for template: iris/prompts/phase]
    CheckMem --> Found1{Found?}
    Found1 -->|Yes| Use1[use it]
    Found1 -->|No| CheckRepo[Check iris/prompts/phase.md in repo]
    CheckRepo --> Found2{Found?}
    Found2 -->|Yes| Use2[use it + sync to Engram]
    Found2 -->|No| CallAgy[Call Antigravity with meta.md seed to generate template]
    CallAgy --> Save[Save generated template to Engram + repo]
```

## 11. SQLite Schema Overview
```mermaid
erDiagram
    sessions ||--o{ tasks : contains
    adapter_budget ||--o{ tasks : tracks
    adapter_config ||--o| circuit_breaker : has
    
    sessions {
        string id PK
        string project
    }
    tasks {
        string id PK
        string session_id FK
        string adapter
        number engram_id
        string status
    }
    adapter_budget {
        string adapter PK
        number daily_usd
        number consecutive_fails
    }
    circuit_breaker {
        string adapter PK
        boolean available
        datetime unavailable_until
    }
    adapter_config {
        string adapter PK
        boolean enabled
        number priority
    }
```

## 12. File Structure
```text
src/
  index.ts          — MCP server entry, stdio transport
  server.ts         — registerTools(), connects all handlers
  types/index.ts    — Shared TypeScript interfaces
  tools/
    delegate.ts     — iris_delegate handler (routing + confirm flow)
    status.ts       — iris_status handler
    history.ts      — iris_history handler
    task.ts         — iris_task handler
    config.ts       — iris_config handler
  router/
    classifier.ts   — scoreComplexity() 4 signals engine
    selector.ts     — selectAdapter() logic
    circuit-breaker.ts — failure tracking and fallback chain
  adapters/
    base.ts         — IAdapter interface
    claude.ts       — Claude CLI implementation
    antigravity.ts  — Antigravity CLI implementation
    copilot.ts      — GitHub Copilot CLI implementation
    codex.ts        — Codex Exec implementation
  executor/
    terminal.ts     — Windows Terminal launcher
    subprocess.ts   — execa direct execution
    watcher.ts      — fs.watch() on output file
  store/
    db.ts           — better-sqlite3 connection
    tasks.ts        — Task CRUD operations
    budgets.ts      — Budget tracking operations
  engram/
    client.ts       — Engram MCP client wrapper
    sync.ts         — saveResult and getObservation
```

## 13. Config Reference (~/.iris/config.json)
```json
{
  // Execution mode for adapter tasks: "terminal" (opens wt) or "subprocess" (hidden)
  "execution_mode": "terminal",
  // Complexity threshold that triggers manual confirmation: "low", "medium", or "high"
  "confirm_threshold": "high",
  "adapters": {
    "claude": { 
      "enabled": true, 
      "priority": 3, 
      // Daily spend limit in USD. Once exceeded, adapter becomes unavailable.
      "daily_budget_usd": 5.0 
    },
    "antigravity": { 
      "enabled": true, 
      "priority": 1, 
      "daily_budget_usd": 0.0 
    },
    "copilot": { 
      "enabled": true, 
      "priority": 2, 
      "daily_budget_usd": 0.0 
    },
    "codex": { 
      "enabled": true, 
      "priority": 2, 
      "daily_budget_usd": 2.0 
    }
  }
}
```

## 14. Execution Modes
- **Terminal Mode**: Uses Windows Terminal (`wt`) to launch the CLI tool in a visible window. The user can watch the AI stream its response live. This is the default mode and is best for transparency and interrupting runaway processes.
- **Subprocess Mode**: Uses `execa` to run the CLI tool in the background. Output is captured silently. Best for automation, CI environments, or low-complexity tasks where seeing the stream isn't necessary.

---

IRIS_COMPLETE
