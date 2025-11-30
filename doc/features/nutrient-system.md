# Nutrient System

**Category**: Features  
**Related Docs**: [Fertility System](fertility-system.md), [Plant Generation System](plant-generation-system.md), [Visual Feedback System](visual-feedback-system.md)  
**Last Updated**: 2025-11-30  
**Status**: Current

[Navigation: [Index](../INDEX.md) | [Features](./)]

---

## Overview

The Nutrient System implements realistic plant nutrition dynamics where plants consume specific nutrients (Nitrogen, Phosphorus, Potassium, Organic Matter) from soil and return them upon death. Growth rate and reproduction depend on nutrient availability, creating strategic gameplay through soil management.

## Core Nutrients

### Nitrogen (N)
- **Role**: Primary driver of vegetative growth and leafy development
- **Range**: 0-100
- **Nettles Requirement**: Minimum 15, Optimal 50+
- **Characteristics**: Most rapidly depleted, highest consumption rate
- **Visual Deficiency**: Yellowing, pale leaves
- **Overlay Color**: Blue gradient

### Phosphorus (P)
- **Role**: Root development, cell division, flowering support
- **Range**: 0-100
- **Nettles Requirement**: Minimum 10, Optimal 30+
- **Characteristics**: Moderate consumption, critical for reproduction
- **Visual Deficiency**: Purple tint, stunted growth
- **Overlay Color**: Purple gradient

### Potassium (K)
- **Role**: Plant vigor, stress resistance, overall health
- **Range**: 0-100
- **Nettles Requirement**: Minimum 10, Optimal 30+
- **Characteristics**: Moderate consumption, enhances plant resilience
- **Visual Deficiency**: Brown leaf tips, weak stems
- **Overlay Color**: Yellow gradient

### Organic Matter (OM)
- **Role**: Soil structure, water retention, slow-release nutrients
- **Range**: 0-100
- **Nettles Requirement**: Minimum 5, Optimal 40+
- **Characteristics**: Lowest consumption, high return rate (86% recovered)
- **Visual Deficiency**: Poor soil texture, reduced nutrient availability
- **Overlay Color**: Brown gradient

## Nutrient Requirements by Species

### Stinging Nettles
Nitrogen-loving pioneers requiring balanced soil nutrients.

**Minimum Requirements** (Liebig's Law):
```json
{
  "nitrogen": { "minimum": 15, "optimal": 50 },
  "phosphorus": { "minimum": 10, "optimal": 30 },
  "potassium": { "minimum": 10, "optimal": 30 },
  "organicMatter": { "minimum": 5, "optimal": 40 }
}
```

**ALL nutrients must meet minimum thresholds for:**
- Growth stage advancement
- Reproduction
- Optimal growth rates

**Rationale**:
- Nitrogen (15): Highest - nettles consume 40N total lifecycle
- Phosphorus (10): Moderate - consume 28P total
- Potassium (10): Moderate - consume 22K total
- Organic Matter (5): Low - 86% return rate during decomposition

## Nutrient Consumption

### Consumption by Growth Stage

**Seedling** (3 days):
- N: 5, P: 3, K: 2, OM: 1
- Low consumption (using seed reserves)

**Vegetative** (7 days):
- N: 15, P: 10, K: 8, OM: 5
- High nitrogen focus (leafy growth)

**Flowering** (10 days):
- N: 20, P: 15, K: 12, OM: 8
- Balanced P/K increase (reproduction)

**Total Lifecycle**:
- N: 40, P: 28, K: 22, OM: 14
- **Total consumption**: 104 nutrient points

### Nutrient Return (Decomposition)

**Withered** (5 days):
- Returns: N: 8, P: 5, K: 4, OM: 12
- **Total return**: 29 nutrient points

**Net Loss**: ~75 points (72% loss rate)
- Creates natural population limit without regeneration
- Requires minimum fertility threshold to prevent collapse

## Growth Rate Modifiers

Plants grow at variable speeds based on nutrient quality, not just presence/absence.

### Nutrient Scoring Formula

For each nutrient:
```javascript
score = {
  0.0  if value < minimum
  (value - minimum) / (optimal - minimum)  if minimum ≤ value < optimal
  1.0  if value ≥ optimal
}
```

### Growth Rate Calculation

**Vegetative Stage Weights**:
- Nitrogen: 40% (primary driver)
- Phosphorus: 25%
- Potassium: 20%
- Organic Matter: 15%

**Flowering Stage Weights**:
- Nitrogen: 35%
- Phosphorus: 30% (higher for reproduction)
- Potassium: 25% (higher for seed quality)
- Organic Matter: 10%

```javascript
growthRate = Σ(nutrientScore × weight)
// Result: 0.0 to 1.0 multiplier
```

### Growth Speed Examples

**Optimal Soil** (N=60, P=40, K=40, OM=50):
- All scores: 1.0
- Growth rate: 1.0x
- Time to Vegetative: 7 days

**Marginal Soil** (N=32.5, P=20, K=20, OM=22.5):
- All scores: ~0.5
- Growth rate: 0.5x
- Time to Vegetative: 14 days (twice as long)

**Nitrogen Bottleneck** (N=18, P=40, K=40, OM=50):
- N score: 0.086, others: 1.0
- Growth rate: 0.634x
- Time to Vegetative: 11 days (Liebig's Law in action)

**At-Minimum Soil** (N=15, P=10, K=10, OM=5):
- All scores: 0.0
- Growth rate: ~0.0x
- Time to Vegetative: ∞ (practically stunted)

## Minimum Fertility System

Prevents ecosystem collapse through natural population limits.

### Minimum Threshold: 20 Fertility

**Fertility Calculation**:
```javascript
fertility = (N + P + K + OM) / 4
```

**Three-Layer Protection**:

1. **Reproduction Block** (Hard Limit)
   - No cloning in soil <20 fertility
   - Creates natural population ceiling
   - Silent failure (expected behavior)

2. **Manual Placement Warning** (Soft Limit)
   - Warns player about marginal soil
   - Does NOT prevent placement (player agency)
   - Educates about soil quality

3. **Growth Stage Block** (Hard Limit)
   - Prevents stage advancement <20 fertility
   - Plants become "stunted"
   - Allows recovery if fertility improves

### Expected Equilibrium

**Without Minimum** (Collapse):
```
Day 0:   Fertility 60, Plants 5
Day 40:  Fertility 20, Plants 35
Day 80:  Fertility 0,  Plants 50+ (dead ecosystem)
```

**With Minimum** (Stable):
```
Day 0:   Fertility 60, Plants 5
Day 40:  Fertility 30, Plants 18
Day 80:  Fertility 20-25, Plants 18-22 (equilibrium)
```

## Multi-Nutrient Overlay System

Visual analysis tool for soil nutrients.

### Overlay Modes

**F Key Cycling**:
1. Normal View - No overlay, nutrient-based plant tinting
2. Fertility - Average of all nutrients
3. Nitrogen (N) - Blue gradient
4. Phosphorus (P) - Purple gradient
5. Potassium (K) - Yellow gradient
6. Organic Matter (OM) - Brown gradient

### Color Gradient

**Red → Yellow → Green** (0-100 scale):
- Red (0-25): Critical deficiency
- Orange (25-40): Low
- Yellow (40-60): Moderate
- Light Green (60-80): Good
- Green (80-100): Optimal

### Implementation

**Gradient Formula**:
```javascript
// Value 0-50: Red → Yellow
if (value <= 50) {
    r = 255
    g = lerp(50, 255, value / 50)
    b = 50
}
// Value 50-100: Yellow → Green
else {
    r = lerp(255, 50, (value - 50) / 50)
    g = 255
    b = 50
}
```

**UI Components**:
- Mode name display (bottom-right)
- Hint text ("Press F to cycle modes")
- Color legend (gradient bar with value labels)
- Legend visibility (hidden in Normal mode)

## Nutrient-Specific Growth Checks

Replaces simple fertility average with individual nutrient requirements.

### Problem with Fertility Average

**Old System** (Unrealistic):
```javascript
fertility = (N + P + K + OM) / 4
if (fertility < 20) blockGrowth()
```

**Flaw**: N=10, P=80, K=80, OM=70 → Fertility 60 ✓
- Plant would grow despite nitrogen deficiency!

### Solution: Individual Checks

**New System** (Realistic - Liebig's Law):
```javascript
if (N < 15 || P < 10 || K < 10 || OM < 5) blockGrowth()
```

**Same Scenario**: N=10 < 15 ✗
- Growth blocked (correctly reflects nitrogen deficiency)

### Growth Check Flow

```
Plant.advanceGrowthStage()
  ↓
Check Soil Nutrients
  ↓
nutrientRequirements defined?
  ↓ Yes
Check N ≥ 15?
Check P ≥ 10?
Check K ≥ 10?
Check OM ≥ 5?
  ↓
ALL PASS → Allow Growth, Reset Stunted
ANY FAIL → Block Growth, Mark Stunted
```

### Reproduction Filter

```javascript
validNeighbors = neighbors.filter(cell => {
  const soil = getSoilAt(cell.x, cell.y);
  if (!soil.isPlantable) return false;
  if (getPlantAt(cell)) return false;
  
  // ALL nutrients must meet minimum
  if (soil.nitrogen < 15) return false;
  if (soil.phosphorus < 10) return false;
  if (soil.potassium < 10) return false;
  if (soil.organicMatter < 5) return false;
  
  return true;
});
```

## Performance

### Computational Cost

**Per Plant Per Frame**:
- Soil lookup: ~0.001ms (hash lookup)
- 4× nutrient score calculations: ~0.0001ms each
- Growth rate calculation: ~0.002ms total
- **Total**: ~0.002ms per plant

**100 Plants at 60 FPS**:
- 0.002ms × 100 × 60fps = 12ms/sec = 1.2% CPU
- **Verdict**: Negligible impact

### Memory Overhead

**Per Plant**:
- `accumulatedGrowthDays`: 8 bytes (double)

**1000 Plants**:
- 8 bytes × 1000 = 8 KB
- **Verdict**: Negligible

**Per Species Config**:
- nutrientRequirements: ~150 bytes
- growthModifiers: ~80 bytes
- **Verdict**: <1KB for 10 species

## Implementation Files

### Core System
- **`js/core/soil_manager.js`** - Soil nutrient tracking, consumption, decomposition
- **`js/core/plant_manager.js`** - Reproduction filtering, manual placement warnings
- **`js/entities/plant.js`** - Growth rate calculation, nutrient checks, consumption
- **`js/entities/soil.js`** - Soil entity with nutrient state

### Visualization
- **`js/systems/overlay_manager.js`** - Multi-nutrient overlay cycling (168 lines)
- **`js/systems/input_manager.js`** - F key binding for overlay cycling
- **`index.html`** - Overlay UI elements
- **`css/styles.css`** - Overlay UI and legend styles

### Configuration
- **`species/nettles.json`** - Nutrient requirements and growth modifiers
- **`config.json`** - System parameters, overlay colors, decomposition rates

### Testing
- **`tests/html/nutrients.html`** - Manual nutrient system testing
- **`tests/nutrient-system.spec.js`** - Automated Playwright tests
- **`tests/overlay-cycling.spec.js`** - Overlay cycling tests

## Testing

### Automated Tests

**test_nutrients.html** (9 tests):
1. Config Structure Validation
2. Nutrient Minimum Thresholds
3. Sufficient Nutrients Pass
4. Nitrogen Deficiency Detection
5. Multiple Deficiencies
6. Boundary Conditions
7. Nitrogen-Loving Trait
8. Growth Modifiers Configuration
9. Growth Rate Calculation Logic

**Result**: ✅ 9/9 passed

**npm run verify**:
- Console Errors: 0
- Average FPS: 48-52
- Load Time: 1100-1300ms
- **Result**: ✅ PASS

### Manual Testing

1. **Launch**: `python -m http.server 8081`
2. **Navigate**: `http://localhost:8081`
3. **Toggle Overlays**: Press F repeatedly
4. **Place Plants**: Right-click to plant
5. **Observe Growth**: Speed up time (T key)
6. **Monitor Nutrients**: Watch fertility overlay
7. **Test Recovery**: Let plants decompose, observe recovery

## Known Limitations

1. **Seedling Stage Unaffected**
   - Fixed 3-day growth (uses seed reserves)
   - Future: Could add modifiers for realism

2. **No Fallback for Missing Config**
   - Species without nutrientRequirements have no checks
   - Currently only nettles implemented

3. **No Visual Growth Rate Indicator**
   - Players can't see growth rate without debug
   - Future: Phase 3 visual feedback

4. **Growth Rate Calculated Every Frame**
   - Recalculates even if soil unchanged
   - Optimization: Cache and invalidate on soil update

5. **Overlay Resolution**
   - Matches soil grid (16x16 cells)
   - Higher resolution not currently supported

## Future Enhancements

### Phase 3: Visual Feedback (Planned)
- Plant color reflects nutrient status
- Nitrogen deficiency: Pale/yellowed leaves
- Phosphorus deficiency: Purple tint
- Potassium deficiency: Brown leaf tips
- Leaf size varies with growth rate

### Phase 4: Advanced Ecology (Planned)
- Nutrient diffusion between cells
- Mycorrhizal networks
- Nitrogen-fixing symbiosis
- pH requirements
- Companion planting benefits

### UI Improvements (Planned)
- Transparency slider for overlays
- Colorblind accessibility modes
- Numerical tooltip on hover
- Historical nutrient tracking
- Export heatmap as PNG
- Direct mode selection (1-6 keys)

### Gameplay Extensions (Planned)
- Variable minimum fertility by species
- Player interventions (compost, fertilizer)
- Soil regeneration mechanics (rain, seasons)
- Multiple species with different nutrient profiles

## Troubleshooting

### Issue: Plants Not Growing
**Check**:
1. Toggle fertility overlay (F key)
2. Verify soil fertility ≥20
3. Check individual nutrient levels (F key cycling)
4. Look for console warnings about deficiencies

### Issue: F Key Not Cycling Overlays
**Solutions**:
1. Check console for OverlayManager errors
2. Verify script loading order in index.html
3. Ensure `overlayManager` initialized in GraphicsEngine

### Issue: Overlay Colors Not Showing
**Solutions**:
1. Check `getOverlayColor()` integration in SoilManager
2. Verify soil cells have nutrient data
3. Confirm overlay mode is not "normal"

### Issue: Ecosystem Collapsing
**Check**:
1. Verify minimum fertility threshold (20) enforced
2. Check reproduction blocking working
3. Monitor nutrient return from decomposition
4. Ensure equilibrium around 20-25 fertility

## Related Documentation

- [Fertility System](fertility-system.md) - Fertility cycle basics
- [Plant Generation System](plant-generation-system.md) - Growth stages and lifecycle
- [Visual Feedback System](visual-feedback-system.md) - Visual deficiency indicators
- [Reproduction System](reproduction-system.md) - Cloning and reproduction mechanics

---

**Implementation Phases**:
- Phase 1 (Nov 24): Individual nutrient checks (Liebig's Law)
- Phase 2 (Nov 25): Growth rate modifiers
- Phase 3 (Nov 26): Multi-nutrient overlay system
- Phase 4 (Nov 23): Minimum fertility threshold

**Developer**: vanilla-webgl-engineer  
**Testing**: Comprehensive automated + manual validation  
**Performance**: ✅ <2ms per 100 plants, zero FPS impact

[Back to Index](../INDEX.md) | [Features](./)