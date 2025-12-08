# BUGFIX: Right-Click Context Menu Not Working in Isometric Mode

**Date:** 2025-12-08  
**Status:** ✅ FIXED  
**Milestone:** Milestone 4 - Isometric Input Handling  

## Problem

User reported that right-click was not working in isometric mode:
- Isometric map renders correctly ✓
- Character movement works normally ✓
- Right-clicking on tiles does NOT show context menu ✗
- This blocked the core planting feature

## Root Cause Analysis

The issue was in `js/core/soil_manager.js` in the `renderIsometricSoils()` method.

### The Bug

When rendering in isometric mode, the code collected visible soils into a local `visibleSoils` array but **never updated** `this.visibleCells`. Meanwhile, the right-click handler in `main_graphics.js` called `isSoilCurrentlyVisible()` which checks if a soil cell exists in `this.visibleCells`:

```javascript
// soil_manager.js - line 332
isSoilCurrentlyVisible(gridX, gridY) {
    // Check if this soil cell is in the current visible cells array
    return this.visibleCells.some(soil => 
        soil.gridX === gridX && soil.gridY === gridY
    );
}
```

In isometric mode, `this.visibleCells` remained empty, so this check always returned `false`, preventing the context menu from appearing.

### Why It Worked in Orthographic Mode

In orthographic mode, `renderOrthographicSoils()` explicitly calls `updateVisibleCells()` which populates `this.visibleCells`. Isometric mode had its own visibility calculation but didn't update the shared cache.

## The Fix

**File:** `js/core/soil_manager.js`  
**Line:** 452 (added)  

Added a single line to update the visible cells cache in the isometric rendering path:

```javascript
// Update the visible cells cache for context menu checks
this.visibleCells = visibleSoils;
```

This ensures that the visibility check used by the context menu system has access to the current frame's visible tiles, regardless of projection mode.

## Changes Made

### Modified Files

1. **js/core/soil_manager.js** - Added `this.visibleCells = visibleSoils;` in `renderIsometricSoils()`
2. **tests/isometric-rightclick-fix.spec.js** - NEW test validating the fix
3. **playwright.config.js** - Added `TEST_RIGHTCLICK_FIX` environment variable
4. **package.json** - Added `test:rightclick-fix` NPM script

### No Debug Logs

Initial investigation used temporary console.log statements to trace execution, but all debug logs were removed after identifying the root cause.

## Testing

### Manual Testing Steps

1. Open game at http://localhost:8081
2. Verify isometric projection mode is active (diamond-shaped tiles)
3. Right-click on any visible tile
4. **Expected:** Context menu appears with soil nutrient information
5. **Expected:** Diamond-shaped cell highlight appears on clicked tile
6. Press Escape to close menu
7. Right-click on different tile
8. **Expected:** Menu updates with new tile's information

### Automated Tests

Created comprehensive test suite in `tests/isometric-rightclick-fix.spec.js`:

**Test 1:** Context menu appearance
- ✓ Game initializes in isometric mode
- ✓ Right-click triggers context menu
- ✓ Menu shows soil nutrients section
- ✓ Menu title shows either "Empty Soil" or "Cell (X, Y)"
- ✓ Visible cells are tracked (2500 cells)
- ✓ ESC key closes menu
- ✓ Clicking different tile updates menu

**Test 2:** Cell highlighting
- ✓ Right-click sets cell highlight
- ✓ Highlight coordinates are set correctly
- ✓ Diamond highlight renders

**Run command:** `npm run test:rightclick-fix`

### Verification Results

```
Status: ✅ PASS
Console Errors: 0
Console Warnings: 5 (within threshold)
Average FPS: 38 (target: 30+)
Load Time: 1033ms (target: <3000ms)
Visual Diff: 28.6% (threshold: 40%)
```

## Impact

- **User-Facing:** Right-click context menu now works correctly in isometric mode
- **Gameplay:** Planting system is fully functional
- **Performance:** No performance impact (cache was already computed)
- **Milestone:** Unblocks Milestone 4 completion

## Related Systems

- **InputManager** - Captures right-click events ✓
- **CameraManager** - Converts screen→world coordinates ✓
- **IsometricUtils** - Converts world→grid coordinates ✓
- **SoilManager** - Visibility checking (FIXED)
- **ContextMenuManager** - Displays menu ✓

## Prevention

This type of bug (inconsistent cache state between rendering paths) can be prevented by:

1. **Single source of truth:** Ensure visibility calculations update the same cache
2. **Shared methods:** Consider extracting visibility logic into a shared method
3. **Testing both modes:** Always test features in both orthographic and isometric projections
4. **Documentation:** Document cache dependencies clearly

## Conclusion

The fix was a one-line change that aligned the isometric rendering path with the orthographic path's visibility caching strategy. All tests pass, and the feature is now fully functional.

**Verified by:** shepherd-feature  
**Test Results:** 2/2 tests passing
