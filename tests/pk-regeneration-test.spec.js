/**
 * P/K Regeneration Test
 * 
 * Validates the three P/K regeneration mechanisms:
 * 1. Base weathering (universal slow regeneration)
 * 2. Oak leaf litter (P/K deposition from mature trees)
 * 3. Flood events (P/K bonus in floodplains)
 */

const { test, expect } = require('@playwright/test');
const { 
    waitForRenderFrames, 
    getConsoleLogs, 
    spawnPlantAt,
    advanceGameTime,
    getSoilAt
} = require('./test-utils');

test.describe('P/K Regeneration System', () => {
    test('Base weathering regenerates P/K over time', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        // Get a soil cell with depleted P/K
        const testCell = { x: 0, y: 0 };
        
        // Manually deplete P/K to near-zero
        await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return;
            
            const soil = soilManager.getSoilAt(x, y);
            if (soil) {
                soil.phosphorus = 5.0;
                soil.potassium = 5.0;
                soil.fertility = soil.calculateFertility();
            }
        }, testCell);
        
        // Get initial P/K values
        const initial = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return null;
            
            const soil = soilManager.getSoilAt(x, y);
            if (!soil) return null;
            
            return {
                phosphorus: soil.phosphorus,
                potassium: soil.potassium
            };
        }, testCell);
        
        console.log(`Initial P/K: P=${initial.phosphorus.toFixed(2)}, K=${initial.potassium.toFixed(2)}`);
        
        // Advance 10 game days (weathering should add 0.02 * 10 = 0.2 per nutrient)
        await advanceGameTime(page, 10);
        await waitForRenderFrames(page, 10);
        
        // Get final P/K values
        const final = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return null;
            
            const soil = soilManager.getSoilAt(x, y);
            if (!soil) return null;
            
            return {
                phosphorus: soil.phosphorus,
                potassium: soil.potassium
            };
        }, testCell);
        
        console.log(`Final P/K: P=${final.phosphorus.toFixed(2)}, K=${final.potassium.toFixed(2)}`);
        
        const pIncrease = final.phosphorus - initial.phosphorus;
        const kIncrease = final.potassium - initial.potassium;
        
        console.log(`P/K Increase: P=+${pIncrease.toFixed(2)}, K=+${kIncrease.toFixed(2)}`);
        
        // Validate weathering occurred (should be ~0.2 after 10 days)
        expect(pIncrease).toBeGreaterThan(0.1);
        expect(kIncrease).toBeGreaterThan(0.1);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/pk-weathering.png' });
    });
    
    test('Oak leaf litter deposits P/K', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        // Spawn mature oak tree
        const oakPos = { x: 0, y: 0 };
        await spawnPlantAt(page, oakPos.x, oakPos.y, 'quercus_robur', 'MatureTree');
        await waitForRenderFrames(page, 10);
        
        // Get initial P/K in soil under oak
        const initial = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return null;
            
            const gridCoords = soilManager.worldToGrid(x, y);
            const soil = soilManager.getSoilAt(gridCoords.x, gridCoords.y);
            if (!soil || !soil.nutrientLayers) return null;
            
            return {
                phosphorus: soil.nutrientLayers.surface.phosphorus,
                potassium: soil.nutrientLayers.surface.potassium
            };
        }, oakPos);
        
        console.log(`Initial Oak P/K: P=${initial.phosphorus.toFixed(2)}, K=${initial.potassium.toFixed(2)}`);
        
        // Advance 20 game days (leaf litter should add 0.5 * 20 = 10 per nutrient)
        await advanceGameTime(page, 20);
        await waitForRenderFrames(page, 10);
        
        // Get final P/K
        const final = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return null;
            
            const gridCoords = soilManager.worldToGrid(x, y);
            const soil = soilManager.getSoilAt(gridCoords.x, gridCoords.y);
            if (!soil || !soil.nutrientLayers) return null;
            
            return {
                phosphorus: soil.nutrientLayers.surface.phosphorus,
                potassium: soil.nutrientLayers.surface.potassium
            };
        }, oakPos);
        
        console.log(`Final Oak P/K: P=${final.phosphorus.toFixed(2)}, K=${final.potassium.toFixed(2)}`);
        
        const pIncrease = final.phosphorus - initial.phosphorus;
        const kIncrease = final.potassium - initial.potassium;
        
        console.log(`P/K Increase from Leaf Litter: P=+${pIncrease.toFixed(2)}, K=+${kIncrease.toFixed(2)}`);
        
        // Validate leaf litter deposited P/K (should be ~10 after 20 days)
        expect(pIncrease).toBeGreaterThan(5.0);
        expect(kIncrease).toBeGreaterThan(5.0);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/pk-leaf-litter.png' });
    });
    
    test('Flood events deposit P/K near rivers', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        // Find a river tile
        const riverInfo = await page.evaluate(() => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return null;
            
            const terrainGen = soilManager.terrainGenerator;
            if (!terrainGen) return null;
            
            const riverTiles = terrainGen.getRiverTiles();
            if (!riverTiles || riverTiles.size === 0) return null;
            
            // Get first river tile
            const firstKey = Array.from(riverTiles)[0];
            const [x, y] = firstKey.split(',').map(Number);
            
            return { riverX: x, riverY: y };
        });
        
        if (!riverInfo) {
            console.log('No rivers found - skipping flood test');
            return;
        }
        
        // Find a floodplain cell near river (within radius 5)
        const floodplainCell = { 
            x: riverInfo.riverX + 3, 
            y: riverInfo.riverY + 3 
        };
        
        // Get initial P/K
        const initial = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return null;
            
            const soil = soilManager.getSoilAt(x, y);
            if (!soil) return null;
            
            return {
                phosphorus: soil.phosphorus,
                potassium: soil.potassium
            };
        }, floodplainCell);
        
        console.log(`Initial Floodplain P/K: P=${initial.phosphorus.toFixed(2)}, K=${initial.potassium.toFixed(2)}`);
        
        // Advance 9 game days (flood interval is 8 days, so should trigger 1 flood)
        await advanceGameTime(page, 9);
        await waitForRenderFrames(page, 10);
        
        // Get final P/K
        const final = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return null;
            
            const soil = soilManager.getSoilAt(x, y);
            if (!soil) return null;
            
            return {
                phosphorus: soil.phosphorus,
                potassium: soil.potassium
            };
        }, floodplainCell);
        
        console.log(`Final Floodplain P/K: P=${final.phosphorus.toFixed(2)}, K=${final.potassium.toFixed(2)}`);
        
        const pIncrease = final.phosphorus - initial.phosphorus;
        const kIncrease = final.potassium - initial.potassium;
        
        console.log(`P/K Increase from Flood: P=+${pIncrease.toFixed(2)}, K=+${kIncrease.toFixed(2)}`);
        
        // Validate flood deposited P/K (new value: 3 per nutrient with falloff)
        // At distance 3, falloff = 1 - (sqrt(18)/5) = ~0.15
        // Expected: 3 * 0.15 = ~0.45 per nutrient
        expect(pIncrease).toBeGreaterThan(0.2);
        expect(kIncrease).toBeGreaterThan(0.2);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/pk-flood.png' });
    });
    
    test('Console logs show weathering system active', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        // Advance 2 days to trigger weathering
        await advanceGameTime(page, 2);
        await waitForRenderFrames(page, 10);
        
        const logs = await getConsoleLogs(page);
        const weatheringLogs = logs.filter(log => log.includes('[WEATHERING]'));
        
        console.log('Weathering logs found:', weatheringLogs.length);
        weatheringLogs.forEach(log => console.log(log));
        
        // Validate weathering logs exist
        expect(weatheringLogs.length).toBeGreaterThan(0);
    });
});
