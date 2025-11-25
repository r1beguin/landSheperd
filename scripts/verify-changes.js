#!/usr/bin/env node

/**
 * Verification script for Land Shepherd
 * Runs automated tests and generates agent-parseable reports
 * 
 * Usage:
 *   node scripts/verify-changes.js                 - Run verification against baseline
 *   node scripts/verify-changes.js --baseline      - Save current state as baseline
 *   node scripts/verify-changes.js --verbose       - Show detailed output
 *   node scripts/verify-changes.js --interactive   - Run interactive testing mode
 *   node scripts/verify-changes.js --screenshot-only - Capture screenshots only
 *   node scripts/verify-changes.js --log-only      - Analyze logs only
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  serverPort: 8080,
  testTimeout: 30000,
  passThresholds: {
    maxConsoleErrors: 0,
    minFPS: 30, // Lower threshold for headless Chrome (uses software rendering)
    maxVisualDiffPercent: 40, // High threshold due to procedural generation
    maxLoadTimeMs: 3000,
    maxWarnings: 10
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const isBaseline = args.includes('--baseline');
const isVerbose = args.includes('--verbose');
const isInteractive = args.includes('--interactive');
const isScreenshotOnly = args.includes('--screenshot-only');
const isLogOnly = args.includes('--log-only');

// Ensure directories exist
function ensureDirs() {
  const dirs = [
    'test-results',
    'test-results/baseline',
    'test-results/latest',
    'test-results/interactive'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Run Playwright tests
function runTests() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      TEST_MODE: isBaseline ? 'baseline' : (isInteractive ? 'interactive' : 'verify'),
      TEST_VERBOSE: isVerbose ? 'true' : 'false',
      TEST_INTERACTIVE: isInteractive ? 'true' : 'false',
      TEST_SCREENSHOT_ONLY: isScreenshotOnly ? 'true' : 'false',
      TEST_LOG_ONLY: isLogOnly ? 'true' : 'false'
    };

    if (isInteractive) {
      console.log('🎮 Starting interactive testing mode...\n');
    } else if (isScreenshotOnly) {
      console.log('📸 Capturing screenshots only...\n');
    } else if (isLogOnly) {
      console.log('📝 Analyzing logs only...\n');
    } else {
      console.log('🚀 Starting Land Shepherd verification...\n');
    }
    
    const playwright = spawn('npx', ['playwright', 'test'], {
      env,
      stdio: 'inherit',
      shell: true
    });

    playwright.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    playwright.on('error', (err) => {
      reject(err);
    });
  });
}

// Generate final report
function generateReport() {
  const reportPath = path.join('test-results', 'latest', 'report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Report file not found. Tests may have failed to complete.');
    return false;
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION RESULTS');
  console.log('='.repeat(60) + '\n');
  
  console.log(`Status: ${report.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Session ID: ${report.session_id}\n`);
  
  console.log('Metrics:');
  console.log(`  Console Errors: ${report.metrics.console_errors} (max: ${CONFIG.passThresholds.maxConsoleErrors})`);
  console.log(`  Console Warnings: ${report.metrics.console_warnings} (max: ${CONFIG.passThresholds.maxWarnings})`);
  console.log(`  Average FPS: ${report.metrics.fps_average} (min: ${CONFIG.passThresholds.minFPS})`);
  console.log(`  Load Time: ${report.metrics.load_time_ms}ms (max: ${CONFIG.passThresholds.maxLoadTimeMs}ms)`);
  console.log(`  WebGL: ${report.metrics.webgl_context}\n`);
  
  if (report.visual && report.visual.pixel_difference_percent !== undefined) {
    console.log(`Visual Diff: ${report.visual.pixel_difference_percent}% (max: ${CONFIG.passThresholds.maxVisualDiffPercent}%)\n`);
  }
  
  if (report.recommendations && report.recommendations.length > 0) {
    console.log('Recommendations:');
    report.recommendations.forEach(rec => console.log(`  ${rec}`));
    console.log('');
  }
  
  console.log('Outputs:');
  console.log(`  Screenshot: ${report.visual.screenshot}`);
  console.log(`  Full Report: ${reportPath}`);
  if (report.visual.diff_from_baseline) {
    console.log(`  Visual Diff: ${report.visual.diff_from_baseline}`);
  }
  console.log('\n' + '='.repeat(60) + '\n');
  
  return report.status === 'PASS';
}

// Main execution
async function main() {
  try {
    ensureDirs();
    
    if (isBaseline) {
      console.log('📸 Creating new baseline...\n');
    }
    
    await runTests();
    
    if (isBaseline) {
      console.log('\n✅ Baseline created successfully!');
      console.log('Future runs will compare against this baseline.\n');
      process.exit(0);
    } else if (isInteractive) {
      console.log('\n✅ Interactive testing completed!');
      console.log('Results saved to test-results/interactive/\n');
      process.exit(0);
    } else if (isScreenshotOnly) {
      console.log('\n✅ Screenshots captured!');
      console.log('Saved to test-results/interactive/screenshots/\n');
      process.exit(0);
    } else if (isLogOnly) {
      console.log('\n✅ Log analysis completed!');
      console.log('Results saved to test-results/interactive/logs/\n');
      process.exit(0);
    } else {
      const passed = generateReport();
      process.exit(passed ? 0 : 1);
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();
