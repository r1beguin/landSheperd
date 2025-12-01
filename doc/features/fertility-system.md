# Fertility System Explained

## How Fertility is Calculated

### The Formula
**Fertility = (N + P + K + OM) / 4**

Where:
- **N** = Nitrogen (0-100)
- **P** = Phosphorus (0-100)
- **K** = Potassium (0-100)
- **OM** = Organic Matter (0-100)

Fertility is the **simple average** of these four soil properties, resulting in a value between 0-100.

### Example Calculations

#### Example 1: Rich Soil
```
N = 70, P = 65, K = 68, OM = 72
Fertility = (70 + 65 + 68 + 72) / 4 = 275 / 4 = 68.75
```
**Result:** Fertility 68.75 (Dark brown soil, highly productive)

#### Example 2: Moderate Soil
```
N = 40, P = 35, K = 42, OM = 38
Fertility = (40 + 35 + 42 + 38) / 4 = 155 / 4 = 38.75
```
**Result:** Fertility 38.75 (Medium brown soil, moderate productivity)

#### Example 3: Depleted Soil
```
N = 15, P = 12, K = 18, OM = 10
Fertility = (15 + 12 + 18 + 10) / 4 = 55 / 4 = 13.75
```
**Result:** Fertility 13.75 (Light brown soil, poor productivity)

---

## Stinging Nettle Lifecycle Impact

### Nutrient Consumption (Full Lifecycle)
A single nettle consumes nutrients across three growth stages:

| Stage | N | P | K | OM | Total |
|-------|---|---|---|----|----|
| Seedling (Day 0-3) | 5 | 3 | 2 | 1 | 11 |
| Vegetative (Day 3-10) | 15 | 10 | 8 | 5 | 38 |
| Flowering (Day 10-20) | 20 | 15 | 12 | 8 | 55 |
| **TOTAL CONSUMED** | **40** | **28** | **22** | **14** | **104** |

### Nutrient Return (Decomposition)
After withering (Day 20-25), the plant decomposes and returns:

| Nutrient | Returned | % Recovered |
|----------|----------|-------------|
| Nitrogen (N) | 8 | 20% |
| Phosphorus (P) | 5 | 18% |
| Potassium (K) | 4 | 18% |
| Organic Matter (OM) | 20 | 143% |
| **TOTAL RETURNED** | **37** | **36%** |

**Note:** OM return (20) exceeds consumption (14), creating a net +6 OM gain. This accumulated OM slowly decomposes into nitrogen and phosphorus through the Localized Decomposition System (see below).

### Localized Organic Matter Decomposition

**New System (Dec 2025):** Organic matter now undergoes realistic, spatially-aware decomposition:

#### How It Works
- OM decomposes ONLY in soil cells with recent plant activity (not grid-wide)
- When a plant dies, it marks its location + 1-cell radius for "active decomposition"
- Active cells decompose OM at 0.3 per game day
- Released nutrients: 40% Nitrogen, 30% Phosphorus
- Cells remain active for 30 game days after last plant interaction

#### Spatial Nutrient Dynamics
This creates three distinct zones:

1. **Depleted Zones** (around dead plants) - Nitrogen exhausted, high OM accumulated
2. **Moderate Zones** (edges of plant clusters) - Mixed nutrient availability
3. **Pristine Zones** (untouched soil) - Original nutrient composition preserved

#### Nutrient Cycling Example
```
Plant Death (instant):
  → Soil receives 8N, 5P, 4K, 20OM

OM Decomposition (local, over 20 days):
  → 20 OM × 0.3/day × 0.4 ratio = ~2.4N released
  → 20 OM × 0.3/day × 0.3 ratio = ~1.8P released

Total Local Return:
  → 8N (instant) + 2.4N (decomp) = 10.4N out of 40N consumed
  → 26% nitrogen recovery creates gradual depletion pressure
```

#### Multi-Species Foundation
This spatial system enables ecosystem diversity:
- **N-depleted zones** (N: 0-20) → Ideal for nitrogen-fixing legumes
- **P-rich zones** (P: 50-100) → Ideal for flowering plants
- **Pristine zones** (N: 50-100) → Ideal for nitrogen-loving pioneers

See `doc/devlogs/2025-12/2025-12-01-organic-matter-system-complete.md` for complete technical details.

### Net Impact Per Plant
**Net Loss:** 104 - 37 = **67 nutrient points**

Breaking it down:
- **N Loss:** 40 - 10.4 = -29.6 (with decomposition)
- **P Loss:** 28 - 6.8 = -21.2 (with decomposition)
- **K Loss:** 22 - 4 = -18
- **OM Gain:** 14 - 20 = +6 (net gain!)

**Fertility Impact:**
- Net loss = 67 / 4 nutrients = **-16.75 fertility points per plant lifecycle**
- Creates gradual nitrogen depletion, especially in high-activity zones
- OM accumulates as nutrient buffer for slow release

---

## Example: Soil Depletion Timeline

### Starting Soil: Fertility 60
```
Initial: N=65, P=60, K=62, OM=53 → Fertility = 60
```

### After 1 Nettle Lifecycle (25 days)
```
Consumed: N=40, P=28, K=22, OM=14
Returned (instant):  N=8,  P=5,  K=4,  OM=20
OM Decomposes (if in active zone): +2.4N, +1.8P over 20 days

Result (active zone): N=35.4, P=38.8, K=44, OM=51 → Fertility = 42.3
Result (inactive zone): N=33, P=37, K=44, OM=73 → Fertility = 46.8 (OM accumulated)
```

### After 2 Nettle Lifecycles (50 days)
```
Result: N=1, P=14, K=26, OM=49 → Fertility = 22.5
```

### After 3 Nettle Lifecycles (75 days)
```
Result: N=-31, P=-9, K=8, OM=47 (clamped to 0 minimum)
Actual: N=0, P=0, K=8, OM=47 → Fertility = 13.75
```

**At this point:** Fertility < 20, so nettle reproduction stops (minimum threshold)!

---

## Why Minimum Fertility of 20 Works

### The Balance Point
With minimum fertility = 20, the system prevents:
- **Nitrogen exhaustion** (most consumed nutrient)
- **Complete soil death** (fertility can't reach 0)
- **Ecosystem collapse** (reproduction stops before critical depletion)

### What Happens at Fertility = 20?
At fertility 20, the soil might look like:
```
N=15, P=12, K=18, OM=35 → Fertility = 20
```

This represents:
- **Marginal nitrogen** (15) - barely enough for seedlings
- **Low phosphorus** (12) - minimal root development
- **Weak potassium** (18) - poor plant vigor
- **Good organic matter** (35) - decomposition is working!

**Result:** Nettles can't grow further, but soil isn't dead. Organic matter accumulation prepares soil for future recovery.

---

## Comparing Balanced vs. Imbalanced Soil

### Scenario A: Balanced Soil (Fertility 60)
```
N=60, P=60, K=60, OM=60 → Fertility = 60
All nutrients equal, plant can grow normally
```

### Scenario B: Nitrogen-Depleted (Fertility 60)
```
N=10, P=70, K=80, OM=80 → Fertility = 60
High fertility, but nitrogen-starved!
Plant will struggle despite "good" fertility score
```

**Limitation of Current System:**
The simple average treats all nutrients equally. A plant might have fertility 60 but still can't grow if one critical nutrient (like N) is depleted.

**Future Enhancement Idea:**
Instead of minimum fertility, check individual nutrients:
```json
"environment": {
  "minimumNutrients": {
    "nitrogen": 15,
    "phosphorus": 10,
    "potassium": 10,
    "organicMatter": 5
  }
}
```

---

## Visual Representation

### Fertility Color Gradient (F key overlay)
```
Fertility 0-20:   Red       (depleted, no growth)
Fertility 20-40:  Orange    (marginal, slow growth)
Fertility 40-60:  Yellow    (moderate, normal growth)
Fertility 60-80:  Lt Green  (good, fast growth)
Fertility 80-100: Dk Green  (excellent, optimal growth)
```

### Soil Base Color (normal view)
```
Fertility 0-20:   Light tan/beige   (infertile)
Fertility 40-60:  Medium brown      (moderate)
Fertility 80-100: Dark brown/black  (rich)
```

---

## Real-World Analogy

Think of your soil like a **bank account**:

- **Initial balance:** 60 fertility (240 total nutrient points)
- **Each plant:** Withdraws 104 points, deposits 29 points back
- **Net cost:** 75 points per plant (-18.75 fertility)
- **Minimum balance:** 20 fertility (80 total nutrient points)

When your "account balance" hits 20, the bank (ecosystem) stops allowing new "transactions" (reproduction) to prevent bankruptcy (complete soil death).

The system creates a **self-regulating economy** where:
1. High fertility → rapid plant growth
2. Medium fertility → moderate growth
3. Low fertility (20-30) → reproduction stops, growth slows
4. System stabilizes at equilibrium

---

## Key Takeaways

1. **Fertility is an average** - It's the mean of N, P, K, and OM
2. **Nettles deplete soil** - They consume 104 nutrients but return only 29 (28% recovery)
3. **Organic Matter is special** - It's returned at 86% rate (12 out of 14)
4. **Minimum threshold prevents collapse** - At fertility 20, reproduction stops
5. **Visual feedback** - Dark soil = fertile, light soil = depleted
6. **Current limitation** - Doesn't check individual nutrients, only average

---

## Console Examples

When you play, you'll see messages like:

```
[NUTRIENT] Stinging Nettle at (245, -180) consumed nutrients: N:20, P:15, K:12, OM:8
[DECOMP] Stinging Nettle at (245, -180) decomposed, returning nutrients: N:8, P:5, K:4, OM:12
[PLANT] Warning: Soil fertility (18.2) below minimum for Stinging Nettle (20)
[GROWTH] Stinging Nettle at (245, -180) cannot grow - soil fertility (15.3) below minimum (20)
```

These show the nutrient cycle in action and the minimum fertility system working to prevent ecosystem collapse.

---

## Future Enhancements

### Phase 2: Nutrient-Specific Requirements
Instead of checking average fertility, check each nutrient individually:
```javascript
// More realistic approach
if (soil.nitrogen < 15 || soil.phosphorus < 10 || soil.potassium < 10) {
    console.warn('[GROWTH] Insufficient nutrients for growth');
    return false;
}
```

### Phase 3: Soil Regeneration
Add natural nutrient recovery over time:
```javascript
// Slow regeneration (e.g., 0.5 points per game day)
soil.nitrogen += 0.5 * gameDaysElapsed;
soil.phosphorus += 0.3 * gameDaysElapsed;
// etc.
```

### Phase 4: Nutrient Ratios
Different plants prefer different N:P:K ratios:
```json
"nettles": { "optimal": [3, 2, 2, 1] },  // Nitrogen-loving
"legumes": { "optimal": [1, 3, 2, 2] }   // Phosphorus-loving
```

This would create more complex, realistic ecosystems where different species complement each other!
