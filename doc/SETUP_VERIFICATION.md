# Land Shepherd - Verification System Setup

## Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Create baseline** (run this once when the app is in a good state):
```bash
npm run verify:baseline
```

3. **Verify changes** (run this after making changes):
```bash
npm run verify
```

## What Gets Installed

- **@playwright/test** - Browser automation framework
- **pixelmatch** - Pixel-level image comparison
- **pngjs** - PNG image processing

Total size: ~250MB (includes Chromium browser)

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run verify` | Run verification tests against baseline |
| `npm run verify:baseline` | Save current state as new baseline |
| `npm run verify:verbose` | Run with detailed console output |
| `npm test` | Run Playwright tests directly |
| `npm run dev` | Start development server |

## What Gets Tested

1. **Console Output** - Captures all logs, warnings, and errors
2. **WebGL Initialization** - Ensures graphics context is created
3. **Performance** - Measures average FPS over 3 seconds
4. **Load Time** - Tracks page load performance
5. **Visual Regression** - Compares screenshots against baseline

## Test Results Location

- `test-results/latest/` - Most recent test run
  - `screenshot.png` - Full page screenshot
  - `report.json` - Structured results (agent-parseable)
  - `console.json` - Complete console output
  - `diff.png` - Visual difference from baseline

- `test-results/baseline/` - Reference state for comparison

## Exit Codes

- `0` - All tests passed
- `1` - Tests failed (check report.json for details)

## Pass Criteria

Tests pass when ALL of these are met:
- Console errors: 0
- FPS average: ≥60
- WebGL context: initialized
- Visual diff: <5% (if baseline exists)
- Load time: <3000ms

## For Future Agents

After making code changes:

1. Run `npm run verify`
2. Check exit code: `echo $?` (Unix) or `echo %errorlevel%` (Windows)
3. If failed, read `test-results/latest/report.json`
4. Fix issues based on recommendations
5. Re-run verification
6. When passing, update documentation

## Troubleshooting

**"Port 8080 already in use"**
- Kill the process using port 8080
- Or change port in `playwright.config.js`

**"Playwright browsers not installed"**
- Run `npx playwright install chromium`

**"Tests timeout"**
- Increase timeout in `playwright.config.js`
- Check if WebGL is working in regular browser first

**Visual diff too high after intentional UI change**
- Create new baseline: `npm run verify:baseline`

## CI/CD Integration

To run in CI (GitHub Actions, etc.):

```yaml
- name: Install dependencies
  run: npm install

- name: Install Playwright browsers
  run: npx playwright install chromium

- name: Run verification
  run: npm run verify
```

## Example Report

```json
{
  "status": "PASS",
  "timestamp": "2025-11-16T10:30:00.000Z",
  "metrics": {
    "console_errors": 0,
    "console_warnings": 2,
    "fps_average": 62,
    "load_time_ms": 850,
    "webgl_context": "ok"
  },
  "recommendations": [
    "✓ No console errors detected",
    "✓ FPS 62 meets target (60+)"
  ]
}
```
