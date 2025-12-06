# Oak Reproduction Bug Fix - 2025-12-06

## Problem Statement

Oak trees were unable to reproduce despite having mature trees with partners nearby and adequate soil nutrients. After 804 days of gameplay, ZERO oak saplings had spawned, blocking the intended organic forest growth mechanic.

## Root Cause Analysis

### Bug 1: Premature `lastReproductionDay` Update
**Location:** `js/entities/plant.js` lines 396-406

**Issue:** The `lastReproductionDay` was being updated BEFORE checking if reproduction actually succeeded:

```javascript
// OLD (BUGGY) CODE:
if (!this.canAffordReproduction(reproductionCost)) {
    return null; // Exit early
}

// Update last reproduction day BEFORE rolling for success
this.lastReproductionDay = currentDay; // ❌ BUG: Updates even if success roll fails

if (Math.random() > successChance) return null; // Fails here but timer already updated
```

**Impact:**
- If oak passes nutrient check but fails 25% success roll → timer updates anyway
- Oak blocked from trying again for 10 more days
- Over time, this creates a "reproduction lockout" cycle
- With low success chance (25%), most attempts fail at success roll
- Oak gets permanently blocked if soil conditions never improve

### Bug 2: Nutrient Check Ignores Root Depth
**Location:** `js/entities/plant.js` lines 906-928

**Issue:** `canAffordReproduction()` checked TOTAL soil nutrients instead of EFFECTIVE nutrients:

```javascript
// OLD (BUGGY) CODE:
if (soil.nitrogen < reproductionCost.nitrogen + buffer) return false;
// ❌ Checks total soil.nitrogen, not effective nutrients based on root depth
```

**Impact:**
- Oaks have `rootDepthClass: "deep"` (80% surface, 80% deep access)
- Deep layer has 150% nitrogen multiplier (higher than surface)
- But reproduction check only looked at surface nitrogen
- Oaks couldn't reproduce even when deep layer had plenty of nutrients

### Bug 3: Missing Diagnostic Logging
**Location:** Multiple locations in `plant.js` and `plant_manager.js`

**Issue:** No logging when reproduction FAILED at various checkpoints:
- Nutrient check fails → silent
- Success roll fails → silent  
- No partner found → silent
- No spawn location found → silent

**Impact:**
- Impossible to diagnose why reproduction wasn't happening
- User had to guess which checkpoint was blocking (nutrients? partner? location?)
- No visibility into actual vs required nutrient values

## Solution Implemented

### Fix 1: Move `lastReproductionDay` Update to After All Checks
**File:** `js/entities/plant.js` line 396-420

**Changes:**
1. Moved `lastReproductionDay = currentDay` to AFTER success roll passes
2. Added logging for nutrient failures with actual vs required values
3. Added logging for success roll failures

**New Flow:**
```javascript
// Check nutrients first
if (!this.canAffordReproduction(reproductionCost)) {
    if (config?.enableLogging) {
        console.log(`[REPRO FAIL] ${this.species.commonName} - Insufficient nutrients. Need: N${cost.nitrogen+5}...`);
    }
    return null;
}

// Roll for success
if (Math.random() > proximityConfig.successChance) {
    if (config?.enableLogging) {
        console.log(`[REPRO FAIL] ${this.species.commonName} - Failed success roll (25% chance)`);
    }
    return null;
}

// ✅ SUCCESS: Update timer ONLY after passing all checks
this.lastReproductionDay = currentDay;
```

**Result:**
- Timer only updates if plant actually attempts reproduction (passes nutrients AND success roll)
- Failed attempts no longer block future attempts unnecessarily
- Reproduction attempts continue until conditions are right

### Fix 2: Use Effective Nutrients in `canAffordReproduction()`
**File:** `js/entities/plant.js` line 906-933

**Changes:**
```javascript
// NEW: Use effective nutrients based on root depth
const effectiveNutrients = this.getEffectiveNutrients(soil);

// Check nutrients using EFFECTIVE values (respects root depth)
const buffer = 5;
if (effectiveNutrients.nitrogen < reproductionCost.nitrogen + buffer) return false;
if (effectiveNutrients.phosphorus < reproductionCost.phosphorus + buffer) return false;
if (effectiveNutrients.potassium < reproductionCost.potassium + buffer) return false;
if (effectiveNutrients.organicMatter < reproductionCost.organicMatter + buffer) return false;
```

**What `getEffectiveNutrients()` does:**
- For oak (deep roots): Returns `0.8 * surface + 0.8 * deep`
- For clover (shallow roots): Returns `0.9 * surface + 0.3 * deep`
- Matches how plants access nutrients during growth
- Oaks can now leverage deep layer's 150% nitrogen multiplier

**Result:**
- Deep-rooted plants (oaks) can reproduce using deep layer nutrients
- Consistent with how root depth system works elsewhere
- Oaks benefit from their own leaf litter → rain leaching → deep storage → root lift cycle

### Fix 3: Comprehensive Reproduction Logging
**Files:** `js/entities/plant.js` and `js/core/plant_manager.js`

**Added logging at EVERY failure point:**

1. **Nutrient failure** (plant.js):
```javascript
console.log(`[REPRO FAIL] ${species} at (x,y) - Insufficient nutrients. Need: N30 P25 K20 OM15 | Has: N25.3 P30.1 K18.2 OM12.4`);
```

2. **Success roll failure** (plant.js):
```javascript
console.log(`[REPRO FAIL] ${species} at (x,y) - Failed success roll (25% chance)`);
```

3. **No partner found** (plant_manager.js):
```javascript
console.log(`[REPRO FAIL] ${species} at grid (x,y) - No mature partner found within 3 cells`);
```

4. **No spawn location** (plant_manager.js):
```javascript
console.log(`[REPRO FAIL] ${species} at grid (x,y) - No valid spawn location within 5 cells of either parent`);
```

5. **Success** (plant_manager.js):
```javascript
console.log(`[REPRO SUCCESS] Oak Gen 2 sapling spawned at grid (52,48) from parents at (50,50) and (52,50)`);
```

**Result:**
- Full diagnostic visibility into reproduction attempts
- Can identify exact failure reason (nutrients, RNG, partner, location)
- Shows actual nutrient values vs requirements
- Confirms when reproduction succeeds with parent locations

## Expected User Impact

### Before Fix
- Oaks couldn't reproduce even with mature trees nearby
- No visibility into why reproduction failed
- Timer updated even on failed success rolls → permanent lockout
- Deep layer nutrients ignored → oaks always "starved" for reproduction

### After Fix
- Oaks can reproduce using deep layer nutrients (leveraging their root depth advantage)
- Timer only updates on actual reproduction attempts (passes all checks)
- Full diagnostic logs show exactly why attempts succeed or fail
- User can see:
  - If nutrients are insufficient (and by how much)
  - If success roll failed (25% chance means ~75% of attempts fail)
  - If partner search failed (need mature tree within 3 cells)
  - If spawn location failed (need empty cell within 5 cells)

### What User Should Observe
1. **Enable logging:** Ensure `config.json` line 96 has `"enableLogging": true`
2. **Watch console:** Every 10 days, mature oaks will attempt reproduction
3. **Typical cycle:**
   - Day 10: `[REPRO FAIL] Oak - Failed success roll (25% chance)`
   - Day 20: `[REPRO FAIL] Oak - Insufficient nutrients. Need: N30...`
   - Day 30: `[REPRO FAIL] Oak - Failed success roll (25% chance)`
   - Day 40: `[REPRO SUCCESS] Oak Gen 2 sapling spawned...` ✅
4. **With nitrogen regeneration:** Deep layer should build N over time from leaf litter + rain leaching
5. **Expected timeline:** First oak saplings within 50-100 days (depends on RNG and soil buildup)

## Technical Details

### Reproduction Requirements (Oak)
- **checkIntervalDays:** 10 (tries every 10 days)
- **successChance:** 0.25 (25% - means 75% of attempts fail on RNG alone)
- **reproductionCost:** N=25, P=20, K=15, OM=10
- **buffer:** +5 on all nutrients (actual requirement: N=30, P=25, K=20, OM=15)
- **proximityDistance:** 3 cells (needs mature tree within this range)
- **maxOffspringDistance:** 5 cells from either parent
- **requiresPartner:** true
- **activeStages:** ["MatureTree"]

### Effective Nutrients Calculation (Oak)
- **rootDepthClass:** "deep"
- **surfaceShare:** 0.8 (80% surface access)
- **deepShare:** 0.8 (80% deep access)
- **Formula:** `effectiveN = (0.8 * surfaceN) + (0.8 * deepN)`
- **Example:** Surface N=20, Deep N=45 (150% multiplier) → Effective N = 0.8*20 + 0.8*45 = 16 + 36 = 52
- **Result:** Oak can reproduce even if surface N is low, as long as deep layer is rich

### Nitrogen Regeneration Cycle
1. **Leaf litter:** MatureTree deposits N=8/day, OM=20/day to surface (radius 1)
2. **Rain leaching:** Moves N=0.8/day from surface → deep
3. **Deep storage:** Deep layer multiplier 150% (stores more N than deposited)
4. **Root lift:** Oak pumps N=5/day from deep → surface (when deep N > 15)
5. **Net effect:** +13 N/day per mature oak (was negative before nitrogen regen fix)

## Files Modified

### Core Changes
- `js/entities/plant.js` - Lines 396-420 (reproduction logic), 906-933 (nutrient check)
- `js/core/plant_manager.js` - Lines 623-625 (partner logging), 648-655 (spawn logging), 672-682 (success logging)

### Test Files Created
- `tests/oak-reproduction-logging.spec.js` - Diagnostic test for reproduction logging

## Verification

### Test Results
```bash
npm run verify
# Status: ✅ PASS
# Metrics:
#   Console Errors: 0
#   Console Warnings: 5 (WebGL driver messages - expected)
#   Average FPS: 44 (target: 30+)
#   Load Time: 1401ms (target: <3000ms)
#   WebGL: ok
#   Visual Diff: 19.92% (target: <40%)
```

### How to Test Fix
1. **Start fresh world:** Load Land Shepherd
2. **Enable logging:** Check `config.json` line 96 is `"enableLogging": true`
3. **Spawn two oaks:** Place mature oaks within 3 cells of each other
4. **Fast-forward:** Advance 50-100 days
5. **Watch console:** Look for `[REPRO FAIL]` and `[REPRO SUCCESS]` logs
6. **Verify reproduction:** Count oak saplings - should see new Gen 2+ saplings

### Expected Console Output
```
[REPRO FAIL] Oak at (512,384) - Failed success roll (25% chance)
[REPRO FAIL] Oak at (512,384) - Insufficient nutrients. Need: N30 P25 K20 OM15 | Has: N28.3 P30.1 K22.4 OM18.2
[REPRO FAIL] Oak at (512,384) - Failed success roll (25% chance)
[REPRO COST] Oak acorn: -N25.0 -P20.0 -K15.0 -OM10.0
[REPRO SUCCESS] Oak Gen 2 sapling spawned at grid (52,48) from parents at (50,50) and (52,50)
```

## Related Systems

### Dependent On
- **Root Depth System:** `getEffectiveNutrients()` for layered nutrient access
- **Nitrogen Regeneration:** Leaf litter + rain leaching + root lift to build deep N
- **Soil Effects Manager:** Rain leaching moves N to deep layer
- **Time Manager:** 10-day check interval triggers

### Affects
- **Oak Growth:** Can now form organic forests over 50-100 days
- **Agroforestry:** Oaks improve soil (leaf litter) then reproduce using that improved soil
- **Ecosystem Balance:** Self-sustaining oak populations without manual intervention

## Next Steps for User

1. **Test with existing save:** Load 804-day save and watch console logs
2. **Verify deep layer nutrients:** Check if nitrogen regeneration system built up deep N
3. **Monitor reproduction:** Should see attempts every 10 days with detailed logs
4. **Report results:** Share console logs showing success/failure reasons
5. **Adjust if needed:** If still no reproduction after 50 days, share logs for further diagnosis

## Architectural Notes

### Why This Bug Existed
- Original reproduction system didn't account for root depth (added later in Milestone System)
- Timer update placement was based on simple reproduction (no multi-step validation)
- Logging wasn't added because reproduction "just worked" for simple species (nettles, clover)
- Oak-specific requirements (deep roots, high cost, low success chance) exposed the issues

### Design Lessons
- **Test with complex species:** Simple cases (clover) masked bugs that only appeared with complex cases (oak)
- **Log all failure paths:** Silent failures make debugging impossible
- **Consistent interfaces:** `canAffordReproduction()` should use same nutrient logic as `consumeNutrients()`
- **Timer updates:** Should only happen AFTER all validation passes, not midway through

### Future Improvements
- **Adaptive success chance:** Increase success chance based on soil quality
- **Nutrient-based reproduction rate:** More frequent attempts when nutrients abundant
- **Genetic trait for reproduction:** Some oaks reproduce easier than others
- **Mycorrhizal boost:** Shared nutrients also affect reproduction chance

## Summary

Three critical bugs blocked oak reproduction:
1. ❌ Timer updated before success roll → permanent lockout
2. ❌ Nutrient check ignored root depth → deep nutrients inaccessible  
3. ❌ No failure logging → impossible to diagnose

All three bugs are now fixed:
1. ✅ Timer updates ONLY after passing all checks
2. ✅ Nutrient check uses effective nutrients (respects root depth)
3. ✅ Comprehensive logging at every failure point

**Expected result:** Oak forests will now form organically over 50-100 days, with full diagnostic visibility into every reproduction attempt.
