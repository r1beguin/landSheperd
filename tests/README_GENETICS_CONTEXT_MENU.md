# Genetics Context Menu Testing Guide

## Quick Validation

### 1. Code Validation (Automated)
```bash
node tests/manual/validate-genetics-context-menu.js
```

**Expected Output:**
```
=== Genetics Context Menu Validation ===

CHECK 1: Context menu manager has genetics panel methods
  _buildGeneticsPanel method: ✓
  _buildTraitBar method: ✓
  Genetics integration: ✓
  PASS: Genetics panel methods present

CHECK 2: CSS has genetics panel styles
  .genetics-grid: ✓
  .genetics-section: ✓
  .trait-label: ✓
  .trait-bar: ✓
  .trait-fill: ✓
  .trait-value: ✓
  PASS: All genetics CSS classes present

CHECK 3: Trait labels match specification
  All 9 traits present: ✓
  PASS: All 9 genetic traits included

CHECK 4: Color coding logic present
  5-tier color system: ✓
  PASS: Color coding logic implemented

CHECK 5: Generation display logic
  Generation number display: ✓
  PASS: Generation display implemented

=================================
ALL CHECKS PASSED
=================================
```

---

## Manual Visual Testing

### 1. Start Server
```bash
npx http-server -p 8081
```

### 2. Open Test Page
Navigate to: `http://localhost:8081/tests/html/genetics-context-menu-test.html`

### 3. Run Test Scenarios

#### Test 1: Baseline Oak
1. Click "Plant Oak (Baseline)"
2. Right-click on oak tree
3. **Verify:**
   - Genetics panel appears
   - Generation: 0
   - All traits ~100% (yellow-green)
   - 9 traits displayed (5 visual + 4 nutrient)

#### Test 2: High-Efficiency Oak
1. Click "Plant High-Efficiency Oak"
2. Right-click on oak tree
3. **Verify:**
   - Height Factor ~164% (bright green #2e7d32)
   - N Efficiency ~172% (bright green #2e7d32)
   - Bars ~80% filled

#### Test 3: Low-Efficiency Oak
1. Click "Plant Low-Efficiency Oak"
2. Right-click on oak tree
3. **Verify:**
   - P Efficiency ~39% (brown-red #a0522d)
   - Width Factor ~31% (brown-red #a0522d)
   - Bars ~20% filled

#### Test 4: Nettles (No Genetics)
1. Click "Plant Nettles"
2. Right-click on nettles
3. **Verify:**
   - Context menu appears
   - NO genetics panel
   - Plant info shows normally

---

## In-Game Testing

### 1. Start Game
```bash
npx http-server -p 8081
```
Open: `http://localhost:8081`

### 2. Test Procedure
1. Plant oak tree (use species selector or debug menu)
2. Right-click on oak
3. **Check:**
   - Genetics panel present after plant info
   - Generation: 0 (manually planted)
   - All 9 traits visible
   - Color coding applied
   - Percentages readable

### 3. Test Multi-Generation (Advanced)
1. Plant mature oak
2. Let it reproduce naturally (requires proximity partner)
3. Right-click on offspring
4. **Check:**
   - Generation: 1+ (incremented)
   - Traits differ from parent
   - Some mutations visible (different colors)

---

## Expected Results

### ✅ PASS Criteria
- Genetics panel displays for oaks
- No panel for nettles/clover
- All 9 traits visible with labels
- Generation number shows correctly
- Color coding accurate (5 tiers)
- Bars scale proportionally
- No console errors
- No performance impact

### ❌ FAIL Indicators
- Panel doesn't appear for oaks
- Console errors when opening menu
- Missing traits (should be 9)
- Wrong colors (check specification)
- Incorrect percentages (128 ≠ 100%)
- Panel appears for non-genetic species

---

## Troubleshooting

### Issue: Panel doesn't appear
**Check:**
- Is plant an oak (quercus_robur)?
- Does plant have genetics? (console: `plant.genetics`)
- Was oak planted after genetics implementation?

**Fix:** Replant oak after confirming genetics system active

### Issue: Wrong colors
**Check:**
- Color values in code: #2e7d32, #4a7c59, #6b8e23, #d4a017, #a0522d
- Trait values: >200, 160-200, 100-160, 60-100, <60

**Fix:** Review _buildTraitBar color logic

### Issue: Missing traits
**Check:**
- All 9 traits in traitLabels map?
- Both visual and nutrient sections present?

**Fix:** Review _buildGeneticsPanel structure

---

## Color Reference

| Value Range | Color | Hex | RGB | Meaning |
|------------|-------|-----|-----|---------|
| >200 | Bright Green | #2e7d32 | rgb(46, 125, 50) | Exceptional |
| 160-200 | Green | #4a7c59 | rgb(74, 124, 89) | High |
| 100-160 | Yellow-Green | #6b8e23 | rgb(107, 142, 35) | Normal |
| 60-100 | Yellow | #d4a017 | rgb(212, 160, 23) | Low |
| <60 | Brown-Red | #a0522d | rgb(160, 82, 45) | Very Low |

---

## Files to Review

### Implementation
- `js/systems/context_menu_manager.js` - Panel logic
- `css/styles.css` - Panel styling

### Testing
- `tests/manual/validate-genetics-context-menu.js` - Automated validation
- `tests/html/genetics-context-menu-test.html` - Manual test page

### Documentation
- `doc/devlogs/2025-12/2025-12-02-genetics-milestone6-context-menu.md` - Full devlog
- `MILESTONE6_SUMMARY.md` - Implementation summary
- `tests/README_GENETICS_CONTEXT_MENU.md` - This file

---

## Success Checklist

- [ ] Automated validation passes (all 5 checks)
- [ ] Test 1 passes (baseline oak)
- [ ] Test 2 passes (high-efficiency oak)
- [ ] Test 3 passes (low-efficiency oak)
- [ ] Test 4 passes (nettles - no panel)
- [ ] In-game testing successful
- [ ] No console errors
- [ ] Performance acceptable (<1ms)
- [ ] Visual design matches specification

---

## Next: Milestone 7

After confirming Milestone 6:
1. Long-term ecosystem simulations
2. Balance tuning (mutation rates, ranges)
3. Comprehensive test suite
4. Final documentation

---

**Questions?** Review devlog or implementation files for details.
