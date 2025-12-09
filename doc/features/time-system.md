# Time System with Speed Control

**Category**: Features  
**Related Docs**: [Lighting System](lighting-system.md), [Weather System](weather-system.md)  
**Status**: ✅ COMPLETE (with 10x Speed & Lighting Bypass)  
**Last Updated**: 2025-12-09

[Navigation: [Index](../INDEX.md) | [Features](./)]

---

## Overview

The Time System provides configurable game time progression with multiple speed presets, enabling users to control the pace of the simulation from pause to ultra-fast 10x speed. The system integrates seamlessly with day/night lighting and includes an intelligent lighting bypass feature that prevents visual distraction at high speeds.

**Key Features:**
- 7 speed presets from pause (0x) to ultra-fast (10x)
- Real-time to game-time conversion
- Keyboard controls for instant speed changes
- Automatic lighting bypass at ≥5x speed
- Weather effects preserved during bypass
- UI display with speed and current game time

## Feature Goals

### Primary Objectives
- ✅ Provide flexible time control for different gameplay styles
- ✅ Support rapid simulation for testing and observation
- ✅ Maintain visual clarity at high speeds (lighting bypass)
- ✅ Preserve gameplay-critical weather effects
- ✅ Minimal performance overhead (<0.5ms per frame)

### Design Philosophy
The time system prioritizes **user control** and **observability**. By providing multiple speed presets and intelligent visual optimizations (lighting bypass), players can efficiently explore ecosystem dynamics at their preferred pace without visual distraction or performance degradation.

---

## System Architecture

### Components Overview

The time system consists of four integrated components:

1. **TimeManager** (`js/core/time_manager.js`) - Core time progression and speed control
2. **Speed Presets** (`config.json`) - Configurable speed multipliers
3. **Lighting Integration** - Bypass at high speeds (≥5x)
4. **UI Display** (`index.html`) - Real-time time and speed display

### Data Flow

```
User Input (keyboard)
         ↓
TimeManager.setTimeScale(preset)
         ↓
Update game time (deltaTime × timeScale)
         ↓
     Day/hour calculation
         ↓
LightingManager checks shouldUpdateTimeOfDay()
         ↓
    ├─ < 5x: Normal lighting
    └─ ≥ 5x: Lighting bypass (full bright)
         ↓
UI updates (day, time, speed, phase)
```

### Integration Points

- **LightingManager**: Checks time scale for bypass activation
- **WeatherManager**: Receives time updates for weather transitions
- **PlantManager**: Uses time for growth progression
- **UI Elements**: Display current day, time, and speed

---

## Speed Presets

The time system provides 7 distinct speed presets for different use cases.

### Speed Preset Configuration Table

| Preset | Multiplier | Lighting | Use Case | Description |
|--------|------------|----------|----------|-------------|
| **pause** | 0x | Normal | Observation | Time completely stopped, inspect scene |
| **verySlow** | 0.05x | Normal | Study | 5% speed for careful observation |
| **slow** | 0.1x | Normal | Default | 10% speed, observe natural cycles |
| **normal** | 0.5x | Normal | Casual | 50% speed, moderately faster gameplay |
| **fast** | 1.0x | Normal | Active | Real-time, full speed simulation |
| **veryFast** | 5.0x | **BYPASSED** | Testing | 5× speed, lighting locked to bright |
| **veryVeryFast** | 10.0x | **BYPASSED** | Rapid | 10× speed, ultra-fast ecosystem simulation |

### Time Conversion

With default configuration (`realSecondsPerGameDay: 10`):

**At 1x speed (fast preset):**
- 1 real second = 0.1 game days
- 10 real seconds = 1 game day
- 1 real minute = 6 game days

**At 10x speed (veryVeryFast preset):**
- 1 real second = 1 game day
- 10 real seconds = 10 game days
- 1 real minute = 60 game days

**Example Growth Timing (Nettles at 1x):**
- Seedling → Vegetative: 3 game days = 30 real seconds
- Vegetative → Flowering: 7 game days = 70 real seconds
- Flowering → Withered: 10 game days = 100 real seconds

**Same Growth at 10x:**
- Seedling → Vegetative: 3 game days = 3 real seconds
- Vegetative → Flowering: 7 game days = 7 real seconds
- Flowering → Withered: 10 game days = 10 real seconds

---

## Lighting Bypass System

### Overview

At time scales ≥5.0x, the lighting system automatically bypasses time-of-day calculations and locks the scene to full brightness. This prevents distracting rapid day/night flashing while preserving important weather effects.

### Bypass Activation

| Time Scale | Bypass Active | Base Lighting | Weather Applied | UI Indicator |
|-----------|---------------|---------------|-----------------|--------------|
| 0x - 4.9x | ❌ No | Time-of-day phases | Yes | Normal phase name |
| **≥5.0x** | ✅ **Yes** | **Locked to [1.0, 1.0, 1.0]** | **Yes** | **"[BYPASS]" tag** |

### Behavior Details

**When Bypass is Active (≥5x speed):**
- Base lighting locked to full brightness: `[1.0, 1.0, 1.0]` (white)
- Time-of-day phase interpolation skipped (performance optimization)
- Current phase set to: `"midday (bypassed)"`
- Weather modifiers **STILL APPLIED** (cloudy dimming, rainy tint)
- Debug UI shows: `[BYPASS] (Speed: Xx)` tag
- Slight FPS improvement (~5%) from skipped calculations

**When Bypass is NOT Active (<5x speed):**
- Full day/night cycle visible
- Time-of-day phases calculated normally (9 phases)
- Weather modifiers applied on top of time-of-day base
- Debug UI shows: current time and phase name

### Rationale

**Problem Solved:**
- At 10x speed, day/night cycles flash rapidly (2.4 seconds per full cycle)
- Distracting for users trying to observe ecosystem changes
- Plant growth, reproduction, and other events hard to track with constant lighting changes

**Solution:**
- Lock lighting to "perpetual midday" at high speeds
- Users see consistent bright lighting
- Weather effects remain visible (gameplay-relevant)
- Smooth transition when returning to normal speed

### Performance Impact

**Measured Performance:**
- FPS at 10x without bypass: ~37 FPS
- FPS at 10x with bypass: ~39 FPS
- **Improvement:** ~5% FPS increase

**Optimization Benefits:**
- Skips phase interpolation (2 lerp operations × 4 values)
- Avoids phase lookup in sorted array (O(n) where n=9)
- Reduces smoothing calculations (colors converge faster)
- Still calculates weather modifier (necessary for gameplay)

**Note:** Performance improvement is small because lighting calculation is already very fast (<0.2ms). The main benefit is UX - avoiding distracting rapid day/night flashing.

---

## Configuration

### Complete config.json Structure

```json
{
    "time": {
        "initialTimeScale": 0.1,
        "realSecondsPerGameDay": 10,
        "timeScalePresets": {
            "pause": 0,
            "verySlow": 0.05,
            "slow": 0.1,
            "normal": 0.5,
            "fast": 1.0,
            "veryFast": 5.0,
            "veryVeryFast": 10.0
        }
    }
}
```

### Parameter Reference

#### initialTimeScale (number)
- **Purpose**: Starting time scale when game loads
- **Default**: `0.1` (slow preset)
- **Range**: 0.0-10.0 (any preset multiplier)
- **Impact**: Determines initial simulation speed
- **Recommendation**: Use 0.1 for observation, 1.0 for active gameplay

#### realSecondsPerGameDay (number)
- **Purpose**: Conversion ratio between real time and game time
- **Default**: `10` (10 real seconds = 1 game day at 1x speed)
- **Range**: 1-60
- **Impact**: Affects all time-based systems (growth, weather, decomposition)
- **Formula**: `gameTime += deltaTime * timeScale / realSecondsPerGameDay`

#### Speed Preset Multipliers

**pause** (number)
- **Value**: `0` (must be exactly 0)
- **Purpose**: Stop time completely
- **Lighting**: Normal (paused at current phase)

**verySlow** (number)
- **Value**: `0.05` (5% speed)
- **Purpose**: Very slow observation
- **Lighting**: Normal day/night cycle

**slow** (number)
- **Value**: `0.1` (10% speed)
- **Purpose**: Default comfortable observation speed
- **Lighting**: Normal day/night cycle

**normal** (number)
- **Value**: `0.5` (50% speed)
- **Purpose**: Moderate gameplay speed
- **Lighting**: Normal day/night cycle

**fast** (number)
- **Value**: `1.0` (100% speed)
- **Purpose**: Real-time simulation
- **Lighting**: Normal day/night cycle

**veryFast** (number)
- **Value**: `5.0` (500% speed)
- **Purpose**: Fast testing and ecosystem observation
- **Lighting**: **BYPASSED** - locked to full brightness

**veryVeryFast** (number)
- **Value**: `10.0` (1000% speed)
- **Purpose**: Ultra-fast simulation, rapid ecosystem evolution
- **Lighting**: **BYPASSED** - locked to full brightness

---

## Usage Examples

### Basic Time Control

```javascript
// Access time manager from GraphicsEngine
const timeManager = graphicsEngine.timeManager;

// Get current time scale
const currentScale = timeManager.getTimeScale();
// Returns: 0.1 (slow preset)

// Get current game day
const day = timeManager.getCurrentDay();
// Returns: 15

// Get current hour (0-24)
const hour = timeManager.getHourOfDay();
// Returns: 14.5 (2:30 PM)

// Get formatted time string
const timeString = timeManager.getTimeOfDayString();
// Returns: "14:30"
```

### Changing Speed

```javascript
// Set to specific preset
timeManager.setTimeScale('pause');      // Stop time
timeManager.setTimeScale('slow');       // 0.1x
timeManager.setTimeScale('fast');       // 1.0x
timeManager.setTimeScale('veryFast');   // 5.0x (bypass activates)
timeManager.setTimeScale('veryVeryFast'); // 10.0x (bypass active)

// Set custom speed (not a preset)
timeManager.setTimeScale(2.5); // 2.5x speed (no preset)
```

### Checking Bypass State

```javascript
// Check if lighting bypass is active
const lm = graphicsEngine.lightingManager;
const bypassActive = lm.isBypassActive();

if (bypassActive) {
    console.log('Lighting bypass active - scene locked to bright');
    console.log(`Current speed: ${timeManager.getTimeScale()}x`);
}

// Check if time-of-day should update
const shouldUpdate = lm.shouldUpdateTimeOfDay();
// Returns: false when timeScale >= 5.0
```

### Integration Example: Time-Based Behavior

```javascript
// Custom manager that responds to time changes
class MyManager {
    update(deltaTime) {
        const currentDay = this.timeManager.getCurrentDay();
        
        // Execute daily behavior
        if (currentDay > this.lastProcessedDay) {
            this.executeDailyBehavior();
            this.lastProcessedDay = currentDay;
        }
        
        // Check if bypass is active for visual adjustments
        if (this.lightingManager.isBypassActive()) {
            // Adjust rendering for high-speed mode
            this.useSimplifiedRendering();
        }
    }
}
```

---

## Keyboard Controls

### Time Speed Controls

| Key | Action | Speed Change |
|-----|--------|--------------|
| **Space** | Pause/Resume | Toggle between 0x and previous speed |
| **+** or **=** | Increase Speed | Cycle to next faster preset |
| **-** or **_** | Decrease Speed | Cycle to next slower preset |
| **0** | Pause | Set to 0x (pause preset) |
| **1** | Normal Speed | Set to 0.5x (normal preset) |
| **2** | Fast Speed | Set to 5.0x (veryFast preset, bypass activates) |
| **3** | Ultra-Fast Speed | Set to 10.0x (veryVeryFast preset, bypass active) |

### Control Examples

**Scenario: Observing Plant Growth**
1. Start at slow (0.1x) - default speed
2. Press `1` - switch to normal (0.5x) for faster observation
3. Press `2` - switch to veryFast (5x) - bypass activates, lighting locks bright
4. Press `3` - switch to ultra-fast (10x) - see multiple generations quickly
5. Press `1` - return to normal, lighting cycle resumes

**Scenario: Testing Weather Effects**
1. Press `2` for veryFast (5x)
2. Press `R` to toggle rain
3. **Observe:** Scene dims with rain despite bypass (weather preserved)
4. Press `W` to change weather
5. **Observe:** Weather effects still visible at high speed

---

## UI Integration

### Time System Display

**Location**: Top-left UI panel  
**Elements**:
- **Day**: Current game day (integer)
- **Time**: HH:MM format (24-hour clock)
- **Phase**: Current lighting phase name
- **Speed**: Time scale multiplier
- **Bypass Indicator**: Shows `[BYPASS] (Speed: Xx)` when active

**Visual Style:**
- Phase name displayed in golden color (`#f4d03f`)
- Bypass tag in same color for consistency
- Automatic capitalization and spacing ("earlyMorning" → "Early Morning")
- Updates every frame for real-time accuracy

### UI Display Examples

**At 1x Speed (Normal Lighting):**
```
Day: 15
Time: 14:30
Phase: Afternoon
Speed: 1.0x
```

**At 5x Speed (Bypass Active):**
```
Day: 15
Time: 14:30
Phase: Midday (bypassed) [BYPASS] (Speed: 5x)
Speed: 5.0x
```

**At 10x Speed (Bypass Active, Rainy):**
```
Day: 15
Time: 02:45
Phase: Midday (bypassed) [BYPASS] (Speed: 10x)
Speed: 10.0x
Weather: Rainy ☁☂
```

### HTML Structure

```html
<div id="time-ui">
    <h3>Time System</h3>
    <div class="time-info">
        <span class="time-label">Day:</span>
        <span class="time-value" id="current-day">0</span>
    </div>
    <div class="time-info">
        <span class="time-label">Time:</span>
        <span class="time-value" id="time-of-day">00:00</span>
    </div>
    <div class="time-info">
        <span class="time-label">Phase:</span>
        <span class="time-value" id="lighting-phase">Night</span>
    </div>
    <div class="time-info">
        <span class="time-label">Speed:</span>
        <span class="time-value" id="time-scale">1.0x</span>
    </div>
</div>
```

---

## Testing

### Validation Workflow

1. **Run Automated Test**
   ```bash
   npm run test:time-speed-10x
   ```
   Expected: PASS with all 7 presets validated

2. **Visual Inspection**
   ```bash
   # Start server
   python -m http.server 8081
   
   # Open http://localhost:8081
   # Test each speed preset:
   # - Press 0, 1, 2, 3 to switch presets
   # - Observe lighting behavior
   # - Check UI display accuracy
   ```

3. **Bypass Verification**
   ```javascript
   // Open browser console
   
   // Set to 10x speed
   engine.timeManager.setTimeScale('veryVeryFast');
   
   // Check bypass is active
   console.log(engine.lightingManager.isBypassActive()); // true
   
   // Check phase name
   console.log(engine.lightingManager.getCurrentPhase()); // "midday (bypassed)"
   
   // Return to 1x speed
   engine.timeManager.setTimeScale('fast');
   
   // Check bypass is inactive
   console.log(engine.lightingManager.isBypassActive()); // false
   ```

### Expected Results

**Functional Validation:**
- ✅ All 7 speed presets functional
- ✅ Time advances correctly at each speed
- ✅ Bypass activates at ≥5x speed
- ✅ Bypass deactivates at <5x speed
- ✅ Weather effects preserved during bypass
- ✅ UI displays correct bypass indicator

**Performance Validation:**
- ✅ FPS maintains ≥30 at all speeds
- ✅ No console errors during speed changes
- ✅ Smooth transitions between speeds
- ✅ No memory leaks during extended high-speed runs

**Visual Validation:**
- ✅ Lighting locked to bright at ≥5x
- ✅ Time-of-day cycle visible at <5x
- ✅ Weather dimming/tint visible at all speeds
- ✅ Bypass indicator shown at ≥5x
- ✅ Smooth return to normal lighting when reducing speed

### Test Files

- **tests/time-speed-10x-integration.spec.js** - Comprehensive speed preset testing
- **tests/lighting-bypass-validation.spec.js** - Lighting bypass validation
- **tests/milestone3-visual-validation.spec.js** - UI indicator screenshots

---

## Implementation Details

### TimeManager Core Methods

**`update(deltaTime)`**
```javascript
update(deltaTime) {
    if (this.timeScale === 0) return; // Paused
    
    // Calculate game time progression
    const gameTimeIncrement = (deltaTime * this.timeScale) / this.realSecondsPerGameDay;
    this.currentGameTime += gameTimeIncrement;
    
    // Update day and hour
    this.currentDay = Math.floor(this.currentGameTime);
    this.hourOfDay = (this.currentGameTime % 1) * 24;
}
```

**`setTimeScale(presetOrValue)`**
```javascript
setTimeScale(presetOrValue) {
    // Check if preset name
    if (typeof presetOrValue === 'string') {
        const preset = this.presets[presetOrValue];
        if (preset !== undefined) {
            this.timeScale = preset;
        } else {
            console.warn(`Unknown preset: ${presetOrValue}`);
        }
    } else {
        // Direct numeric value
        this.timeScale = Math.max(0, presetOrValue);
    }
    
    // Store for pause/resume
    if (this.timeScale > 0) {
        this.lastNonZeroScale = this.timeScale;
    }
}
```

### LightingManager Integration

**`shouldUpdateTimeOfDay()`**
```javascript
shouldUpdateTimeOfDay() {
    if (!this.enabled) return false;
    const timeScale = this.timeManager.getTimeScale();
    return timeScale < 5.0; // Bypass at 5x and 10x
}
```

**Modified `update(deltaTime)`**
```javascript
update(deltaTime) {
    if (!this.enabled) return;
    
    let baseColor, baseBrightness;
    
    // Check if we should update time-of-day
    if (this.shouldUpdateTimeOfDay()) {
        // Normal: Calculate time-of-day phase
        const hour = this.timeManager.getHourOfDay();
        const phase = this.findCurrentPhase(hour);
        baseColor = this.interpolatePhaseColor(phase, hour);
        baseBrightness = this.interpolatePhaseBrightness(phase, hour);
        this.currentPhase = phase.name;
    } else {
        // Bypass: Lock to full brightness
        baseColor = [1.0, 1.0, 1.0];
        baseBrightness = 1.0;
        this.currentPhase = "midday (bypassed)";
    }
    
    // ALWAYS apply weather modifier
    const weatherMod = this._calculateWeatherModifier();
    
    // Combine base and weather
    const finalColor = [
        baseColor[0] * weatherMod.colorTint[0] * weatherMod.brightnessMultiplier,
        baseColor[1] * weatherMod.colorTint[1] * weatherMod.brightnessMultiplier,
        baseColor[2] * weatherMod.colorTint[2] * weatherMod.brightnessMultiplier,
        1.0
    ];
    
    // Smooth transition to target
    this.ambientColor = this.lerpColors(this.ambientColor, finalColor, 0.15);
    this.ambientBrightness = this.lerpBrightness(this.ambientBrightness, baseBrightness * weatherMod.brightnessMultiplier, 0.15);
}
```

---

## Performance Considerations

### Time Update Overhead

- **Per-frame cost**: <0.1ms (time calculation)
- **Impact on FPS**: Negligible (< 1 FPS difference)
- **Memory usage**: ~1KB (manager state)

### Lighting Bypass Optimization

**Without Bypass (10x speed):**
- Phase interpolation: ~0.05ms
- Smoothing calculations: ~0.03ms
- FPS: 37

**With Bypass (10x speed):**
- Phase interpolation: SKIPPED
- Smoothing calculations: Reduced
- FPS: 39
- **Savings**: ~0.08ms per frame, 5% FPS improvement

### Bottleneck Analysis

At high speeds (10x), the primary bottleneck is **NOT** time system overhead but:
1. Plant growth updates (many entities)
2. Soil cycling calculations
3. Weather particle rendering

Time system remains efficient across all speed ranges.

---

## Troubleshooting

### Common Issues

#### Issue: Lighting flashing at 10x speed
**Symptoms:** Rapid day/night cycle visible at high speed  
**Cause:** Bypass not activating (config or code issue)  
**Solution:**
```javascript
// Check bypass is active
const lm = engine.lightingManager;
console.log(lm.isBypassActive()); // Should be true at 10x

// Check time scale
console.log(engine.timeManager.getTimeScale()); // Should be 10.0

// Verify shouldUpdateTimeOfDay returns false
console.log(lm.shouldUpdateTimeOfDay()); // Should be false
```

#### Issue: Time not advancing
**Symptoms:** Day and time remain constant  
**Cause:** Time scale set to 0 (paused) or TimeManager not updating  
**Solution:**
```javascript
// Check time scale
console.log(engine.timeManager.getTimeScale()); // Should be > 0

// Manually set to fast
engine.timeManager.setTimeScale('fast');

// Verify update is being called
console.log('TimeManager update called:', engine.timeManager.currentDay);
```

#### Issue: Weather effects not visible during bypass
**Symptoms:** Scene always fully bright at 10x, even during rain  
**Cause:** Weather modifier calculation skipped (incorrect implementation)  
**Solution:** Verify weather modifier is ALWAYS applied:
```javascript
// Check weather state
console.log(engine.weatherManager.getCurrentWeather()); // Should show current weather

// Check brightness during rain
engine.timeManager.setTimeScale('veryVeryFast'); // 10x
engine.weatherManager.setState('rainy');
console.log(engine.lightingManager.getAmbientBrightness()); // Should be ~0.6 (dimmed)
```

#### Issue: Bypass indicator not showing in UI
**Symptoms:** Phase name correct but no [BYPASS] tag  
**Cause:** UI update code not checking `isBypassActive()`  
**Solution:** Verify UI update in `main_graphics.js`:
```javascript
if (lightingPhaseElement && this.lightingManager) {
    const phase = this.lightingManager.getCurrentPhase();
    const bypassActive = this.lightingManager.isBypassActive();
    const timeScale = this.timeManager.getTimeScale();
    
    let phaseDisplay = phase.charAt(0).toUpperCase() + phase.slice(1);
    
    if (bypassActive) {
        phaseDisplay += ` [BYPASS] (Speed: ${timeScale}x)`;
    }
    
    lightingPhaseElement.textContent = phaseDisplay;
}
```

---

## Future Enhancements

### Potential Features

1. **Custom Speed Slider**
   - Allow continuous speed adjustment (0-10x)
   - Visual slider in UI with labeled presets
   - Configurable bypass threshold (not hardcoded to 5x)

2. **Speed Change Animations**
   - Brief UI notification: "Time accelerating to 10x"
   - Smooth brightness transition when entering/exiting bypass
   - Visual effect (clock spinning, particles speeding up)

3. **Speed Profiles**
   - Save/load custom speed presets
   - Per-scenario speed recommendations
   - Tutorial mode with automatic speed changes

4. **Time Manipulation Commands**
   - Skip to next day/week/month
   - Jump to specific time of day (useful for testing)
   - Reverse time (undo ecosystem changes)

5. **Performance-Adaptive Scaling**
   - Automatically reduce speed if FPS drops below threshold
   - Dynamic preset adjustment based on entity count
   - User notification: "Speed reduced to maintain performance"

6. **Advanced Bypass Options**
   - Configurable bypass threshold in config.json
   - Partial bypass (dimmed but not full cycle)
   - Seasonal bypass variants (winter-toned vs summer-bright)

---

## Related Documentation

- **[Lighting System](lighting-system.md)** - Day/night cycle and lighting bypass implementation
- **[Weather System](weather-system.md)** - Weather state management and effects
- **[Plant Generation System](plant-generation-system.md)** - Time-based growth progression
- **[Technical Reference](../architecture/technical-reference.md)** - Manager architecture patterns

---

[Back to Index](../INDEX.md) | [Features](./)
