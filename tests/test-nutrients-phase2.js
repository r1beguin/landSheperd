/**
 * Quick test for Phase 2 growth rate modifiers
 */

const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Loading test page...');
    await page.goto('http://localhost:8080/test_nutrients.html');
    
    console.log('Waiting for tests to complete...');
    await page.waitForSelector('#summary', { timeout: 15000 });
    
    // Get test results
    const summaryText = await page.locator('#summary').textContent();
    const passCount = await page.locator('#summary .pass').textContent();
    const failCount = await page.locator('#summary .fail').textContent();
    
    console.log('\n' + '='.repeat(60));
    console.log('NUTRIENT SYSTEM TEST RESULTS (Phase 1 + Phase 2)');
    console.log('='.repeat(60));
    console.log(summaryText.trim().replace(/\s+/g, ' '));
    console.log('='.repeat(60));
    
    // Get individual test results
    const testSections = await page.locator('.test-section').all();
    for (const section of testSections) {
        const title = await section.locator('.test-title').textContent();
        const status = await section.locator('.test-status').textContent();
        const color = status.includes('PASS') ? '\x1b[32m' : '\x1b[31m';
        console.log(`${color}${status}\x1b[0m ${title.replace(status, '').trim()}`);
    }
    
    console.log('='.repeat(60) + '\n');
    
    // Check if all tests passed
    const failMatch = failCount.match(/Failed: (\d+)/);
    const failures = failMatch ? parseInt(failMatch[1]) : 0;
    
    await browser.close();
    
    if (failures === 0) {
        console.log('\x1b[32m✓ ALL TESTS PASSED\x1b[0m');
        process.exit(0);
    } else {
        console.log(`\x1b[31m✗ ${failures} TEST(S) FAILED\x1b[0m`);
        process.exit(1);
    }
})();
