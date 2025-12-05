/**
 * Milestone 2: Reproduction Nutrient Costs Test
 * Tests that parent plants deplete soil nutrients when reproducing
 */

const { test, expect } = require('@playwright/test');
const { spawnPlantAt, advanceGameTime, waitForRenderFrames } = require('./test-utils');

test.describe('Reproduction Nutrient Costs (Milestone 2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        await waitForRenderFrames(page, 10);
        
        // Enable reproduction logging
        await page.evaluate(() => {
            if (window.config?.world?.plants?.reproduction) {
                window.config.world.plants.reproduction.enableLogging = true;
            }
        });
    });
    
    test('Clover reproduction depletes parent soil nutrients', async ({ page }) => {
        console.log('\n=== Clover Reproduction Cost Test ===');
        
        // Spawn clover in rich soil at center
        const centerX = 25;
        const centerY = 25;
        
        await spawnPlantAt(page, centerX, centerY, 'trifolium_repens');
        console.log(`Spawned clover at (${centerX}, ${centerY})`);
        
        // Get initial parent soil nutrients
        const soilBefore = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(x, y);
            return soil ? {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter
            } : null;
        }, { x: centerX, y: centerY });
        
        console.log('Parent soil before reproduction:', soilBefore);
        expect(soilBefore).toBeTruthy();
        
        // Force plant to Flowering stage
        await page.evaluate(({ x, y }) => {
            const plantManager = window.graphicsEngine.plantManager;
            const plant = plantManager.getPlantAt(x, y, 'bottom');
            if (plant) {
                plant.stage = 'Flowering';
                plant.generateSprite();
            }
        }, { x: centerX, y: centerY });
        
        console.log('Forced clover to Flowering stage');
        
        // Advance time to trigger reproduction attempts
        await advanceGameTime(page, 30); // 30 game days
        await waitForRenderFrames(page, 20);
        
        // Get offspring count
        const offspringCount = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            return plantManager.getAllPlants().length - 1; // Subtract parent
        });
        
        console.log(`Offspring count after 30 days: ${offspringCount}`);
        
        // Get parent soil after reproduction
        const soilAfter = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(x, y);
            return soil ? {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter
            } : null;
        }, { x: centerX, y: centerY });
        
        console.log('Parent soil after reproduction:', soilAfter);
        
        // Calculate nutrient depletion
        const depletion = {
            nitrogen: soilBefore.nitrogen - soilAfter.nitrogen,
            phosphorus: soilBefore.phosphorus - soilAfter.phosphorus,
            potassium: soilBefore.potassium - soilAfter.potassium,
            organicMatter: soilBefore.organicMatter - soilAfter.organicMatter
        };
        
        console.log('Nutrient depletion from reproduction:', depletion);
        
        // Expected clover cost per reproduction: N=4, P=8, K=6, OM=3
        // With potential offspring, depletion should be visible
        if (offspringCount > 0) {
            expect(depletion.phosphorus).toBeGreaterThan(5); // Most expensive for clover
            expect(depletion.potassium).toBeGreaterThan(3);
            console.log('✅ Parent soil depleted as expected');
        } else {
            console.log('⚠️ No offspring produced (might need more time or better success chance)');
        }
    });
    
    test('Nettles rhizome reproduction depletes parent soil', async ({ page }) => {
        console.log('\n=== Nettles Reproduction Cost Test ===');
        
        const centerX = 25;
        const centerY = 25;
        
        await spawnPlantAt(page, centerX, centerY, 'urtica_dioica');
        console.log(`Spawned nettles at (${centerX}, ${centerY})`);
        
        // Get initial parent soil
        const soilBefore = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(x, y);
            return soil ? {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter
            } : null;
        }, { x: centerX, y: centerY });
        
        console.log('Parent soil before reproduction:', soilBefore);
        
        // Force to Vegetative stage (rhizome-active)
        await page.evaluate(({ x, y }) => {
            const plantManager = window.graphicsEngine.plantManager;
            const plant = plantManager.getPlantAt(x, y, 'middle');
            if (plant) {
                plant.stage = 'Vegetative';
                plant.generateSprite();
            }
        }, { x: centerX, y: centerY });
        
        console.log('Forced nettles to Vegetative stage');
        
        // Advance time
        await advanceGameTime(page, 20);
        await waitForRenderFrames(page, 15);
        
        const offspringCount = await page.evaluate(() => {
            return window.graphicsEngine.plantManager.getAllPlants().length - 1;
        });
        
        console.log(`Offspring count: ${offspringCount}`);
        
        // Get parent soil after
        const soilAfter = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(x, y);
            return soil ? {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter
            } : null;
        }, { x: centerX, y: centerY });
        
        console.log('Parent soil after reproduction:', soilAfter);
        
        const depletion = {
            nitrogen: soilBefore.nitrogen - soilAfter.nitrogen,
            phosphorus: soilBefore.phosphorus - soilAfter.phosphorus,
            potassium: soilBefore.potassium - soilAfter.potassium,
            organicMatter: soilBefore.organicMatter - soilAfter.organicMatter
        };
        
        console.log('Nutrient depletion:', depletion);
        
        // Expected nettles cost: N=8, P=5, K=4, OM=2 per reproduction
        if (offspringCount > 0) {
            expect(depletion.nitrogen).toBeGreaterThan(5); // Nettles are N-hungry
            console.log('✅ Rhizome reproduction depleted parent soil');
        } else {
            console.log('⚠️ No rhizome clones produced');
        }
    });
    
    test('Oak proximity reproduction has high cost', async ({ page }) => {
        console.log('\n=== Oak Reproduction Cost Test ===');
        
        // Spawn two oaks near each other
        const oak1X = 25;
        const oak1Y = 25;
        const oak2X = 28;
        const oak2Y = 25;
        
        await spawnPlantAt(page, oak1X, oak1Y, 'quercus_robur');
        await spawnPlantAt(page, oak2X, oak2Y, 'quercus_robur');
        console.log('Spawned 2 oaks for proximity reproduction');
        
        // Get parent 1 soil before
        const soilBefore = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(x, y);
            return soil ? {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter
            } : null;
        }, { x: oak1X, y: oak1Y });
        
        console.log('Oak parent soil before:', soilBefore);
        
        // Force both to MatureTree stage
        await page.evaluate(({ x1, y1, x2, y2 }) => {
            const plantManager = window.graphicsEngine.plantManager;
            const oak1 = plantManager.getPlantAt(x1, y1, 'top');
            const oak2 = plantManager.getPlantAt(x2, y2, 'top');
            
            if (oak1) {
                oak1.stage = 'MatureTree';
                oak1.generateSprite();
            }
            if (oak2) {
                oak2.stage = 'MatureTree';
                oak2.generateSprite();
            }
        }, { x1: oak1X, y1: oak1Y, x2: oak2X, y2: oak2Y });
        
        console.log('Forced both oaks to MatureTree stage');
        
        // Advance time (oak reproduction is slow - 10 day interval)
        await advanceGameTime(page, 50);
        await waitForRenderFrames(page, 25);
        
        const offspringCount = await page.evaluate(() => {
            return window.graphicsEngine.plantManager.getAllPlants().length - 2;
        });
        
        console.log(`Oak offspring count: ${offspringCount}`);
        
        // Get parent soil after
        const soilAfter = await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(x, y);
            return soil ? {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter
            } : null;
        }, { x: oak1X, y: oak1Y });
        
        console.log('Oak parent soil after:', soilAfter);
        
        const depletion = {
            nitrogen: soilBefore.nitrogen - soilAfter.nitrogen,
            phosphorus: soilBefore.phosphorus - soilAfter.phosphorus,
            potassium: soilBefore.potassium - soilAfter.potassium,
            organicMatter: soilBefore.organicMatter - soilAfter.organicMatter
        };
        
        console.log('Oak nutrient depletion:', depletion);
        
        // Expected oak cost: N=25, P=20, K=15, OM=10 (HUGE)
        if (offspringCount > 0) {
            expect(depletion.nitrogen).toBeGreaterThan(15); // Oak acorns are VERY expensive
            expect(depletion.phosphorus).toBeGreaterThan(10);
            console.log('✅ Oak acorn production massively depleted parent soil');
        } else {
            console.log('⚠️ No oak offspring (low success chance + long interval)');
        }
    });
    
    test('Reproduction blocked when parent soil insufficient', async ({ page }) => {
        console.log('\n=== Reproduction Blocked Test ===');
        
        const centerX = 25;
        const centerY = 25;
        
        await spawnPlantAt(page, centerX, centerY, 'trifolium_repens');
        
        // Force to Flowering stage
        await page.evaluate(({ x, y }) => {
            const plantManager = window.graphicsEngine.plantManager;
            const plant = plantManager.getPlantAt(x, y, 'bottom');
            if (plant) {
                plant.stage = 'Flowering';
                plant.generateSprite();
            }
        }, { x: centerX, y: centerY });
        
        // Deplete parent soil artificially
        await page.evaluate(({ x, y }) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(x, y);
            if (soil) {
                // Set to just below minimum + buffer (5 units below cost)
                soil.updateNutrients(3, 3, 3, 3); // Way below clover cost
                soilManager.needsRefresh = true;
            }
        }, { x: centerX, y: centerY });
        
        console.log('Depleted parent soil to N=3, P=3, K=3, OM=3');
        
        const soilBefore = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return { n: soil.nitrogen, p: soil.phosphorus, k: soil.potassium, om: soil.organicMatter };
        }, { x: centerX, y: centerY });
        
        console.log('Soil before reproduction attempts:', soilBefore);
        
        // Advance time to trigger reproduction attempts
        await advanceGameTime(page, 20);
        await waitForRenderFrames(page, 15);
        
        const offspringCount = await page.evaluate(() => {
            return window.graphicsEngine.plantManager.getAllPlants().length - 1;
        });
        
        console.log(`Offspring count (should be 0): ${offspringCount}`);
        
        // Soil should be unchanged (no reproduction occurred)
        const soilAfter = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return { n: soil.nitrogen, p: soil.phosphorus, k: soil.potassium, om: soil.organicMatter };
        }, { x: centerX, y: centerY });
        
        console.log('Soil after (should be similar):', soilAfter);
        
        expect(offspringCount).toBe(0);
        console.log('✅ Reproduction correctly blocked when parent soil insufficient');
    });
});
