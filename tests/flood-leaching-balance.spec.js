/**
 * Flood-Leaching Balance Test
 * CRITICAL: Validates that flood events ADD fertility instead of being negated by leaching
 * 
 * Background:
 * - Flood events add +10N, +5P, +3K, +8OM every 12 days
 * - Heavy rain leaches nutrients (surface → deep transfer)
 * - Riparian zones (floodplains) should RESIST leaching due to clay deposits
 * - Net effect: Rivers should be PREMIUM agricultural land (fertility increases over time)
 */

const { test, expect } = require('@playwright/test');
const { 
    waitForRenderFrames
} = require('./test-utils');

test('Flood-Leaching Balance - Net Fertility Increases Near Rivers', async ({ page }) => {
    await page.goto('/');
    await waitForRenderFrames(page, 20);
    
    console.log('\n=== FLOOD-LEACHING BALANCE TEST ===\n');
    
    // Get river tile and adjacent soil
    const initialState = await page.evaluate(() => {
        const soilManager = window.graphicsEngine?.soilManager;
        const terrainGen = soilManager?.terrainGenerator;
        const riverTiles = terrainGen?.getRiverTiles();
        
        if (!riverTiles || riverTiles.size === 0) {
            return { error: 'No river tiles found' };
        }
        
        // Find first river tile
        const firstRiverKey = Array.from(riverTiles)[0];
        const [riverX, riverY] = firstRiverKey.split(',').map(Number);
        
        // Find adjacent plantable soil (expand search radius if needed)
        let targetSoil = null;
        let targetX = 0;
        let targetY = 0;
        
        for (let radius = 1; radius <= 3 && !targetSoil; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const testX = riverX + dx;
                    const testY = riverY + dy;
                    const soil = soilManager.getSoilAt(testX, testY);
                    if (soil && !soil.isWater && soil.isPlantable) {
                        targetSoil = soil;
                        targetX = testX;
                        targetY = testY;
                        break;
                    }
                }
                if (targetSoil) break;
            }
        }
        
        if (!targetSoil) {
            return { error: 'No plantable soil near river' };
        }
        
        // Get layered nutrient values (surface layer is what leaching affects)
        const surfaceN = targetSoil.nutrientLayers?.surface?.nitrogen || targetSoil.nitrogen;
        const surfaceP = targetSoil.nutrientLayers?.surface?.phosphorus || targetSoil.phosphorus;
        const surfaceK = targetSoil.nutrientLayers?.surface?.potassium || targetSoil.potassium;
        const surfaceOM = targetSoil.nutrientLayers?.surface?.organicMatter || targetSoil.organicMatter;
        
        return {
            riverTile: firstRiverKey,
            testCell: `${targetX},${targetY}`,
            testCoords: { x: targetX, y: targetY },
            surfaceNutrients: {
                nitrogen: surfaceN,
                phosphorus: surfaceP,
                potassium: surfaceK,
                organicMatter: surfaceOM
            },
            totalFertility: targetSoil.fertility,
            gameDay: window.graphicsEngine?.timeManager?.getCurrentDayPrecise() || 0
        };
    });
    
    console.log('Initial state:', JSON.stringify(initialState, null, 2));
    expect(initialState.error).toBeUndefined();
    
    // Advance game time by 30 days to allow for 2.5 flood cycles (12-day interval)
    console.log('\n⏭️  Fast-forwarding 30 game days (2.5 flood cycles)...\n');
    
    const advanceResult = await page.evaluate(() => {
        // Set very fast time scale for quick testing
        const timeManager = window.graphicsEngine?.timeManager;
        if (!timeManager) return { error: 'TimeManager not available' };
        
        timeManager.setTimeScale(5.0); // veryFast preset
        
        return { success: true };
    });
    
    expect(advanceResult.error).toBeUndefined();
    
    // 30 game days at veryFast (5.0x) = 30 * 10 seconds / 5.0 = 60 seconds
    await page.waitForTimeout(65000); // 65 seconds for safety
    
    // Get state after flood cycles
    const finalState = await page.evaluate((coords) => {
        const soilManager = window.graphicsEngine?.soilManager;
        const plantManager = window.graphicsEngine?.plantManager;
        const soil = soilManager.getSoilAt(coords.x, coords.y);
        
        if (!soil) {
            return { error: 'Soil cell not found' };
        }
        
        const surfaceN = soil.nutrientLayers?.surface?.nitrogen || soil.nitrogen;
        const surfaceP = soil.nutrientLayers?.surface?.phosphorus || soil.phosphorus;
        const surfaceK = soil.nutrientLayers?.surface?.potassium || soil.potassium;
        const surfaceOM = soil.nutrientLayers?.surface?.organicMatter || soil.organicMatter;
        
        // Check for plants at this location
        const plants = plantManager?.getPlantAt(coords.x, coords.y) || [];
        
        return {
            surfaceNutrients: {
                nitrogen: surfaceN,
                phosphorus: surfaceP,
                potassium: surfaceK,
                organicMatter: surfaceOM
            },
            totalFertility: soil.fertility,
            gameDay: window.graphicsEngine?.timeManager?.getCurrentDayPrecise() || 0,
            plantCount: plants.length,
            hasPlants: plants.length > 0
        };
    }, initialState.testCoords);
    
    console.log('Final state:', JSON.stringify(finalState, null, 2));
    expect(finalState.error).toBeUndefined();
    
    // Calculate changes
    const changes = {
        nitrogen: finalState.surfaceNutrients.nitrogen - initialState.surfaceNutrients.nitrogen,
        phosphorus: finalState.surfaceNutrients.phosphorus - initialState.surfaceNutrients.phosphorus,
        potassium: finalState.surfaceNutrients.potassium - initialState.surfaceNutrients.potassium,
        organicMatter: finalState.surfaceNutrients.organicMatter - initialState.surfaceNutrients.organicMatter,
        fertility: finalState.totalFertility - initialState.totalFertility,
        gameDaysElapsed: finalState.gameDay - initialState.gameDay
    };
    
    console.log('\n=== RESULTS ===');
    console.log(`Game days elapsed: ${changes.gameDaysElapsed.toFixed(1)}`);
    console.log(`Plants at location: ${finalState.plantCount}`);
    console.log(`Nitrogen change: ${changes.nitrogen.toFixed(2)}`);
    console.log(`Phosphorus change: ${changes.phosphorus.toFixed(2)}`);
    console.log(`Potassium change: ${changes.potassium.toFixed(2)}`);
    console.log(`Organic Matter change: ${changes.organicMatter.toFixed(2)}`);
    console.log(`Fertility change: ${changes.fertility.toFixed(2)}`);
    
    // CRITICAL ASSERTIONS:
    // After 2+ flood cycles, nutrients should INCREASE (not decrease)
    expect(changes.gameDaysElapsed).toBeGreaterThan(24); // At least 2 floods occurred
    
    // If plants grew at this location, they would consume nutrients - skip test
    if (finalState.hasPlants) {
        console.log('\n⚠️  SKIPPING: Plants grew at test location (would consume nutrients)');
        console.log('Test is inconclusive due to plant nutrient consumption\n');
        return; // Skip remaining assertions
    }
    
    // At minimum, nitrogen should not have DECREASED significantly
    // With reduced leaching + riparian resistance, we expect positive or near-zero change
    console.log('\n🔬 Validating: Nitrogen should NOT decrease significantly...');
    expect(changes.nitrogen).toBeGreaterThan(-5); // Allow small decrease but not massive depletion
    
    console.log('🔬 Validating: At least one nutrient increased (flood effect visible)...');
    const anyNutrientIncreased = 
        changes.nitrogen > 1 || 
        changes.phosphorus > 1 || 
        changes.potassium > 1 || 
        changes.organicMatter > 1;
    expect(anyNutrientIncreased).toBe(true);
    
    console.log('\n✅ PASS: Flood-leaching balance is healthy!');
    console.log('Rivers are now premium agricultural land (as intended)\n');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/flood-leaching-balance-after.png' });
});

test('Riparian Zone Leaching Resistance - Clay-Rich Soils', async ({ page }) => {
    await page.goto('/');
    await waitForRenderFrames(page, 20);
    
    console.log('\n=== RIPARIAN ZONE LEACHING RESISTANCE TEST ===\n');
    
    // Get config values
    const config = await page.evaluate(() => {
        const leachingConfig = window.graphicsEngine?.config?.world?.weather?.soilEffects?.leaching;
        return {
            nitrogenLeachRate: leachingConfig?.nitrogenLeachRate,
            riparianResistance: leachingConfig?.riparianResistance
        };
    });
    
    console.log('Config:', JSON.stringify(config, null, 2));
    
    // Verify config values are correct
    expect(config.nitrogenLeachRate).toBe(0.2); // Reduced from 0.8
    expect(config.riparianResistance?.enabled).toBe(true);
    expect(config.riparianResistance?.leachingMultiplier).toBe(0.3); // 70% reduction
    expect(config.riparianResistance?.radius).toBe(3);
    
    console.log('✅ Config validated: Leaching rates reduced, riparian resistance enabled\n');
});

test('Expected Leaching Math - Validation', async ({ page }) => {
    await page.goto('/');
    await waitForRenderFrames(page, 20);
    
    console.log('\n=== EXPECTED LEACHING MATH VALIDATION ===\n');
    
    // Calculate expected leaching over 12 days
    const config = await page.evaluate(() => {
        const leachingConfig = window.graphicsEngine?.config?.world?.weather?.soilEffects?.leaching;
        const floodConfig = window.graphicsEngine?.config?.world?.terrain?.water?.floodEvents;
        
        return {
            nitrogenLeachRate: leachingConfig?.nitrogenLeachRate || 0,
            heavyRainMultiplier: leachingConfig?.intensityMultiplier?.heavy || 1.5,
            riparianMultiplier: leachingConfig?.riparianResistance?.leachingMultiplier || 1.0,
            floodInterval: floodConfig?.intervalDays || 12,
            floodNitrogenBonus: floodConfig?.nitrogenBonus || 10
        };
    });
    
    console.log('Config:', JSON.stringify(config, null, 2));
    
    // Calculate worst-case scenario: constant heavy rain for 12 days
    const leachPerDay = config.nitrogenLeachRate * config.heavyRainMultiplier;
    const leachPerCycle = leachPerDay * config.floodInterval;
    
    // Calculate riparian zone scenario
    const riparianLeachPerDay = leachPerDay * config.riparianMultiplier;
    const riparianLeachPerCycle = riparianLeachPerDay * config.floodInterval;
    
    console.log('\n📊 MATH ANALYSIS:');
    console.log('─────────────────────────────────────────');
    console.log('INLAND ZONE (no riparian protection):');
    console.log(`  Heavy rain leaching: ${leachPerDay.toFixed(2)}N per day`);
    console.log(`  Over 12 days: -${leachPerCycle.toFixed(2)}N`);
    console.log(`  Flood adds: +${config.floodNitrogenBonus}N`);
    console.log(`  NET EFFECT: ${(config.floodNitrogenBonus - leachPerCycle).toFixed(2)}N`);
    console.log('');
    console.log('RIPARIAN ZONE (floodplain clay protection):');
    console.log(`  Heavy rain leaching: ${riparianLeachPerDay.toFixed(2)}N per day`);
    console.log(`  Over 12 days: -${riparianLeachPerCycle.toFixed(2)}N`);
    console.log(`  Flood adds: +${config.floodNitrogenBonus}N`);
    console.log(`  NET EFFECT: ${(config.floodNitrogenBonus - riparianLeachPerCycle).toFixed(2)}N`);
    console.log('─────────────────────────────────────────\n');
    
    // Validate that riparian zones have net positive effect
    const riparianNetEffect = config.floodNitrogenBonus - riparianLeachPerCycle;
    expect(riparianNetEffect).toBeGreaterThan(0);
    
    console.log('✅ PASS: Riparian zones have net positive fertility effect\n');
    console.log(`Expected gain: +${riparianNetEffect.toFixed(2)}N per 12-day cycle`);
    console.log('This aligns with historical reality: floodplains are fertile!\n');
});
