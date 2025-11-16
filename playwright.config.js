const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Land Shepherd verification
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  
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
    baseURL: 'http://localhost:8080',
    
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
    command: 'npx http-server -p 8080',
    port: 8080,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
