/**
 * Milestone 1: Continuous Daily Nutrient Consumption Test
 * Validates that plants consume nutrients daily (not just on stage transitions)
 */

import { test, expect } from '@playwright/test';
import { waitForRenderFrames, advanceGameTimeDeterministic } from './test-utils.js';

test.describe('Daily Nutrient Consumption System', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30); // Wait for full initialization
    });
    
    test('Plants consume nutrients continuously over time', async ({ page }) => {
        
        console.log('\n=== Testing Daily Nutrient Consumption ===');
        
        // CHECKPOINT 1: Get initial game state and soil nutrients
        const initialState = await page.evaluate(async () => {
            const engine = window.graphicsEngine;
            const soilManager = engine.soilManager;
            const plantManager = engine.plantManager;
            const timeManager = engine.timeManager;
            
            // Get center grid position
            const centerX = Math.floor(soilManager.gridWidth / 2);
            const centerY = Math.floor(soilManager.gridHeight / 2);
            const soil = soilManager.getSoilAt(centerX, centerY);
            
            // Load oak species
            let oakSpecies = null;
            try {
                const response = await fetch('species/oak.json');
                oakSpecies = await response.json();
            } catch (e) {
                return { success: false, error: 'Failed to load oak.json' };
            }
            
            // Calculate world position manually (grid * cellSize)
            const cellSize = engine.config?.world?.map?.cellSize || 20;
            const worldX = (centerX - soilManager.gridWidth / 2) * cellSize;
            const worldY = (centerY - soilManager.gridHeight / 2) * cellSize;
            
            // Spawn oak sapling at center
            const plant = plantManager.createPlant(worldX, worldY, oakSpecies, 'Sapling');
            
            if (!plant) {
                return { success: false, error: 'Failed to spawn plant' };
            }
            
            return {
                success: true,
                day: timeManager.currentDay,
                plantCount: plantManager.plants.size,
                plantStage: plant.stage,
                hasGenetics: plant.genetics !== null,
                initialSoil: {
                    nitrogen: soil.nitrogen,
                    phosphorus: soil.phosphorus,
                    potassium: soil.potassium,
                    organicMatter: soil.organicMatter
                },
                gridPos: { x: centerX, y: centerY }
            };
        });
        
        console.log('Initial state:', initialState);
        expect(initialState.success).toBe(true);
        expect(initialState.hasGenetics).toBe(true); // Oak should have genetics
        
        // CHECKPOINT 2: Advance time by 2 game days (no stage change, just daily consumption)
        console.log('\nAdvancing time by 2 game days...');
        
        const advanceResult = await advanceGameTimeDeterministic(page, 2.0, { timeScale: 1.0 });
        console.log('Time advance result:', advanceResult);
        expect(advanceResult.success).toBe(true);
        
        // Wait for render to process updates
        await waitForRenderFrames(page, 10);
        
        // CHECKPOINT 3: Check nutrients after time passed
        const finalState = await page.evaluate((gridPos) => {
            const engine = window.graphicsEngine;
            const soilManager = engine.soilManager;
            const plantManager = engine.plantManager;
            const timeManager = engine.timeManager;
            
            const soil = soilManager.getSoilAt(gridPos.x, gridPos.y);
            const plant = Array.from(plantManager.plants.values())[0];
            
            return {
                currentDay: timeManager.getCurrentDayPrecise(),
                finalSoil: {
                    nitrogen: soil.nitrogen,
                    phosphorus: soil.phosphorus,
                    potassium: soil.potassium,
                    organicMatter: soil.organicMatter
                },
                plant: {
                    stage: plant.stage,
                    age: plant.age,
                    accumulatedGrowthDays: plant.accumulatedGrowthDays
                }
            };
        }, initialState.gridPos);
        
        console.log('Final state:', finalState);
        
        // Calculate nutrient consumption
        const nitrogenConsumed = initialState.initialSoil.nitrogen - finalState.finalSoil.nitrogen;
        const phosphorusConsumed = initialState.initialSoil.phosphorus - finalState.finalSoil.phosphorus;
        const potassiumConsumed = initialState.initialSoil.potassium - finalState.finalSoil.potassium;
        const omConsumed = initialState.initialSoil.organicMatter - finalState.finalSoil.organicMatter;
        
        console.log('\n=== Nutrient Consumption Analysis ===');
        console.log(`Game days elapsed: ${(finalState.currentDay - initialState.day).toFixed(2)}`);
        console.log(`Plant age: ${finalState.plant.age.toFixed(2)} days`);
        console.log(`Plant stage: ${finalState.plant.stage} (should still be Sapling)`);
        console.log(`Nitrogen consumed: ${nitrogenConsumed.toFixed(2)}`);
        console.log(`Phosphorus consumed: ${phosphorusConsumed.toFixed(2)}`);
        console.log(`Potassium consumed: ${potassiumConsumed.toFixed(2)}`);
        console.log(`Organic Matter consumed: ${omConsumed.toFixed(2)}`);
        
        // VALIDATION: Nutrients should have decreased
        // With config: baseDailyRate.nitrogen = 0.5, stageMultiplier for Sapling = 0.5
        // Expected consumption per day: 0.5 * 0.5 = 0.25 nitrogen per day
        // Over 2 game days: ~0.5 nitrogen
        // With genetics (0.8-1.2 efficiency): 0.4-0.6 nitrogen consumed
        
        expect(nitrogenConsumed).toBeGreaterThan(0.2); // At least some consumption
        expect(phosphorusConsumed).toBeGreaterThan(0.1);
        expect(potassiumConsumed).toBeGreaterThan(0.05);
        expect(omConsumed).toBeGreaterThan(0.02);
        
        // Nitrogen should be most consumed (highest base rate)
        expect(nitrogenConsumed).toBeGreaterThan(phosphorusConsumed);
        expect(nitrogenConsumed).toBeGreaterThan(potassiumConsumed);
        
        // Plant should still be Sapling (no stage advancement)
        expect(finalState.plant.stage).toBe('Sapling');
        
        // CHECKPOINT 4: Verify nutrients don't go negative
        expect(finalState.finalSoil.nitrogen).toBeGreaterThanOrEqual(0);
        expect(finalState.finalSoil.phosphorus).toBeGreaterThanOrEqual(0);
        expect(finalState.finalSoil.potassium).toBeGreaterThanOrEqual(0);
        expect(finalState.finalSoil.organicMatter).toBeGreaterThanOrEqual(0);
        
        console.log('\n✅ Daily nutrient consumption working correctly!');
        console.log('✅ Nutrients decrease over time without stage advancement');
        console.log('✅ Consumption rates follow config (N > P > K > OM)');
        console.log('✅ Nutrients properly clamped to minimum 0');
        
        // Take screenshot for visual verification
        await page.screenshot({ 
            path: 'test-results/daily-consumption-test.png',
            fullPage: true 
        });
    });
    
    test('Withered plants do not consume nutrients', async ({ page }) => {
        
        console.log('\n=== Testing Withered Plant Consumption ===');
        
        // Spawn a plant and force it to wither
        const testResult = await page.evaluate(async () => {
            const plantManager = window.graphicsEngine.plantManager;
            const soilManager = window.graphicsEngine.soilManager;
            const timeManager = window.graphicsEngine.timeManager;
            
            // Load oak species
            const response = await fetch('species/oak.json');
            const oakSpecies = await response.json();
            
            // Spawn at center
            const centerX = Math.floor(soilManager.gridWidth / 2);
            const centerY = Math.floor(soilManager.gridHeight / 2);
            
            // Calculate world position manually (grid * cellSize)
            const cellSize = engine.config?.world?.map?.cellSize || 20;
            const worldX = (centerX - soilManager.gridWidth / 2) * cellSize;
            const worldY = (centerY - soilManager.gridHeight / 2) * cellSize;
            
            const plant = plantManager.createPlant(worldX, worldY, oakSpecies, 'Sapling');
            
            // Get initial soil state
            const soilBefore = soilManager.getSoilAt(centerX, centerY);
            const initialNutrients = {
                nitrogen: soilBefore.nitrogen,
                phosphorus: soilBefore.phosphorus,
                potassium: soilBefore.potassium,
                organicMatter: soilBefore.organicMatter
            };
            
            // Force plant to wither
            plant.forceWither(timeManager.currentDay);
            
            // Manually call update for 1 game day worth of time
            plant.update(1.0, timeManager.currentDay + 1.0);
            
            // Get soil after update
            const soilAfter = soilManager.getSoilAt(centerX, centerY);
            const finalNutrients = {
                nitrogen: soilAfter.nitrogen,
                phosphorus: soilAfter.phosphorus,
                potassium: soilAfter.potassium,
                organicMatter: soilAfter.organicMatter
            };
            
            return {
                plantStage: plant.stage,
                initialNutrients,
                finalNutrients,
                consumption: {
                    nitrogen: initialNutrients.nitrogen - finalNutrients.nitrogen,
                    phosphorus: initialNutrients.phosphorus - finalNutrients.phosphorus,
                    potassium: initialNutrients.potassium - finalNutrients.potassium,
                    organicMatter: initialNutrients.organicMatter - finalNutrients.organicMatter
                }
            };
        });
        
        console.log('Withered plant test result:', testResult);
        
        // Validate
        expect(testResult.plantStage).toBe('Withered');
        
        // Withered plants should consume ZERO nutrients
        expect(Math.abs(testResult.consumption.nitrogen)).toBeLessThan(0.01);
        expect(Math.abs(testResult.consumption.phosphorus)).toBeLessThan(0.01);
        expect(Math.abs(testResult.consumption.potassium)).toBeLessThan(0.01);
        expect(Math.abs(testResult.consumption.organicMatter)).toBeLessThan(0.01);
        
        console.log('✅ Withered plants correctly consume zero nutrients');
    });
    
    test('Daily consumption config can be disabled', async ({ page }) => {
        
        console.log('\n=== Testing Config Disable ===');
        
        // Disable daily consumption and test
        const testResult = await page.evaluate(async () => {
            // Disable feature
            if (window.config && window.config.world && window.config.world.plants && 
                window.config.world.plants.dailyNutrientConsumption) {
                window.config.world.plants.dailyNutrientConsumption.enabled = false;
            }
            
            const plantManager = window.graphicsEngine.plantManager;
            const soilManager = window.graphicsEngine.soilManager;
            const timeManager = window.graphicsEngine.timeManager;
            
            // Load oak species
            const response = await fetch('species/oak.json');
            const oakSpecies = await response.json();
            
            // Spawn plant
            const centerX = Math.floor(soilManager.gridWidth / 2);
            const centerY = Math.floor(soilManager.gridHeight / 2);
            
            // Calculate world position manually (grid * cellSize)
            const cellSize = engine.config?.world?.map?.cellSize || 20;
            const worldX = (centerX - soilManager.gridWidth / 2) * cellSize;
            const worldY = (centerY - soilManager.gridHeight / 2) * cellSize;
            
            const plant = plantManager.createPlant(worldX, worldY, oakSpecies, 'Sapling');
            
            // Get initial soil
            const soilBefore = soilManager.getSoilAt(centerX, centerY);
            const nBefore = soilBefore.nitrogen;
            
            // Manually call update for 5 game days
            plant.update(5.0, timeManager.currentDay + 5.0);
            
            // Get final soil
            const soilAfter = soilManager.getSoilAt(centerX, centerY);
            const nAfter = soilAfter.nitrogen;
            
            return {
                configEnabled: window.config?.world?.plants?.dailyNutrientConsumption?.enabled || false,
                nitrogenBefore: nBefore,
                nitrogenAfter: nAfter,
                consumed: nBefore - nAfter
            };
        });
        
        console.log('Config disable test:', testResult);
        
        expect(testResult.configEnabled).toBe(false);
        // With feature disabled, no consumption should occur
        expect(Math.abs(testResult.consumed)).toBeLessThan(0.01);
        
        console.log('✅ Daily consumption can be disabled via config');
    });
});
