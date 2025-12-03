# Genetics Milestone 2 - Part 1: Plant Entity Changes

**Date:** 2025-12-02  
**Agent:** shepherd-feature  
**Status:** ✅ COMPLETE (Waiting on shepherd-core Part 2)

## Objective

Enable visual genetic expression for oak trees by passing genetics data from Plant entity to PlantGenerator for procedural sprite generation.

## Part 1 Implementation: Plant Entity Changes

### Modified Files

**js/entities/plant.js** (Line 139-158)

### Changes Made

Updated `Plant.generateSprite()` method to pass genetics parameter to PlantGenerator:

```javascript
generateSprite() {
    // Clear the WebGL texture cache when regenerating sprite
    if (this.webglTexture) {
        this.webglTexture = null; // Clear cache to force texture recreation
    }
    
    // Use the global PlantGenerator to create the sprite with current growth stage
    if (window.PlantGenerator) {
        // Pass genetics to generator if species supports it
        this.texture = window.PlantGenerator.generatePlantSprite(
            this.species, 
            this.stage,
            this.genetics  // NEW: Pass genetics (null for non-genetic species)
        );
        
        // Update dimensions from generated sprite
        if (this.texture) {
            this.width = this.texture.width;
            this.height = this.texture.height;
        }
    }
}
```

### Key Points

1. **Backward Compatible:** Passes `this.genetics` which is `null` for non-genetic species (nettles, clover)
2. **No Breaking Changes:** PlantGenerator will receive third parameter, even if it doesn't use it yet
3. **Syntax Validated:** No syntax errors in modified file

## Coordination with shepherd-core

Waiting on **shepherd-core** to implement Part 2:
- Modify `PlantGenerator.generatePlantSprite()` signature to accept genetics
- Update oak sprite generators to apply genetic modifiers:
  - Height/width dimension scaling (0.7-1.3x)
  - Trunk width variation
  - Foliage density (canopy circle count)
  - Color tint (HSL hue shift -20 to +20 degrees)
- Add `shiftHue()` helper function for color tinting

## Testing Plan (After Part 2 Complete)

### Manual Validation
1. Plant 6 mature oaks manually
2. Observe visual differences:
   - Height variation (some taller, some shorter)
   - Width variation (trunk/canopy width)
   - Foliage density (bushy vs sparse)
   - Color tint (subtle green hue variations)
3. Verify ~80% visual distinction

### Automated Testing
- Command: `npm run verify:interactive`
- Expected: PASS - no console errors
- Baseline: CREATE NEW (intentional visual changes)

### Performance Validation
- FPS target: 55+ with 6 oaks planted
- Sprite generation: <10ms per oak
- No memory leaks from repeated sprite generation

## Genetic Parameters

From Milestone 1 implementation:

```javascript
// Visual traits (affecting appearance)
heightFactor: 0-255    → 0.7-1.3x height multiplier
widthFactor: 0-255     → 0.7-1.3x width multiplier
foliageDensity: 0-255  → 0.6-1.4x canopy density
trunkShape: 0-255      → (future: trunk curvature)
colorTint: 0-255       → -20 to +20 degree hue shift

// Nutrient traits (not used in Milestone 2)
nitrogenEfficiency: 0-255
phosphorusEfficiency: 0-255
potassiumEfficiency: 0-255
organicMatterEfficiency: 0-255

generation: Integer (Gen 0, Gen 1, etc.)
```

## Expected Visual Outcomes

### Height Variation
- Tall oak: `heightFactor = 200` → 1.17x height (234% of base)
- Short oak: `heightFactor = 100` → 0.93x height (186% of base)
- Range: ±30% height variation across population

### Width Variation
- Wide oak: `widthFactor = 220` → 1.22x width
- Narrow oak: `widthFactor = 80` → 0.89x width
- Affects both trunk width and canopy width

### Foliage Density
- Bushy oak: `foliageDensity = 230` → 1.32x circles (9 circles instead of 7)
- Sparse oak: `foliageDensity = 90` → 0.82x circles (5-6 circles)

### Color Tint
- Yellowish green: `colorTint = 200` → +7.8° hue shift
- Blueish green: `colorTint = 50` → -16° hue shift
- Subtle variation maintaining oak appearance

## Next Steps

1. **shepherd-core:** Implement Part 2 (PlantGenerator modifications)
2. **shepherd-feature:** Run validation tests after Part 2 complete
3. **shepherd-feature:** Capture screenshots showing visual diversity
4. **shepherd-docs:** Update genetics documentation with visual examples
5. **Milestone 3:** Implement reproduction with genetic inheritance

## Configuration

No config changes needed - genetics system uses existing config:

```json
"genetics": {
  "enabled": true,
  "mutationRate": 0.1,
  "visualVariation": {
    "heightRange": [0.7, 1.3],
    "widthRange": [0.7, 1.3],
    "foliageRange": [0.6, 1.4],
    "colorTintRange": [-20, 20]
  }
}
```

## References

- Milestone 1: Genetics initialization and storage ([2025-12-01-genetics-initialization.md](../2025-12/2025-12-01-genetics-initialization.md))
- Feature Doc: Genetics system planned implementation
- Technical Reference: Plant entity interface
- Related: PlantGenerator procedural sprite system

---

**Status:** Part 1 complete. Awaiting shepherd-core Part 2 implementation.
