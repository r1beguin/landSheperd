# Land Shepherd Development Guidelines - Quick Reference

**For Comprehensive Documentation**: See [Documentation Index](INDEX.md)

---

## Overview

**Land Shepherd** is a pixel art nature simulation built with pure WebGL and vanilla JavaScript, featuring realistic ecosystem modeling with soil chemistry, plant growth, and environmental interactions.

**Core Tech**: WebGL rendering, modular JavaScript architecture, no build tools (pure ES6+ with script tags)

---

## Essential Documentation

### For AI Agents
- **Start Here**: [AGENTS.md](../AGENTS.md) - Complete agent guidelines, verification workflow, code style

### For Developers
- **Getting Started**: [guides/agents-guide.md](guides/agents-guide.md) - Human-readable development guide
- **Architecture**: [architecture/](architecture/) - System design and technical reference
- **Features**: [features/](features/) - Feature-specific documentation
- **Testing**: [testing/](testing/) - Test strategy and verification workflow

### Quick Links
- [Documentation Index](INDEX.md) - Complete navigation
- [Architecture Overview](architecture/technical-reference.md) - System hierarchy
- [Rendering Workflow](architecture/rendering-workflow.md) - WebGL pipeline
- [Verification Guide](testing/setup-verification.md) - npm run verify usage

---

## Quick Start

### Running the Project
```bash
# Start local server (port 8081)
python -m http.server 8081
# OR
npx http-server -p 8081
# OR use VS Code Live Server on port 8081

# Open browser
http://localhost:8081

# Verify changes
npm run verify
```

**Note**: Port 8081 is used to avoid conflicts with other services (e.g., Traefik on port 8080)

### Project Structure
```
landSheperd/
├── js/
│   ├── core/          # Engine systems (main_graphics.js, managers)
│   ├── systems/       # Game logic (camera, input, render)
│   ├── entities/      # Entities (plant, soil, character)
│   └── procedural/    # Procedural generation
├── species/           # Species configs (nettles.json)
├── config.json        # Global configuration
├── index.html         # Entry point (script tags, no build)
├── tests/             # Playwright automated tests
└── doc/               # Documentation (you are here)
```

---

## Core Conventions

### Naming
- **Classes**: PascalCase (`PlantManager`, `GraphicsEngine`)
- **Files**: snake_case (`plant_manager.js`, `main_graphics.js`)
- **Methods/Variables**: camelCase (`generateSprite`, `deltaTime`)
- **Constants**: UPPER_SNAKE_CASE in config.json

### Code Style
- **No emojis**: Never use emojis in console output or comments
- **No imports/exports**: Script tags in index.html, maintain load order
- **Comments**: JSDoc for classes/public methods, inline for complex algorithms
- **Error handling**: `console.error()` for critical, `console.warn()` for non-critical

### Architecture
- **Modular managers**: Each system is independent with clear interfaces
- **Initialize in GraphicsEngine**: Add managers to `initManagers()` with dependency order
- **Entity interface**: Implement `getRenderData()`, `update(deltaTime)`, `getRenderType()`
- **Configuration**: All parameters in `config.json` with nested structure
- **Performance**: Target 60+ FPS - use batching, caching, culling
- **Render order**: soil → plants → characters → UI

---

## Adding New Plant Species

### 1. Determine Species Category
- **herb**: Stem with leaves, vertical growth (e.g., nettles, wildflowers)
- **tree**: Trunk with canopy, multi-stage growth (e.g., oak, pine)
- **groundcover**: Low-growing, spreading pattern (e.g., clover, grass, moss)

### 2. Create Species JSON
Create `species/your_species.json` with:
```json
{
  "id": "your_species_identifier",
  "commonName": "Display Name",
  "category": "herb",  // IMPORTANT: Must be exactly "herb", "tree", or "groundcover" (no custom names!)
  "layer": "middle",
  "growthStages": [
    {
      "name": "Seedling",
      "generator": "seedlingGeneration",  // Must be in PlantGenerator.stageMethodMap
      "daysToNext": 3
    }
  ],
  "appearance": {
    "colorPalette": {
      "stem": ["#4a7c3c", "#3d6730"],
      "leaf": ["#5a9948", "#4a7c3c"]
    },
    "dimensions": {"width": 20, "height": 20}
  },
  "proceduralModules": {
    "stem": {"baseWidth": 1, "colorVariation": 0.2},
    "leaf": {"pairCount": 3, "width": 4, "height": 3}
  }
}
```

**Valid Categories:**
- `"herb"` - Stem with leaves, vertical growth (nettles, wildflowers)
- `"tree"` - Trunk with canopy, multi-stage growth (oak, pine)
- `"groundcover"` - Low-growing, spreading (clover, grass, moss)

**Note:** Custom category names like `"wild_herb"` or `"flower"` will cause plants to render as green rectangles (fallback sprite). Always use the exact category names listed above.

### 3. Add Generator Method
In appropriate generator file (`herb_generator.js`, `tree_generator.js`, or `groundcover_generator.js`):

```javascript
/**
 * Generate your stage sprite
 * @param {object} speciesConfig - Species configuration from JSON
 * @param {object} genetics - Optional genetics object (for trees)
 * @returns {HTMLCanvasElement} Generated sprite canvas
 */
static generateYourStage(speciesConfig, genetics = null) {
    const dims = speciesConfig.appearance.dimensions;
    const { canvas, ctx } = BaseGenerator.createCanvas(dims.width, dims.height);
    
    // Use utilities for color
    const colors = BaseGenerator.applyGeneticColors(
        speciesConfig.appearance.colorPalette.leaf,
        genetics
    );
    
    // Draw your sprite using CanvasUtils
    CanvasUtils.drawEllipse(ctx, 10, 10, 5, 8, colors[0]);
    
    return canvas;
}
```

### 4. Register Stage Mapping
In `plant_generator.js`, add to `stageMethodMap`:
```javascript
static stageMethodMap = {
    // ... existing mappings
    yourStageGeneration: 'generateYourStage'
};
```

### 5. Load Species Configuration
In `plant_manager.js`, add species loading:
```javascript
async loadSpecies() {
    const species = [
        'nettles',
        'oak',
        'clover',
        'your_species'  // Add here
    ];
    
    for (const speciesName of species) {
        const config = await fetch(`species/${speciesName}.json`).then(r => r.json());
        this.speciesConfigs.set(config.id, config);
    }
}
```

### 6. Test Your Species
Create manual test file `tests/manual/test-your-species.js`:
```javascript
const config = await fetch('species/your_species.json').then(r => r.json());
const canvas = PlantGenerator.generatePlantSprite(config, 'Seedling', null);
document.body.appendChild(canvas);
```

Or use interactive testing:
```javascript
// In browser console after planting:
const plant = plantManager.getPlantAt(gridX, gridY, 'middle');
console.log(plant.species, plant.stage);
```

### 7. Verify Changes
```bash
npm run verify
```

**Checklist:**
- ✅ Category field in species JSON matches generator type
- ✅ Generator name added to stageMethodMap
- ✅ Generator method implemented with JSDoc
- ✅ Colors and dimensions specified in species JSON
- ✅ Species loaded in PlantManager
- ✅ Visual appearance acceptable
- ✅ npm run verify passes (0 errors, FPS 30+)

### Available Utilities

**Color Manipulation:**
```javascript
ColorUtils.shiftHue('#4a7c3c', 20);  // Shift green by 20 degrees
```

**Drawing Primitives:**
```javascript
CanvasUtils.drawEllipse(ctx, x, y, radiusX, radiusY, fillStyle);
CanvasUtils.drawLine(ctx, x1, y1, x2, y2, strokeStyle, lineWidth);
CanvasUtils.drawCurvedLine(ctx, x1, y1, cpx, cpy, x2, y2, strokeStyle, lineWidth);
```

**Genetic Modifiers:**
```javascript
const heightMult = GeneticsUtils.getDimensionMultiplier(genetics.heightFactor);  // 0.7-1.3
const foliageMult = GeneticsUtils.getFoliageMultiplier(genetics.foliageDensity); // 0.6-1.4
const hueTint = GeneticsUtils.getHueTint(genetics.colorTint);  // -20 to +20 degrees
const dims = GeneticsUtils.applyGeneticDimensions(baseDims, genetics, 1.0);
```

**Base Generator Helpers:**
```javascript
const { canvas, ctx } = BaseGenerator.createCanvas(width, height);
const stem = BaseGenerator.generateStem(ctx, x, y, w, h, colors, 3);  // 3 attachment points
const shiftedColors = BaseGenerator.applyGeneticColors(colors, genetics);
```

---

---

## Verification Workflow

### After Every Change
```bash
npm run verify
```

**Expected Results**:
- **PASS**: No console errors, FPS ≥30, WebGL initialized, visual diff <5%
- **FAIL**: Console errors present, FPS <30, or significant visual changes

### Creating Baseline
After verifying a good state (typically after completing a feature):
```bash
npm run verify:baseline
```

### Key Metrics
- `console_errors`: Must be 0 for PASS
- `fps_average`: Must be ≥30 for PASS (headless Chrome uses software rendering)
- `webgl_context`: Must be "ok" for PASS
- `visual.pixel_difference_percent`: Must be <5% for PASS (if baseline exists)

See [Testing Documentation](testing/) for detailed verification workflow.

---

## Common Commands

```bash
# Development
python -m http.server 8081          # Start server
npm run verify                      # Full verification
npm run verify:baseline             # Create baseline
npm run verify:interactive          # Interactive testing with screenshots

# Testing
npm test                            # Run all tests
npx playwright test                 # Run specific tests
```

---

## Feature Development Checklist

When implementing new features:

1. **Plan**: Design system integration and data flow
2. **Configure**: Add parameters to `config.json`
3. **Implement**: Follow architecture patterns (managers, entities)
4. **Integrate**: Hook into GraphicsEngine with proper initialization order
5. **Verify**: Run `npm run verify` to validate changes
6. **Document**: Update relevant feature docs in `doc/features/`
7. **Baseline**: Create new baseline if visual changes are intentional

---

## Documentation Organization

### By Category
- **[guides/](guides/)** - Developer workflows, conventions, best practices
- **[architecture/](architecture/)** - System design and technical implementation
- **[features/](features/)** - Game systems documentation
- **[testing/](testing/)** - Test documentation and verification guides
- **[troubleshooting/](troubleshooting/)** - Problem-solving and debugging
- **[devlogs/](devlogs/)** - Chronological feature development history

### By System
- **Rendering**: [Rendering Workflow](architecture/rendering-workflow.md)
- **Plants**: [Plant Generation](features/plant-generation-system.md), [Reproduction](features/reproduction-system.md)
- **Soil**: [Fertility System](features/fertility-system.md), [Nutrient System](features/nutrient-system.md)
- **Environment**: [Weather System](features/weather-system.md), [Lighting System](features/lighting-system.md), [Terrain Generation](features/terrain-generation-system.md)
- **UI**: [Context Menu](features/context-menu-system.md), [Visual Feedback](features/visual-feedback-system.md)

---

## System Architecture Summary

### Core Managers (js/core/)
- **GraphicsEngine** (main_graphics.js) - Main orchestrator, initialization
- **ShaderManager** - WebGL shader compilation/caching
- **GeometryManager** - Vertex buffer management/reuse
- **ProceduralGenerator** - Deterministic terrain generation with PRNG
- **SoilManager** - Soil grid management, water tiles, and rendering
- **PlantManager** - Plant placement and lifecycle
- **TimeManager** - Game time and day/night cycle
- **LightingManager** - Dynamic lighting with time-of-day phases and weather integration
- **WeatherManager** - Weather state management and transitions

### System Managers (js/systems/)
- **RenderSystem** - Optimized entity batch rendering
- **CameraManager** - View transforms and controls
- **InputManager** - Event handling and coordinate conversion
- **OverlayManager** - Nutrient/fertility overlay visualization
- **ContextMenuManager** - Right-click context menu

### Entities (js/entities/)
- **Plant** - Individual plant instances with growth stages
- **Soil** - Soil cells with nutrient chemistry
- **Character** - Player avatar with movement

For detailed architecture, see [Technical Reference](architecture/technical-reference.md).

---

## Performance Targets

- **FPS**: 60+ with 2500+ visible cells
- **Render Calls**: Minimize via batching
- **Memory**: Monitor texture memory, use caching
- **Update Loop**: Efficient entity updates, spatial partitioning if needed

See [Architecture Documentation](architecture/) for optimization techniques.

### Spatial Optimization Patterns

For systems that perform spatial queries (distance checks, proximity detection):

1. **Pre-compute at startup** if data is static or changes infrequently
2. **Use Map/Set for O(1) lookups** instead of nested loops
3. **Cache results in terrain generator** and pass to managers
4. **Trade memory for performance** (100-500KB acceptable)

**Example:** Water fertility system uses:
- Riparian grid: Pre-computed zone membership (radius 2)
- Influence map: Pre-computed seeping rates with falloff (radius 4)
- Result: 45-480x speedup, ~250KB memory

**Pattern:**
```javascript
// 1. Pre-compute at terrain generation
class TerrainGenerator {
    generateSpatialCache() {
        const cache = new Map();
        sourceItems.forEach(source => {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= radius) {
                        const cellKey = `${x},${y}`;
                        cache.set(cellKey, {
                            value: calculateEffect(distance),
                            source: source
                        });
                    }
                }
            }
        });
        return cache;
    }
}

// 2. Use O(1) lookup in update loop
update() {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const cellKey = `${x},${y}`;
            if (this.spatialCache.has(cellKey)) {
                const data = this.spatialCache.get(cellKey);
                // Apply pre-computed effect
            }
        }
    }
}
```

**When to use:**
- Distance-based effects with fixed radii
- Spatial relationships that don't change frequently
- Any O(N×M) nested loop where N and M are large

**See:** [Water Fertility Performance Optimization](features/water-fertility-performance-optimization.md) for detailed implementation.

### Throttling Best Practices

Match update frequency to biological/physical timescales:

- **Per frame (60 FPS):** Rendering, input, camera
- **Per game hour (24x/day):** Weather effects, gradual changes
- **Per game day (1x/day):** Nutrient cycling, regeneration, decomposition
- **Per game week:** Slow ecological processes, seasonal changes

**Implementation:**
```javascript
// Track last execution
if (!this.lastUpdateDay) this.lastUpdateDay = 0;

const currentDay = timeManager.getCurrentDay();
if (currentDay > this.lastUpdateDay) {
    // Execute expensive operation
    this.lastUpdateDay = currentDay;
}
```

**Benefits:**
- Reduces unnecessary computation by 95%+
- Matches simulation fidelity to real-world timescales
- No impact on simulation accuracy

**See:** [Water Fertility Performance Optimization](features/water-fertility-performance-optimization.md) for case study (9 FPS → 48 FPS).

---

## Common Issues

### Port 8081 Busy
```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8081 | xargs kill
```

### Tests Timeout
- Increase timeout in `playwright.config.js` if needed
- Check for infinite loops or blocking operations

### WebGL Errors
- Expected in headless Chrome (uses SwiftShader)
- Real device testing recommended for GPU features

See [Troubleshooting Documentation](troubleshooting/) for more solutions.

---

## External Resources

- **Main README**: [../README.md](../README.md) - Project overview
- **Agent Guidelines**: [../AGENTS.md](../AGENTS.md) - Complete AI agent guide
- **Documentation Index**: [INDEX.md](INDEX.md) - Full navigation

---

**This is a routing document. For comprehensive information, navigate to the appropriate documentation section above.**

**Last Updated**: 2025-12-08  
**Total Documentation**: 3800+ lines with context menu UX improvements complete

---

## Recent Implementations

### Context Menu UX Improvements - 2025-12-08

**Purpose:** Improved context menu usability with cell highlighting, scrolling, and dragging

**Implementation:**
- **RenderSystem** (js/systems/render_system.js): Cell highlight rendering with `setHighlightedCell(x, y)` and `clearHighlightedCell()` methods
- **ContextMenuManager** (js/systems/context_menu_manager.js): Lifecycle integration with highlight, drag functionality with viewport clamping
- **CSS** (css/styles.css): Scrolling styles (max-height: 80vh), custom scrollbar, dragging affordances (opacity, shadow)

**Key Design Decisions:**
- Cell highlight rendering: 4 rectangles forming border, rgba(0, 255, 0, 0.3) soft green
- Highlight lifecycle: Set on menu show, cleared on menu hide (all close paths)
- Scrolling: Pure CSS with max-height 80vh, native browser scrolling (zero JS overhead)
- Dragging: Header-only drag handle, viewport clamping (50px minimum visible), highlight persists during drag
- Integration: All three features work independently without interference

**Configuration:**
No new configuration required - all features integrated into existing context menu system.

**Testing:**
- Validation: PASS - All 5 milestones validated via `npm run verify`
- Cell highlight: Tested with all close mechanisms (close button, ESC, outside click)
- Scrolling: Tested with short/tall menus, viewport resize, scroll + drag combination
- Dragging: Tested rapid dragging, edge clamping, scroll position preservation
- Performance: FPS 42-48 (maintained), 0 console errors, +4 render calls per frame (highlight)

**Usage:**
```javascript
// Cell highlight API (automatic via context menu)
renderSystem.setHighlightedCell(gridX, gridY);     // Enable highlight
renderSystem.clearHighlightedCell();               // Disable highlight

// Scrolling (automatic via CSS)
// Menus >80vh automatically show scrollbar

// Dragging (automatic via event handlers)
// Click and drag menu header to reposition
// Viewport clamping ensures menu remains accessible
```

**Related Documentation:**
- [Context Menu System](features/context-menu-system.md) - Updated with cell highlight, scrolling, and dragging sections
- [Context Menu UX Devlog](devlogs/2025-12/2025-12-08-context-menu-ux-improvements.md) - Complete implementation history

---

## Recent Implementations

### Water Fertility Performance Optimization - 2025-12-07

**Purpose:** Optimize water fertility system for scalability, achieving 433% FPS improvement

**Implementation:**
- **Phase 0 (P0) - Throttling** (js/core/soil_manager.js): Time-based gating for hourly/daily effects
- **Phase 1 (P1) - Riparian Grid** (js/core/terrain_generator.js, js/core/soil_effects_manager.js): Pre-computed riparian zone spatial cache
- **Phase 2 (P2) - Influence Map** (js/core/terrain_generator.js, js/core/soil_effects_manager.js): Pre-computed water seeping zones

**Key Design Decisions:**
- Throttling matches biological timescales: weather (1x/hour), decomposition (1x/day), seeping (1x/day)
- Spatial caching eliminates O(N×M) nested loops with O(1) Map lookups
- Pre-computation at startup trades memory (~250KB) for runtime performance
- Backwards compatibility maintained with fallback to legacy code paths
- Linear falloff calculations (1.0 - distance/radius) for simplicity and performance

**Performance Gains:**
- **P0 Throttling:** 9 → 43 FPS (+378%)
- **P1 Riparian Grid:** 43 → 48 FPS (+12%), 480x speedup on riparian checks
- **P2 Influence Map:** 48 FPS stable, 45x reduction in operations per day
- **Total:** 9 → 48 FPS (+433%)

**Configuration:**
All systems remain fully configurable via config.json (no breaking changes).

**Testing:**
- Validation: PASS - All metrics met via `npm run verify`
- FPS: 48 (target ≥30, exceeded)
- Load time: 1300-1400ms (acceptable)
- Memory: ~250KB caches (well under 1MB limit)
- Console errors: 0

**Usage:**
```javascript
// Spatial caches auto-generated at terrain initialization
const riparianGrid = terrainGenerator.riparianGrid;  // Map<"x,y", {distance, nearestWater}>
const influenceMap = terrainGenerator.waterSeepingInfluenceMap;  // Map<"x,y", {seepingRate, waterType}>

// O(1) lookup in manager update loops
if (riparianGrid.has(cellKey)) {
    const riparianData = riparianGrid.get(cellKey);
    // Apply riparian bonus
}

// Throttled updates (no manual intervention needed)
// Weather: automatically runs 1x per game hour
// Decomposition: automatically runs 1x per game day
```

**Related Documentation:**
- [Water Fertility Performance Optimization](features/water-fertility-performance-optimization.md) - Complete case study with patterns
- [Flood Events System](features/flood-events-system.md) - Updated with performance section
- [Technical Reference](architecture/technical-reference.md) - Spatial caching and throttling patterns
- [Dev Guidelines](#spatial-optimization-patterns) - Reusable optimization patterns above

---

### PlantGenerator Refactor - Modular Architecture - 2025-12-03

**Purpose:** Refactor monolithic PlantGenerator to modular plugin architecture for improved maintainability

**Implementation:**
- **PlantGenerator** (js/procedural/plant_generator.js): Registry pattern coordinator (937 → 162 lines, 83% reduction)
- **ColorUtils** (js/procedural/utils/color_utils.js): Hue shifting utilities
- **CanvasUtils** (js/procedural/utils/canvas_utils.js): Drawing primitives (ellipse, line, curved line)
- **GeneticsUtils** (js/procedural/utils/genetics_utils.js): Genetic modifiers (dimension, foliage, hue)
- **BaseGenerator** (js/procedural/generators/base_generator.js): Shared base class for all generators
- **HerbGenerator** (js/procedural/generators/herb_generator.js): Nettles sprite generation (374 lines)
- **TreeGenerator** (js/procedural/generators/tree_generator.js): Oak sprite generation with genetics (266 lines)
- **GroundcoverGenerator** (js/procedural/generators/groundcover_generator.js): Clover sprite generation (162 lines)
- **index.html**: Script loading order updated (utilities → base → generators → registry)

**Key Design Decisions:**
- Registry pattern routes by species category: herb → HerbGenerator, tree → TreeGenerator, groundcover → GroundcoverGenerator
- Category inference fallback if not specified in species JSON (checks stage names)
- Utilities extracted for reusability: ColorUtils, CanvasUtils, GeneticsUtils
- BaseGenerator provides shared functionality (canvas creation, stem generation, genetic colors)
- Legacy compatibility maintained with wrapper methods for existing calls
- Each generator is self-contained, no cross-dependencies

**Benefits:**
- 83% reduction in main file (937 → 162 lines)
- Adding new species: create generator method in appropriate file, register in stageMethodMap
- Improved testability: utilities and generators testable in isolation
- Better organization: utilities (190 lines), generators (880 lines), registry (162 lines)

**Configuration:**
No configuration changes - system remains transparent to existing config.

**Testing:**
- Validation: PASS - All 6 milestones via `npm run verify`
- All species generation: Nettles (4 stages), Oak (4 stages), Clover (3 stages)
- Oak genetic diversity: 7+ width variants, 10+ height variants
- Performance: FPS 50 (improved from 46), load time <1.5s
- Registry routing: 0 warnings, 0 errors

**Usage:**
```javascript
// Unchanged API - registry handles routing
const canvas = PlantGenerator.generatePlantSprite(speciesConfig, 'Seedling', null);

// Direct generator access (new capability)
const herbCanvas = HerbGenerator.generateSeedling(nettlesConfig);
const treeCanvas = TreeGenerator.generateSapling(oakConfig, genetics);

// Utilities available globally
const shiftedColor = ColorUtils.shiftHue('#4a7c3c', 20);
const multiplier = GeneticsUtils.getDimensionMultiplier(127);  // 1.0 (mid-range)
CanvasUtils.drawEllipse(ctx, 10, 10, 5, 8, '#4a7c3c');
```

**Related Documentation:**
- [PlantGenerator Refactor Devlog](devlogs/2025-12/2025-12-03-generator-refactor.md) - Complete implementation history
- [Plant Generation System](features/plant-generation-system.md) - Updated with modular architecture
- [Adding New Plant Species](#adding-new-plant-species) - Developer guide above

---

### Terrain Generation System with Procedural Rivers & Lakes - 2025-12-01

**Purpose:** Deterministic procedural world generation with seed-based rivers, lakes, and fertility zones

**Implementation:**
- **ProceduralGenerator** (js/core/procedural_generator.js): Mulberry32 PRNG, river pathfinding with dual sine wave meandering, lake generation with multi-frequency noise perturbation
- **SoilManager** (js/core/soil_manager.js): Water tile tracking, fertility zone calculation with linear falloff, water shader rendering integration
- **Soil Entity** (js/entities/soil.js): `isWater` flag, `waterDepth` property, blue color based on depth
- **GraphicsEngine** (js/core/main_graphics.js): Seed UI initialization, localStorage persistence, URL parameter priority, water shader setup
- **RenderSystem** (js/systems/render_system.js): `renderWaterRect()` method with animated ripple shader
- **UI Integration** (index.html): Seed widget with display, copy, input, and regenerate functionality

**Key Design Decisions:**
- Deterministic PRNG (Mulberry32) ensures same seed generates identical terrain 100% of the time
- Seed priority: URL param > localStorage > config.json > random (Date.now())
- Rivers use dual sine waves (frequencies 2.0 and 5.0) for natural meandering, variable width (2-4 cells)
- Lakes use angle-based perturbation with 3 sine/cosine waves for irregular organic shapes
- Fertility zones use linear falloff within 3-cell radius (+20 nitrogen, +30 water retention)
- Water shader with triple sine wave (frequencies 10, 8, 12) for subtle ripple animation
- Performance optimized: 10ms generation time, 39 FPS with animated water (acceptable vs 60 FPS target)

**Configuration:**
```json
{
    "world": {
        "terrain": {
            "seed": null,
            "water": {
                "rivers": {
                    "enabled": true,
                    "count": 2,
                    "widthMin": 2,
                    "widthMax": 4,
                    "oscillationStrength": 0.2,
                    "frequency1": 2.0,
                    "frequency2": 5.0
                },
                "lakes": {
                    "enabled": true,
                    "count": 3,
                    "radiusMin": 3,
                    "radiusMax": 8,
                    "depthMin": 60,
                    "depthMax": 90,
                    "perturbationAmount": 1.0
                },
                "fertilityBoost": {
                    "enabled": true,
                    "radius": 3,
                    "nitrogenBonus": 20,
                    "waterRetentionBonus": 30
                }
            }
        }
    }
}
```

**Testing:**
- Validation: PASS - All 8 milestones validated via `npm run verify`
- Seed persistence: PASS - 7/7 tests passing via `set TEST_SEED_PERSISTENCE=true && npx playwright test`
- Performance: 10ms generation (4ms rivers + 1ms lakes + 5ms fertility), 39 FPS rendering, 0 errors
- Determinism: Same seed generates identical water tile count (621 tiles: 277 rivers + 344 lakes)
- Visual verification: Rivers meander naturally, lakes have irregular shapes, fertility zones visible as dark brown gradients

**Usage:**
```javascript
// Get current seed
const seed = graphicsEngine.soilManager.getSeed(); // e.g., 3656293739

// Generate terrain with specific seed (via URL)
// Navigate to: http://localhost:8080?seed=12345678

// Check if tile is water
const soil = soilManager.getSoilAt(x, y);
if (soil.isWater) {
    console.log(`Water depth: ${soil.waterDepth}`);
}

// Get all water tiles
const waterTiles = soilManager.waterTiles; // Set of "x,y" keys

// Manual seed regeneration via UI
// 1. Enter seed in input field
// 2. Click "Regenerate" button
// 3. Page reloads with new seed from localStorage
```

**Related Documentation:**
- [Terrain Generation System Feature Doc](features/terrain-generation-system.md) - Comprehensive implementation details with API reference
- [Fertility System](features/fertility-system.md) - Fertility boost zones around water
- [Weather System](features/weather-system.md) - Future integration with dynamic water levels
- [Technical Reference](architecture/technical-reference.md) - Manager patterns and entity interfaces

---

### Lighting System with Day/Night Cycle - 2025-11-30

**Purpose:** Dynamic 24-hour lighting cycle with weather integration for atmospheric depth

**Implementation:**
- **LightingManager** (js/core/lighting_manager.js): Core manager with 9 time-of-day phases, smooth lerp transitions, and weather modulation
- **Shader Integration** (js/core/main_graphics.js): Added `u_ambientLight` uniform to basic, texture, and particle shaders
- **RenderSystem** (js/systems/render_system.js): Modified `setBasicUniforms()` and `setTextureUniforms()` to pass lighting to shaders
- **TimeManager** (js/core/time_manager.js): Added `getHourOfDay()` and `getTimeOfDayString()` methods
- **UI Integration** (index.html): Added time and phase display to Time System UI panel

**Key Design Decisions:**
- Shader-based ambient lighting multiplication rather than per-pixel calculations for performance
- Linear interpolation between phases for smooth transitions (no abrupt changes)
- Weather modifiers combine with time-of-day via multiplication: `finalColor = timeColor × weatherTint × weatherBrightness`
- 9 distinct phases cover full 24-hour cycle: night, earlyMorning, morning, midday, afternoon, evening, sunset, dusk
- Time scale reduced to 0.1x default for better observability (100 seconds per game day)

**Configuration:**
```json
{
    "world": {
        "lighting": {
            "enabled": true,
            "transitionSpeed": 1.0,
            "timeOfDay": {
                "night": { "hours": [0, 6], "color": [0.15, 0.18, 0.35], "brightness": 0.25 },
                "earlyMorning": { "hours": [6, 8], "color": [0.95, 0.75, 0.55], "brightness": 0.65 },
                "morning": { "hours": [8, 12], "color": [1.0, 0.98, 0.92], "brightness": 0.95 },
                "midday": { "hours": [12, 14], "color": [1.0, 1.0, 1.0], "brightness": 1.0 },
                "afternoon": { "hours": [14, 18], "color": [1.0, 0.95, 0.85], "brightness": 0.95 },
                "evening": { "hours": [18, 20], "color": [0.98, 0.85, 0.70], "brightness": 0.75 },
                "sunset": { "hours": [20, 21], "color": [1.0, 0.60, 0.35], "brightness": 0.50 },
                "dusk": { "hours": [21, 23], "color": [0.45, 0.40, 0.60], "brightness": 0.35 }
            },
            "weatherModifiers": {
                "sunny": { "brightnessMultiplier": 1.0, "colorTint": [1.0, 1.0, 1.0] },
                "cloudy": { "brightnessMultiplier": 0.85, "colorTint": [0.95, 0.95, 1.0] },
                "rainy": {
                    "brightnessMultiplier": 0.70,
                    "brightnessIntensityScale": 0.15,
                    "colorTint": [0.85, 0.90, 1.10]
                }
            }
        }
    },
    "time": {
        "initialTimeScale": 0.1,
        "timeScalePresets": {
            "pause": 0,
            "verySlow": 0.05,
            "slow": 0.1,
            "normal": 0.5,
            "fast": 1.0,
            "veryFast": 5.0
        }
    }
}
```

**Testing:**
- Validation: PASS - All 4 milestones validated via `npm run verify`
- Performance: <0.2ms per frame overhead, FPS maintained at 60+
- Visual verification: Smooth transitions between all 9 phases observed
- Weather integration: Cloudy and rainy modifiers correctly darken and tint lighting

**Usage:**
```javascript
// Get current lighting state
const ambientColor = lightingManager.getAmbientColor(); // [r,g,b,a]
const brightness = lightingManager.getAmbientBrightness(); // 0-1
const phase = lightingManager.getCurrentPhase(); // "sunset"

// Manual time control for testing
lightingManager.setTimeOfDay(20); // Jump to sunset
lightingManager.resetTimeOverride(); // Resume automatic time

// Check if enabled
if (lightingManager.isEnabled()) {
    // Apply lighting in custom renderer
}
```

**Related Documentation:**
- [Lighting System Feature Doc](features/lighting-system.md) - Comprehensive implementation details
- [Weather System](features/weather-system.md) - Weather state integration
- [Technical Reference](architecture/technical-reference.md) - Manager patterns

---

## Config Validation - 2025-12-03

**Purpose:** Automated validation of all configuration files against JSON Schema definitions to prevent configuration errors and catch typos before runtime.

**Implementation:**

**Files Created:**
- js/utils/config_validator.js - JSON Schema Draft 7 validator (386 lines)
- js/utils/schema_loader.js - Schema loading utility with caching (59 lines)
- schemas/config.schema.json - Main config validation rules (915 lines)
- schemas/species.schema.json - Species validation rules (383 lines)
- scripts/validate-config.js - CLI validation tool (460 lines)

**Files Modified:**
- index.html - Added script tags for config_validator.js and schema_loader.js
- js/core/main_graphics.js - Added validateConfig() method, runs before initialization
- js/core/plant_manager.js - Added species validation during loadSpecies()

**Key Design Decisions:**

1. **Pure vanilla JS** - ConfigValidator has no external dependencies, works in browser and Node.js
2. **JSON Schema Draft 7** - Standard schema format with comprehensive validation features
3. **Fail fast** - Application throws error on invalid config, prevents runtime issues
4. **Clear error messages** - Errors include property path and expected values
5. **Schema reuse** - $ref definitions reduce duplication in schemas

**Validation Features:**
- Type validation (string, number, integer, boolean, array, object, null)
- Enum validation (category must be "herb", "tree", or "groundcover")
- Range validation (minimum, maximum, exclusiveMinimum, exclusiveMaximum)
- Pattern validation (regex for id, color hex codes, etc.)
- Array constraints (minItems, maxItems)
- Object constraints (required fields, minProperties, additionalProperties)
- Const values (e.g., pause must be exactly 0)
- $ref definitions for reusable schema structures

**Configuration:**

Validation runs automatically on startup and can be run manually:

```bash
npm run validate:config
```

**Schema Structure (config.schema.json):**

Major sections:
- debug - Debug interface settings
- graphics - Rendering configuration
- time - Time system and presets
- world.terrain - Procedural terrain (rivers, lakes, fertility)
- world.map - Grid dimensions
- world.plants - Plant systems (reproduction, genetics, layers)
- world.soil - Soil properties and decomposition
- world.textures - Texture generation parameters
- world.weather - Weather states and effects
- world.lighting - Day/night cycle

Reusable definitions:
- proceduralProperty - Hotspot-based generation
- riverConfig, lakeConfig, fertilityBoostConfig
- geneticsConfig, layerConfig, decompositionConfig
- weatherConfig, weatherState, lightingConfig

**Species Schema (species.schema.json):**

Required fields:
- id (pattern: ^[a-z][a-z0-9_]*$)
- commonName
- category (enum: ["herb", "tree", "groundcover"])
- layer (enum: ["bottom", "middle", "top"])
- appearance (colorPalette, dimensions)
- growthStages (array with minimum 2 stages)
- environment (nutrient requirements, light, root depth)

**Common Validation Errors:**

1. **Invalid category:**
```
- category: Invalid category. Must be one of: herb, tree, groundcover (got: "herbaceous")
```
Fix: Change to "herb", "tree", or "groundcover"

2. **Missing required field:**
```
- environment.nutrientRequirements.nitrogen: is required but missing
```
Fix: Add the missing field with proper structure

3. **Out of range:**
```
- world.map.gridWidth: must be >= 10 (got: 5)
```
Fix: Adjust value to be within allowed range

4. **Type mismatch:**
```
- debug.refreshRate: must be of type integer (got: string)
```
Fix: Change "60" (string) to 60 (number)

5. **Pattern mismatch:**
```
- id: must match pattern ^[a-z][a-z0-9_]*$ (got: "Invalid-Species")
```
Fix: Use snake_case naming (invalid_species)

**Adding New Config Fields:**

1. Add field to config.json:
```json
{
  "world": {
    "newFeature": {
      "enabled": true,
      "parameter": 42
    }
  }
}
```

2. Update schemas/config.schema.json:
```json
{
  "properties": {
    "world": {
      "properties": {
        "newFeature": {
          "type": "object",
          "properties": {
            "enabled": {"type": "boolean", "description": "Enable feature"},
            "parameter": {"type": "integer", "minimum": 0, "maximum": 100}
          }
        }
      }
    }
  }
}
```

3. Validate:
```bash
npm run validate:config
```

4. Document in dev-guidelines.md

**Testing:**
- Validation: PASS via `npm run test:config-validator`
- Integration: Runs on application startup, throws error if invalid
- CLI testing: PASS via `npm run validate:config`
- Performance: +50ms startup time (5.9% overhead, acceptable)

**Real-World Impact:**

The validation system caught and fixed:
1. Nettles category bug (2025-12-03) - Invalid "herbaceous" category caused green rectangle rendering
2. 3 type mismatches during development
3. 2 missing required fields in oak species genetics configuration
4. 1 range error (gridWidth set to 0) during testing

**Usage:**

Automatic validation on startup:
```javascript
// In GraphicsEngine.validateConfig() - runs before initialization
const schemaLoader = new SchemaLoader();
const configSchema = await schemaLoader.loadSchema('schemas/config.schema.json');

const validator = new ConfigValidator();
const result = validator.validateConfig(this.config, configSchema);

if (!result.valid) {
    console.error('Config validation failed:');
    console.error(validator.formatErrorMessage(result.errors));
    throw new Error('Invalid configuration');
}
```

Manual validation during development:
```bash
npm run validate:config

# Output:
# Land Shepherd Config Validation
#
# Validating config.json...
# ✓ config.json is valid
#
# Validating species/nettles.json...
# ✓ species/nettles.json is valid
#
# (etc.)
#
# ✓ All configuration files valid!
# Validated 4 file(s)
```

**Related Documentation:**
- [Config Validation System](features/config-validation-system.md) - Comprehensive system documentation
- [Config Schema](../../schemas/config.schema.json) - Full validation rules
- [Species Schema](../../schemas/species.schema.json) - Species validation rules
- [DevLog 2025-12-03](devlogs/2025-12/2025-12-03-config-validation-system.md) - Implementation history

---
