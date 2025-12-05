---
name: review-code
description: Architectural code review for performance, modularity, and best practices
usage: /review-code [file-path]
agent: shepherd-architect
parameters:
  - name: file-path
    description: Path to file or directory to review
    required: false
    example: "js/core/plant_manager.js"
---

# Review Code Command

Automatically triggers **shepherd-architect** for comprehensive code review.

## What This Does

When you invoke `/review-code js/core/plant_manager.js`, the shepherd-architect agent will:

1. **Architecture Compliance**
   - Check manager patterns are followed
   - Verify entity interfaces correctly implemented
   - Ensure proper separation of concerns
   - Validate initialization order and dependencies

2. **Performance Analysis**
   - Identify potential bottlenecks
   - Check for allocations in render/update loops
   - Verify batching opportunities utilized
   - Assess memory management

3. **Code Quality**
   - Review naming conventions (snake_case files, PascalCase classes)
   - Check error handling (console.error for critical, console.warn for non-critical)
   - Verify JSDoc on public methods
   - Ensure "why" comments for complex logic

4. **Integration Review**
   - Validate config.json usage
   - Check manager coordination
   - Verify entity lifecycle management
   - Assess testing coverage

5. **Recommendations**
   - Provide specific improvement suggestions
   - Prioritize issues (critical, important, nice-to-have)
   - Suggest refactoring opportunities
   - Identify technical debt

## Review Scope

### Single File Review
```
/review-code js/core/plant_manager.js
```
Deep review of specific file:
- All methods and logic
- Class structure
- Dependencies
- Performance characteristics

### Directory Review
```
/review-code js/core/
```
Broader architectural review:
- Manager interactions
- Shared patterns
- Consistency across files
- Integration points

### No Path (Current Context)
```
/review-code
```
Review recent changes in current context:
- Files modified in session
- Related dependencies
- Impact analysis

## Example Output

```markdown
## Code Review: js/core/plant_manager.js

### Architecture Assessment: ✓ GOOD

**Strengths:**
- Properly implements manager pattern
- Clear separation: PlantManager handles collection, Plant entity handles behavior
- Initialization order correct (after SoilManager)
- Config.json integration clean

**Issues:**
None critical

### Performance Assessment: ⚠ NEEDS ATTENTION

**Issues Found:**

1. **IMPORTANT: Allocation in update loop** (line 142)
   ```javascript
   // Current (allocates array every frame)
   const nearbyPlants = this.plants.filter(p => distance(p, plant) < 5);
   ```
   
   **Impact:** 60 allocations/frame with 60 plants = GC pressure
   
   **Recommendation:**
   ```javascript
   // Pre-allocate and reuse
   this._nearbyBuffer = this._nearbyBuffer || [];
   this._nearbyBuffer.length = 0;
   for (const p of this.plants) {
       if (distance(p, plant) < 5) this._nearbyBuffer.push(p);
   }
   ```

2. **NICE-TO-HAVE: Spatial partitioning** (lines 140-150)
   **Issue:** O(n²) plant proximity checks
   **Impact:** Becomes bottleneck with 200+ plants
   **Recommendation:** Implement grid-based spatial partitioning

### Code Quality Assessment: ✓ GOOD

**Strengths:**
- JSDoc complete on public methods
- Error handling appropriate
- Naming conventions followed

**Minor Issues:**
- Line 87: Comment says "what" not "why"
- Line 200: Magic number 0.5 (should be config parameter)

### Integration Assessment: ✓ GOOD

**Validated:**
- ✓ SoilManager dependency correctly used
- ✓ Entity interface implemented by Plant class
- ✓ Config.json parameters all documented
- ✓ No circular dependencies

### Recommendations Priority

**Critical (Fix Now):**
None

**Important (Fix Before Next Feature):**
1. Remove allocation in update loop (line 142) - FPS impact

**Nice-to-Have (Future Improvement):**
1. Spatial partitioning for >200 plants
2. Magic number 0.5 to config
3. Improve comment quality

### Overall: 8/10
Plant manager is well-structured with good practices. One performance issue needs addressing before scaling plant count. No architectural concerns.
```

## When to Use

- ✅ Before merging major features
- ✅ When FPS drops unexpectedly
- ✅ After refactoring
- ✅ For performance-critical code
- ✅ When unsure about approach
- ❌ NOT for trivial changes
- ❌ NOT instead of testing (use /verify-changes)
- ❌ NOT for documentation review

## Related Commands

- `/add-feature` - Get architectural guidance before implementing
- `/verify-changes` - Test after addressing review feedback
- `/document` - Update docs after refactoring
