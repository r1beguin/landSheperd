# Flood Events System

**Status**: Active  
**Version**: 1.0  
**Milestone**: 2

## Overview

The Flood Events System simulates periodic seasonal flooding along rivers, depositing nutrients in nearby soil. This mimics real-world flood-dependent ecosystems like the Nile River valley, Tigris-Euphrates mesopotamia, and Yellow River plains.

## Behavior

### Flood Triggers

- **Periodic**: Floods occur every N game days (configurable)
- **Rivers Only**: Only river tiles trigger floods (lakes excluded)
- **Automatic**: Managed by TimeManager update loop
- **Configurable**: All parameters in config.json

### Nutrient Deposition

**Affected Nutrients**:
- Nitrogen (N) - Default +10
- Phosphorus (P) - Default +5
- Potassium (K) - Default +3
- Organic Matter (OM) - Default +8

**Spatial Distribution**:
- **Radius**: Configurable (default 3 cells)
- **Falloff**: Linear `1.0 - (distance / radius)`
- **Example**: At distance 1 from river with radius 3:
  - Falloff = 1.0 - (1/3) = 0.67
  - N increase = 10 * 0.67 = 6.7

### Visual Feedback

- Soil near rivers darkens after flood (higher fertility)
- Console log: "[FLOOD] Flood event triggered (Day X)"
- Console log: "[FLOOD] Flood effects applied to Y cells near Z river tiles (Nms)"

## Configuration

Location: `config.json → world.terrain.water.floodEvents`

```json
{
    "floodEvents": {
        "enabled": true,
        "intervalDays": 12,
        "radius": 3,
        "nitrogenBonus": 10,
        "phosphorusBonus": 5,
        "potassiumBonus": 3,
        "organicMatterBonus": 8,
        "enableLogging": true
    }
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | true | Master switch for flood events |
| `intervalDays` | number | 12 | Game days between flood events |
| `radius` | number | 3 | Effect radius around rivers (cells) |
| `nitrogenBonus` | number | 10 | Max nitrogen increase per flood |
| `phosphorusBonus` | number | 5 | Max phosphorus increase per flood |
| `potassiumBonus` | number | 3 | Max potassium increase per flood |
| `organicMatterBonus` | number | 8 | Max organic matter increase per flood |
| `enableLogging` | boolean | true | Console logging of flood events |

## Use Cases

### Balanced Ecosystem (Default)
```json
{
    "intervalDays": 12,
    "radius": 3,
    "nitrogenBonus": 10
}
```
- Moderate flood frequency
- Gradual nutrient replenishment
- Suitable for most biomes

### Arid Environment (Rare Floods)
```json
{
    "intervalDays": 30,
    "radius": 2,
    "nitrogenBonus": 20,
    "phosphorusBonus": 10
}
```
- Infrequent but powerful floods
- Smaller affected area
- High impact when floods occur
- Simulates desert oasis systems

### Tropical Monsoon (Frequent Floods)
```json
{
    "intervalDays": 6,
    "radius": 4,
    "nitrogenBonus": 5,
    "phosphorusBonus": 3
}
```
- Frequent light floods
- Larger affected area
- Continuous nutrient cycling
- Simulates rainforest river systems

### Historical Nile-Style Floods
```json
{
    "intervalDays": 365,
    "radius": 5,
    "nitrogenBonus": 30,
    "phosphorusBonus": 20,
    "organicMatterBonus": 25
}
```
- Annual flood cycle
- Large fertile zone
- High nutrient deposition
- Simulates ancient Egyptian agriculture

## Performance

**Processing Time**: <5ms per flood event  
**FPS Impact**: None (event-based)  
**Memory**: Minimal (Set-based tracking)

**Tested Configuration**:
- River tiles: 276
- Affected cells: 292
- Processing time: 2ms
- Per-cell: ~0.007ms

### Water Fertility System Optimization

The water fertility system (including riparian zones, water seeping, decomposition, and nitrogen regeneration) has been optimized for scalability:

- **Throttled Updates:** Soil effects run at biologically-appropriate intervals (hourly/daily)
- **Spatial Caching:** Riparian zones and seeping influence pre-computed at startup
- **Memory Efficient:** ~250KB cache overhead for ~2400 affected cells
- **FPS Target:** 48 FPS maintained (well above 30 FPS minimum)
- **Performance Gain:** 433% improvement (9 FPS → 48 FPS)

**Optimization Techniques:**
- **P0 Throttling:** Weather (1x/hour), decomposition (1x/day), seeping (1x/day)
- **P1 Riparian Grid:** O(1) lookups instead of O(N×M) distance calculations (480x speedup)
- **P2 Influence Map:** Pre-computed seeping rates (45x reduction in operations)

See [Water Fertility Performance Optimization](water-fertility-performance-optimization.md) for detailed implementation and patterns.

## Technical Details

### Implementation

**Manager**: `SoilEffectsManager`  
**Method**: `applyFloodEffects(soilGrid, riverTiles, config)`

**Algorithm**:
1. For each river tile in Set
2. Check cells within radius
3. Calculate distance: `sqrt(dx² + dy²)`
4. Skip if distance > radius
5. Calculate falloff: `1.0 - (distance / radius)`
6. Apply bonuses: `nutrient += bonus * falloff`
7. Clamp to 0-100 range
8. Recalculate derived properties
9. Mark for texture update

**Integration Points**:
- TimeManager.update() - Interval tracking
- SoilEffectsManager - Nutrient application
- SoilManager - Texture refresh
- TerrainGenerator - River tile access

### Data Flow

```
TimeManager.update()
  ↓ (check interval)
TimeManager.triggerFloodEvent()
  ↓ (get river tiles)
TerrainGenerator.getRiverTiles()
  ↓ (return Set<"x,y">)
SoilEffectsManager.applyFloodEffects()
  ↓ (modify soil nutrients)
SoilManager.needsRefresh = true
  ↓ (next frame)
TextureGenerator regenerates affected textures
```

## Edge Cases

1. **No Rivers**: Flood skipped with log message
2. **Disabled Config**: Checked each trigger attempt
3. **Water Tiles**: Skipped (only plantable soil affected)
4. **Lake Proximity**: Lakes NOT affected by river floods
5. **Nutrient Cap**: Values clamped to 100 (no overflow)
6. **Duplicate Cells**: Set tracking prevents double-application

## Debugging

**Enable Logging**:
```json
"floodEvents": {
    "enableLogging": true
}
```

**Console Output**:
```
[TIME] Flood events enabled: every 12 days
[FLOOD] Flood event triggered (Day 12)
[FLOOD] Flood effects applied to 292 cells near 276 river tiles (2ms)
```

**Manual Test Page**:
`tests/html/flood-events-test.html`
- Real-time nutrient tracking
- Manual flood trigger
- Time acceleration controls

## Future Enhancements

1. **Variable Intensity**: Random flood strength per event
2. **Seasonal Patterns**: Higher probability in certain months
3. **Flood Damage**: Wash away plants at 100% intensity
4. **Visual Effects**: Water shader animation during flood
5. **Prediction System**: UI indicator for upcoming flood
6. **Soil Erosion**: High intensity reduces organic matter
7. **Sediment Layers**: Track multiple flood deposits

## Related Systems

- [Terrain Generation System](terrain-generation-system.md)
- [Nutrient System](nutrient-system.md)
- [Weather System](weather-system.md)
- [Fertility System](fertility-system.md)

## References

- Milestone 2 Implementation: `MILESTONE2_FLOOD_EVENTS_SUMMARY.md`
- Dev Log: `doc/devlogs/2025-12/flood-events-implementation.md`
- Config Schema: `schemas/config.schema.json`
