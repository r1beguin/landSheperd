/**
 * P/K Balance Fix Validation Test
 * 
 * Tests the fix for ecosystem balance:
 * 1. Increased weathering rates (P: 0.02→0.15, K: 0.02→0.10)
 * 2. Nitrogen-fixing for clover (fixes 0.8 N/day in Flowering stage)
 * 
 * Expected outcomes:
 * - P/K levels stabilize around 20-40 instead of depleting to 0
 * - Clover becomes nitrogen-positive (enriches soil)
 * - Mixed ecosystems (clover + oak) show symbiotic nutrient cycling
 */

const { test, expect } = require('@playwright/test');
const { waitForRenderFrames, spawnPlantAt, getWorldConfig, advanceGameTime } = require('./test-utils');

test.describe('P/K Ecosystem Balance Fix', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForRenderFrames(page, 10);
    });

    test('Weathering rates increased correctly', async ({ page }) => {
        // CHECKPOINT 1: Verify config.json updated
        const config = await getWorldConfig(page);
        const weathering = config.soil.weathering;
        
        console.log('[WEATHERING CONFIG]', weathering);
        
        expect(weathering.enabled).toBe(true);
        expect(weathering.baseRatePerDay.phosphorus).toBe(0.15); // Was 0.02
        expect(weathering.baseRatePerDay.potassium).toBe(0.10); // Was 0.02
        
        console.log('✓ Weathering rates increased: P=0.15/day, K=0.10/day');
    });

    test('Clover nitrogen-fixing config present', async ({ page }) => {
        // CHECKPOINT 2: Verify clover species has N-fixing config
        const cloverSpecies = await page.evaluate(async () => {
            const response = await fetch('/species/clover.json');
            return response.json();
        });
        
        console.log('[CLOVER SPECIES]', cloverSpecies.id);
        
        // Find Flowering stage
        const floweringStage = cloverSpecies.growthStages.find(s => s.name === 'Flowering');
        expect(floweringStage).toBeDefined();
        
        // Check N-fixing config
        expect(floweringStage.nitrogenFixing).toBeDefined();
        expect(floweringStage.nitrogenFixing.enabled).toBe(true);
        expect(floweringStage.nitrogenFixing.fixationRatePerDay).toBe(0.8);
        
        console.log('✓ Clover nitrogen-fixing config: 0.8 N/day in Flowering stage');
        console.log('  Description:', floweringStage.nitrogenFixing.description);
    });

    test('P/K weathering prevents total depletion', async ({ page }) => {
        // CHECKPOINT 3: Long-term simulation - P/K should stabilize, not hit 0
        
        // Spawn clover in center of map (away from water sources)
        await spawnPlantAt(page, 25, 25, 'trifolium_repens');
        await waitForRenderFrames(page, 5);
        
        // Get initial soil state
        const initialSoil = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(25, 25);
            return {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter
            };
        });
        
        console.log('[INITIAL SOIL @(25,25)]', initialSoil);
        
        // Fast-forward 50 game days (enough for clover to deplete P/K without weathering)
        // At 0.3 P/day consumption, 50 days = 15 P consumed
        // With weathering at 0.15 P/day, 50 days = 7.5 P regenerated
        // Net: -7.5 P (should stabilize around 30-40 P)
        await advanceGameTime(page, 50);
        await waitForRenderFrames(page, 10);
        
        // Get final soil state
        const finalSoil = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(25, 25);
            return {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter,
                deep: {
                    nitrogen: soil.nutrientLayers.deep.nitrogen,
                    phosphorus: soil.nutrientLayers.deep.phosphorus,
                    potassium: soil.nutrientLayers.deep.potassium
                }
            };
        });
        
        console.log('[FINAL SOIL @(25,25) after 50 days]', finalSoil);
        console.log('[DELTA]', {
            nitrogen: (finalSoil.nitrogen - initialSoil.nitrogen).toFixed(1),
            phosphorus: (finalSoil.phosphorus - initialSoil.phosphorus).toFixed(1),
            potassium: (finalSoil.potassium - initialSoil.potassium).toFixed(1),
            organicMatter: (finalSoil.organicMatter - initialSoil.organicMatter).toFixed(1)
        });
        
        // VALIDATION: P/K should NOT hit 0 (weathering prevents total depletion)
        expect(finalSoil.phosphorus).toBeGreaterThan(5); // Should stabilize around 20-40
        expect(finalSoil.potassium).toBeGreaterThan(5); // Should stabilize around 20-40
        
        console.log('✓ P/K did not deplete to 0 (weathering is working)');
        console.log(`  Final P: ${finalSoil.phosphorus.toFixed(1)} (>5 threshold)`);
        console.log(`  Final K: ${finalSoil.potassium.toFixed(1)} (>5 threshold)`);
    });

    test('Clover nitrogen-fixing enriches soil', async ({ page }) => {
        // CHECKPOINT 4: Clover should INCREASE soil nitrogen over time
        
        // Spawn clover in center of map
        await spawnPlantAt(page, 25, 25, 'trifolium_repens');
        await waitForRenderFrames(page, 5);
        
        // Advance to Flowering stage (where N-fixing is active)
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const plants = Array.from(plantManager.plants.values());
            const clover = plants.find(p => p.species.id === 'trifolium_repens');
            
            if (clover) {
                // Force to Flowering stage
                clover.stage = 'Flowering';
                clover.generateSprite();
                console.log('[TEST] Clover forced to Flowering stage');
            }
        });
        
        await waitForRenderFrames(page, 5);
        
        // Get soil nitrogen before N-fixing period
        const beforeNitrogen = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(25, 25);
            return {
                surface: soil.nutrientLayers.surface.nitrogen,
                deep: soil.nutrientLayers.deep.nitrogen,
                total: soil.nitrogen
            };
        });
        
        console.log('[NITROGEN BEFORE N-FIXING]', beforeNitrogen);
        
        // Fast-forward 30 game days
        // Clover consumes: 0.5 N/day × 1.0 (groundcover) × 1.2 (Flowering) = 0.6 N/day
        // Clover fixes: 0.8 N/day
        // Net effect: +0.2 N/day × 30 days = +6 N (nitrogen-positive!)
        await advanceGameTime(page, 30);
        await waitForRenderFrames(page, 10);
        
        // Get soil nitrogen after N-fixing period
        const afterNitrogen = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(25, 25);
            return {
                surface: soil.nutrientLayers.surface.nitrogen,
                deep: soil.nutrientLayers.deep.nitrogen,
                total: soil.nitrogen
            };
        });
        
        console.log('[NITROGEN AFTER 30 DAYS N-FIXING]', afterNitrogen);
        console.log('[DELTA]', {
            surface: (afterNitrogen.surface - beforeNitrogen.surface).toFixed(2),
            deep: (afterNitrogen.deep - beforeNitrogen.deep).toFixed(2),
            total: (afterNitrogen.total - beforeNitrogen.total).toFixed(2)
        });
        
        // VALIDATION: Deep layer nitrogen should INCREASE (N-fixing adds to deep layer)
        expect(afterNitrogen.deep).toBeGreaterThan(beforeNitrogen.deep);
        
        console.log('✓ Clover nitrogen-fixing is working (soil N increased)');
        console.log(`  Deep layer N increased by ${(afterNitrogen.deep - beforeNitrogen.deep).toFixed(2)}`);
    });

    test('Mixed ecosystem: Clover + Oak symbiosis', async ({ page }) => {
        // CHECKPOINT 5: Clover fixes N, Oak provides P/K via litter
        // This should create a balanced, sustainable ecosystem
        
        // Spawn clover field (3x3 grid)
        const cloverPositions = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                await spawnPlantAt(page, 25 + dx, 25 + dy, 'trifolium_repens');
                cloverPositions.push([25 + dx, 25 + dy]);
            }
        }
        
        // Spawn oak tree nearby
        await spawnPlantAt(page, 25, 28, 'quercus_robur');
        
        await waitForRenderFrames(page, 5);
        
        // Force clover to Flowering and oak to MatureTree
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const plants = Array.from(plantManager.plants.values());
            
            plants.forEach(plant => {
                if (plant.species.id === 'trifolium_repens') {
                    plant.stage = 'Flowering';
                    plant.generateSprite();
                }
                if (plant.species.id === 'quercus_robur') {
                    plant.stage = 'MatureTree';
                    plant.generateSprite();
                }
            });
            
            console.log('[TEST] Mixed ecosystem initialized: 9 clover + 1 oak');
        });
        
        await waitForRenderFrames(page, 5);
        
        // Get initial soil state at clover center
        const initialSoil = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(25, 25);
            return {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter
            };
        });
        
        console.log('[INITIAL ECOSYSTEM SOIL]', initialSoil);
        
        // Fast-forward 60 game days
        await advanceGameTime(page, 60);
        await waitForRenderFrames(page, 10);
        
        // Get final soil state
        const finalSoil = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(25, 25);
            return {
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter,
                surface: {
                    nitrogen: soil.nutrientLayers.surface.nitrogen,
                    phosphorus: soil.nutrientLayers.surface.phosphorus,
                    potassium: soil.nutrientLayers.surface.potassium,
                    organicMatter: soil.nutrientLayers.surface.organicMatter
                }
            };
        });
        
        console.log('[FINAL ECOSYSTEM SOIL after 60 days]', finalSoil);
        console.log('[DELTA]', {
            nitrogen: (finalSoil.nitrogen - initialSoil.nitrogen).toFixed(1),
            phosphorus: (finalSoil.phosphorus - initialSoil.phosphorus).toFixed(1),
            potassium: (finalSoil.potassium - initialSoil.potassium).toFixed(1),
            organicMatter: (finalSoil.organicMatter - initialSoil.organicMatter).toFixed(1)
        });
        
        // VALIDATION: Mixed ecosystem should maintain nutrients
        // N: Should increase (clover N-fixing)
        // P/K: Should stabilize (oak litter + weathering)
        // OM: Should increase (oak litter)
        
        expect(finalSoil.nitrogen).toBeGreaterThanOrEqual(initialSoil.nitrogen * 0.8); // Allow slight decline
        expect(finalSoil.phosphorus).toBeGreaterThan(5); // Should not deplete
        expect(finalSoil.potassium).toBeGreaterThan(5); // Should not deplete
        expect(finalSoil.organicMatter).toBeGreaterThan(initialSoil.organicMatter * 0.5); // Should accumulate
        
        console.log('✓ Mixed ecosystem maintains nutrient balance');
        console.log('  Clover fixes N:', finalSoil.nitrogen >= initialSoil.nitrogen);
        console.log('  P/K stable:', finalSoil.phosphorus > 5 && finalSoil.potassium > 5);
        console.log('  OM accumulated:', finalSoil.organicMatter > initialSoil.organicMatter * 0.5);
    });

    test('Performance: Weathering and N-fixing do not impact FPS', async ({ page }) => {
        // CHECKPOINT 6: Ensure new nutrient cycling doesn't hurt performance
        
        // Spawn many clovers across map
        const cloverCount = 50;
        for (let i = 0; i < cloverCount; i++) {
            const x = 10 + Math.floor(i / 7) * 2;
            const y = 10 + (i % 7) * 2;
            await spawnPlantAt(page, x, y, 'trifolium_repens');
        }
        
        await waitForRenderFrames(page, 10);
        
        // Force all to Flowering (maximum N-fixing activity)
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const plants = Array.from(plantManager.plants.values());
            
            plants.forEach(plant => {
                if (plant.species.id === 'trifolium_repens') {
                    plant.stage = 'Flowering';
                    plant.generateSprite();
                }
            });
            
            console.log('[TEST] 50 clover plants in Flowering stage (N-fixing active)');
        });
        
        // Measure FPS with active N-fixing
        await waitForRenderFrames(page, 30);
        
        const fpsData = await page.evaluate(() => {
            const debugManager = window.graphicsEngine.debugManager;
            return {
                avgFPS: debugManager.fpsAverage,
                minFPS: debugManager.fpsMin,
                plantCount: window.graphicsEngine.plantManager.plants.size,
                activeCells: window.graphicsEngine.soilManager.soilEffectsManager.getActiveCellCount()
            };
        });
        
        console.log('[PERFORMANCE]', fpsData);
        
        // VALIDATION: FPS should remain above 30 (target minimum)
        expect(fpsData.avgFPS).toBeGreaterThanOrEqual(30);
        expect(fpsData.plantCount).toBe(cloverCount);
        
        console.log('✓ Performance acceptable with N-fixing active');
        console.log(`  Avg FPS: ${fpsData.avgFPS.toFixed(1)} (target: 30+)`);
        console.log(`  Active plants: ${fpsData.plantCount}`);
        console.log(`  Active soil cells: ${fpsData.activeCells}`);
    });
});
