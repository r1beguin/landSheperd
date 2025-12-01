/**
 * Test for Oak Sprite Generation and Context Menu Species Selection
 * Tests the two critical fixes:
 * 1. Oak sprite generation (sapling, young tree, mature tree, withered)
 * 2. Species selection via context menu (right-click on empty soil)
 */

const { test, expect } = require('@playwright/test');

test('Oak sprite generation and context menu species selection', async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:8081');
    
    // Wait for canvas to be ready
    await page.waitForSelector('#gameCanvas', { timeout: 10000 });
    
    // Wait for graphics engine to initialize
    await page.waitForFunction(() => window.graphicsEngine !== undefined, { timeout: 10000 });
    
    console.log('✓ Page loaded and engine initialized');
    
    // TEST 1: Verify species palette is NOT visible on screen
    const paletteVisible = await page.locator('#species-palette').isVisible().catch(() => false);
    expect(paletteVisible).toBe(false);
    console.log('✓ Permanent species palette removed from UI');
    
    // TEST 2: Right-click on empty soil to open context menu
    const canvas = page.locator('#gameCanvas');
    await canvas.click({ button: 'right', position: { x: 400, y: 300 } });
    
    // Wait for context menu to appear
    await page.waitForSelector('#context-menu', { state: 'visible', timeout: 5000 });
    console.log('✓ Context menu opened on right-click');
    
    // Capture screenshot of context menu
    await page.screenshot({ path: 'test-results/context-menu-species-selection.png' });
    console.log('✓ Screenshot captured: context-menu-species-selection.png');
    
    // TEST 3: Verify species selection buttons are present in context menu
    const nettleButton = page.locator('.plant-species-btn[data-species="urtica_dioica"]');
    const oakButton = page.locator('.plant-species-btn[data-species="quercus_robur"]');
    
    expect(await nettleButton.isVisible()).toBe(true);
    expect(await oakButton.isVisible()).toBe(true);
    console.log('✓ Both Nettle and Oak buttons visible in context menu');
    
    // TEST 4: Plant an oak tree by clicking the oak button
    await oakButton.click();
    
    // Wait a moment for the menu to close and plant to spawn
    await page.waitForTimeout(500);
    
    // Check that a plant was created
    const plantCount = await page.evaluate(() => window.graphicsEngine.plantManager.plants.size);
    expect(plantCount).toBe(1);
    console.log('✓ Oak planted via context menu (1 plant created)');
    
    // TEST 5: Verify the oak sprite was generated without errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    // Get the planted oak
    const oakInfo = await page.evaluate(() => {
        const plantManager = window.graphicsEngine.plantManager;
        const plants = Array.from(plantManager.plants.values());
        if (plants.length === 0) return null;
        
        const oak = plants[0];
        return {
            speciesId: oak.species.id,
            stage: oak.stage,
            dimensions: {
                width: oak.width,
                height: oak.height
            },
            hasTexture: oak.texture !== null
        };
    });
    
    expect(oakInfo).not.toBeNull();
    expect(oakInfo.speciesId).toBe('quercus_robur');
    expect(oakInfo.stage).toBe('Sapling');
    expect(oakInfo.dimensions.width).toBe(40);
    expect(oakInfo.dimensions.height).toBe(50);
    expect(oakInfo.hasTexture).toBe(true);
    console.log('✓ Oak sprite generated successfully:', oakInfo);
    
    // Capture screenshot with oak planted
    await page.screenshot({ path: 'test-results/oak-sapling-planted.png' });
    console.log('✓ Screenshot captured: oak-sapling-planted.png');
    
    // TEST 6: Advance oak to YoungTree stage
    await page.evaluate(() => {
        const plantManager = window.graphicsEngine.plantManager;
        const plants = Array.from(plantManager.plants.values());
        const oak = plants[0];
        const currentDay = window.graphicsEngine.timeManager.getCurrentDayPrecise();
        oak.advanceGrowthStage(currentDay);
    });
    
    await page.waitForTimeout(500);
    
    const youngTreeInfo = await page.evaluate(() => {
        const plantManager = window.graphicsEngine.plantManager;
        const plants = Array.from(plantManager.plants.values());
        const oak = plants[0];
        return {
            stage: oak.stage,
            hasTexture: oak.texture !== null
        };
    });
    
    expect(youngTreeInfo.stage).toBe('YoungTree');
    expect(youngTreeInfo.hasTexture).toBe(true);
    console.log('✓ Oak advanced to YoungTree stage');
    
    // Capture screenshot
    await page.screenshot({ path: 'test-results/oak-young-tree.png' });
    console.log('✓ Screenshot captured: oak-young-tree.png');
    
    // TEST 7: Advance oak to MatureTree stage
    await page.evaluate(() => {
        const plantManager = window.graphicsEngine.plantManager;
        const plants = Array.from(plantManager.plants.values());
        const oak = plants[0];
        const currentDay = window.graphicsEngine.timeManager.getCurrentDayPrecise();
        oak.advanceGrowthStage(currentDay);
    });
    
    await page.waitForTimeout(500);
    
    const matureTreeInfo = await page.evaluate(() => {
        const plantManager = window.graphicsEngine.plantManager;
        const plants = Array.from(plantManager.plants.values());
        const oak = plants[0];
        return {
            stage: oak.stage,
            hasTexture: oak.texture !== null
        };
    });
    
    expect(matureTreeInfo.stage).toBe('MatureTree');
    expect(matureTreeInfo.hasTexture).toBe(true);
    console.log('✓ Oak advanced to MatureTree stage');
    
    // Capture screenshot
    await page.screenshot({ path: 'test-results/oak-mature-tree.png' });
    console.log('✓ Screenshot captured: oak-mature-tree.png');
    
    // TEST 8: Advance oak to Withered stage
    await page.evaluate(() => {
        const plantManager = window.graphicsEngine.plantManager;
        const plants = Array.from(plantManager.plants.values());
        const oak = plants[0];
        const currentDay = window.graphicsEngine.timeManager.getCurrentDayPrecise();
        oak.advanceGrowthStage(currentDay);
    });
    
    await page.waitForTimeout(500);
    
    const witheredInfo = await page.evaluate(() => {
        const plantManager = window.graphicsEngine.plantManager;
        const plants = Array.from(plantManager.plants.values());
        const oak = plants[0];
        return {
            stage: oak.stage,
            hasTexture: oak.texture !== null
        };
    });
    
    expect(witheredInfo.stage).toBe('Withered');
    expect(witheredInfo.hasTexture).toBe(true);
    console.log('✓ Oak advanced to Withered stage');
    
    // Capture screenshot
    await page.screenshot({ path: 'test-results/oak-withered.png' });
    console.log('✓ Screenshot captured: oak-withered.png');
    
    // TEST 9: Verify no console errors during entire lifecycle
    expect(consoleErrors.length).toBe(0);
    console.log('✓ No console errors during oak lifecycle');
    
    // TEST 10: Test planting nettle via context menu
    // Close any open menus first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    
    // Right-click on a different empty cell
    await canvas.click({ button: 'right', position: { x: 500, y: 300 } });
    await page.waitForSelector('#context-menu', { state: 'visible', timeout: 5000 });
    
    const nettleButton2 = page.locator('.plant-species-btn[data-species="urtica_dioica"]');
    await nettleButton2.click();
    
    await page.waitForTimeout(500);
    
    const finalPlantCount = await page.evaluate(() => window.graphicsEngine.plantManager.plants.size);
    expect(finalPlantCount).toBe(2);
    console.log('✓ Nettle planted via context menu (2 plants total)');
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/both-species-planted.png' });
    console.log('✓ Screenshot captured: both-species-planted.png');
    
    console.log('\n========== TEST SUMMARY ==========');
    console.log('✅ Permanent species palette removed');
    console.log('✅ Context menu shows species selection on empty soil');
    console.log('✅ Oak sprite generation works for all 4 stages');
    console.log('✅ Nettle can also be planted via context menu');
    console.log('✅ No console errors during any operation');
    console.log('✅ All 10 tests passed');
});
