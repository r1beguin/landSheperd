# LOD Manager Foundation Tests

## Overview

Tests for the LODManager class implemented in Milestone 1. These tests validate the core LOD logic without any rendering integration.

## Running Tests

### Via Playwright (Automated)

```bash
# Windows PowerShell
powershell -Command "$env:TEST_LOD='true'; npx playwright test --reporter=list"

# Linux/Mac
TEST_LOD=true npx playwright test --reporter=list
```

### Via Browser (Manual)

1. Start local server: `npx http-server -p 8081`
2. Open: `http://localhost:8081/tests/html/test-lod-manager.html`
3. View test results in browser

## Test Files

### tests/lod-manager-simple.spec.js
Playwright test that loads the HTML test page and validates all tests pass.

### tests/html/test-lod-manager.html
Standalone HTML test page with visual results. Useful for:
- Manual testing
- Debugging LOD logic
- Visual validation without Playwright

## Test Coverage

| Test | Description |
|------|-------------|
| **Instantiation** | LODManager creates successfully with config |
| **Calculate LOD levels** | Correct LOD for zoom thresholds (2.0, 1.0, 0.5) |
| **Hysteresis** | Prevents rapid switching at boundaries |
| **Batch updates** | Updates array of entities correctly |
| **Resolution multipliers** | Returns correct values (2.0/1.0/0.5/0.2) |
| **Clear cache** | Resets entityLODs and counts |

## Expected Results

All 6 tests should pass:
```
LOD Manager Test Results:
  ✓ LODManager instantiation
  ✓ Calculate LOD levels
  ✓ Hysteresis prevents rapid switching
  ✓ Batch update entities
  ✓ Resolution multipliers
  ✓ Clear cache
```

## Configuration

LOD configuration in `config.json`:
```json
{
  "world": {
    "rendering": {
      "lod": {
        "enabled": true,
        "highThreshold": 2.0,
        "mediumThreshold": 1.0,
        "lowThreshold": 0.5,
        "transitionHysteresis": 0.1,
        "resolutionMultipliers": {
          "high": 2.0,
          "medium": 1.0,
          "low": 0.5,
          "impostor": 0.2
        }
      }
    }
  }
}
```

## Troubleshooting

### Environment Variable Not Working

On Windows, use PowerShell:
```powershell
$env:TEST_LOD='true'
npx playwright test --reporter=list
```

On Linux/Mac, use export:
```bash
export TEST_LOD=true
npx playwright test --reporter=list
```

### Test Not Found

Ensure `playwright.config.js` includes LOD test pattern:
```javascript
process.env.TEST_LOD === 'true'
  ? '**/lod-manager-simple.spec.js'
```

### Manual Test Not Loading

1. Check server is running on port 8081
2. Verify path: `tests/html/test-lod-manager.html`
3. Check console for JavaScript errors
4. Ensure `js/core/lod_manager.js` exists
