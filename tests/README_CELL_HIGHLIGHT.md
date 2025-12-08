# Cell Highlight Test - Milestone 1

## Overview
This test validates the cell highlight rendering system, which displays a soft green border around a specified grid cell.

## Running the Test

```bash
npm run test:cell-highlight
```

## What This Test Validates

1. **API Methods Existence**
   - `setHighlightedCell(x, y)` - Enable highlight
   - `clearHighlightedCell()` - Disable highlight
   - `renderCellHighlight()` - Render method

2. **State Management**
   - Initial state: no highlight active (`{ x: null, y: null }`)
   - After setting: coordinates stored correctly
   - After clearing: state returns to null

3. **Visual Rendering**
   - Highlight renders at correct grid coordinates
   - Multiple coordinates tested: `(2, -11)`, `(0, 0)`, `(5, -5)`, `(-3, 8)`
   - Screenshots captured for visual inspection

4. **Performance**
   - FPS maintained ≥30 with highlight active
   - Render calls within expected range (+4 for border)

5. **Integration**
   - No console errors
   - No visual artifacts
   - Proper GL state management (blending)

## Test Output

The test produces three screenshots in the `screenshots/` directory:

1. **cell-highlight-milestone1-initial.png** - Before highlight activation
2. **cell-highlight-milestone1-active.png** - Highlight rendered at grid (2, -11)
3. **cell-highlight-milestone1-cleared.png** - After highlight cleared

## Manual Browser Testing

Open the browser console at `http://localhost:8081` and run:

```javascript
// Enable highlight at grid position (2, -11)
graphicsEngine.renderSystem.setHighlightedCell(2, -11);

// Clear highlight
graphicsEngine.renderSystem.clearHighlightedCell();

// Test other coordinates
graphicsEngine.renderSystem.setHighlightedCell(0, 0);
graphicsEngine.renderSystem.setHighlightedCell(5, -5);
```

## Expected Results

- ✓ Soft green border appears around the specified cell
- ✓ Border is 2 pixels thick, semi-transparent (alpha 0.3)
- ✓ Highlight clears when `clearHighlightedCell()` is called
- ✓ FPS stays above 30 (typically 45-55 in headless Chrome)
- ✓ No console errors

## Technical Details

### Rendering Approach
- **Color**: `rgba(0, 255, 0, 0.3)` - Soft green with 30% opacity
- **Border**: 4 separate rectangles (top, bottom, left, right), 2px thick each
- **Shader**: Uses existing 'basic' shader for solid color rendering
- **Geometry**: Cached quads from GeometryManager (no duplicate allocations)
- **Blending**: GL_BLEND enabled during render, disabled after

### Performance Impact
- **Render Calls**: +4 per frame when active (one per border edge)
- **FPS Impact**: Negligible (~0-2 FPS difference)
- **Memory**: Minimal (4 cached geometries)

### Integration Point
The highlight is rendered in the main render pipeline:
1. Soil (background)
2. Plants (by layer)
3. **Cell Highlight** ← New
4. Particles (weather)
5. Entities (character, UI)

## Troubleshooting

### Highlight not visible
- Check that coordinates are within visible camera bounds
- Verify zoom level allows cell to be seen
- Check console for WebGL errors

### Performance issues
- Expected FPS with highlight: 45-55 (headless Chrome uses SwiftShader)
- If FPS drops below 30, check other rendering systems for issues
- Verify GL state is properly restored after highlight render

### Test fails
- Ensure local server is running on port 8081
- Check that WebGL is available (some headless environments may not support it)
- Verify screenshots directory exists and is writable

## Next Steps

After Milestone 1 (cell highlight rendering) is complete, the next milestone is:
- **Milestone 2**: Integrate highlight with context menu
  - Auto-highlight cell when context menu opens
  - Clear highlight when context menu closes
  - Test full interaction flow

## Related Files

- **Implementation**: `js/systems/render_system.js` (highlight state and rendering)
- **Integration**: `js/core/main_graphics.js` (render pipeline)
- **Test**: `tests/cell-highlight.spec.js` (this test)
- **Config**: `config.json` (`world.map.cellSize = 20`)
- **Documentation**: `MILESTONE1_CELL_HIGHLIGHT.md` (full summary)
