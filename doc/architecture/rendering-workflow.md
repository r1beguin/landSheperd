Here’s a **detailed procedural rendering pipeline diagram** (in text form for documentation) showing how the modules combine and how their data flows from the `Phenotype` to the final rendered entity.

It’s designed for **2D isometric or top-down rendering**, but can easily be adapted for 3D or hybrid layers (e.g., billboards or mesh quads).

---

# Rendering Workflow & Pipeline

**Last Updated:** 2025-12-08  
**Status:** Complete with isometric rendering support

## Overview

Land Shepherd's rendering pipeline supports two projection modes:
- **Orthographic:** Traditional top-down 2D view with 1:1 grid-to-screen mapping
- **Isometric:** 2.5D perspective with diamond-shaped tiles and depth sorting

Each plant entity is procedurally generated in **layers**, from underground roots to visible canopy, based on the **Phenotype**.  
Every layer module receives a consistent seed and phenotype data, so results are **deterministic and unique** for each individual.

---

## Projection Modes

### Orthographic Rendering (Traditional)

**Coordinate System:**
- Grid coordinates (0-49, 0-49) map directly to screen pixels
- `screenX = gridX * cellSize`
- `screenY = gridY * cellSize`
- No depth sorting required (natural render order)

**Use Cases:**
- Rapid prototyping and debugging
- Simplified input handling
- Maximum performance (60+ FPS)

### Isometric Rendering (2.5D)

**Coordinate System:**
- Grid coordinates converted to isometric screen coordinates via IsometricUtils
- `isoX = (gridX - gridY) * (tileWidth / 2)`
- `isoY = (gridX + gridY) * (tileHeight / 2)`
- Depth sorting required (painter's algorithm)

**Visual Characteristics:**
- Diamond-shaped tiles at 2:1 ratio (tileWidth:tileHeight = 40:20)
- ~26.5° viewing angle
- Natural occlusion (back entities behind front entities)
- Pseudo-3D depth perception

**Performance:**
- 34-38 FPS (50x50 grid + 500 plants)
- ~30% FPS reduction vs orthographic (acceptable)
- Depth sorting overhead: ~3ms per frame

---

## Rendering Pipeline Flow

### Initialization Phase

```
1. GraphicsEngine.initialize()
   ├─→ ShaderManager.compileShaders()
   ├─→ GeometryManager.createGeometries()
   ├─→ ProceduralGenerator.generateTerrain()
   │   └─→ If isometric: Calculate Z-order metadata
   ├─→ SoilManager.initialize()
   │   └─→ If isometric: Sort soil tiles by Z-order
   ├─→ PlantManager.loadSpecies()
   └─→ RenderSystem.initialize()
       └─→ If isometric: Create diamond geometry buffers
```

### Frame Rendering Loop

```
1. RenderSystem.render(deltaTime)
   ├─→ Clear canvas
   ├─→ Apply camera transform
   ├─→ Apply lighting (ambientColor, brightness)
   │
   ├─→ Render Soil Layer
   │   ├─→ If isometric: SoilManager.renderIsometricSoils()
   │   │   ├─→ Collect visible cells
   │   │   ├─→ Sort by Z-order (back to front)
   │   │   └─→ Render diamond tiles
   │   └─→ If orthographic: SoilManager.renderSoils()
   │       └─→ Render square tiles (no sorting)
   │
   ├─→ Render Plant Layers (bottom → middle → top)
   │   ├─→ For each layer:
   │   │   ├─→ Get plants in layer
   │   │   ├─→ If isometric: Sort by Z-order
   │   │   ├─→ For each plant:
   │   │   │   ├─→ getRenderData() → {x, y, zOrder, sprite}
   │   │   │   └─→ renderSprite(x, y, sprite)
   │   │   └─→ Apply layer offset (bottom: 0, middle: +5, top: +15)
   │
   ├─→ Render Weather Particles
   │   ├─→ If isometric: Diagonal fall (velocityX = -velocityY * 0.3)
   │   └─→ If orthographic: Vertical fall (velocityX = 0)
   │
   ├─→ Render UI Overlays
   │   ├─→ If cell highlighted: renderIsometricCellHighlight()
   │   ├─→ Nutrient overlays (if enabled)
   │   └─→ Debug info
   │
   └─→ Swap buffers
```

---

## Isometric Rendering Details

### Coordinate Conversion

**Grid → Isometric:**
```javascript
// IsometricUtils.gridToIso(gridX, gridY, tileWidth, tileHeight)
const isoX = (gridX - gridY) * (tileWidth / 2);
const isoY = (gridX + gridY) * (tileHeight / 2);

// Example: Grid (25, 25) → Iso (0, 500) - center of grid
```

**Isometric → Grid:**
```javascript
// IsometricUtils.isoToGrid(screenX, screenY, tileWidth, tileHeight)
const gridX = (screenX / (tileWidth / 2) + screenY / (tileHeight / 2)) / 2;
const gridY = (screenY / (tileHeight / 2) - screenX / (tileWidth / 2)) / 2;
return {x: Math.floor(gridX), y: Math.floor(gridY)};
```

### Depth Sorting Algorithm

**Z-Order Calculation:**
```javascript
// IsometricUtils.getZOrder(gridX, gridY)
zOrder = gridX + gridY;

// Back-left corner (0,0) → z=0 (render first)
// Center (25,25) → z=50 (render middle)
// Front-right corner (49,49) → z=98 (render last)
```

**Painter's Algorithm:**
```javascript
// Sort entities by Z-order before rendering
entities.sort((a, b) => {
    const zA = IsometricUtils.getZOrder(a.gridX, a.gridY);
    const zB = IsometricUtils.getZOrder(b.gridX, b.gridY);
    return zA - zB; // Back to front
});

// Render in sorted order
entities.forEach(entity => renderEntity(entity));
```

**Why It Works:**
- Entities with lower Z-order (back) are drawn first
- Entities with higher Z-order (front) are drawn on top
- Natural occlusion without Z-buffer (2D canvas)

### Diamond Tile Rendering

**Geometry:**
```javascript
// GeometryManager.createIsoDiamond(tileWidth, tileHeight)
const halfW = tileWidth / 2;  // 20px
const halfH = tileHeight / 2; // 10px

// Diamond vertices (triangulated)
vertices = [
    // Triangle 1 (top half)
    0, halfH,      // Top vertex
    -halfW, 0,     // Left vertex
    halfW, 0,      // Right vertex
    
    // Triangle 2 (bottom half)
    0, -halfH,     // Bottom vertex
    halfW, 0,      // Right vertex
    -halfW, 0      // Left vertex
];
```

**Rendering:**
```javascript
// RenderSystem.renderIsoDiamond(x, y, tileWidth, tileHeight, color, alpha)
1. Bind diamond geometry buffer
2. Set position uniforms (x, y)
3. Set color uniforms (r, g, b, alpha)
4. Draw 6 vertices (2 triangles)
```

### Weather Particle Integration

**Diagonal Particle Fall:**
```javascript
// WeatherManager.spawnParticles()
const isIsometric = config.world.rendering.projection === 'isometric';

if (isIsometric) {
    // Spawn in extended diamond area (+40% width)
    const extraWidth = bounds.width * 0.4;
    particle.x = (bounds.left - extraWidth) + Math.random() * (bounds.width + extraWidth * 2);
    
    // Diagonal velocity (~17° angle)
    particle.velocityY = fallSpeed;
    particle.velocityX = -fallSpeed * 0.3; // Leftward drift
} else {
    // Orthographic: straight down
    particle.x = bounds.left + Math.random() * bounds.width;
    particle.velocityY = fallSpeed;
    particle.velocityX = 0;
}
```

**Visual Result:**
- Rain appears to fall "into" the isometric scene
- Splash effects land on correct isometric tile positions
- Natural perspective matching tile angle

---

## Procedural Plant Generation Pipeline

---

## Text Diagram

```
                         ┌───────────────────────────────┐
                         │        Phenotype Data         │
                         │ (colorProfile, geometry, ... )│
                         └──────────────┬────────────────┘
                                        │
                                        ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │                           Procedural Modules                              │
 ├───────────────────────────────────────────────────────────────────────────┤
 │                                                                           │
 │ 1. RootGeneration(phenotype)                                              │
 │     └─ Generates root shape map / base sprite layer                       │
 │        - Input: soilDepth, rootPattern, humidityTolerance                 │
 │        - Output: texture mask or hidden structure                         │
 │                                                                           │
 │ 2. TrunkGeneration(phenotype)                                             │
 │     └─ Builds base stem/trunk geometry or spline                          │
 │        - Input: trunkHeight, trunkThickness, barkTexture                  │
 │        - Output: procedural path & base mesh                              │
 │                                                                           │
 │ 3. StemGeneration(phenotype)                                              │
 │     └─ Creates secondary stems and nodes for leaves                       │
 │        - Input: branchingFactor, nodeSpacing                              │
 │        - Output: hierarchical stem data                                   │
 │                                                                           │
 │ 4. LeafGeneration(phenotype)                                              │
 │     └─ Generates individual leaves                                         │
 │        - Input: leafShape, leafCount, orientation, colorGradient          │
 │        - Output: sprite atlas & leaf placement coordinates                │
 │                                                                           │
 │ 5. FlowerGeneration(phenotype)                                            │
 │     └─ Adds reproductive organs                                           │
 │        - Input: bloomStage, petalCount, colorProfile                      │
 │        - Output: overlaid flower sprites                                  │
 │                                                                           │
 │ 6. FruitGeneration(phenotype)                                             │
 │     └─ Adds fruits or seed pods                                           │
 │        - Input: maturity, seedCount, fruitColor                           │
 │        - Output: fruit sprite set                                         │
 │                                                                           │
 │ 7. WitherGeneration(phenotype)                                            │
 │     └─ Applies health-dependent texture degradation                       │
 │        - Input: health, diseaseLevel, waterStress                         │
 │        - Output: tint / opacity / desaturation overlay                    │
 │                                                                           │
 └───────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │   Sprite Compositor      │
                          └──────────────────────────┘
                                        │
                                        ▼
                     ┌─────────────────────────────────────┐
                     │    RenderedPlantEntity (final)      │
                     │  combined texture or multi-layered  │
                     │  sprites with animation + lighting  │
                     └─────────────────────────────────────┘
```

---

## Layer Order (Render Stack)

For **2D rendering**, each stage contributes to a stack of sprite layers, rendered bottom-to-top:

|Layer ID|Module|Z-order|Notes|
|---|---|---|---|
|0|RootGeneration|Hidden or below ground|Optional visualization|
|1|TrunkGeneration|Base visible stem|Defines global silhouette|
|2|StemGeneration|Mid-layer branches|Adds structure complexity|
|3|LeafGeneration|Mid-top canopy|Can have animated wind movement|
|4|FlowerGeneration|Top detail layer|Optional stage-based|
|5|FruitGeneration|Overlay|May flicker on hover or harvest-ready|
|6|WitherGeneration|Color/tint overlay|Alters all visible layers|

All modules output **procedural metadata** (bounding boxes, growth anchor points, stage interpolation data) for animation and physics integration.

---

## Procedural Layer Integration (Algorithmic Steps)

```js
function generatePlantSprite(phenotype, stage) {
  const layers = [];

  layers.push(ProceduralModules.RootGeneration(phenotype));
  layers.push(ProceduralModules.TrunkGeneration(phenotype));
  layers.push(ProceduralModules.StemGeneration(phenotype));
  layers.push(ProceduralModules.LeafGeneration(phenotype));
  
  if (stage === "flowering" || stage === "fruiting")
    layers.push(ProceduralModules.FlowerGeneration(phenotype));
  
  if (stage === "fruiting")
    layers.push(ProceduralModules.FruitGeneration(phenotype));
  
  // Always apply last
  layers.push(ProceduralModules.WitherGeneration(phenotype));

  return SpriteCompositor.combine(layers);
}
```

---

## Example Growth Stage Visualization

|Stage|Modules Active|Visual Highlights|
|---|---|---|
|Germination|Root, Stem|Small cotyledons, pale color|
|Vegetative|Root, Stem, Leaf|Dense foliage, vibrant green|
|Flowering|Root, Stem, Leaf, Flower|Colorful flowers, slight expansion|
|Fruiting|All except Wither (optional)|Fruits or seed pods|
|Senescence|All + Wither|Desaturated, drooping shapes|

---

## Notes for Implementation

- Each module should use a **shared RNG seed** (e.g., plant UUID + stage ID) for reproducibility.
    
- Visual degradation (wither) should be driven by **Phenotype.health**, affecting tint, droop angle, and texture detail.
    
- Growth animation can interpolate geometry parameters between stages using easing curves (`easeInOutCubic`, etc.).
    
- Optional: integrate a **Shader Variant System** for tint modulation instead of multiple texture sets.
    

---

