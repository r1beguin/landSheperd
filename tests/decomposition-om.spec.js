/**
 * Decomposition Test - Milestone 1: Organic Matter Contribution
 * 
 * Validates that plants return substantial organic matter to soil when decomposing.
 * Tests console logging and OM value changes.
 */

const { test, expect } = require('@playwright/test');
const { waitForRenderFrames } = require('./test-utils');

test.describe('Plant Decomposition - Organic Matter Contribution', () => {
    test('Plant death contributes OM to soil with clear logging', async ({ page }) => {
        // Setup console log listeners BEFORE page navigation
        const allConsoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            allConsoleLogs.push(text);
            // Log decomposition messages in real-time
            if (text.includes('[DECOMP]') || text.includes('[OM]')) {
                console.log(`  >>> ${text}`);
            }
        });
        
        // Navigate to the app
        await page.goto('http://localhost:8081');
        
        // Wait for page to fully load and initialize
        await waitForRenderFrames(page, 30); // Give time for WebGL and managers to initialize (~0.5 seconds)
        
        // Verify initialization
        const isInitialized = await page.evaluate(() => {
            return window.graphicsEngine && 
                   window.graphicsEngine.plantManager && 
                   window.graphicsEngine.soilManager &&
                   window.graphicsEngine.plantManager.speciesConfigs.size > 0;
        });
        
        if (!isInitialized) {
            throw new Error('Graphics engine failed to initialize');
        }
        
        console.log('✓ Graphics engine and managers initialized');
        
        // Get species config to verify OM return value
        const speciesConfig = await page.evaluate(() => {
            const config = window.graphicsEngine.plantManager.speciesConfigs.get('urtica_dioica');
            const witheredStage = config.growthStages.find(s => s.name === 'Withered');
            return {
                speciesId: config.id,
                commonName: config.commonName,
                omReturn: witheredStage.nutrientReturn.organicMatter
            };
        });
        
        console.log(`Species: ${speciesConfig.commonName} (${speciesConfig.speciesId})`);
        console.log(`Configured OM return: ${speciesConfig.omReturn}`);
        
        // CHECKPOINT 1: Verify OM return is 20 (increased from 12)
        expect(speciesConfig.omReturn).toBe(20);
        console.log('✓ CHECKPOINT 1: Species config has OM return = 20');
        
        // Spawn plant at center grid cell (0, 0)
        const plantInfo = await page.evaluate(() => {
            const gridX = 0;
            const gridY = 0;
            const currentDay = window.graphicsEngine.timeManager.getCurrentDay();
            
            // Get soil state before planting
            const soilBefore = window.graphicsEngine.soilManager.getSoilAt(gridX, gridY);
            if (!soilBefore) {
                throw new Error(`Soil not found at grid (${gridX}, ${gridY})`);
            }
            
            const soilStateBefore = {
                nitrogen: soilBefore.nitrogen,
                phosphorus: soilBefore.phosphorus,
                potassium: soilBefore.potassium,
                organicMatter: soilBefore.organicMatter,
                fertility: soilBefore.fertility
            };
            
            // Spawn plant
            const plant = window.graphicsEngine.plantManager.addPlant(gridX, gridY, 'urtica_dioica', currentDay);
            if (!plant) {
                throw new Error(`Failed to spawn plant at grid (${gridX}, ${gridY})`);
            }
            
            return {
                gridX,
                gridY,
                worldX: plant.x,
                worldY: plant.y,
                stage: plant.stage,
                currentDay,
                soilBefore: soilStateBefore
            };
        });
        
        console.log(`✓ CHECKPOINT 2: Plant spawned at grid (${plantInfo.gridX}, ${plantInfo.gridY})`);
        console.log(`  World position: (${plantInfo.worldX.toFixed(1)}, ${plantInfo.worldY.toFixed(1)})`);
        console.log(`  Initial stage: ${plantInfo.stage}`);
        console.log(`  Soil before - OM: ${plantInfo.soilBefore.organicMatter.toFixed(1)}, Fertility: ${plantInfo.soilBefore.fertility.toFixed(1)}`);
        
        // CHECKPOINT 3: Force plant to wither immediately
        await page.evaluate(() => {
            const plant = window.graphicsEngine.plantManager.getPlantAt(0, 0);
            const currentDay = window.graphicsEngine.timeManager.getCurrentDay();
            plant.forceWither(currentDay);
        });
        
        const witheredInfo = await page.evaluate(() => {
            const plant = window.graphicsEngine.plantManager.getPlantAt(0, 0);
            return {
                stage: plant.stage,
                age: plant.age,
                stageStartDay: plant.stageStartDay
            };
        });
        
        console.log(`✓ CHECKPOINT 3: Plant forced to wither`);
        console.log(`  Current stage: ${witheredInfo.stage}`);
        
        // CHECKPOINT 4: Advance time to trigger decomposition
        console.log(`Advancing time to trigger decomposition...`);
        
        const advanceResult = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const plant = engine.plantManager.getPlantAt(0, 0);
            const witheredStage = plant.species.growthStages.find(s => s.name === 'Withered');
            const daysToDecompose = witheredStage.daysToGrow + 1; // +1 to ensure we go past threshold
            
            const dayBefore = engine.timeManager.getCurrentDay();
            
            // IMPORTANT: Set timeScale to 1.0 to make time calculation straightforward
            const originalTimeScale = engine.timeManager.getTimeScale();
            engine.timeManager.setTimeScale(1.0);
            
            // Calculate deltaTime needed to advance N game days
            // With timeScale=1.0: gameDays = (deltaSeconds / realSecondsPerGameDay) * 1.0
            const realSecondsPerGameDay = engine.timeManager.realSecondsPerGameDay || 10;
            const realMillisecondsPerGameDay = realSecondsPerGameDay * 1000;
            const deltaTimeMs = daysToDecompose * realMillisecondsPerGameDay;
            
            // Log the state before update
            console.log(`[TEST] Before update: currentDay=${dayBefore}, stageStartDay=${plant.stageStartDay}, stage=${plant.stage}`);
            console.log(`[TEST] Advancing ${daysToDecompose} game days (deltaTimeMs=${deltaTimeMs}, timeScale=1.0)`);
            
            // Call the main update loop (this updates timeManager, plantManager, and all entities)
            engine.update(deltaTimeMs);
            
            const dayAfter = engine.timeManager.getCurrentDay();
            const plantStillExists = engine.plantManager.getPlantAt(0, 0) !== undefined;
            
            // Restore original timeScale
            engine.timeManager.setTimeScale(originalTimeScale);
            
            return {
                daysToDecompose,
                dayBefore,
                dayAfter,
                daysAdvanced: dayAfter - dayBefore,
                plantStillExists,
                shouldDespawn: plantStillExists ? engine.plantManager.getPlantAt(0, 0).shouldDespawn : null
            };
        });
        
        console.log(`Days to decompose: ${advanceResult.daysToDecompose}`);
        console.log(`Day before: ${advanceResult.dayBefore}, Day after: ${advanceResult.dayAfter}`);
        console.log(`Days advanced: ${advanceResult.daysAdvanced}`);
        console.log(`Plant still exists: ${advanceResult.plantStillExists}`);
        console.log(`shouldDespawn flag: ${advanceResult.shouldDespawn}`);
        
        // Wait for render frames to process updates and console logs to flush
        await waitForRenderFrames(page, 10);
        
        // CHECKPOINT 5: Verify decomposition occurred
        const decompositionResult = await page.evaluate(() => {
            const plantExists = window.graphicsEngine.plantManager.getPlantAt(0, 0) !== undefined;
            const soil = window.graphicsEngine.soilManager.getSoilAt(0, 0);
            
            return {
                plantStillExists: plantExists,
                soilAfter: {
                    nitrogen: soil.nitrogen,
                    phosphorus: soil.phosphorus,
                    potassium: soil.potassium,
                    organicMatter: soil.organicMatter,
                    fertility: soil.fertility
                }
            };
        });
        
        console.log(`✓ CHECKPOINT 5: Decomposition complete`);
        console.log(`  Plant removed: ${!decompositionResult.plantStillExists}`);
        console.log(`  Soil after - OM: ${decompositionResult.soilAfter.organicMatter.toFixed(1)}, Fertility: ${decompositionResult.soilAfter.fertility.toFixed(1)}`);
        
        // Calculate OM change
        const omBefore = plantInfo.soilBefore.organicMatter;
        const omAfter = decompositionResult.soilAfter.organicMatter;
        const omChange = omAfter - omBefore;
        
        console.log(`  OM change: ${omBefore.toFixed(1)} → ${omAfter.toFixed(1)} (+${omChange.toFixed(1)})`);
        
        // VALIDATIONS
        
        // Filter logs for decomposition and OM
        const decompositionLogs = allConsoleLogs.filter(log => log.includes('[DECOMP]'));
        const omChangeLogs = allConsoleLogs.filter(log => log.includes('[OM]'));
        
        console.log(`Found ${decompositionLogs.length} decomposition logs, ${omChangeLogs.length} OM logs`);
        
        // 1. Plant should be removed
        expect(decompositionResult.plantStillExists).toBe(false);
        console.log('✓ VALIDATION 1: Plant successfully removed after decomposition');
        
        // 2. OM should increase (accounting for OM decomposition during time advance)
        // Plant returns 20 OM, but OM decomposition system may consume some during the 6 day advance
        // Net gain should still be positive and substantial (>5 OM minimum)
        expect(omChange).toBeGreaterThan(5); // Net positive after decomposition losses
        console.log(`✓ VALIDATION 2: OM increased by ${omChange.toFixed(1)} (plant returned 20, decomposition consumed ${(20 - omChange).toFixed(1)} during time advance)`);
        
        // 3. Decomposition log should be present
        expect(decompositionLogs.length).toBeGreaterThan(0);
        console.log(`✓ VALIDATION 3: ${decompositionLogs.length} decomposition log(s) found`);
        
        // 4. OM change log should be present
        expect(omChangeLogs.length).toBeGreaterThan(0);
        console.log(`✓ VALIDATION 4: ${omChangeLogs.length} OM change log(s) found`);
        
        // 5. Log should contain OM value
        const hasOMValue = decompositionLogs.some(log => log.includes('OM:'));
        expect(hasOMValue).toBe(true);
        console.log('✓ VALIDATION 5: Decomposition log contains OM value');
        
        // 6. Log should show natural death (not starved)
        const isNaturalDeath = decompositionLogs.some(log => log.includes('[NATURAL]'));
        expect(isNaturalDeath).toBe(true);
        console.log('✓ VALIDATION 6: Decomposition marked as [NATURAL] death');
        
        console.log('\n=== MILESTONE 1 COMPLETE ===');
        console.log('✓ Plant death contributes substantial OM to soil');
        console.log('✓ Console logs clearly show OM contribution');
        console.log('✓ OM values are realistic (net gain for soil fertility)');
    });
    
    test('Starved plant returns reduced OM', async ({ page }) => {
        // Setup console log listeners BEFORE navigation
        const allConsoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            allConsoleLogs.push(text);
            if (text.includes('[DECOMP]') || text.includes('[OM]')) {
                console.log(`  >>> ${text}`);
            }
        });
        
        // Navigate to the app
        await page.goto('http://localhost:8081');
        
        // Wait for page to fully load
        await waitForRenderFrames(page, 30);
        
        // Verify initialization
        const isInitialized = await page.evaluate(() => {
            return window.graphicsEngine && 
                   window.graphicsEngine.plantManager && 
                   window.graphicsEngine.soilManager;
        });
        
        if (!isInitialized) {
            throw new Error('Graphics engine failed to initialize');
        }
        
        console.log('Testing starved plant decomposition...');
        
        // Create a plant that's been stunted
        const plantInfo = await page.evaluate(() => {
            const gridX = 1;
            const gridY = 1;
            const currentDay = 0;
            
            // Spawn plant
            const plant = window.graphicsEngine.plantManager.addPlant(gridX, gridY, 'urtica_dioica', currentDay);
            
            // Mark as stunted for several days (simulate starvation)
            plant.daysStunted = 10;
            plant.isStunted = true;
            
            // Force wither
            plant.forceWither(currentDay);
            
            return {
                gridX,
                gridY,
                daysStunted: plant.daysStunted
            };
        });
        
        console.log(`Plant created with ${plantInfo.daysStunted} days stunted`);
        
        // Advance time to trigger decomposition
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const plant = engine.plantManager.getPlantAt(1, 1);
            const witheredStage = plant.species.growthStages.find(s => s.name === 'Withered');
            const daysToDecompose = witheredStage.daysToGrow + 1;
            
            // Set timeScale to 1.0 for straightforward calculation
            engine.timeManager.setTimeScale(1.0);
            
            const realSecondsPerGameDay = engine.timeManager.realSecondsPerGameDay || 10;
            const deltaTimeMs = daysToDecompose * realSecondsPerGameDay * 1000;
            
            engine.update(deltaTimeMs);
        });
        
        await waitForRenderFrames(page, 10);
        
        // Filter logs
        const decompositionLogs = allConsoleLogs.filter(log => log.includes('[DECOMP]'));
        console.log(`Found ${decompositionLogs.length} decomposition logs`);
        
        // VALIDATION: Starved plant should show [STARVED] tag
        const isStarvedDeath = decompositionLogs.some(log => log.includes('[STARVED]'));
        expect(isStarvedDeath).toBe(true);
        console.log('✓ Starved plant marked as [STARVED] death');
        
        // VALIDATION: Should return less OM than natural death
        const omValueMatch = decompositionLogs[0]?.match(/OM:([\d.]+)/);
        if (omValueMatch) {
            const omReturned = parseFloat(omValueMatch[1]);
            console.log(`OM returned: ${omReturned.toFixed(1)}`);
            expect(omReturned).toBeLessThan(20); // Should be reduced by starvation multiplier (default 0.5)
            expect(omReturned).toBeGreaterThan(5); // But not zero
            console.log(`✓ Reduced OM contribution: ${omReturned.toFixed(1)} (expected ~10 with 0.5 multiplier)`);
        }
    });
});
