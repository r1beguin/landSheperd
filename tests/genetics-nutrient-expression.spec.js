/**
 * Test Suite: Milestone 3 - Genetic Nutrient Expression
 * 
 * Tests how genetic traits affect:
 * 1. Nutrient consumption during growth stage advancement
 * 2. Nutrient requirement thresholds (resistance to deficiency)
 * 3. Growth rate in marginal soil conditions
 */

const { test, expect } = require('@playwright/test');
const { 
    waitForRenderFrames,
    getGameMetrics,
    sampleEcosystemMetrics,
    advanceGameTimeDeterministic
} = require('./test-utils');

test.describe('Genetics - Nutrient Expression', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForRenderFrames(page, 20); // Wait for initialization
    });

    test('Milestone 3.1 - Genetic efficiency modifies nutrient consumption', async ({ page }) => {
        // SCENARIO: 3 oaks with different genetic profiles
        // Verify that better genes = less nutrient consumption
        
        const results = await page.evaluate(async () => {
            const engine = window.graphicsEngine;
            if (!engine || !engine.plantManager || !engine.soilManager) {
                return { success: false, error: 'Required managers not available' };
            }
            
            const plantManager = engine.plantManager;
            const soilManager = engine.soilManager;
            const currentDay = engine.timeManager?.getCurrentDayPrecise() || 0;
            
            // Clear any existing plants
            plantManager.plants.clear();
            
            // TEST SETUP: Place 3 oaks in uniform soil (25,25), (25,26), (25,27)
            // Set uniform soil conditions (moderate nutrients for testing)
            const testPositions = [
                { gridX: 25, gridY: 25 },
                { gridX: 25, gridY: 26 },
                { gridX: 25, gridY: 27 }
            ];
            
            for (const pos of testPositions) {
                const soil = soilManager.getSoilAt(pos.gridX, pos.gridY);
                if (soil) {
                    // Set moderate nutrients (enough for growth but will show consumption)
                    soil.updateNutrients(50, 50, 50, 50); // N, P, K, OM
                }
            }
            
            // Spawn 3 oaks at Seedling stage
            const speciesConfig = window.SPECIES_REGISTRY?.get('quercus_robur');
            if (!speciesConfig) {
                return { success: false, error: 'Oak species not found' };
            }
            
            const oaks = [];
            
            // OAK 1: High efficiency (gene value 200)
            const oak1Pos = soilManager.gridToWorld(25, 25);
            const oak1 = plantManager.addPlant(oak1Pos.x, oak1Pos.y, 'quercus_robur', currentDay);
            if (oak1 && oak1.genetics) {
                oak1.genetics.nitrogenEfficiency = 200;
                oak1.genetics.phosphorusEfficiency = 200;
                oak1.genetics.potassiumEfficiency = 200;
                oak1.genetics.organicMatterEfficiency = 200;
                oak1.stage = 'Seedling';
                oak1.accumulatedGrowthDays = speciesConfig.growthStages[0].daysToGrow; // Ready to advance
                oaks.push({ plant: oak1, label: 'High Efficiency (200)', gridX: 25, gridY: 25 });
            }
            
            // OAK 2: Baseline (gene value 128)
            const oak2Pos = soilManager.gridToWorld(25, 26);
            const oak2 = plantManager.addPlant(oak2Pos.x, oak2Pos.y, 'quercus_robur', currentDay);
            if (oak2 && oak2.genetics) {
                oak2.genetics.nitrogenEfficiency = 128;
                oak2.genetics.phosphorusEfficiency = 128;
                oak2.genetics.potassiumEfficiency = 128;
                oak2.genetics.organicMatterEfficiency = 128;
                oak2.stage = 'Seedling';
                oak2.accumulatedGrowthDays = speciesConfig.growthStages[0].daysToGrow;
                oaks.push({ plant: oak2, label: 'Baseline (128)', gridX: 25, gridY: 26 });
            }
            
            // OAK 3: Low efficiency (gene value 60)
            const oak3Pos = soilManager.gridToWorld(25, 27);
            const oak3 = plantManager.addPlant(oak3Pos.x, oak3Pos.y, 'quercus_robur', currentDay);
            if (oak3 && oak3.genetics) {
                oak3.genetics.nitrogenEfficiency = 60;
                oak3.genetics.phosphorusEfficiency = 60;
                oak3.genetics.potassiumEfficiency = 60;
                oak3.genetics.organicMatterEfficiency = 60;
                oak3.stage = 'Seedling';
                oak3.accumulatedGrowthDays = speciesConfig.growthStages[0].daysToGrow;
                oaks.push({ plant: oak3, label: 'Low Efficiency (60)', gridX: 25, gridY: 27 });
            }
            
            // CHECKPOINT 1: Record soil nutrients BEFORE growth stage advancement
            const nutrientsBefore = oaks.map(oak => {
                const soil = soilManager.getSoilAt(oak.gridX, oak.gridY);
                return {
                    label: oak.label,
                    nitrogen: soil.nitrogen,
                    phosphorus: soil.phosphorus,
                    potassium: soil.potassium,
                    organicMatter: soil.organicMatter,
                    genetics: {
                        n: oak.plant.genetics.nitrogenEfficiency,
                        p: oak.plant.genetics.phosphorusEfficiency,
                        k: oak.plant.genetics.potassiumEfficiency,
                        om: oak.plant.genetics.organicMatterEfficiency
                    }
                };
            });
            
            // TRIGGER: Manually call advanceGrowthStage for each oak
            for (const oak of oaks) {
                oak.plant.advanceGrowthStage(currentDay);
            }
            
            // CHECKPOINT 2: Record soil nutrients AFTER growth stage advancement
            const nutrientsAfter = oaks.map(oak => {
                const soil = soilManager.getSoilAt(oak.gridX, oak.gridY);
                return {
                    label: oak.label,
                    nitrogen: soil.nitrogen,
                    phosphorus: soil.phosphorus,
                    potassium: soil.potassium,
                    organicMatter: soil.organicMatter,
                    newStage: oak.plant.stage
                };
            });
            
            // CALCULATE: Consumption deltas
            const consumptionData = [];
            for (let i = 0; i < oaks.length; i++) {
                consumptionData.push({
                    label: oaks[i].label,
                    genetics: nutrientsBefore[i].genetics,
                    nitrogenConsumed: Math.round((nutrientsBefore[i].nitrogen - nutrientsAfter[i].nitrogen) * 10) / 10,
                    phosphorusConsumed: Math.round((nutrientsBefore[i].phosphorus - nutrientsAfter[i].phosphorus) * 10) / 10,
                    potassiumConsumed: Math.round((nutrientsBefore[i].potassium - nutrientsAfter[i].potassium) * 10) / 10,
                    organicMatterConsumed: Math.round((nutrientsBefore[i].organicMatter - nutrientsAfter[i].organicMatter) * 10) / 10,
                    newStage: nutrientsAfter[i].newStage
                });
            }
            
            return {
                success: true,
                consumptionData
            };
        });
        
        // VALIDATION
        expect(results.success).toBe(true);
        expect(results.consumptionData).toHaveLength(3);
        
        const highEfficiency = results.consumptionData[0]; // Gene 200
        const baseline = results.consumptionData[1];       // Gene 128
        const lowEfficiency = results.consumptionData[2];  // Gene 60
        
        console.log('\n=== MILESTONE 3.1 RESULTS ===');
        console.log('High Efficiency (200):', highEfficiency);
        console.log('Baseline (128):', baseline);
        console.log('Low Efficiency (60):', lowEfficiency);
        
        // EXPECTATION 1: High efficiency consumes LESS than baseline
        expect(highEfficiency.nitrogenConsumed).toBeLessThan(baseline.nitrogenConsumed);
        expect(highEfficiency.phosphorusConsumed).toBeLessThan(baseline.phosphorusConsumed);
        expect(highEfficiency.potassiumConsumed).toBeLessThan(baseline.potassiumConsumed);
        expect(highEfficiency.organicMatterConsumed).toBeLessThan(baseline.organicMatterConsumed);
        
        // EXPECTATION 2: Low efficiency consumes MORE than baseline
        expect(lowEfficiency.nitrogenConsumed).toBeGreaterThan(baseline.nitrogenConsumed);
        expect(lowEfficiency.phosphorusConsumed).toBeGreaterThan(baseline.phosphorusConsumed);
        expect(lowEfficiency.potassiumConsumed).toBeGreaterThan(baseline.potassiumConsumed);
        expect(lowEfficiency.organicMatterConsumed).toBeGreaterThan(baseline.organicMatterConsumed);
        
        // EXPECTATION 3: All advanced to next stage
        expect(highEfficiency.newStage).toBe('Sapling');
        expect(baseline.newStage).toBe('Sapling');
        expect(lowEfficiency.newStage).toBe('Sapling');
    });

    test('Milestone 3.2 - Genetic efficiency modifies nutrient requirements', async ({ page }) => {
        // SCENARIO: 3 oaks in LOW nutrient soil
        // Verify that better genes = lower minimum thresholds = can survive in marginal soil
        
        const results = await page.evaluate(async () => {
            const engine = window.graphicsEngine;
            if (!engine || !engine.plantManager || !engine.soilManager) {
                return { success: false, error: 'Required managers not available' };
            }
            
            const plantManager = engine.plantManager;
            const soilManager = engine.soilManager;
            const currentDay = engine.timeManager?.getCurrentDayPrecise() || 0;
            
            // Clear any existing plants
            plantManager.plants.clear();
            
            // TEST SETUP: Place 3 oaks in MARGINAL soil
            // Oak minimum requirements: N=20, P=15, K=10, OM=5
            // Set soil to JUST BELOW baseline minimum (should fail for baseline, pass for high-efficiency)
            const testPositions = [
                { gridX: 30, gridY: 25 },
                { gridX: 30, gridY: 26 },
                { gridX: 30, gridY: 27 }
            ];
            
            // Marginal soil: 18 nitrogen (below 20 minimum for baseline)
            for (const pos of testPositions) {
                const soil = soilManager.getSoilAt(pos.gridX, pos.gridY);
                if (soil) {
                    soil.updateNutrients(18, 14, 9, 4); // Slightly below minimum
                }
            }
            
            // Spawn 3 mature oaks (Sapling stage) - they need nutrients to calculate growth rate
            const speciesConfig = window.SPECIES_REGISTRY?.get('quercus_robur');
            if (!speciesConfig) {
                return { success: false, error: 'Oak species not found' };
            }
            
            const oaks = [];
            
            // OAK 1: High efficiency (gene value 200) - should tolerate lower nutrients
            const oak1Pos = soilManager.gridToWorld(30, 25);
            const oak1 = plantManager.addPlant(oak1Pos.x, oak1Pos.y, 'quercus_robur', currentDay);
            if (oak1 && oak1.genetics) {
                oak1.genetics.nitrogenEfficiency = 200;
                oak1.genetics.phosphorusEfficiency = 200;
                oak1.genetics.potassiumEfficiency = 200;
                oak1.genetics.organicMatterEfficiency = 200;
                oak1.stage = 'Sapling';
                oaks.push({ plant: oak1, label: 'High Efficiency (200)', gridX: 30, gridY: 25 });
            }
            
            // OAK 2: Baseline (gene value 128) - should struggle
            const oak2Pos = soilManager.gridToWorld(30, 26);
            const oak2 = plantManager.addPlant(oak2Pos.x, oak2Pos.y, 'quercus_robur', currentDay);
            if (oak2 && oak2.genetics) {
                oak2.genetics.nitrogenEfficiency = 128;
                oak2.genetics.phosphorusEfficiency = 128;
                oak2.genetics.potassiumEfficiency = 128;
                oak2.genetics.organicMatterEfficiency = 128;
                oak2.stage = 'Sapling';
                oaks.push({ plant: oak2, label: 'Baseline (128)', gridX: 30, gridY: 26 });
            }
            
            // OAK 3: Low efficiency (gene value 60) - should fail badly
            const oak3Pos = soilManager.gridToWorld(30, 27);
            const oak3 = plantManager.addPlant(oak3Pos.x, oak3Pos.y, 'quercus_robur', currentDay);
            if (oak3 && oak3.genetics) {
                oak3.genetics.nitrogenEfficiency = 60;
                oak3.genetics.phosphorusEfficiency = 60;
                oak3.genetics.potassiumEfficiency = 60;
                oak3.genetics.organicMatterEfficiency = 60;
                oak3.stage = 'Sapling';
                oaks.push({ plant: oak3, label: 'Low Efficiency (60)', gridX: 30, gridY: 27 });
            }
            
            // CHECKPOINT: Calculate growth rates (uses nutrientScore with genetic modifiers)
            const growthData = oaks.map(oak => {
                const growthRate = oak.plant.calculateGrowthRate();
                const soil = soilManager.getSoilAt(oak.gridX, oak.gridY);
                
                return {
                    label: oak.label,
                    genetics: {
                        n: oak.plant.genetics.nitrogenEfficiency,
                        p: oak.plant.genetics.phosphorusEfficiency,
                        k: oak.plant.genetics.potassiumEfficiency,
                        om: oak.plant.genetics.organicMatterEfficiency
                    },
                    soilNutrients: {
                        nitrogen: soil.nitrogen,
                        phosphorus: soil.phosphorus,
                        potassium: soil.potassium,
                        organicMatter: soil.organicMatter
                    },
                    growthRate: Math.round(growthRate * 1000) / 1000 // 3 decimal places
                };
            });
            
            return {
                success: true,
                growthData
            };
        });
        
        // VALIDATION
        expect(results.success).toBe(true);
        expect(results.growthData).toHaveLength(3);
        
        const highEfficiency = results.growthData[0]; // Gene 200
        const baseline = results.growthData[1];       // Gene 128
        const lowEfficiency = results.growthData[2];  // Gene 60
        
        console.log('\n=== MILESTONE 3.2 RESULTS ===');
        console.log('High Efficiency (200):', highEfficiency);
        console.log('Baseline (128):', baseline);
        console.log('Low Efficiency (60):', lowEfficiency);
        
        // EXPECTATION 1: High efficiency has HIGHER growth rate than baseline (tolerates lower nutrients)
        expect(highEfficiency.growthRate).toBeGreaterThan(baseline.growthRate);
        
        // EXPECTATION 2: Baseline has HIGHER growth rate than low efficiency
        expect(baseline.growthRate).toBeGreaterThan(lowEfficiency.growthRate);
        
        // EXPECTATION 3: Low efficiency should be near zero (severely stunted)
        // Soil is below minimum, low-efficiency needs even MORE, so should be at 0.0
        expect(lowEfficiency.growthRate).toBe(0.0);
        
        // EXPECTATION 4: High efficiency should have non-zero growth (survives in marginal soil)
        expect(highEfficiency.growthRate).toBeGreaterThan(0.0);
    });

    test('Milestone 3.3 - Genetic traits affect long-term survival', async ({ page }) => {
        // SCENARIO: Place high-efficiency and low-efficiency oaks in marginal soil
        // Advance time significantly
        // Verify high-efficiency oak survives while low-efficiency withers
        
        const setupResult = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            if (!engine || !engine.plantManager || !engine.soilManager) {
                return { success: false, error: 'Required managers not available' };
            }
            
            const plantManager = engine.plantManager;
            const soilManager = engine.soilManager;
            const currentDay = engine.timeManager?.getCurrentDayPrecise() || 0;
            
            // Clear plants
            plantManager.plants.clear();
            
            // TEST SETUP: Marginal soil (just below minimum requirements)
            const positions = [
                { gridX: 35, gridY: 25 },
                { gridX: 35, gridY: 27 }
            ];
            
            for (const pos of positions) {
                const soil = soilManager.getSoilAt(pos.gridX, pos.gridY);
                if (soil) {
                    // Set to 18 nitrogen (oak needs 20 minimum for baseline)
                    soil.updateNutrients(18, 14, 9, 4);
                }
            }
            
            // Spawn 2 oaks
            const speciesConfig = window.SPECIES_REGISTRY?.get('quercus_robur');
            if (!speciesConfig) {
                return { success: false, error: 'Oak species not found' };
            }
            
            // OAK 1: High efficiency (should survive)
            const oak1Pos = soilManager.gridToWorld(35, 25);
            const oak1 = plantManager.addPlant(oak1Pos.x, oak1Pos.y, 'quercus_robur', currentDay);
            if (oak1 && oak1.genetics) {
                oak1.genetics.nitrogenEfficiency = 200;
                oak1.genetics.phosphorusEfficiency = 200;
                oak1.genetics.potassiumEfficiency = 200;
                oak1.genetics.organicMatterEfficiency = 200;
                oak1.stage = 'Sapling';
            }
            
            // OAK 2: Low efficiency (should wither)
            const oak2Pos = soilManager.gridToWorld(35, 27);
            const oak2 = plantManager.addPlant(oak2Pos.x, oak2Pos.y, 'quercus_robur', currentDay);
            if (oak2 && oak2.genetics) {
                oak2.genetics.nitrogenEfficiency = 60;
                oak2.genetics.phosphorusEfficiency = 60;
                oak2.genetics.potassiumEfficiency = 60;
                oak2.genetics.organicMatterEfficiency = 60;
                oak2.stage = 'Sapling';
            }
            
            return { success: true, oakCount: plantManager.plants.size };
        });
        
        expect(setupResult.success).toBe(true);
        expect(setupResult.oakCount).toBe(2);
        
        // ADVANCE TIME: 15 game days (enough for stunt grace period + withering)
        await advanceGameTimeDeterministic(page, 15);
        await waitForRenderFrames(page, 10);
        
        // CHECKPOINT: Check oak states
        const finalResult = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const plantManager = engine.plantManager;
            const soilManager = engine.soilManager;
            
            const oakStates = [];
            plantManager.plants.forEach(plant => {
                if (plant.species.id === 'quercus_robur') {
                    const gridCoords = soilManager.worldToGrid(plant.x, plant.y);
                    const soil = soilManager.getSoilAt(gridCoords.x, gridCoords.y);
                    
                    oakStates.push({
                        genetics: {
                            n: plant.genetics.nitrogenEfficiency,
                            p: plant.genetics.phosphorusEfficiency
                        },
                        stage: plant.stage,
                        isStunted: plant.isStunted,
                        daysStunted: plant.daysStunted,
                        growthRate: Math.round(plant.calculateGrowthRate() * 1000) / 1000,
                        soilNitrogen: soil.nitrogen
                    });
                }
            });
            
            return {
                success: true,
                currentDay: Math.floor(engine.timeManager.getCurrentDayPrecise() * 10) / 10,
                oakStates
            };
        });
        
        expect(finalResult.success).toBe(true);
        expect(finalResult.oakStates).toHaveLength(2);
        
        const highEffOak = finalResult.oakStates.find(oak => oak.genetics.n === 200);
        const lowEffOak = finalResult.oakStates.find(oak => oak.genetics.n === 60);
        
        console.log('\n=== MILESTONE 3.3 RESULTS (After 15 days) ===');
        console.log('Current Day:', finalResult.currentDay);
        console.log('High Efficiency Oak:', highEffOak);
        console.log('Low Efficiency Oak:', lowEffOak);
        
        // EXPECTATION 1: High efficiency oak should still be alive (not Withered)
        expect(highEffOak.stage).not.toBe('Withered');
        
        // EXPECTATION 2: Low efficiency oak should be Withered or severely stunted
        // In marginal soil, low-efficiency oak should have been stunted long enough to wither
        expect(lowEffOak.isStunted || lowEffOak.stage === 'Withered').toBe(true);
        
        // EXPECTATION 3: High efficiency has better growth rate
        expect(highEffOak.growthRate).toBeGreaterThan(lowEffOak.growthRate);
    });
});
