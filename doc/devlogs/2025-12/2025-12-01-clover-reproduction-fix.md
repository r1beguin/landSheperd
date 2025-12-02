# Clover Reproduction System Implementation (Seed Production)

**Date:** 2025-12-01  
**Type:** Bug Fix / Feature Implementation  
**Components:** Plant Entity, PlantManager  
**Issue:** Clover reproduction didn't work because `seedProduction` reproduction type wasn't implemented

## Problem Description

Clover plants in the Flowering stage were not reproducing despite having a properly configured `reproduction.seedProduction` section in their species config. The game had no visible clover spread through seed dispersal.

### Root Cause

The codebase only implemented **rhizome cloning** reproduction (used by nettles), but clover uses **seed production** which had no implementation:

**Plant.checkReproduction()** (line 120):
```javascript
if (!this.species.reproduction || !this.species.reproduction.rhizomeCloning) {
    return null; // Only checked for rhizomeCloning
}
```

**PlantManager.handleReproduction()** (line 402):
```javascript
if (event.type !== 'rhizomeCloning') {
    return; // Only handled rhizomeCloning events
}
```

This meant clover's `seedProduction` config was completely ignored:
```json
"reproduction": {
  "seedProduction": {
    "enabled": true,
    "activeStages": ["Flowering"],
    "checkIntervalDays": 3,
    "successChance": 0.4,
    "maxDistance": 2,
    "germinationChance": 0.7
  }
}
```

## Solution

Implemented full support for both reproduction types by refactoring the reproduction system to handle multiple strategies:

### 1. Plant Entity Refactor

Split `checkReproduction()` into type-specific methods:

```javascript
checkReproduction(currentDay) {
    if (!this.species.reproduction) return null;
    
    // Check for rhizome cloning (e.g., nettles)
    if (this.species.reproduction.rhizomeCloning) {
        return this._checkRhizomeCloning(currentDay);
    }
    
    // Check for seed production (e.g., clover)
    if (this.species.reproduction.seedProduction) {
        return this._checkSeedProduction(currentDay);
    }
    
    return null;
}
```

**New method: `_checkSeedProduction()`**
- Checks if enabled and in active stage (e.g., "Flowering")
- Respects check interval (every N days)
- Rolls for seed production success
- Returns event with germination chance

### 2. PlantManager Refactor

Split `handleReproduction()` into type-specific handlers:

```javascript
handleReproduction(event, currentDay) {
    if (event.type === 'rhizomeCloning') {
        this._handleRhizomeCloning(event, currentDay);
    } else if (event.type === 'seedProduction') {
        this._handleSeedProduction(event, currentDay);
    }
}
```

**New method: `_handleSeedProduction()`**
- Rolls for germination (some seeds fail to germinate)
- Finds valid neighbor cells within dispersal distance
- Checks soil nutrients meet minimum requirements
- Checks layer is empty (respects multi-layer system)
- Spawns new plant at random valid location

## Key Differences: Rhizome vs Seed Reproduction

| Feature | Rhizome Cloning | Seed Production |
|---------|----------------|-----------------|
| **Mechanism** | Underground runners | Above-ground seed dispersal |
| **Reliability** | 100% success if space available | Two-stage: production → germination |
| **Example Species** | Nettles | Clover |
| **Config Key** | `rhizomeCloning` | `seedProduction` |
| **Germination Roll** | N/A (always succeeds) | `germinationChance` (default 1.0) |

### Seed Production Parameters

```json
"seedProduction": {
  "enabled": true,                // Enable/disable system
  "activeStages": ["Flowering"],  // Which stages produce seeds
  "checkIntervalDays": 3,         // Check every N days
  "successChance": 0.4,           // 40% chance to produce seeds
  "maxDistance": 2,               // Dispersal radius (grid cells)
  "germinationChance": 0.7        // 70% of produced seeds germinate
}
```

**Effective reproduction rate:**
- Base success: 40% (produces seeds)
- Germination: 70% (of produced seeds)
- **Combined: 28%** per check interval (with valid soil nearby)

## Changes Made

### File 1: `js/entities/plant.js`

**Lines 114-159:** Refactored reproduction checking
- Split into `checkReproduction()`, `_checkRhizomeCloning()`, `_checkSeedProduction()`
- Added germination chance to seed production events
- Updated JSDoc to mention both reproduction types

### File 2: `js/core/plant_manager.js`

**Lines 397-451:** Refactored reproduction handling
- Split into `handleReproduction()`, `_handleRhizomeCloning()`, `_handleSeedProduction()`
- Added germination roll for seed production
- Both methods use same nutrient/layer checking logic

## Validation

### Automated Test
```bash
npm run verify
```

**Result:** PASS
- Console Errors: 0
- FPS: 47 (target: 30+)
- Visual diff: 29.17% (within threshold)
- WebGL: ok

### Manual Test: Clover Reproduction

1. Start game and plant clover (trifolium_repens)
2. Advance clover to Flowering stage (or wait for growth)
3. Ensure surrounding soil meets minimum requirements:
   - Nitrogen ≥ 5
   - Phosphorus ≥ 8
   - Potassium ≥ 8
   - Organic Matter ≥ 5
4. Increase time scale to Fast (5x)
5. Wait for reproduction checks (every 3 game days)
6. **Expected:** New clover sprouts appear within 2-cell radius
7. **Actual:** ✅ Works! Clover spreads via seed production

### Expected Behavior After Fix

**Clover in Flowering stage:**
- Checks for reproduction every 3 game days
- 40% chance to produce seeds (per check)
- If seeds produced, 70% chance they germinate
- New clover appears as "Sprout" stage
- Respects bottom layer (won't overwrite other plants)
- Only spreads to cells with adequate nutrients

**Nettles (rhizome cloning):**
- Still works as before
- Checks every 2 days in Vegetative/Flowering stages
- 30% success chance
- Spreads within 1-cell radius
- No germination roll (always succeeds if space available)

## Impact

- **Severity:** Medium (broke clover reproduction entirely, now fixed)
- **User Experience:** Clover now behaves as designed - spreads naturally via seeds
- **Gameplay:** Adds variety - different species use different reproduction strategies
- **Compatibility:** No breaking changes - rhizome cloning still works, seed production now works too
- **Extensibility:** Easy to add new reproduction types (e.g., spore dispersal, fruit production)

## Related Files

- **Primary:** 
  - `js/entities/plant.js` (reproduction checking)
  - `js/core/plant_manager.js` (reproduction handling)
- **Species Configs:** 
  - `species/clover.json` (seedProduction)
  - `species/nettles.json` (rhizomeCloning)
- **Documentation:** 
  - `doc/features/reproduction-system.md` (should be updated)

## Future Enhancements

1. **Pollination system:** Seeds require nearby flowering plants
2. **Seasonal reproduction:** Some species only reproduce in certain seasons
3. **Animal dispersal:** Seeds can travel farther with animal vectors
4. **Mutation chance:** Small chance of offspring having different traits
5. **Seed bank:** Seeds can lay dormant and germinate years later
6. **Wind/water dispersal:** Direction-biased seed dispersal based on terrain

## Configuration Examples

### High Reproduction (Ground Cover)
```json
"seedProduction": {
  "checkIntervalDays": 2,
  "successChance": 0.6,
  "maxDistance": 3,
  "germinationChance": 0.9
}
```

### Low Reproduction (Trees)
```json
"seedProduction": {
  "checkIntervalDays": 10,
  "successChance": 0.2,
  "maxDistance": 5,
  "germinationChance": 0.3
}
```

## Technical Notes

### Reproduction Flow

```
1. Plant.update() called every frame
   ↓
2. Plant.checkReproduction() called with currentDay
   ↓
3. Check reproduction config exists
   ↓
4. Route to _checkRhizomeCloning() OR _checkSeedProduction()
   ↓
5. Check: enabled, active stage, interval elapsed
   ↓
6. Roll for success chance
   ↓
7. Return event data { type, parentX, parentY, ... }
   ↓
8. PlantManager.handleReproduction(event)
   ↓
9. Route to _handleRhizomeCloning() OR _handleSeedProduction()
   ↓
10. (Seed only) Roll for germination chance
   ↓
11. Find valid neighbor cells
   ↓
12. Check nutrients + layer + plantability
   ↓
13. Spawn new plant at random valid location
```

### Why Two-Stage Success for Seeds?

Seeds realistically have two points of failure:
1. **Production failure:** Plant doesn't produce viable seeds (environmental stress, poor pollination)
2. **Germination failure:** Seeds fail to sprout (wrong conditions, predation, dormancy)

This creates more realistic population dynamics than rhizome cloning's guaranteed success.

## Testing Checklist

- [x] Automated verification passes (npm run verify)
- [x] No console errors introduced
- [x] FPS maintained (47 FPS)
- [x] Clover reproduction works (manual observation)
- [x] Nettles reproduction still works (no regression)
- [x] Seeds respect nutrient requirements
- [x] Seeds respect multi-layer system
- [x] Germination chance is applied correctly
- [x] Documentation updated (this devlog)

## Commit Message

```
Implement seed production reproduction system for clover

Add support for seedProduction reproduction type alongside existing
rhizomeCloning. Clover now spreads via seeds with two-stage success:
production (40%) and germination (70%). Refactored Plant and
PlantManager to handle multiple reproduction strategies.

- Refactored Plant.checkReproduction() to route by type
- Added Plant._checkSeedProduction() method
- Refactored PlantManager.handleReproduction() to route by type
- Added PlantManager._handleSeedProduction() with germination roll

Validated with npm run verify (PASS) and manual clover spreading test.
```
