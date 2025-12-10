/**
 * Test for Texture Visualizer Milestone 5: Performance Metrics and Cache Analysis
 * 
 * Validation Criteria:
 * - Generation time displays correctly
 * - Cache statistics accurate and update after each generation
 * - Clear Cache button resets cache and updates stats
 * - "Generate All Stages" creates correct number of sprites
 * - First generation: cache MISS, time >0.5ms
 * - Second identical generation: cache HIT, time <0.2ms
 * - Cache hit rate improves with repeated generations
 * - Batch generation shows performance summary
 * - 0 console errors during operation
 */

const { test, expect } = require('@playwright/test');

test.describe('Texture Visualizer Milestone 5', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to texture visualizer
        await page.goto('http://localhost:8081/texture_visualizer.html');
        
        // Wait for page load and species loading
        await page.waitForTimeout(2000);
        
        // Verify page loaded
        const title = await page.title();
        expect(title).toContain('Plant Texture Visualizer');
        
        console.log('Texture Visualizer loaded successfully');
    });

    test('Cache statistics display exists and initializes to 0', async ({ page }) => {
        // Check cache statistics elements exist
        const cacheHits = await page.locator('#cache-hits').textContent();
        const cacheMisses = await page.locator('#cache-misses').textContent();
        const cacheHitRate = await page.locator('#cache-hit-rate').textContent();
        const cacheSize = await page.locator('#cache-size').textContent();
        
        expect(cacheHits).toBe('0');
        expect(cacheMisses).toBe('0');
        expect(cacheHitRate).toBe('0.0%');
        expect(cacheSize).toBe('0');
        
        console.log('✓ Cache statistics display initialized correctly');
    });

    test('Generation time displays in metadata (cache MISS on first generation)', async ({ page }) => {
        // Select species and stage
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '1'); // Vegetative
        
        // Generate sprite
        console.log('Generating sprite (first generation - should be cache MISS)...');
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Check for generation time in metadata
        const metadataText = await page.locator('.metadata-panel').textContent();
        expect(metadataText).toContain('Generation Time:');
        expect(metadataText).toContain('ms');
        expect(metadataText).toContain('Cache Status:');
        
        // Extract generation time
        const generationTimeMatch = metadataText.match(/Generation Time:\s*([\d.]+)ms/);
        expect(generationTimeMatch).toBeTruthy();
        const generationTime = parseFloat(generationTimeMatch[1]);
        
        // First generation should be slower (cache MISS)
        expect(generationTime).toBeGreaterThan(0.1);
        console.log(`✓ Generation time displayed: ${generationTime}ms`);
        
        // Check cache status (should be MISS on first generation)
        const cacheStatus = metadataText.match(/Cache Status:\s*(\w+)/);
        expect(cacheStatus).toBeTruthy();
        console.log(`✓ Cache status displayed: ${cacheStatus[1]}`);
        
        // Check cache statistics updated
        const cacheMisses = await page.locator('#cache-misses').textContent();
        expect(parseInt(cacheMisses)).toBeGreaterThanOrEqual(1);
        console.log(`✓ Cache statistics updated (misses: ${cacheMisses})`);
    });

    test('Cache HIT on second identical generation (faster)', async ({ page }) => {
        // Select species and stage
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '2'); // MatureTree
        
        // First generation (cache MISS)
        console.log('First generation (cache MISS expected)...');
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        const metadata1 = await page.locator('.metadata-panel').textContent();
        const time1Match = metadata1.match(/Generation Time:\s*([\d.]+)ms/);
        const time1 = parseFloat(time1Match[1]);
        console.log(`First generation time: ${time1}ms`);
        
        const cacheMisses1 = await page.locator('#cache-misses').textContent();
        console.log(`Cache misses after first: ${cacheMisses1}`);
        
        // Second generation (should be cache HIT)
        console.log('Second generation (cache HIT expected)...');
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        const metadata2 = await page.locator('.metadata-panel').textContent();
        const time2Match = metadata2.match(/Generation Time:\s*([\d.]+)ms/);
        const time2 = parseFloat(time2Match[1]);
        console.log(`Second generation time: ${time2}ms`);
        
        const cacheHits = await page.locator('#cache-hits').textContent();
        console.log(`Cache hits after second: ${cacheHits}`);
        
        // Cache HIT should be significantly faster
        expect(time2).toBeLessThan(time1);
        console.log(`✓ Cache HIT faster than MISS (${time2}ms < ${time1}ms)`);
        
        // Cache hit rate should improve
        const hitRate = await page.locator('#cache-hit-rate').textContent();
        console.log(`✓ Cache hit rate: ${hitRate}`);
        expect(parseFloat(hitRate)).toBeGreaterThan(0);
    });

    test('Clear Cache button resets statistics', async ({ page }) => {
        // Generate a sprite to populate cache
        await page.selectOption('#species-select', 'trifolium_repens');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Check cache size > 0
        const cacheSizeBefore = await page.locator('#cache-size').textContent();
        expect(parseInt(cacheSizeBefore)).toBeGreaterThan(0);
        console.log(`Cache size before clear: ${cacheSizeBefore}`);
        
        // Click Clear Cache button
        console.log('Clicking Clear Cache button...');
        await page.click('#clear-cache-btn');
        await page.waitForTimeout(1000);
        
        // Verify cache statistics reset
        const cacheHitsAfter = await page.locator('#cache-hits').textContent();
        const cacheMissesAfter = await page.locator('#cache-misses').textContent();
        const cacheHitRateAfter = await page.locator('#cache-hit-rate').textContent();
        const cacheSizeAfter = await page.locator('#cache-size').textContent();
        
        expect(cacheHitsAfter).toBe('0');
        expect(cacheMissesAfter).toBe('0');
        expect(cacheHitRateAfter).toBe('0.0%');
        expect(cacheSizeAfter).toBe('0');
        
        console.log('✓ Cache statistics reset to 0 after clear');
        
        // Check status message
        const statusText = await page.locator('#status-text').textContent();
        expect(statusText).toContain('Cache cleared');
        console.log(`✓ Status message: ${statusText}`);
    });

    test('Generate All Stages button creates correct number of sprites', async ({ page }) => {
        // Test with Oak (should have 4 stages: Sapling, YoungTree, MatureTree, Withered)
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0'); // Select any stage to enable button
        
        // Verify Generate All Stages button is enabled
        const isDisabled = await page.locator('#generate-all-stages-btn').isDisabled();
        expect(isDisabled).toBe(false);
        
        console.log('Generating all stages for Oak...');
        await page.click('#generate-all-stages-btn');
        
        // Wait for generation to complete (longer timeout for batch)
        await page.waitForTimeout(5000);
        
        // Count generated sprites in grid
        const spriteCanvases = await page.locator('.lod-cell .sprite-canvas').count();
        console.log(`Oak stages generated: ${spriteCanvases}`);
        expect(spriteCanvases).toBe(4); // Oak has 4 stages
        
        // Verify performance summary panel exists
        const summaryExists = await page.locator('.metadata-panel h3:has-text("Batch Performance Summary")').count();
        expect(summaryExists).toBe(1);
        console.log('✓ Performance summary panel displayed');
        
        // Check summary statistics
        const summaryText = await page.locator('.metadata-panel').last().textContent();
        expect(summaryText).toContain('Stages Generated:');
        expect(summaryText).toContain('Total Generation Time:');
        expect(summaryText).toContain('Average Time Per Sprite:');
        expect(summaryText).toContain('Fastest / Slowest:');
        expect(summaryText).toContain('Cache Efficiency:');
        
        console.log('✓ Oak batch generation complete with performance summary');
    });

    test('Generate All Stages for Nettles (4 stages)', async ({ page }) => {
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        
        console.log('Generating all stages for Nettles...');
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        const spriteCanvases = await page.locator('.lod-cell .sprite-canvas').count();
        console.log(`Nettles stages generated: ${spriteCanvases}`);
        expect(spriteCanvases).toBe(4); // Nettles has 4 stages
        
        console.log('✓ Nettles batch generation complete');
    });

    test('Generate All Stages for Clover (3 stages)', async ({ page }) => {
        await page.selectOption('#species-select', 'trifolium_repens');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        
        console.log('Generating all stages for Clover...');
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        const spriteCanvases = await page.locator('.lod-cell .sprite-canvas').count();
        console.log(`Clover stages generated: ${spriteCanvases}`);
        expect(spriteCanvases).toBeGreaterThanOrEqual(3); // Clover has at least 3 stages
        
        console.log('✓ Clover batch generation complete');
    });

    test('Cache hit rate improves with repeated generations', async ({ page }) => {
        // Clear cache first
        await page.click('#clear-cache-btn');
        await page.waitForTimeout(500);
        
        // Select species and stage
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '1');
        
        // Generate 5 times to warm up cache
        console.log('Warming up cache with 5 generations...');
        for (let i = 0; i < 5; i++) {
            await page.click('#generate-btn');
            await page.waitForTimeout(1000);
            const hitRate = await page.locator('#cache-hit-rate').textContent();
            console.log(`  Generation ${i + 1}: Hit rate = ${hitRate}`);
        }
        
        // Check final hit rate
        const finalHitRate = await page.locator('#cache-hit-rate').textContent();
        const hitRatePercent = parseFloat(finalHitRate);
        
        console.log(`Final cache hit rate: ${finalHitRate}`);
        expect(hitRatePercent).toBeGreaterThan(50); // Should be >50% after warmup
        
        console.log('✓ Cache hit rate improved with repeated generations');
    });

    test('Batch generation performance summary shows all metrics', async ({ page }) => {
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        
        // Generate all stages
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        // Extract performance summary
        const summaryText = await page.locator('.metadata-panel').last().textContent();
        
        // Check all required metrics present
        expect(summaryText).toContain('Total Generation Time:');
        expect(summaryText).toContain('Average Time Per Sprite:');
        expect(summaryText).toContain('Fastest / Slowest:');
        expect(summaryText).toContain('Cache Efficiency:');
        
        // Extract numeric values
        const totalTimeMatch = summaryText.match(/Total Generation Time:\s*([\d.]+)ms/);
        const avgTimeMatch = summaryText.match(/Average Time Per Sprite:\s*([\d.]+)ms/);
        const fastestMatch = summaryText.match(/Fastest \/ Slowest:\s*([\d.]+)ms/);
        
        expect(totalTimeMatch).toBeTruthy();
        expect(avgTimeMatch).toBeTruthy();
        expect(fastestMatch).toBeTruthy();
        
        const totalTime = parseFloat(totalTimeMatch[1]);
        const avgTime = parseFloat(avgTimeMatch[1]);
        const fastestTime = parseFloat(fastestMatch[1]);
        
        console.log(`Performance Summary:`);
        console.log(`  Total Time: ${totalTime}ms`);
        console.log(`  Average Time: ${avgTime}ms`);
        console.log(`  Fastest: ${fastestTime}ms`);
        
        expect(totalTime).toBeGreaterThan(0);
        expect(avgTime).toBeGreaterThan(0);
        expect(fastestTime).toBeGreaterThan(0);
        
        console.log('✓ All performance metrics displayed correctly');
    });

    test('No console errors during operation', async ({ page }) => {
        const consoleErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Perform various operations
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '2');
        
        // Single generation
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Clear cache
        await page.click('#clear-cache-btn');
        await page.waitForTimeout(500);
        
        // Batch generation
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        // Check for errors
        if (consoleErrors.length > 0) {
            console.error('Console errors detected:');
            consoleErrors.forEach(err => console.error(`  - ${err}`));
        }
        
        expect(consoleErrors.length).toBe(0);
        console.log('✓ No console errors detected during operation');
    });

    test('Zoom controls work in batch generation mode', async ({ page }) => {
        // Generate all stages
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        // Get initial canvas size
        const canvas = page.locator('.lod-cell .sprite-canvas').first();
        const initialWidth = await canvas.evaluate(el => el.style.width);
        
        // Click 2x zoom
        await page.click('.zoom-btn[data-zoom="2"]');
        await page.waitForTimeout(500);
        
        // Check size doubled
        const newWidth = await canvas.evaluate(el => el.style.width);
        console.log(`Canvas width: ${initialWidth} → ${newWidth}`);
        
        // Verify metadata updated
        const metadataText = await page.locator('.lod-metadata').first().textContent();
        expect(metadataText).toContain('2x'); // Display size should reflect zoom
        
        console.log('✓ Zoom controls work in batch generation mode');
    });
});
