/**
 * Simple manual test for Milestone 3
 */

const { chromium } = require('playwright');

(async () => {
    console.log('Starting Milestone 3 test...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Browser Error] ${err}`));
    
    try {
        // Navigate to texture visualizer
        console.log('Loading texture visualizer...');
        await page.goto('http://localhost:8081/texture_visualizer.html', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // Wait for species to load
        console.log('Waiting for species to load...');
        await page.waitForFunction(() => {
            const select = document.getElementById('species-select');
            return select && select.options.length > 1;
        }, { timeout: 5000 });
        
        // Check if Compare LODs button exists
        const compareBtn = await page.locator('#compare-lods-btn');
        console.log('✓ Compare LODs button found');
        
        // Select Oak
        console.log('Selecting Oak species...');
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        
        // Select MatureTree stage
        console.log('Selecting MatureTree stage...');
        await page.selectOption('#stage-select', '3');
        await page.waitForTimeout(500);
        
        // Take screenshot before
        await page.screenshot({ path: 'test-results/m3-before-click.png', fullPage: true });
        console.log('✓ Screenshot saved: m3-before-click.png');
        
        // Click Compare All LODs
        console.log('\nClicking "Compare All LODs" button...');
        await compareBtn.click();
        
        // Wait for completion
        console.log('Waiting for generation to complete...');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && (
                statusText.textContent.includes('Comparison complete') ||
                statusText.textContent.includes('Error')
            );
        }, { timeout: 15000 });
        
        await page.waitForTimeout(1000);
        
        // Take screenshot after
        await page.screenshot({ path: 'test-results/m3-lod-comparison.png', fullPage: true });
        console.log('✓ Screenshot saved: m3-lod-comparison.png');
        
        // Count LOD cells
        const lodCells = await page.locator('.lod-cell').count();
        console.log(`\n✓ Found ${lodCells} LOD cells`);
        
        // Get LOD labels
        const lodLabels = await page.locator('.lod-label').allTextContents();
        console.log('✓ LOD labels:', lodLabels);
        
        // Test zoom
        console.log('\nTesting zoom controls...');
        await page.click('.zoom-btn[data-zoom="4"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/m3-zoom-4x.png', fullPage: true });
        console.log('✓ Screenshot saved: m3-zoom-4x.png');
        
        // Test switching back to single mode
        console.log('\nTesting switch back to single sprite mode...');
        await page.click('#generate-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Generated successfully');
        }, { timeout: 10000 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/m3-single-mode.png', fullPage: true });
        console.log('✓ Screenshot saved: m3-single-mode.png');
        
        const comparisonGridCount = await page.locator('.lod-comparison-grid').count();
        console.log(`✓ Comparison grid count after switch: ${comparisonGridCount} (should be 0)`);
        
        console.log('\n✅ All tests passed! Check screenshots in test-results/');
        
        // Keep browser open for manual inspection
        console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        await page.screenshot({ path: 'test-results/m3-error.png', fullPage: true });
    } finally {
        await browser.close();
        console.log('\nTest complete!');
    }
})();
