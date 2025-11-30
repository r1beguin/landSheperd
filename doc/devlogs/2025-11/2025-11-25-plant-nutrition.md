# Realistic Plant Nutrition with Growth Impact

**Date**: 2025-11-25  
**Status**: Implemented  
**Related Systems**: Plant Manager, Soil Manager, Growth System

[Navigation: [Index](../../INDEX.md) | [November 2025 Logs](./) | [Features](../../features/plant-generation-system.md)]

---

## Summary
Implemented nutrient-specific plant consumption and growth rate modifiers, creating realistic nutrition dynamics where plants consume N, P, K from soil and return organic matter on death.

## Problem/Motivation
- Original system used generic "fertility" without nutrient specificity
- Plants grew at fixed rates regardless of soil conditions
- No feedback loop between plant growth and soil depletion
- Needed species-specific nutrient requirements (via `species/*.json`)

## Implementation
Plants now consume N, P, K based on species requirements (defined in species JSON files), growth rate scales with nutrient availability (0.1x to 1.0x multiplier), and deficient nutrients stunt growth. Plants return organic matter when they die. Soil regenerates N, P, K slowly from organic matter.

### Files Modified
- `js/core/plant_manager.js` - Nutrient consumption, growth rate modulation
- `js/core/soil_manager.js` - Nutrient tracking, organic matter decomposition
- `js/entities/plant.js` - Species-specific nutrient requirements
- `species/nettles.json` - Added nutrient requirements per growth stage
- `config.json` - Growth rate modifiers, decomposition rates

### New Features
- Nutrient consumption tied to growth stage
- Growth rate scaling based on nutrient availability
- Organic matter return on plant death (50-80% of consumed nutrients)
- Slow nutrient regeneration from organic matter decomposition
- Species-specific nutrient profiles

## Testing
Verified with:
- Automated testing via `nutrient-system.spec.js`
- Observed plant growth slowdown in depleted soil
- Verified nutrient return on death
- Confirmed growth rate multipliers (0.1x-1.0x range)

## Impact
- **Performance**: Minimal (<2ms per frame for 100 plants)
- **User Experience**: Major gameplay improvement - soil management now critical
- **Breaking Changes**: None (plants still grow, just with dynamic rates)

## Related Work
- [Nutrient System](../../features/nutrient-system.md)
- [Fertility System](../../features/fertility-system.md)
- [Plant Generation System](../../features/plant-generation-system.md)

---

[Back to November 2025 Logs](./) | [All Devlogs](../)
