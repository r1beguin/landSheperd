# Interactive Testing Framework

## Overview

The Interactive Testing Framework enhances Land Shepherd's verification system with automated screenshot capture and log reading capabilities. This framework enables developers to test interactively with real-time feedback, capture screenshots at specific points, and programmatically analyze console logs.

## Architecture

### Components

1. **ScreenshotManager** (`js/systems/screenshot_manager.js`)
   - Non-blocking WebGL canvas screenshot capture
   - Multiple format support (PNG, JPEG)
   - Metadata tracking and timestamping
   - Visual comparison metadata generation
   - Context loss handling

2. **LogReader** (`js/systems/log_reader.js`)
   - Real-time console message capture
   - Severity-based filtering (error, warn, info, log, debug)
   - Structured log parsing (FPS, WebGL state, timings)
   - Log assertions for automated testing
   - Pattern matching and search capabilities

3. **Enhanced Verification Script** (`scripts/verify-changes.js`)
   - Multiple test modes (baseline, verify, interactive, screenshot-only, log-only)
   - Backward compatible with existing workflow
   - Results stored in `test-results/interactive/`

4. **Interactive Test Spec** (`tests/interactive.spec.js`)
   - Demonstrates API usage
   - Captures screenshots at multiple points
   - Tests manager functionality in-browser
   - Generates comprehensive reports

## Usage

### Quick Start

```bash
# Run interactive testing mode
npm run verify:interactive

# Capture screenshots only (no log analysis)
npm run verify:screenshot-only

# Analyze logs only (no screenshots)
npm run verify:log-only

# Standard verification (unchanged)
npm run verify
```

### Command Line Options

```bash
# Create baseline for comparison
npm run verify:baseline

# Verbose output
npm run verify:verbose

# Run interactive mode directly with Playwright
npm run test:interactive
```

## API Reference

### ScreenshotManager

#### Initialization

```javascript
const manager = new ScreenshotManager();
const canvas = document.querySelector('canvas');
manager.initialize(canvas);
```

#### Capturing Screenshots

```javascript
// Basic capture
await manager.captureScreenshot('test-initial');

// Capture with options
await manager.captureScreenshot('test-gameplay', {
  format: 'png',           // 'png' or 'jpeg'
  quality: 0.95,          // JPEG quality (0-1)
  metadata: {
    test: 'gameplay-test',
    frame: 1234
  }
});
```

#### Retrieving Screenshots

```javascript
// Get a specific screenshot
const screenshot = manager.getScreenshot('test-initial');
console.log(screenshot.metadata.captureTime); // Capture duration in ms

// Get all screenshots
const allScreenshots = manager.getAllScreenshots();

// Export screenshot manifest
const manifest = manager.exportManifest();
```

#### Comparison

```javascript
// Compare two screenshots (metadata only, pixel comparison in Node.js)
const comparison = manager.compareScreenshots('before', 'after');
console.log(comparison.comparable); // true if dimensions match
```

#### Management

```javascript
// Get statistics
const stats = manager.getStats();
console.log(stats.totalCaptures);
console.log(stats.averageCaptureTime);

// Clear screenshots
manager.clearScreenshot('test-initial');
manager.clearAll(true); // true = also reset stats

// Export screenshot (browser only)
manager.exportScreenshot('test-initial', 'my-test.png');
```

#### Context Loss Handling

```javascript
// These are called automatically when context is lost/restored
canvas.addEventListener('webglcontextlost', () => {
  manager.handleContextLoss();
});

canvas.addEventListener('webglcontextrestored', () => {
  manager.handleContextRestored();
});
```

### LogReader

#### Starting Capture

```javascript
const reader = new LogReader();

// Start capturing (with passthrough to console)
reader.startCapture({
  maxEntries: 1000,      // Maximum logs to keep
  passthrough: true      // Still output to console
});
```

#### Filtering Logs

```javascript
// Get errors only
const errors = reader.getErrors(50); // Last 50 errors

// Get warnings only
const warnings = reader.getWarnings(50);

// Get logs with custom filter
const logs = reader.getLogs({
  type: ['error', 'warn'],     // Filter by type(s)
  severity: 'warn',            // Minimum severity
  pattern: /WebGL/i,           // Message pattern
  since: 1000,                 // Time offset in ms
  limit: 100                   // Max results
});

// Search logs
const matches = reader.search(/FPS: (\d+)/);
```

#### Assertions

```javascript
// Assert no errors occurred
const noErrorsResult = reader.assertNoErrors();
console.log(noErrorsResult.pass); // true/false
console.log(noErrorsResult.errors); // List of errors if any

// Assert warning count is acceptable
const warningResult = reader.assertWarningCount(10); // Max 10 warnings
console.log(warningResult.pass);

// Assert specific log exists
const fpsLogResult = reader.assertLogExists(/FPS: \d+/);
console.log(fpsLogResult.pass);
console.log(fpsLogResult.matchCount);
```

#### Generating Reports

```javascript
// Generate comprehensive report
const report = reader.generateReport();
console.log(report.statistics);    // Total, errors, warnings, etc.
console.log(report.errors);        // Last 50 errors
console.log(report.warnings);      // Last 50 warnings
console.log(report.analysis);      // Structured data analysis

// FPS analysis example
if (report.analysis.fpsStats) {
  console.log('Average FPS:', report.analysis.fpsStats.average);
  console.log('Min FPS:', report.analysis.fpsStats.min);
  console.log('Max FPS:', report.analysis.fpsStats.max);
}

// Manager initialization tracking
report.analysis.managerStatus.forEach(status => {
  console.log(`${status.name}: ${status.status}`);
});
```

#### Stopping Capture

```javascript
// Stop capturing and restore original console
reader.stopCapture();

// Export logs as JSON
const json = reader.exportJSON({ type: 'error' }); // Export errors only
fs.writeFileSync('errors.json', json);
```

#### Cleanup

```javascript
// Clear logs
reader.clearLogs(true); // true = reset stats
```

## Testing Workflow

### Interactive Mode

The interactive mode runs a comprehensive test that:

1. Captures screenshots at multiple points:
   - Initial state (on load)
   - After 1 second
   - After user interaction
   - With debug panel (if enabled)

2. Tests ScreenshotManager API in-browser:
   - Initializes manager
   - Captures test screenshots
   - Validates statistics
   - Exports manifest

3. Tests LogReader API in-browser:
   - Starts log capture
   - Generates test logs
   - Validates filtering
   - Tests assertions
   - Analyzes structured data

4. Generates comprehensive report in `test-results/interactive/`

### Screenshot-Only Mode

Focuses on visual testing:
- Captures screenshots at key points
- Skips log analysis
- Useful for visual regression testing
- Results in `test-results/interactive/screenshots/`

### Log-Only Mode

Focuses on log analysis:
- Captures and analyzes console output
- Validates log assertions
- Skips screenshot capture
- Results in `test-results/interactive/logs/`

## Output Structure

```
test-results/
├── interactive/
│   ├── [timestamp]-report.json          # Session report
│   ├── screenshots/
│   │   ├── [timestamp]-01-initial.png
│   │   ├── [timestamp]-02-after-1s.png
│   │   ├── [timestamp]-03-after-interaction.png
│   │   └── [timestamp]-04-with-debug.png
│   └── logs/
│       └── [timestamp]-console.json      # Console logs
├── latest/
│   ├── report.json                       # Standard verify report
│   ├── screenshot.png
│   └── console.json
└── baseline/
    ├── report.json
    ├── screenshot.png
    └── console.json
```

## Report Format

### Interactive Report (`[timestamp]-report.json`)

```json
{
  "mode": "interactive",
  "timestamp": "2025-11-25T10:30:00.000Z",
  "sessionId": "2025-11-25T10-30-00-000Z",
  "loadTime": 850,
  "summary": {
    "screenshotsCaptured": true,
    "logsAnalyzed": true,
    "errors": 0,
    "warnings": 2
  },
  "paths": {
    "screenshots": "test-results/interactive/screenshots",
    "logs": "test-results/interactive/logs"
  }
}
```

### Log Report (`[timestamp]-console.json`)

```json
{
  "timestamp": "2025-11-25T10-30-00-000Z",
  "loadTime": 850,
  "statistics": {
    "total": 156,
    "errors": 0,
    "warnings": 2
  },
  "logs": [...],
  "errors": [...],
  "warnings": [...]
}
```

## Best Practices

### Screenshot Capture

1. **Use Descriptive Names**: Name screenshots based on test scenario
   ```javascript
   await manager.captureScreenshot('plant-growth-day-5');
   ```

2. **Add Metadata**: Include context for later analysis
   ```javascript
   await manager.captureScreenshot('test', {
     metadata: { 
       fps: currentFPS, 
       plantCount: plants.length 
     }
   });
   ```

3. **Capture at Key Moments**: Don't over-capture
   - After initialization
   - Before/after major state changes
   - On user interactions
   - When errors occur

4. **Clean Up**: Clear screenshots when done to free memory
   ```javascript
   manager.clearAll();
   ```

### Log Analysis

1. **Start Capture Early**: Begin capturing before initialization
   ```javascript
   reader.startCapture();
   // ... initialization code ...
   const report = reader.generateReport();
   ```

2. **Use Assertions**: Validate expected behavior
   ```javascript
   const result = reader.assertNoErrors();
   expect(result.pass).toBe(true);
   ```

3. **Filter Strategically**: Reduce noise by filtering
   ```javascript
   const relevantLogs = reader.getLogs({
     pattern: /\[PlantManager\]/,
     severity: 'warn'
   });
   ```

4. **Analyze Structured Data**: Extract performance metrics
   ```javascript
   const report = reader.generateReport();
   if (report.analysis.fpsStats) {
     expect(report.analysis.fpsStats.average).toBeGreaterThan(30);
   }
   ```

## Integration with Existing Tests

The interactive testing framework integrates seamlessly with existing verification:

```javascript
// In tests/verify.spec.js or custom test
test('My Custom Test', async ({ page }) => {
  // Load managers
  await page.addScriptTag({ path: 'js/systems/screenshot_manager.js' });
  await page.addScriptTag({ path: 'js/systems/log_reader.js' });
  
  // Use in test
  const result = await page.evaluate(async () => {
    const screenshotMgr = new ScreenshotManager();
    const logReader = new LogReader();
    
    screenshotMgr.initialize(document.querySelector('canvas'));
    logReader.startCapture();
    
    // ... test logic ...
    
    await screenshotMgr.captureScreenshot('my-test');
    const logs = logReader.getErrors();
    
    return { screenshotCount: 1, errorCount: logs.length };
  });
  
  expect(result.errorCount).toBe(0);
});
```

## Performance Considerations

### ScreenshotManager

- **Non-Blocking**: Uses `requestAnimationFrame` for captures
- **Memory Management**: Limit stored screenshots or clear regularly
- **Format Choice**: Use JPEG for smaller file sizes, PNG for pixel-perfect comparison

### LogReader

- **Bounded Buffer**: Automatically trims old logs when `maxEntries` is reached
- **Efficient Parsing**: RegExp patterns are pre-compiled
- **Streaming**: Processes logs in real-time without buffering all messages

## Troubleshooting

### Screenshots Not Capturing

1. Check canvas is initialized:
   ```javascript
   const canvas = document.querySelector('canvas');
   console.log('Canvas found:', !!canvas);
   ```

2. Verify manager initialization:
   ```javascript
   const initialized = manager.initialize(canvas);
   console.log('Manager initialized:', initialized);
   ```

3. Handle WebGL context loss:
   ```javascript
   canvas.addEventListener('webglcontextlost', (e) => {
     console.error('WebGL context lost');
     manager.handleContextLoss();
   });
   ```

### Logs Not Captured

1. Ensure capture started before logs:
   ```javascript
   reader.startCapture();
   console.log('This will be captured');
   ```

2. Check passthrough setting:
   ```javascript
   reader.startCapture({ passthrough: true }); // See logs in console
   ```

3. Verify filtering is correct:
   ```javascript
   const allLogs = reader.getLogs(); // No filter
   console.log('Total logs:', allLogs.length);
   ```

### Test Timeouts

If tests timeout, increase in `playwright.config.js`:
```javascript
timeout: 60000, // 60 seconds
```

Or wait longer for operations:
```javascript
await page.waitForTimeout(5000); // 5 seconds
```

## Interaction Simulation

### Overview

The framework now includes comprehensive interaction simulation utilities that enable realistic user interaction testing. Instead of capturing static screenshots, tests can now simulate mouse movements, clicks, keyboard input, and complex multi-step workflows.

### Test Utilities API

All utilities are available in `tests/test-utils.js` and can be imported into any test:

```javascript
const {
    waitForRenderFrames,
    simulateMouseDrag,
    clickOnCanvas,
    simulateKeyPress,
    simulateScroll,
    advanceGameTime,
    getEntityAtPosition,
    getCameraState,
    getGameMetrics,
    spawnPlantAt,
    toggleDebugOverlay,
    waitForCondition
} = require('./test-utils');
```

### Core Interaction Functions

#### Mouse Interactions

**simulateMouseDrag** - Simulate camera panning

```javascript
// Pan camera 200px to the right
await simulateMouseDrag(page, startX, startY, endX, endY, {
    steps: 10,      // Number of intermediate steps (default: 10)
    delayMs: 16     // Delay between steps in ms (default: 16)
});
```

**clickOnCanvas** - Click at specific canvas coordinates

```javascript
// Left click at center of canvas
await clickOnCanvas(page, canvasX, canvasY, {
    button: 'left',    // 'left', 'right', or 'middle'
    clickCount: 1      // Number of clicks (default: 1)
});

// Right click to spawn plant
await clickOnCanvas(page, 400, 300, { button: 'right' });
```

**simulateScroll** - Zoom using mouse wheel

```javascript
// Zoom in (negative deltaY)
await simulateScroll(page, canvasX, canvasY, -100);

// Zoom out (positive deltaY)
await simulateScroll(page, canvasX, canvasY, 100);
```

#### Keyboard Interactions

**simulateKeyPress** - Press keyboard keys

```javascript
// Press spacebar to pause
await simulateKeyPress(page, 'Space');

// Hold key for duration
await simulateKeyPress(page, 'ArrowRight', { holdMs: 500 });

// Press debug toggle
await simulateKeyPress(page, 'f');
```

#### Game State Manipulation

**advanceGameTime** - Fast-forward game time

```javascript
// Advance by 5 game days
const result = await advanceGameTime(page, 5);
console.log(result);
// { success: true, startDay: "0.00", currentDay: "5.00", advanced: "5.00" }
```

**spawnPlantAt** - Spawn plant at grid coordinates

```javascript
// Spawn plant at grid (25, 25)
const result = await spawnPlantAt(page, 25, 25);
console.log(result);
// { success: true, plant: { position: {...}, stage: "Seedling", grid: {...} } }
```

**toggleDebugOverlay** - Toggle fertility overlay

```javascript
const result = await toggleDebugOverlay(page);
console.log(result);
// { success: true, overlayEnabled: true }
```

#### State Inspection

**getGameMetrics** - Get comprehensive game state

```javascript
const metrics = await getGameMetrics(page);
console.log(metrics);
// {
//   time: { currentDay: 5, timeScale: 1.0, isPaused: false },
//   camera: { zoom: 2.5, position: { x: 0, y: 0 } },
//   entities: { plantCount: 3, entityCount: 4 },
//   rendering: { renderCalls: 42, visibleSoilCells: 256 }
// }
```

**getCameraState** - Get camera position and bounds

```javascript
const camera = await getCameraState(page);
console.log(camera);
// { position: { x: 100, y: 50 }, zoom: 2.0, bounds: { left: -200, right: 200, ... } }
```

**getEntityAtPosition** - Identify entity under cursor

```javascript
const entity = await getEntityAtPosition(page, canvasX, canvasY);
if (entity && entity.type === 'plant') {
    console.log(`Plant at ${entity.grid.x}, ${entity.grid.y}`);
    console.log(`Stage: ${entity.stage}, Age: ${entity.age}`);
}
```

#### Synchronization Utilities

**waitForRenderFrames** - Wait for N render frames

```javascript
// Wait for 5 frames to ensure rendering is complete
await waitForRenderFrames(page, 5);
```

**waitForCondition** - Wait for custom condition

```javascript
// Wait for plant count to reach 3
const success = await waitForCondition(page, 
    () => window.graphicsEngine?.plantManager?.plants.size >= 3,
    { timeout: 5000, interval: 100 }
);
```

### Example Test Scenarios

#### Scenario A: Camera Movement Validation

```javascript
test('Camera pans correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Get initial camera state
    const cameraBefore = await getCameraState(page);
    
    // Simulate camera pan
    const canvasWidth = await page.evaluate(() => document.querySelector('canvas').width);
    await simulateMouseDrag(page, canvasWidth/2, 300, canvasWidth/2 + 200, 300);
    
    // Capture after panning
    await page.screenshot({ path: 'test-results/camera-panned.png' });
    
    // Verify camera moved
    const cameraAfter = await getCameraState(page);
    expect(cameraAfter.position.x).not.toBe(cameraBefore.position.x);
});
```

#### Scenario B: Plant Interaction and Growth

```javascript
test('Plant grows over time', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Spawn plant
    const spawnResult = await spawnPlantAt(page, 25, 25);
    expect(spawnResult.success).toBe(true);
    
    // Capture initial state
    await page.screenshot({ path: 'test-results/plant-seedling.png' });
    
    // Advance time
    await advanceGameTime(page, 10);
    await waitForRenderFrames(page, 10);
    
    // Capture after growth
    await page.screenshot({ path: 'test-results/plant-grown.png' });
    
    // Verify plant still exists and metrics changed
    const metrics = await getGameMetrics(page);
    expect(metrics.time.currentDay).toBeGreaterThan(9);
    expect(metrics.entities.plantCount).toBeGreaterThan(0);
});
```

#### Scenario C: Debug Overlay Visual Comparison

```javascript
test('Debug overlay shows different visuals', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Capture normal view
    await page.screenshot({ path: 'test-results/normal-view.png' });
    
    // Toggle debug overlay
    await toggleDebugOverlay(page);
    await waitForRenderFrames(page, 5);
    
    // Capture debug view
    await page.screenshot({ path: 'test-results/debug-view.png' });
    
    // Toggle off
    await toggleDebugOverlay(page);
    await waitForRenderFrames(page, 5);
    
    // Capture normal view again
    await page.screenshot({ path: 'test-results/normal-view-2.png' });
    
    // Visual comparison would show significant differences
});
```

#### Scenario D: Multi-Step Workflow

```javascript
test('Complete gameplay workflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const screenshots = [];
    
    // 1. Initial state
    screenshots.push(await page.screenshot({ path: 'test-results/01-initial.png' }));
    
    // 2. Spawn multiple plants
    await spawnPlantAt(page, 25, 25);
    await spawnPlantAt(page, 26, 25);
    await spawnPlantAt(page, 25, 26);
    screenshots.push(await page.screenshot({ path: 'test-results/02-plants-spawned.png' }));
    
    // 3. Advance time to trigger growth
    await advanceGameTime(page, 15);
    await waitForRenderFrames(page, 10);
    screenshots.push(await page.screenshot({ path: 'test-results/03-plants-grown.png' }));
    
    // 4. Pan camera to see different area
    const canvas = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return { width: c.width, height: c.height };
    });
    await simulateMouseDrag(page, canvas.width/2, canvas.height/2, 
                            canvas.width/2 + 300, canvas.height/2);
    screenshots.push(await page.screenshot({ path: 'test-results/04-camera-panned.png' }));
    
    // 5. Zoom in to inspect plants
    await simulateScroll(page, canvas.width/2, canvas.height/2, -200);
    await simulateScroll(page, canvas.width/2, canvas.height/2, -200);
    screenshots.push(await page.screenshot({ path: 'test-results/05-zoomed-in.png' }));
    
    // Verify each screenshot captured different state
    console.log(`Captured ${screenshots.length} screenshots`);
    expect(screenshots.length).toBe(5);
});
```

### Realistic Test Scenarios

The enhanced `tests/interactive.spec.js` includes 8 realistic scenarios:

1. **Initial State** - Captures baseline and validates initial game metrics
2. **Camera Movement Test** - Simulates camera panning with mouse drag
3. **Zoom Test** - Tests zoom in/out with mouse wheel
4. **Plant Spawning Test** - Spawns plant via right-click interaction
5. **Time Progression Test** - Advances game time and observes changes
6. **Debug Overlay Toggle Test** - Toggles fertility overlay on/off
7. **Keyboard Controls Test** - Tests time control keyboard shortcuts
8. **Complex Workflow** - Multi-step plant growth observation

Each scenario:
- Captures screenshots before and after interactions
- Records game metrics for validation
- Logs interaction results to console
- Validates that interactions produced expected changes

### Visual Comparison

The framework now analyzes screenshots for meaningful differences:

```javascript
// Compare metrics between consecutive screenshots
for (let i = 1; i < screenshots.length; i++) {
    const prev = screenshots[i - 1];
    const curr = screenshots[i];
    
    const metricsChanged = JSON.stringify(prev.metrics) !== JSON.stringify(curr.metrics);
    
    if (metricsChanged) {
        console.log(`Screenshot ${i} shows changes:`);
        if (prev.metrics.camera.zoom !== curr.metrics.camera.zoom) {
            console.log(`  Zoom: ${prev.metrics.camera.zoom} → ${curr.metrics.camera.zoom}`);
        }
        if (prev.metrics.entities.plantCount !== curr.metrics.entities.plantCount) {
            console.log(`  Plants: ${prev.metrics.entities.plantCount} → ${curr.metrics.entities.plantCount}`);
        }
    }
}

// Assert that most screenshots show meaningful changes (not identical states)
const changePercent = (changedCount / totalScreenshots) * 100;
expect(changePercent).toBeGreaterThan(50);
```

### Best Practices for Interaction Testing

1. **Wait for Render Frames**: Always wait for frames after interactions
   ```javascript
   await simulateKeyPress(page, 'Space');
   await waitForRenderFrames(page, 3); // Wait for game to process
   ```

2. **Capture Metrics with Screenshots**: Track game state for validation
   ```javascript
   const metrics = await getGameMetrics(page);
   await page.screenshot({ path: 'screenshot.png' });
   // Store metrics with screenshot for later analysis
   ```

3. **Use Descriptive Names**: Name screenshots based on interaction
   ```javascript
   await page.screenshot({ path: `${timestamp}-after-camera-pan.png` });
   ```

4. **Validate State Changes**: Assert that interactions had effect
   ```javascript
   const before = await getCameraState(page);
   await simulateMouseDrag(page, x1, y1, x2, y2);
   const after = await getCameraState(page);
   expect(after.position.x).not.toBe(before.position.x);
   ```

5. **Test Realistic Sequences**: Simulate actual gameplay
   ```javascript
   // Realistic: spawn → wait → grow → observe
   await spawnPlantAt(page, 25, 25);
   await advanceGameTime(page, 10);
   await page.screenshot({ path: 'grown-plant.png' });
   ```

6. **Handle Timing**: Respect game loop and animation timings
   ```javascript
   // Bad: await page.waitForTimeout(100); // Arbitrary
   // Good: await waitForRenderFrames(page, 5); // Deterministic
   ```

### Performance Considerations

- **Interaction Overhead**: Each interaction adds 16-50ms overhead
- **Screenshot Timing**: Wait 3-5 frames after interactions before capturing
- **State Queries**: Minimize `evaluate()` calls in tight loops
- **Batch Operations**: Group related interactions together

### Troubleshooting Interactions

**Clicks Not Registering**:
```javascript
// Ensure canvas coordinates are correct
const rect = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
});
console.log('Canvas rect:', rect);
```

**Camera Not Moving**:
```javascript
// Verify InputManager is capturing events
const hasInputManager = await page.evaluate(() => {
    return !!window.graphicsEngine?.inputManager;
});
console.log('InputManager available:', hasInputManager);
```

**Time Not Advancing**:
```javascript
// Check if time is paused
const timeState = await page.evaluate(() => {
    return {
        isPaused: window.graphicsEngine?.timeManager?.isPausedState(),
        timeScale: window.graphicsEngine?.timeManager?.getTimeScale()
    };
});
console.log('Time state:', timeState);
```

**Screenshots Look Identical**:
- Ensure interactions are actually changing game state
- Wait sufficient frames for render to complete
- Verify metrics show state changes even if visuals are subtle
- Consider increasing time advancement or zoom level for more visible changes

## Future Enhancements

Potential improvements for the framework:

1. **Real-time Screenshot Viewing**: Display captured screenshots in browser during testing
2. **Advanced Visual Diff**: Pixel-by-pixel comparison with heatmap generation
3. **Screenshot Annotations**: Add arrows, text overlays to screenshots
4. **Interaction Recording**: Record and replay interaction sequences
5. **Performance Profiling**: Integrate with Performance API for detailed metrics
6. **Video Recording**: Capture video sequences for complex interactions
7. **Automated Cleanup**: Configurable retention policies for old test results
8. **Touch Gesture Simulation**: Multi-touch gestures for mobile testing
9. **Accessibility Testing**: Keyboard-only navigation validation
10. **Visual Regression Detection**: Automated pixel diff with baseline images

## Related Documentation

- [Development Guidelines](dev-guidelines.md) - General development practices
- [Setup Verification](SETUP_VERIFICATION.md) - Initial setup and verification
- [Technical Documentation](technical_doc.md) - Architecture overview
- [Test Utils API](../tests/test-utils.js) - Full interaction utilities reference
