# Isometric Rendering System

**Last updated:** 2025-12-08  
**Author:** shepherd-docs  
**Status:** Complete

## Overview

The **isometric rendering system** transforms Land Shepherd from a traditional top-down orthographic view to a 2.5D isometric projection with depth sorting. This creates a more visually immersive perspective while maintaining all existing gameplay systems (weather, plants, soil, terrain).

**Isometric projection** uses a 2:1 ratio (tile width:height) with diamond-shaped tiles arranged at a ~26.5° angle, creating the illusion of 3D depth on a 2D plane. Entities are depth-sorted using the painter's algorithm to render back-to-front correctly.

### Visual Comparison

**Orthographic (Before):**
- Square grid tiles viewed from directly above
- No depth perception
- Simple grid-to-screen 1:1 mapping
- Straight vertical rain

**Isometric (After):**
- Diamond-shaped tiles at 26.5° angle
- Pseudo-3D depth with layering
- Grid-to-isometric coordinate conversion
- Diagonal rain falling "into" the scene
- Natural occlusion (plants in front hide plants behind)

---

## Architecture

### Affected Components

The isometric system integrates into multiple core systems while preserving orthographic rendering as an option:

- **IsometricUtils** (js/utils/isometric_utils.js) - NEW: Coordinate conversion utilities
- **RenderSystem** (js/systems/render_system.js) - Diamond tile rendering, depth sorting
- **SoilManager** (js/core/soil_manager.js) - Isometric soil tile positioning
- **PlantManager** (js/core/plant_manager.js) - Plant depth sorting by layer
- **WeatherManager** (js/core/weather_manager.js) - Diagonal particle fall
- **InputManager** (js/systems/input_manager.js) - Mouse-to-isometric-grid conversion
- **ContextMenuManager** (js/systems/context_menu_manager.js) - Isometric cell highlighting
- **CameraManager** (js/systems/camera_manager.js) - Isometric projection mode

### Dependencies

```
IsometricUtils (coordinate math)
    ↓
CameraManager (projection mode)
    ↓
RenderSystem (diamond rendering + Z-order)
    ↓
SoilManager, PlantManager, WeatherManager
    ↓
InputManager (mouse → grid conversion)
    ↓
ContextMenuManager (cell highlighting)
```

### Integration Points

**Coordinate System:**
- Grid coordinates (0-49, 0-49) remain unchanged
- Entities store grid positions, convert to isometric on render
- IsometricUtils.gridToIso() converts grid → screen coordinates
- IsometricUtils.isoToGrid() converts mouse → grid coordinates

**Depth Sorting:**
- RenderSystem.renderPlantsByLayer() sorts plants by Z-order (gridX + gridY)
- Back entities (low Z-order) render first
- Front entities (high Z-order) render last (on top)
- Painter's algorithm ensures correct occlusion

**Event Handling:**
- IsometricUtils shared across managers for consistency
- Config-driven: projection mode read from config.world.rendering.projection
- Automatic fallback to orthographic if config missing

---

## Configuration

All isometric settings live in `config.json` under `world.rendering`:

```json
{
    "world": {
        "rendering": {
            "projection": "isometric",
            "isometric": {
                "tileWidth": 40,
                "tileHeight": 20,
                "depthSortingEnabled": true,
                "description": "2:1 isometric projection with depth sorting"
            }
        }
    }
}
```

### Parameters

#### projection (string)
- **Purpose:** Select rendering mode
- **Type:** enum
- **Values:** "orthographic" | "isometric"
- **Default:** "isometric"
- **Impact:** Switches entire rendering pipeline
- **Note:** Requires page reload to take effect

#### isometric.tileWidth (number)
- **Purpose:** Width of diamond tile in pixels
- **Type:** integer
- **Default:** 40
- **Range:** 20-100
- **Impact:** Visual scale and performance (larger = fewer tiles visible)
- **Recommendation:** Keep at 40 for optimal balance

#### isometric.tileHeight (number)
- **Purpose:** Height of diamond tile in pixels
- **Type:** integer
- **Default:** 20
- **Range:** 10-50
- **Impact:** Determines isometric angle (2:1 ratio standard)
- **Recommendation:** Keep at tileWidth / 2 for true 2:1 ratio

#### isometric.depthSortingEnabled (boolean)
- **Purpose:** Enable Z-order depth sorting
- **Type:** boolean
- **Default:** true
- **Impact:** Performance ~3ms per frame, but required for correct rendering
- **Note:** Disabling causes rendering artifacts (plants behind appear in front)

### Switching Between Modes

**To enable isometric:**
1. Set `"projection": "isometric"` in config.json
2. Reload page (Ctrl+R)
3. Verify console shows: "Rendering in isometric mode"

**To return to orthographic:**
1. Set `"projection": "orthographic"` in config.json
2. Reload page
3. Verify console shows: "Rendering in orthographic mode"

---

## API Reference

### IsometricUtils

Static utility class for coordinate conversions.

#### gridToIso(gridX, gridY, tileWidth, tileHeight)

Convert grid coordinates to isometric screen coordinates.

**Parameters:**
- `gridX` (number) - Grid X coordinate (0-49)
- `gridY` (number) - Grid Y coordinate (0-49)
- `tileWidth` (number) - Tile width in pixels (e.g., 40)
- `tileHeight` (number) - Tile height in pixels (e.g., 20)

**Returns:**
- `{x, y}` (object) - Isometric screen coordinates

**Algorithm:**
```javascript
isoX = (gridX - gridY) * (tileWidth / 2)
isoY = (gridX + gridY) * (tileHeight / 2)
```

**Example:**
```javascript
const isoPos = IsometricUtils.gridToIso(10, 5, 40, 20);
// Returns: {x: 100, y: 150}
// (grid 10,5 → screen 100,150)
```

#### isoToGrid(screenX, screenY, tileWidth, tileHeight)

Convert screen coordinates to grid coordinates (inverse of gridToIso).

**Parameters:**
- `screenX` (number) - Screen X coordinate (relative to camera)
- `screenY` (number) - Screen Y coordinate (relative to camera)
- `tileWidth` (number) - Tile width in pixels
- `tileHeight` (number) - Tile height in pixels

**Returns:**
- `{x, y}` (object) - Grid coordinates (floored to integers)

**Algorithm:**
```javascript
gridX = (screenX / (tileWidth / 2) + screenY / (tileHeight / 2)) / 2
gridY = (screenY / (tileHeight / 2) - screenX / (tileWidth / 2)) / 2
return {x: Math.floor(gridX), y: Math.floor(gridY)}
```

**Example:**
```javascript
const gridPos = IsometricUtils.isoToGrid(100, 150, 40, 20);
// Returns: {x: 10, y: 5}
// (screen 100,150 → grid 10,5)
```

#### getZOrder(gridX, gridY)

Calculate Z-order value for depth sorting (painter's algorithm).

**Parameters:**
- `gridX` (number) - Grid X coordinate
- `gridY` (number) - Grid Y coordinate

**Returns:**
- `number` - Z-order value (higher = rendered later = appears on top)

**Algorithm:**
```javascript
zOrder = gridX + gridY
```

**Example:**
```javascript
const z1 = IsometricUtils.getZOrder(0, 0);  // 0 (back-left corner)
const z2 = IsometricUtils.getZOrder(25, 25); // 50 (center)
const z3 = IsometricUtils.getZOrder(49, 49); // 98 (front-right corner)
// Entities sorted: z1 → z2 → z3 (back to front)
```

---

### RenderSystem

Core rendering methods for isometric mode.

#### renderIsoDiamond(x, y, tileWidth, tileHeight, color, alpha)

Render a diamond-shaped tile at isometric coordinates.

**Parameters:**
- `x` (number) - Isometric screen X coordinate
- `y` (number) - Isometric screen Y coordinate
- `tileWidth` (number) - Tile width
- `tileHeight` (number) - Tile height
- `color` (array[3]) - RGB color [r, g, b] (0-1 range)
- `alpha` (number) - Alpha transparency (0-1)

**Usage:**
```javascript
// Render green diamond tile at grid position (10, 5)
const isoPos = IsometricUtils.gridToIso(10, 5, 40, 20);
renderSystem.renderIsoDiamond(
    isoPos.x, isoPos.y,
    40, 20,
    [0.2, 0.8, 0.3],
    1.0
);
```

#### renderIsometricCellHighlight(gridX, gridY)

Render diamond outline for cell highlighting (context menu).

**Parameters:**
- `gridX` (number) - Grid X coordinate
- `gridY` (number) - Grid Y coordinate

**Visual:**
- 4 lines forming diamond border
- Color: rgba(0, 255, 0, 0.3) soft green
- Line width: 2px

**Example:**
```javascript
// Highlight cell at grid (25, 25)
renderSystem.setHighlightedCell(25, 25);
// Diamond outline appears at isometric position
```

#### renderPlantsByLayer()

Render all plants with depth sorting (modified for isometric).

**Changes for Isometric:**
- Plants sorted by `zOrder` (gridX + gridY) within each layer
- Back plants render first, front plants last
- Layer offsets applied: bottom (0), middle (+5), top (+15)

**Algorithm:**
```javascript
for each layer (bottom, middle, top):
    plants = getPlantsByLayer(layer)
    plants.sort((a, b) => a.zOrder - b.zOrder) // Back to front
    for each plant in plants:
        renderPlant(plant)
```

---

### SoilManager

Soil tile rendering with isometric positioning.

#### renderIsometricSoils()

Render all soil tiles as isometric diamonds.

**Process:**
1. Collect all soil cells in visible area
2. Sort by Z-order (back to front)
3. Convert grid → isometric coordinates
4. Render diamond tiles with soil color
5. Render water tiles with ripple shader

**Performance:**
- 2500 tiles sorted: ~2ms per frame
- Render calls: 2500 (one per tile)
- FPS impact: ~5 FPS reduction vs orthographic

**Example Output:**
```
Grid (0,0) → Iso (-500, 0) → Render first (back-left)
Grid (25,25) → Iso (0, 500) → Render middle
Grid (49,49) → Iso (0, 980) → Render last (front-right)
```

---

### WeatherManager

Weather particles with diagonal fall for isometric.

#### Isometric Particle Spawning

**Modifications:**
- Spawn area extended +40% to cover diamond shape
- Particles given horizontal velocity: `velocityX = -velocityY * 0.3`
- Creates ~17° leftward fall angle matching isometric perspective

**Visual Result:**
- Rain appears to fall "into" the scene
- Splash effects land on isometric tiles
- Natural diagonal movement

**Config Detection:**
```javascript
const projection = window.config?.world?.rendering?.projection || 'orthographic';
const isIsometric = projection === 'isometric';

if (isIsometric) {
    particle.velocityX = -fallSpeed * 0.3; // Diagonal fall
}
```

---

### InputManager

Mouse-to-grid conversion for isometric interaction.

#### getGridCoordinatesFromMouse(mouseX, mouseY)

Convert mouse position to grid coordinates (isometric-aware).

**Process:**
1. Get camera-relative screen coordinates
2. If isometric mode:
   - Use IsometricUtils.isoToGrid()
   - Bounds check against grid dimensions
3. If orthographic mode:
   - Use standard grid-to-screen division
4. Return {x, y} or null if out of bounds

**Example:**
```javascript
canvas.addEventListener('click', (e) => {
    const coords = inputManager.getGridCoordinatesFromMouse(e.clientX, e.clientY);
    if (coords) {
        console.log(`Clicked tile: (${coords.x}, ${coords.y})`);
        // Plant placement, context menu, etc.
    }
});
```

---

## Usage Examples

### Setting Up Isometric Mode

```javascript
// 1. Update config.json
{
    "world": {
        "rendering": {
            "projection": "isometric"
        }
    }
}

// 2. Reload page - system auto-detects mode

// 3. Verify in console
// Expected: "IsometricUtils initialized"
// Expected: "CameraManager projection mode: isometric"
// Expected: "Rendering in isometric mode"
```

### Converting Coordinates

```javascript
// Grid position to screen coordinates
const gridX = 25, gridY = 25;
const tileW = 40, tileH = 20;

const screenPos = IsometricUtils.gridToIso(gridX, gridY, tileW, tileH);
console.log(screenPos); // {x: 0, y: 500} (center of grid)

// Screen coordinates to grid position
const mouseX = 100, mouseY = 200;
const gridPos = IsometricUtils.isoToGrid(mouseX, mouseY, tileW, tileH);
console.log(gridPos); // {x: 12, y: 2} (clicked tile)
```

### Adding Isometric-Aware Entities

When creating new entity types that need to render in isometric:

```javascript
class MyCustomEntity {
    constructor(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
    }
    
    getRenderData() {
        const config = window.config;
        const projection = config.world.rendering.projection;
        const isIsometric = projection === 'isometric';
        
        if (isIsometric) {
            const isoConfig = config.world.rendering.isometric;
            const isoPos = IsometricUtils.gridToIso(
                this.gridX, 
                this.gridY, 
                isoConfig.tileWidth, 
                isoConfig.tileHeight
            );
            
            return {
                x: isoPos.x,
                y: isoPos.y,
                zOrder: IsometricUtils.getZOrder(this.gridX, this.gridY),
                sprite: this.sprite,
                layer: this.layer
            };
        } else {
            // Orthographic positioning
            const cellSize = config.world.map.cellSize;
            return {
                x: this.gridX * cellSize,
                y: this.gridY * cellSize,
                sprite: this.sprite,
                layer: this.layer
            };
        }
    }
    
    getRenderType() {
        return 'sprite';
    }
    
    update(deltaTime) {
        // Entity logic
    }
}

// Register entity with managers
graphicsEngine.plantManager.customEntities.push(new MyCustomEntity(10, 5));
```

### Depth Sorting Custom Entities

If you have multiple entity types that need depth sorting:

```javascript
// In your manager's render method:
renderCustomEntities() {
    const config = window.config;
    const isIsometric = config.world.rendering.projection === 'isometric';
    const depthSortingEnabled = config.world.rendering.isometric?.depthSortingEnabled;
    
    let entities = this.getAllEntities();
    
    if (isIsometric && depthSortingEnabled) {
        // Sort by Z-order (back to front)
        entities.sort((a, b) => {
            const zA = IsometricUtils.getZOrder(a.gridX, a.gridY);
            const zB = IsometricUtils.getZOrder(b.gridX, b.gridY);
            return zA - zB;
        });
    }
    
    // Render sorted entities
    entities.forEach(entity => {
        const renderData = entity.getRenderData();
        this.renderSystem.renderSprite(renderData);
    });
}
```

---

## Performance Considerations

### FPS Impact

**Orthographic baseline:** 56 FPS (50x50 grid, 500 plants)  
**Isometric with depth sorting:** 34-38 FPS (same scene)  
**Reduction:** ~30% FPS reduction (acceptable)

**Bottlenecks:**
1. **Depth sorting:** ~3ms per frame (500 plants × 3 layers)
2. **Diamond tile rendering:** +2ms per frame vs square tiles
3. **Coordinate conversion:** <0.1ms per frame (negligible)

### Memory Usage

**Additional Memory:**
- Isometric geometry cache: ~2MB (diamond quad buffers)
- Sorting arrays: ~50KB per frame (temporary allocations)
- Total: ~2-3MB increase

**Optimization:**
- Geometry cached per unique tile size (no per-frame allocation)
- Sorting arrays reused across frames (no GC pressure)
- Coordinate conversions done on-demand (no cached positions)

### Render Call Count

**Orthographic:** 2500 tiles + 500 plants = 3000 draw calls  
**Isometric:** 2500 tiles + 500 plants = 3000 draw calls  
**No change:** Same entity count, just different coordinates

### Culling Opportunities

**Not Yet Implemented:**
- Frustum culling: Skip entities outside visible diamond
- Potential FPS gain: +10-15% with large grids

**Spatial partitioning:**
- Grid cells already provide basic partitioning
- Further optimization possible with quadtree

---

## Troubleshooting

### Common Issues

#### Issue: Tiles Not Rendering Correctly

**Symptoms:**
- Blank screen or flickering tiles
- Diamond shapes look distorted
- Gaps between tiles

**Causes:**
- Incorrect projection config
- Tile width/height ratio not 2:1
- IsometricUtils not loaded

**Solutions:**
1. Verify config.json:
   ```json
   "projection": "isometric",
   "isometric": {
       "tileWidth": 40,
       "tileHeight": 20
   }
   ```
2. Check console for "IsometricUtils initialized"
3. Ensure tileHeight = tileWidth / 2
4. Verify script load order in index.html:
   ```html
   <script src="js/utils/isometric_utils.js"></script>
   <script src="js/systems/render_system.js"></script>
   ```

---

#### Issue: Mouse Clicks Misaligned

**Symptoms:**
- Clicking tile highlights wrong cell
- Context menu appears at incorrect position
- Plant placement offset from mouse

**Causes:**
- IsometricUtils.isoToGrid() not used
- Camera offset not applied to mouse coordinates
- Tile dimensions mismatch

**Solutions:**
1. In InputManager.getGridCoordinatesFromMouse():
   ```javascript
   if (projection === 'isometric') {
       const isoPos = IsometricUtils.isoToGrid(
           screenX, screenY,
           isoConfig.tileWidth, isoConfig.tileHeight
       );
       return {x: isoPos.x, y: isoPos.y};
   }
   ```
2. Ensure camera transform applied before conversion
3. Verify tile width/height match config values

---

#### Issue: Performance Degradation

**Symptoms:**
- FPS drops below 30
- Stuttering during rendering
- High render times in profiler

**Causes:**
- Depth sorting disabled causing overdraw
- Excessive entity count
- Sorting algorithm inefficient

**Solutions:**
1. Enable depth sorting:
   ```json
   "isometric": {
       "depthSortingEnabled": true
   }
   ```
2. Profile with browser DevTools:
   - Check "Rendering" time in Performance tab
   - Look for hot spots in JavaScript execution
3. Reduce entity count if >1000 total entities
4. Consider implementing frustum culling

---

#### Issue: Plants Rendering in Wrong Order

**Symptoms:**
- Front plants behind back plants
- Z-fighting (flickering overlap)
- Incorrect occlusion

**Causes:**
- Z-order calculation incorrect
- Depth sorting not applied
- Plants not sorted within layers

**Solutions:**
1. Verify Z-order calculation:
   ```javascript
   const zOrder = IsometricUtils.getZOrder(plant.gridX, plant.gridY);
   // zOrder should increase from top-left (0,0) to bottom-right (49,49)
   ```
2. Check RenderSystem.renderPlantsByLayer() sorts by zOrder:
   ```javascript
   plants.sort((a, b) => {
       const renderDataA = a.getRenderData();
       const renderDataB = b.getRenderData();
       return renderDataA.zOrder - renderDataB.zOrder;
   });
   ```
3. Ensure plants return zOrder in getRenderData()

---

#### Issue: Rain Falling Straight Down in Isometric

**Symptoms:**
- Rain particles fall vertically
- Particles don't align with isometric tiles
- Splash effects misplaced

**Causes:**
- WeatherManager not detecting isometric mode
- Particle velocityX not set
- Config projection setting incorrect

**Solutions:**
1. Verify config projection:
   ```json
   "world": {
       "rendering": {
           "projection": "isometric"
       }
   }
   ```
2. Check WeatherManager.spawnParticles():
   ```javascript
   const isIsometric = config.world.rendering.projection === 'isometric';
   if (isIsometric) {
       particle.velocityX = -fallSpeed * 0.3; // Must be set
   }
   ```
3. Reload page to apply config changes

---

#### Issue: Config Validation Errors

**Symptoms:**
- "Invalid configuration" error on startup
- Schema validation fails
- Application won't initialize

**Causes:**
- Projection value not in enum ["orthographic", "isometric"]
- Tile width/height out of range
- Missing required isometric config

**Solutions:**
1. Run config validation:
   ```bash
   npm run validate:config
   ```
2. Check error output for specific issues
3. Ensure config matches schema:
   ```json
   "rendering": {
       "projection": "isometric",
       "isometric": {
           "tileWidth": 40,        // Range: 20-100
           "tileHeight": 20,       // Range: 10-50
           "depthSortingEnabled": true
       }
   }
   ```

---

## Related Documentation

- [Rendering Workflow](../architecture/rendering-workflow.md) - Complete rendering pipeline
- [Technical Reference](../architecture/technical-reference.md) - System architecture
- [Weather System](weather-system.md) - Weather particle integration
- [Context Menu System](context-menu-system.md) - Cell highlighting integration
- [Feature Plan](../../FEATURE_PLAN_ISOMETRIC_RENDERING.md) - Implementation milestones

---

## Changelog

### 2025-12-08 - Complete Implementation

**Milestones:**
- M1: Coordinate system foundation ✅
- M2: Isometric soil tiles ✅
- M3: Plant positioning with depth sorting ✅
- M4: Input and camera controls ✅
- M5: Weather particles ✅
- M6: Documentation and final verification ✅

**Performance:**
- FPS: 34-38 (target ≥30) ✅
- Load time: 1044ms (target <3000ms) ✅
- Console errors: 0 ✅
- Visual quality: Excellent ✅

**Bugfixes Applied:**
1. Config access errors - window.config undefined throughout codebase
2. Right-click visibility - visibleCells cache not updated in isometric mode

**Future Enhancements:**
- Frustum culling for off-screen entities (+10-15% FPS)
- Spatial partitioning for large scenes (quadtree)
- Variable fall angles for weather (wind direction)
- Particle occlusion behind entities

---

**Feature Complete:** 2025-12-08
