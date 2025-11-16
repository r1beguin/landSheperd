const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

// Configuration
const CONFIG = {
  passThresholds: {
    maxConsoleErrors: 0,
    minFPS: 30, // Lower threshold for headless Chrome (uses software rendering)
    maxVisualDiffPercent: 40, // High threshold due to procedural generation
    maxLoadTimeMs: 3000,
    maxWarnings: 10
  },
  waitForInitMs: 2000, // Wait for WebGL initialization
  fpsTestDurationMs: 3000 // Measure FPS over 3 seconds
};

// Helper to generate session ID
function generateSessionId() {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
  return `${date}-${time}`;
}

// Helper to compare images
function compareImages(img1Path, img2Path, diffPath) {
  if (!fs.existsSync(img1Path) || !fs.existsSync(img2Path)) {
    return null;
  }

  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));
  
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercent = (numDiffPixels / totalPixels) * 100;

  return {
    numDiffPixels,
    totalPixels,
    diffPercent: parseFloat(diffPercent.toFixed(2))
  };
}

test('Land Shepherd Verification', async ({ page }) => {
  const sessionId = generateSessionId();
  const isBaseline = process.env.TEST_MODE === 'baseline';
  const isVerbose = process.env.TEST_VERBOSE === 'true';
  
  const baseDir = isBaseline ? '.baseline' : `test-results/latest`;
  
  // Ensure output directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // Capture console messages
  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const logEntry = { type, text, timestamp: new Date().toISOString() };
    
    consoleLogs.push(logEntry);
    
    if (type === 'error') {
      consoleErrors.push(logEntry);
      if (isVerbose) console.error(`[ERROR] ${text}`);
    } else if (type === 'warning') {
      consoleWarnings.push(logEntry);
      if (isVerbose) console.warn(`[WARN] ${text}`);
    } else if (isVerbose) {
      console.log(`[${type}] ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    const errorEntry = {
      type: 'pageerror',
      text: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    consoleErrors.push(errorEntry);
    if (isVerbose) console.error('[PAGE ERROR]', error.message);
  });

  // Navigate and measure load time
  const startTime = Date.now();
  await page.goto('/', { waitUntil: 'networkidle' });
  const loadTime = Date.now() - startTime;

  if (isVerbose) console.log(`Page loaded in ${loadTime}ms`);

  // Wait for WebGL initialization
  await page.waitForTimeout(CONFIG.waitForInitMs);

  // Check WebGL context
  const webglStatus = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'no-canvas';
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    return gl ? 'ok' : 'failed';
  });

  if (isVerbose) console.log(`WebGL status: ${webglStatus}`);

  // Measure FPS
  const fpsData = await page.evaluate((duration) => {
    return new Promise((resolve) => {
      const frames = [];
      let lastTime = performance.now();
      let totalFrames = 0;

      function measureFrame(currentTime) {
        const delta = currentTime - lastTime;
        if (delta > 0) {
          const fps = 1000 / delta;
          frames.push(fps);
          totalFrames++;
        }
        lastTime = currentTime;

        if (performance.now() - startTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          const avgFps = frames.reduce((a, b) => a + b, 0) / frames.length;
          const minFps = Math.min(...frames);
          const maxFps = Math.max(...frames);
          resolve({
            average: Math.round(avgFps),
            min: Math.round(minFps),
            max: Math.round(maxFps),
            samples: totalFrames
          });
        }
      }

      const startTime = performance.now();
      requestAnimationFrame(measureFrame);
    });
  }, CONFIG.fpsTestDurationMs);

  if (isVerbose) {
    console.log(`FPS - Avg: ${fpsData.average}, Min: ${fpsData.min}, Max: ${fpsData.max}`);
  }

  // Take screenshot
  const screenshotPath = path.join(baseDir, 'screenshot.png');
  await page.screenshot({ 
    path: screenshotPath,
    fullPage: false
  });

  if (isVerbose) console.log(`Screenshot saved to ${screenshotPath}`);

  // Visual comparison (only if not creating baseline)
  let visualDiff = null;
  if (!isBaseline) {
    const baselinePath = path.resolve('.baseline/screenshot.png');
    const diffPath = path.join(baseDir, 'diff.png');
    
    if (fs.existsSync(baselinePath)) {
      visualDiff = compareImages(baselinePath, screenshotPath, diffPath);
      if (isVerbose && visualDiff) {
        console.log(`Visual diff: ${visualDiff.diffPercent}%`);
      }
    } else if (isVerbose) {
      console.log(`No baseline found at ${baselinePath} - skipping visual comparison`);
    }
  }

  // Save console output
  const consoleOutputPath = path.join(baseDir, 'console.json');
  fs.writeFileSync(consoleOutputPath, JSON.stringify({
    logs: consoleLogs,
    errors: consoleErrors,
    warnings: consoleWarnings
  }, null, 2));

  // Determine pass/fail status
  const metrics = {
    console_errors: consoleErrors.length,
    console_warnings: consoleWarnings.length,
    fps_average: fpsData.average,
    fps_min: fpsData.min,
    fps_max: fpsData.max,
    load_time_ms: loadTime,
    webgl_context: webglStatus
  };

  const recommendations = [];
  let status = 'PASS';

  // Check console errors
  if (metrics.console_errors > CONFIG.passThresholds.maxConsoleErrors) {
    status = 'FAIL';
    recommendations.push(`❌ ${metrics.console_errors} console errors found (max: ${CONFIG.passThresholds.maxConsoleErrors})`);
  } else {
    recommendations.push(`✓ No console errors detected`);
  }

  // Check warnings
  if (metrics.console_warnings > CONFIG.passThresholds.maxWarnings) {
    recommendations.push(`⚠ ${metrics.console_warnings} warnings found (max: ${CONFIG.passThresholds.maxWarnings})`);
  } else if (metrics.console_warnings > 0) {
    recommendations.push(`✓ ${metrics.console_warnings} warnings (within threshold)`);
  }

  // Check FPS
  if (metrics.fps_average < CONFIG.passThresholds.minFPS) {
    status = 'FAIL';
    recommendations.push(`❌ FPS ${metrics.fps_average} below target (min: ${CONFIG.passThresholds.minFPS})`);
  } else {
    recommendations.push(`✓ FPS ${metrics.fps_average} meets target (${CONFIG.passThresholds.minFPS}+)`);
  }

  // Check load time
  if (metrics.load_time_ms > CONFIG.passThresholds.maxLoadTimeMs) {
    recommendations.push(`⚠ Load time ${metrics.load_time_ms}ms exceeds target (${CONFIG.passThresholds.maxLoadTimeMs}ms)`);
  } else {
    recommendations.push(`✓ Load time ${metrics.load_time_ms}ms within target`);
  }

  // Check WebGL
  if (webglStatus !== 'ok') {
    status = 'FAIL';
    recommendations.push(`❌ WebGL initialization failed: ${webglStatus}`);
  } else {
    recommendations.push(`✓ WebGL initialized successfully`);
  }

  // Check visual diff
  if (visualDiff && visualDiff.diffPercent > CONFIG.passThresholds.maxVisualDiffPercent) {
    status = 'FAIL';
    recommendations.push(`❌ Visual diff ${visualDiff.diffPercent}% exceeds threshold (${CONFIG.passThresholds.maxVisualDiffPercent}%)`);
  } else if (visualDiff) {
    recommendations.push(`✓ Visual diff ${visualDiff.diffPercent}% within threshold`);
  }

  // Generate report
  const report = {
    status,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    metrics,
    visual: {
      screenshot: screenshotPath,
      diff_from_baseline: visualDiff ? path.join(baseDir, 'diff.png') : null,
      pixel_difference_percent: visualDiff ? visualDiff.diffPercent : null,
      baseline_exists: fs.existsSync(path.resolve('.baseline/screenshot.png'))
    },
    console_output: consoleLogs.slice(0, 50), // First 50 entries in report
    console_summary: {
      total_logs: consoleLogs.length,
      errors: consoleErrors.length,
      warnings: consoleWarnings.length
    },
    recommendations,
    config: CONFIG.passThresholds
  };

  const reportPath = path.join(baseDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Baseline files are already in .baseline directory (baseDir)
  // No need to copy - they're already there!

  // Assertions for test framework
  expect(consoleErrors.length).toBeLessThanOrEqual(CONFIG.passThresholds.maxConsoleErrors);
  expect(webglStatus).toBe('ok');
  expect(fpsData.average).toBeGreaterThanOrEqual(CONFIG.passThresholds.minFPS);
  
  if (visualDiff) {
    expect(visualDiff.diffPercent).toBeLessThanOrEqual(CONFIG.passThresholds.maxVisualDiffPercent);
  }
});
