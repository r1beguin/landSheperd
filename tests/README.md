# Land Shepherd Testing

**Last updated:** 2025-11-30

## Overview

Land Shepherd uses a comprehensive testing framework combining automated Playwright tests, interactive testing with screenshots, and manual HTML test files.

## Test Types

### Automated Tests (Playwright)

Located in `tests/*.spec.js`, these tests run via Playwright with headless Chrome.

**Key Test Suites:**
- `verify.spec.js` - Main verification suite
- `interactive.spec.js` - Interactive testing with screenshots and metrics
- `nutrient-system.spec.js` - Nutrient system validation
- `context-menu.spec.js` / `context-menu-debug.spec.js` / `context-menu-functional.spec.js` - Context menu tests
- `visual-feedback.spec.js` - Visual feedback system
- `overlay-cycling.spec.js` - Overlay cycling tests

**Run Commands:**
```bash
npm run verify                 # Standard verification
npm run verify:interactive     # Full interactive mode with screenshots
npm run verify:baseline        # Create new baseline for comparison
npm run verify:screenshot-only # Capture screenshots only
npm run verify:log-only        # Analyze console logs only
npm run verify:verbose         # Detailed output
```

### Manual HTML Tests

Located in `tests/html/`, these are standalone HTML files for visual testing and debugging.

**Available Tests:**
- `context-menu.html` - Context menu manual testing
- `nutrients.html` - Nutrient system visualization and interaction
- `reproduction.html` - Plant reproduction observation

**How to Run:**
1. Start local server: `python -m http.server 8081` or `npx http-server -p 8081`
2. Open in browser: `http://localhost:8081/tests/html/context-menu.html`
3. Interact manually and observe behavior

### Manual Test Utilities

Located in `tests/manual/`, these are JavaScript utilities for debugging and testing.

**Available Utilities:**
- `context-test.js` - Context menu debug utility

## Test Infrastructure

### Test Utilities (`test-utils.js`)

Helper functions for Playwright tests:

```javascript
// Wait for frames to render
await waitForRenderFrames(page, 10);

// Click on canvas at world coordinates
await clickOnCanvas(page, 25, 25);

// Spawn plant at grid position
await spawnPlantAt(page, 10, 15);

// Simulate keyboard input
await simulateKeyPress(page, 'N');

// Advance game time
await advanceGameTime(page, 10); // 10 game days

// Get metrics
const metrics = await getGameMetrics(page);
console.log('FPS:', metrics.fps);
console.log('Plants:', metrics.entities.plantCount);
```

See `test-utils.js` for complete API.

### Interactive Testing Framework

The interactive testing system provides:
- **ScreenshotManager** - Canvas screenshot capture
- **LogReader** - Console message analysis
- **Metrics Collection** - FPS, entity counts, manager status
- **Visual Comparison** - Pixel difference against baseline

See [doc/testing/interactive-testing.md](../doc/testing/interactive-testing.md) for detailed API reference.

## Test Results

### Directory Structure

```
test-results/
├── latest/               # Most recent test run
│   ├── report.json      # Structured metrics
│   ├── console.json     # Console output
│   ├── screenshot.png   # Current state
│   └── diff.png         # Visual difference
├── baseline/            # Reference for comparison
│   ├── screenshot.png
│   ├── console.json
│   └── report.json
└── interactive/         # Interactive mode results
    └── [timestamp]/
        ├── checkpoint-*.png
        └── report.json
```

### report.json Format

```json
{
  "status": "PASS",
  "timestamp": "2025-11-30T12:00:00Z",
  "metrics": {
    "console_errors": 0,
    "console_warnings": 2,
    "fps_average": 58,
    "load_time_ms": 920,
    "webgl_context": "ok"
  },
  "visual": {
    "baseline_exists": true,
    "pixel_difference_percent": 2.1,
    "verdict": "PASS"
  },
  "recommendations": [
    "✓ No console errors detected",
    "✓ FPS 58 meets target (60+)"
  ]
}
```

## Pass Criteria

Tests PASS when:
- ✅ Console errors: 0
- ✅ FPS average: >= 30 (target 60+)
- ✅ WebGL context: "ok"
- ✅ Visual diff: < 5% (or new baseline created)

Tests FAIL when:
- ❌ Any console errors present
- ❌ FPS < 30
- ❌ WebGL context failed
- ❌ Visual diff > 5% (unintentional)

## Baseline Management

### When to Create Baseline

Create new baseline after:
- ✅ Completing feature with intentional visual changes
- ✅ Fixing visual bugs
- ✅ Verifying all tests PASS

**Command:**
```bash
npm run verify:baseline
```

### Baseline Workflow

```bash
# 1. Make changes and test
npm run verify:interactive

# 2. Review results
# - Check test-results/latest/report.json
# - View screenshots in test-results/latest/
# - Confirm visual changes are correct

# 3. Create baseline if changes intentional
npm run verify:baseline

# 4. Verify baseline works
npm run verify
# Should now PASS with visual diff < 5%
```

## Writing Custom Tests

### Example Playwright Test

```javascript
// tests/my-feature.spec.js
const { test, expect } = require('@playwright/test');
const { waitForRenderFrames, getGameMetrics } = require('./test-utils');

test('My feature works correctly', async ({ page }) => {
    // Navigate and initialize
    await page.goto('http://localhost:8081');
    await waitForRenderFrames(page, 10);
    
    // Test logic here
    const metrics = await getGameMetrics(page);
    expect(metrics.entities.plantCount).toBeGreaterThan(0);
    
    // Capture evidence
    await page.screenshot({ 
        path: 'test-results/my-feature-validation.png' 
    });
});
```

## Troubleshooting

### Common Issues

#### Port 8081 Busy
```bash
# Kill existing process or use different port
# Update playwright.config.js if changing port
```

#### WebGL Errors in Headless
This is expected - headless Chrome uses software rendering (SwiftShader) which is slower and may show GL warnings.

#### No Baseline Found
First run will skip visual comparison. Create baseline with `npm run verify:baseline`.

#### Test Timeout
Increase timeout in `playwright.config.js` if tests timing out.

## CI/CD Integration

Tests are designed to run in CI:
- Exit code 0 = PASS
- Exit code 1 = FAIL
- Structured JSON output in test-results/
- Screenshot and console capture for debugging

## Quick Reference

### Daily Development Workflow
```bash
# After making changes
npm run verify

# If visual changes
npm run verify:interactive

# Create baseline after feature complete
npm run verify:baseline
```

### Debugging Workflow
```bash
# Detailed output
npm run verify:verbose

# Just screenshots
npm run verify:screenshot-only

# Just console analysis
npm run verify:log-only

# Manual testing
# Open tests/html/*.html in browser
```

## Related Documentation

- [Interactive Testing Framework API](../doc/testing/interactive-testing.md)
- [Verification Workflow](../doc/guides/agents-guide.md#shepherd-verify)
- [Developer Guidelines](../doc/dev-guidelines.md)

---

**Need Help?** Check [doc/troubleshooting/](../doc/troubleshooting/) or review test code in `tests/*.spec.js`.
