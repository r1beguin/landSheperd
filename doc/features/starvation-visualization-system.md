# Starvation Visualization System

**Feature:** Multi-stage visual feedback for plant nutrient deficiencies  
**Status:** Active  
**Config Location:** `config.json → world.plants.starvationVisualization`

---

## Overview

The Starvation Visualization System provides dramatic visual feedback when plants are suffering from nutrient deficiencies. Plants progress through 4 distinct stages (Healthy → Stressed → Starving → Critical) with color shifts, fading, and wilting effects that intensify over time.

---

## Starvation Stages

### Stage 1: HEALTHY
**Trigger:** ≥80% of optimal nutrients AND 0 days stunted

**Visual Effects:**
- Color Intensity: 100% (full vibrant colors)
- Alpha: 1.0 (fully opaque)
- Size: 100% (normal size)

**Player Experience:** Plant looks vibrant and healthy

---

### Stage 2: STRESSED
**Trigger:** 50-80% of optimal nutrients OR 0-2 days stunted

**Visual Effects:**
- Color Intensity: 70% (30% color reduction)
- Alpha: 0.95 (slightly faded)
- Size: 95% (5% smaller)

**Player Experience:** Slight color change, barely visible wilting - "This plant is struggling"

---

### Stage 3: STARVING
**Trigger:** 20-50% of optimal nutrients OR 3-5 days stunted

**Visual Effects:**
- Color Intensity: 40% (60% color reduction - very pale)
- Alpha: 0.8 (20% fade)
- Size: 85% (15% smaller - visible wilting)

**Player Experience:** Very pale, noticeable fade, visible wilting - "This plant is dying"

---

### Stage 4: CRITICAL
**Trigger:** <20% of optimal nutrients OR 6+ days stunted

**Visual Effects:**
- Color Intensity: 20% (80% color reduction - nearly gray)
- Alpha: 0.6 (40% fade - very faded)
- Size: 70% (30% smaller - severe wilting)

**Player Experience:** Nearly gray, severe fade, dramatic shrinking - "This plant is nearly dead"

---

## Nutrient-Specific Colors

### Nitrogen Deficiency
**Color Shift:** Pale/Yellow (RGB reduction: 60%)
- High red (1.0)
- Reduced green (-60%)
- Reduced blue (-60%)

**Real-World Analog:** Chlorophyll loss → yellow/pale leaves

**Visual Progression:**
- Healthy: Vibrant green
- Stressed: Light green
- Starving: Pale yellow-green
- Critical: Pale yellow/white

---

### Phosphorus Deficiency
**Color Shift:** Purple/Reddish (RGB reduction: 70%)
- High red (1.0)
- Reduced green (-70%)
- Slight blue reduction (-20%)

**Real-World Analog:** Anthocyanin accumulation → purple tint

**Visual Progression:**
- Healthy: Vibrant green
- Stressed: Slight purple tint
- Starving: Purple-red
- Critical: Deep purple

---

### Potassium Deficiency
**Color Shift:** Brown/Yellow edges (RGB reduction: 80%)
- High red (1.0)
- Reduced green (-56%)
- Reduced blue (-80%)

**Real-World Analog:** Leaf edge necrosis → brown/yellow edges

**Visual Progression:**
- Healthy: Vibrant green
- Stressed: Yellow edges
- Starving: Brown-yellow
- Critical: Dark brown

---

### Organic Matter Deficiency
**Color Shift:** Dull/Desaturated (RGB reduction: 50%)
- Equal reduction to all channels (-50%)

**Real-World Analog:** General poor soil health → dull appearance

**Visual Progression:**
- Healthy: Vibrant
- Stressed: Slightly dull
- Starving: Very dull
- Critical: Gray/lifeless

---

## Technical Implementation

### Algorithm

1. **Calculate nutrient scores** (0.0-1.0) for N, P, K, OM
2. **Find most limiting nutrient** (Liebig's Law - minimum score)
3. **Determine starvation stage** based on:
   - Nutrient score (% of optimal)
   - Days stunted (time in poor conditions)
4. **Apply base deficiency tint** for limiting nutrient
5. **Modulate by stage color intensity** (blend toward white/gray)
6. **Apply alpha fade** for wilting effect
7. **Apply size multiplier** for shrinking effect

### Code Flow

```
plant.update()
  └─→ consumeNutrientsDaily()
      └─→ soil nutrients decrease

plant.getRenderData()
  ├─→ calculateNutrientTint()
  │   ├─→ Get soil nutrients
  │   ├─→ Calculate nutrient scores
  │   ├─→ Find limiting nutrient (min score)
  │   ├─→ getStarvationStage(minScore)
  │   ├─→ Calculate base deficiency tint
  │   ├─→ Apply stage color intensity
  │   └─→ Return [r, g, b, a]
  │
  └─→ getStarvationStage(minScore)
      ├─→ Get days stunted
      ├─→ Match to stage (healthy/stressed/starving/critical)
      ├─→ Return sizeMultiplier
      └─→ Apply wilting size effect
```

---

## Configuration

### Default Config (`config.json`)

```json
{
  "world": {
    "plants": {
      "starvationVisualization": {
        "enabled": true,
        "stages": {
          "healthy": {
            "nutrientThreshold": 0.8,
            "colorIntensity": 1.0,
            "alphaMultiplier": 1.0,
            "sizeMultiplier": 1.0
          },
          "stressed": {
            "nutrientThreshold": 0.5,
            "daysStuntedMax": 2,
            "colorIntensity": 0.7,
            "alphaMultiplier": 0.95,
            "sizeMultiplier": 0.95
          },
          "starving": {
            "nutrientThreshold": 0.2,
            "daysStuntedMax": 5,
            "colorIntensity": 0.4,
            "alphaMultiplier": 0.8,
            "sizeMultiplier": 0.85
          },
          "critical": {
            "nutrientThreshold": 0.0,
            "daysStuntedMax": 999,
            "colorIntensity": 0.2,
            "alphaMultiplier": 0.6,
            "sizeMultiplier": 0.7
          }
        },
        "enhancedColorIntensity": {
          "nitrogen": 0.6,
          "phosphorus": 0.7,
          "potassium": 0.8,
          "organicMatter": 0.5
        }
      }
    }
  }
}
```

### Tuning Parameters

| Parameter | Purpose | Default | Range |
|-----------|---------|---------|-------|
| `nutrientThreshold` | Nutrient % for stage | 0.0-0.8 | 0.0-1.0 |
| `daysStuntedMax` | Max days in stage | 0-5 | 0-999 |
| `colorIntensity` | Color vibrancy | 0.2-1.0 | 0.0-1.0 |
| `alphaMultiplier` | Opacity | 0.6-1.0 | 0.0-1.0 |
| `sizeMultiplier` | Plant size | 0.7-1.0 | 0.5-1.0 |
| `enhancedColorIntensity.*` | Nutrient color reduction | 0.5-0.8 | 0.0-1.0 |

---

## Integration with Other Systems

### Nutrient System
- Uses existing `nutrientScore()` method
- Respects genetic efficiency modifiers
- Follows Liebig's Law (most limiting nutrient)

### Growth System
- Starvation doesn't affect growth logic (handled separately)
- Wilting is purely visual (doesn't change actual plant.width/height)
- Stage advancement still based on accumulated growth days

### Reproduction System
- Starving plants can still attempt reproduction
- Reproduction cost checks use actual soil nutrients (not visual)
- Starvation visuals don't affect reproduction logic

### Soil System
- Reads current soil nutrients (N, P, K, OM)
- No modification to soil data
- Purely visual feedback layer

---

## Performance Characteristics

- **Complexity:** O(1) per visible plant per frame
- **Memory:** No additional data structures
- **CPU:** Minimal (simple arithmetic, config lookups cached)
- **GPU:** Standard tint shader operations (no custom shaders)
- **Culling:** Only visible plants calculate (handled by render system)

**Measured Impact:**
- FPS: No regression (44-46 FPS maintained)
- Memory: <1KB (config data only)
- Render Time: <0.1ms per plant

---

## Debugging

### Enable Visual Feedback Overlay
Press `O` key to cycle through nutrient overlays (N → P → K → OM → off)

### Inspect Plant State
Right-click plant → Context menu shows:
- Current nutrients (N, P, K, OM)
- Days stunted
- Starvation stage (if in debug mode)

### Console Logging
```javascript
// Add to plant.js calculateNutrientTint() for debugging
console.log(`Plant at (${this.x}, ${this.y}):`, {
  nScore, pScore, kScore, omScore,
  minScore,
  limitingNutrient,
  stage: starvationStage.name,
  tint: [r, g, b, a]
});
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No color change | Feature disabled | Set `enabled: true` in config |
| Always healthy | High fertility soil | Spawn in low-fertility areas |
| Too subtle | Low color intensity | Increase `enhancedColorIntensity` values |
| Too dramatic | High color intensity | Decrease `enhancedColorIntensity` values |
| No wilting | Size multiplier = 1.0 | Adjust `sizeMultiplier` in stages |

---

## Testing

### Manual Testing
1. Start local server: `http://localhost:8081`
2. Open visual test: `/tests/html/starvation-visualization-test.html`
3. View stage comparisons and color swatches

### In-Game Testing
1. Spawn plant in poor soil (use overlay to find low nutrients)
2. Fast-forward time with `+` key
3. Observe progression over 10 game days
4. Press `O` to identify limiting nutrient

### Automated Testing
```bash
npm run verify
```

Expected:
- ✅ 0 console errors
- ✅ FPS ≥30
- ✅ Visual diff ~20-25% (intentional)

---

## Design Rationale

### Why Multi-Stage?
Single-stage deficiency was too subtle. Multi-stage creates clear progression:
- Players can identify "starting to struggle" vs "about to die"
- Allows time for player intervention (add fertilizer, replant)
- Creates emotional attachment (save the dying plant!)

### Why Alpha Blending?
- Simulates wilting/dehydration visual effect
- More dramatic than color alone
- Reinforces "fading away" metaphor

### Why Size Reduction?
- Most dramatic visual cue (impossible to miss)
- Real-world plants do wilt/shrink when stressed
- Provides spatial feedback (easier to spot from distance)

### Why Enhanced Color Intensity?
- Original 30-50% reduction too subtle
- 60-80% reduction creates "shocking" visual
- Forces player to pay attention to struggling plants

---

## Future Considerations

### Potential Additions
- Particle effects (wilting leaves falling in critical stage)
- Animated transitions (smooth interpolation between stages)
- Species-specific responses (some plants more resilient)
- Recovery animation (plants "perking up" when nutrients restored)

### Performance Optimizations
- LOD system (distant plants use simplified calculation)
- Batch starvation checks (every N frames instead of every frame)
- Pre-computed tint lookup tables

### Accessibility
- Option for colorblind-friendly mode (use size/alpha more than color)
- Adjustable intensity slider in settings
- Text labels option (show stage name above plant)

---

## Related Documentation

- **[Nutrient System](nutrient-system.md)** - Core nutrient mechanics
- **[Growth System](../features/fertility-system.md)** - How nutrients affect growth
- **[Visual Feedback System](visual-feedback-system.md)** - General visual feedback architecture
- **[Config Validation](config-validation-system.md)** - Config schema and validation

---

**Last Updated:** December 5, 2025  
**Version:** 1.0  
**Status:** Production Ready
