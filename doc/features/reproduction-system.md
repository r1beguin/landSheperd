# Plant Reproduction System

## Overview

The Plant Reproduction System enables plants to spread naturally across the map through various reproduction strategies. Currently implemented: **rhizome cloning** for nettles. Future: flower pollination and seed dispersal.

## Architecture

### Components

1. **Species Configuration** (`species/[species].json`)
   - Defines reproduction parameters per species
   - Configures active stages, timing, success rates, and spatial limits

2. **Plant Entity** (`js/entities/plant.js`)
   - Tracks reproduction timing per individual plant
   - Evaluates reproduction conditions each update
   - Returns reproduction events to PlantManager

3. **PlantManager** (`js/core/plant_manager.js`)
   - Processes reproduction events from all plants
   - Validates spawn locations using SoilManager
   - Spawns new plant instances at valid locations
   - Handles plant despawning for lifecycle management

### Data Flow

```
TimeManager updates game time
    ↓
Plant.update(gameDaysElapsed, currentDay)
    ↓
Plant.checkReproduction(currentDay)
    ↓ (if conditions met)
Returns reproduction event
    ↓
PlantManager.update() collects events
    ↓
PlantManager.handleReproduction(event)
    ↓
Validates spawn location with SoilManager
    ↓
PlantManager.addPlant() spawns new seedling
```

## Rhizome Cloning System

### Mechanism

Rhizomes are underground stems that allow plants like nettles to spread vegetatively. In-game, this translates to mature plants spawning new seedlings in neighboring soil cells.

### Configuration

Species configuration in `species/nettles.json`:

```json
"reproduction": {
  "rhizomeCloning": {
    "enabled": true,
    "activeStages": ["Vegetative", "Flowering"],
    "checkIntervalDays": 2,
    "successChance": 0.3,
    "maxDistance": 1
  }
}
```

### Parameters

| Parameter | Type | Description | Example Value |
|-----------|------|-------------|---------------|
| `enabled` | boolean | Master toggle for rhizome cloning | `true` |
| `activeStages` | array | Growth stages that can reproduce | `["Vegetative", "Flowering"]` |
| `checkIntervalDays` | number | Days between reproduction attempts | `2` |
| `successChance` | number | Probability of successful cloning (0-1) | `0.3` (30%) |
| `maxDistance` | number | Maximum distance in grid cells for spawning | `1` (adjacent only) |

### Reproduction Conditions

For a plant to successfully reproduce via rhizome cloning:

1. ✓ Rhizome cloning must be enabled in species config
2. ✓ Plant must be in an active reproduction stage (Vegetative or Flowering)
3. ✓ At least `checkIntervalDays` must have passed since last attempt
4. ✓ Random roll must succeed (based on `successChance`)
5. ✓ At least one valid neighbor cell must exist:
   - Must have soil present
   - Soil must be plantable (`isPlantable: true`)
   - Cell must not already have a plant

If all conditions are met, a new seedling spawns in a random valid neighbor cell.

### Balancing

**Growth Rate Control:**
- `checkIntervalDays`: Longer = slower spread
- `successChance`: Lower = slower spread, more realistic
- `maxDistance`: Larger = faster colonization, less realistic clumping

**Recommended Starting Values:**
- Aggressive species: `checkIntervalDays: 1`, `successChance: 0.4`, `maxDistance: 2`
- Moderate species: `checkIntervalDays: 2`, `successChance: 0.3`, `maxDistance: 1` ← Current nettles
- Slow species: `checkIntervalDays: 5`, `successChance: 0.15`, `maxDistance: 1`

## Plant Lifecycle and Despawning

### Withered Stage Decomposition

Withered plants now have a limited lifespan before they decompose and despawn:

**Configuration** (`species/nettles.json`):
```json
{
  "name": "Withered",
  "daysToGrow": 5,
  "generator": "witheredGeneration",
  "visibleOrgans": ["stem", "leaf"]
}
```

**Behavior:**
- When a plant reaches Withered stage, `stageStartDay` is set to current day
- Plant checks `checkDespawn()` every update
- After 5 days in Withered stage, plant sets `shouldDespawn = true`
- PlantManager removes all plants with `shouldDespawn` flag during update cycle

**Purpose:**
- Prevents accumulation of dead plants
- Keeps map clean and performant
- Realistic decomposition cycle
- Allows nutrient recycling (future feature)

### Despawn Timing Balance

| Duration | Effect | Use Case |
|----------|--------|----------|
| 2-3 days | Quick cleanup, minimal visual clutter | Fast-paced gameplay |
| 5 days | Balanced, time to observe death stage | Current nettles |
| 7-10 days | Slow decay, realistic decomposition | Realism-focused |
| `null` | Never despawn | Permanent plants, special cases |

## Implementation Details

### Plant.js Methods

**`checkReproduction(currentDay)`**
- Returns: `Object | null`
- Evaluates all reproduction conditions
- Returns event object if successful:
  ```javascript
  {
    type: 'rhizomeCloning',
    parentX: this.x,
    parentY: this.y,
    maxDistance: rhizomeConfig.maxDistance,
    species: this.species.id
  }
  ```

**`checkDespawn(currentDay)`**
- Returns: `void`
- Sets `this.shouldDespawn = true` if conditions met
- Only active in Withered stage with valid `daysToGrow`

### PlantManager.js Methods

**`handleReproduction(event, currentDay)`**
- Processes reproduction event
- Finds valid neighbor cells
- Spawns new seedling at random valid location
- Logs success or silent failure (no valid locations)

**`getNeighborCells(gridX, gridY, maxDistance)`**
- Returns: `Array<{x, y}>`
- Calculates all cells within Manhattan distance
- Excludes center cell (parent plant location)
- Used by reproduction system for spawn candidate generation

**`update(gameDaysElapsed, currentDay)`**
- Collects reproduction events from all plants
- Processes all reproduction events
- Removes all despawned plants in single pass
- Efficient batch processing

## Console Logging

Reproduction system provides clear console feedback:

**Successful Reproduction:**
```
🌱 Rhizome cloning successful! New nettle at (5, -3)
```

**Plant Decomposition:**
```
🍂 Stinging Nettle has fully decomposed and will despawn
```

**Batch Removal:**
```
🗑️ Removed 3 despawned plant(s)
```

## Performance Considerations

- Reproduction checks only happen every `checkIntervalDays` (not every frame)
- Neighbor calculation is O(maxDistance²) - minimal for small distances
- Batch processing prevents multiple iterations over plant collection
- No performance impact observed with 100+ plants at 60 FPS

## Testing and Verification

### Manual Testing

1. Place 3-5 nettles on map (right-click)
2. Speed up time to 20x (press `3`)
3. Observe plants grow to Vegetative/Flowering stages
4. Watch for reproduction messages in console
5. Verify new seedlings appear in neighboring cells
6. Confirm withered plants despawn after 5 days

### Expected Behavior

- **Reproduction Rate**: ~1-2 new plants per parent every 10-15 game days
- **Colony Growth**: Exponential at first, then plateaus as space fills
- **Despawn Timing**: Withered plants disappear exactly 5 days after withering
- **No Overlaps**: Plants never spawn on occupied cells

## Proximity Reproduction System

### Mechanism

Proximity reproduction requires two mature plants within a specified distance to produce offspring. This simulates pollination, mating, or other partner-dependent reproduction strategies. Used by: Oak trees.

### Configuration

Species configuration in `species/oak.json`:

```json
"reproduction": {
  "proximityReproduction": {
    "enabled": true,
    "requiresPartner": true,
    "activeStages": ["MatureTree"],
    "checkIntervalDays": 10,
    "successChance": 0.25,
    "proximityDistance": 3,
    "maxOffspringDistance": 5,
    "reproductionCost": {
      "nitrogen": 25,
      "phosphorus": 20,
      "potassium": 15,
      "organicMatter": 10
    }
  }
}
```

### Parameters

| Parameter | Type | Description | Example Value |
|-----------|------|-------------|---------------|
| `enabled` | boolean | Master toggle for proximity reproduction | `true` |
| `requiresPartner` | boolean | Whether a partner is required (future: unisex mode) | `true` |
| `activeStages` | array | Growth stages that can reproduce | `["MatureTree"]` |
| `checkIntervalDays` | number | Days between reproduction attempts | `10` |
| `successChance` | number | Probability of successful reproduction (0-1) | `0.25` (25%) |
| `proximityDistance` | number | Max distance to search for partner (grid cells) | `3` |
| `maxOffspringDistance` | number | Max spawn distance from either parent | `5` |
| `reproductionCost` | object | Nutrient cost deducted from parent soil | See below |

### Reproduction Cost

The `reproductionCost` specifies nutrients deducted from parent soil when reproduction succeeds:

```json
"reproductionCost": {
  "nitrogen": 25,        // Deducted from parent soil
  "phosphorus": 20,
  "potassium": 15,
  "organicMatter": 10
}
```

**Buffer System:** System adds +5 buffer to all requirements to prevent soil hitting absolute zero:
- Required: N=30, P=25, K=20, OM=15 (cost + 5)
- Actual deduction: N=25, P=20, K=15, OM=10 (only if successful)

### Reproduction Conditions

For a plant to successfully reproduce via proximity reproduction:

1. ✓ Proximity reproduction must be enabled in species config
2. ✓ Plant must be in an active reproduction stage (e.g., MatureTree for oaks)
3. ✓ At least `checkIntervalDays` must have passed since last **successful** attempt
4. ✓ Parent soil must have enough nutrients (cost + 5 buffer, using **effective nutrients** based on root depth)
5. ✓ Random roll must succeed (based on `successChance`)
6. ✓ A mature partner must exist within `proximityDistance` cells (same species, active stage)
7. ✓ At least one valid spawn location must exist within `maxOffspringDistance` of either parent:
   - Must have soil present
   - Soil must be plantable (`isPlantable: true`)
   - Cell must not have a plant in the same layer
   - Soil must meet minimum nutrient requirements for species

If all conditions are met:
1. Nutrients deducted from parent soil (actual cost, not buffer amount)
2. Offspring genetics created by crossing parent + partner genetics
3. Offspring generation = max(parent gen, partner gen) + 1
4. New sapling spawned at valid location with inherited genetics

### Root Depth Integration

**Critical Detail:** Proximity reproduction uses **effective nutrients** based on root depth, not total soil nutrients.

For deep-rooted plants (oak):
```javascript
effectiveN = (surfaceShare * surfaceN) + (deepShare * deepN)
// Oak: effectiveN = (0.8 * surfaceN) + (0.8 * deepN)
```

**Why This Matters:**
- Oaks have deep roots (80% surface, 80% deep access)
- Deep layer has 150% nitrogen multiplier (higher storage)
- Oak can reproduce using deep nutrients even if surface is depleted
- Aligns with oak's nitrogen cycling strategy:
  1. Leaf litter deposits N to surface
  2. Rain leaches N to deep layer (amplified by 150% multiplier)
  3. Oak accesses deep N for reproduction
  4. Root lift brings deep N back to surface

**Example Calculation:**
```
Surface: N=20, P=25, K=22, OM=18
Deep:    N=45, P=30, K=28, OM=20 (150% N multiplier)

Oak effective nutrients:
  N = (0.8 * 20) + (0.8 * 45) = 16 + 36 = 52 ✓ (need 30)
  P = (0.8 * 25) + (0.8 * 30) = 20 + 24 = 44 ✓ (need 25)
  K = (0.8 * 22) + (0.8 * 28) = 17.6 + 22.4 = 40 ✓ (need 20)
  OM = (0.8 * 18) + (0.8 * 20) = 14.4 + 16 = 30.4 ✓ (need 15)

Result: Reproduction can proceed!
```

### Balancing

**Growth Rate Control:**
- `checkIntervalDays`: Longer = slower forest formation (oak: 10 days)
- `successChance`: Lower = more realistic spread (oak: 25% = 1/4 attempts succeed)
- `reproductionCost`: Higher = limits reproduction to fertile areas
- `proximityDistance`: Smaller = requires dense mature groves
- `maxOffspringDistance`: Larger = faster colonization

**Oak-Specific Tuning:**
- **10-day interval:** Prevents overwhelming spread, allows time for nutrient regeneration
- **25% success chance:** Realistic acorn germination rate, creates natural variation
- **High nutrient cost:** Ensures only healthy, nutrient-rich soil produces offspring
- **Short proximity (3 cells):** Requires existing mature grove before reproduction
- **Medium offspring distance (5 cells):** Allows gradual forest expansion

**Expected Timeline:**
- **50-100 days:** First oak saplings with nitrogen regeneration system active
- **100-200 days:** Small oak groves forming around initial mature trees
- **200-500 days:** Expanding forest with multiple generations
- **500+ days:** Mature self-sustaining forest ecosystem

### Diagnostic Logging

Enable logging in `config.json`:
```json
"world": {
  "plants": {
    "reproduction": {
      "enableLogging": true
    }
  }
}
```

**Comprehensive logs at every checkpoint:**

1. **Nutrient Failure:**
```
[REPRO FAIL] Oak at (512,384) - Insufficient nutrients. Need: N30 P25 K20 OM15 | Has: N28.3 P30.1 K22.4 OM18.2
```
Shows exactly which nutrient(s) are deficient and by how much.

2. **Success Roll Failure:**
```
[REPRO FAIL] Oak at (512,384) - Failed success roll (25% chance)
```
Most common failure - 75% of attempts fail here even with good nutrients.

3. **No Partner Found:**
```
[REPRO FAIL] Oak at grid (50,50) - No mature partner found within 3 cells
```
Indicates tree is isolated or no other mature trees nearby.

4. **No Spawn Location:**
```
[REPRO FAIL] Oak at grid (50,50) - No valid spawn location within 5 cells of either parent
```
All nearby cells occupied, water, or insufficient nutrients for sapling.

5. **Successful Reproduction:**
```
[REPRO COST] Oak acorn: -N25.0 -P20.0 -K15.0 -OM10.0
[REPRO SUCCESS] Oak Gen 2 sapling spawned at grid (52,48) from parents at (50,50) and (52,50)
```
Shows nutrient deduction and offspring location with generation number.

**Interpreting Logs:**

| Log Pattern | Diagnosis | Solution |
|-------------|-----------|----------|
| Multiple nutrient failures | Soil depleted | Wait for nitrogen regeneration (leaf litter + rain) |
| Mostly success roll failures | Normal RNG variance | Be patient, 25% means ~1/4 attempts succeed |
| No partner found | Tree isolated | Plant more mature oaks within 3 cells |
| No spawn location | Overcrowded or water-blocked | Clear space or wait for existing plants to wither |
| Success logs appearing | System working correctly | Oak forest forming naturally |

### Implementation Details

#### Plant.js Methods

**`_checkProximityReproduction(currentDay)`**
- Returns: `Object | null`
- Evaluates proximity reproduction conditions
- **Critical Fix (2025-12-06):** `lastReproductionDay` now updates ONLY after all checks pass (prevents permanent lockout on failed success rolls)
- Returns event object if successful:
  ```javascript
  {
    type: 'proximityReproduction',
    parentX: this.x,
    parentY: this.y,
    parentGenetics: this.genetics,
    proximityDistance: config.proximityDistance,
    maxOffspringDistance: config.maxOffspringDistance,
    species: this.species.id,
    reproductionCost: config.reproductionCost
  }
  ```

**`canAffordReproduction(reproductionCost)`**
- Returns: `boolean`
- Checks if parent soil has sufficient nutrients
- **Critical Fix (2025-12-06):** Now uses `getEffectiveNutrients()` instead of total soil nutrients (respects root depth system)
- Adds +5 buffer to all requirements to prevent absolute zero
- Example: Oak needs N=30 total (25 cost + 5 buffer), but only 25 deducted on success

#### PlantManager.js Methods

**`_handleProximityReproduction(event, currentDay)`**
- Processes proximity reproduction event
- Finds partner using `_findProximityPartner()`
- Creates offspring genetics via `Plant.crossoverGenetics()`
- Finds spawn location using `_findOffspringSpawnLocation()`
- Deducts nutrients from parent soil
- Spawns offspring with genetics at valid location
- Logs success/failure at each checkpoint

**`_findProximityPartner(gridX, gridY, distance, speciesId, layer)`**
- Returns: `Plant | null`
- Searches within `proximityDistance` cells
- Filters for same species and active reproduction stage
- Returns first valid partner found

**`_findOffspringSpawnLocation(parent1Grid, parent2Grid, maxDistance, speciesConfig, layer)`**
- Returns: `Object {x, y} | null`
- Combines neighbors from both parents (union of search areas)
- Filters for valid cells (plantable, empty layer, sufficient nutrients)
- Returns random valid location or null

### Bug Fixes (2025-12-06)

**Three critical bugs were fixed that blocked oak reproduction:**

1. **Timer Lockout Bug:**
   - **Before:** `lastReproductionDay` updated before success roll, blocking future attempts if RNG failed
   - **After:** Timer updates ONLY after passing nutrients AND success roll
   - **Impact:** Eliminated permanent reproduction lockout cycle

2. **Root Depth Ignored:**
   - **Before:** `canAffordReproduction()` checked total soil nutrients, ignoring root depth
   - **After:** Uses `getEffectiveNutrients()` to respect deep root access
   - **Impact:** Oaks can now leverage deep layer's 150% nitrogen multiplier

3. **Silent Failures:**
   - **Before:** No logging when reproduction failed at various checkpoints
   - **After:** Comprehensive logging at EVERY failure point with diagnostic details
   - **Impact:** Full visibility into reproduction attempts for debugging

**Result:** Oak forests now form organically over 50-100 days with diagnostic transparency.

See: `doc/devlogs/2025-12/2025-12-06-oak-reproduction-bug-fix.md` for complete bug analysis.

### Testing Proximity Reproduction

#### Quick Test (Spawn Two Oaks)

1. Load Land Shepherd
2. Enable logging in `config.json` (line 96)
3. Spawn two mature oaks within 3 cells:
   - Right-click → "Add Oak (Mature)" at (50, 50)
   - Right-click → "Add Oak (Mature)" at (52, 50)
4. Fast-forward 50-100 days (press `3` for 20x speed)
5. Watch console for reproduction logs
6. Verify new saplings appear between/around parent trees

#### Expected Console Output (Example 50-day cycle)

```
Day 10: [REPRO FAIL] Oak at (512,384) - Failed success roll (25% chance)
Day 10: [REPRO FAIL] Oak at (640,384) - Failed success roll (25% chance)

Day 20: [REPRO FAIL] Oak at (512,384) - Insufficient nutrients. Need: N30 P25 K20 OM15 | Has: N28.3 P30.1 K22.4 OM18.2
Day 20: [REPRO FAIL] Oak at (640,384) - Failed success roll (25% chance)

Day 30: [REPRO FAIL] Oak at (512,384) - Failed success roll (25% chance)
Day 30: [REPRO FAIL] Oak at (640,384) - Failed success roll (25% chance)

Day 40: [REPRO COST] Oak acorn: -N25.0 -P20.0 -K15.0 -OM10.0
        [REPRO SUCCESS] Oak Gen 2 sapling spawned at grid (52,48) from parents at (50,50) and (52,50)
Day 40: [REPRO FAIL] Oak at (640,384) - Failed success roll (25% chance)

Day 50: [REPRO FAIL] Oak at (512,384) - No valid spawn location within 5 cells of either parent
Day 50: [REPRO FAIL] Oak at (640,384) - Failed success roll (25% chance)
```

**Key Observations:**
- Most attempts fail on 25% success roll (expected)
- Nutrient failures early, then soil improves (nitrogen regeneration)
- First success around day 40 (typical with good initial nutrients)
- Later failures due to spawn location (area filling up)

#### Long-Term Forest Test

1. Spawn 5-10 mature oaks in loose cluster (3-5 cells apart)
2. Enable nitrogen regeneration (already in config.json)
3. Fast-forward 500 days
4. Expected result:
   - **50-100 days:** First saplings appear
   - **100-200 days:** Multiple generations (Gen 2, Gen 3)
   - **200-500 days:** Dense oak grove with mixed generations
   - **500+ days:** Self-sustaining forest with continuous reproduction

#### Soil Nutrient Tracking

Check soil at oak location to verify nitrogen regeneration:
1. Right-click oak → "Inspect Soil"
2. Check overlay: Right-click → "Toggle Overlay" → "Nitrogen"
3. Expected pattern:
   - **Surface N:** Fluctuates (leaf litter deposits, rain leaches away)
   - **Deep N:** Gradually increases (rain leaching + 150% multiplier)
   - **Effective N:** High enough for reproduction (>30 after nitrogen regen)

### Performance Considerations

- Proximity search is O(proximityDistance²) - minimal for small distances (3² = 9 cells)
- Spawn location search is O(maxOffspringDistance²) - acceptable for small distances (5² = 25 cells)
- Genetic crossover is O(1) - just combines trait arrays
- No performance impact observed with 50+ reproducing oaks at 44 FPS
- Logging adds negligible overhead (disabled in production if needed)

### Integration with Other Systems

**Depends On:**
- **Root Depth System:** `getEffectiveNutrients()` for layered nutrient access
- **Nitrogen Regeneration:** Leaf litter → rain leaching → deep storage → root lift cycle
- **Genetics System:** `Plant.crossoverGenetics()` for offspring trait inheritance
- **Soil Effects Manager:** Rain leaching moves N to deep layer (150% multiplier)
- **Time Manager:** Day tracking for `checkIntervalDays`

**Affects:**
- **Forest Formation:** Enables organic oak spread over 50-100 days
- **Agroforestry:** Oaks improve soil (leaf litter) then reproduce using improved soil
- **Ecosystem Balance:** Self-sustaining oak populations without manual planting
- **Soil Nutrients:** Reproduction costs create localized nutrient depletion
- **Genetic Diversity:** Each generation increases variation through crossover

## Future Extensions

### Planned Features

1. **Flower Pollination System**
   - Requires two flowering plants within pollination distance
   - Produces seeds instead of immediate clones
   - Seeds mature into seedlings over time

2. **Seed Dispersal**
   - Wind-based dispersal for longer distances
   - Animal-based dispersal with fauna system
   - Water-based dispersal along water retention gradients

3. **Resource Competition**
   - Limit reproduction based on soil fertility
   - Prevent spawning in overcrowded areas
   - Implement nutrient depletion from reproduction

4. **Genetic Variation**
   - Offspring have slight procedural differences
   - Mutations create visual diversity
   - Adaptation to local soil conditions

5. **Seasonal Reproduction**
   - Reproduction only active in certain seasons
   - Seasonal timing varies by species
   - Weather affects reproduction success rates

### Extension Points

To add new reproduction types:

1. Add configuration to species JSON:
   ```json
   "reproduction": {
     "newType": {
       "enabled": true,
       // type-specific params
     }
   }
   ```

2. Add check method to `Plant.js`:
   ```javascript
   checkNewTypeReproduction(currentDay) {
     // evaluation logic
     return { type: 'newType', /* params */ };
   }
   ```

3. Add handler to `PlantManager.js`:
   ```javascript
   handleReproduction(event, currentDay) {
     switch(event.type) {
       case 'newType':
         this.handleNewType(event, currentDay);
         break;
       // existing cases
     }
   }
   ```

## Configuration Reference

### Global Config (`config.json`)

```json
"world": {
  "plants": {
    "reproduction": {
      "enableLogging": true
    }
  }
}
```

### Species Config (`species/[species].json`)

```json
{
  "reproduction": {
    "rhizomeCloning": {
      "enabled": true,
      "activeStages": ["Vegetative", "Flowering"],
      "checkIntervalDays": 2,
      "successChance": 0.3,
      "maxDistance": 1
    }
  },
  "growthStages": [
    {
      "name": "Withered",
      "daysToGrow": 5,  // null = never despawn
      "generator": "witheredGeneration",
      "visibleOrgans": ["stem", "leaf"]
    }
  ]
}
```

## API Reference

### Plant Methods

```javascript
// Check if plant should attempt reproduction
// Returns: Object | null
checkReproduction(currentDay)

// Check if withered plant should despawn
// Returns: void
checkDespawn(currentDay)
```

### PlantManager Methods

```javascript
// Process reproduction event and spawn new plant
// Returns: void
handleReproduction(event, currentDay)

// Get neighbor cells within distance
// Returns: Array<{x, y}>
getNeighborCells(gridX, gridY, maxDistance)
```

## Troubleshooting

**Plants not reproducing?**
- Check species config has `reproduction` section
- Verify plants are in active stage (Vegetative/Flowering)
- Confirm `enabled: true` in config
- Check console for reproduction messages
- Verify empty neighbor cells exist

**Plants not despawning?**
- Confirm withered stage has `daysToGrow` set (not `null`)
- Check time is advancing (time system active)
- Verify plants reach withered stage
- Check console for decomposition messages

**Reproduction too fast/slow?**
- Adjust `checkIntervalDays` (timing)
- Adjust `successChance` (probability)
- Adjust `maxDistance` (spatial spread)
- Modify withered `daysToGrow` (cleanup rate)

---

Last Updated: November 16, 2025
