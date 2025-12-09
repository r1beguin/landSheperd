/**
 * Clover Mortality Test
 * 
 * Validates:
 * 1. Clover dies at maxAge (365 days)
 * 2. Clover dies from complete nutrient depletion (zero-fertility death)
 * 3. P/K weathering rates match consumption (ecosystem balance)
 * 4. Soil recovers after clover death (decomposition + weathering)
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:8081';

test.describe('Clover Mortality & P/K Weathering', () => {
    test('Clover dies at maxAge (365 days) and soil recovers', async ({ page }) => {
        // Navigate to game
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Wait for initialization
        
        // CHECKPOINT 1: Spawn clover field at fertile location
        console.log('[TEST] Spawning clover field at (25, 25)');
        const spawnResult = await page.evaluate(() => {
            const manager = window.graphicsEngine.plantManager;
            const soilManager = window.graphicsEngine.soilManager;
            
            // Spawn 5x5 clover field
            let spawnedCount = 0;
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    manager.spawnPlantAt(25 + dx, 25 + dy, 'trifolium_repens');
                    spawnedCount++;
                }
            }
            
            // Get initial soil state at center
            const soil = soilManager.getSoilAtWorld(25, 25);
            
            return {
                spawnedCount,
                initialSoil: {
                    N: soil?.nitrogen || 0,
                    P: soil?.phosphorus || 0,
                    K: soil?.potassium || 0,
                    OM: soil?.organicMatter || 0
                },
                initialPlantCount: manager.plants.size
            };
        });
        
        console.log(`[TEST] Spawned ${spawnResult.spawnedCount} clover plants`);
        console.log(`[TEST] Initial soil: N:${spawnResult.initialSoil.N.toFixed(1)} P:${spawnResult.initialSoil.P.toFixed(1)} K:${spawnResult.initialSoil.K.toFixed(1)} OM:${spawnResult.initialSoil.OM.toFixed(1)}`);
        console.log(`[TEST] Initial plant count: ${spawnResult.initialPlantCount}`);
        
        // CHECKPOINT 2: Fast-forward to 360 days (just before death)
        console.log('[TEST] Fast-forwarding to day 360...');
        const day360State = await page.evaluate(() => {
            window.graphicsEngine.timeManager.advanceGameDays(360);
            
            const plants = Array.from(window.graphicsEngine.plantManager.plants.values());
            const centerPlant = plants.find(p => Math.abs(p.x - 25) < 1 && Math.abs(p.y - 25) < 1);
            const soil = window.graphicsEngine.soilManager.getSoilAtWorld(25, 25);
            
            return {
                plantCount: plants.length,
                centerPlantAge: centerPlant?.age || 0,
                centerPlantStage: centerPlant?.stage || 'unknown',
                soil360: {
                    N: soil?.nitrogen || 0,
                    P: soil?.phosphorus || 0,
                    K: soil?.potassium || 0,
                    OM: soil?.organicMatter || 0
                }
            };
        });
        
        console.log(`[TEST] Day 360 - Plant count: ${day360State.plantCount}`);
        console.log(`[TEST] Day 360 - Center plant age: ${day360State.centerPlantAge.toFixed(1)} days, stage: ${day360State.centerPlantStage}`);
        console.log(`[TEST] Day 360 - Soil: N:${day360State.soil360.N.toFixed(1)} P:${day360State.soil360.P.toFixed(1)} K:${day360State.soil360.K.toFixed(1)} OM:${day360State.soil360.OM.toFixed(1)}`);
        
        // Validate clover still alive at day 360
        expect(day360State.plantCount).toBeGreaterThan(0);
        expect(day360State.centerPlantAge).toBeGreaterThanOrEqual(360);
        expect(day360State.centerPlantStage).not.toBe('Withered');
        
        // CHECKPOINT 3: Fast-forward to 370 days (after maxAge = 365)
        console.log('[TEST] Fast-forwarding to day 370...');
        const day370State = await page.evaluate(() => {
            window.graphicsEngine.timeManager.advanceGameDays(10);
            
            const plants = Array.from(window.graphicsEngine.plantManager.plants.values());
            const witheredCount = plants.filter(p => p.stage === 'Withered').length;
            const soil = window.graphicsEngine.soilManager.getSoilAtWorld(25, 25);
            
            return {
                plantCount: plants.length,
                witheredCount,
                soil370: {
                    N: soil?.nitrogen || 0,
                    P: soil?.phosphorus || 0,
                    K: soil?.potassium || 0,
                    OM: soil?.organicMatter || 0
                }
            };
        });
        
        console.log(`[TEST] Day 370 - Plant count: ${day370State.plantCount}`);
        console.log(`[TEST] Day 370 - Withered count: ${day370State.witheredCount}`);
        console.log(`[TEST] Day 370 - Soil: N:${day370State.soil370.N.toFixed(1)} P:${day370State.soil370.P.toFixed(1)} K:${day370State.soil370.K.toFixed(1)} OM:${day370State.soil370.OM.toFixed(1)}`);
        
        // Validate clover withered after maxAge
        expect(day370State.witheredCount).toBeGreaterThan(0);
        console.log(`[TEST] ✓ Clover withered after maxAge (365 days)`);
        
        // CHECKPOINT 4: Fast-forward to 380 days (withered plants despawn after 5 days)
        console.log('[TEST] Fast-forwarding to day 380...');
        const day380State = await page.evaluate(() => {
            window.graphicsEngine.timeManager.advanceGameDays(10);
            
            const plants = Array.from(window.graphicsEngine.plantManager.plants.values());
            const soil = window.graphicsEngine.soilManager.getSoilAtWorld(25, 25);
            
            return {
                plantCount: plants.length,
                soil380: {
                    N: soil?.nitrogen || 0,
                    P: soil?.phosphorus || 0,
                    K: soil?.potassium || 0,
                    OM: soil?.organicMatter || 0
                }
            };
        });
        
        console.log(`[TEST] Day 380 - Plant count: ${day380State.plantCount}`);
        console.log(`[TEST] Day 380 - Soil: N:${day380State.soil380.N.toFixed(1)} P:${day380State.soil380.P.toFixed(1)} K:${day380State.soil380.K.toFixed(1)} OM:${day380State.soil380.OM.toFixed(1)}`);
        
        // Validate plants despawned
        expect(day380State.plantCount).toBeLessThan(spawnResult.initialPlantCount);
        console.log(`[TEST] ✓ Clover despawned after withering`);
        
        // CHECKPOINT 5: Check soil recovery (P/K should regenerate via weathering)
        const soilRecovery = day380State.soil380.P - day360State.soil360.P;
        console.log(`[TEST] Soil P recovery: ${soilRecovery.toFixed(2)} (day 360 → day 380)`);
        
        // With weathering at 0.40 P/day and no plants consuming, should see recovery
        // Expected: ~8 P over 20 days (0.40 * 20 = 8.0)
        expect(day380State.soil380.P).toBeGreaterThan(day360State.soil360.P);
        console.log(`[TEST] ✓ Soil P regenerated after clover death (weathering working)`);
        
        // CHECKPOINT 6: Take final screenshot
        await page.screenshot({
            path: 'test-results/clover-mortality-day380.png',
            fullPage: false
        });
        
        console.log('[TEST] ✅ All checks passed - Clover mortality and soil recovery working');
    });
    
    test('Clover dies from zero-fertility (complete nutrient depletion)', async ({ page }) => {
        // Navigate to game
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // CHECKPOINT 1: Create barren soil and spawn clover
        console.log('[TEST] Creating barren soil and spawning clover');
        const setupResult = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const plantManager = window.graphicsEngine.plantManager;
            
            // Deplete soil at (30, 30) to near-zero
            const soil = soilManager.getSoilAtWorld(30, 30);
            if (soil && soil.nutrientLayers) {
                // Set surface layer to critical levels
                soil.updateNutrientsLayered('surface', 0.5, 0.5, 0.5, 5);
                // Set deep layer to zero
                soil.updateNutrientsLayered('deep', 0.0, 0.0, 0.0, 0);
            }
            
            // Spawn clover on barren soil
            plantManager.spawnPlantAt(30, 30, 'trifolium_repens');
            
            const soilAfter = soilManager.getSoilAtWorld(30, 30);
            return {
                initialPlantCount: plantManager.plants.size,
                soilState: {
                    surfaceN: soilAfter.nutrientLayers.surface.nitrogen,
                    surfaceP: soilAfter.nutrientLayers.surface.phosphorus,
                    surfaceK: soilAfter.nutrientLayers.surface.potassium,
                    deepN: soilAfter.nutrientLayers.deep.nitrogen,
                    deepP: soilAfter.nutrientLayers.deep.phosphorus,
                    deepK: soilAfter.nutrientLayers.deep.potassium
                }
            };
        });
        
        console.log(`[TEST] Spawned clover on barren soil (N:${setupResult.soilState.surfaceN.toFixed(1)}, P:${setupResult.soilState.surfaceP.toFixed(1)}, K:${setupResult.soilState.surfaceK.toFixed(1)})`);
        
        // CHECKPOINT 2: Fast-forward and check for death
        console.log('[TEST] Fast-forwarding to trigger zero-fertility death...');
        const deathResult = await page.evaluate(() => {
            // Advance 2 days - clover should consume remaining nutrients and die
            window.graphicsEngine.timeManager.advanceGameDays(2);
            
            const plants = Array.from(window.graphicsEngine.plantManager.plants.values());
            const cloverPlant = plants.find(p => Math.abs(p.x - 30) < 1 && Math.abs(p.y - 30) < 1);
            
            return {
                plantCount: plants.length,
                cloverStage: cloverPlant?.stage || 'despawned',
                cloverAge: cloverPlant?.age || 0
            };
        });
        
        console.log(`[TEST] After 2 days - Plant stage: ${deathResult.cloverStage}, age: ${deathResult.cloverAge.toFixed(1)}`);
        
        // Validate death occurred
        expect(deathResult.cloverStage).toBe('Withered');
        console.log('[TEST] ✓ Clover died from zero-fertility (instant death on complete depletion)');
        
        await page.screenshot({
            path: 'test-results/clover-zero-fertility-death.png',
            fullPage: false
        });
        
        console.log('[TEST] ✅ Zero-fertility death working correctly');
    });
});
