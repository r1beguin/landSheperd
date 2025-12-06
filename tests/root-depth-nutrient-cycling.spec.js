/**
 * MILESTONE 8: Root Depth & Nutrient Cycling System Integration Test
 * 
 * Tests all 8 milestones:
 * 1. 2-layer soil system (surface/deep)
 * 2. Root depth-based nutrient access
 * 3. Leaf litter deposition from mature trees
 * 4. Nutrient leaching during rain
 * 5. Root lift (deep → surface)
 * 6. Mycorrhizal network sharing
 * 7. Terrain generation with layers
 * 8. Integration validation
 */

const { test, expect } = require('@playwright/test');

// Utility functions
async function waitForRenderFrames(page, count = 5) {
    for (let i = 0; i < count; i++) {
        await page.evaluate(() => new Promise(requestAnimationFrame));
    }
}

async function getGameDay(page) {
    return await page.evaluate(() => {
        return window.graphicsEngine?.timeManager?.getCurrentDay() || 0;
    });
}

async function advanceGameDays(page, days) {
    await page.evaluate((daysToAdvance) => {
        const timeManager = window.graphicsEngine.timeManager;
        const realSecondsPerGameDay = timeManager.config.realSecondsPerGameDay;
        const currentDay = timeManager.getElapsedGameDays();
        timeManager.gameTime = (currentDay + daysToAdvance) * realSecondsPerGameDay;
    }, days);
    await waitForRenderFrames(page, 10);
}

async function setWeather(page, weather) {
    await page.evaluate((newWeather) => {
        window.graphicsEngine.weatherManager.transitionToWeather(newWeather, 0);
    }, weather);
    await waitForRenderFrames(page, 5);
}

test.describe('Root Depth & Nutrient Cycling System', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 20);
    });
    
    test('MILESTONE 1: Soil has 2-layer nutrient structure', async ({ page }) => {
        const soilLayers = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(0, 0);
            
            if (!soil || !soil.nutrientLayers) {
                return { error: 'No layers found' };
            }
            
            return {
                surface: soil.nutrientLayers.surface,
                deep: soil.nutrientLayers.deep,
                hasLayers: !!soil.nutrientLayers
            };
        });
        
        expect(soilLayers.hasLayers).toBe(true);
        expect(soilLayers.surface).toBeDefined();
        expect(soilLayers.deep).toBeDefined();
        expect(soilLayers.surface.nitrogen).toBeGreaterThan(0);
        expect(soilLayers.deep.nitrogen).toBeGreaterThan(0);
        
        console.log('✓ MILESTONE 1: 2-layer soil system confirmed');
    });
    
    test('MILESTONE 2: Root depth profiles affect nutrient access', async ({ page }) => {
        const rootAccessTest = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const soilManager = window.graphicsEngine.soilManager;
            
            // Create test soil with known values
            const soil = soilManager.getSoilAt(0, 0);
            if (!soil) return { error: 'No soil' };
            
            // Set surface low, deep high
            soil.updateNutrientsLayered('surface', 10, 10, 10, 10);
            soil.updateNutrientsLayered('deep', 60, 60, 60, 60);
            
            // Get oak (deep roots) and nettles (shallow roots) species
            const oakConfig = plantManager.getSpeciesById('quercus_robur');
            const nettlesConfig = plantManager.getSpeciesById('urtica_dioica');
            
            // Create temporary plants to test
            const oakPlant = new Plant(0, 0, oakConfig, 'Sapling', 0);
            const nettlesPlant = new Plant(0, 0, nettlesConfig, 'Seedling', 0);
            
            // Get effective nutrients for each
            const oakNutrients = oakPlant.getEffectiveNutrients(soil);
            const nettlesNutrients = nettlesPlant.getEffectiveNutrients(soil);
            
            return {
                oakEffectiveN: oakNutrients.nitrogen,
                nettlesEffectiveN: nettlesNutrients.nitrogen,
                oakCanAccess: oakNutrients.nitrogen > 30, // Oak should access deep nutrients
                nettlesCannotAccess: nettlesNutrients.nitrogen < 20 // Nettles mostly surface
            };
        });
        
        expect(rootAccessTest.oakCanAccess).toBe(true);
        expect(rootAccessTest.nettlesCannotAccess).toBe(true);
        expect(rootAccessTest.oakEffectiveN).toBeGreaterThan(rootAccessTest.nettlesEffectiveN);
        
        console.log('✓ MILESTONE 2: Root depth access working');
        console.log(`  Oak effective N: ${rootAccessTest.oakEffectiveN.toFixed(1)}`);
        console.log(`  Nettles effective N: ${rootAccessTest.nettlesEffectiveN.toFixed(1)}`);
    });
    
    test('MILESTONE 3: Mature trees deposit leaf litter', async ({ page }) => {
        // Spawn mature oak
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            plantManager.addPlant(0, 0, 'quercus_robur', 0, 'MatureTree');
        });
        await waitForRenderFrames(page, 5);
        
        const beforeOM = await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(0, 0);
            return soil.nutrientLayers.surface.organicMatter;
        });
        
        // Advance time 10 days
        await advanceGameDays(page, 10);
        
        const afterOM = await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(0, 0);
            return soil.nutrientLayers.surface.organicMatter;
        });
        
        expect(afterOM).toBeGreaterThan(beforeOM);
        console.log('✓ MILESTONE 3: Leaf litter deposition working');
        console.log(`  OM before: ${beforeOM.toFixed(1)}, after: ${afterOM.toFixed(1)}`);
    });
    
    test('MILESTONE 4: Rain causes nutrient leaching', async ({ page }) => {
        // Set weather to rainy
        await setWeather(page, 'rainy');
        
        const beforeNutrients = await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(0, 0);
            return {
                surfaceN: soil.nutrientLayers.surface.nitrogen,
                deepN: soil.nutrientLayers.deep.nitrogen
            };
        });
        
        // Let rain happen for 20 days
        await advanceGameDays(page, 20);
        
        const afterNutrients = await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(0, 0);
            return {
                surfaceN: soil.nutrientLayers.surface.nitrogen,
                deepN: soil.nutrientLayers.deep.nitrogen
            };
        });
        
        expect(afterNutrients.surfaceN).toBeLessThan(beforeNutrients.surfaceN);
        expect(afterNutrients.deepN).toBeGreaterThan(beforeNutrients.deepN);
        
        console.log('✓ MILESTONE 4: Leaching system working');
        console.log(`  Surface N: ${beforeNutrients.surfaceN.toFixed(1)} → ${afterNutrients.surfaceN.toFixed(1)}`);
        console.log(`  Deep N: ${beforeNutrients.deepN.toFixed(1)} → ${afterNutrients.deepN.toFixed(1)}`);
    });
    
    test('MILESTONE 5: Mature trees perform root lift', async ({ page }) => {
        // Create soil with rich deep layer but poor surface
        await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(0, 0);
            soil.updateNutrientsLayered('surface', 10, 10, 10, 10);
            soil.updateNutrientsLayered('deep', 50, 50, 50, 50);
        });
        
        // Plant mature oak
        await page.evaluate(() => {
            window.graphicsEngine.plantManager.addPlant(0, 0, 'quercus_robur', 0, 'MatureTree');
        });
        await waitForRenderFrames(page, 5);
        
        const beforeNutrients = await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(0, 0);
            return {
                surfaceN: soil.nutrientLayers.surface.nitrogen,
                deepN: soil.nutrientLayers.deep.nitrogen
            };
        });
        
        // Advance time 10 days for root lift to occur
        await advanceGameDays(page, 10);
        
        const afterNutrients = await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(0, 0);
            return {
                surfaceN: soil.nutrientLayers.surface.nitrogen,
                deepN: soil.nutrientLayers.deep.nitrogen
            };
        });
        
        expect(afterNutrients.surfaceN).toBeGreaterThan(beforeNutrients.surfaceN);
        expect(afterNutrients.deepN).toBeLessThan(beforeNutrients.deepN);
        
        console.log('✓ MILESTONE 5: Root lift working');
        console.log(`  Surface N: ${beforeNutrients.surfaceN.toFixed(1)} → ${afterNutrients.surfaceN.toFixed(1)}`);
        console.log(`  Deep N: ${beforeNutrients.deepN.toFixed(1)} → ${afterNutrients.deepN.toFixed(1)}`);
    });
    
    test('MILESTONE 6: Mycorrhizal network shares nutrients', async ({ page }) => {
        // Plant oak in rich soil
        await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const plantManager = window.graphicsEngine.plantManager;
            
            // Rich soil at (0,0)
            const richSoil = soilManager.getSoilAt(0, 0);
            richSoil.updateNutrientsLayered('deep', 70, 70, 70, 70);
            plantManager.addPlant(0, 0, 'quercus_robur', 0, 'MatureTree');
            
            // Poor soil at (2,0) - within shareRadius=2
            const poorSoil = soilManager.getSoilAt(2, 0);
            poorSoil.updateNutrientsLayered('deep', 25, 25, 25, 25);
            plantManager.addPlant(2, 0, 'quercus_robur', 0, 'MatureTree');
        });
        await waitForRenderFrames(page, 5);
        
        const beforePoorN = await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(2, 0);
            return soil.nutrientLayers.deep.nitrogen;
        });
        
        // Advance time 20 days for sharing
        await advanceGameDays(page, 20);
        
        const afterPoorN = await page.evaluate(() => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(2, 0);
            return soil.nutrientLayers.deep.nitrogen;
        });
        
        expect(afterPoorN).toBeGreaterThan(beforePoorN);
        
        console.log('✓ MILESTONE 6: Mycorrhizal network working');
        console.log(`  Poor oak deep N: ${beforePoorN.toFixed(1)} → ${afterPoorN.toFixed(1)}`);
    });
    
    test('MILESTONE 7: Terrain generation initializes both layers', async ({ page }) => {
        const randomSoils = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const samples = [];
            
            // Sample 10 random soil cells
            for (let i = 0; i < 10; i++) {
                const x = Math.floor(Math.random() * 10) - 5;
                const y = Math.floor(Math.random() * 10) - 5;
                const soil = soilManager.getSoilAt(x, y);
                
                if (soil && soil.nutrientLayers) {
                    samples.push({
                        x, y,
                        hasLayers: !!soil.nutrientLayers,
                        surfaceN: soil.nutrientLayers.surface.nitrogen,
                        deepN: soil.nutrientLayers.deep.nitrogen
                    });
                }
            }
            
            return samples;
        });
        
        expect(randomSoils.length).toBeGreaterThan(0);
        randomSoils.forEach(soil => {
            expect(soil.hasLayers).toBe(true);
            expect(soil.surfaceN).toBeGreaterThan(0);
            expect(soil.deepN).toBeGreaterThan(0);
        });
        
        console.log('✓ MILESTONE 7: Terrain generation with layers confirmed');
    });
    
    test('MILESTONE 8: Oak forest formation with nutrient cycling', async ({ page }) => {
        // Plant 5 oak saplings in rich zone
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const soilManager = window.graphicsEngine.soilManager;
            
            const positions = [[0,0], [2,0], [0,2], [2,2], [1,1]];
            positions.forEach(([x, y]) => {
                // Set rich soil
                const soil = soilManager.getSoilAt(x, y);
                if (soil) {
                    soil.updateNutrientsLayered('surface', 60, 40, 40, 40);
                    soil.updateNutrientsLayered('deep', 60, 40, 50, 30);
                }
                plantManager.addPlant(x, y, 'quercus_robur', 0, 'Sapling');
            });
        });
        await waitForRenderFrames(page, 10);
        
        const initialCount = await page.evaluate(() => {
            return window.graphicsEngine.plantManager.getAllPlants().length;
        });
        
        // Advance 100 days
        await advanceGameDays(page, 100);
        
        const results = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const plants = plantManager.getAllPlants();
            const matureTrees = plants.filter(p => p.stage === 'MatureTree');
            const youngTrees = plants.filter(p => p.stage === 'YoungTree');
            
            return {
                totalPlants: plants.length,
                matureTrees: matureTrees.length,
                youngTrees: youngTrees.length
            };
        });
        
        expect(results.totalPlants).toBeGreaterThan(initialCount);
        expect(results.matureTrees).toBeGreaterThan(0);
        
        console.log('✓ MILESTONE 8: Oak forest formation successful');
        console.log(`  Initial: ${initialCount}, Final: ${results.totalPlants}`);
        console.log(`  Mature trees: ${results.matureTrees}, Young trees: ${results.youngTrees}`);
    });
});
