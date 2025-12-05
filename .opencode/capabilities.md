# Land Shepherd Agent Capabilities Matrix

**Version:** 1.0.0  
**Last Updated:** 2025-12-05

## Quick Reference

| Capability | shepherd-architect | shepherd-core | shepherd-feature | shepherd-verify | shepherd-docs |
|------------|-------------------|---------------|------------------|-----------------|---------------|
| **Feature Planning** | ✅ Primary | ❌ | ❌ | ❌ | ❌ |
| **System Design** | ✅ Primary | 🔧 Consult | 🔧 Consult | ❌ | ❌ |
| **WebGL Rendering** | ❌ | ✅ Primary | ❌ | ❌ | ❌ |
| **Shader Development** | ❌ | ✅ Primary | ❌ | ❌ | ❌ |
| **Performance Optimization** | 🔧 Review | ✅ Primary | ❌ | 🔧 Measure | 📝 Document |
| **Managers (game logic)** | ❌ | ❌ | ✅ Primary | ❌ | ❌ |
| **Entities** | ❌ | ❌ | ✅ Primary | ❌ | ❌ |
| **Input/UI Systems** | ❌ | ❌ | ✅ Primary | ❌ | ❌ |
| **Testing/Verification** | 🔧 Enforce | 🔧 Verify | 🔧 Verify | ✅ Primary | ❌ |
| **Custom Test Writing** | ❌ | ❌ | ❌ | ✅ Primary | ❌ |
| **Baseline Management** | ❌ | ❌ | ❌ | ✅ Primary | ❌ |
| **Documentation** | 🔧 Review | ❌ | ❌ | ❌ | ✅ Primary |
| **Code Review** | ✅ Architecture | ✅ Performance | ❌ | ❌ | 📝 Comments |
| **Milestone Planning** | ✅ Primary | ❌ | ❌ | ❌ | ❌ |
| **Agent Coordination** | ✅ Primary | ➡️ Coordinates | ➡️ Coordinates | ➡️ Coordinates | ➡️ Receives |
| **Escalation Handling** | ✅ Receives | ➡️ Escalates | ➡️ Escalates | ➡️ Escalates | ❌ |

**Legend:**
- ✅ Primary responsibility - This agent owns this capability
- 🔧 Performs as part of workflow - Does this but not the primary owner
- ➡️ Participates in - Involved in coordination or execution
- 📝 Documents - Creates documentation for this capability
- ❌ Not responsible - This agent does not handle this

---

## Detailed Capability Breakdown

### Feature Planning & Architecture

#### ✅ shepherd-architect (Primary)
**Capabilities:**
- Break features into 2-5 testable milestones
- Define validation criteria for each milestone
- Identify affected systems and integration points
- Plan WebGL performance impact
- Assign milestones to specialist agents
- Coordinate cross-system features

**When to Use:**
- "Add weather system with rain particles"
- "Plan terrain generation feature"
- "How should I implement character movement"
- "Design nutrient cycle system"

**Example Requests:**
```
/add-feature weather-system
Plan a reproduction system with genetic inheritance
Design architecture for multiplayer networking
```

---

### WebGL Rendering & Performance

#### ✅ shepherd-core (Primary)
**Capabilities:**
- Shader development (vertex + fragment GLSL)
- Texture generation and management
- Geometry buffer creation and caching
- Batched rendering implementation
- WebGL state management and optimization
- Context loss handling
- Draw call reduction techniques
- FPS optimization

**When to Use:**
- "Rain particles need shader implementation"
- "FPS dropped after adding entities"
- "Implement water ripple shader"
- "Optimize render calls"
- "Visual artifacts in soil texture"

**Example Requests:**
```
Implement particle system shader
Optimize batching for plant rendering
Fix flickering textures
Add bloom post-processing effect
```

**Coordinates With:**
- shepherd-feature (for gameplay-rendering integration)
- shepherd-verify (for performance testing)
- shepherd-architect (for performance architecture)

---

### Managers, Entities, & Gameplay Logic

#### ✅ shepherd-feature (Primary)
**Capabilities:**
- Create/modify managers (PlantManager, SoilManager, TimeManager, etc.)
- Implement entity classes (Plant, Soil, Character)
- Entity lifecycle management (spawn, update, remove)
- Game system logic (reproduction, nutrient cycling, growth)
- Input handling (mouse, keyboard, touch)
- UI systems (context menus, overlays, panels)
- Camera controls and management
- Procedural generation (non-rendering aspects)
- Config.json integration

**When to Use:**
- "Add plant reproduction system"
- "Implement soil nutrient depletion"
- "Create time manager with day/night cycle"
- "Add keyboard shortcut for overlay toggle"
- "Implement character movement"

**Example Requests:**
```
Implement PlantManager with growth stages
Add nutrient consumption to plants
Create context menu for plant inspection
Add camera zoom and pan controls
```

**Coordinates With:**
- shepherd-core (for render data interface)
- shepherd-verify (for functional testing)
- shepherd-architect (for system integration)

---

### Testing, Verification, & Quality Assurance

#### ✅ shepherd-verify (Primary)
**Capabilities:**
- Run npm run verify and variants
- Parse test results (report.json, console.json)
- Analyze failures by category (console, FPS, visual, WebGL)
- Write custom Playwright tests
- Create and manage baselines
- Visual regression testing (screenshot comparison)
- Performance benchmarking (FPS, render calls)
- Quality gate enforcement
- Test-fix-test iteration tracking

**When to Use:**
- "Test the current implementation"
- "Why did npm run verify fail"
- "Create baseline after feature complete"
- "Write test for reproduction system"
- "Benchmark performance with 100 plants"

**Example Requests:**
```
/verify-changes full
Analyze why console errors appeared
Create baseline for new lighting system
Write custom test for plant proximity reproduction
```

**Coordinates With:**
- All implementer agents (for test results and iteration feedback)
- shepherd-architect (for escalation after 3 failed iterations)

---

### Documentation & Knowledge Management

#### ✅ shepherd-docs (Primary)
**Capabilities:**
- Update doc/dev-guidelines.md after every feature
- Create/update system documentation (doc/features/)
- Maintain README.md
- Review code comments and JSDoc
- Create devlogs for significant features
- Update CHANGELOG.md
- Document configuration parameters
- Provide usage examples
- Maintain doc/INDEX.md navigation

**When to Use:**
- After feature implementation complete
- After testing validation passes
- When adding new config parameters
- When public APIs change
- For major architectural changes

**Example Requests:**
```
Document the weather system implementation
Update dev-guidelines.md with reproduction feature
Create devlog for terrain generation
Review JSDoc comments in PlantManager
```

**Coordinates With:**
- Receives updates from all implementing agents
- Does not delegate to others (final step)

---

## Agent Selection Decision Tree

```
START: User makes a request

1. Is this about PLANNING or ARCHITECTURE?
   → YES: shepherd-architect
   → NO: Continue

2. Is this about RENDERING, SHADERS, or PERFORMANCE?
   → YES: shepherd-core
   → NO: Continue

3. Is this about MANAGERS, ENTITIES, or GAMEPLAY?
   → YES: shepherd-feature
   → NO: Continue

4. Is this about TESTING or VERIFICATION?
   → YES: shepherd-verify
   → NO: Continue

5. Is this about DOCUMENTATION?
   → YES: shepherd-docs
   → NO: General agent (fallback)

SPECIAL CASES:
- Multiple systems affected → shepherd-architect coordinates
- 3 test iterations failed → Escalate to shepherd-architect
- Ambiguous request → shepherd-architect clarifies and delegates
```

---

## Coordination Patterns

### Pattern 1: Feature Implementation
```
shepherd-architect (plan)
    ↓
shepherd-core (rendering) + shepherd-feature (logic)
    ↓
shepherd-verify (test)
    ↓
shepherd-docs (document)
```

### Pattern 2: Bug Fix
```
shepherd-verify (identify)
    ↓
shepherd-core OR shepherd-feature (fix)
    ↓
shepherd-verify (validate)
    ↓
shepherd-docs (changelog entry)
```

### Pattern 3: Performance Optimization
```
shepherd-verify (benchmark before)
    ↓
shepherd-core (optimize)
    ↓
shepherd-verify (benchmark after)
    ↓
shepherd-docs (document improvement)
```

### Pattern 4: Refactoring
```
shepherd-architect (plan approach)
    ↓
shepherd-feature OR shepherd-core (refactor)
    ↓
shepherd-verify (ensure no regressions)
    ↓
shepherd-docs (update docs)
```

---

## Escalation Paths

### From shepherd-core
**Escalates When:**
- 3 rendering iterations fail on same issue
- Architectural decision needed for performance
- Major refactoring required across rendering pipeline

**Escalates To:** shepherd-architect

---

### From shepherd-feature
**Escalates When:**
- 3 feature iterations fail on same issue
- System integration conflict
- Manager architecture question

**Escalates To:** shepherd-architect

---

### From shepherd-verify
**Escalates When:**
- 3 test iterations fail on same milestone
- Unknown failure category (unclear cause)
- Test infrastructure issue

**Escalates To:** shepherd-architect

---

### shepherd-architect Actions
**When Receiving Escalation:**
1. Review complete iteration log
2. Reproduce failure if possible
3. Analyze architectural root cause
4. Propose solution or redesign approach
5. Reassign with new plan

---

## Agent Boundaries

### What shepherd-architect DOES NOT DO:
- ❌ Implement code (delegates to specialists)
- ❌ Write tests directly (delegates to shepherd-verify)
- ❌ Write documentation (delegates to shepherd-docs)
- ✅ Reviews, plans, coordinates, escalates

### What shepherd-core DOES NOT DO:
- ❌ Implement game logic managers
- ❌ Handle entity behavior (delegates to shepherd-feature)
- ❌ Write documentation
- ✅ Only rendering, shaders, WebGL, performance

### What shepherd-feature DOES NOT DO:
- ❌ Write shaders or WebGL code (delegates to shepherd-core)
- ❌ Optimize rendering performance (delegates to shepherd-core)
- ❌ Write tests (delegates to shepherd-verify)
- ✅ Only managers, entities, gameplay, input, UI

### What shepherd-verify DOES NOT DO:
- ❌ Implement fixes (reports to implementers)
- ❌ Make architectural decisions (escalates to shepherd-architect)
- ❌ Write documentation (delegates to shepherd-docs)
- ✅ Only testing, validation, quality gates

### What shepherd-docs DOES NOT DO:
- ❌ Implement features
- ❌ Fix bugs
- ❌ Run tests
- ✅ Only documentation, no code changes

---

## Usage Examples

### Multi-System Feature
**Request:** "Add weather system with rain particles affecting plant growth"

**Route:**
1. shepherd-architect plans 3 milestones
2. shepherd-core implements rain particle shader (Milestone 1)
3. shepherd-feature implements WeatherManager + plant growth effects (Milestones 2-3)
4. shepherd-verify tests each milestone
5. shepherd-docs documents complete system

---

### Performance Issue
**Request:** "FPS dropped from 60 to 30 after adding 100 plants"

**Route:**
1. shepherd-verify benchmarks current state
2. shepherd-architect analyzes (determines rendering issue)
3. shepherd-core implements batching optimization
4. shepherd-verify benchmarks improvement
5. shepherd-docs documents optimization

---

### Unclear Request
**Request:** "Plants aren't working right"

**Route:**
1. shepherd-architect clarifies:
   - Is it rendering (green rectangles)? → shepherd-core
   - Is it behavior (not growing)? → shepherd-feature
   - Is it a test failure? → shepherd-verify
2. Routes to appropriate specialist

---

## Performance Metrics by Agent

| Agent | Success Metric | Target |
|-------|----------------|--------|
| shepherd-architect | Milestone pass rate | >90% |
| shepherd-core | FPS maintained/improved | 60+ FPS |
| shepherd-feature | First-attempt test pass | >70% |
| shepherd-verify | Test execution time | <30s |
| shepherd-docs | Documentation lag | <1 day |

---

**Need Help Choosing?**
- Use slash commands: `/add-feature`, `/verify-changes`, `/review-code`
- Ask shepherd-architect to delegate: "How should I implement X?"
- Trigger auto-selection with keywords: "shader", "manager", "test", "document"
