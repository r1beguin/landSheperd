# Bugfix: Cell Highlight Render Order

**Date:** 2025-12-09  
**Status:** ✅ Fixed  
**Priority:** High (Visual bug affecting UX)

## Problem

Cell highlighting was rendering **on top of plants** instead of **below them**. This created an incorrect visual layering where the white/green highlight overlay would obscure plants, making it difficult to see what was at the highlighted cell location.

### Visual Evidence

**Before Fix:**
- Cell highlight appeared over plants (incorrect)
- Plants were partially or fully obscured by highlight overlay
- Poor visual hierarchy

**After Fix:**
- Cell highlight appears between soil and plants (correct)
- Plants render on top of highlight
- Clear visual hierarchy: soil → highlight → plants

## Root Cause

In `js/core/main_graphics.js`, the `renderEntities()` method had incorrect render order:

```javascript
// BEFORE (incorrect):
renderEntities(viewMatrix) {
    // 1. Soil
    this.soilManager.renderSoil(...);
    
    // 2. Plants
    this.renderSystem.renderPlantsByLayer(...);
    
    // 3. Cell highlight (WRONG - renders OVER plants)
    this.renderSystem.renderCellHighlight(...);
    
    // 4. Particles
    // 5. Entities
}
```

This caused the highlight to be drawn **after** (on top of) plants.

## Solution

Reordered rendering to place cell highlight **between** soil and plants:

```javascript
// AFTER (correct):
renderEntities(viewMatrix) {
    // 1. Soil (background)
    this.soilManager.renderSoil(...);
    
    // 2. Cell highlight (on soil, before plants) ← MOVED HERE
    this.renderSystem.renderCellHighlight(...);
    
    // 3. Plants (on top of highlight)
    this.renderSystem.renderPlantsByLayer(...);
    
    // 4. Particles
    // 5. Entities
}
```

## Files Changed

### Modified
- `js/core/main_graphics.js` - Lines 839-861
  - Moved `renderCellHighlight()` call from position 3 to position 2
  - Updated comments to clarify render order

## Testing

### Verification
```bash
npm run verify
```

**Results:**
- ✅ PASS - No console errors
- ✅ FPS: 37 (above 30 threshold)
- ✅ Visual diff: 19.16% (within 40% threshold)
- ✅ WebGL: ok

### Manual Testing
1. Open game at `http://localhost:8081`
2. Right-click on any soil cell to open context menu
3. Observe cell highlight (white diamond in isometric mode)
4. **Expected:** Highlight appears **under** plants
5. **Actual:** ✅ Highlight correctly renders below plants

## Render Order Reference

The correct WebGL render order for Land Shepherd is:

```
Layer 1: Soil tiles (background)
Layer 2: Cell highlight overlay (grid interaction feedback)
Layer 3: Plants (bottom layer)
Layer 4: Plants (middle layer) 
Layer 5: Plants (top layer)
Layer 6: Weather particles (rain, splash)
Layer 7: Characters/entities
Layer 8: UI overlays (context menus, HUD)
```

**Key principle:** Interactive feedback (like cell highlight) should appear **on the game surface** but **below game objects** to avoid obscuring important information.

## Related Systems

- **RenderSystem** (`js/systems/render_system.js`) - Provides `renderCellHighlight()` method
- **InputManager** (`js/systems/input_manager.js`) - Triggers highlight on mouse hover
- **ContextMenuManager** - Shows context menu at highlighted cell

## Performance Impact

**None** - This is purely a render order change with no computational overhead.

- Render calls: Same (highlight was already rendering)
- Memory: Same (no new allocations)
- FPS: Same (~37 FPS maintained)

## Future Considerations

If additional interactive overlays are added (e.g., range indicators, selection boxes), they should follow the same principle:

**Render interactive feedback AFTER terrain but BEFORE entities**

This ensures:
1. Feedback is visible on the game surface
2. Game objects remain clearly visible
3. Visual hierarchy communicates interaction targets

## Lessons Learned

1. **Render order matters** - Z-ordering determines visual hierarchy
2. **Test visually** - Screenshot comparisons catch render order bugs
3. **Document render layers** - Clear comments prevent future regressions
4. **Feedback below content** - UX principle for overlays

## Sign-off

**Fixed by:** shepherd-architect  
**Verified:** npm run verify (PASS)  
**Documentation:** Updated in this file  
**Status:** Ready for production
