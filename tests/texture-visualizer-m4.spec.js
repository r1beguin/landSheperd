const { test, expect } = require('@playwright/test');

test.describe('Texture Visualizer - Milestone 4: Genetics & Health Controls', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to texture visualizer
        await page.goto('http://localhost:8081/texture_visualizer.html');
        
        // Wait for initialization
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
    });

    test('Genetics panel shows for oak (tree) species', async ({ page }) => {
        console.log('TEST: Genetics panel visibility for tree species');
        
        // Genetics panel should be hidden initially
        const geneticsPanelInitial = page.locator('#genetics-panel');
        await expect(geneticsPanelInitial).toHaveCSS('display', 'none');
        console.log('✓ Genetics panel hidden initially');
        
        // Select oak species
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(300);
        
        // Genetics panel should now be visible
        await expect(geneticsPanelInitial).toHaveCSS('display', 'block');
        console.log('✓ Genetics panel visible for oak species');
        
        // Verify all 4 sliders are present and visible
        await expect(page.locator('#height-slider')).toBeVisible();
        await expect(page.locator('#width-slider')).toBeVisible();
        await expect(page.locator('#foliage-slider')).toBeVisible();
        await expect(page.locator('#color-slider')).toBeVisible();
        console.log('✓ All 4 genetic sliders visible');
        
        // Verify default values (127)
        const heightValue = await page.locator('#height-value').textContent();
        const widthValue = await page.locator('#width-value').textContent();
        const foliageValue = await page.locator('#foliage-value').textContent();
        const colorValue = await page.locator('#color-value').textContent();
        
        expect(heightValue).toBe('127');
        expect(widthValue).toBe('127');
        expect(foliageValue).toBe('127');
        expect(colorValue).toBe('127');
        console.log('✓ Default genetic values are 127');
        
        // Screenshot with genetics panel visible
        await page.screenshot({ 
            path: 'test-results/m4-genetics-panel-oak.png',
            fullPage: true
        });
        console.log('✓ Screenshot captured: m4-genetics-panel-oak.png');
    });

    test('Genetics panel hidden for nettles (herb) species', async ({ page }) => {
        console.log('TEST: Genetics panel hidden for herb species');
        
        // Select nettles species
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(300);
        
        // Genetics panel should be hidden
        const geneticsPanel = page.locator('#genetics-panel');
        await expect(geneticsPanel).toHaveCSS('display', 'none');
        console.log('✓ Genetics panel hidden for nettles (herb)');
        
        // Screenshot
        await page.screenshot({ 
            path: 'test-results/m4-no-genetics-nettles.png',
            fullPage: true
        });
        console.log('✓ Screenshot captured: m4-no-genetics-nettles.png');
    });

    test('Genetics panel hidden for clover (groundcover) species', async ({ page }) => {
        console.log('TEST: Genetics panel hidden for groundcover species');
        
        // Select clover species
        await page.selectOption('#species-select', 'trifolium_repens');
        await page.waitForTimeout(300);
        
        // Genetics panel should be hidden
        const geneticsPanel = page.locator('#genetics-panel');
        await expect(geneticsPanel).toHaveCSS('display', 'none');
        console.log('✓ Genetics panel hidden for clover (groundcover)');
    });

    test('Health slider always visible for all species', async ({ page }) => {
        console.log('TEST: Health slider visibility for all species');
        
        const healthSlider = page.locator('#health-slider');
        
        // Initially visible
        await expect(healthSlider).toBeVisible();
        console.log('✓ Health slider visible initially');
        
        // Visible for oak
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(200);
        await expect(healthSlider).toBeVisible();
        console.log('✓ Health slider visible for oak');
        
        // Visible for nettles
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(200);
        await expect(healthSlider).toBeVisible();
        console.log('✓ Health slider visible for nettles');
        
        // Visible for clover
        await page.selectOption('#species-select', 'trifolium_repens');
        await page.waitForTimeout(200);
        await expect(healthSlider).toBeVisible();
        console.log('✓ Health slider visible for clover');
        
        // Verify default health value (100)
        const healthValue = await page.locator('#health-value').textContent();
        expect(healthValue).toBe('100');
        console.log('✓ Default health value is 100');
    });

    test('Genetic sliders update value displays in real-time', async ({ page }) => {
        console.log('TEST: Slider value updates');
        
        // Select oak to show genetics panel
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(300);
        
        // Test height slider
        await page.locator('#height-slider').fill('255');
        let value = await page.locator('#height-value').textContent();
        expect(value).toBe('255');
        console.log('✓ Height slider updates to 255');
        
        // Test width slider
        await page.locator('#width-slider').fill('50');
        value = await page.locator('#width-value').textContent();
        expect(value).toBe('50');
        console.log('✓ Width slider updates to 50');
        
        // Test foliage slider
        await page.locator('#foliage-slider').fill('200');
        value = await page.locator('#foliage-value').textContent();
        expect(value).toBe('200');
        console.log('✓ Foliage slider updates to 200');
        
        // Test color slider
        await page.locator('#color-slider').fill('30');
        value = await page.locator('#color-value').textContent();
        expect(value).toBe('30');
        console.log('✓ Color slider updates to 30');
        
        // Test health slider
        await page.locator('#health-slider').fill('75');
        value = await page.locator('#health-value').textContent();
        expect(value).toBe('75');
        console.log('✓ Health slider updates to 75');
    });

    test('Random Genetics button generates random values', async ({ page }) => {
        console.log('TEST: Random Genetics button');
        
        // Select oak
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(300);
        
        // Get initial values
        const heightBefore = await page.locator('#height-value').textContent();
        const widthBefore = await page.locator('#width-value').textContent();
        const foliageBefore = await page.locator('#foliage-value').textContent();
        const colorBefore = await page.locator('#color-value').textContent();
        
        console.log(`Before: H:${heightBefore} W:${widthBefore} F:${foliageBefore} C:${colorBefore}`);
        
        // Click Random button
        await page.click('#random-genetics-btn');
        await page.waitForTimeout(200);
        
        // Get new values
        const heightAfter = await page.locator('#height-value').textContent();
        const widthAfter = await page.locator('#width-value').textContent();
        const foliageAfter = await page.locator('#foliage-value').textContent();
        const colorAfter = await page.locator('#color-value').textContent();
        
        console.log(`After: H:${heightAfter} W:${widthAfter} F:${foliageAfter} C:${colorAfter}`);
        
        // At least one value should have changed (extremely unlikely all 4 random to be 127)
        const anyChanged = heightAfter !== heightBefore || 
                          widthAfter !== widthBefore || 
                          foliageAfter !== foliageBefore || 
                          colorAfter !== colorBefore;
        
        expect(anyChanged).toBe(true);
        console.log('✓ Random genetics generated different values');
        
        // Values should be in valid range (0-255)
        expect(parseInt(heightAfter)).toBeGreaterThanOrEqual(0);
        expect(parseInt(heightAfter)).toBeLessThanOrEqual(255);
        expect(parseInt(widthAfter)).toBeGreaterThanOrEqual(0);
        expect(parseInt(widthAfter)).toBeLessThanOrEqual(255);
        console.log('✓ Random values in valid range (0-255)');
    });

    test('Reset button sets genetics to 127 and health to 100', async ({ page }) => {
        console.log('TEST: Reset to Default button');
        
        // Select oak
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(300);
        
        // Set non-default values
        await page.locator('#height-slider').fill('255');
        await page.locator('#width-slider').fill('50');
        await page.locator('#foliage-slider').fill('200');
        await page.locator('#color-slider').fill('30');
        await page.locator('#health-slider').fill('50');
        await page.waitForTimeout(200);
        
        console.log('✓ Set non-default values');
        
        // Click Reset button
        await page.click('#reset-genetics-btn');
        await page.waitForTimeout(200);
        
        // Verify all values reset to defaults
        const heightValue = await page.locator('#height-value').textContent();
        const widthValue = await page.locator('#width-value').textContent();
        const foliageValue = await page.locator('#foliage-value').textContent();
        const colorValue = await page.locator('#color-value').textContent();
        const healthValue = await page.locator('#health-value').textContent();
        
        expect(heightValue).toBe('127');
        expect(widthValue).toBe('127');
        expect(foliageValue).toBe('127');
        expect(colorValue).toBe('127');
        expect(healthValue).toBe('100');
        
        console.log('✓ All values reset to defaults (127, 100)');
    });

    test('Generate sprite with custom genetics displays metadata', async ({ page }) => {
        console.log('TEST: Generate sprite with genetics metadata');
        
        // Select oak and stage
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(300);
        await page.selectOption('#stage-select', '0'); // Sapling
        await page.waitForTimeout(300);
        
        // Set custom genetics
        await page.locator('#height-slider').fill('200');
        await page.locator('#width-slider').fill('150');
        await page.locator('#foliage-slider').fill('100');
        await page.locator('#color-slider').fill('50');
        await page.locator('#health-slider').fill('75');
        await page.waitForTimeout(200);
        
        console.log('✓ Set custom genetics: H:200 W:150 F:100 C:50, Health:75');
        
        // Generate sprite
        await page.click('#generate-btn');
        await page.waitForTimeout(1000);
        
        // Verify metadata displays genetics
        const metadataPanel = page.locator('.metadata-panel');
        await expect(metadataPanel).toBeVisible();
        
        const metadataText = await metadataPanel.textContent();
        
        // Check for genetics in metadata
        expect(metadataText).toContain('Genetics');
        expect(metadataText).toContain('H:200');
        expect(metadataText).toContain('W:150');
        expect(metadataText).toContain('F:100');
        expect(metadataText).toContain('C:50');
        console.log('✓ Genetics displayed in metadata');
        
        // Check for health in metadata
        expect(metadataText).toContain('Health');
        expect(metadataText).toContain('75%');
        console.log('✓ Health displayed in metadata');
        
        // Screenshot with metadata
        await page.screenshot({ 
            path: 'test-results/m4-sprite-with-genetics.png',
            fullPage: true
        });
        console.log('✓ Screenshot captured: m4-sprite-with-genetics.png');
    });

    test('Compare LODs with genetics displays metadata', async ({ page }) => {
        console.log('TEST: LOD comparison with genetics metadata');
        
        // Select oak and stage
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(300);
        await page.selectOption('#stage-select', '2'); // MatureTree
        await page.waitForTimeout(300);
        
        // Set custom genetics
        await page.locator('#height-slider').fill('255');
        await page.locator('#width-slider').fill('100');
        await page.locator('#health-slider').fill('90');
        await page.waitForTimeout(200);
        
        console.log('✓ Set genetics: H:255 W:100, Health:90');
        
        // Compare all LODs
        await page.click('#compare-lods-btn');
        await page.waitForTimeout(3000);
        
        // Verify comparison metadata displays genetics
        const comparisonMetadata = page.locator('.metadata-panel').last();
        await expect(comparisonMetadata).toBeVisible();
        
        const metadataText = await comparisonMetadata.textContent();
        
        expect(metadataText).toContain('Genetics');
        expect(metadataText).toContain('H:255');
        expect(metadataText).toContain('W:100');
        expect(metadataText).toContain('Health');
        expect(metadataText).toContain('90%');
        console.log('✓ Genetics and health in LOD comparison metadata');
        
        // Screenshot
        await page.screenshot({ 
            path: 'test-results/m4-lod-comparison-with-genetics.png',
            fullPage: true
        });
        console.log('✓ Screenshot captured: m4-lod-comparison-with-genetics.png');
    });

    test('Console logs genetics parameters correctly', async ({ page }) => {
        console.log('TEST: Console logging of genetics');
        
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'log') {
                consoleLogs.push(msg.text());
            }
        });
        
        // Select oak and stage
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(300);
        await page.selectOption('#stage-select', '1'); // YoungTree
        await page.waitForTimeout(300);
        
        // Set genetics
        await page.locator('#height-slider').fill('180');
        await page.locator('#width-slider').fill('220');
        await page.locator('#foliage-slider').fill('160');
        await page.locator('#color-slider').fill('140');
        await page.locator('#health-slider').fill('85');
        await page.waitForTimeout(200);
        
        // Generate sprite
        await page.click('#generate-btn');
        await page.waitForTimeout(1000);
        
        // Check console logs
        const geneticsLog = consoleLogs.find(log => log.includes('Genetics: H:180'));
        const healthLog = consoleLogs.find(log => log.includes('Health: 85%'));
        
        expect(geneticsLog).toBeTruthy();
        expect(healthLog).toBeTruthy();
        
        console.log('✓ Console logs genetics: ' + geneticsLog);
        console.log('✓ Console logs health: ' + healthLog);
    });

    test('No console errors during operation', async ({ page }) => {
        console.log('TEST: No console errors');
        
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Select oak
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(300);
        await page.selectOption('#stage-select', '0');
        await page.waitForTimeout(300);
        
        // Use genetics controls
        await page.click('#random-genetics-btn');
        await page.waitForTimeout(200);
        
        await page.click('#reset-genetics-btn');
        await page.waitForTimeout(200);
        
        // Generate sprite
        await page.click('#generate-btn');
        await page.waitForTimeout(1000);
        
        // Compare LODs
        await page.click('#compare-lods-btn');
        await page.waitForTimeout(3000);
        
        // Verify no errors
        expect(consoleErrors.length).toBe(0);
        console.log('✓ No console errors during operation');
        
        if (consoleErrors.length > 0) {
            console.error('Console errors found:', consoleErrors);
        }
    });
});
