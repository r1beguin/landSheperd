# Milestone 4 Test Results Summary

## Test Execution: 100-Day Ecosystem Simulation

**Date:** December 5, 2025  
**Test File:** `tests/ecosystem-balance.spec.js`  
**Command:** `npm test` with `TEST_BALANCE=true`  
**Duration:** ~30 seconds

---

## Test Results

### Simulation Overview
- **Game Days:** 100
- **Sampling Interval:** 10 days
- **Initial Plants:** 5 (attempted 8, 3 spawn failures due to water/obstacles)
- **Final Plants:** 6
- **Population Change:** +1 plant (+20%)

### Nutrient Trends (Average Across All Soil)

| Nutrient | Day 0 | Day 100 | Change | % Change |
|----------|-------|---------|--------|----------|
| Nitrogen | 50.2 | 50.0 | -0.2 | -0.4% |
| Phosphorus | 50.0 | 49.8 | -0.2 | -0.4% |
| Potassium | 50.0 | 49.9 | -0.1 | -0.2% |
| Organic Matter | 50.0 | 50.0 | 0.0 | 0.0% |
| Fertility | 50.1 | 49.9 | -0.2 | -0.4% |

### Performance
- **Weather System:** Working (transitions: sunny → cloudy → rainy observed)
- **Screenshots:** Generated at days 0, 50, 100 with nutrient overlays
- **Metrics Files:** CSV and JSON saved successfully
- **FPS:** Not measured in this test variant

---

## Analysis

### ✅ Positive Indicators

1. **System Stability**
   - Nutrients remain nearly constant over 100 days
   - No catastrophic depletion
   - Population stable with slight growth
   - No crashes or errors

2. **Nutrient Cycling**
   - All nutrients stay above critical thresholds
   - N: 50.0 (min threshold: 10) ✓
   - P: 49.8 (min threshold: 8) ✓
   - K: 49.9 (min threshold: 8) ✓
   - OM: 50.0 (min threshold: 5) ✓

3. **Weather Effects**
   - Weather system transitioning properly
   - Rain events observed
   - No system crashes during weather changes

### ⚠️ Observations

1. **Very Low Nutrient Consumption**
   - Only 0.2-0.4% depletion over 100 days
   - With 5-6 plants, this seems extremely conservative
   - Suggests daily consumption rates may be too low OR
   - Population is too small to show significant impact

2. **Population Growth Limited**
   - Started with 5 plants, ended with 6
   - Peak was 15 plants (day 40), then declined to 6
   - This is a small sample size for ecosystem validation
   - Natural terrain generation may have limited viable spawn locations

3. **Test Expectations Mismatch**
   - Old test expects "nitrogen preference" behavior (nitrogen-loving monoculture)
   - Current system is multi-species with balanced consumption
   - Test criteria need updating for new multi-species approach

---

## Interpretation

### Current System Behavior

The ecosystem is **VERY STABLE** - perhaps too stable for a 100-day test:

- **Decomposition** is working (OM stayed constant, suggesting breakdown and regeneration balanced)
- **Daily consumption** is minimal compared to soil nutrient pools (50+ units)
- **Weather effects** are subtle over this timeframe
- **Reproduction** occurred but was limited by available space/nutrients

### Scale Issues

The test reveals that **100 days is too short** to see meaningful trends with current parameters:

- At 0.5 N/day consumption rate × 0.5 stage multiplier = 0.25 N/day per plant
- With ~6 plants average: 1.5 N/day consumed across entire grid
- Grid has 2500 cells × 50 avg N = 125,000 total N
- **It would take ~83,000 days to deplete completely** at current rates!

This explains why we see almost no change in 100 days.

---

## Recommendations

### Option 1: Increase Daily Consumption Rates (Recommended)

To see meaningful ecosystem dynamics in 100-500 days, consumption rates need to be higher:

**Current:**
```json
"baseDailyRate": {
    "nitrogen": 0.5,
    "phosphorus": 0.3,
    "potassium": 0.2,
    "organicMatter": 0.1
}
```

**Suggested (5x increase):**
```json
"baseDailyRate": {
    "nitrogen": 2.5,      // 5x
    "phosphorus": 1.5,    // 5x
    "potassium": 1.0,     // 5x
    "organicMatter": 0.5  // 5x
}
```

This would create noticeable nutrient depletion in 100-200 days, allowing validation of:
- Decomposition regeneration
- Plant starvation and withering
- Reproduction success in rich vs depleted soil
- Weather-driven recovery cycles

### Option 2: Much Longer Simulation (Not Recommended)

Run 10,000+ day simulations to see effects at current rates. This would:
- Take very long to execute
- Require different sampling strategy
- May reveal other issues (memory leaks, drift)
- Not practical for iterative development

### Option 3: Increase Initial Plant Population

Spawn 50-100 plants initially to stress-test the system:
- More consumption pressure
- Faster nutrient depletion
- Better validation of regeneration
- But: Less realistic to natural generation

---

## Recommended Next Steps

### 1. Update Consumption Rates (Priority 1)

```bash
# Edit config.json
# Increase baseDailyRate by 5x
# Save and test
```

### 2. Re-run 100-Day Test

```bash
npm test tests/ecosystem-balance.spec.js
```

**Expected Results After Tuning:**
- Nitrogen depletes to 35-40 (20-30% depletion)
- Phosphorus depletes to 40-45 (10-20% depletion)
- Some plants wither from starvation
- Some plants reproduce in rich soil
- Weather provides visible regeneration cycles
- OM accumulates from dead plants, then breaks down

### 3. Validate 500-Day Simulation

Once 100-day shows meaningful dynamics:

```javascript
// Edit tests/ecosystem-balance.spec.js
const SIMULATION_DAYS = 500;
const SAMPLING_INTERVAL = 10;
```

**Expected Results:**
- Multiple reproduction cycles
- Clear spatial patterns (rich vs depleted zones)
- Population fluctuations (growth → depletion → recovery)
- All three species present and viable
- Nutrients cycling between 15-70 range

### 4. Final 2000-Day Validation

```javascript
const SIMULATION_DAYS = 2000;
const SAMPLING_INTERVAL = 20;
```

**Expected Results:**
- Long-term equilibrium established
- Population stable with natural fluctuations (±30%)
- No species extinction
- No nutrient collapse
- Performance stable (FPS ≥30)

---

## Test Infrastructure Status

### ✅ Working
- Test execution and automation
- Metrics collection (population, nutrients, weather)
- Screenshot capture with nutrient overlays
- CSV and JSON data export
- Time advancement (deterministic)
- Weather system integration

### ⏳ Needs Attention
- Update test expectations for multi-species (not monoculture)
- Tune consumption rates for meaningful 100-day dynamics
- Add species-specific population tracking
- Add FPS measurement
- Increase initial plant spawning success rate

---

## Conclusion

**Milestone 4 Test Infrastructure:** ✅ **COMPLETE AND FUNCTIONAL**

**Ecosystem Balance:** ⚠️ **TOO STABLE** (needs parameter tuning)

**Recommended Action:** **Increase daily consumption rates by 5x** and re-test

The test successfully demonstrates that:
1. The system doesn't crash over 100 days ✓
2. Decomposition and weather systems work ✓
3. Nutrients remain stable (no collapse) ✓
4. Population can grow and sustain ✓

However, the dynamics are too slow to validate proper cycling. With tuned parameters, this test infrastructure is ready to validate:
- Nutrient depletion and regeneration
- Plant starvation and recovery
- Reproduction success criteria
- Weather-driven cycles
- Multi-species balance
- Long-term stability (500-2000 days)

---

## Files Generated

```
test-results/ecosystem-balance/
├── ecosystem-metrics.csv           # Time-series data
├── ecosystem-metrics.json          # Structured metrics
├── analysis.json                   # Depletion analysis
├── weather-impact.json             # Weather test data
├── day-000-nitrogen.png            # Initial nitrogen overlay
├── day-000-phosphorus.png          # Initial phosphorus overlay
├── day-000-potassium.png           # Initial potassium overlay
├── day-000-organicMatter.png       # Initial OM overlay
├── day-050-*.png                   # Mid-simulation overlays
└── day-100-*.png                   # Final overlays
```

**Review these files to see spatial nutrient distribution and changes over time.**

---

**Status:** ✅ MILESTONE 4 TEST INFRASTRUCTURE COMPLETE  
**Next:** Tune parameters → Re-run → Validate long-term balance
