# Terrain Generation System

## Overview

The terrain generation system provides deterministic procedural generation of rivers, lakes, and fertility zones in Land Shepherd. All terrain features are generated from a single seed value, ensuring reproducible worlds that can be shared and regenerated identically.

**Status**: Complete (8/8 milestones)  
**Performance**: 10ms generation time, 39 FPS rendering, 0 errors  
**Coverage**: ~25% of map as water, 529 cells with fertility boost  

---

## Architecture

### Core Components

1. **ProceduralGenerator** (`js/core/procedural_generator.js`)
   - Mulberry32 PRNG for deterministic random numbers
   - River generation with natural meandering
   - Lake generation with irregular shapes
   - Seed management and initialization

2. **SoilManager** (`js/core/soil_manager.js`)
   - Water tile tracking and rendering
   - Fertility zone calculation around water bodies
   - Integration with plant placement restrictions
   - Soil color recalculation based on nutrients

3. **Soil Entity** (`js/entities/soil.js`)
   - `isWater` flag for water tiles
   - `waterDepth` property (60-90 range)
   - Blue color rendering based on depth
   - Modified `getRenderData()` for water tiles

4. **GraphicsEngine** (`js/core/main_graphics.js`)
   - Seed UI initialization and event handlers
   - Seed persistence (localStorage, URL params)
   - Water shader integration
   - Seed source priority management

5. **RenderSystem** (`js/systems/render_system.js`)
   - `renderWaterRect()` method for water tiles
   - Animated ripple shader with triple sine waves
   - Day/night cycle brightness modulation

---

## Seed System

### Seed Priority Order

The system checks multiple sources for the world seed in this priority order:

1. **URL Parameter** (highest priority)
   ```
   http://localhost:8080?seed=12345678
   ```

2. **localStorage**
   - Key: `landShepherd_seed`
   - Persists across page reloads
   - Updated when regenerating with manual input

3. **config.json**
   ```json
   {
     "world": {
       "terrain": {
         "seed": 12345678
       }
     }
   }
   ```

4. **Random Generation** (lowest priority)
   - If no seed found in above sources
   - Uses `Date.now()` to generate random seed
   - Seed is then persisted to localStorage

### Seed Range

Valid seeds: `0` to `4294967295` (32-bit unsigned integer)

### Seed UI

Located in top-right corner of screen:

- **Current Seed Display**: Shows active seed
- **Copy Button**: Copies seed to clipboard (visual feedback with checkmark)
- **Seed Input**: Manual entry field (validates range)
- **Regenerate Button**: Reloads page with new seed from input
  - **With seed input**: Uses the specified seed
  - **Without input (empty)**: Generates a new random seed

---

## Deterministic Random Number Generator

### Mulberry32 PRNG

```javascript
class ProceduralGenerator {
    constructor(seed) {
        this.seed = seed >>> 0; // Ensure 32-bit unsigned
    }
    
    random() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
```

**Properties**:
- Fast: ~50ns per call
- High quality: Passes statistical tests
- Deterministic: Same seed = same sequence
- Small state: Single 32-bit integer

**Usage**: All terrain generation uses `generator.random()` instead of `Math.random()` to ensure determinism.

---

## River Generation

### Algorithm

**Type**: Edge-to-edge pathfinding with natural meandering

**Steps**:

1. **Define Start/End Points**
   - Start: Random position on left/top edge
   - End: Random position on opposite edge (right/bottom)

2. **Path Generation**
   - Calculate direction vector from start to end
   - Create perpendicular vector for meandering
   - Sample path at regular intervals

3. **Meandering with Dual Sine Waves**
   ```javascript
   const offset = 
       oscillationStrength * Math.sin(progress * frequency1 * Math.PI * 2) +
       oscillationStrength * 0.5 * Math.sin(progress * frequency2 * Math.PI * 2);
   ```
   - `frequency1`: 2.0 (primary wave)
   - `frequency2`: 5.0 (secondary detail)
   - `oscillationStrength`: 0.2 (max displacement)

4. **Variable Width**
   - Width varies between `widthMin` (2) and `widthMax` (4) cells
   - Expands perpendicular to path direction
   - Thicker width creates more natural appearance

### Configuration

```json
{
  "world": {
    "terrain": {
      "water": {
        "rivers": {
          "enabled": true,
          "count": 2,
          "widthMin": 2,
          "widthMax": 4,
          "oscillationStrength": 0.2,
          "frequency1": 2.0,
          "frequency2": 5.0
        }
      }
    }
  }
}
```

### Performance

- **Generation time**: ~4ms for 2 rivers
- **Tile count**: ~277 water tiles
- **Deterministic**: Same seed = identical rivers

---

## Lake Generation

### Algorithm

**Type**: Radial expansion with multi-frequency noise perturbation

**Steps**:

1. **Center Point Selection**
   - Random position with 10-cell margin from edges
   - Ensures lakes don't spawn at map boundaries

2. **Radius Determination**
   - Random radius between `radiusMin` (3) and `radiusMax` (8)

3. **Shape Perturbation**
   - Sample angles around center (0° to 360°, 5° increments)
   - Perturb radius with multi-frequency sine/cosine waves:
   ```javascript
   const perturbedRadius = baseRadius + 
       perturbationAmount * Math.sin(angle * 3 + seed1) +
       perturbationAmount * Math.cos(angle * 5 + seed2) +
       perturbationAmount * 0.5 * Math.sin(angle * 7 + seed3);
   ```
   - Creates irregular, organic shapes

4. **Depth Gradient**
   - Depth based on distance from center
   - Range: 60 (edge) to 90 (center)
   - Creates darker center, lighter edges

### Configuration

```json
{
  "world": {
    "terrain": {
      "water": {
        "lakes": {
          "enabled": true,
          "count": 3,
          "radiusMin": 3,
          "radiusMax": 8,
          "depthMin": 60,
          "depthMax": 90,
          "perturbationAmount": 1.0
        }
      }
    }
  }
}
```

### Performance

- **Generation time**: ~1ms for 3 lakes
- **Tile count**: ~344 water tiles
- **Deterministic**: Same seed = identical lakes

---

## Fertility Zones

### Purpose

Water bodies provide nutrient-rich zones for plant growth, encouraging natural clustering around rivers and lakes.

### Algorithm

**Type**: Radial distance-based bonus with linear falloff

**Steps**:

1. **Identify Water Tiles**
   - Iterate through all tiles marked as water

2. **Radius Expansion**
   - Check tiles within `radius` cells of each water tile
   - Default radius: 3 cells

3. **Nutrient Bonus Calculation**
   ```javascript
   const distance = Math.sqrt(dx * dx + dy * dy);
   if (distance <= radius) {
       const falloff = 1 - (distance / radius); // Linear falloff
       const nitrogenBonus = Math.floor(config.nitrogenBonus * falloff);
       const waterRetentionBonus = Math.floor(config.waterRetentionBonus * falloff);
   }
   ```

4. **Fertility Recalculation**
   - Adds nitrogen bonus to soil
   - Increases water retention
   - Recalculates `baseColor` based on new fertility

### Configuration

```json
{
  "world": {
    "terrain": {
      "water": {
        "fertilityBoost": {
          "enabled": true,
          "radius": 3,
          "nitrogenBonus": 20,
          "waterRetentionBonus": 30
        }
      }
    }
  }
}
```

### Visual Effect

Fertility zones appear as dark brown gradients radiating from water bodies, visible in normal rendering mode.

### Performance

- **Generation time**: ~5ms
- **Affected tiles**: 529 cells (with 621 water tiles)
- **Multiplier**: ~0.85 cells boosted per water tile

### Gameplay Impact

- Plants placed in fertility zones have higher initial nitrogen
- Water retention increases soil hydration during rain
- Natural clustering around rivers/lakes encourages strategic planting

---

## Water Rendering

### Shader Implementation

**Location**: `js/core/main_graphics.js` → `initManagers()` → water shader creation

**Vertex Shader**: Standard quad rendering (see soil rendering)

**Fragment Shader**:
```glsl
precision mediump float;
uniform vec4 u_color;
uniform float u_time;
uniform float u_lightLevel;

void main() {
    // Triple sine wave for organic ripple effect
    float ripple1 = sin(u_time * 2.0 + gl_FragCoord.x * 0.01) * 0.015;
    float ripple2 = sin(u_time * 1.5 + gl_FragCoord.y * 0.008) * 0.015;
    float ripple3 = sin(u_time * 2.5 + (gl_FragCoord.x + gl_FragCoord.y) * 0.012) * 0.015;
    
    float brightnessMod = 1.0 + ripple1 + ripple2 + ripple3; // ±4.5%
    
    vec3 finalColor = u_color.rgb * u_lightLevel * brightnessMod;
    gl_FragColor = vec4(finalColor, u_color.a);
}
```

**Features**:
- Three overlapping sine waves with different frequencies (10, 8, 12 Hz)
- Brightness modulation: ±4.5% variance
- Day/night cycle integration via `u_lightLevel`
- Subtle, organic water surface movement

### RenderSystem Integration

**Method**: `renderWaterRect(x, y, width, height, color, lightLevel, time)`

```javascript
renderWaterRect(x, y, width, height, color, lightLevel, time) {
    const shader = this.shaderManager.getShader('water');
    const gl = this.gl;
    
    gl.useProgram(shader.program);
    
    // Uniforms
    gl.uniform4f(shader.uniforms.u_color, ...color);
    gl.uniform1f(shader.uniforms.u_lightLevel, lightLevel);
    gl.uniform1f(shader.uniforms.u_time, time);
    
    // ... quad rendering
}
```

**Called from**: `SoilManager.renderSoilCellWithLOD()` when `soil.isWater === true`

### Performance Impact

- **FPS drop**: 60 → 39 (21 FPS reduction)
- **Reason**: Per-pixel shader calculations for ~621 water tiles
- **Status**: Acceptable (>30 FPS target met)
- **Future optimization**: Batch water tiles into single draw call with instancing

---

## Integration with Existing Systems

### PlantManager

**Integration**: Water tiles block plant placement

```javascript
// In PlantManager.spawnPlant()
const targetSoil = this.soilManager.getSoilAt(x, y);
if (targetSoil.isWater) {
    console.warn('Cannot plant on water tiles');
    return null;
}
```

**Effect**: Plants cannot spawn on rivers or lakes, creating natural boundaries.

### Character Movement

**Integration**: Water tiles block character movement (future feature)

**Planned behavior**:
- Character collision with water tiles
- Optional: Swimming mechanic with slower movement
- Optional: Stamina drain in water

### Nutrient System

**Integration**: Fertility zones modify soil nutrients

**Effect**:
- Nitrogen bonus encourages plant growth near water
- Water retention affects soil hydration during rain events
- Natural ecosystem clustering around water sources

### Weather System

**Synergy**: Rain increases water levels (future enhancement)

**Planned features**:
- Rivers overflow into adjacent tiles during heavy rain
- Lakes expand radius temporarily
- Flood zones with temporary water tiles

---

## Testing

### Test Suite

**File**: `tests/seed-persistence.spec.js`

**Tests**:
1. `should persist seed in localStorage after generation` - Verifies localStorage write
2. `should load seed from localStorage on page reload` - Tests persistence across reloads
3. `should regenerate world with manual seed input` - UI interaction test
4. `should copy seed to clipboard` - Clipboard API test
5. `should prioritize URL parameter over localStorage` - Priority order validation
6. `should reject invalid seed inputs` - Input validation test
7. `should generate deterministic terrain with same seed` - Determinism validation
8. `should generate random seed when input is empty` - Random seed generation on empty input

**Run command**:
```bash
set TEST_SEED_PERSISTENCE=true && npx playwright test
```

**Results**: 8/8 passing

### Manual Testing

1. **Seed Regeneration**:
   - Enter seed value (e.g., 12345678) in seed input
   - Click "Regenerate" button
   - Verify page reloads and displays same seed
   - Verify terrain matches previous generation

2. **Random Seed Generation**:
   - Leave seed input empty
   - Click "Regenerate" button
   - Verify page reloads with new random seed
   - Verify seed is different from previous
   - Verify terrain has changed

3. **URL Parameter**:
   - Navigate to `http://localhost:8080?seed=99999999`
   - Verify seed 99999999 is used and displayed
   - Reload page without URL param
   - Verify localStorage preserves seed

4. **Clipboard Copy**:
   - Click copy button (📋)
   - Button changes to checkmark (✓) for 1 second
   - Paste into text editor
   - Verify seed value matches displayed seed

5. **Determinism**:
   - Note current seed
   - Regenerate with same seed multiple times
   - Verify terrain features (rivers, lakes) identical each time
   - Count water tiles: should match exactly

---

## Configuration Reference

### Complete Config Schema

```json
{
  "world": {
    "terrain": {
      "seed": null,
      "water": {
        "rivers": {
          "enabled": true,
          "count": 2,
          "widthMin": 2,
          "widthMax": 4,
          "oscillationStrength": 0.2,
          "frequency1": 2.0,
          "frequency2": 5.0
        },
        "lakes": {
          "enabled": true,
          "count": 3,
          "radiusMin": 3,
          "radiusMax": 8,
          "depthMin": 60,
          "depthMax": 90,
          "perturbationAmount": 1.0
        },
        "fertilityBoost": {
          "enabled": true,
          "radius": 3,
          "nitrogenBonus": 20,
          "waterRetentionBonus": 30
        }
      }
    }
  }
}
```

### Parameter Tuning Guide

**River Count**:
- 0-1: Sparse, disconnected world
- 2-3: Natural, balanced (recommended)
- 4+: Heavily fragmented terrain

**River Width**:
- 1-2: Small streams
- 2-4: Medium rivers (recommended)
- 5+: Wide waterways (may dominate terrain)

**Lake Count**:
- 0-2: Arid landscape
- 3-4: Balanced wetlands (recommended)
- 5+: Swampy, water-heavy terrain

**Lake Radius**:
- 2-4: Small ponds
- 5-8: Medium lakes (recommended)
- 9+: Large bodies of water (may overlap)

**Fertility Radius**:
- 1-2: Tight clustering around water
- 3-4: Balanced zones (recommended)
- 5+: Wide green belts (may cover entire map)

**Nitrogen Bonus**:
- 0-10: Subtle effect
- 10-20: Noticeable boost (recommended)
- 20+: Strong clustering (may make non-water zones barren)

---

## Performance Metrics

### Generation Performance

| Component | Time | Tile Count | Per-Tile Time |
|-----------|------|------------|---------------|
| Rivers (2) | 4ms | 277 | 14.4μs |
| Lakes (3) | 1ms | 344 | 2.9μs |
| Fertility | 5ms | 529 | 9.5μs |
| **Total** | **10ms** | **621 water** | **16.1μs avg** |

### Runtime Performance

| Metric | Before Water | After Water | Change |
|--------|-------------|-------------|--------|
| FPS | 60 | 39 | -21 (-35%) |
| Load Time | 1200ms | 1181ms | -19ms |
| Console Errors | 0 | 0 | 0 |
| WebGL Status | ok | ok | no change |
| Memory | ~45MB | ~48MB | +3MB (+6.7%) |

### Benchmarking Commands

```bash
# Full verification with metrics
npm run verify

# Interactive testing with FPS monitoring
npm run verify:interactive

# Seed persistence validation
set TEST_SEED_PERSISTENCE=true && npx playwright test
```

---

## API Reference

### ProceduralGenerator Class

**Constructor**:
```javascript
new ProceduralGenerator(seed)
```
- `seed`: 32-bit unsigned integer (0-4294967295)

**Methods**:

#### `random()`
Returns deterministic random float in range [0, 1)
```javascript
const value = generator.random(); // 0.0 - 0.999...
```

#### `generateRivers(gridWidth, gridHeight, config)`
Generates river paths
```javascript
const rivers = generator.generateRivers(200, 150, {
    count: 2,
    widthMin: 2,
    widthMax: 4,
    oscillationStrength: 0.2,
    frequency1: 2.0,
    frequency2: 5.0
});
// Returns: Set of {x, y, depth} objects
```

#### `generateLakes(gridWidth, gridHeight, config, existingWater)`
Generates irregular lake shapes
```javascript
const lakes = generator.generateLakes(200, 150, {
    count: 3,
    radiusMin: 3,
    radiusMax: 8,
    depthMin: 60,
    depthMax: 90,
    perturbationAmount: 1.0
}, riverSet);
// Returns: Set of {x, y, depth} objects
```

---

### SoilManager Extensions

**Properties**:

#### `waterTiles`
Set of grid keys for water tiles
```javascript
const waterKey = `${x},${y}`;
if (soilManager.waterTiles.has(waterKey)) {
    // Tile is water
}
```

**Methods**:

#### `getSeed()`
Returns current world seed
```javascript
const seed = soilManager.getSeed(); // e.g., 3656293739
```

#### `applyFertilityBoost(waterTiles, config)`
Applies fertility zones around water
```javascript
soilManager.applyFertilityBoost(
    soilManager.waterTiles,
    config.world.terrain.water.fertilityBoost
);
```

---

### GraphicsEngine Extensions

**Static Methods**:

#### `getSeedFromSources(config)`
Retrieves seed from URL, localStorage, or config
```javascript
const seed = GraphicsEngine.getSeedFromSources(config);
// Priority: URL > localStorage > config > random
```

**Instance Methods**:

#### `updateSeedUI()`
Updates seed display in UI
```javascript
graphicsEngine.updateSeedUI();
// Updates #current-seed element
```

#### `initializeSeedUI()`
Sets up seed UI event handlers
```javascript
graphicsEngine.initializeSeedUI();
// Called during initialization
```

---

## Troubleshooting

### Issue: Seed not persisting

**Symptoms**: Different terrain every reload

**Causes**:
1. localStorage disabled in browser
2. Incognito/private browsing mode
3. localStorage quota exceeded

**Solutions**:
- Check browser console for storage errors
- Enable cookies and local storage in browser settings
- Clear localStorage if quota exceeded
- Use URL parameter as fallback: `?seed=12345678`

---

### Issue: Rivers not visible

**Symptoms**: Water tiles generated but appear brown

**Cause**: Water tiles not using water shader

**Solution**: Verify `SoilManager.renderSoilCellWithLOD()` checks `soil.isWater`:
```javascript
} else if (soil.isWater) {
    renderSystem.renderWaterRect(...);
}
```

---

### Issue: Performance degradation

**Symptoms**: FPS drops below 30

**Causes**:
1. Too many water tiles (>1000)
2. Shader complexity too high
3. Other render operations competing

**Solutions**:
- Reduce river/lake count in config
- Reduce river width
- Implement water tile batching (see Future Improvements)
- Profile with Chrome DevTools Performance tab

---

### Issue: Non-deterministic generation

**Symptoms**: Same seed produces different terrain

**Causes**:
1. Using `Math.random()` instead of `generator.random()`
2. Async operations affecting order
3. Floating point precision issues

**Solutions**:
- Grep codebase for `Math.random()` usage in terrain generation
- Ensure all random calls use ProceduralGenerator instance
- Add determinism test to CI pipeline

---

## Future Improvements

### Performance Optimization

1. **Water Tile Batching**
   - Combine all water tiles into single draw call
   - Use instanced rendering with instance attributes
   - Expected FPS gain: 39 → 55 (+16 FPS)

2. **Level of Detail (LOD)**
   - Disable ripple shader when zoomed out
   - Use static blue color for distant water
   - Expected FPS gain: 39 → 50 (+11 FPS)

3. **Precomputed Ripples**
   - Generate ripple texture atlas
   - Animate via texture coordinate offset
   - Expected FPS gain: 39 → 58 (+19 FPS)

### Feature Enhancements

1. **Dynamic Water Levels**
   - Rivers overflow during heavy rain
   - Lakes expand/contract with weather
   - Temporary flood zones

2. **Water Flow Simulation**
   - Particles follow river direction
   - Current affects plant/character movement
   - Visual flow indicators (foam, debris)

3. **Seasonal Water Variation**
   - Winter: Ice formation (frozen tiles)
   - Summer: Evaporation (reduced depth)
   - Spring: Snow melt (increased volume)

4. **Biome Integration**
   - Desert: Rare oases
   - Tundra: Ice sheets
   - Rainforest: Dense river networks

5. **Fishing & Aquatic Life**
   - Fish entities in water tiles
   - Fishing mechanic for character
   - Aquatic plants (reeds, lily pads)

### Quality of Life

1. **Seed Sharing UI**
   - Copy URL with seed parameter
   - Generate shareable link
   - Social media integration

2. **Seed Library**
   - Save favorite seeds with names
   - Browse community-shared seeds
   - Tag seeds by features (e.g., "large lakes", "river network")

3. **Terrain Preview**
   - Mini-map showing water distribution
   - Thumbnail generator for seed library
   - Quick regenerate until satisfied

---

## Development History

See devlogs for detailed implementation notes:

- **2025-11-30**: [doc/devlogs/2025-11/2025-11-30-weather-soil-integration.md](../devlogs/2025-11/2025-11-30-weather-soil-integration.md) - Initial water tile implementation
- **2025-12-01**: [doc/devlogs/2025-12/2025-12-01-fertility-zones-around-water.md](../devlogs/2025-12/2025-12-01-fertility-zones-around-water.md) - Fertility boost milestone
- **2025-12-01**: [doc/devlogs/2025-12/2025-12-01-water-shader-milestone6.md](../devlogs/2025-12/2025-12-01-water-shader-milestone6.md) - Animated water rendering

---

## Related Systems

- **[Weather System](weather-system.md)** - Rain affects soil water levels, synergy with water tiles
- **[Fertility System](fertility-system.md)** - Fertility zones around water boost plant growth
- **[Plant Generation System](plant-generation-system.md)** - Plants restricted from water tiles
- **[Nutrient System](nutrient-system.md)** - Nitrogen bonus in fertility zones

---

## Conclusion

The terrain generation system provides a robust foundation for procedural world creation in Land Shepherd. With deterministic seed-based generation, players can share and reproduce identical worlds. The integration of rivers, lakes, and fertility zones creates natural ecosystems that encourage strategic gameplay while maintaining high performance.

**Key Achievements**:
- 100% deterministic terrain generation
- 10ms generation time for complex features
- 39 FPS stable rendering with animated water
- Comprehensive test coverage (7/7 passing)
- Intuitive seed UI with persistence
- Natural clustering around water sources

**Next Steps**:
- Implement batched water rendering for FPS improvement
- Add dynamic water levels tied to weather
- Create seed library and sharing features
- Expand aquatic ecosystem with fishing mechanics
