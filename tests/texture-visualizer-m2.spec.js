import { test, expect } from '@playwright/test';

/**
 * MILESTONE 2: Growth Stage Selection and Basic Sprite Generation
 * Tests LOD selector, generate button, sprite generation, and metadata display
 */

test.describe('Texture Visualizer - Milestone 2', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to texture visualizer
        await page.goto('http://localhost:8081/texture_visualizer.html');
        
        // Wait for species to load
        await page.waitForFunction(() => {
            const select = document.getElementById('species-select');
            return select && select.options.length > 1;
        }, { timeout: 5000 });
    });

    test('M2.1 - LOD selector functionality', async ({ page }) => {
        // Check LOD selector is disabled initially
        const lodSelect = page.locator('#lod-select');
        await expect(lodSelect).toBeDisabled();
        
        // Select a species
        await page.selectOption('#species-select', 'urtica_dioica');
        
        // LOD selector should be enabled
        await expect(lodSelect).toBeEnabled();
        
        // Check default value is "medium"
        const lodValue = await lodSelect.inputValue();
        expect(lodValue).toBe('medium');
        
        // Test changing LOD level
        await page.selectOption('#lod-select', 'high');
        const newValue = await lodSelect.inputValue();
        expect(newValue).toBe('high');
        
        console.log('LOD selector: PASS - Functional and defaults to medium');
    });

    test('M2.2 - Generate button state management', async ({ page }) => {
        const generateBtn = page.locator('#generate-btn');
        
        // Initially disabled
        await expect(generateBtn).toBeDisabled();
        
        // Select species
        await page.selectOption('#species-select', 'urtica_dioica');
        
        // Still disabled (no stage selected)
        await expect(generateBtn).toBeDisabled();
        
        // Select stage
        await page.selectOption('#stage-select', '0');
        
        // Now enabled
        await expect(generateBtn).toBeEnabled();
        
        console.log('Generate button: PASS - State changes correctly');
    });

    test('M2.3 - Generate Nettles Seedling at Medium LOD', async ({ page }) => {
        // Setup console monitoring
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Select Nettles
        await page.selectOption('#species-select', 'urtica_dioica');
        
        // Select Seedling stage (index 0)
        await page.selectOption('#stage-select', '0');
        
        // Ensure Medium LOD is selected
        await page.selectOption('#lod-select', 'medium');
        
        // Click generate
        await page.click('#generate-btn');
        
        // Wait for generation to complete
        await page.waitForFunction(() => {
            const canvas = document.querySelector('.sprite-canvas');
            return canvas && canvas.width > 0 && canvas.height > 0;
        }, { timeout: 5000 });
        
        // Check canvas is visible
        const canvas = page.locator('.sprite-canvas');
        await expect(canvas).toBeVisible();
        
        // Check metadata is displayed
        const metadata = page.locator('.metadata-panel');
        await expect(metadata).toBeVisible();
        
        // Verify metadata content
        const speciesText = await page.locator('.metadata-panel .metadata-value').nth(0).textContent();
        expect(speciesText).toContain('Nettles');
        
        // Check canvas dimensions are non-zero
        const canvasDimensions = await page.evaluate(() => {
            const canvas = document.querySelector('.sprite-canvas');
            return { width: canvas.width, height: canvas.height };
        });
        
        expect(canvasDimensions.width).toBeGreaterThan(0);
        expect(canvasDimensions.height).toBeGreaterThan(0);
        
        // Screenshot
        await page.screenshot({ 
            path: 'test-results/texture-visualizer-m2-nettles-seedling.png',
            fullPage: true
        });
        
        // Check console errors
        expect(consoleErrors.length).toBe(0);
        
        console.log('Nettles Seedling Generation: PASS');
        console.log(`Canvas dimensions: ${canvasDimensions.width}x${canvasDimensions.height}`);
    });

    test('M2.4 - Generate Oak MatureTree at High LOD', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Select Oak
        await page.selectOption('#species-select', 'quercus_robur');
        
        // Wait for stages to populate
        await page.waitForTimeout(100);
        
        // Get the MatureTree stage index (typically index 3 for Oak)
        const stageOptions = await page.locator('#stage-select option').allTextContents();
        const matureTreeIndex = stageOptions.findIndex(opt => opt.toLowerCase().includes('mature'));
        
        if (matureTreeIndex > 0) {
            await page.selectOption('#stage-select', String(matureTreeIndex - 1)); // -1 because first is placeholder
        } else {
            // Fallback to last stage
            await page.selectOption('#stage-select', String(stageOptions.length - 2));
        }
        
        // Select High LOD
        await page.selectOption('#lod-select', 'high');
        
        // Generate
        await page.click('#generate-btn');
        
        // Wait for canvas
        await page.waitForSelector('.sprite-canvas', { timeout: 5000 });
        
        // Verify canvas and metadata
        const canvas = page.locator('.sprite-canvas');
        await expect(canvas).toBeVisible();
        
        const metadata = page.locator('.metadata-panel');
        await expect(metadata).toBeVisible();
        
        // Screenshot
        await page.screenshot({ 
            path: 'test-results/texture-visualizer-m2-oak-mature.png',
            fullPage: true
        });
        
        expect(consoleErrors.length).toBe(0);
        
        console.log('Oak MatureTree Generation: PASS');
    });

    test('M2.5 - Generate Clover Flowering at Low LOD', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Select Clover
        await page.selectOption('#species-select', 'trifolium_repens');
        
        // Wait for stages
        await page.waitForTimeout(100);
        
        // Get Flowering stage (typically index 2 for Clover)
        const stageOptions = await page.locator('#stage-select option').allTextContents();
        const floweringIndex = stageOptions.findIndex(opt => opt.toLowerCase().includes('flower'));
        
        if (floweringIndex > 0) {
            await page.selectOption('#stage-select', String(floweringIndex - 1));
        } else {
            // Use middle stage as fallback
            await page.selectOption('#stage-select', '1');
        }
        
        // Select Low LOD
        await page.selectOption('#lod-select', 'low');
        
        // Generate
        await page.click('#generate-btn');
        
        // Wait for canvas
        await page.waitForSelector('.sprite-canvas', { timeout: 5000 });
        
        // Verify
        const canvas = page.locator('.sprite-canvas');
        await expect(canvas).toBeVisible();
        
        const metadata = page.locator('.metadata-panel');
        await expect(metadata).toBeVisible();
        
        // Verify LOD level in metadata
        const lodText = await page.locator('.metadata-panel .metadata-row').nth(3).textContent();
        expect(lodText.toLowerCase()).toContain('low');
        
        // Screenshot
        await page.screenshot({ 
            path: 'test-results/texture-visualizer-m2-clover-flowering.png',
            fullPage: true
        });
        
        expect(consoleErrors.length).toBe(0);
        
        console.log('Clover Flowering Generation: PASS');
    });

    test('M2.6 - Multiple generations (clear previous sprite)', async ({ page }) => {
        // First generation
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-btn');
        await page.waitForSelector('.sprite-canvas', { timeout: 5000 });
        
        // Get first canvas
        const firstCanvas = await page.evaluate(() => {
            return document.querySelectorAll('.sprite-canvas').length;
        });
        
        expect(firstCanvas).toBe(1);
        
        // Second generation (different species)
        await page.selectOption('#species-select', 'trifolium_repens');
        await page.waitForTimeout(100);
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-btn');
        await page.waitForSelector('.sprite-canvas', { timeout: 5000 });
        
        // Should still have only 1 canvas (previous cleared)
        const secondCanvas = await page.evaluate(() => {
            return document.querySelectorAll('.sprite-canvas').length;
        });
        
        expect(secondCanvas).toBe(1);
        
        console.log('Multiple generations: PASS - Previous sprite cleared');
    });

    test('M2.7 - Metadata displays correctly', async ({ page }) => {
        // Generate a sprite
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.selectOption('#stage-select', '0');
        await page.selectOption('#lod-select', 'medium');
        await page.click('#generate-btn');
        await page.waitForSelector('.metadata-panel', { timeout: 5000 });
        
        // Check all metadata rows
        const metadataRows = await page.locator('.metadata-row').count();
        expect(metadataRows).toBeGreaterThanOrEqual(5);
        
        // Check each field exists
        const labels = await page.locator('.metadata-label').allTextContents();
        expect(labels).toContain('Species:');
        expect(labels).toContain('Growth Stage:');
        expect(labels).toContain('LOD Level:');
        expect(labels).toContain('Canvas Size:');
        
        // Check values are not empty
        const values = await page.locator('.metadata-value').allTextContents();
        values.forEach(value => {
            expect(value.trim().length).toBeGreaterThan(0);
        });
        
        console.log('Metadata display: PASS - All fields present and populated');
    });

    test('M2.8 - Console output validation', async ({ page }) => {
        const consoleLogs = [];
        const consoleWarnings = [];
        const consoleErrors = [];
        
        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'log') consoleLogs.push(text);
            if (msg.type() === 'warning') consoleWarnings.push(text);
            if (msg.type() === 'error') consoleErrors.push(text);
        });
        
        // Perform generation
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-btn');
        await page.waitForSelector('.sprite-canvas', { timeout: 5000 });
        
        // Check console output
        console.log('Console Logs:', consoleLogs.length);
        console.log('Console Warnings:', consoleWarnings.length);
        console.log('Console Errors:', consoleErrors.length);
        
        // Validation criteria
        expect(consoleErrors.length).toBe(0); // No errors
        expect(consoleWarnings.length).toBeLessThanOrEqual(2); // Max 2 warnings (cache misses OK)
        
        // Check for expected log messages
        const hasInitLog = consoleLogs.some(log => log.includes('Milestone 2'));
        const hasSpeciesLog = consoleLogs.some(log => log.includes('Loaded species'));
        const hasGenerationLog = consoleLogs.some(log => log.includes('Generated sprite'));
        
        expect(hasInitLog).toBe(true);
        expect(hasSpeciesLog).toBe(true);
        expect(hasGenerationLog).toBe(true);
        
        console.log('Console output: PASS - No errors, expected logs present');
    });
});
