# Lighting Flicker Fix in Fast Time Mode

**Date:** 2025-12-01  
**Type:** Bug Fix  
**Component:** LightingManager  
**Issue:** Day/night lighting flickered noticeably when in Fast time mode (5x or 20x speed)

## Problem Description

When the player set the time scale to Fast (5x) or Very Fast (20x), the day/night lighting cycle would flicker visibly. The lighting appeared to "jump" between different brightness levels and colors rather than transitioning smoothly.

### Root Cause

The `LightingManager.update()` method calculated lighting based directly on the current hour of day from `TimeManager.getHourOfDay()`. When time scale was set to 20x, the hour value advanced 20 times faster, causing:

1. **Rapid phase transitions:** The lighting phases changed every few frames
2. **No temporal smoothing:** Each update immediately set the ambient color/brightness to the exact calculated value
3. **Frame-to-frame discontinuity:** Large jumps in lighting values between consecutive frames

**Before Fix Flow:**
```
Frame N:   hour = 12.00 → calculate light → set ambient = [1.0, 1.0, 1.0]
Frame N+1: hour = 12.03 → calculate light → set ambient = [0.98, 0.98, 0.98]
Frame N+2: hour = 12.06 → calculate light → set ambient = [0.96, 0.96, 0.96]
                                            ↑ visible flicker
```

With 20x time scale at 60 FPS, the hour advanced by **~0.033 hours per frame**, causing noticeable lighting changes every frame.

## Solution

Implemented **exponential smoothing** (temporal low-pass filter) to gradually transition the current lighting state toward the target lighting state, regardless of how fast game time is advancing.

### Technical Implementation

Added two key changes to `LightingManager`:

#### 1. Separate Current vs Target State

```javascript
// Constructor additions
this.smoothingFactor = this.config.smoothingFactor || 0.15;

// Target lighting state (for smooth transitions)
this.targetAmbientColor = [1, 1, 1];
this.targetBrightness = 1.0;
```

#### 2. Exponential Smoothing in Update Loop

```javascript
// Calculate target values (instant based on game time)
this.targetAmbientColor = this._applyWeatherModifier(baseColor, weatherMod);
this.targetBrightness = baseBrightness * weatherMod.brightnessMultiplier;

// Smooth transition from current to target
const smoothing = this.smoothingFactor; // 0.15 = 15% blend per frame

// Smooth color transition (RGB)
for (let i = 0; i < 3; i++) {
    this.currentAmbientColor[i] += (this.targetAmbientColor[i] - this.currentAmbientColor[i]) * smoothing;
}

// Smooth brightness transition
this.currentBrightness += (this.targetBrightness - this.currentBrightness) * smoothing;
```

**After Fix Flow:**
```
Frame N:   target = [1.0, 1.0, 1.0], current = [1.0, 1.0, 1.0] → render [1.0, 1.0, 1.0]
Frame N+1: target = [0.96, 0.96, 0.96], current → [0.994, 0.994, 0.994] (smooth step)
Frame N+2: target = [0.92, 0.92, 0.92], current → [0.988, 0.988, 0.988] (smooth step)
                                                  ↑ no visible flicker
```

The smoothing factor of **0.15** means each frame blends 15% toward the target and retains 85% of the current value, creating smooth transitions.

### Smoothing Factor Tuning

- **Higher values (0.3-0.5):** More responsive, follows game time closely but may still show minor flicker
- **Lower values (0.05-0.1):** Very smooth but may lag noticeably behind game time
- **Optimal value (0.15):** Balances smoothness and responsiveness for 60 FPS gameplay

At 60 FPS with smoothing factor 0.15, the lighting reaches 95% of target value in approximately **20 frames (~0.33 seconds real time)**.

## Changes Made

### File: `js/core/lighting_manager.js`

**Lines 30-52 (Constructor):**
- Added `this.smoothingFactor` configuration (default: 0.15)
- Added `this.targetAmbientColor` and `this.targetBrightness` for target state tracking

**Lines 130-178 (update method):**
- Separated target calculation from current state
- Implemented exponential smoothing for RGB color components
- Implemented exponential smoothing for brightness
- Updated JSDoc to mention temporal smoothing

## Validation

### Automated Test
```bash
npm run verify
```

**Result:** PASS
- Console Errors: 0
- FPS: 42 (target: 30+)
- Visual diff: 18.5% (within threshold)
- WebGL: ok

### Manual Test: Fast Time Mode
1. Start game at `http://localhost:8081`
2. Press `.` key repeatedly to increase time scale to Very Fast (20x)
3. Observe day/night cycle transitions
4. **Expected:** Smooth, gradual lighting changes without visible flickering
5. **Actual:** ✅ Works! Lighting transitions smoothly even at 20x speed

### Visual Comparison

**Before Fix (20x time scale):**
- Noticeable flicker during sunrise/sunset
- Jarring brightness jumps
- Distracting visual artifacts

**After Fix (20x time scale):**
- Smooth, continuous lighting transitions
- No visible flicker
- Pleasant day/night cycle even at high speeds

## Impact

- **Severity:** Medium (visual quality issue, affects user experience but not gameplay)
- **User Experience:** Significantly improved - fast time mode is now pleasant to watch
- **Performance:** Negligible impact - added 3 floating point operations per frame per RGB channel
- **Compatibility:** No breaking changes - smoothing is always enabled but can be configured via `config.json`

## Configuration

The smoothing factor can be adjusted in `config.json`:

```json
{
  "world": {
    "lighting": {
      "smoothingFactor": 0.15
    }
  }
}
```

- **0.0:** No smoothing (original behavior, will flicker)
- **0.05:** Very smooth, slight lag
- **0.15:** Default, balanced
- **0.30:** More responsive, minimal lag
- **1.0:** Instant (no smoothing)

## Related Files

- **Primary:** `js/core/lighting_manager.js` (update method + constructor)
- **Config:** `config.json` (optional smoothingFactor configuration)
- **Related Systems:** TimeManager (provides hour of day), RenderSystem (consumes ambient light)

## Future Considerations

1. **Adaptive smoothing:** Could adjust smoothing factor based on current time scale (more smoothing at higher speeds)
2. **Delta-time aware smoothing:** Use actual deltaTime instead of fixed smoothing factor for frame-rate independence
3. **Configurable per phase:** Different smoothing for different transitions (e.g., more smoothing during sunrise/sunset)
4. **Visual effects:** Add subtle glow/bloom effects during golden hour to enhance lighting transitions

## Technical Notes

### Exponential Smoothing Formula

```
newValue = currentValue + (targetValue - currentValue) * smoothingFactor
```

This is a first-order low-pass filter with:
- **Time constant (τ):** ~6.67 frames at smoothing = 0.15
- **95% settling time:** ~20 frames (~0.33 seconds at 60 FPS)
- **Cutoff frequency:** ~1.5 Hz at 60 FPS

The filter effectively "averages out" rapid changes in the target lighting while still allowing smooth tracking of the actual day/night cycle.

## Testing Checklist

- [x] Automated verification passes (npm run verify)
- [x] No console errors introduced
- [x] FPS maintained (42 FPS)
- [x] Manual testing at 1x, 5x, 20x time scales
- [x] Smooth transitions confirmed visually
- [x] No lag or delay noticeable in normal (1x) mode
- [x] Sunrise/sunset transitions smooth at all speeds
- [x] Documentation updated (this devlog)

## Commit Message

```
Fix lighting flicker in fast time mode with exponential smoothing

Add temporal smoothing to LightingManager to prevent flickering when
time scale is set to Fast (5x) or Very Fast (20x). Uses exponential
smoothing (0.15 factor) to gradually transition current lighting state
toward target, creating smooth transitions regardless of time scale.

Configurable via config.json "smoothingFactor" (default: 0.15).
Validated with npm run verify (PASS) and manual testing at 20x speed.
```
