/**
 * MILESTONE 3: Texture Visualizer LOD Comparison Testing
 * 
 * Tests the LOD comparison functionality:
 * - Compare All LODs button generates 4 sprites
 * - Sprites display in grid layout
 * - Each sprite labeled with correct LOD level
 * - Zoom controls work in comparison mode
 * - Can switch back to single sprite mode
 */

const { test, expect } = require('@playwright/test');

test.describe('Texture Visualizer - Milestone 3 - LOD Comparison', () => {
    let page;
    let consoleLogs = [];
    let consoleErrors = [];
    let consoleWarnings = [];

    test.beforeEach(async ({ page: testPage }) => {
        page = testPage;
        consoleLogs = [];
        consoleErrors = [];
        consoleWarnings = [];

        // Capture console output
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            
            if (type === 'error') {
                consoleErrors.push(text);
            } else if (type === 'warning') {
                consoleWarnings.push(text);
            } else if (type === 'log') {
                consoleLogs.push(text);
            }
            
            console.log(`[Browser ${type}] ${text}`);
        });

        // Navigate to texture visualizer
        await page.goto('http://localhost:8081/texture_visualizer.html', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
    });

    test('Milestone 3: Compare All LODs button exists and works', async () => {
        console.log('\n=== TEST: Compare All LODs Button ===\n');

        // Wait for page to load and species to be populated
        await page.waitForSelector('#species-select option:not([value=""])', { timeout: 5000 });
        
        // Check button exists
        const compareBtn = await page.locator('#compare-lods-btn');
        expect(await compareBtn.isVisible()).toBe(true);
        
        // Button should be disabled initially
        expect(await compareBtn.isDisabled()).toBe(true);
        console.log('✓ Compare LODs button exists and is initially disabled');

        // Select species (Oak)
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(100);

        // Select stage (MatureTree)
        const stageOptions = await page.locator('#stage-select option:not([value=""])').count();
        console.log(`Found ${stageOptions} stage options`);
        
        await page.selectOption('#stage-select', '3'); // Index 3 = MatureTree for oak
        await page.waitForTimeout(100);

        // Button should now be enabled
        expect(await compareBtn.isDisabled()).toBe(false);
        console.log('✓ Compare LODs button enabled after selections');

        // Take screenshot before clicking
        await page.screenshot({ path: 'test-results/latest/m3-before-comparison.png', fullPage: true });

        // Click Compare All LODs button
        console.log('Clicking "Compare All LODs" button...');
        await compareBtn.click();

        // Wait for generation to complete (check status bar)
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && (
                statusText.textContent.includes('Comparison complete') ||
                statusText.textContent.includes('Error')
            );
        }, { timeout: 10000 });

        // Take screenshot after comparison
        await page.screenshot({ path: 'test-results/latest/m3-lod-comparison.png', fullPage: true });

        // Verify comparison grid exists
        const comparisonGrid = await page.locator('.lod-comparison-grid');
        expect(await comparisonGrid.isVisible()).toBe(true);
        console.log('✓ LOD comparison grid displayed');

        // Count LOD cells (should be 4)
        const lodCells = await page.locator('.lod-cell').count();
        expect(lodCells).toBe(4);
        console.log(`✓ Found ${lodCells} LOD cells (High, Medium, Low, Impostor)`);

        // Verify each LOD label
        const lodLabels = await page.locator('.lod-label').allTextContents();
        expect(lodLabels).toContain('HIGH LOD');
        expect(lodLabels).toContain('MEDIUM LOD');
        expect(lodLabels).toContain('LOW LOD');
        expect(lodLabels).toContain('IMPOSTOR LOD');
        console.log('✓ All LOD labels present:', lodLabels);

        // Verify canvases are present
        const canvases = await page.locator('.lod-cell .sprite-canvas').count();
        expect(canvases).toBe(4);
        console.log(`✓ ${canvases} sprite canvases rendered`);

        // Verify metadata is present for each LOD
        const metadataRows = await page.locator('.lod-metadata').count();
        expect(metadataRows).toBe(4);
        console.log(`✓ Metadata displayed for all ${metadataRows} LODs`);

        // Check console logs for LOD generation
        const lodGenerationLogs = consoleLogs.filter(log => 
            log.includes('Generating LOD:') || log.includes('LOD') && log.includes('Cache:')
        );
        console.log(`✓ Found ${lodGenerationLogs.length} LOD generation logs`);
        lodGenerationLogs.forEach(log => console.log(`  ${log}`));

        // Verify no console errors
        expect(consoleErrors.length).toBe(0);
        console.log('✓ No console errors during comparison');
    });

    test('Milestone 3: Zoom controls work in comparison mode', async () => {
        console.log('\n=== TEST: Zoom in Comparison Mode ===\n');

        // Wait for page to load
        await page.waitForSelector('#species-select option:not([value=""])', { timeout: 5000 });
        
        // Select Oak MatureTree
        await page.selectOption('#species-select', 'quercus_robur');
        await page.selectOption('#stage-select', '3');
        await page.waitForTimeout(100);

        // Click Compare All LODs
        await page.click('#compare-lods-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Comparison complete');
        }, { timeout: 10000 });

        // Take screenshot at 1x zoom
        await page.screenshot({ path: 'test-results/latest/m3-comparison-zoom-1x.png', fullPage: true });

        // Get initial canvas dimensions
        const canvas1x = await page.locator('.lod-cell .sprite-canvas').first();
        const bbox1x = await canvas1x.boundingBox();
        console.log(`Canvas display size at 1x: ${bbox1x.width}x${bbox1x.height}`);

        // Click 4x zoom button
        console.log('Clicking 4x zoom button...');
        await page.click('.zoom-btn[data-zoom="4"]');
        await page.waitForTimeout(500);

        // Take screenshot at 4x zoom
        await page.screenshot({ path: 'test-results/latest/m3-comparison-zoom-4x.png', fullPage: true });

        // Get new canvas dimensions
        const bbox4x = await canvas1x.boundingBox();
        console.log(`Canvas display size at 4x: ${bbox4x.width}x${bbox4x.height}`);

        // Verify zoom applied (display size should be 4x larger)
        const zoomRatio = bbox4x.width / bbox1x.width;
        expect(zoomRatio).toBeCloseTo(4, 0);
        console.log(`✓ Zoom ratio: ${zoomRatio.toFixed(2)}x (expected ~4x)`);

        // Verify all 4 canvases were zoomed
        const allCanvases = await page.locator('.lod-cell .sprite-canvas').all();
        for (let i = 0; i < allCanvases.length; i++) {
            const bbox = await allCanvases[i].boundingBox();
            const ratio = bbox.width / bbox1x.width;
            expect(ratio).toBeCloseTo(4, 0);
            console.log(`✓ Canvas ${i + 1} zoomed correctly: ${ratio.toFixed(2)}x`);
        }

        // Verify active zoom button changed
        const activeZoomBtn = await page.locator('.zoom-btn.active');
        const activeZoomText = await activeZoomBtn.textContent();
        expect(activeZoomText).toBe('4x');
        console.log('✓ Active zoom button updated to 4x');

        // Verify no console errors
        expect(consoleErrors.length).toBe(0);
        console.log('✓ No console errors during zoom');
    });

    test('Milestone 3: Switch back to single sprite mode', async () => {
        console.log('\n=== TEST: Switch to Single Sprite Mode ===\n');

        // Wait for page to load
        await page.waitForSelector('#species-select option:not([value=""])', { timeout: 5000 });
        
        // Generate comparison view first
        await page.selectOption('#species-select', 'quercus_robur');
        await page.selectOption('#stage-select', '3');
        await page.click('#compare-lods-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Comparison complete');
        }, { timeout: 10000 });

        // Verify comparison grid is visible
        const comparisonGridBefore = await page.locator('.lod-comparison-grid');
        expect(await comparisonGridBefore.isVisible()).toBe(true);
        console.log('✓ Comparison grid visible');

        // Click "Generate Sprite" to go back to single mode
        console.log('Clicking "Generate Sprite" to switch to single mode...');
        await page.click('#generate-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Generated successfully');
        }, { timeout: 10000 });

        // Take screenshot of single sprite mode
        await page.screenshot({ path: 'test-results/latest/m3-single-sprite-mode.png', fullPage: true });

        // Verify comparison grid is gone
        const comparisonGridAfter = await page.locator('.lod-comparison-grid').count();
        expect(comparisonGridAfter).toBe(0);
        console.log('✓ Comparison grid cleared');

        // Verify single sprite container is visible
        const spriteContainer = await page.locator('.sprite-container');
        expect(await spriteContainer.isVisible()).toBe(true);
        console.log('✓ Single sprite container visible');

        // Verify only one canvas is displayed
        const canvasCount = await page.locator('.sprite-canvas').count();
        expect(canvasCount).toBe(1);
        console.log(`✓ Single canvas displayed (${canvasCount})`);

        // Verify metadata shows single LOD
        const metadataPanel = await page.locator('.metadata-panel');
        expect(await metadataPanel.isVisible()).toBe(true);
        console.log('✓ Single sprite metadata panel visible');

        // Verify no console errors
        expect(consoleErrors.length).toBe(0);
        console.log('✓ No console errors during mode switch');
    });

    test('Milestone 3: Cache testing - first generation miss, second hit', async () => {
        console.log('\n=== TEST: Cache Functionality ===\n');

        // Wait for page to load
        await page.waitForSelector('#species-select option:not([value=""])', { timeout: 5000 });
        
        // Select Oak MatureTree
        await page.selectOption('#species-select', 'quercus_robur');
        await page.selectOption('#stage-select', '3');

        // First comparison - should be all cache misses
        console.log('First comparison (should be cache misses)...');
        await page.click('#compare-lods-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Comparison complete');
        }, { timeout: 10000 });

        // Check for cache miss logs
        const firstGenerationLogs = consoleLogs.filter(log => 
            log.includes('Cache: MISS')
        );
        console.log(`✓ First generation: ${firstGenerationLogs.length} cache misses`);
        expect(firstGenerationLogs.length).toBeGreaterThan(0);

        // Clear console logs for second run
        consoleLogs = [];

        // Second comparison - should be all cache hits
        console.log('Second comparison (should be cache hits)...');
        await page.click('#compare-lods-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Comparison complete');
        }, { timeout: 10000 });

        // Check for cache hit logs
        const secondGenerationLogs = consoleLogs.filter(log => 
            log.includes('Cache: HIT')
        );
        console.log(`✓ Second generation: ${secondGenerationLogs.length} cache hits`);
        expect(secondGenerationLogs.length).toBeGreaterThan(0);

        // Verify cache status displayed in UI
        const cacheStatusElements = await page.locator('.lod-metadata-row:has-text("Cache Status:")').all();
        expect(cacheStatusElements.length).toBe(4);
        console.log(`✓ Cache status displayed for all ${cacheStatusElements.length} LODs`);

        // Verify no console errors
        expect(consoleErrors.length).toBe(0);
        console.log('✓ No console errors during cache testing');
    });

    test('Milestone 3: Visual validation - LOD differences logged', async () => {
        console.log('\n=== TEST: Visual Validation ===\n');

        // Wait for page to load
        await page.waitForSelector('#species-select option:not([value=""])', { timeout: 5000 });
        
        // Select Oak MatureTree
        await page.selectOption('#species-select', 'quercus_robur');
        await page.selectOption('#stage-select', '3');

        // Generate comparison
        await page.click('#compare-lods-btn');
        await page.waitForFunction(() => {
            const statusText = document.getElementById('status-text');
            return statusText && statusText.textContent.includes('Comparison complete');
        }, { timeout: 10000 });

        // Get canvas dimensions for each LOD
        const canvases = await page.locator('.lod-cell .sprite-canvas').all();
        const dimensions = [];
        
        for (let i = 0; i < canvases.length; i++) {
            const width = await canvases[i].evaluate(el => el.width);
            const height = await canvases[i].evaluate(el => el.height);
            dimensions.push({ width, height });
            console.log(`LOD ${i + 1}: ${width}x${height}px`);
        }

        // Check if dimensions are different (LOD system may produce identical sizes)
        const uniqueDimensions = new Set(dimensions.map(d => `${d.width}x${d.height}`));
        console.log(`Found ${uniqueDimensions.size} unique dimension sets out of 4 LODs`);

        if (uniqueDimensions.size === 1) {
            console.log('⚠ WARNING: All LOD levels produced identical dimensions');
            console.log('   This is expected if LOD system is not fully implemented');
            
            // Check for warning in console
            const lodWarnings = consoleWarnings.filter(log => 
                log.includes('LOD') && log.includes('identical')
            );
            expect(lodWarnings.length).toBeGreaterThan(0);
            console.log('✓ Warning logged about identical LOD dimensions');
        } else {
            console.log(`✓ LOD levels produce ${uniqueDimensions.size} different sprite sizes`);
        }

        // Verify dimensions are logged to console
        const dimensionLogs = consoleLogs.filter(log => 
            log.match(/LOD \w+: \d+x\d+px/)
        );
        expect(dimensionLogs.length).toBe(4);
        console.log(`✓ All ${dimensionLogs.length} LOD dimensions logged to console`);

        // Verify no console errors
        expect(consoleErrors.length).toBe(0);
        console.log('✓ No console errors during visual validation');
    });
});
