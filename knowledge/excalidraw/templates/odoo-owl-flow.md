# Template: Odoo OWL Component Flow

Use this template when generating flow diagrams for OWL 2 components in Odoo 18.
Always read `references/alesco-palette.md` for colors before generating JSON.

---

## Purpose

Show how OWL components communicate with the Odoo backend:
component tree, RPC calls, reactive state, and server-side responses.

The diagram must show WHAT goes over the wire — actual method names,
route paths, JSON shapes — not just labeled boxes.

---

## Layout Convention (Left-to-Right)

```
Browser (OWL)                    Odoo Server (Python)
─────────────────────────────────────────────────────
  ┌─────────────────┐               ┌────────────────┐
  │  ParentComponent│ ─── RPC ────> │  model.method  │
  │  ┌─────────────┐│  /web/dataset │  @api.model    │
  │  │ ChildWidget ││  /call_kw    │  return [...]   │
  │  └─────────────┘│ <─── JSON ── │                │
  └─────────────────┘               └────────────────┘
           │
     useState/useStore
           │
  ┌─────────────────┐
  │  Reactive Store  │
  └─────────────────┘
```

---

## Shape Semantics

| Element | Shape | Color |
|---------|-------|-------|
| OWL Component (root) | Rectangle, thick border | Primary fill (#5B87C5) |
| OWL Component (child) | Rectangle, thin border | Secondary fill (#7FA8D8) |
| Python model/method | Rectangle, solid | Odoo fill (#D4C0D6), stroke #875A7B |
| Reactive store / useState | Overlapping ellipses (cloud) | Tertiary fill (#A8C4E8) |
| Event / signal | Diamond | Decision fill (#FEF3C7) |
| HTTP endpoint (route) | Free-floating text, monospace | Body color (#4A5568) |
| RPC call arrow | Solid arrow → | Alesco orange (#E8732A) |
| Response arrow | Dashed arrow ← | Navy (#1E3A5F) |

---

## Evidence Artifacts to Include

For each RPC call shown:
- Exact route (`/web/dataset/call_kw` or custom `@http.route`)
- Python method signature: `def action_confirm(self):`
- Return shape: `{'type': 'ir.actions.act_window', ...}` or `[{id, name, ...}]`

For each OWL component shown:
- `setup()` hook if it fetches data
- Props interface if non-trivial
- Template key bindings (`t-on-click`, `t-if`, `t-foreach`)

---

## OWL 2 Pattern Reference (Odoo 18)

Use these exact patterns — do NOT use OWL 1 patterns.

| Concept | OWL 2 Pattern (correct) | OWL 1 (deprecated) |
|---------|------------------------|---------------------|
| State | `useState({})` | `this.state = {}` |
| Props | `static props = { ... }` | `this.props` directly |
| Lifecycle | `onMounted`, `onWillUnmount` | `mounted()`, `willUnmount()` |
| Services | `useService('rpc')` | `this.rpc` |
| Environment | `useEnv()` | `this.env` |
| Template | `static template = xml\`...\`` | `this.template` |

Show actual OWL 2 code in evidence artifacts — never OWL 1 syntax.

---

## Required Sections in Every OWL Flow Diagram

1. **Browser zone** (left): OWL component tree, reactive state
2. **Network zone** (center): RPC calls with route, payload shape
3. **Server zone** (right): Python model + method, return value
4. **Event flow** (optional): `trigger`, `env.bus.trigger`, `useBus` hooks
5. **Title block**: component name, module, Odoo version

---

## Design Checklist (OWL Flow)

- [ ] RPC route visible on the arrow (not just "RPC call")
- [ ] Python method name visible on the server box
- [ ] Return JSON shape shown as evidence artifact
- [ ] OWL 2 hooks used (`onMounted`, `useState`) — not OWL 1
- [ ] Reactive state shown as cloud (not rectangle)
- [ ] t-if / t-foreach branching shown as diamond if relevant
- [ ] Render-validate loop completed (PNG reviewed)
