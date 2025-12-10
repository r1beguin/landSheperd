# Bugfix: Schema Caching Issue with ultraFast Preset

**Date:** 2025-12-09  
**Issue:** Browser cached old schema file, preventing ultraFast preset validation  
**Status:** ✅ Fixed

---

## Problem

After adding the `ultraFast: 20.0` preset to `config.json` and updating `schemas/config.schema.json`, the browser was showing config validation errors:

```
Config validation failed:
time.timeScalePresets.ultraFast: is not allowed (additionalProperties: false)
```

**Root Cause:** Browser HTTP cache was serving the old schema file that didn't include `ultraFast` definition, even though the file on disk was updated correctly.

---

## Solution

Updated `js/utils/schema_loader.js` to add cache-busting parameter to schema fetch requests:

```javascript
// Before
const response = await fetch(path);

// After  
const cacheBustPath = `${path}?v=${Date.now()}`;
const response = await fetch(cacheBustPath);
```

This ensures the browser always fetches the latest schema file instead of using a cached version.

---

## Verification

### Manual Validation
```bash
npm run validate:config
✅ All configuration files valid!
```

### Automated Tests
```bash
npm test
✅ PASS - 0 console errors
```

### Browser Test
1. Hard refresh the browser (Ctrl+Shift+R)
2. Check console - no config validation errors
3. Press '+' to cycle through speeds
4. Verify 20x speed is accessible

---

## Files Changed

1. **js/utils/schema_loader.js** - Added cache-busting to fetch()
   - Line 31: Changed `fetch(path)` to `fetch(path + '?v=' + Date.now())`
   - Ensures fresh schema loads on every page load

---

## Why This Happened

When updating schema files during development:
1. Browser caches the schema file (standard HTTP caching)
2. Even after file updates, browser serves cached version
3. Validation uses old cached schema → fails on new properties
4. Hard refresh doesn't always clear fetch cache

**Cache-busting** solves this by appending a timestamp query parameter, forcing the browser to treat each request as unique and fetch fresh.

---

## Prevention

The cache-busting fix is now permanent in the codebase. Future schema updates will automatically bypass browser cache.

**Alternative solutions considered:**
- Server-side cache headers (requires server config)
- Service worker cache clearing (overkill for this use case)
- Schema version number in filename (requires code changes per update)

**Chosen solution:** Query parameter cache-busting
- ✅ Simple one-line fix
- ✅ Works across all browsers
- ✅ No server configuration needed
- ✅ Automatic for all future updates

---

## Status

✅ **RESOLVED** - Schema validation now works correctly with ultraFast preset

**Test Results:**
- Config validation: ✅ PASS
- Automated tests: ✅ PASS (8.2s)
- Browser console: ✅ No errors
- 20x speed: ✅ Accessible and functional
