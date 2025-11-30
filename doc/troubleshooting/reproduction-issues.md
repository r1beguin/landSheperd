# Plant Reproduction Troubleshooting Guide

## Quick Test Procedure

1. **Open the application** in Chrome/Firefox with console open (F12)
2. **Place 5-10 nettles** on the map (right-click on soil cells)
3. **Speed up time** (press `3` for 20x speed)
4. **Watch for reproduction attempts** in console after plants reach Vegetative stage

## Expected Timeline (at 20x speed)

| Time (seconds) | Game Days | Event |
|---------------|-----------|-------|
| 1.5s | 3 days | Plants reach Vegetative stage |
| 2.5s | 5 days | First reproduction attempts |
| 3.5s | 7 days | Second reproduction attempts |
| 5s | 10 days | Plants reach Flowering stage |
| 7.5s | 15 days | Multiple reproduction successes expected |

## Console Messages to Look For

### ✅ Good Signs (System Working)

```
🌿 Stinging Nettle grew to Vegetative! Next stage in 7 game days
🎲 Stinging Nettle reproduction attempt failed (rolled 0.67 > 0.3)
✨ Stinging Nettle reproduction check successful! Rolled 0.18 <= 0.3
🔍 Processing reproduction at grid (5, -3)
  Found 8 neighboring cells
  6 valid neighbors (plantable and empty)
🌱 Rhizome cloning successful! New nettle at (6, -3)
```

### ❌ Warning Signs (Issues)

**No reproduction attempts at all:**
```
🌿 Stinging Nettle grew to Vegetative! Next stage in 7 game days
🌿 Stinging Nettle grew to Flowering! Next stage in 10 game days
(no 🎲 messages)
```
→ **Problem**: `checkReproduction()` not being called by PlantManager

**Attempts but no valid neighbors:**
```
✨ Stinging Nettle reproduction check successful! Rolled 0.18 <= 0.3
🔍 Processing reproduction at grid (0, 0)
  Found 8 neighboring cells
  0 valid neighbors (plantable and empty)
  ❌ No valid neighbors found - reproduction failed
```
→ **Problem**: Plants surrounded by other plants or non-plantable soil

**Successful reproduction but no spawn:**
```
🔍 Processing reproduction at grid (5, -3)
  Found 8 neighboring cells
  6 valid neighbors (plantable and empty)
  ❌ Failed to spawn plant at (6, -3)
```
→ **Problem**: PlantManager.addPlant() is failing

## Common Issues & Solutions

### Issue 1: No Reproduction Attempts

**Symptoms:**
- Plants reach Vegetative/Flowering stages
- No 🎲 dice roll messages in console
- No reproduction happening

**Causes:**
- `checkReproduction()` being called inside `Plant.update()` (double-call bug)
- Species JSON not loaded or missing `reproduction` section
- Browser cache serving old species configuration

**Solutions:**
1. Check `js/entities/plant.js` line ~47 - should NOT call `checkReproduction()`
2. Verify `species/nettles.json` has `reproduction` section
3. Hard refresh (Ctrl+Shift+R) or clear browser cache
4. Check console for JSON loading errors

### Issue 2: All Reproduction Attempts Fail

**Symptoms:**
- See 🎲 messages but all show "failed"
- No ✨ success messages
- Success rate seems 0% instead of 30%

**Causes:**
- Math.random() logic inverted
- successChance value incorrect in JSON

**Solutions:**
1. Check `Plant.checkReproduction()` uses `roll <= successChance` (not `>`)
2. Verify `species/nettles.json` has `successChance: 0.3` (not 0.03 or 3)
3. Temporarily increase to `successChance: 0.9` to test

### Issue 3: Reproduction Succeeds But No Plants Spawn

**Symptoms:**
- See ✨ success messages
- See 🔍 processing messages
- See "valid neighbors" > 0
- But no 🌱 spawn messages
- OR see ❌ "Failed to spawn plant"

**Causes:**
- PlantManager.addPlant() failing silently
- Grid coordinate conversion issue
- Species ID mismatch

**Solutions:**
1. Check `handleReproduction()` passes correct species ID (`event.species`)
2. Verify `event.species` matches loaded species (`'urtica_dioica'`)
3. Check `addPlant()` method for early returns
4. Verify `soilManager.worldToGrid()` is working correctly

### Issue 4: No Valid Neighbors Found

**Symptoms:**
- See ✨ success messages
- See "0 valid neighbors"
- See ❌ "No valid neighbors found"

**Causes:**
- Plants too densely packed (all neighbors occupied)
- Planted outside plantable soil region
- `isPlantable` flag not set correctly on soil

**Solutions:**
1. Space plants further apart when testing
2. Plant within the circular plantable area (check soil colors)
3. Verify soil cells have `isPlantable: true` in plantable region
4. Check `SoilManager.shouldHaveSoil()` radius calculation

### Issue 5: Reproduction Too Fast/Slow

**Symptoms:**
- Plants spreading too quickly or not spreading at all
- Reproduction rate doesn't match expectations

**Solutions:**
Adjust parameters in `species/nettles.json`:
```json
"reproduction": {
  "rhizomeCloning": {
    "checkIntervalDays": 2,     // ⬆️ Increase for slower spread
    "successChance": 0.3,        // ⬇️ Decrease for slower spread
    "maxDistance": 1             // ⬆️ Increase for faster colonization
  }
}
```

## Debug Mode Checklist

Add temporary logging to diagnose issues:

### In Plant.checkReproduction():
```javascript
console.log(`[DEBUG] Checking reproduction for ${this.species.commonName}`);
console.log(`  Stage: ${this.stage}, Active stages:`, rhizomeConfig.activeStages);
console.log(`  Days since last: ${currentDay - this.lastReproductionDay}`);
console.log(`  Interval: ${rhizomeConfig.checkIntervalDays}`);
console.log(`  Success chance: ${rhizomeConfig.successChance}`);
```

### In PlantManager.handleReproduction():
```javascript
console.log(`[DEBUG] handleReproduction called`, event);
console.log(`[DEBUG] Parent grid:`, parentGrid);
console.log(`[DEBUG] Neighbors:`, neighbors);
console.log(`[DEBUG] Valid neighbors:`, validNeighbors);
```

### In PlantManager.update():
```javascript
console.log(`[DEBUG] Update cycle - ${this.plants.size} plants`);
console.log(`[DEBUG] Collected ${reproductionEvents.length} reproduction events`);
```

## Testing Configuration

For rapid testing, temporarily modify `species/nettles.json`:

```json
{
  "growthStages": [
    {
      "name": "Seedling",
      "daysToGrow": 0.5,  // ⚡ Very fast growth
      ...
    },
    {
      "name": "Vegetative",
      "daysToGrow": 1,    // ⚡ Quick maturation
      ...
    }
  ],
  "reproduction": {
    "rhizomeCloning": {
      "enabled": true,
      "activeStages": ["Vegetative", "Flowering"],
      "checkIntervalDays": 0.5,  // ⚡ Check twice per day
      "successChance": 0.9,       // ⚡ 90% success rate
      "maxDistance": 2            // ⚡ Spread further
    }
  }
}
```

**Remember to restore original values after testing!**

## Performance Monitoring

Watch these metrics while testing:
- **FPS** should stay above 30 (check debug UI)
- **Plant count** should grow exponentially then plateau
- **Console spam** - if too many messages, reduce logging
- **Memory usage** - check browser task manager

## Browser Console Commands

Useful commands for debugging:

```javascript
// Check plant manager state
window.graphicsEngine.plantManager.plants.size

// Get all plants
window.graphicsEngine.plantManager.getAllPlants()

// Check a specific plant
const plants = window.graphicsEngine.plantManager.getAllPlants()
console.log(plants[0])

// Check species config
window.graphicsEngine.plantManager.speciesConfigs.get('urtica_dioica')

// Check time
window.graphicsEngine.timeManager.getCurrentDay()
```

## Expected Reproduction Rate

With default settings:
- **Check interval**: 2 days
- **Success chance**: 30%
- **Active stages**: Vegetative (7 days) + Flowering (10 days) = 17 days per plant

**Calculation:**
- Attempts per plant: 17 days / 2 = ~8 attempts
- Expected successes: 8 × 0.3 = ~2.4 new plants per parent
- With 10 starting plants: ~24 offspring over full lifecycle
- Exponential growth until space fills up

## Success Criteria

✅ **System is working correctly if you see:**
1. Plants reaching Vegetative stage after 3 days
2. 🎲 reproduction attempt messages every 2 days
3. ~30% of attempts showing ✨ success
4. 🌱 spawn messages with new plant coordinates
5. Visual confirmation of new seedlings appearing on map
6. Plant count growing over time
7. Eventually plateaus when space is full

## Still Not Working?

If you've checked everything above and it still doesn't work:

1. **Hard refresh** the page (Ctrl+Shift+R)
2. **Clear browser cache** completely
3. **Check for JavaScript errors** in console
4. **Verify file modifications** were saved correctly
5. **Check git status** to see what files changed
6. **Compare your code** to the working version in this documentation

---

Last Updated: November 16, 2025
