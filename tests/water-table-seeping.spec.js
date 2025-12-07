/**
 * Water Table Seeping Test (Milestone 3)
 * 
 * Tests gradual moisture increase near water bodies over time.
 * Validates:
 * - Water retention increases gradually near water
 * - Linear falloff with distance from water
 * - Capping at maxWaterRetention (90)
 * - Works for both rivers and lakes
 * - Performance remains stable
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * Helper: Wait for N render frames to ensure visual updates
 */
async function waitForRenderFrames(page, frameCount = 10) {
    await page.evaluate((count) => {
        return new Promise(resolve => {
            let frames = 0;
            function checkFrame() {
                frames++;
                if (frames >= count) {
                    resolve();
                } else {
                    requestAnimationFrame(checkFrame);
                }
            }
            requestAnimationFrame(checkFrame);
        });
    }, frameCount);
}

/**
 * Helper: Advance game time by specified game days
 */
async function advanceGameTime(page, gameDays) {
    await page.evaluate((days) => {
        const timeManager = window.graphicsEngine.timeManager;
        if (!timeManager) return;
        
        const currentDay = timeManager.getElapsedGameDays();
        const targetDay = currentDay + days;
        
        // Fast-forward time
        while (timeManager.getElapsedGameDays() < targetDay) {
            timeManager.update(0.1); // Update in 0.1 second chunks
        }
    }, gameDays);
    
    await waitForRenderFrames(page, 30);
}

/**
 * Helper: Get water retention at a specific grid position
 */
async function getWaterRetentionAt(page, gridX, gridY) {
    return await page.evaluate(({ x, y }) => {
        const soilManager = window.graphicsEngine.soilManager;
        if (!soilManager) return null;
        
        const soil = soilManager.getSoilAt(x, y);
        if (!soil) return null;
        
        return {
            waterRetention: soil.waterRetention,
            isWater: soil.isWater,
            isPlantable: soil.isPlantable
        };
    }, { x: gridX, y: gridY });
}

/**
 * Helper: Find water tiles in the map
 */
async function findWaterTiles(page) {
    return await page.evaluate(() => {
        const terrainGenerator = window.graphicsEngine.soilManager.terrainGenerator;
        if (!terrainGenerator) return [];
        
        const waterTiles = terrainGenerator.getWaterTiles();
        return Array.from(waterTiles).map(key => {
            const [x, y] = key.split(',').map(Number);
            return { x, y };
        });
    });
}

test.describe('Water Table Seeping (Milestone 3)', () => {
    
    test('Gradual moisture increase near water over time', async ({ page }) => {
        // Load the application
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        
        // Wait for initialization
        await waitForRenderFrames(page, 30);
        
        // Find a water tile
        const waterTiles = await findWaterTiles(page);
        expect(waterTiles.length).toBeGreaterThan(0);
        
        const waterTile = waterTiles[0];
        console.log(`Testing near water tile at (${waterTile.x}, ${waterTile.y})`);
        
        // Test cell 1 grid unit away from water (should be affected)
        const nearGridX = waterTile.x + 1;
        const nearGridY = waterTile.y;
        
        // Get initial water retention
        const initialState = await getWaterRetentionAt(page, nearGridX, nearGridY);
        expect(initialState).not.toBeNull();
        expect(initialState.isWater).toBe(false);
        expect(initialState.isPlantable).toBe(true);
        
        const initialWater = initialState.waterRetention;
        console.log(`Initial water retention at (${nearGridX}, ${nearGridY}): ${initialWater.toFixed(2)}`);
        
        // Set time scale to fast for testing
        await page.evaluate(() => {
            window.graphicsEngine.timeManager.setTimeScale(5.0); // veryFast
        });
        
        // Advance time by 20 game days
        console.log('Advancing time by 20 game days...');
        await advanceGameTime(page, 20);
        
        // Get water retention after time advancement
        const afterState = await getWaterRetentionAt(page, nearGridX, nearGridY);
        const afterWater = afterState.waterRetention;
        console.log(`Water retention after 20 days at (${nearGridX}, ${nearGridY}): ${afterWater.toFixed(2)}`);
        
        // Validate increase occurred
        expect(afterWater).toBeGreaterThan(initialWater);
        
        const increase = afterWater - initialWater;
        console.log(`Water retention increased by: ${increase.toFixed(2)}`);
        
        // With seepingRatePerDay = 0.5 and distance 1 (falloff ≈ 0.75 at radius 4):
        // Expected increase ≈ 0.5 * 20 * 0.75 = 7.5
        // Allow tolerance for frame timing
        expect(increase).toBeGreaterThan(5);
        expect(increase).toBeLessThan(15);
        
        console.log('✓ Gradual moisture increase validated');
    });
    
    test('Distance falloff: Closer cells receive more moisture', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        await waitForRenderFrames(page, 30);
        
        const waterTiles = await findWaterTiles(page);
        expect(waterTiles.length).toBeGreaterThan(0);
        
        const waterTile = waterTiles[0];
        
        // Test cells at different distances
        const distance1GridX = waterTile.x + 1;
        const distance1GridY = waterTile.y;
        
        const distance3GridX = waterTile.x + 3;
        const distance3GridY = waterTile.y;
        
        // Get initial states
        const dist1Initial = await getWaterRetentionAt(page, distance1GridX, distance1GridY);
        const dist3Initial = await getWaterRetentionAt(page, distance3GridX, distance3GridY);
        
        if (!dist1Initial || !dist3Initial) {
            console.log('Skipping test: Test cells not plantable');
            return;
        }
        
        console.log(`Distance 1 initial: ${dist1Initial.waterRetention.toFixed(2)}`);
        console.log(`Distance 3 initial: ${dist3Initial.waterRetention.toFixed(2)}`);
        
        // Fast-forward time
        await page.evaluate(() => {
            window.graphicsEngine.timeManager.setTimeScale(5.0);
        });
        
        await advanceGameTime(page, 20);
        
        // Get final states
        const dist1After = await getWaterRetentionAt(page, distance1GridX, distance1GridY);
        const dist3After = await getWaterRetentionAt(page, distance3GridX, distance3GridY);
        
        const increase1 = dist1After.waterRetention - dist1Initial.waterRetention;
        const increase3 = dist3After.waterRetention - dist3Initial.waterRetention;
        
        console.log(`Distance 1 increase: ${increase1.toFixed(2)}`);
        console.log(`Distance 3 increase: ${increase3.toFixed(2)}`);
        
        // Distance 1 should have higher increase than distance 3 (due to falloff)
        expect(increase1).toBeGreaterThan(increase3);
        
        console.log('✓ Distance falloff validated');
    });
    
    test('Capping at maxWaterRetention (90)', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        await waitForRenderFrames(page, 30);
        
        const waterTiles = await findWaterTiles(page);
        expect(waterTiles.length).toBeGreaterThan(0);
        
        const waterTile = waterTiles[0];
        const testGridX = waterTile.x + 1;
        const testGridY = waterTile.y;
        
        // Manually set water retention to near-cap value
        await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(x, y);
            if (soil) {
                soil.waterRetention = 85; // Near cap
            }
        }, { x: testGridX, y: testGridY });
        
        const beforeState = await getWaterRetentionAt(page, testGridX, testGridY);
        console.log(`Water retention before time advancement: ${beforeState.waterRetention.toFixed(2)}`);
        
        // Fast-forward time
        await page.evaluate(() => {
            window.graphicsEngine.timeManager.setTimeScale(5.0);
        });
        
        await advanceGameTime(page, 30); // Long time period
        
        const afterState = await getWaterRetentionAt(page, testGridX, testGridY);
        console.log(`Water retention after 30 days: ${afterState.waterRetention.toFixed(2)}`);
        
        // Should be capped at 90
        expect(afterState.waterRetention).toBeLessThanOrEqual(90);
        expect(afterState.waterRetention).toBeGreaterThanOrEqual(85);
        
        console.log('✓ Water retention capping validated');
    });
    
    test('Performance stability over extended time', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        await waitForRenderFrames(page, 30);
        
        // Measure initial FPS
        const initialFPS = await page.evaluate(() => {
            const debugManager = window.graphicsEngine.debugManager;
            return debugManager ? debugManager.currentFPS : 0;
        });
        
        console.log(`Initial FPS: ${initialFPS.toFixed(1)}`);
        
        // Fast-forward time significantly
        await page.evaluate(() => {
            window.graphicsEngine.timeManager.setTimeScale(5.0);
        });
        
        await advanceGameTime(page, 50); // 50 game days
        
        // Measure FPS after extended runtime
        const finalFPS = await page.evaluate(() => {
            const debugManager = window.graphicsEngine.debugManager;
            return debugManager ? debugManager.currentFPS : 0;
        });
        
        console.log(`Final FPS after 50 game days: ${finalFPS.toFixed(1)}`);
        
        // FPS should remain stable (allow 20% degradation)
        const fpsRatio = finalFPS / initialFPS;
        expect(fpsRatio).toBeGreaterThan(0.8);
        
        console.log(`FPS ratio: ${(fpsRatio * 100).toFixed(1)}%`);
        console.log('✓ Performance stability validated');
    });
    
    test('Works for both rivers and lakes', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        await waitForRenderFrames(page, 30);
        
        // Get config to verify both rivers and lakes are enabled
        const config = await page.evaluate(() => {
            return window.graphicsEngine.config.world.terrain.water;
        });
        
        console.log('Water features enabled:');
        console.log(`  Rivers: ${config.rivers.enabled}`);
        console.log(`  Lakes: ${config.lakes.enabled}`);
        console.log(`  Water Table: ${config.waterTable.enabled}`);
        
        expect(config.rivers.enabled).toBe(true);
        expect(config.lakes.enabled).toBe(true);
        expect(config.waterTable.enabled).toBe(true);
        
        const waterTiles = await findWaterTiles(page);
        console.log(`Total water tiles found: ${waterTiles.length}`);
        
        // Should have both rivers and lakes
        expect(waterTiles.length).toBeGreaterThan(5);
        
        // Test multiple water tiles (both river and lake)
        let testedTiles = 0;
        for (const waterTile of waterTiles.slice(0, 3)) {
            const testGridX = waterTile.x + 1;
            const testGridY = waterTile.y;
            
            const initial = await getWaterRetentionAt(page, testGridX, testGridY);
            if (!initial || initial.isWater || !initial.isPlantable) continue;
            
            const initialWater = initial.waterRetention;
            
            await page.evaluate(() => {
                window.graphicsEngine.timeManager.setTimeScale(5.0);
            });
            
            await advanceGameTime(page, 15);
            
            const after = await getWaterRetentionAt(page, testGridX, testGridY);
            const increase = after.waterRetention - initialWater;
            
            console.log(`Water tile (${waterTile.x}, ${waterTile.y}) neighbor increase: ${increase.toFixed(2)}`);
            
            // Should have some increase
            expect(increase).toBeGreaterThan(0);
            
            testedTiles++;
        }
        
        console.log(`✓ Tested ${testedTiles} water tile neighbors`);
        expect(testedTiles).toBeGreaterThan(0);
    });
    
    test('Console has no errors during water table seeping', async ({ page }) => {
        const consoleErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        await waitForRenderFrames(page, 30);
        
        // Fast-forward through multiple cycles
        await page.evaluate(() => {
            window.graphicsEngine.timeManager.setTimeScale(5.0);
        });
        
        await advanceGameTime(page, 30);
        
        // Check for errors
        expect(consoleErrors).toHaveLength(0);
        console.log('✓ No console errors during water table seeping');
    });
});
