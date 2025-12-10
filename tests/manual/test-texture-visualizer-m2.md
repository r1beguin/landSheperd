# Manual Test: Texture Visualizer Milestone 2

## Test Setup
1. Start local server: `python -m http.server 8081` or use VS Code Live Server
2. Open browser: `http://localhost:8081/texture_visualizer.html`
3. Open browser DevTools console (F12)

## Test Cases

### Test 1: LOD Selector Functionality
**Expected:** LOD selector defaults to "Medium" and is functional

1. Observe LOD selector is initially disabled
2. Select species "Nettles (urtica_dioica)" from dropdown
3. Verify LOD selector becomes enabled
4. Verify "Medium (Default)" is selected
5. Try changing to "High", "Low", "Impostor"
6. Verify each selection is stored

**PASS Criteria:**
- ✓ LOD selector disabled initially
- ✓ Enabled after species selection
- ✓ Default value is "Medium"
- ✓ Can change between all 4 options

### Test 2: Generate Button State Management
**Expected:** Button enables only when species and stage are selected

1. Observe "Generate Sprite" button is initially disabled
2. Select species "Nettles"
3. Verify button still disabled (no stage selected)
4. Select stage "Seedling"
5. Verify button becomes enabled
6. Click button
7. Verify button text changes to "Generating..." briefly
8. Verify button re-enables after generation

**PASS Criteria:**
- ✓ Button disabled initially
- ✓ Button disabled after species selection only
- ✓ Button enabled after stage selection
- ✓ Button disabled during generation
- ✓ Button re-enabled after generation

### Test 3: Generate Nettles Seedling at Medium LOD
**Expected:** Sprite generates and displays with metadata

1. Select "Nettles (urtica_dioica)"
2. Select stage "Seedling"
3. Select LOD "Medium (Default)"
4. Click "Generate Sprite"
5. Wait for generation to complete
6. Observe output area

**PASS Criteria:**
- ✓ Canvas appears in output area
- ✓ Canvas has visible border and checkerboard background
- ✓ Canvas displays green plant sprite (not blank)
- ✓ Metadata panel appears below canvas
- ✓ Metadata shows:
  - Species: Nettles
  - Species ID: urtica_dioica
  - Growth Stage: Seedling
  - LOD Level: MEDIUM
  - Canvas Size: [width] x [height] px (non-zero)
- ✓ Status text shows "Generated successfully"
- ✓ Console shows "Generated sprite: urtica_dioica Seedling medium"

**Console Output Check:**
- 0 console errors (red)
- Max 2 warnings (yellow) - cache misses OK

### Test 4: Generate Oak MatureTree at High LOD
**Expected:** Large tree sprite generates at high detail

1. Select "Oak (quercus_robur)"
2. Select stage "MatureTree" (or last stage)
3. Select LOD "High"
4. Click "Generate Sprite"
5. Observe output

**PASS Criteria:**
- ✓ Canvas appears with tree sprite
- ✓ Metadata shows:
  - Species: Oak
  - Growth Stage: MatureTree (or mature stage name)
  - LOD Level: HIGH
  - Canvas Size: larger than nettles (trees are bigger)
- ✓ Sprite visually appears to be a tree (brown/green colors)
- ✓ 0 console errors

### Test 5: Generate Clover Flowering at Low LOD
**Expected:** Simplified clover sprite generates

1. Select "Clover (trifolium_repens)"
2. Select stage "Flowering"
3. Select LOD "Low"
4. Click "Generate Sprite"
5. Observe output

**PASS Criteria:**
- ✓ Canvas appears with clover sprite
- ✓ Metadata shows:
  - Species: Clover
  - Growth Stage: Flowering
  - LOD Level: LOW
- ✓ Sprite appears (white flowers or green leaves)
- ✓ 0 console errors

### Test 6: Multiple Generations (Clear Previous)
**Expected:** Previous sprite is cleared when generating new one

1. Generate Nettles Seedling (any LOD)
2. Observe sprite in output area
3. Change to Oak Sapling
4. Click "Generate Sprite"
5. Observe output area

**PASS Criteria:**
- ✓ Only 1 canvas visible (Nettles canvas was removed)
- ✓ New Oak sprite displayed
- ✓ Metadata updated to Oak information
- ✓ No duplicate canvases or metadata panels

### Test 7: LOD Level Changes Generation
**Expected:** Different LOD levels produce different sprites

1. Select Nettles Seedling, LOD "High", generate
2. Note canvas dimensions in metadata
3. Without changing species/stage, change LOD to "Impostor"
4. Click generate again
5. Compare canvas dimensions

**PASS Criteria:**
- ✓ Dimensions change between High and Impostor
- ✓ Metadata correctly shows new LOD level
- ✓ Sprite appears different (may be smaller or simplified)

### Test 8: Console Output Validation
**Expected:** Clean console with appropriate logs

**Check Console For:**
- ✓ "Texture Visualizer - Milestone 2 Initialized"
- ✓ "Loaded species: urtica_dioica"
- ✓ "Loaded species: quercus_robur"
- ✓ "Loaded species: trifolium_repens"
- ✓ "Populated species dropdown with 3 entries"
- ✓ "Generated sprite: [species] [stage] [lod]" (after each generation)

**Console Errors:** 0 (MANDATORY)
**Console Warnings:** Max 2 (cache misses acceptable on first generation)

## Summary Checklist

### Functional Validation
- [ ] LOD selector functional and defaults to Medium
- [ ] Generate button state management works correctly
- [ ] Sprite generation works for all 3 species
- [ ] Generated sprites are visible (not blank/hidden)
- [ ] Canvas has correct styling (border, background)
- [ ] Metadata displays all required fields
- [ ] Metadata values are accurate
- [ ] Multiple generations clear previous sprite
- [ ] Different LOD levels produce different results

### Console Validation
- [ ] 0 console errors
- [ ] Max 2 console warnings
- [ ] Expected log messages present

### Visual Validation
- [ ] Nettles sprite appears green/plant-like
- [ ] Oak sprite appears tree-like (larger, brown/green)
- [ ] Clover sprite appears appropriate
- [ ] Canvas dimensions are non-zero
- [ ] Metadata panel is readable and well-formatted

## Test Results

**Date:** ___________
**Tester:** ___________

**Overall Result:** PASS / FAIL

**Issues Found:**
[List any issues, console errors, or unexpected behavior]

**Screenshots:**
- [ ] Nettles Seedling Medium LOD
- [ ] Oak MatureTree High LOD
- [ ] Clover Flowering Low LOD
- [ ] Console output showing logs

**Notes:**
[Any additional observations or comments]
