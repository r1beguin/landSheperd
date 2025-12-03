# Nettles Category Bugfix

**Date:** 2025-12-03  
**Type:** Bugfix  
**Status:** ✅ FIXED

## Problem

After the PlantGenerator refactor, nettles and clover rendered as simple green rectangles instead of proper plant sprites.

**Visual Issue:**
- Oaks: Rendered correctly with trunk and canopy ✓
- Nettles: Green rectangle (fallback sprite) ✗
- Clover: Green rectangle (fallback sprite) ✗

## Root Cause

The PlantGenerator registry pattern expects species to have one of three categories:
- `herb`
- `tree`
- `groundcover`

However, `species/nettles.json` had:
```json
"category": "wild_herb"
```

This category was not registered in PlantGenerator.generators, causing the router to fail and fall back to the simple green rectangle sprite.

## Investigation

**PlantGenerator.generators (line 7-10):**
```javascript
static generators = {
    herb: HerbGenerator,          // ✓ Registered
    tree: TreeGenerator,          // ✓ Registered
    groundcover: GroundcoverGenerator  // ✓ Registered
};
```

**Species Categories:**
- `species/nettles.json`: `"category": "wild_herb"` ✗ NOT recognized
- `species/oak.json`: `"category": "tree"` ✓ Recognized
- `species/clover.json`: `"category": "groundcover"` ✓ Recognized

**Console Output:**
```
PlantManager loaded 3 species: urtica_dioica, quercus_robur, trifolium_repens
```

No error messages because PlantGenerator silently falls back to `_generateFallbackSprite()` when category is unrecognized.

## Solution

Changed `species/nettles.json` line 4:

**Before:**
```json
"category": "wild_herb",
```

**After:**
```json
"category": "herb",
```

## Validation

**Test Command:**
```bash
npm run verify
```

**Results:**
- ✅ Status: PASS
- ✅ Console Errors: 0
- ✅ FPS: 47 (maintained)
- ✅ All 3 species load correctly
- ✅ No fallback warnings
- ✅ Visual diff: 24.45% (expected due to proper rendering)

**Baseline Updated:**
```bash
npm run verify:baseline
```

New baseline created with correct nettles and clover rendering.

## Files Modified

- `species/nettles.json` (line 4: category changed from "wild_herb" to "herb")

## Why This Happened

During the PlantGenerator refactor (2025-12-03), we standardized on three category names but didn't audit all species JSON files to ensure they used the correct categories. The `wild_herb` category was likely a more descriptive name that predated the modular architecture.

## Prevention

Future enhancements could include:
1. **Schema validation:** Validate species JSON against allowed categories on load
2. **Better error messages:** Console.error instead of silent fallback
3. **Category aliases:** Support aliases like `wild_herb` → `herb` in the registry
4. **Startup validation:** Check all species files have valid categories during PlantManager initialization

## Related Documentation

- Feature doc: doc/features/plant-generation-system.md
- Refactor devlog: doc/devlogs/2025-12/2025-12-03-generator-refactor.md
- Dev guidelines: doc/dev-guidelines.md (see "Adding New Plant Species")
