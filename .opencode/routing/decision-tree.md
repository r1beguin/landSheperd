# Land Shepherd Agent Selection Decision Tree

**Version:** 1.0.0  
**Last Updated:** 2025-12-05

## Purpose

This decision tree helps route requests to the appropriate specialized agent for Land Shepherd development.

---

## Decision Tree

```
┌─────────────────────────────────┐
│   NEW REQUEST RECEIVED          │
└──────────────┬──────────────────┘
               │
               ▼
       ┌───────────────┐
       │ Is this a     │──YES──► General Agent
       │ question or   │         (explanation only)
       │ explanation?  │
       └───────┬───────┘
               │ NO
               ▼
       ┌───────────────────────────────┐
       │ Does request mention:         │──YES──► shepherd-architect
       │ - "plan" / "design"           │
       │ - "architecture" / "refactor" │
       │ - "how should I implement"    │
       │ - "feature spans multiple"    │
       └───────┬───────────────────────┘
               │ NO
               ▼
       ┌───────────────────────────────┐
       │ Does request mention:         │──YES──► shepherd-core
       │ - WebGL / shader / rendering  │
       │ - FPS / performance           │
       │ - texture / geometry /batch   │
       │ - visual artifact             │
       └───────┬───────────────────────┘
               │ NO
               ▼
       ┌───────────────────────────────┐
       │ Does request mention:         │──YES──► shepherd-feature
       │ - manager / entity            │
       │ - gameplay / input / UI       │
       │ - plant / soil / nutrient     │
       │ - reproduction / growth       │
       └───────┬───────────────────────┘
               │ NO
               ▼
       ┌───────────────────────────────┐
       │ Does request mention:         │──YES──► shepherd-verify
       │ - test / verify / validate    │
       │ - broken / failing / bug      │
       │ - baseline / benchmark        │
       │ - console error               │
       └───────┬───────────────────────┘
               │ NO
               ▼
       ┌───────────────────────────────┐
       │ Does request mention:         │──YES──► shepherd-docs
       │ - document / docs / readme    │
       │ - write guide / explain       │
       │ - api documentation           │
       └───────┬───────────────────────┘
               │ NO
               ▼
       ┌───────────────┐
       │ General Agent │
       │ (fallback)    │
       └───────────────┘
```

---

## Special Cases

### Multi-System Features
**Trigger:** Request affects multiple systems (rendering + gameplay)  
**Route:** shepherd-architect → Coordinates → shepherd-core + shepherd-feature

**Example:**
```
Request: "Add weather system with rain particles affecting plant growth"
Route: shepherd-architect plans, then delegates:
  - Milestone 1 → shepherd-core (rain particle shader)
  - Milestone 2 → shepherd-feature (weather manager + growth effects)
```

---

### Test Failures
**Trigger:** 3 iterations failed on same milestone  
**Route:** Escalate to shepherd-architect

**Example:**
```
Request: "Plant reproduction test still failing after 3 fixes"
Route: shepherd-verify → escalate → shepherd-architect (investigates approach)
```

---

### Ambiguous Requests
**Trigger:** Unclear which system is affected  
**Route:** shepherd-architect clarifies then delegates

**Example:**
```
Request: "Plants aren't working right"
Route: shepherd-architect asks:
  - Rendering issue (green rectangles)? → shepherd-core
  - Behavior issue (not growing)? → shepherd-feature
  - Test failure? → shepherd-verify
```

---

## Keyword Matching Guide

### shepherd-architect Keywords
**Triggers:**
- plan, design, architect, refactor
- "how should I implement"
- "feature spans multiple"
- "integrate systems"
- review architecture

**Examples:**
- "Plan a weather system"
- "How should I implement character movement"
- "Review plant manager architecture"
- "Design nutrient cycle system"

---

### shepherd-core Keywords
**Triggers:**
- WebGL, shader, GLSL, rendering
- FPS, performance, optimize, batch
- texture, geometry, sprite
- visual artifact, flickering
- draw call, render pass

**Examples:**
- "Rain particles need shader"
- "FPS dropped after adding entities"
- "Implement water ripple shader"
- "Optimize render calls"
- "Fix flickering textures"

---

### shepherd-feature Keywords
**Triggers:**
- manager, entity, system
- gameplay, input, UI, camera
- plant, soil, nutrient, reproduction
- growth, fertility, water
- context menu, overlay, time

**Examples:**
- "Add plant reproduction system"
- "Implement soil nutrient depletion"
- "Create time manager"
- "Add keyboard shortcut"
- "Implement character movement"

---

### shepherd-verify Keywords
**Triggers:**
- test, verify, validate, check
- broken, failing, not working, bug
- regression, benchmark, baseline
- console error, FPS issue
- screenshot, visual diff

**Examples:**
- "Test the current implementation"
- "Why did npm run verify fail"
- "Create baseline after feature"
- "Write test for reproduction"
- "Benchmark performance with 100 plants"

---

### shepherd-docs Keywords
**Triggers:**
- document, docs, documentation
- readme, changelog, guide
- explain system, api documentation
- devlog, onboarding

**Examples:**
- "Document the weather system"
- "Update dev-guidelines.md"
- "Create devlog for terrain generation"
- "Explain the lighting system"

---

## Priority-Based Routing

When multiple agents match, use priority:

1. **shepherd-architect** (high priority)
   - If planning or coordination needed
   - If multiple systems affected
   - If architectural decision required

2. **shepherd-core / shepherd-feature** (high priority)
   - If implementation clearly scoped
   - If single system affected

3. **shepherd-verify** (high priority)
   - If testing/validation needed
   - If failure analysis required

4. **shepherd-docs** (medium priority)
   - After implementation complete
   - For documentation-only requests

---

## Slash Command Routing

Slash commands bypass the decision tree and directly invoke specific agents:

| Command | Routes To | Use Case |
|---------|-----------|----------|
| `/add-feature [name]` | shepherd-architect | Plan and implement new feature |
| `/verify-changes [mode]` | shepherd-verify | Run comprehensive verification |
| `/review-code [path]` | shepherd-architect | Architectural code review |

---

## Decision Examples

### Example 1: Clear Single-Agent Request
```
Request: "Implement particle system shader for rain"

Decision Process:
1. Question/explanation? NO
2. Planning/architecture? NO (implementation request)
3. WebGL/rendering? YES ✓

Result: shepherd-core
```

---

### Example 2: Multi-Agent Feature
```
Request: "Add weather system with rain particles and soil effects"

Decision Process:
1. Question/explanation? NO
2. Planning/architecture? YES (multiple systems) ✓

Result: shepherd-architect
  → Plans 3 milestones
  → Milestone 1: shepherd-core (rain particles)
  → Milestone 2: shepherd-feature (weather manager)
  → Milestone 3: shepherd-feature (soil effects)
```

---

### Example 3: Testing Request
```
Request: "Test the lighting system implementation"

Decision Process:
1. Question/explanation? NO
2. Planning/architecture? NO
3. WebGL/rendering? NO
4. Manager/entity? NO
5. Test/verify? YES ✓

Result: shepherd-verify
  → Runs: npm run verify:interactive
  → Validates: lighting visual changes
  → Reports: metrics and recommendations
```

---

### Example 4: Ambiguous Request
```
Request: "Plants look wrong"

Decision Process:
1. Question/explanation? NO
2. Planning/architecture? NO (but ambiguous) → Need clarification ✓

Result: shepherd-architect
  → Asks: "Is this a rendering issue (green rectangles) or behavior issue (not growing)?"
  → User clarifies: "Green rectangles"
  → Delegates to: shepherd-core (rendering issue)
```

---

### Example 5: Escalation
```
Request: "Plant reproduction test failed 3 times"

Decision Process:
1. Question/explanation? NO
2. Planning/architecture? NO
3. WebGL/rendering? NO
4. Manager/entity? NO
5. Test/verify? YES → But 3 failures triggers escalation

Result: shepherd-verify (initially)
  → Attempts 3 fixes, all fail
  → Escalates to: shepherd-architect
  → Architect reviews: approach needs redesign
  → New plan to: shepherd-feature
```

---

## Usage Tips

### For AI Agents
1. Check keywords in request against trigger lists
2. If multiple matches, use priority rules
3. When in doubt, route to shepherd-architect for clarification
4. Escalate to shepherd-architect after 3 failed iterations

### For Developers
1. Use slash commands for explicit routing
2. Include specific keywords for better auto-selection
3. Ask shepherd-architect for guidance on ambiguous tasks
4. Reference capabilities.md for detailed agent responsibilities

---

## Related Documentation

- [.opencode/capabilities.md](.opencode/capabilities.md) - Full agent responsibility matrix
- [.opencode/workflows/feature-implementation.md](.opencode/workflows/feature-implementation.md) - Multi-agent workflows
- [AGENTS.md](../AGENTS.md) - Agent guidelines
- [.opencode/commands/](.opencode/commands/) - Slash command definitions
