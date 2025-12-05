---
name: add-feature
description: Plan and implement a new feature with milestone-based testing
usage: /add-feature [feature-name]
agent: shepherd-architect
parameters:
  - name: feature-name
    description: Name of the feature to implement
    required: true
    example: "weather-system"
---

# Add Feature Command

Automatically triggers **shepherd-architect** with structured feature planning workflow.

## What This Does

When you invoke `/add-feature weather-system`, the shepherd-architect agent will:

1. **Feature Analysis**
   - Identify affected systems (managers, entities, render pipeline)
   - Assess performance implications (FPS target, memory usage)
   - Determine if WebGL-heavy or gameplay-heavy
   - Plan testing modes needed (visual, functional, performance)
   - Identify integration points with existing systems

2. **Milestone Breakdown**
   - Create 2-5 testable milestones
   - Define validation criteria for EACH milestone before implementation
   - Identify which specialist agents should handle each milestone
   - Plan WebGL performance impact and optimization strategies

3. **Delegation Strategy**
   - Assign milestones to appropriate agents:
     * shepherd-core: WebGL rendering, shaders, performance
     * shepherd-feature: Managers, entities, gameplay logic
     * shepherd-verify: Testing, validation, benchmarks
     * shepherd-docs: Documentation updates

4. **Quality Gates**
   - Define validation checkpoints that must pass before proceeding
   - Enforce mandatory iterative testing
   - Block progression if validation criteria not met

## Example Usage

```
/add-feature rain-particles
```

**Expected Output:**
```markdown
## Feature Plan: Rain Particles

### Architecture Impact
- New shader: Rain particle shader (vertex + fragment)
- Affected systems: WeatherManager, RenderSystem, ShaderManager
- Config changes: Add "rainParticles" section to config.json
- Performance: Must maintain 60 FPS with 1000 particles

### Milestone Breakdown

#### MILESTONE 1: Particle Shader Implementation
DELEGATED TO: shepherd-core
FILES:
- js/core/shader_manager.js (add rain particle shader)
- js/systems/render_system.js (add particle render pass)

VALIDATION_CRITERIA:
  visual: Particles visible falling downward
  performance: fps_threshold: 60, target_particles: 1000
  console: max_errors: 0

TEST_COMMAND: npm run verify:interactive
EXPECTED: PASS, rain particles render at 60 FPS

...
```

## When to Use

- ✅ Adding new gameplay systems (weather, seasons, economy)
- ✅ Implementing complex features that span multiple managers
- ✅ Features requiring architectural design before implementation
- ✅ Performance-critical features needing optimization planning
- ❌ NOT for simple bug fixes (use regular request)
- ❌ NOT for documentation updates (use /document)
- ❌ NOT for single-file changes

## Related Commands

- `/verify-changes` - Run verification after implementation
- `/review-code` - Architectural code review
- `/document` - Update documentation after feature complete
