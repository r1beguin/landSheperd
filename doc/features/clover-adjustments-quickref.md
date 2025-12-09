# Clover Adjustments - Quick Reference

## What Changed?

### 1. Weathering Rates: 20x SLOWER ⏱️
```
BEFORE: P: 0.40/day, K: 0.25/day
AFTER:  P: 0.02/day, K: 0.02/day
```
**Effect**: Soil takes 20x longer to recover from clover depletion

---

### 2. Clover Death: 3.5x FASTER ⚡
```
BEFORE: Dies after 7 days at 0 fertility
AFTER:  Dies after 2 days at 0 fertility
```
**Effect**: No more "zombie clover" surviving indefinitely on depleted soil

---

### 3. Withered Sprite: CLOVER-SPECIFIC 🎨
```
BEFORE: Generic withered sprite (looks weird)
AFTER:  Brown 3-leaf clover pattern (recognizable)
```
**Effect**: Dead clover clearly identifiable as dead clover

---

## Quick Test Commands

### Test Weathering Rate
```javascript
// In browser console:
const soil = window.graphicsEngine.soilManager.getSoilAt(25, 25);
const beforeP = soil.nutrientLayers.surface.phosphorus;
window.graphicsEngine.timeManager.advanceGameDays(5);
const afterP = window.graphicsEngine.soilManager.getSoilAt(25, 25).nutrientLayers.surface.phosphorus;
console.log('P gain per day:', (afterP - beforeP) / 5); // Should be ~0.02
```

### Test Faster Death
```javascript
// Spawn clover on depleted soil
window.graphicsEngine.plantManager.plants.clear();
const soil = window.graphicsEngine.soilManager.getSoilAt(25, 25);
soil.updateNutrients(0, 0, 0, 10);
window.graphicsEngine.plantManager.spawnPlantAt(25, 25, 'trifolium_repens');

// Advance 3 days
window.graphicsEngine.timeManager.advanceGameDays(3);

// Check if dead
const plants = window.graphicsEngine.plantManager.getPlantAt(25, 25);
console.log('Dead?', plants.length === 0 || plants[0].stage === 'Withered'); // Should be true
```

### Test Withered Sprite
```javascript
// Spawn and wither clover
window.graphicsEngine.plantManager.plants.clear();
const soil = window.graphicsEngine.soilManager.getSoilAt(25, 25);
soil.updateNutrients(50, 50, 50, 50);
window.graphicsEngine.plantManager.spawnPlantAt(25, 25, 'trifolium_repens');
const plants = window.graphicsEngine.plantManager.getPlantAt(25, 25);
plants[0].forceWither(window.graphicsEngine.timeManager.getCurrentGameDay());

// Zoom in to see sprite
window.graphicsEngine.cameraManager.setZoom(3.0);
window.graphicsEngine.cameraManager.centerOn(25 * 20, 25 * 20);
// Look at center - should see brown 3-leaf clover
```

---

## Expected Gameplay Impact

### Ecosystem Timeline Example

**Day 0-10**: Clover boom (spreading on fertile soil)  
**Day 10-15**: P/K depletion, clover stunted  
**Day 15-17**: **Clover dies** (2-day grace period, NEW)  
**Day 17-50**: Fallow recovery (slow weathering, NEW)  
**Day 50+**: Soil fertile enough for next clover generation

**Old Timeline**: Day 15-22 had "zombie clover" (7-day grace), recovery faster

---

## Files Changed

- `config.json` - Weathering rates
- `species/clover.json` - Grace period, withered generator
- `js/entities/plant.js` - Species-specific grace period
- `js/procedural/plant_generator.js` - Generator mapping
- `js/procedural/generators/groundcover_generator.js` - Withered sprite

---

## Verification Status

✅ All automated tests passing  
✅ Zero console errors  
✅ Config values verified  
✅ Functional behavior tested  
🎯 **Ready for user testing**

---

## User Feedback Requested

1. Does withered clover look good? (brown 3-leaf pattern)
2. Is 2-day death appropriate? (vs 7 days before)
3. Does slow weathering create better cycles?
4. Any unexpected behavior?
