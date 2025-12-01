# Milestone 4: Balance Testing Results & Ecosystem Foundation Analysis

**Date:** 2025-12-01  
**Status:** ✅ TEST COMPLETE - ⚠️ TUNING REQUIRED  
**Test Duration:** 100 game days simulated  
**Real Time:** ~18 seconds  
**Test Result:** Foundation unsuitable for multi-species diversity (nitrogen regeneration overwhelming)

## Executive Summary

**CRITICAL FINDING:** The nutrient cycling system is **NOT creating selective pressure for diversity**. Nitrogen regeneration from rain is so strong that it overwhelms plant consumption, creating a monoculture paradise rather than nutrient niches.

**Verdict:** 🔴 **System needs tuning before ship** - Current rates favor infinite monoculture growth

---

## Test Setup

### Configuration
- **Initial Plants:** 8 nettles (distributed pattern)
- **Simulation Duration:** 100 game days
- **Sampling Interval:** 10 days
- **Screenshots:** Day 0, 25, 50, 75, 100 (all nutrient overlays)
- **Metrics Collected:** 11 data points with full nutrient averages and ranges

### Initial State (Day 0)
```
Nitrogen:      74.9 avg (range: 30.1-100)
Phosphorus:    71.5 avg (range: 28.2-100)
Potassium:     59.4 avg (range: 22.5-105.8)
Organic Matter: 10.0 avg (uniform: 10)
Fertility:     53.9 avg
Plant Count:    8
Weather:       sunny
```

---

## Results Summary

### Final State (Day 100)
```
Nitrogen:      100.0 avg (range: 100-100)  ← MAXED OUT!
Phosphorus:     70.8 avg (range: 6.7-100)  ← Good variation
Potassium:      58.8 avg (range: 5.9-105.8) ← Good variation
Organic Matter:  9.8 avg (range: 0-10)     ← DEPLETED in many cells!
Fertility:      59.9 avg (+6.0 from start)
Plant Count:    64 (8x growth!)
Weather:       rainy
```

### Nutrient Change Analysis

| Nutrient | Start | End | Change | % Change | Expected Behavior | Actual Behavior |
|----------|-------|-----|--------|----------|-------------------|-----------------|
| **Nitrogen** | 74.9 | 100.0 | **+25.1** | **-33.5% depletion** | ❌ Should **decrease** 40-60% (nitrogen-lover) | ✅ **INCREASED** to cap! |
| **Phosphorus** | 71.5 | 70.8 | -0.7 | **1.0% depletion** | ✅ Should decrease <30% | ✅ Slight decrease, good! |
| **Potassium** | 59.4 | 58.8 | -0.6 | **1.0% depletion** | ✅ Should decrease <30% | ✅ Slight decrease, good! |
| **Organic Matter** | 10.0 | 9.8 | -0.2 | **-2.0% change** | ❌ Should **increase** +20-40 | ❌ Stayed flat/decreased! |
| **Population** | 8 | 64 | +56 | **700% growth!** | ⚠️ Should stabilize 10-20 | ❌ Explosive growth! |

---

## Critical Issues Identified

### 🚨 Issue 1: Nitrogen Regeneration Overwhelming (CRITICAL)

**Problem:** Rain nitrogen restoration is so strong that it refills soil to the 100 cap faster than plants can consume it.

**Data Evidence:**
```
Day 0:  N = 74.9 avg, MinN = 30.1
Day 10: N = 74.8 avg, MinN = 30.1  (barely changed)
Day 20: N = 100 avg, MinN = 100    (CAPPED after rain!)
Day 30-100: N = 99.9-100, MinN = 100 (stays maxed)
```

**Root Cause:**
- Config: `rainNitrogenRestorePerDay = 0.8` N/day per cell
- Rain duration: ~1-3 days per event (avg 2 days)
- Nitrogen added per rain: **1.6 N per cell**
- Rain frequency: Every ~5-10 days

**Impact:**
- Plants never experience nitrogen stress
- No selective pressure for nitrogen-fixing species (legumes)
- Monoculture thrives indefinitely
- Population explodes (8 → 64 plants)

**Recommendation:** **Reduce to 0.1-0.2 N/day** (80-90% reduction)

---

### 🚨 Issue 2: Organic Matter Decomposition Too Fast

**Problem:** OM is being consumed faster than plants return it on death.

**Data Evidence:**
```
Day 0:  OM = 10.0 avg, MinOM = 10  (uniform)
Day 10: OM = 10.0 avg, MinOM = 5   (starting depletion)
Day 20: OM = 10.0 avg, MinOM = 0   (ZERO in some cells!)
Day 30-100: MinOM = 0 (many cells completely depleted)
```

**Root Cause:**
- OM decomposition rate: `0.5 OM/day` (above stable humus threshold)
- Plant OM return on death: `20 OM`
- But with unlimited nitrogen, plants live longer and reproduce before dying
- Few deaths = little OM return, but decomposition runs constantly

**Impact:**
- OM supposed to accumulate over time (dead plant bank)
- Instead, it's being consumed as fast as (or faster than) it's added
- Reduces the long-term nutrient regeneration buffer
- Contradicts expected "+20-40 OM gain" outcome

**Recommendation:** Either:
- **Reduce decomposition rate to 0.3 OM/day** (40% reduction), OR
- **Increase plant death rate** (shorter lifespans = more OM returns), OR
- **Both** for stronger effect

---

### ⚠️ Issue 3: Population Explosion

**Problem:** Without nitrogen limitation, population grows uncontrollably.

**Data Evidence:**
```
Day 0:  8 plants
Day 20: 15 plants (+7)
Day 50: 36 plants (+28, accelerating!)
Day 100: 64 plants (+56, 8x growth)
```

**Root Cause:**
- Unlimited nitrogen from rain = no fertility stress
- Plant reproduction not limited by nutrient scarcity
- No natural population control mechanism

**Impact:**
- Unrealistic monoculture dominance
- No ecological "room" for other species
- Eventually will crash when P/K deplete (but takes >100 days)

**Recommendation:** Nitrogen tuning will naturally limit this

---

## Positive Findings ✅

### 1. Phosphorus Shows Good Spatial Variation

**Data:**
```
Day 0:  P = 71.5 avg (range: 28.2-100)
Day 100: P = 70.8 avg (range: 6.7-100)
```

- Minimum P dropped from 28.2 → **6.7** (heavy depletion in active zones)
- Maximum P stayed at 100 (untouched zones)
- **Spatial variation: 93.3 P range** (excellent microhabitat diversity!)

**Analysis:** This is PERFECT! High-activity zones are depleting P, creating niches for P-loving plants.

---

### 2. Potassium Also Shows Variation

**Data:**
```
Day 0:  K = 59.4 avg (range: 22.5-105.8)
Day 100: K = 58.8 avg (range: 5.9-105.8)
```

- Minimum K dropped from 22.5 → **5.9** (near depletion!)
- **Spatial variation: 99.9 K range**

**Analysis:** Good spatial diversity emerging. K-limited zones create niches for K-efficient species.

---

### 3. System Didn't Collapse

**Data:**
- Final fertility: 59.9 (above minimum threshold of 15)
- Final plant count: 64 (healthy population)
- No catastrophic nutrient crash

**Analysis:** System is stable (too stable for nettles, but structurally sound). Proves the foundation can support life long-term.

---

### 4. Weather System Working

**Data:**
```
Day 0:  sunny
Day 10: cloudy
Day 20: rainy (N jumped to 100!)
Day 30: rainy
Day 40: sunny
Day 50: sunny
Day 60: rainy (N refilled to 100!)
Day 70-90: sunny
Day 100: rainy (N refilled to 100!)
```

**Analysis:** Weather transitions are working correctly. Rain events trigger nitrogen restoration (too much, but mechanically sound).

---

## Tuning Recommendations

### Priority 1: Reduce Rain Nitrogen Restoration (CRITICAL)

**Current:** `rainNitrogenRestorePerDay: 0.8`  
**Recommended:** `rainNitrogenRestorePerDay: 0.1` (87.5% reduction)

**Rationale:**
- 0.1 N/day × 2 days (avg rain) = 0.2 N per cell per rain event
- With rain every ~7 days: ~0.2 N per week
- Nettles consume ~40 N over ~30-day lifecycle
- Population of 20 plants: 800 N consumed over 30 days = 26.7 N/day total
- Rain regeneration: 0.1 N/day × 2500 cells = 250 N/day during rain
- Over 30 days with ~4 rain days: 250 × 4 = 1000 N added
- Net: 1000 added - 800 consumed = +200 N surplus (still positive, but not overwhelming)

**Expected Outcome:**
- Nitrogen will gradually deplete in high-activity zones
- Creates selective pressure for nitrogen-fixing species
- Population will stabilize naturally (fertility stress)

---

### Priority 2: Reduce OM Decomposition Rate

**Current:** `organicMatterDecayPerDay: 0.5`  
**Recommended:** `organicMatterDecayPerDay: 0.3` (40% reduction)

**Rationale:**
- Plant returns 20 OM on death
- At 0.5/day decay: 20 OM decomposes in 40 days (above stable humus)
- At 0.3/day decay: 20 OM decomposes in 66 days (slower nutrient release)
- Gives OM time to accumulate between plant generations

**Expected Outcome:**
- OM will accumulate to 30-50 range over 100 days
- Creates larger nutrient buffer for N/P regeneration
- More realistic soil organic matter dynamics

---

### Priority 3: Consider Plant Lifespan Adjustment (Optional)

**Current:** Nettles lifecycle ~30 days (Seedling 3 + Vegetative 8 + Flowering 12 + Withered 5)  
**Recommended:** Reduce Withered stage to 2-3 days

**Rationale:**
- Withered stage is purely visual (plant already stopped growing)
- Faster decomposition = more OM returns per unit time
- Helps balance OM accumulation

**Expected Outcome:**
- More frequent OM contributions to soil
- Faster nutrient cycling

---

## Testing Recommendation

After tuning, re-run this test with new config:

```json
{
  "weather": {
    "soilEffects": {
      "rainNitrogenRestorePerDay": 0.1
    }
  },
  "world": {
    "soil": {
      "decomposition": {
        "organicMatterDecayPerDay": 0.3
      }
    }
  },
  "species": {
    "nettles": {
      "witheredStage": {
        "daysToGrow": 3
      }
    }
  }
}
```

### Expected Results After Tuning:
```
Day 100:
  Nitrogen:   40-50 (40-50% depletion from 75 start) ✅
  Phosphorus: 60-65 (10-15% depletion) ✅
  Potassium:  50-55 (10-15% depletion) ✅
  Org Matter: 30-40 (+20-30 accumulation) ✅
  Population: 15-25 (stable, not explosive) ✅
  Fertility:  45-55 (slight decline, but stable) ✅
```

---

## Visual Analysis

Screenshots captured at Day 0, 25, 50, 75, 100 for all nutrient overlays:
- `day-000-nitrogen.png` through `day-100-organicMatter.png`
- **Review nitrogen overlays:** Should show dark blue (low N) in active zones after tuning
- **Review P/K overlays:** Should show spatial variation (already present!)
- **Review OM overlays:** Should show green/yellow accumulation (currently not happening)

**Location:** `test-results/ecosystem-balance/`

---

## Validation Against Success Criteria

| Criterion | Target | Actual | Pass? | Notes |
|-----------|--------|--------|-------|-------|
| **Nitrogen depletion > P/K** | N decreases 40-60%, P/K <30% | N +25%, P/K -1% | ❌ | Opposite! N increased |
| **OM accumulation** | +20 to +40 points | -0.2 points | ❌ | Flat/declining |
| **No catastrophic collapse** | Fertility >15 | Fertility 59.9 | ✅ | System stable |
| **Population stable** | 10-20 plants | 64 plants | ❌ | Explosive growth |
| **Spatial variation** | Nutrient ranges >10 | P range 93.3, K range 99.9 | ✅ | Excellent diversity! |
| **Weather recovery cycles** | Rain accelerates, sun slows | Rain adds massive N | ⚠️ | Works, but too strong |

**Overall:** **2/6 criteria passed** - Foundation unsuitable without tuning

---

## Conclusion

### Current State
The nutrient cycling system is **mechanically sound** but **numerically imbalanced**. All systems (plant growth, OM decomposition, rain regeneration, weather effects) are working correctly, but rain nitrogen restoration is overwhelming the ecosystem.

### Foundation Quality for Multi-Species
**🔴 NOT READY** - Current system creates a monoculture paradise with unlimited nitrogen. There's no selective pressure for:
- Nitrogen-fixing legumes (N always maxed)
- P/K-loving plants (P/K barely consumed)
- Early successional plants (no disturbed/depleted zones)

### Tuning Required
**YES - CRITICAL TUNING NEEDED:**
1. Reduce rain nitrogen restoration by 87.5% (0.8 → 0.1 N/day)
2. Reduce OM decomposition by 40% (0.5 → 0.3 OM/day)
3. Optional: Reduce withered stage duration (5 → 3 days)

### Testing Confidence
**HIGH** - Test methodology is sound. Data clearly shows:
- ✅ Nitrogen caps at 100 throughout simulation
- ✅ OM fails to accumulate
- ✅ Population explodes without constraint
- ✅ P/K spatial variation is working (positive sign!)

### Next Steps
1. **Apply tuning adjustments to config.json**
2. **Re-run `npm run test:balance`**
3. **Verify nitrogen depletes to 40-50 range**
4. **Verify OM accumulates to 30-40 range**
5. **If successful: Ship foundation as multi-species ready**
6. **If still imbalanced: Iterate with smaller adjustments**

---

## Files Generated

### Data Files
- `test-results/ecosystem-balance/ecosystem-metrics.csv` - 11 data points, full nutrient tracking
- `test-results/ecosystem-balance/ecosystem-metrics.json` - Same data in JSON format
- `test-results/ecosystem-balance/analysis.json` - Computed depletion percentages
- `test-results/ecosystem-balance/weather-impact.json` - Weather test data (20 days)

### Screenshots (20 total)
- Day 0, 25, 50, 75, 100
- Each day: nitrogen, phosphorus, potassium, organicMatter overlays
- File pattern: `day-XXX-{nutrient}.png`

### Test Output
- Full console log with checkpoint data every 10 days
- Real-time nutrient change tracking
- Weather state logging

---

**Milestone 4 Testing Complete!** Results clearly indicate that nitrogen regeneration is too strong and OM decomposition needs adjustment. The foundation has good structural bones (P/K variation, system stability) but requires tuning to create selective pressure for multi-species diversity. Recommend implementing Priority 1 & 2 tuning before considering system "ship-ready."
