const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Land Shepherd verification
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  
  // Use different test files based on mode
  testMatch: process.env.TEST_DECOMP_OM === 'true'
    ? '**/decomposition-om.spec.js'
    : process.env.TEST_BALANCE === 'true'
    ? '**/ecosystem-balance.spec.js'
    : process.env.TEST_CONTEXT_MENU === 'true'
    ? '**/context-menu-debug.spec.js'
    : process.env.TEST_FUNCTIONAL === 'true'
    ? '**/context-menu-functional.spec.js'
    : process.env.TEST_OVERLAY === 'true'
    ? '**/overlay-cycling.spec.js'
    : process.env.TEST_WEATHER === 'true'
    ? '**/weather-debug.spec.js'
    : process.env.TEST_WEATHER_SOIL === 'true'
    ? '**/weather-soil-effects.spec.js'
    : process.env.TEST_NITROGEN_REGEN === 'true'
    ? '**/nitrogen-regeneration.spec.js'
    : process.env.TEST_SPLASH === 'true'
    ? '**/splash-particles-debug.spec.js'
    : process.env.TEST_SEED === 'true'
    ? '**/seed-system.spec.js'
    : process.env.TEST_SEED_PERSISTENCE === 'true'
    ? '**/seed-persistence.spec.js'
    : process.env.TEST_OAK_CANOPY === 'true'
    ? '**/oak-canopy-cropping.spec.js'
    : process.env.TEST_MULTI_LAYER === 'true'
    ? '**/multi-layer-simple.spec.js'
    : process.env.TEST_INTERACTIVE === 'true' || 
      process.env.TEST_SCREENSHOT_ONLY === 'true' || 
      process.env.TEST_LOG_ONLY === 'true'
    ? '**/interactive.spec.js'
    : '**/verify.spec.js',
  
  // Test timeout
  timeout: 30000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000
  },
  
  // Run tests in files in parallel
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // No parallel workers for consistent timing measurements
  workers: 1,
  
  // Reporter to use
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/latest/test-results.json' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for page.goto()
    baseURL: 'http://localhost:8081',
    
    // Collect trace on first retry of failed test
    trace: 'retain-on-failure',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Emulate device pixel ratio
    deviceScaleFactor: 1,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
  },

  // Configure projects for different browsers (use only Chromium for now)
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional args for headless WebGL
        launchOptions: {
          args: [
            '--use-gl=swiftshader',
            '--disable-gpu-sandbox',
            '--enable-webgl',
            '--enable-accelerated-2d-canvas'
          ]
        }
      },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npx http-server -p 8081',
    port: 8081,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
