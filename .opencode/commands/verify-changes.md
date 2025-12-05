---
name: verify-changes
description: Run comprehensive verification workflow after code changes
usage: /verify-changes [mode]
agent: shepherd-verify
parameters:
  - name: mode
    description: Verification mode to run
    required: false
    default: "full"
    options:
      - quick
      - full
      - visual
      - logs
---

# Verify Changes Command

Automatically triggers **shepherd-verify** to run appropriate test command and parse results.

## What This Does

When you invoke `/verify-changes`, the shepherd-verify agent will:

1. **Run Test Command**
   - `quick`: npm run verify (standard, fast)
   - `full`: npm run verify:interactive (comprehensive with screenshots)
   - `visual`: npm run verify:screenshot-only (visual capture only)
   - `logs`: npm run verify:log-only (console analysis only)

2. **Parse Results**
   - Read test-results/latest/report.json
   - Analyze metrics: console_errors, fps_average, webgl_context
   - Compare screenshots if visual mode
   - Review console.json for GL errors

3. **Analyze Failures** (if any)
   - Categorize by type (console errors, FPS, visual, WebGL)
   - Provide specific error messages and file:line locations
   - Offer hypothesis about cause
   - Recommend fix approach

4. **Report Results**
   - PASS or FAIL with metrics
   - Visual comparison results
   - Recommendations for next steps
   - Baseline decision if needed

## Modes

### quick
```
/verify-changes quick
```
Fast verification (2-3 seconds):
- Console error check
- FPS measurement (5 seconds)
- WebGL context status
- No screenshots

**Use when:** Small code changes, quick iteration testing

### full (default)
```
/verify-changes full
```
or simply
```
/verify-changes
```
Comprehensive verification (10-15 seconds):
- All quick checks
- Screenshot capture at multiple checkpoints
- Visual comparison against baseline
- Game metrics collection
- Interaction simulations

**Use when:** Feature complete, milestone validation, creating baseline

### visual
```
/verify-changes visual
```
Visual validation only:
- Screenshot capture
- Pixel comparison vs baseline
- Visual diff image generation
- No FPS or console checks

**Use when:** Verifying visual changes, shader tweaks, texture updates

### logs
```
/verify-changes logs
```
Console analysis only:
- Console error parsing
- Warning review
- Log pattern matching
- No screenshots or FPS

**Use when:** Debugging console errors, checking initialization logs

## Example Output

```markdown
TEST SUCCESS REPORT

**Test Command:** npm run verify:interactive
**Result:** PASS
**Timestamp:** 2025-12-05T14:30:00Z

**Metrics:**
- Console errors: 0
- Console warnings: 2 (texture loading - acceptable)
- FPS average: 58
- FPS range: 45-62
- WebGL context: ok
- Load time: 920ms
- Visual diff: 2.1% (within threshold)

**Validation Checkpoints:**
✓ Functional validation passed
✓ Performance within targets
✓ No console errors
✓ Visual changes acceptable

**Baseline Status:**
- Compared against baseline: YES
- Pixel difference: 2.1%
- Verdict: PASS (under 5% threshold)

**Recommendations:**
✓ All validation criteria met
✓ Ready to proceed to next milestone
```

## When to Use

- ✅ After every code change (mandatory)
- ✅ Before claiming milestone complete
- ✅ When debugging console errors
- ✅ To check FPS after optimization
- ✅ Before creating new baseline
- ❌ NOT before making changes (test AFTER)
- ❌ NOT for planning (use /add-feature)

## Related Commands

- `/add-feature` - Plan new feature with testing strategy
- `/review-code` - Review code for issues before testing
- `/document` - Update docs after tests pass
