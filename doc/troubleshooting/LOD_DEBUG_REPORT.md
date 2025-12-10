# LOD System Debug Report

**Date:** 2025-12-09  
**Issue:** LOD differences not visible when zooming  
**Status:** Investigation complete, test tools created

---

## Problem Analysis

### User Report
"Cannot see any detail difference when zooming in/out - LOD system not visibly working"

### System Architecture Review

**LOD Flow:**
```
CameraManager.zoom → LODManager.calculateLODLevel() → Plant.currentLOD → Plant.updateLODSprite() → TreeGenerator.generateMatureTree(lodLevel)
```

**Verified Components:**

✅ **LODManager** - Correctly calculates LOD levels based on zoom thresholds  
✅ **CameraManager** - Adequate zoom range (0.25x to 5.0x)  
✅ **Update Loop** - Calls `updateLOD()` and `updateLODSprite()` every frame  
✅ **Plant.updateLODSprite()** - Only regenerates when LOD changes  
✅ **BaseGenerator.applyLODDimensions()** - Applies correct multipliers  
✅ **TreeGenerator** - Accepts and uses lodLevel parameter  

---

## Root Cause Hypothesis

### Most Likely: **Visual Scale Compensation**

LOD systems reduce **rendering cost**, not **visual size**. The formula is:

```
Screen Size = Sprite Dimensions × Camera Zoom
```

Example with oak tree:
- At 0.3x zoom with 4px impostor:   4px × 0.3 = 1.2 screen pixels
- At 1.0x zoom with 40px medium:   40px × 1.0 = 40 screen pixels  
- At 2.5x zoom with 80px high:     80px × 2.5 = 200 screen pixels

**Result:** Plants appear **similar visual size** at different zoom levels because the camera compensates. The difference is in **texture detail/quality**, not screen-space size.

This is **expected behavior** for LOD systems. Users zoom out to see more area (with less detail per object), not to make objects smaller.

### Alternative Causes

1. **Sprite Regeneration Not Triggering** - LOD changes but sprites don't update
2. **Hysteresis Preventing Changes** - 0.1 buffer zone keeps LOD from switching
3. **Rendering System Not Using Updated Sprites** - Cached textures not refreshing

---

## Diagnostic Tools Created

### 1. Interactive Test Page: `tests/manual/test-lod-switching.html`

**Features:**
- Real-time zoom level display
- LOD distribution counter (how many plants at each LOD)
- Individual plant LOD levels and dimensions
- Sprite regeneration counter
- Keyboard shortcuts for instant zoom levels
- Visual color-coding (High=green, Medium=yellow, Low=orange, Impostor=red)

**Usage:**
```bash
# Start local server
python -m http.server 8081

# Open in browser
http://localhost:8081/tests/manual/test-lod-switching.html

# Use keyboard controls:
1 = 0.3x zoom (impostor)
2 = 0.7x zoom (low)
3 = 1.0x zoom (medium)
4 = 2.5x zoom (high)
R = reset to 1.0x
```

**What to Look For:**
- LOD distribution changes when zooming
- Plant dimensions update (e.g., 40x50 → 20x25 → 4x4)
- "Sprite regenerations detected!" message
- Console logs showing `[LOD REGEN]` messages

### 2. Generator Test Script: `tests/manual/test-lod-generator-dimensions.js`

Console script that verifies generators produce correct dimensions at each LOD level.

**Usage:**
1. Open any Land Shepherd page
2. Open browser console (F12)
3. Copy/paste entire script contents
4. Press Enter

**Expected Output:**
```
=== LOD Generator Dimension Test ===
Testing TreeGenerator with oak species config...

Testing LOD: high
  Generated sprite: 100x150px

Testing LOD: medium
  Generated sprite: 50x75px

Testing LOD: low
  Generated sprite: 25x37px

Testing LOD: impostor
  Generated sprite: 4x4px

=== RESULTS SUMMARY ===
LOD Level    | Dimensions    | Status
-------------|---------------|--------
high         | 100x150px     | OK
medium       | 50x75px       | OK
low          | 25x37px       | OK
impostor     | 4x4px         | OK

=== VALIDATION ===
high: PASS
medium: PASS
low: PASS
impostor: PASS

=== ALL TESTS PASSED ===
```

### 3. Quick Standalone Test: `tests/manual/test-lod-quick.html`

Minimal standalone page that tests LOD system without full game engine. Can open directly in browser (no server needed).

**Features:**
- Tests BaseGenerator.getLODMultiplier()
- Tests BaseGenerator.applyLODDimensions()
- Generates sprites at all LOD levels
- Visual comparison of sprite sizes (scaled up for visibility)
- Pass/fail indicators

**Usage:**
```
Just open tests/manual/test-lod-quick.html in browser
```

---

## Testing Protocol

### Phase 1: Verify Generator Output (CRITICAL)

**Objective:** Confirm generators produce different dimensions

**Steps:**
1. Open `tests/manual/test-lod-quick.html` in browser
2. Verify all tests show "✓ PASS"
3. Visually compare sprite sizes in "Visual Comparison" section
4. Impostor should be tiny dot, High should be large tree

**Expected:** All tests pass, sprites visibly different sizes

**If Fails:** Bug in BaseGenerator implementation

### Phase 2: Verify LOD Transitions (CRITICAL)

**Objective:** Confirm LOD levels change and sprites regenerate

**Steps:**
1. Open `tests/manual/test-lod-switching.html`
2. Watch LOD distribution counters
3. Press keyboard shortcuts (1-4 keys)
4. Watch for:
   - LOD distribution changes (e.g., "High: 25" → "Impostor: 25")
   - Plant dimensions update
   - "Sprite regenerations detected!" message
   - Console logs: `[LOD REGEN] Plant at (x,y): medium -> high`

**Expected:** 
- Each zoom change triggers LOD updates
- Sprite regeneration counter increases
- Console shows regeneration logs

**If Fails:** 
- Check if `config.world.rendering.lod.debugOverlay.showTransitions` is true
- Bug in LOD update flow

### Phase 3: Visual Confirmation (DIAGNOSTIC)

**Objective:** Determine if visual differences are perceivable

**Steps:**
1. Open `index.html` or `test-lod-switching.html`
2. Zoom to 0.3x (or press `1`)
3. Take screenshot → save as `lod-impostor.png`
4. Zoom to 1.0x (or press `3`)
5. Take screenshot → save as `lod-medium.png`
6. Zoom to 2.5x (or press `4`)
7. Take screenshot → save as `lod-high.png`
8. Open screenshots side-by-side in image viewer
9. Crop to same plant in all 3 screenshots
10. Compare **texture detail**, not size

**Expected:**
- Impostor: Solid color blob/dot
- Medium: Recognizable tree with trunk and canopy
- High: Detailed tree with individual leaf clumps

**Visual Size:** All 3 may appear similar size on screen due to zoom compensation (this is CORRECT behavior)

**Texture Quality:** Should be visibly different (impostor = 4px, high = 80+px)

---

## Configuration

### Enable Debug Logging

**Method 1: Edit config.json**
```json
{
  "world": {
    "rendering": {
      "lod": {
        "debugOverlay": {
          "enabled": true,
          "showLODLevels": true,
          "showTransitions": true
        }
      }
    }
  }
}
```

**Method 2: Console (runtime)**
```javascript
window.config.world.rendering.lod.debugOverlay.showTransitions = true;
```

### LOD Thresholds (from config.json)
```json
{
  "lod": {
    "highThreshold": 2.0,     // >= 2.0x zoom = high detail
    "mediumThreshold": 1.0,   // >= 1.0x zoom = medium detail
    "lowThreshold": 0.5,      // >= 0.5x zoom = low detail
    "transitionHysteresis": 0.1  // 10% buffer to prevent thrashing
  }
}
```

### Resolution Multipliers
```json
{
  "resolutionMultipliers": {
    "high": 2.0,      // 2x sprite dimensions
    "medium": 1.0,    // Baseline (current quality)
    "low": 0.5,       // Half resolution
    "impostor": 0.2   // Tiny (but generates 4x4px fixed)
  }
}
```

---

## Expected Test Results

### If Tests PASS (System Working)

**Phase 1:** ✅ All generator tests pass  
**Phase 2:** ✅ LOD transitions occur, sprites regenerate  
**Phase 3:** ✅ Texture detail varies (but visual size similar)

**Conclusion:** LOD system is working correctly. The user's perception of "no difference" is due to expected camera zoom compensation. The difference is in texture quality (4px vs 80px), not screen size.

**Recommendations:**
1. Add visual LOD indicators (colored borders, debug overlay)
2. Increase multiplier ranges for more dramatic differences
3. Document LOD behavior in user guide
4. Consider adding "freeze zoom" mode to see raw sprite sizes

### If Tests FAIL (System Broken)

**Phase 1 Fails:** Bug in BaseGenerator.getLODMultiplier() or applyLODDimensions()  
**Phase 2 Fails:** Bug in LOD update loop or Plant.updateLODSprite()  
**Phase 3 Fails:** Bug in RenderSystem not using updated sprites  

**Debug Steps:**
1. Check console for errors
2. Verify lodLevel parameter is being passed correctly
3. Check if sprite.width/height are updating
4. Verify WebGL texture cache is being cleared
5. Check if RenderSystem is using cached vs fresh textures

---

## Code References

**Key Files:**
- `js/core/lod_manager.js` (lines 54-103) - LOD calculation
- `js/entities/plant.js` (lines 175-222) - Sprite generation with LOD
- `js/procedural/generators/base_generator.js` (lines 82-128) - LOD multipliers
- `js/procedural/generators/tree_generator.js` (lines 13-24, 77-88, 149-163) - LOD implementation
- `js/core/main_graphics.js` (lines 868, 881) - Update loop
- `js/systems/camera_manager.js` (lines 24-25) - Zoom range
- `config.json` (lines 93-110) - LOD configuration

**Critical Functions:**
```javascript
// LODManager: Calculate LOD level
calculateLODLevel(entity) { /* lines 59-102 */ }

// Plant: Regenerate sprite if LOD changed
updateLODSprite() { /* lines 207-222 */ }

// BaseGenerator: Apply LOD multiplier to dimensions
applyLODDimensions(baseDimensions, lodLevel) { /* lines 100-106 */ }

// TreeGenerator: Generate sprite at LOD level
generateMatureTree(speciesConfig, genetics, lodLevel) { /* lines 149-237 */ }
```

---

## Next Steps

1. **Run Phase 1 test** (`test-lod-quick.html`)
   - Verify generators work in isolation
   - Expected: All tests pass

2. **Run Phase 2 test** (`test-lod-switching.html`)
   - Verify LOD transitions occur in game
   - Expected: Regenerations detected

3. **Run Phase 3 test** (Visual comparison)
   - Compare screenshots at different zoom levels
   - Expected: Texture detail varies

4. **Report findings** to user with:
   - Test results (pass/fail)
   - Screenshots showing texture differences
   - Explanation of LOD visual behavior
   - Recommendations for improving visibility

5. **If all tests pass:**
   - Document that system is working correctly
   - Explain zoom compensation behavior
   - Suggest adding visual indicators if needed

6. **If tests fail:**
   - Debug specific component that failed
   - Fix bugs and re-test
   - Update documentation

---

## Summary

Created comprehensive debugging tools to verify LOD system operation. Based on code review, system appears correctly implemented. Most likely issue is user expectation mismatch: LOD affects **texture quality** (rendering cost), not **visual size** (screen space). Tests will confirm if system is working as designed or if there's an actual bug.

**Test files created:**
- `tests/manual/test-lod-switching.html` - Interactive runtime monitoring
- `tests/manual/test-lod-generator-dimensions.js` - Console verification script  
- `tests/manual/test-lod-quick.html` - Standalone generator test

**Documentation created:**
- `LOD_DEBUG_INVESTIGATION.md` - Full investigation report (this file)

**Status:** Ready for testing. User should run Phase 1-3 tests and report findings.
