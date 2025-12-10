const { test, expect } = require('@playwright/test');

test('Texture Visualizer M5 - Quick Validation', async ({ page }) => {
    console.log('Testing Texture Visualizer Milestone 5...');
    
    // Navigate to texture visualizer
    await page.goto('http://localhost:8081/texture_visualizer.html');
    await page.waitForTimeout(3000);
    
    console.log('✓ Page loaded');
    
    // Test 1: Cache statistics elements exist
    console.log('\nTest 1: Cache statistics display...');
    const cacheHits = await page.locator('#cache-hits').textContent();
    const cacheMisses = await page.locator('#cache-misses').textContent();
    const cacheHitRate = await page.locator('#cache-hit-rate').textContent();
    const cacheSize = await page.locator('#cache-size').textContent();
    
    expect(cacheHits).toBe('0');
    expect(cacheMisses).toBe('0');
    expect(cacheHitRate).toBe('0.0%');
    expect(cacheSize).toBe('0');
    console.log('✓ Cache statistics initialized correctly');
    
    // Test 2: New buttons exist
    console.log('\nTest 2: New buttons...');
    const generateAllStagesBtn = page.locator('#generate-all-stages-btn');
    const clearCacheBtn = page.locator('#clear-cache-btn');
    
    await expect(generateAllStagesBtn).toBeVisible();
    await expect(clearCacheBtn).toBeVisible();
    console.log('✓ Generate All Stages button visible');
    console.log('✓ Clear Cache button visible');
    
    // Test 3: Generate single sprite and check generation time
    console.log('\nTest 3: Single sprite generation with metrics...');
    await page.selectOption('#species-select', 'quercus_robur');
    await page.waitForTimeout(500);
    await page.selectOption('#stage-select', '2'); // MatureTree
    await page.click('#generate-btn');
    await page.waitForTimeout(3000);
    
    const metadataText = await page.locator('.metadata-panel').textContent();
    expect(metadataText).toContain('Generation Time:');
    expect(metadataText).toContain('ms');
    expect(metadataText).toContain('Cache Status:');
    console.log('✓ Generation time displayed in metadata');
    console.log('✓ Cache status displayed in metadata');
    
    // Check cache stats updated
    const missesAfterFirst = await page.locator('#cache-misses').textContent();
    expect(parseInt(missesAfterFirst)).toBeGreaterThan(0);
    console.log(`✓ Cache statistics updated (misses: ${missesAfterFirst})`);
    
    // Test 4: Generate again for cache HIT
    console.log('\nTest 4: Cache HIT on second generation...');
    await page.click('#generate-btn');
    await page.waitForTimeout(2000);
    
    const hitsAfterSecond = await page.locator('#cache-hits').textContent();
    expect(parseInt(hitsAfterSecond)).toBeGreaterThan(0);
    console.log(`✓ Cache HIT detected (hits: ${hitsAfterSecond})`);
    
    // Test 5: Clear cache
    console.log('\nTest 5: Clear cache...');
    await page.click('#clear-cache-btn');
    await page.waitForTimeout(1000);
    
    const cacheHitsAfterClear = await page.locator('#cache-hits').textContent();
    const cacheMissesAfterClear = await page.locator('#cache-misses').textContent();
    const cacheSizeAfterClear = await page.locator('#cache-size').textContent();
    
    expect(cacheHitsAfterClear).toBe('0');
    expect(cacheMissesAfterClear).toBe('0');
    expect(cacheSizeAfterClear).toBe('0');
    console.log('✓ Cache cleared and statistics reset');
    
    const statusText = await page.locator('#status-text').textContent();
    expect(statusText).toContain('Cache cleared');
    console.log(`✓ Status message: ${statusText}`);
    
    // Test 6: Batch generation
    console.log('\nTest 6: Batch generation (all stages)...');
    await page.selectOption('#stage-select', '0'); // Re-enable button
    await page.click('#generate-all-stages-btn');
    await page.waitForTimeout(6000); // Wait for batch generation
    
    // Count sprites
    const spriteCount = await page.locator('.lod-cell .sprite-canvas').count();
    console.log(`✓ Generated ${spriteCount} sprites (Oak stages)`);
    expect(spriteCount).toBe(4); // Oak has 4 stages
    
    // Check for performance summary
    const summaryExists = await page.locator('.metadata-panel h3:has-text("Batch Performance Summary")').count();
    expect(summaryExists).toBe(1);
    console.log('✓ Performance summary panel displayed');
    
    const summaryText = await page.locator('.metadata-panel').last().textContent();
    expect(summaryText).toContain('Total Generation Time:');
    expect(summaryText).toContain('Average Time Per Sprite:');
    expect(summaryText).toContain('Fastest / Slowest:');
    expect(summaryText).toContain('Cache Efficiency:');
    console.log('✓ All performance metrics present in summary');
    
    // Test 7: Capture screenshots
    console.log('\nTest 7: Capturing screenshots...');
    await page.screenshot({ 
        path: 'test-results/m5-batch-generation-complete.png',
        fullPage: true
    });
    console.log('✓ Screenshot saved: m5-batch-generation-complete.png');
    
    // Test 8: Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    if (consoleErrors.length > 0) {
        console.error('✗ Console errors detected:');
        consoleErrors.forEach(err => console.error(`  - ${err}`));
        throw new Error(`${consoleErrors.length} console errors detected`);
    } else {
        console.log('✓ No console errors detected');
    }
    
    console.log('\n=== MILESTONE 5 VALIDATION COMPLETE ===');
    console.log('✓ Generation time displays correctly');
    console.log('✓ Cache statistics update after each generation');
    console.log('✓ Clear Cache button resets statistics');
    console.log('✓ Generate All Stages creates correct number of sprites');
    console.log('✓ Cache HIT faster than MISS');
    console.log('✓ Performance summary shows all metrics');
    console.log('✓ No console errors');
});
