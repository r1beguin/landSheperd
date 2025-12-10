/**
 * Cache testing for Milestone 3
 */

const { chromium } = require('playwright');

(async () => {
    console.log('Starting Milestone 3 cache test...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    let consoleLogs = [];
    
    // Capture console
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log(`[Browser] ${text}`);
    });
    
    try {
        // Navigate to texture visualizer
        console.log('Loading texture visualizer...');
        await page.goto('http://localhost:8081/texture_visualizer.html', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // Wait for species to load
        await page.waitForFunction(() => {
            const select = document.getElementById('species-select');
            return select && select.options.length > 1;
        }, { timeout: 5000 });
        
        // Select Oak MatureTree
        await page.selectOption('#species-select', 'quercus_robur');
        await page.selectOption('#stage-select', '3');
        await page.waitForTimeout(500);
        
        // First comparison - should be cache misses
        console.log('\n=== FIRST COMPARISON (should be cache MISSES) ===');
        consoleLogs = [];
        await page.click('#compare-lods-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Comparison complete');
        }, { timeout: 15000 });
        
        const firstMisses = consoleLogs.filter(log => log.includes('Cache: MISS')).length;
        const firstHits = consoleLogs.filter(log => log.includes('Cache: HIT')).length;
        console.log(`\n✓ First comparison: ${firstMisses} MISS, ${firstHits} HIT`);
        
        await page.waitForTimeout(1000);
        
        // Second comparison - should be cache hits
        console.log('\n=== SECOND COMPARISON (should be cache HITS) ===');
        consoleLogs = [];
        await page.click('#compare-lods-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Comparison complete');
        }, { timeout: 15000 });
        
        const secondMisses = consoleLogs.filter(log => log.includes('Cache: MISS')).length;
        const secondHits = consoleLogs.filter(log => log.includes('Cache: HIT')).length;
        console.log(`\n✓ Second comparison: ${secondMisses} MISS, ${secondHits} HIT`);
        
        // Verify cache is working
        if (firstMisses === 4 && firstHits === 0) {
            console.log('\n✅ PASS: First generation correctly showed all cache misses');
        } else {
            console.log('\n⚠ WARNING: First generation expected 4 misses, 0 hits');
        }
        
        if (secondHits === 4 && secondMisses === 0) {
            console.log('✅ PASS: Second generation correctly showed all cache hits');
        } else {
            console.log('⚠ WARNING: Second generation expected 0 misses, 4 hits');
        }
        
        // Check cache status in UI
        const cacheStatuses = await page.locator('.lod-metadata-row:has-text("Cache Status:")').all();
        console.log(`\n✓ Found ${cacheStatuses.length} cache status displays`);
        
        for (let i = 0; i < cacheStatuses.length; i++) {
            const text = await cacheStatuses[i].textContent();
            console.log(`  LOD ${i + 1}: ${text.trim()}`);
        }
        
        await page.screenshot({ path: 'test-results/m3-cache-test.png', fullPage: true });
        console.log('\n✓ Screenshot saved: m3-cache-test.png');
        
        console.log('\n✅ Cache test complete!');
        
        // Keep browser open for manual inspection
        console.log('\nBrowser will stay open for 10 seconds...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        await browser.close();
        console.log('\nTest complete!');
    }
})();
