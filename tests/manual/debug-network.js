/**
 * Network debugging script for Texture Visualizer
 */

const playwright = require('playwright');

(async () => {
    console.log('Checking for missing resources...\n');
    
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const failedRequests = [];
    
    // Capture network failures
    page.on('requestfailed', request => {
        failedRequests.push({
            url: request.url(),
            failure: request.failure().errorText
        });
    });
    
    page.on('response', response => {
        if (response.status() >= 400) {
            failedRequests.push({
                url: response.url(),
                status: response.status()
            });
        }
    });
    
    await page.goto('http://localhost:8081/texture_visualizer.html');
    await page.waitForTimeout(3000);
    
    console.log('Failed requests:');
    if (failedRequests.length === 0) {
        console.log('  None - all resources loaded successfully!');
    } else {
        failedRequests.forEach(req => {
            console.log(`  ${req.url}`);
            console.log(`    ${req.status ? `Status: ${req.status}` : `Error: ${req.failure}`}`);
        });
    }
    
    await browser.close();
    console.log('\nDone.');
})();
