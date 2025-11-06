Here’s a **detailed procedural rendering pipeline diagram** (in text form for documentation) showing how the modules combine and how their data flows from the `Phenotype` to the final rendered entity.

It’s designed for **2D isometric or top-down rendering**, but can easily be adapted for 3D or hybrid layers (e.g., billboards or mesh quads).

---

# Procedural Rendering Pipeline

## Overview

Each plant entity is procedurally generated in **layers**, from underground roots to visible canopy, based on the **Phenotype**.  
Every layer module receives a consistent seed and phenotype data, so results are **deterministic and unique** for each individual.

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

