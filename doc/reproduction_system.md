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
