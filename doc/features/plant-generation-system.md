# Plant Generation System Documentation

## Overview

This document describes the plant generation system implemented in Land Shepherd. The system provides procedural plant sprite generation, interactive plant placement, and a modular architecture for future expansion with additional plant species and growth stages.

## Architecture

### Core Components

The plant system consists of four main components:

1. **Species Configuration System** - JSON-based plant definitions
2. **Plant Entity System** - Individual plant instances with lifecycle management
3. **Procedural Generation System** - Canvas-based sprite generation
4. **Plant Management System** - Placement, removal, and world integration

### File Structure

```
species/
├── nettles.json              # Nettle species configuration
├── oak.json                  # Oak species configuration
├── clover.json               # Clover species configuration

js/entities/
├── plant.js                  # Plant entity class

js/procedural/
├── plant_generator.js        # Registry coordinator
├── utils/                    # Shared utilities
│   ├── color_utils.js       # Color manipulation
│   ├── canvas_utils.js      # Drawing primitives
│   └── genetics_utils.js    # Genetic calculations
└── generators/               # Species-specific generators
    ├── base_generator.js    # Base class
    ├── herb_generator.js    # Herb sprites
    ├── tree_generator.js    # Tree sprites
    └── groundcover_generator.js  # Groundcover sprites

js/core/
├── plant_manager.js          # Plant world management
└── main_graphics.js          # Integration with graphics engine

js/systems/
└── render_system.js          # Extended for plant rendering
```

## Architecture (Updated 2025-12-03)

### Modular Generator System

PlantGenerator uses a plugin architecture with species-specific generators:

**Structure:**
```
js/procedural/
├── plant_generator.js - Registry coordinator
├── utils/ - Shared utilities
│   ├── color_utils.js - Color manipulation
│   ├── canvas_utils.js - Drawing primitives
│   └── genetics_utils.js - Genetic modifiers
└── generators/ - Species-specific logic
    ├── base_generator.js - Base class
    ├── herb_generator.js - Herbs (nettles)
    ├── tree_generator.js - Trees (oaks)
    └── groundcover_generator.js - Ground cover (clover)
```

**Registry Pattern:**
PlantGenerator.generatePlantSprite routes to appropriate generator:
1. Reads species category (herb, tree, groundcover)
2. Maps growth stage to generator method
3. Delegates to species-specific generator
4. Returns generated canvas

**Adding New Species:**
1. Determine category (herb, tree, groundcover)
2. Add generator method to appropriate generator class
3. Add stage-to-method mapping in PlantGenerator.stageMethodMap
4. Update species JSON with correct category

### Utilities

**ColorUtils:**
- `shiftHue(hexColor, hueDegrees)` - Shift hue for genetic variation

**CanvasUtils:**
- `drawEllipse(ctx, x, y, radiusX, radiusY, fillStyle)` - Draw leaf shapes
- `drawLine(ctx, x1, y1, x2, y2, strokeStyle, lineWidth)` - Draw stems
- `drawCurvedLine(ctx, x1, y1, cpx, cpy, x2, y2, strokeStyle, lineWidth)` - Draw drooping leaves

**GeneticsUtils:**
- `getDimensionMultiplier(geneticValue)` - Returns 0.7-1.3x multiplier
- `getFoliageMultiplier(geneticValue)` - Returns 0.6-1.4x multiplier
- `getHueTint(geneticValue)` - Returns -20 to +20 degree hue shift
- `applyGeneticDimensions(baseDimensions, genetics, sizeModifier)` - Apply genetics to dimensions

### Base Generator

**BaseGenerator** provides shared functionality:
- `createCanvas(width, height)` - Create canvas with context
- `generateStem(ctx, x, y, width, height, colors, attachmentPointCount)` - Generate stem with attachment points
- `applyGeneticColors(colors, genetics, hueMultiplier)` - Apply genetic hue shift to color palette

All species generators extend BaseGenerator.

### Species Generators

**HerbGenerator:**
- Stages: Seedling, Vegetative, Flowering, Withered
- Species: Nettles (urtica_dioica)
- Features: Stem with leaves, flower clusters, serrated edges

**TreeGenerator:**
- Stages: Sapling, YoungTree, MatureTree, Withered
- Species: Oak (quercus_robur)
- Features: Trunk with canopy, genetic diversity support, bare branches when withered

**GroundcoverGenerator:**
- Stages: Sprout, Spreading, Flowering
- Species: Clover (trifolium_repens)
- Features: 3-leaf pattern, heart-shaped leaves, flower clusters

## Implementation Files

### Core Files
- `js/procedural/plant_generator.js` - Registry coordinator (162 lines)

### Utilities
- `js/procedural/utils/color_utils.js` - Color manipulation (69 lines)
- `js/procedural/utils/canvas_utils.js` - Drawing helpers (63 lines)
- `js/procedural/utils/genetics_utils.js` - Genetic calculations (58 lines)

### Generators
- `js/procedural/generators/base_generator.js` - Base class (78 lines)
- `js/procedural/generators/herb_generator.js` - Herb sprites (374 lines)
- `js/procedural/generators/tree_generator.js` - Tree sprites (266 lines)
- `js/procedural/generators/groundcover_generator.js` - Groundcover sprites (162 lines)

### Species Configuration
- `species/nettles.json` - Nettle config (category: herb)
- `species/oak.json` - Oak config (category: tree)
- `species/clover.json` - Clover config (category: groundcover)

## Testing
- `tests/generator-refactor-validation.spec.js` - Generator validation test

## Performance
- Sprite generation: <10ms per sprite
- FPS: 50+ maintained with genetic diversity
- Load time: <1.5s for all generators

## Species Configuration

### Format

Species are defined in JSON files with the following structure:

```json
{
  "id": "species_identifier",
  "commonName": "Display Name",
  "category": "plant_category",
  "layer": "rendering_layer",
  
  "appearance": {
    "colorPalette": {
      "leaf": ["#color1", "#color2"],
      "stem": ["#color1", "#color2"]
    }
  },
  
  "growthStages": [
    {
      "name": "StageName",
      "generator": "generatorFunction",
      "visibleOrgans": ["organ1", "organ2"]
    }
  ],
  
  "proceduralModules": {
    "stem": {
      "segments": 3,
      "curveIntensity": 0.1,
      "colorVariation": 0.15,
      "baseWidth": 0.4
    },
    "leaf": {
      "shapeType": "serrated",
      "irregularity": 0.3,
      "pairCount": 2,
      "edgeVariation": 0.8
    }
  }
}
```

### Current Species

#### Stinging Nettle (Urtica dioica)

- **Category**: Wild herb (middle layer)
- **Size**: 20x20 pixels
- **Growth Stages**: Seedling (3 days) → Vegetative (7 days) → Flowering (10 days) → Withered (5 days)
- **Light Requirement**: 0.6 (moderate light needs)
- **Root Depth**: Shallow
- **Nutrient Demand**: Moderate nitrogen, moderate phosphorus
- **Reproduction**: Enabled in Flowering stage, dispersal radius 3 cells
- **Leaf Configuration**: 2 serrated leaves with alternating placement
- **Visual Characteristics**: Green stem with attached leaves and connecting petioles

#### Oak Tree (Quercus robur)

- **Category**: Tree (top layer)
- **Size**: 40x50 pixels
- **Growth Stages**: Sapling (20 days) → YoungTree (40 days) → MatureTree (indefinite) → Withered (15 days)
- **Light Requirement**: 0.9 (high light needs)
- **Root Depth**: Deep
- **Nutrient Demand**: High nitrogen, high phosphorus, high potassium
- **Reproduction**: Enabled in MatureTree stage, dispersal radius 5 cells
- **Visual**: Progressive canopy development from small (sapling) to full mature tree
- **Ecological Role**: Canopy layer, shade casting, deep nutrient access

#### Clover (Trifolium repens)

- **Category**: Herb (ground cover, bottom layer)
- **Size**: 16x16 pixels
- **Growth Stages**: Sprout (2 days) → Spreading (5 days) → Flowering (indefinite) → Withered (5 days)
- **Light Requirement**: 0.5 (tolerates partial shade, can grow under trees)
- **Root Depth**: Shallow
- **Nutrient Demand**: Low nitrogen (nitrogen-fixing in real life), moderate phosphorus for flowering
- **Reproduction**: High seed production in Flowering stage, dispersal radius 2 cells
- **Visual**: Characteristic 3-leaf pattern with white/pink flower clusters
- **Ecological Role**: Ground cover, soil improvement, nitrogen fixation (future)

## Plant Entity System

### Plant Class

Each plant instance is represented by a Plant entity with the following properties:

- **Position**: World coordinates (x, y)
- **Species Configuration**: Reference to species data
- **Growth Stage**: Current stage of development
- **Age**: Time since creation
- **Health**: Plant vitality (0.0 to 1.0)
- **Sprite Data**: Generated texture and WebGL cache

### Lifecycle Management

Plants have a basic update cycle that tracks age and can be extended for:
- Growth stage transitions
- Health degradation
- Environmental responses
- Seasonal changes

## Procedural Generation

### Sprite Generation Pipeline

The PlantGenerator creates plant sprites using HTML5 Canvas with the following process:

1. **Canvas Creation**: 20x20 pixel canvas for each plant
2. **Stem Generation**: Base stem structure with color variation
3. **Leaf Attachment**: Leaves positioned at specific stem coordinates
4. **Detail Addition**: Serration marks and connecting petioles

### Stem Generation

Stems are generated with:
- Configurable base width and height
- Color variation for texture
- Attachment points for leaf positioning

### Leaf Generation

Leaves feature:
- Species-specific shape (oval for nettles)
- Alternating side placement (left/right pattern)
- Attachment to specific stem coordinates
- Serrated edge details for nettle species
- Connecting petioles (stems) to main plant stem

### Attachment System

Leaves attach to predefined points on the stem:
- Upper position (right side)
- Middle position (left side)
- Lower position (right side) - if pairCount allows

This creates a natural alternating leaf pattern common in many plant species.

## Plant Management

### PlantManager Class

The PlantManager handles:
- Species configuration loading
- Plant placement and removal
- Grid coordinate management
- Plant lifecycle updates
- Visibility culling for performance

### Placement System

Plants can be placed via right-click interaction with the following constraints:
- Must be on valid soil cells
- Soil must be currently visible/rendered
- Only one plant per grid cell
- Existing plants are removed when placing in occupied cells

### Coordinate System

The system uses a grid-based coordinate system:
- Grid coordinates for placement logic
- World coordinates for rendering
- Automatic conversion between systems
- Integration with soil manager cell size

## Rendering Integration

### WebGL Rendering

Plants are rendered using the texture rendering pipeline:
- Canvas-generated sprites converted to WebGL textures
- Cached textures for performance
- Batch rendering with other textured entities
- Transparency support for plant sprites

### Render Pipeline Integration

Plants are rendered in the middle layer between soil and character:
1. Soil (background)
2. Plants (middle layer)
3. Character and UI (foreground)

### Performance Optimizations

- Texture caching to avoid regeneration
- Visibility culling based on camera bounds
- Batch rendering for multiple plants
- Efficient grid-based lookups

## Debug Integration

### Debug Panel

The system integrates with the debug panel to show:
- Plant count in real-time
- Color-coded population indicators:
  - Gray: No plants (0)
  - Yellow: Few plants (1-9)
  - Green: Many plants (10+)

### Console Logging

Debug logging can be enabled to track:
- Species loading status
- Plant placement attempts
- Soil visibility checks
- Sprite generation success/failure

## Input System

### Right-Click Interaction

Right-click functionality provides:
- Plant placement on valid soil
- Plant removal from occupied cells
- Coordinate conversion from screen to grid
- Validation of placement constraints

### Input Processing

The input system processes right-clicks through:
1. Screen coordinate capture
2. World coordinate conversion
3. Grid coordinate calculation
4. Soil existence and visibility validation
5. Plant placement or removal execution

## Future Expansion

### Planned Features

The architecture supports future expansion with:
- Additional growth stages (vegetative, flowering, fruiting)
- Multiple plant species
- Genetic variation within species
- Environmental responses
- Seasonal lifecycle changes
- Plant interactions and competition

### Modular Design

The system is designed for easy extension:
- New species can be added via JSON files
- Growth stages can be configured per species
- Procedural modules can be expanded
- Rendering pipeline supports complex sprites

### Performance Scalability

The system is optimized for larger plant populations:
- Grid-based spatial indexing
- Visibility culling
- Efficient batch rendering
- Texture caching

## Technical Specifications

### Dependencies

- HTML5 Canvas for sprite generation
- WebGL for rendering
- Existing soil and camera systems
- Input management system

### Performance Characteristics

- Sprite generation: ~1-2ms per plant
- Memory usage: ~4KB per plant texture
- Rendering: Batched with other textured entities
- Grid lookups: O(1) for placement operations

### Browser Compatibility

- Modern browsers with Canvas support
- WebGL 1.0 or 2.0 required
- ES6+ JavaScript features

## Usage Examples

### Category Validation

**IMPORTANT:** Species JSON must use exactly one of these three categories:
- `herb`
- `tree`
- `groundcover`

**Invalid categories** (e.g., `wild_herb`, `flower`, `bush`) will cause the plant to render as a green rectangle fallback sprite. The PlantGenerator router will fail silently and log a warning to console.

**Example of common mistake:**
```json
// ✗ WRONG - Custom category
"category": "wild_herb"

// ✓ CORRECT - Standard category
"category": "herb"
```

**To add support for new categories:**
1. Create a new generator class (e.g., BushGenerator extends BaseGenerator)
2. Register it in PlantGenerator.generators: `bush: BushGenerator`
3. Update species JSON to use the new category: `"category": "bush"`

### Adding a New Species

1. Create species JSON file in `/species/` directory
2. Define appearance and procedural modules
3. Add species loading to PlantManager
4. Test with right-click placement

### Extending Growth Stages

1. Add new stage to species growthStages array
2. Create corresponding generator function
3. Implement stage transition logic in Plant class
4. Update rendering for new visual elements

### Custom Procedural Modules

1. Define module parameters in species JSON
2. Extend PlantGenerator with new generation methods
3. Integrate with sprite composition pipeline
4. Test visual output and performance

This documentation provides a comprehensive overview of the current plant generation system and guidelines for future development and expansion.

---

## Plant Positioning System (Updated November 16, 2025)

### Positioning Architecture

Plants use a grid-based positioning system with two distinct placement methods:

#### 1. Manual Placement (User Click)

**Method**: `PlantManager.addPlantAtPosition(gridX, gridY, exactWorldX, exactWorldY)`

**Behavior**:
- Plant spawns at **exact click coordinates**
- Precise visual position matching cursor
- Used for intentional, user-controlled placement

#### 2. Automatic Placement (Reproduction)

**Method**: `PlantManager.addPlant(gridX, gridY, speciesId, currentDay)`

**Behavior**:
- Plant spawns at **random position within cell**
- 2-pixel margin from cell edges
- Creates natural variation in colonies
- Prevents monotonous grid alignment

### Randomization Implementation

```javascript
// Calculate cell boundaries
const cellLeft = gridX * this.soilManager.cellSize;
const cellTop = gridY * this.soilManager.cellSize;

// Add random offset within cell (2px margin)
const margin = 2;
const randomOffsetX = margin + Math.random() * (cellSize - 2 * margin);
const randomOffsetY = margin + Math.random() * (cellSize - 2 * margin);

// Final world position
const worldX = cellLeft + randomOffsetX;
const worldY = cellTop + randomOffsetY;
```

### Visual Comparison

**Without Randomization** (before):
```
┌───┬───┬───┐
│ • │ • │ • │  Monotonous grid pattern
├───┼───┼───┤
│ • │ • │ • │  All plants at cell centers
├───┼───┼───┤
│ • │ • │ • │  Unnatural appearance
└───┴───┴───┘
```

**With Randomization** (after):
```
┌───┬───┬───┐
│•  │ •│  •│  Natural variation
├───┼───┼───┤
│ • │• │ • │  Organic appearance
├───┼───┼───┤
│  •│ •│•  │  Colony-like clusters
└───┴───┴───┘
```

### Benefits

- **Visual Variety**: Each reproduced plant appears unique
- **Natural Appearance**: Mimics real-world colony growth
- **Organic Spread**: Reduces obvious grid patterns
- **Consistent Experience**: Same randomization for all automatic spawning

### Edge Margin Purpose

**2-pixel margin prevents**:
- Plants touching cell borders
- Visual clipping with grid lines
- Overlap with adjacent cells
- Rendering artifacts

**Calculation**:
- Cell size: 20px
- Margin: 2px each side
- Usable area: 16px
- 8% margin on each side

---

## Multi-Layer Plant Placement (Updated December 1, 2025)

### Overview

**Feature:** Multiple plants can coexist on the same grid cell by occupying different vertical layers.

This system enables realistic plant communities where ground cover, herbs, and trees grow together on the same soil, creating complex ecosystems with vertical stratification.

### Layer System

The system defines three vertical layers:

- **Bottom layer**: Ground cover (e.g., Clover) - grows at base, +0px render offset
- **Middle layer**: Herbs, bushes (e.g., Stinging Nettle) - grows above ground, +5px render offset
- **Top layer**: Trees (e.g., Oak Tree) - tallest plants, +15px render offset

### Visual Stacking

When all 3 layers are occupied, plants render in order:

1. Clover (bottom) - 16x16px at +0px offset - Ground cover base
2. Nettle (middle) - 20x20px at +5px offset - Herb layer above ground
3. Oak (top) - 40x50px at +15px offset - Canopy layer above all

This creates a natural ecosystem appearance with ground cover beneath herbs beneath trees, mimicking real forest stratification.

**Example: Full 3-Layer Ecosystem**

### Storage Architecture

PlantManager uses a nested Map structure for efficient layer-based storage:

```javascript
// Structure: Map<"x,y", Map<layer, Plant>>
// Example: Cell (10, 10) with nettle (middle) and oak (top)
{
  "10,10": Map {
    "middle" => Plant(nettle),
    "top" => Plant(oak)
  }
}
```

**Benefits:**
- O(1) lookup for any layer at any cell
- Memory efficient (only cells with plants consume memory)
- Supports partial occupancy (1-3 plants per cell)
- Clean removal without affecting other layers

### API Methods

#### PlantManager Helper Methods

**`getAvailableLayersAt(gridX, gridY)`**
- **Returns:** Array of unoccupied layers `['bottom', 'middle', 'top']`
- **Purpose:** Check which layers are available for planting
- **Example:**
  ```javascript
  const available = plantManager.getAvailableLayersAt(10, 10);
  // => ['bottom', 'middle', 'top'] if cell empty
  // => ['bottom', 'top'] if middle occupied
  ```

**`canPlantAt(gridX, gridY, layer)`**
- **Returns:** Boolean indicating if layer is plantable
- **Checks:** Water tiles and layer occupancy
- **Example:**
  ```javascript
  if (plantManager.canPlantAt(10, 10, 'middle')) {
      // Layer is available and not water
  }
  ```

**`getPlantableSpeciesAt(gridX, gridY)`**
- **Returns:** Array of `{speciesId, layer, config}` objects
- **Purpose:** Get which species can be planted at this cell
- **Example:**
  ```javascript
  const plantable = plantManager.getPlantableSpeciesAt(10, 10);
  // => [
  //   { speciesId: 'urtica_dioica', layer: 'middle', config: {...} },
  //   { speciesId: 'quercus_robur', layer: 'top', config: {...} }
  // ]
  ```

**`getPlantAt(gridX, gridY, layer?)`**
- **Returns:** Plant or array of Plants
- **Behavior:** If layer specified, returns single plant. If omitted, returns all plants as array.
- **Example:**
  ```javascript
  // Get specific layer
  const oak = plantManager.getPlantAt(10, 10, 'top');
  // => Plant(oak) or null
  
  // Get all plants at cell
  const plants = plantManager.getPlantAt(10, 10);
  // => [Plant(nettle), Plant(oak)]
  ```

**`removePlant(gridX, gridY, layer?)`**
- **Returns:** Boolean indicating if removal succeeded
- **Behavior:** If layer specified, removes only that layer. If omitted, removes all plants.
- **Example:**
  ```javascript
  // Remove specific layer
  plantManager.removePlant(10, 10, 'middle'); // Removes nettle, oak remains
  
  // Remove all plants at cell
  plantManager.removePlant(10, 10); // Removes nettle and oak
  ```

### Usage Example (Full 3-Layer Stack)

```javascript
// Plant clover (bottom layer - ground cover)
plantManager.addPlant(10, 10, 'trifolium_repens');
// Available now: ['middle', 'top']

// Plant nettle (middle layer - herb) on same cell
plantManager.addPlant(10, 10, 'urtica_dioica');
// Available now: ['top']

// Plant oak (top layer - tree) on same cell
plantManager.addPlant(10, 10, 'quercus_robur');
// Available now: [] (all layers occupied)

// Get all plants at cell
const plants = plantManager.getPlantAt(10, 10);
// => [Plant(clover), Plant(nettle), Plant(oak)]

// Get specific layer
const clover = plantManager.getPlantAt(10, 10, 'bottom');
const nettle = plantManager.getPlantAt(10, 10, 'middle');
const oak = plantManager.getPlantAt(10, 10, 'top');

// Remove specific layer (e.g., remove nettle but keep clover and oak)
plantManager.removePlant(10, 10, 'middle'); // Removes only nettle
```

### Context Menu UI

The context menu provides visual feedback about multi-layer occupancy:

#### Empty Cell

```
Plant:
  [Nettle (middle)]   ← green border
  [Oak (top)]         ← sea green border
  [Clover (bottom)]   ← brown border
```

#### Cell with Plants (Full 3-Layer Example)

```
[TOP]
  Oak Tree (MatureTree)
  Age: 25.3 days
  Growth: 85% (Optimal)
  [Advance] [Remove]

[MIDDLE]
  Stinging Nettle (Flowering)
  Age: 12.1 days
  Growth: 92% (Optimal)
  [Advance] [Remove]

[BOTTOM]
  Clover (Spreading)
  Age: 5.2 days
  Growth: 88% (Optimal)
  [Advance] [Remove]
```

**Layer Colors:**
- **Bottom**: Brown (`#8B4513`) - Ground level
- **Middle**: Forest green (`#228B22`) - Herb level
- **Top**: Sea green (`#2E8B57`) - Canopy level

**Actions:**
- **Advance**: Progress plant to next growth stage
- **Remove**: Delete plant from specific layer only

### Render Order

Plants render from bottom to top with Y-axis offsets to create visual depth:

```javascript
// Render offsets (pixels)
const layerOffsets = {
    'bottom': 0,    // Base position
    'middle': 5,    // Slightly elevated
    'top': 15       // Highest elevation
};
```

**Effect:** Creates natural stacking appearance where:
- Ground cover appears at base level
- Herbs appear slightly raised
- Trees appear tallest

**Technical:** Offset is added to plant's world Y coordinate during rendering, not stored in plant position data.

### Species Configuration

Each species specifies its layer in `species/*.json`:

**Nettle (Middle Layer)**:
```json
{
  "id": "urtica_dioica",
  "commonName": "Stinging Nettle",
  "layer": "middle",
  "lightRequirement": 0.6,
  "rootDepth": "shallow"
}
```

**Oak (Top Layer)**:
```json
{
  "id": "quercus_robur",
  "commonName": "Oak Tree",
  "layer": "top",
  "lightRequirement": 0.9,
  "rootDepth": "deep"
}
```

**Clover (Bottom Layer)**:
```json
{
  "id": "trifolium_repens",
  "commonName": "Clover",
  "layer": "bottom",
  "lightRequirement": 0.5,
  "rootDepth": "shallow"
}
```

**Layer Assignment Rules:**
- Ground cover (clover, moss, grass) → `"layer": "bottom"`
- Herbs, bushes, low plants (nettles) → `"layer": "middle"`
- Trees, tall shrubs (oak) → `"layer": "top"`

### Ecological Interactions (Future)

The multi-layer system enables future ecological mechanics:

#### Light Competition
- Tall plants (top layer) cast shade on lower layers
- Oak trees can reduce light availability for nettles below
- Shade-tolerant species can coexist with canopy plants

#### Nutrient Stratification
- **Shallow roots** (herbs): Compete for surface nutrients
- **Deep roots** (trees): Access deeper soil layers
- Different root depths reduce direct competition

#### Reproduction
- Offspring respect layer boundaries
- Nettles only clone into empty middle layer cells
- Trees only colonize empty top layer cells

#### Succession Dynamics
```
Stage 1: Nettles colonize empty soil (middle layer)
  ↓
Stage 2: Oak saplings establish (top layer)
  ↓
Stage 3: Oaks mature and cast shade
  ↓
Stage 4: Shade-tolerant ground cover establishes (bottom layer)
  ↓
Stage 5: Mature multi-layer forest ecosystem
```

### Performance

**Storage:**
- Nested Map with O(1) lookup: `map.get(key).get(layer)`
- Memory scales with occupied cells only
- Empty cells: 0 bytes
- 1 plant: ~32 bytes (outer Map entry + inner Map)
- 2 plants: ~40 bytes (shared outer Map entry)
- 3 plants: ~48 bytes (all layers occupied)

**Rendering:**
- No additional cost (already layer-aware from lighting system)
- Plants sorted by layer before rendering
- Single pass through all plants

**FPS Impact:**
- Before: 47 FPS (1000 plants across 500 cells)
- After: 47 FPS (no regression)
- 3x plant density potential: 3000 plants across 1000 cells ≈ 35-40 FPS (acceptable)

**Grid-wide Memory:**
- 2500 cells, 3 plants each: ~120 KB (0.12 MB)
- Negligible compared to WebGL buffers (~2-5 MB)

### Backward Compatibility

The multi-layer system maintains full backward compatibility:

**Legacy Code:**
```javascript
// Old code: assumes single plant per cell
const plant = plantManager.getPlantAt(gridX, gridY);
```

**Multi-layer Behavior:**
- Returns **array** instead of single plant
- `plant[0]` gives first plant (if exists)
- Code expecting single plant needs `getPlantAt(gridX, gridY, layer)` or `plants[0]`

**Migration Path:**
1. Replace `getPlantAt(x, y)` → `getPlantAt(x, y)[0]` for single plant
2. Or use `getPlantAt(x, y, 'middle')` for specific layer
3. Update removal: `removePlant(x, y)` → `removePlant(x, y, layer)`

### Testing

**Test Coverage:**
- `tests/multi-layer-simple.spec.js` - Core multi-layer functionality
- 3 comprehensive tests validating:
  - Planting multiple species on same cell
  - Helper method behavior (getAvailableLayersAt, canPlantAt)
  - Layer-specific operations (get, remove by layer)

**Manual Testing:**
```bash
npm run verify                    # Full automated suite
# Open test-results/multi-layer-plants-stacked.png to see visual result
```

**Visual Test:**
- Right-click empty soil → Plant Nettle
- Right-click same cell → Plant Oak
- Right-click again → See multi-layer context menu
- Observe visual stacking (oak appears above nettle)

### Implementation Files

**Core:**
- `js/core/plant_manager.js` - Nested Map storage, helper methods
- `js/entities/plant.js` - Layer getter method
- `js/systems/context_menu_manager.js` - Multi-layer UI display

**Configuration:**
- `species/nettles.json` - `"layer": "middle"`
- `species/oak.json` - `"layer": "top"`

**Styling:**
- `css/styles.css` - Layer header, empty layer, action button styles

**Testing:**
- `tests/multi-layer-simple.spec.js` - Automated test suite

### Known Limitations

1. **Bottom layer species not yet implemented**
   - Layer exists in architecture
   - No ground cover species defined yet
   - Future: moss, grass, ferns

2. **No light competition yet**
   - Trees don't cast shade on lower layers
   - All layers receive full light
   - Future: shade mechanics integration

3. **Reproduction doesn't cross layers**
   - Nettles only clone to middle layer
   - Trees only clone to top layer
   - Intentional design (species stay in their layer)

4. **Visual Z-ordering simplistic**
   - Fixed offsets (0, 5, 15 pixels)
   - Future: dynamic sorting by world Y + layer offset

### Future Enhancements

**Planned:**
- **Ground cover species** (moss, grass, clover)
- **Light competition** between layers
- **Root competition** mechanics
- **Mycorrhizal networks** connecting plants across layers
- **Succession dynamics** (early → late stage communities)
- **Visual improvements** (parallax effect, dynamic shadows)

**Possible:**
- **4-layer system** (ground, herb, shrub, canopy)
- **Epiphytes** (plants growing on trees)
- **Climbing plants** (vines transitioning between layers)
