# Genetics Inheritance Tests - Milestone 5

## Overview
Tests for the genetic inheritance and mutation system implemented in Milestone 5. Validates Mendelian averaging, mutation rates, and genetic diversity across generations.

## Test Files

### 1. Automated Test (Playwright)
**File:** `genetics-inheritance.spec.js`

**Purpose:** Automated validation of inheritance mechanics

**Run:**
```bash
npm run test:genetics-inheritance
```

**Tests:**
- ✅ Mendelian averaging (parent traits averaged correctly)
- ✅ Mutation distribution (10% rate, 0.5% outliers)
- ✅ Multi-generation diversity (genetic variation compounds)
- ✅ Edge cases (extreme values, identical parents)

**Expected Results:**
- 3/3 tests passing
- No mutations: 35-45%
- Standard mutations: 50-60%
- Outlier mutations: 3-8%

---

### 2. Visual Test (Browser)
**File:** `tests/html/genetics-inheritance-test.html`

**Purpose:** Interactive visual validation with statistics

**Run:**
```bash
open tests/html/genetics-inheritance-test.html
```
Or open directly in browser.

**Features:**
- Real-time offspring generation (100 or 1000 samples)
- Mutation distribution visualization
- Sample offspring display
- Highlighted mutations and outliers
- Pass/fail validation checks

**Controls:**
- "Run Test (100 offspring)" - Quick test
- "Run Large Test (1000 offspring)" - Statistical confidence

---

### 3. Manual Console Test
**File:** `tests/manual/test-genetics-milestone5.js`

**Purpose:** Console-based debugging and validation

**Run:**
1. Open `index.html` in browser
2. Open browser console
3. Run: `testGeneticInheritance()`

**Output:**
```javascript
=== MILESTONE 5: GENETIC INHERITANCE TEST ===

Parent 1 traits (all 100): {...}
Parent 2 traits (all 150): {...}
Expected average: 125 for all traits

=== RESULTS (100 offspring) ===

Offspring Distribution:
- No mutations: 40% (expected: ~40%)
- Standard mutations: 55% (expected: ~55%)
- Outlier mutations: 5% (expected: ~5%)

Trait-Level Statistics:
- Total trait mutations: 90 / 900 traits (10.0%)
- Expected: ~90 mutations (~10%)
- Outlier trait mutations: 4 / 900 traits (0.4%)
- Expected: ~4.5 outliers (~0.5%)

=== SAMPLE OFFSPRING ===
...

=== VALIDATION ===
✓ All checks: PASS
```

---

## Validation Criteria

### Offspring Distribution
| Type | Expected | Description |
|------|----------|-------------|
| No mutations | 35-45% | Pure Mendelian average |
| Standard mutations | 50-60% | 1-2 traits mutated (±15%) |
| Outlier mutations | 3-8% | Extreme mutations (±45%) |

### Trait-Level Statistics
| Metric | Expected | Description |
|--------|----------|-------------|
| Total mutations | 8-12% | Per-trait mutation rate |
| Outlier mutations | 0.3-1.0% | Rare extreme shifts |

### Edge Cases
| Scenario | Validation |
|----------|-----------|
| Extreme parents (0, 255) | Offspring centered at 128 |
| Identical parents | 10% mutation rate maintained |
| Multiple generations | Genetic diversity increases |
| Value clamping | All traits within 0-255 |

---

## Test Implementation Details

### Parent Genetics (Test Setup)
```javascript
parent1 = {
    heightFactor: 100,
    widthFactor: 100,
    foliageDensity: 100,
    // ... all traits = 100
    generation: 0
};

parent2 = {
    heightFactor: 150,
    widthFactor: 150,
    foliageDensity: 150,
    // ... all traits = 150
    generation: 1
};

// Expected offspring: all traits ≈ 125 ± mutations
```

### Mutation Detection
```javascript
const expected = 125; // Average of 100 and 150
const diff = Math.abs(offspring[trait] - expected);

if (diff > 5) {
    // Standard mutation detected
}

if (offspring[trait] < 50 || offspring[trait] > 200) {
    // Outlier mutation detected
}
```

---

## Troubleshooting

### Test Fails: Mutation Rate Too High/Low
**Symptom:** Mutation percentages outside expected ranges

**Possible Causes:**
1. Random number generator edge case
2. Config parameters changed
3. Sample size too small (use 1000+ offspring)

**Solution:**
```bash
# Run large sample test
open tests/html/genetics-inheritance-test.html
# Click "Run Large Test (1000 offspring)"
```

### Test Fails: No Diversity Over Generations
**Symptom:** Standard deviation < 5 after 3 generations

**Possible Causes:**
1. Mutations not being applied
2. Config mutationChance = 0
3. Clamping too aggressive

**Solution:**
Check config.json:
```json
{
  "world": {
    "plants": {
      "genetics": {
        "inheritance": {
          "mutationChance": 0.1,      // Should be 0.1 (10%)
          "mutationStrength": 0.15    // Should be 0.15 (15%)
        }
      }
    }
  }
}
```

### Test Fails: Visual Test Not Loading
**Symptom:** Plant class undefined error

**Solution:**
Ensure test HTML includes Plant class:
```html
<script src="../../js/entities/plant.js"></script>
```

---

## Expected Console Output (Success)

### Automated Test
```
Running 3 tests using 1 worker

Genetic Inheritance Test Results:
- No mutations: 37%
- Standard mutations: 60%
- Outlier mutations: 3%
- Total trait mutations: 93 / 900
- Outlier traits: 3 / 900
  ✓ should generate offspring with proper Mendelian averaging

Diversity Test Results:
- Height std dev: 11.91
- Width std dev: 13.08
- Foliage std dev: 14.67
  ✓ should produce diverse offspring over multiple generations

Edge Cases Test Results:
- Extreme offspring (0+255): {...}
- Identical parent mutations: 33 / 450 traits
  ✓ should handle edge cases correctly

3 passed (9.8s)
```

---

## Integration Testing

To test inheritance in full game context:

1. **Plant two oaks:**
   ```javascript
   // In browser console
   window.graphicsEngine.plantManager.spawnPlantAt(400, 400, 'oak');
   window.graphicsEngine.plantManager.spawnPlantAt(450, 400, 'oak');
   ```

2. **Speed up time:**
   Press `3` for veryFast speed

3. **Wait for reproduction:**
   Oaks reproduce when Mature (after ~30 game days)

4. **Inspect offspring:**
   Right-click offspring → View genetics (Milestone 6)

5. **Observe diversity:**
   Multiple offspring should show trait variation

---

## Related Documentation

- **Implementation:** `doc/devlogs/2025-12/2025-12-02-genetics-milestone5-inheritance.md`
- **Architecture:** `doc/features/reproduction-system.md`
- **Testing Guide:** `doc/testing/interactive_testing.md`

---

## Quick Reference

**Test Commands:**
```bash
npm run test:genetics-inheritance  # Automated test
npm run verify                     # Full verification
```

**Expected Results:**
- 3/3 tests passing
- 0 console errors
- ~40% no mutations, ~55% standard, ~5% outliers
- Trait mutation rate: 8-12%
- Outlier rate: 0.3-1.0%

**Status:** ✅ All tests passing (Milestone 5 complete)
