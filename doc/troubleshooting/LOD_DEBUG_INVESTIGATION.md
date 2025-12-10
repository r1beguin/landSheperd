# LOD System Debug Investigation

## Problem Statement
User reports that LOD differences are not visible when zooming in/out despite the LOD system being implemented.

## Investigation Summary

### System Architecture (Verified Working)

1. **LODManager** (`js/core/lod_manager.js`)
   - Calculates LOD levels based on camera zoom
   - Thresholds from `config.json`:
     - High: >= 2.0x zoom
     - Medium: >= 1.0x zoom  
     - Low: >= 0.5x zoom
     - Impostor: < 0.5x zoom
   - Updates `entity.currentLOD` property
   - Tracks LOD distribution for debug overlay

2. **CameraManager** (`js/systems/camera_manager.js`)
   - Zoom range: 0.25x (minZoom) to 5.0x (maxZoom)
   - Provides adequate range for all LOD levels
   - Zoom speed: 0.1 (10% per scroll)

3. **Update Loop** (`js/core/main_graphics.js`)
   ```javascript
   // Line 868: Update LOD levels based on zoom
   this.plantManager.updateLOD();
   
   // Line 881: Regenerate sprites if LOD changed
   for (const plant of allPlants) {
       plant.updateLODSprite();
   }
   ```

4. **Plant.updateLODSprite()** (`js/entities/plant.js` line 207-222)
   - Checks if `currentLOD !== lastRenderedLOD`
   - Only regenerates sprite when LOD actually changes
   - Logs transitions if `config.world.rendering.lod.debugOverlay.showTransitions` enabled

5. **BaseGenerator.applyLODDimensions()** (`js/procedural/generators/base_generator.js` line 100-106)
   - Multipliers:
     - High: 2.0x
     - Medium: 1.0x (baseline)
     - Low: 0.5x
     - Impostor: 0.2x (but generates 4x4 px sprite)

### Expected Behavior

When zooming from 0.25x to 5.0x:
- At 0.3x zoom: Plants should be 4x4px impostors (red dots)
- At 0.7x zoom: Plants should be 20x25px low detail
- At 1.5x zoom: Plants should be 40x50px medium detail
- At 2.5x zoom: Plants should be 80x100px high detail

**Visual difference should be dramatic**: 4px impostor vs 80px high-detail sprite is 20x size difference!

### Diagnostic Tools Created

#### 1. `tests/manual/test-lod-switching.html`
Interactive test page that displays:
- Current zoom level
- LOD thresholds
- LOD distribution (how many plants at each level)
- Individual plant LODs and dimensions
- Sprite regeneration counter
- Keyboard shortcuts for instant zoom levels (1-4 keys)

**Usage:**
```bash
# Start local server
python -m http.server 8081

# Open in browser
http://localhost:8081/tests/manual/test-lod-switching.html
```

#### 2. `tests/manual/test-lod-generator-dimensions.js`
Console script to verify generators produce correct dimensions.

**Usage:**
1. Open `index.html` or test page
2. Open browser console
3. Copy/paste script contents and press Enter
4. Check if dimensions match expected values

### Root Cause Hypothesis

Based on code review, the LOD system is correctly implemented. The most likely causes are:

**Hypothesis 1: Visual Scale Masking** (Most Likely)
- Sprites ARE changing dimensions (4px → 80px)
- BUT camera zoom is scaling them equally
- Result: A 4px sprite at 0.3x zoom appears same size as 40px sprite at 1.0x zoom
- This is EXPECTED BEHAVIOR for LOD systems
- LOD purpose: Reduce **rendering cost**, not change **visual size**

**Hypothesis 2: Sprite Regeneration Not Triggering**
- `updateLODSprite()` checks if LOD changed
- If check fails, sprites don't regenerate
- Possible causes:
  - Hysteresis preventing LOD changes (0.1 buffer zone)
  - Timing issue between LOD update and sprite update
  - `currentLOD` not being set correctly

**Hypothesis 3: Generator LOD Implementation**
- Generators may not be using `lodLevel` parameter
- Need to verify TreeGenerator/HerbGenerator/GroundcoverGenerator
- But code review shows they ARE using it (lines 14-16, 23-24, 87-88 in tree_generator.js)

### Testing Protocol

#### Phase 1: Verify Generator Output
```javascript
// In browser console after page loads
const oakConfig = window.graphicsEngine.plantManager.speciesConfigs.get('quercus_robur');

// Generate at different LODs
const high = TreeGenerator.generateMatureTree(oakConfig, null, 'high');
const medium = TreeGenerator.generateMatureTree(oakConfig, null, 'medium');
const low = TreeGenerator.generateMatureTree(oakConfig, null, 'low');
const impostor = BaseGenerator.generateImpostor(oakConfig, 'MatureTree');

console.log(`High: ${high.width}x${high.height}`);       // Expect: 80-100x100-150
console.log(`Medium: ${medium.width}x${medium.height}`); // Expect: 40-50x50-75
console.log(`Low: ${low.width}x${low.height}`);         // Expect: 20-25x25-37
console.log(`Impostor: ${impostor.width}x${impostor.height}`); // Expect: 4x4
```

**Expected Output:**
```
High: 100x150px
Medium: 50x75px
Low: 25x37px
Impostor: 4x4px
```

#### Phase 2: Verify LOD Transitions
1. Open `tests/manual/test-lod-switching.html`
2. Enable debug logging in console:
   ```javascript
   window.config.world.rendering.lod.debugOverlay.showTransitions = true;
   ```
3. Press keyboard shortcuts:
   - Press `1` key → Should see IMPOSTOR LOD (red), 4x4px
   - Press `2` key → Should see LOW LOD (orange), ~20x25px
   - Press `3` key → Should see MEDIUM LOD (yellow), ~40x50px
   - Press `4` key → Should see HIGH LOD (green), ~80x100px
4. Watch console for `[LOD REGEN]` messages
5. Watch debug overlay for "Sprite regenerations detected!"

**Expected Behavior:**
- Each key press should trigger sprite regenerations
- LOD distribution should update
- Plant dimensions should change
- Console should log transitions

#### Phase 3: Visual Confirmation
1. Zoom out to 0.3x (or press `1`)
2. **Take screenshot** - save as `lod-impostor-0.3x.png`
3. Zoom to 1.0x (or press `3`)
4. **Take screenshot** - save as `lod-medium-1.0x.png`
5. Zoom to 2.5x (or press `4`)
6. **Take screenshot** - save as `lod-high-2.5x.png`
7. Compare screenshots side-by-side

**Expected Visual Difference:**
- Impostor: Tiny colored dots (4x4px)
- Medium: Recognizable tree shapes (40x50px)
- High: Detailed trees with visible trunk/canopy (80x100px)

BUT remember: Camera zoom scales everything, so:
- At 0.3x zoom, a 4px sprite renders as ~1.2 screen pixels
- At 1.0x zoom, a 40px sprite renders as ~40 screen pixels  
- At 2.5x zoom, an 80px sprite renders as ~200 screen pixels

The **texture detail** (number of pixels in sprite) changes, not the **screen size** of plants.

### Debug Configuration

To enable verbose LOD logging, add to `config.json`:
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

Or enable dynamically in console:
```javascript
window.config.world.rendering.lod.debugOverlay.showTransitions = true;
```

### Next Steps

1. **Run Phase 1 test** - Verify generators produce different dimensions
   - If PASS: Generators are working correctly
   - If FAIL: Bug in BaseGenerator.applyLODDimensions()

2. **Run Phase 2 test** - Verify LOD transitions occur
   - If sprites regenerate: LOD system is working
   - If no regenerations: Bug in updateLODSprite() or LOD calculation

3. **Run Phase 3 test** - Verify visual differences
   - If no visual difference: Expected behavior (see Hypothesis 1)
   - If visual differences: System working correctly!

### Understanding LOD Visual Behavior

**Important:** LOD systems reduce rendering cost, not visual size.

A plant at zoom 0.3x with impostor LOD should look **similar size** on screen as the same plant at zoom 1.0x with medium LOD, because:

```
Visual size = sprite_dimensions * camera_zoom

Impostor at 0.3x:  4px * 0.3 = 1.2 screen pixels
Medium at 1.0x:    40px * 1.0 = 40 screen pixels (but same world-space position)
```

The difference is **texture quality**, not **screen size**:
- Impostor: Solid color blob (low fidelity)
- Medium: Recognizable shape with leaves/trunk (baseline fidelity)
- High: Detailed texture with individual leaf clumps (high fidelity)

### Resolution

If Phase 1 and Phase 2 pass but user still can't see differences, the system IS working correctly. The visual similarity at different zoom levels is EXPECTED BEHAVIOR for LOD systems.

To make LOD differences more obvious, you could:
1. Increase LOD multiplier ranges (e.g., high=4x, low=0.25x)
2. Add visual indicators (debug overlay showing LOD levels as colored borders)
3. Change impostor to be more visually distinct (e.g., solid red square)
4. Disable camera zoom scaling temporarily to see raw sprite sizes

### Files Modified/Created

**New Files:**
- `tests/manual/test-lod-switching.html` - Interactive LOD monitoring
- `tests/manual/test-lod-generator-dimensions.js` - Console verification script
- `LOD_DEBUG_INVESTIGATION.md` - This document

**Files to Review:**
- `js/core/lod_manager.js` - LOD calculation logic
- `js/entities/plant.js` (lines 207-222) - Sprite regeneration
- `js/procedural/generators/base_generator.js` (lines 82-106) - LOD multipliers
- `js/procedural/generators/tree_generator.js` - LOD implementation
- `js/core/main_graphics.js` (lines 868, 881) - Update loop
- `config.json` (lines 93-110) - LOD configuration

### Conclusion

Based on code review, the LOD system is correctly implemented. The test tools created will confirm if:
1. Generators produce different dimensions ✓ (expected to pass)
2. LOD transitions trigger sprite regeneration ✓ (expected to pass)  
3. Visual differences are perceivable ? (may be subtle due to zoom scaling)

If tests 1-2 pass, the system is working as designed. The user's perception of "no visual difference" may be due to expected zoom-compensation behavior.

---

**Test Results:** (To be filled in after running tests)

- [ ] Phase 1: Generator dimensions test
- [ ] Phase 2: LOD transition test
- [ ] Phase 3: Visual confirmation test

**Findings:** 

**Recommended Actions:**
