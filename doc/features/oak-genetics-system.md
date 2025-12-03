# Oak Genetics & Reproduction System

**Last updated:** 2025-12-02  
**Status:** Complete  
**Milestones:** 1-7 (All Complete)

---

## Overview

The oak genetics system provides realistic genetic variation and inheritance for oak trees through a comprehensive implementation spanning visual appearance, nutrient efficiency, proximity-based reproduction, Mendelian inheritance with mutation, and player-visible genetics display. This creates emergent ecological diversity where individual trees have unique traits that affect survival, growth rates, and visual appearance across multiple generations.

---

## Architecture

### Genetic Encoding

**Storage Format:** 10-byte genetics structure (Uint8Array)
- **Bytes 0-8:** Nine genetic traits (0-255 range)
- **Byte 9:** Generation counter (0-255)

**Nine Genetic Traits:**

| Byte | Trait | Category | Effect |
|------|-------|----------|--------|
| 0 | heightFactor | Visual | Height multiplier (0.7x-1.3x) |
| 1 | widthFactor | Visual | Width multiplier (0.7x-1.3x) |
| 2 | foliageDensity | Visual | Canopy density (0.6x-1.4x) |
| 3 | trunkShape | Visual | Reserved for trunk curvature |
| 4 | colorTint | Visual | Hue shift (-20° to +20°) |
| 5 | nitrogenEfficiency | Nutrient | N consumption/tolerance (±20%) |
| 6 | phosphorusEfficiency | Nutrient | P consumption/tolerance (±20%) |
| 7 | potassiumEfficiency | Nutrient | K consumption/tolerance (±20%) |
| 8 | organicMatterEfficiency | Nutrient | OM consumption/tolerance (±20%) |

**Value Mapping:**
```javascript
// Convert byte (0-255) to multiplier (0.5-1.5)
multiplier = 0.5 + (byteValue / 255) * 1.0;

// Baseline genetics (manual planting): all traits = 128
baseline_multiplier = 0.5 + (128 / 255) = 1.0 (100%)
```

### Visual Expression

**Implementation:** `js/procedural/plant_generator.js`

Visual genetics modify sprite generation through multipliers applied to base dimensions:

**Height Variation:**
- Base height: 128 pixels (MatureTree)
- Genetic range: 0.7x-1.3x (90-166 pixels)
- Formula: `finalHeight = baseHeight * heightFactor_multiplier`

**Width Variation:**
- Base width: 128 pixels
- Genetic range: 0.7x-1.3x (90-166 pixels)
- Affects trunk width and canopy width

**Foliage Density:**
- Base canopy circles: 7 circles
- Genetic range: 0.6x-1.4x (4-10 circles)
- Creates sparse vs bushy tree appearance

**Color Tint:**
- Base hue: Green (#4A7C3C)
- Genetic range: -20° to +20° hue shift
- Creates subtle yellowish-green to blueish-green variation
- Implemented via HSL color space transformation

**Visual Diversity Observed (1200-day test):**
- Height range: 107-153 pixels (46-unit range)
- Width range: 105-151 pixels (46-unit range)
- ~80% visual distinction between individual trees

### Nutrient Expression

**Implementation:** `js/entities/plant.js`

Nutrient genetics affect two key mechanics:

**1. Consumption Efficiency (advanceGrowthStage):**
```javascript
// High-efficiency genes (200+): Consume ~20% LESS nutrients
// Low-efficiency genes (60-): Consume ~20% MORE nutrients
efficiencyMultiplier = 2.0 - geneticToMultiplier(geneticValue);
actualConsumption = baseConsumption * efficiencyMultiplier;
```

**Example:**
- Baseline oak (gene 128): 50 nitrogen consumed
- High-efficiency (gene 200): 40 nitrogen consumed (~20% less)
- Low-efficiency (gene 60): 60 nitrogen consumed (~20% more)

**2. Nutrient Tolerance (nutrientScore):**
```javascript
// High-efficiency genes: Can tolerate ~20% LOWER soil nutrients
// Low-efficiency genes: Require ~20% HIGHER soil nutrients
effectiveMinimum = requirement.minimum * efficiencyMultiplier;
```

**Example:**
- Oak minimum nitrogen: 30
- High-efficiency (gene 200): Effective minimum ~24 (survives in worse soil)
- Low-efficiency (gene 60): Effective minimum ~36 (needs better soil)

**Gameplay Impact:**
- High-efficiency trees survive in depleted soil longer
- High-efficiency trees grow faster in marginal conditions
- Low-efficiency trees require richer soil to thrive
- Natural selection pressure favors efficient genetics in poor soil

### Proximity Reproduction

**Implementation:** `js/core/plant_manager.js`

**Reproduction Model:** Hermaphroditic (unisex) - any two mature oaks can reproduce

**Requirements:**
1. Two mature oaks within 3 cells
2. Every 10 game days, 25% success chance
3. Offspring spawns within 2 cells of either parent
4. Spawn location must have:
   - Plantable soil (not water)
   - Unoccupied top layer
   - Minimum nutrients: N≥30, P≥20, K≥20, OM≥15

**Algorithm:**
1. Mature oak checks for reproduction (10-day interval)
2. Search for valid partner within 3 cells (same species, mature stage)
3. Roll for success (25% chance)
4. Find valid spawn location (union of both parents' 2-cell neighborhoods)
5. Create offspring with crossover genetics
6. Increment generation: `Gen = max(parent1.gen, parent2.gen) + 1`
7. Spawn offspring at Sapling stage

**Performance:**
- Partner search: <2ms per attempt (searches 9-25 cells)
- Spawn location search: <3ms per attempt (searches 8-32 cells)
- FPS impact: Negligible (<1% with 50+ trees)

**Configuration:** `species/oak.json`
```json
"reproduction": {
  "proximityReproduction": {
    "enabled": true,
    "activeStages": ["MatureTree"],
    "checkIntervalDays": 10,
    "proximityDistance": 3,
    "successChance": 0.25,
    "maxOffspringDistance": 2,
    "requiresPartner": true
  }
}
```

### Genetic Inheritance

**Implementation:** `js/entities/plant.js` - `Plant.crossoverGenetics()`

**Three-Stage Inheritance System:**

**Stage 1: Mendelian Averaging (100% of offspring)**
```javascript
// Simple average of parent traits
offspringTrait = (parent1.trait + parent2.trait) / 2;
```

**Stage 2: Standard Mutation (10% chance per trait)**
```javascript
if (Math.random() < 0.10) {
    // ±15% strength (±38 units on 0-255 scale)
    delta = (Math.random() * 2 - 1) * (255 * 0.15);
    offspringTrait += delta;
}
```

**Stage 3: Outlier Mutation (0.5% chance per trait)**
```javascript
// 5% of mutations are outliers (0.10 * 0.05 = 0.005)
if (Math.random() < 0.05) {
    // Additional ±30% strength (total ±45%)
    offspringTrait += delta * 2;
}
```

**Statistical Outcomes (per offspring with 9 traits):**
- **~40%:** No mutations (pure Mendelian average)
- **~55%:** 1-2 standard mutations (±15% per mutated trait)
- **~5%:** Outlier mutations (±45% on affected traits)

**Example Offspring:**
```
Parents: heightFactor = 100, 150
Baseline offspring: 125 (average)

Standard mutation: 125 + 20 = 145 (±15% shift)
Outlier mutation: 125 + 60 = 185 (±45% shift)
```

**Multi-Generation Diversity:**
- Generation 0: All traits ~128 (baseline)
- Generation 2: Trait variance (std dev) ~8-15
- Generation 5: Trait variance (std dev) ~10-20
- Long-term equilibrium: Variance ~15-25 (balanced diversity)

### Context Menu Display

**Implementation:** `js/systems/context_menu_manager.js`

Players can right-click mature oaks to view genetics in a dedicated panel.

**Display Layout:**
```
┌─────────────────────────────────┐
│ Generation: 3                   │
├─────────────────────────────────┤
│ VISUAL TRAITS                   │
│ Height       [████░░] 118%      │ ← Yellow-green
│ Width        [███░░░] 98%       │ ← Yellow-green
│ Foliage      [█████░] 156%      │ ← Green
│ Trunk Shape  [████░░] 102%      │ ← Yellow-green
│ Color Tint   [████░░] 125%      │ ← Yellow-green
├─────────────────────────────────┤
│ NUTRIENT TRAITS                 │
│ N Efficiency [██████] 168%      │ ← Bright green
│ P Efficiency [████░░] 112%      │ ← Yellow-green
│ K Efficiency [███░░░] 89%       │ ← Yellow
│ OM Efficiency[████░░] 125%      │ ← Yellow-green
└─────────────────────────────────┘
```

**5-Tier Color Coding System:**

| Value | Percentage | Color | CSS Color | Meaning |
|-------|-----------|-------|-----------|---------|
| >200 | >156% | Bright Green | #2e7d32 | Exceptional (rare) |
| 160-200 | 125-156% | Green | #4a7c59 | High |
| 100-160 | 78-125% | Yellow-Green | #6b8e23 | Normal/Baseline |
| 60-100 | 47-78% | Yellow | #d4a017 | Low |
| <60 | <47% | Brown-Red | #a0522d | Very Low (rare) |

**Percentage Calculation:**
```javascript
// 128 baseline = 100%
percentage = (traitValue / 128) * 100;

// Examples:
// 128 → 100%
// 200 → 156% (bright green)
// 60 → 47% (yellow)
```

**CSS Classes:**
- `.genetics-grid` - Container
- `.genetics-gen` - Generation display
- `.genetics-section` - Section headers
- `.genetics-trait` - Individual trait row
- `.trait-label` - Trait name
- `.trait-bar` - Bar background
- `.trait-fill` - Bar fill (dynamic width/color)
- `.trait-value` - Percentage text

---

## Configuration

### Global Config (`config.json`)

```json
{
  "world": {
    "plants": {
      "genetics": {
        "enabled": true,
        "visualVariation": {
          "heightRange": [0.7, 1.3],
          "widthRange": [0.7, 1.3],
          "foliageRange": [0.6, 1.4],
          "colorTintRange": [-20, 20]
        },
        "nutrientVariation": {
          "efficiencyRange": [0.8, 1.2]
        },
        "inheritance": {
          "mutationChance": 0.1,
          "mutationStrength": 0.15
        }
      },
      "reproduction": {
        "enableLogging": false
      }
    }
  }
}
```

**Parameters:**

- **`genetics.enabled`** (boolean): Master switch for genetics system
  - Default: `true`
  - Impact: Disabling prevents genetics initialization
  
- **`visualVariation.heightRange`** ([min, max]): Height multiplier range
  - Default: `[0.7, 1.3]`
  - Range: 0.5-2.0 (extreme values may look unrealistic)
  
- **`visualVariation.widthRange`** ([min, max]): Width multiplier range
  - Default: `[0.7, 1.3]`
  
- **`visualVariation.foliageRange`** ([min, max]): Foliage density multiplier
  - Default: `[0.6, 1.4]`
  - Higher max creates very bushy trees
  
- **`visualVariation.colorTintRange`** ([minDeg, maxDeg]): HSL hue shift
  - Default: `[-20, 20]` degrees
  - Range: -40 to +40 (beyond this loses species identity)
  
- **`nutrientVariation.efficiencyRange`** ([min, max]): Efficiency multiplier
  - Default: `[0.8, 1.2]` (±20%)
  - Higher range creates stronger survival advantages
  
- **`inheritance.mutationChance`** (0-1): Chance per trait per generation
  - Default: `0.1` (10%)
  - Recommended: 0.08-0.15
  - Lower = slower diversity accumulation
  
- **`inheritance.mutationStrength`** (0-1): Mutation magnitude
  - Default: `0.15` (±15% of trait range)
  - Recommended: 0.10-0.20
  - Higher = more dramatic mutations

### Species Config (`species/oak.json`)

```json
{
  "genetics": {
    "enabled": true
  },
  "reproduction": {
    "proximityReproduction": {
      "enabled": true,
      "activeStages": ["MatureTree"],
      "checkIntervalDays": 10,
      "proximityDistance": 3,
      "successChance": 0.25,
      "maxOffspringDistance": 2,
      "requiresPartner": true
    }
  }
}
```

**Parameters:**

- **`genetics.enabled`** (boolean): Enable genetics for this species
  - Oak: `true`
  - Nettles/Clover: `false` (no genetics)
  
- **`proximityReproduction.enabled`** (boolean): Enable proximity reproduction
  - Default: `true`
  
- **`activeStages`** (array): Stages that can reproduce
  - Default: `["MatureTree"]`
  
- **`checkIntervalDays`** (number): Days between reproduction checks
  - Default: `10`
  - Recommended: 7-15 (lower = faster population growth)
  
- **`proximityDistance`** (number): Max distance to find partner (cells)
  - Default: `3`
  - Recommended: 2-4 (higher = easier reproduction)
  
- **`successChance`** (0-1): Chance of successful reproduction per check
  - Default: `0.25` (25%)
  - **Tuning Recommendation:** Reduce to `0.20` for slower growth
  - Range: 0.15-0.30
  
- **`maxOffspringDistance`** (number): Max distance to spawn offspring (cells)
  - Default: `2`
  - Recommended: 1-3 (simulates seed dispersal)
  
- **`requiresPartner`** (boolean): Requires two parents
  - Default: `true` (sexual reproduction)

---

## Implementation Files

### Core Genetics Logic
- **`js/entities/plant.js`**
  - `initializeGenetics()` - Generate initial genetics (lines 46-82)
  - `geneticToMultiplier()` - Byte-to-multiplier conversion (line 100)
  - `Plant.crossoverGenetics()` - Mendelian inheritance + mutation (lines 84-98)
  - `advanceGrowthStage()` - Apply nutrient efficiency to consumption (lines 676-720)
  - `nutrientScore()` - Apply tolerance to requirements (lines 465-498)

### Visual Expression
- **`js/procedural/plant_generator.js`**
  - `generatePlantSprite()` - Apply visual genetics to sprite generation
  - `shiftHue()` - HSL color tinting helper

### Reproduction System
- **`js/core/plant_manager.js`**
  - `_handleProximityReproduction()` - Reproduction handler
  - `_findProximityPartner()` - Partner search within radius
  - `_findOffspringSpawnLocation()` - Valid spawn location finder

### UI Display
- **`js/systems/context_menu_manager.js`**
  - `_buildGeneticsPanel()` - Generate genetics panel HTML
  - `_buildTraitBar()` - Individual trait bar with color coding
  - `buildMultiLayerPlantInfo()` - Integrate genetics into context menu

### Species Configuration
- **`species/oak.json`** - Oak genetics and reproduction config

### Global Configuration
- **`config.json`** - Global genetics parameters

---

## Testing

### Automated Test Suite

**Test 1: Genetic Encoding** (`tests/genetics-initialization.spec.js`)
- Validates 10-byte storage structure
- Checks generation counter
- Verifies baseline genetics (manual planting)

**Test 2: Visual Expression** (`tests/genetics-visual-validation.spec.js`)
- Validates sprite generation with genetics
- Checks height/width/foliage variation
- Measures visual diversity

**Test 3: Nutrient Expression** (`tests/genetics-nutrient-expression.spec.js`)
- Validates consumption efficiency
- Checks nutrient tolerance
- Tests survival in marginal soil

**Test 4: Proximity Reproduction** (`tests/oak-proximity-reproduction.spec.js`)
- Validates partner finding algorithm
- Tests reproduction requirements
- Checks offspring generation

**Test 5: Genetic Inheritance** (`tests/genetics-inheritance.spec.js`)
- Validates Mendelian averaging
- Measures mutation rates (10% per trait)
- Checks outlier mutations (0.5%)
- Tests multi-generation diversity accumulation

**Test 6: Context Menu Display** (`tests/genetics-context-menu.spec.js`)
- Validates genetics panel rendering
- Checks color coding system
- Tests percentage calculations

**Test 7: Long-term Ecosystem** (`tests/oak-genetics-ecosystem.spec.js`)
- 1200-day simulation (25 → 138 oaks)
- Multi-generational validation (Gen 0 → Gen 5)
- Population stability testing
- Genetic diversity metrics

---

## Validation Results (Milestone 7 - 1200 Days)

### Population Stability ✅
- **Initial:** 25 oak saplings (Gen 0)
- **Final:** 138 oaks (up to Gen 5)
- **Growth:** +452% over 1200 days
- **Mature trees:** 102/138 (73.9%)
- **Stage distribution:** 22 saplings, 14 young, 102 mature

### Multi-Generational Diversity ✅
- **Generations achieved:** Gen 0 through Gen 5
- **Generation distribution:**
  - Gen 0: 22 trees
  - Gen 1: 17 trees
  - Gen 2: 30 trees
  - Gen 3: 30 trees
  - Gen 4: 26 trees
  - Gen 5: 13 trees

### Genetic Diversity ✅
- **Visual trait variance (std dev):** 13.6 (target: 8-80)
  - Height factor: 11.91
  - Width factor: 13.08
  - Foliage density: 14.67
- **Nutrient trait variance (std dev):** 10.1 (target: 6-75)
  - Nitrogen efficiency: 9.2
  - Phosphorus efficiency: 10.8
  - Potassium efficiency: 10.5
  - OM efficiency: 10.0

### Visual Appearance Range ✅
- **Height range:** 107-153 pixels (46-unit range, ±19.5% from baseline)
- **Width range:** 105-151 pixels (46-unit range, ±18.4% from baseline)
- **Target:** ≥30 units (met with margin)

### Reproduction Success ✅
- **Net offspring:** 113 trees (138 final - 25 initial)
- **Reproduction rate:** 4.52x over 1200 days
- **Average:** ~9.4 offspring per 100 days
- **Mechanism:** Proximity-based, 25% success per 10-day check

### Performance ✅
- **FPS:** 30+ maintained (44-49 observed with 138 trees)
- **Console errors:** 0
- **Render calls:** Stable throughout simulation
- **Genetic storage:** 10 bytes × 138 = 1.38 KB (negligible)

---

## Performance

### Memory Footprint
- **Per oak:** 10 bytes genetics data
- **100 oaks:** 1 KB genetics storage
- **1000 oaks:** 10 KB genetics storage (negligible)

### Computation Cost
- **Genetics initialization:** <1ms per plant
- **Partner search:** <2ms per attempt (searches 9-25 cells)
- **Spawn location search:** <3ms per attempt (searches 8-32 cells)
- **Crossover calculation:** <0.1ms per offspring
- **Sprite generation:** <10ms per unique genetic variant (cached)
- **Nutrient efficiency:** ~6 multiplications per growth stage (~0.01ms)

### FPS Impact
- **Baseline (25 oaks):** 60 FPS
- **100 oaks:** 55+ FPS
- **138 oaks (M7 test):** 44-49 FPS
- **Target:** 60+ FPS (achievable with <100 trees)

**Performance Notes:**
- Headless Chrome (testing) uses software rendering (lower FPS)
- Real browser with GPU acceleration achieves 60 FPS with 100+ trees
- Genetics system adds <1% overhead (most time spent in rendering)

---

## Balance Tuning Recommendations

Based on 1200-day ecosystem testing (Milestone 7):

### Population Growth (Optional Tuning)

**Current State:**
- 138 trees at day 1200 (approaching upper stability limit ~150)
- Population growth rate: 4.52x over 1200 days

**Recommendation:**
```json
// species/oak.json
"successChance": 0.20  // Reduce from 0.25
```

**Effect:** Slower population growth, stabilizes around 100-120 trees instead of 130-150

**When to Apply:** If you want slower-paced oak forests

### Genetic Diversity (Optional Tuning)

**Current State:**
- Trait variance (std dev): 13.6 (visual), 10.1 (nutrient)
- Visual range: 46 units height/width (good diversity)

**Recommendation:**
```json
// config.json
"inheritance": {
  "mutationChance": 0.12,     // Increase from 0.10
  "mutationStrength": 0.18    // Increase from 0.15
}
```

**Effect:** Faster diversity accumulation, more dramatic outliers (±54% instead of ±45%)

**When to Apply:** If you want more visually distinct trees in fewer generations

### Balance Assessment ✅

**Current system is production-ready:**
- Population stable and sustainable (30-150 range maintained)
- Genetic diversity healthy (visible variation without chaos)
- Performance excellent (30+ FPS with 100+ trees)
- No population collapse or explosion over 1200 days

**Optional tweaks above are for preference tuning, NOT bug fixes.**

---

## Developer Notes

### Genetics-Enabled Species

Only species with `"genetics.enabled": true` use the genetics system:
- ✅ **Oak (quercus_robur):** Full genetics enabled
- ❌ **Nettles (urtica_dioica):** No genetics (`plant.genetics = null`)
- ❌ **Clover (trifolium_repens):** No genetics (`plant.genetics = null`)

### Entity Interface

**Accessing genetics:**
```javascript
const oak = plantManager.getPlantAt(x, y, 'top');
if (oak && oak.genetics) {
    console.log('Height factor:', oak.genetics.heightFactor);
    console.log('Generation:', oak.genetics.generation);
}
```

**Checking if species has genetics:**
```javascript
if (plant.species.genetics && plant.species.genetics.enabled) {
    // This species supports genetics
}
```

### Reproduction Model

**Hermaphroditic (Unisex) Reproduction:**
- Any two mature oaks can reproduce (no male/female distinction)
- Simpler implementation (no sex tracking needed)
- Biologically accurate for many tree species
- Prevents reproduction deadlocks (e.g., all-male population)

**Why not sexual reproduction?**
- Oak trees are monoecious (produce both male and female flowers)
- Hermaphroditic model is scientifically valid
- Reduces complexity without sacrificing realism
- Can be extended to sexual reproduction in future if desired

### Proximity Reproduction Respects activeStages

Only stages listed in `activeStages` can trigger reproduction:
```json
"activeStages": ["MatureTree"]
```

Saplings and young trees never check for reproduction, even if mature partners exist nearby.

---

## Related Documentation

- **[Plant Generation System](plant-generation-system.md)** - Procedural sprite generation
- **[Reproduction System](reproduction-system.md)** - General reproduction mechanics
- **[Nutrient System](nutrient-system.md)** - Soil chemistry and plant nutrition
- **[Context Menu System](context-menu-system.md)** - UI display system

---

## Devlogs

Detailed implementation history:

- **[2025-12-02: Milestone 2 - Visual Expression](../devlogs/2025-12/2025-12-02-genetics-milestone2-part1.md)**
- **[2025-12-02: Milestone 3 - Nutrient Expression](../devlogs/2025-12/2025-12-02-genetics-milestone3-nutrient-expression.md)**
- **[2025-12-02: Milestone 4 - Proximity Reproduction](../devlogs/2025-12/2025-12-02-genetics-milestone4-proximity-reproduction.md)**
- **[2025-12-02: Milestone 5 - Genetic Inheritance](../devlogs/2025-12/2025-12-02-genetics-milestone5-inheritance.md)**
- **[2025-12-02: Milestone 6 - Context Menu Display](../devlogs/2025-12/2025-12-02-genetics-milestone6-context-menu.md)**
- **[2025-12-02: Milestone 7 - System Complete](../devlogs/2025-12/2025-12-02-oak-genetics-complete.md)**

---

## Future Enhancements (Out of Scope)

**Potential Extensions:**

1. **Sexual Reproduction:** Add male/female distinction with pollen mechanics
2. **Diploid Genetics:** Two alleles per trait (dominant/recessive)
3. **Epigenetics:** Environmental factors affect gene expression
4. **Genetic Tracking:** Family tree visualization
5. **Natural Selection:** Automatic culling of low-fitness individuals
6. **Additional Species:** Extend to nettles, clover, new species
7. **Hybrid Vigor:** Cross-species breeding (oak × beech)
8. **Inbreeding Depression:** Penalties for low genetic diversity

---

## Conclusion

The oak genetics & reproduction system is **production-ready** with comprehensive validation over 1200 game days showing stable population dynamics, healthy genetic diversity, and excellent performance. The system creates emergent ecological complexity where individual trees have unique identities affecting survival, reproduction success, and visual appearance across multiple generations.

**Status:** ✅ Complete - All 7 milestones validated and documented
