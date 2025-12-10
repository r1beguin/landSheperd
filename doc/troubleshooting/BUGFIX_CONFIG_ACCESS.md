# Bugfix: Config Access Issues in Isometric Mode

## Problem Summary
Multiple TypeErrors occurred when trying to access `window.config` which was undefined, causing:
1. Cell highlight rendering to fail
2. Plant rendering to crash when planting
3. Game freezing due to render loop crashes

## Root Cause
The config object was loaded in `GraphicsEngine` as `this.config`, but many parts of the codebase expected it to be available globally as `window.config`. This was never set, causing undefined access errors throughout the application.

### Affected Systems
- **RenderSystem**: `renderCellHighlight()`, `renderIsometricCellHighlight()`, `renderPlantsByLayer()`
- **Plant entities**: Multiple methods accessing `window.config.world.plants.*`
- **PlantManager**: Reproduction and genetics methods

## Solution

### 1. Set window.config Globally (js/core/main_graphics.js)
```javascript
// Wait for debug manager initialization to get config
const debugEnabled = await this.debugManager.initialize();
this.config = this.debugManager.getConfig();

// Make config globally accessible for entities and managers
window.config = this.config;
```

**Rationale**: Many existing entity and manager methods rely on `window.config`. Setting it globally ensures backward compatibility without refactoring 20+ files.

### 2. Enhanced RenderSystem Config Access (js/systems/render_system.js)
```javascript
// Added config parameter to constructor
constructor(gl, shaderManager, geometryManager, config = null) {
    this.config = config;
    // ...
}

// Added setConfig method for late binding
setConfig(config) {
    this.config = config;
}
```

**Rationale**: RenderSystem now has direct config access via `this.config` with proper null-safety checks, following better OOP practices while window.config serves as fallback for entities.

### 3. Null-Safety Guards in Render Methods
```javascript
renderCellHighlight(viewMatrix, lightingManager, cellSize) {
    // Null-safety check before accessing config
    if (!this.config || !this.config.world || !this.config.world.rendering) {
        console.warn('RenderSystem: config not available for renderCellHighlight');
        return;
    }
    // ... rest of method
}
```

**Rationale**: Prevents crashes if config is accessed before initialization, provides clear warning messages for debugging.

## Files Modified

### Core Changes
1. **js/core/main_graphics.js**
   - Line 212: Set `window.config = this.config` after loading
   - Line 250: Call `renderSystem.setConfig(this.config)` after instantiation

2. **js/systems/render_system.js**
   - Line 16: Added `config` parameter to constructor
   - Line 23-27: Added `setConfig()` method
   - Line 467-477: Added null-safety in `renderCellHighlight()`
   - Line 548-556: Added null-safety in `renderIsometricCellHighlight()`
   - Line 627-634: Added null-safety in `renderPlantsByLayer()`
   - Line 651: Added null-check for `config.isometric`
   - Line 671: Changed `window.config` to `this.config` for logging

## Testing Results

### Before Fix
```
Console Errors: Multiple TypeErrors
- "Can't access property 'world', window.config is undefined"
- Locations: render_system.js:460, 542, 627
Symptoms: 
- Cell highlight not visible
- Cannot plant seeds
- Render loop crashes
- Game appears frozen
```

### After Fix
```
✅ Status: PASS
✅ Console Errors: 0
✅ Console Warnings: 5 (WebGL/SwiftShader only)
✅ FPS: 34 (target: 30+)
✅ Load Time: 1034ms
✅ All features functional:
   - Cell highlighting works (diamond-shaped in isometric)
   - Plant placement works
   - Time progression works
   - Render loop stable
```

## Manual Testing Checklist
- [x] Right-click shows context menu
- [x] Diamond highlight visible on clicked cell
- [x] Can plant Clover, Nettles, Oak
- [x] Plants appear in isometric view
- [x] Plants render with correct depth sorting
- [x] Time progresses normally
- [x] No console errors during gameplay

## Impact Analysis

### Performance
- **No performance degradation**: Config access is O(1) reference lookup
- FPS maintained at 34 (within 30+ target for headless Chrome)

### Code Quality
- **Improved**: RenderSystem now has explicit config dependency
- **Maintained**: Backward compatibility with existing window.config usage
- **Enhanced**: Added null-safety guards throughout

### Future Recommendations
1. **Gradual refactoring**: Consider passing config explicitly to Plant/PlantManager constructors in future updates
2. **TypeScript migration**: Would catch these undefined access issues at compile time
3. **Dependency injection**: GraphicsEngine could provide config to all managers during initialization

## Related Issues
- Milestone 4: Isometric input & camera controls
- Right-click context menu functionality
- Plant rendering in isometric mode

## Timeline
- **Identified**: 2025-12-08 during M4 testing
- **Fixed**: 2025-12-08 (same day)
- **Verified**: npm run verify PASS, manual testing complete

## Commit Message Template
```
fix: resolve window.config undefined errors in isometric mode

- Set window.config globally in main_graphics.js after loading
- Add config parameter and setConfig() to RenderSystem
- Add null-safety guards in render methods
- Fixes cell highlighting, plant placement, and render crashes

Resolves: Right-click context menu errors
Resolves: Plant placement TypeErrors
Related: Milestone 4 isometric input completion
```
