# Land Shepherd Agent System Guide

**Last updated:** 2025-11-30  
**For:** Human developers working with AI agents

## Overview

Land Shepherd uses a specialized multi-agent architecture where different AI agents handle different aspects of development. Each agent has deep expertise in its domain and enforces mandatory iterative testing.

## The Five Agents

### 1. shepherd-architect (The Planner)

**Definition:** `.opencode/agent/shepherd-architect.md`

**When to use:**
- "How should I implement [feature]?"
- "Design a system for [requirement]"
- "Review this architecture"
- Planning multi-system features
- Code review and refactoring

**What it does:**
- Breaks features into testable milestones
- Designs system architecture
- Delegates to specialist agents
- Enforces quality gates
- Handles escalations when 3 iterations fail

**Example:**
```
User: "I want to add a weather system"
Agent: Creates architecture plan, breaks into 4 milestones, delegates to
        shepherd-core (rain rendering) and shepherd-feature (weather effects)
```

---

### 2. shepherd-core (The WebGL Specialist)

**Definition:** `.opencode/agent/shepherd-core.md`

**When to use:**
- Rendering issues or visual artifacts
- Shader development
- Performance optimization (FPS)
- WebGL context problems
- Texture or geometry management
- Adding new rendering features

**What it does:**
- Implements WebGL rendering code
- Writes and optimizes shaders
- Manages batching and state caching
- Handles context loss
- Ensures 60+ FPS target
- Tests with `npm run verify:interactive` for visual validation

**Example:**
```
User: "FPS dropped to 30 with 500 plants"
Agent: Profiles rendering, implements batching, tests performance, achieves 60 FPS
```

---

### 3. shepherd-feature (The Systems Developer)

**Definition:** `.opencode/agent/shepherd-feature.md`

**When to use:**
- Adding gameplay features
- Creating/modifying managers
- Entity behavior (plants, soil, character)
- Input handling
- UI and overlays
- Procedural generation
- Game logic

**What it does:**
- Implements managers in js/core/
- Creates entities in js/entities/
- Handles input and camera
- Integrates systems
- Updates config.json
- Tests functionality with `npm run verify` or `verify:interactive`

**Example:**
```
User: "Plants should consume soil nutrients"
Agent: Modifies Plant.js, adds consumeNutrients(), integrates with SoilManager,
       tests with time advancement, validates nutrients decrease
```

---

### 4. shepherd-verify (The Quality Gatekeeper)

**Definition:** `.opencode/agent/shepherd-verify.md`

**When to use:**
- "Test my changes"
- "Something is broken"
- Bug reproduction
- Performance benchmarking
- Creating test baselines
- Writing custom Playwright tests

**What it does:**
- Runs `npm run verify` suite
- Parses test results (report.json)
- Analyzes failures by category
- Creates regression tests
- Manages baselines
- **Blocks progression if tests fail**
- Enforces quality gates

**Example:**
```
User: "Verify my plant reproduction changes"
Agent: Runs verify:interactive, captures screenshots, checks FPS, validates
       reproduction logic, reports PASS with metrics
```

---

### 5. shepherd-docs (The Documentarian)

**Definition:** `.opencode/agent/shepherd-docs.md`

**When to use:**
- After implementing ANY feature (mandatory)
- "Document this system"
- Updating README
- Creating technical guides
- Maintaining dev-guidelines.md

**What it does:**
- Updates doc/dev-guidelines.md after every feature
- Creates/updates system documentation
- Reviews code comments
- Documents configuration
- Maintains CHANGELOG.md
- Creates devlog entries
- **Must be notified after every feature**

**Example:**
```
After feature complete:
Agent: Updates dev-guidelines.md, creates doc/features/weather-system.md,
       updates README.md, adds CHANGELOG entry
```

---

## Agent Coordination

Agents work together on complex features:

### Example: Weather System Implementation

```
1. User requests: "Add weather system with rain"

2. shepherd-architect:
   - Designs WeatherManager
   - Creates 3 milestones
   - Delegates milestone 1 to shepherd-feature
   - Delegates milestone 2 to shepherd-core

3. shepherd-feature:
   - Implements WeatherManager logic
   - Tests with npm run verify
   - PASS → Notifies architect

4. shepherd-core:
   - Implements rain particle shader
   - Tests with npm run verify:interactive
   - FAIL iteration 1: FPS too low
   - Optimizes batching
   - PASS iteration 2: 60 FPS achieved
   - Creates baseline for visual changes

5. shepherd-verify:
   - Validates all milestones
   - Runs comprehensive tests
   - Confirms all quality gates met

6. shepherd-docs:
   - Updates dev-guidelines.md
   - Creates doc/features/weather-system.md
   - Updates README.md
   - Adds CHANGELOG entry
```

---

## Mandatory Iterative Testing

**ALL agents MUST test after every significant change.**

### The Test-Fix-Test Loop

```
1. IMPLEMENT CHANGE
2. RUN TEST IMMEDIATELY (not later!)
3. PARSE RESULTS (report.json, console.json, screenshots)
4. IF FAIL: Analyze → Fix → Re-test (iteration N+1)
5. IF PASS: Document → Proceed
6. MAX 3 ITERATIONS (escalate if 3rd fails)
```

### Test Commands

- `npm run verify` - Quick verification (console, FPS, WebGL)
- `npm run verify:interactive` - Full mode (screenshots, metrics, interactions)
- `npm run verify:screenshot-only` - Visual capture only
- `npm run verify:log-only` - Console analysis only
- `npm run verify:baseline` - Create new baseline reference

### Quality Gates

Agents CANNOT proceed without:
- ✅ npm run verify: PASS
- ✅ Console errors: 0
- ✅ FPS: >= 30 (target 60)
- ✅ WebGL context: ok
- ✅ Visual changes: Validated or baseline created

---

## Decision Tree: Which Agent?

```
Is it a QUESTION about implementation? → shepherd-architect
Is it RENDERING/WebGL/FPS? → shepherd-core
Is it GAMEPLAY/MANAGER/ENTITY? → shepherd-feature
Is it TESTING/BUG/VERIFICATION? → shepherd-verify
Is it DOCUMENTATION? → shepherd-docs
Does it span MULTIPLE SYSTEMS? → shepherd-architect (delegates)
UNCLEAR? → shepherd-architect (will route)
```

## Trigger Keywords

**shepherd-architect:**
- "design", "plan", "how should I", "architecture", "review", "refactor"

**shepherd-core:**
- "shader", "WebGL", "render", "FPS", "texture", "geometry", "batching", "visual artifact"

**shepherd-feature:**
- "add feature", "manager", "entity", "plant", "soil", "input", "camera", "gameplay"

**shepherd-verify:**
- "test", "verify", "broken", "bug", "benchmark", "baseline", "not working"

**shepherd-docs:**
- "document", "explain", "README", "guide", "changelog"

---

## Project Conventions

All agents follow these conventions:

### Code Style
- **Files:** snake_case.js (plant_manager.js)
- **Classes:** PascalCase (PlantManager)
- **Methods:** camelCase (updateGrowth)
- **Constants:** UPPER_SNAKE_CASE (in config.json)

### Architecture
- **No build tools** - Pure vanilla JS with script tags
- **Modular managers** - Independent systems with clear interfaces
- **Entity interface** - Must implement getRenderData(), update(), getRenderType()
- **Configuration** - All parameters in config.json

### Testing
- **After every change** - Not just at the end
- **Iterative** - Test, fix, re-test until PASS
- **Maximum 3 iterations** - Escalate if failing repeatedly
- **Quality gates** - Cannot proceed without PASS

### Performance
- **Target:** 60+ FPS
- **Minimum:** 30 FPS (headless Chrome uses software rendering)
- **Render calls:** <100 per frame
- **Batching:** Group similar entities
- **Culling:** Only render visible entities

---

## For AI Agents

If you are an AI agent reading this:

1. **Check `.opencode/agent/[your-role].md`** for your full specification
2. **Follow mandatory testing protocol** - Test after every change
3. **Coordinate with other agents** - You are one of five specialists
4. **Enforce quality gates** - Do not proceed without validation
5. **Document iterations** - Track test-fix-test cycles

---

## For Human Developers

When working with agents:

1. **Be specific about the problem** - Include error messages, files, expected behavior
2. **Let agents test iteratively** - They need to verify their work
3. **Trust the agent routing** - shepherd-architect will delegate appropriately
4. **Expect iteration logs** - Agents document their test-fix-test cycles
5. **Review baselines** - Check visual changes before approving new baselines

---

## Common Workflows

### Adding a New Feature
```
1. Request feature from shepherd-architect
2. Review proposed milestones and validation criteria
3. Architect delegates to specialists
4. Each specialist tests iteratively
5. shepherd-verify validates final result
6. shepherd-docs updates documentation
```

### Fixing a Bug
```
1. Report bug to shepherd-verify (reproduces issue)
2. shepherd-verify analyzes and routes to appropriate agent
3. Specialist implements fix
4. Tests until PASS
5. shepherd-docs updates troubleshooting guide
```

### Optimizing Performance
```
1. Report FPS issue to shepherd-core
2. Agent profiles and identifies bottleneck
3. Implements optimization
4. Benchmarks improvement
5. Tests until FPS target met
6. shepherd-docs documents optimization
```

---

## Learning More

- **Agent Definitions:** See `.opencode/agent/*.md` for complete specifications
- **Testing Framework:** See `doc/testing/interactive-testing.md`
- **Dev Guidelines:** See `doc/dev-guidelines.md` for implementation history
- **Architecture:** See `doc/architecture/` for system design
- **README:** See `README.md` for project overview

---

**Questions?** Check the [Documentation Index](../INDEX.md) or review the relevant agent definition in `.opencode/agent/`.
