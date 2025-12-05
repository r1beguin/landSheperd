---
name: feature-implementation
description: Full feature implementation workflow with milestone-based testing and documentation
version: 1.0.0
phases:
  - name: planning
    agent: shepherd-architect
    output: milestone-plan
    duration_estimate: 5-15 minutes
    
  - name: rendering-implementation
    agent: shepherd-core
    requires: milestone-plan
    triggers_when: "milestone involves WebGL, shaders, textures, or performance"
    output: rendering-implementation-complete
    
  - name: feature-logic-implementation
    agent: shepherd-feature
    requires: milestone-plan
    triggers_when: "milestone involves managers, entities, input, UI, game logic"
    output: feature-implementation-complete
    
  - name: verification
    agent: shepherd-verify
    requires:
      - rendering-implementation-complete OR feature-implementation-complete
    must_pass: true
    output: testing-validation-pass
    
  - name: documentation
    agent: shepherd-docs
    requires: testing-validation-pass
    output: documentation-complete

quality_gates:
  cannot_proceed_without:
    - current_phase_complete
    - success_criteria_met
    - output_artifacts_produced
    - coordination_message_sent
    
  cannot_claim_feature_complete_without:
    - all_milestones_validated
    - npm_run_verify_interactive_PASS
    - documentation_updated
    - baseline_created_if_visual_changes
    - testing_log_documented

escalation_triggers:
  - condition: "3 test iterations fail on same milestone"
    action: "shepherd-architect investigates"
  - condition: "unclear agent responsibility"
    action: "shepherd-architect clarifies"
  - condition: "architectural decision needed mid-implementation"
    action: "shepherd-architect consulted"
  - condition: "major refactoring required"
    action: "shepherd-architect reviews approach"
---

# Feature Implementation Workflow

Full orchestration of feature development from planning through documentation.

## Overview

This workflow coordinates **shepherd-architect**, **shepherd-core**, **shepherd-feature**, **shepherd-verify**, and **shepherd-docs** to implement features with proper testing and documentation at each milestone.

## Workflow Phases

### Phase 1: Planning (shepherd-architect)

**Duration:** 5-15 minutes  
**Output:** milestone-plan

**Activities:**
- Feature analysis (systems affected, performance impact)
- Milestone breakdown (2-5 milestones)
- Validation criteria definition
- Agent delegation strategy
- Quality gates specification

**Success Criteria:**
- Clear milestone plan created
- Each milestone has validation criteria
- Agents assigned to milestones
- Performance targets defined

---

### Phase 2: Implementation (shepherd-core AND/OR shepherd-feature)

#### Rendering Implementation (shepherd-core)
**Triggers When:** Milestone involves WebGL, shaders, textures, or performance  
**Output:** rendering-implementation-complete

**Checkpoints:**
- After shader implementation → Test compilation
- After batching → Measure render calls
- After integration → Full visual validation

**Success Criteria:**
- npm run verify:interactive PASS
- FPS >= 30 (target 60)
- Zero console errors
- Visual validation complete
- Render calls within budget (<100/frame)

#### Feature Logic Implementation (shepherd-feature)
**Triggers When:** Milestone involves managers, entities, input, UI, game logic  
**Output:** feature-implementation-complete

**Checkpoints:**
- After manager creation → Test initialization
- After entity implementation → Test lifecycle
- After integration → Test system interactions

**Success Criteria:**
- npm run verify PASS
- Functional validation passed
- Entity interfaces correctly implemented
- System integration working
- Config.json updated

---

### Phase 3: Verification (shepherd-verify)

**Must Pass:** true (blocking phase)  
**Output:** testing-validation-pass

**Activities:**
- Run comprehensive verification (verify:interactive)
- Analyze test results (report.json, console.json)
- Compare visual changes (screenshots)
- Write custom tests if needed
- Create/update baseline if appropriate

**Success Criteria:**
- npm run verify:interactive PASS
- Console errors: 0
- FPS: >= 30
- Visual diff: <5% (or baseline created)
- WebGL context: ok
- Custom tests written for complex features

**Iteration Protocol:**
- If FAIL: Analyze failure, coordinate with implementer
- Max 3 iterations per milestone
- Document test-fix-test iterations
- Escalate to shepherd-architect if 3 failures

---

### Phase 4: Documentation (shepherd-docs)

**Output:** documentation-complete

**Activities:**
- Update doc/dev-guidelines.md
- Create/update feature documentation
- Update README.md if user-facing
- Review code comments and JSDoc
- Create devlog if major feature
- Update doc/INDEX.md navigation

**Success Criteria:**
- doc/dev-guidelines.md updated
- Feature documentation created/updated
- Configuration parameters documented
- Usage examples provided
- "Last updated" dates current

---

## Workflow Patterns

### Linear Flow (Simple Features)
```
Planning → Implementation → Verification → Documentation
```

**Example:** Adding keyboard shortcut

### Parallel Flow (Complex Features)
```
                    ┌─→ Rendering (core) ────┐
Planning (architect)┤                         ├─→ Verification → Documentation
                    └─→ Feature Logic ────────┘
```

**Example:** Weather system with rain particles

### Iterative Flow (Performance-Critical)
```
Planning → Implementation → Verification ─┐
              ↑                           │
              └───────[if fail]───────────┘
                   (max 3 loops)
```

**Example:** Batching optimization

---

## Coordination Messages

### Architect → Implementer
```markdown
MILESTONE ASSIGNMENT

**Context:** [Feature background]
**Milestone:** [Name and number]
**Files to Modify:** [List]
**Validation Criteria:** [Checkpoints]
**Test Command:** npm run verify:interactive
**Expected Outcome:** PASS with [metrics]
```

### Implementer → Verify
```markdown
IMPLEMENTATION COMPLETE

**Milestone:** [Name]
**Files Changed:** [List]
**Iteration Count:** [Number]
**Self-Test Result:** [PASS/FAIL]
**Ready for Verification:** YES
```

### Verify → Implementer
```markdown
VERIFICATION RESULT

**Result:** [PASS/FAIL]
**Metrics:** [errors, fps, visual_diff]
**Issues Found:** [List if FAIL]
**Recommendations:** [Next steps]
**Approved to Proceed:** [YES/NO]
```

### Verify → Docs
```markdown
FEATURE VALIDATED

**Feature:** [Name]
**Milestones Completed:** [Count]
**Final Test Result:** PASS
**Performance:** FPS [value]
**Visual Changes:** [baseline status]
**Ready for Documentation:** YES
```

---

## Usage

**Automatic Invocation:**
- `/add-feature [name]` command
- Multi-phase feature request detected

**Manual Invocation:**
```
I need to implement [feature name] following the standard workflow
```

**Workflow Variants:**
- Bug Fix: Verify → Feature/Core → Verify → Docs
- Refactor: Architect → Feature/Core → Verify → Docs
- Performance: Verify (benchmark) → Core → Verify → Docs
