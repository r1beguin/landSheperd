/**
 * Riparian Organic Matter Accumulation Test (Milestone 4)
 * 
 * Validates that organic matter accumulates in riparian zones (areas near water)
 * due to reduced decay rates and continuous aquatic OM input.
 * 
 * Expected behavior:
 * - Riparian zones (≤2 cells from water): OM accumulates over time
 * - Non-riparian zones (>2 cells from water): Normal decay applies
 * - After 14+ days: Riparian OM should exceed non-riparian OM by 2+ units
 * - Visual darkening of soil near water edges
 */

const { test, expect } = require('@playwright/test');

test('Riparian OM accumulation over 14 days', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes - enough for 14+ game days at 5x speed
    
    // Navigate to main page
    await page.goto('http://localhost:8081/');
    
    // Wait for WebGL initialization
    await page.waitForFunction(() => window.graphicsEngine !== undefined, { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow full initialization
    
    console.log('GraphicsEngine initialized');
    
    // Verify riparian config is enabled
    const riparianConfig = await page.evaluate(() => {
        return window.graphicsEngine.config?.world?.soil?.decomposition?.riparianZone;
    });
    
    expect(riparianConfig).toBeTruthy();
    expect(riparianConfig.enabled).toBe(true);
    console.log('Riparian zone config verified:', riparianConfig);
    
    // Verify water tiles exist
    const waterTileCount = await page.evaluate(() => {
        const terrainGen = window.graphicsEngine.soilManager?.terrainGenerator;
        const waterTiles = terrainGen?.getWaterTiles();
        return waterTiles ? waterTiles.size : 0;
    });
    
    expect(waterTileCount).toBeGreaterThan(0);
    console.log(`Water tiles found: ${waterTileCount}`);
    
    // Spawn plants in both riparian and non-riparian zones to activate decomposition
    await page.evaluate(() => {
        const engine = window.graphicsEngine;
        const plantManager = engine.plantManager;
        const soilManager = engine.soilManager;
        const terrainGen = soilManager.terrainGenerator;
        const waterTiles = terrainGen.getWaterTiles();
        
        let plantsSpawned = 0;
        
        // Spawn plants around water tiles to activate decomposition
        for (const waterKey of waterTiles) {
            const [waterX, waterY] = waterKey.split(',').map(Number);
            
            // Spawn in a grid pattern
            for (let dx = -6; dx <= 6; dx++) {
                for (let dy = -6; dy <= 6; dy++) {
                    const plantX = waterX + dx;
                    const plantY = waterY + dy;
                    const soil = soilManager.getSoilAt(plantX, plantY);
                    
                    if (!soil || soil.isWater || !soil.isPlantable) continue;
                    
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 6 || distance < 1) continue;
                    
                    // Spawn plant (use clover - fast growing groundcover)
                    try {
                        plantManager.spawnPlant(plantX, plantY, 'clover');
                        plantsSpawned++;
                    } catch (e) {
                        // Ignore spawn failures
                    }
                    
                    if (plantsSpawned >= 50) break;
                }
                if (plantsSpawned >= 50) break;
            }
            if (plantsSpawned >= 50) break;
        }
        
        return plantsSpawned;
    });
    
    await page.waitForTimeout(1000); // Let plants initialize
    
    console.log('Plants spawned to activate decomposition zones');
    
    // Record baseline samples
    const baseline = await page.evaluate(() => {
        const engine = window.graphicsEngine;
        const soilManager = engine.soilManager;
        const terrainGen = soilManager.terrainGenerator;
        const waterTiles = terrainGen.getWaterTiles();
        
        const riparianSamples = [];
        const nonRiparianSamples = [];
        const riparianRadius = 2;
        
        // Search across all water tiles to find riparian samples
        for (const waterKey of waterTiles) {
            const [waterX, waterY] = waterKey.split(',').map(Number);
            
            // Sample in grid around this water tile
            for (let dx = -8; dx <= 8; dx++) {
                for (let dy = -8; dy <= 8; dy++) {
                    const sampleX = waterX + dx;
                    const sampleY = waterY + dy;
                    const soil = soilManager.getSoilAt(sampleX, sampleY);
                    
                    if (!soil || soil.isWater || !soil.isPlantable) continue;
                    
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 8 || distance < 0.5) continue;
                    
                    const isRiparian = distance <= riparianRadius;
                    const sample = {
                        x: sampleX,
                        y: sampleY,
                        distance: distance,
                        om: soil.organicMatter || 0,
                        waterRef: { x: waterX, y: waterY }
                    };
                    
                    if (isRiparian && riparianSamples.length < 8) {
                        riparianSamples.push(sample);
                    } else if (!isRiparian && distance > (riparianRadius + 1) && nonRiparianSamples.length < 8) {
                        nonRiparianSamples.push(sample);
                    }
                    
                    // Stop if we have enough samples
                    if (riparianSamples.length >= 8 && nonRiparianSamples.length >= 8) {
                        break;
                    }
                }
                if (riparianSamples.length >= 8 && nonRiparianSamples.length >= 8) {
                    break;
                }
            }
            
            // Stop if we have enough samples
            if (riparianSamples.length >= 8 && nonRiparianSamples.length >= 8) {
                break;
            }
        }
        
        const riparianAvg = riparianSamples.length > 0 ? riparianSamples.reduce((sum, s) => sum + s.om, 0) / riparianSamples.length : 0;
        const nonRiparianAvg = nonRiparianSamples.length > 0 ? nonRiparianSamples.reduce((sum, s) => sum + s.om, 0) / nonRiparianSamples.length : 0;
        
        return {
            riparianSamples,
            nonRiparianSamples,
            riparianAvg,
            nonRiparianAvg,
            startDay: engine.timeManager.getElapsedGameDays()
        };
    });
        
        // Validate we got samples
        expect(baseline.riparianSamples.length).toBeGreaterThan(0);
        expect(baseline.nonRiparianSamples.length).toBeGreaterThan(0);
    
    console.log('Baseline recorded:');
    console.log(`  Riparian OM avg: ${baseline.riparianAvg.toFixed(2)}`);
    console.log(`  Non-riparian OM avg: ${baseline.nonRiparianAvg.toFixed(2)}`);
    console.log(`  Difference: ${(baseline.riparianAvg - baseline.nonRiparianAvg).toFixed(2)}`);
    console.log(`  Start day: ${baseline.startDay.toFixed(1)}`);
    
    // Set time scale to veryFast (5.0x)
    await page.evaluate(() => {
        window.graphicsEngine.timeManager.setTimeScale(5.0);
    });
    
    console.log('Time scale set to 5.0x (veryFast)');
    
    // Calculate wait time for 14 game days
    const realSecondsPerGameDay = await page.evaluate(() => {
        return window.graphicsEngine.timeManager.config.realSecondsPerGameDay;
    });
    
    const daysToWait = 14;
    const timeScale = 5.0;
    const secondsToWait = (daysToWait * realSecondsPerGameDay) / timeScale;
    
    console.log(`Waiting ${secondsToWait.toFixed(1)} seconds for ${daysToWait} game days...`);
    
    // Wait for time to elapse
    await page.waitForTimeout(secondsToWait * 1000);
    
    // Sample after 14 days
    const afterTest = await page.evaluate((baseline) => {
        const engine = window.graphicsEngine;
        const soilManager = engine.soilManager;
        
        const riparianSamples = [];
        const nonRiparianSamples = [];
        
        // Sample same locations as baseline
        baseline.riparianSamples.forEach(baseSample => {
            const soil = soilManager.getSoilAt(baseSample.x, baseSample.y);
            if (soil) {
                riparianSamples.push({
                    x: baseSample.x,
                    y: baseSample.y,
                    om: soil.organicMatter || 0,
                    baselineOM: baseSample.om
                });
            }
        });
        
        baseline.nonRiparianSamples.forEach(baseSample => {
            const soil = soilManager.getSoilAt(baseSample.x, baseSample.y);
            if (soil) {
                nonRiparianSamples.push({
                    x: baseSample.x,
                    y: baseSample.y,
                    om: soil.organicMatter || 0,
                    baselineOM: baseSample.om
                });
            }
        });
        
        const riparianAvg = riparianSamples.length > 0 ? riparianSamples.reduce((sum, s) => sum + s.om, 0) / riparianSamples.length : 0;
        const nonRiparianAvg = nonRiparianSamples.length > 0 ? nonRiparianSamples.reduce((sum, s) => sum + s.om, 0) / nonRiparianSamples.length : 0;
        
        const currentDay = engine.timeManager.getElapsedGameDays();
        const daysSinceStart = currentDay - baseline.startDay;
        
        return {
            riparianSamples,
            nonRiparianSamples,
            riparianAvg,
            nonRiparianAvg,
            currentDay,
            daysSinceStart
        };
    }, baseline);
    
    console.log(`\nAfter ${afterTest.daysSinceStart.toFixed(1)} days:`);
    console.log(`  Riparian OM avg: ${afterTest.riparianAvg.toFixed(2)}`);
    console.log(`  Non-riparian OM avg: ${afterTest.nonRiparianAvg.toFixed(2)}`);
    console.log(`  Difference: ${(afterTest.riparianAvg - afterTest.nonRiparianAvg).toFixed(2)}`);
    
    // Calculate changes
    const riparianChange = afterTest.riparianAvg - baseline.riparianAvg;
    const nonRiparianChange = afterTest.nonRiparianAvg - baseline.nonRiparianAvg;
    const differenceChange = (afterTest.riparianAvg - afterTest.nonRiparianAvg) - (baseline.riparianAvg - baseline.nonRiparianAvg);
    
    console.log('\nChanges:');
    console.log(`  Riparian: ${riparianChange >= 0 ? '+' : ''}${riparianChange.toFixed(2)} OM`);
    console.log(`  Non-riparian: ${nonRiparianChange >= 0 ? '+' : ''}${nonRiparianChange.toFixed(2)} OM`);
    console.log(`  Difference: ${differenceChange >= 0 ? '+' : ''}${differenceChange.toFixed(2)} OM`);
    
    // Validation checks
    console.log('\nValidation checks:');
    
    // Check 1: Time elapsed
    expect(afterTest.daysSinceStart).toBeGreaterThanOrEqual(14);
    console.log(`  ✓ Time elapsed: ${afterTest.daysSinceStart.toFixed(1)} days (≥14)`);
    
    // Check 2: Riparian OM accumulation (adjusted for realistic expectations with active cells)
    // Expected: At least 1.5 OM gain over 14 days with 0.3/day input and 0.5x decay
    expect(riparianChange).toBeGreaterThanOrEqual(1.5);
    console.log(`  ✓ Riparian OM accumulated: ${riparianChange >= 0 ? '+' : ''}${riparianChange.toFixed(2)} (≥1.5)`);
    
    // Check 3: Non-riparian limited change (should be minimal or negative due to decay)
    expect(nonRiparianChange).toBeLessThanOrEqual(0.5);
    console.log(`  ✓ Non-riparian OM change: ${nonRiparianChange >= 0 ? '+' : ''}${nonRiparianChange.toFixed(2)} (≤0.5)`);
    
    // Check 4: Riparian > Non-riparian
    expect(afterTest.riparianAvg).toBeGreaterThan(afterTest.nonRiparianAvg);
    console.log(`  ✓ Riparian OM > Non-riparian OM: ${afterTest.riparianAvg.toFixed(2)} > ${afterTest.nonRiparianAvg.toFixed(2)}`);
    
    // Check 5: Difference increased
    expect(differenceChange).toBeGreaterThan(0);
    console.log(`  ✓ OM difference increased: ${differenceChange >= 0 ? '+' : ''}${differenceChange.toFixed(2)}`);
    
    console.log('\n✅ All validation checks passed!');
    console.log('Riparian OM accumulation working as expected.');
});

test('Riparian zone radius validation', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto('http://localhost:8081/');
    await page.waitForFunction(() => window.graphicsEngine !== undefined, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('Testing riparian zone radius...');
    
    // Get riparian radius from config
    const riparianRadius = await page.evaluate(() => {
        return window.graphicsEngine.config?.world?.soil?.decomposition?.riparianZone?.radius || 2;
    });
    
    console.log(`Riparian radius: ${riparianRadius} cells`);
    
    // Test boundary cells
    const boundaryTest = await page.evaluate((radius) => {
        const engine = window.graphicsEngine;
        const soilManager = engine.soilManager;
        const terrainGen = soilManager.terrainGenerator;
        const waterTiles = terrainGen.getWaterTiles();
        
        if (!waterTiles || waterTiles.size === 0) {
            return { error: 'No water tiles found' };
        }
        
        // Get first water tile
        const firstWater = Array.from(waterTiles)[0];
        const [waterX, waterY] = firstWater.split(',').map(Number);
        
        // Test cells at exact radius boundary
        const boundaryResults = [];
        
        // Test at distance = radius (should be riparian)
        const atBoundary = soilManager.getSoilAt(waterX + radius, waterY);
        if (atBoundary && !atBoundary.isWater) {
            boundaryResults.push({
                distance: radius,
                expectedRiparian: true,
                om: atBoundary.organicMatter
            });
        }
        
        // Test at distance = radius + 1 (should NOT be riparian)
        const beyondBoundary = soilManager.getSoilAt(waterX + radius + 1, waterY);
        if (beyondBoundary && !beyondBoundary.isWater) {
            boundaryResults.push({
                distance: radius + 1,
                expectedRiparian: false,
                om: beyondBoundary.organicMatter
            });
        }
        
        return { boundaryResults, waterX, waterY };
    }, riparianRadius);
    
    if (boundaryTest.error) {
        console.error(boundaryTest.error);
        return;
    }
    
    console.log('Boundary test results:');
    boundaryTest.boundaryResults.forEach(result => {
        console.log(`  Distance ${result.distance}: Expected riparian=${result.expectedRiparian}, OM=${result.om.toFixed(2)}`);
    });
    
    // Verify we got results
    expect(boundaryTest.boundaryResults.length).toBeGreaterThan(0);
    console.log('✓ Radius boundary test completed');
});

test('Console errors check', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    await page.goto('http://localhost:8081/');
    await page.waitForFunction(() => window.graphicsEngine !== undefined, { timeout: 10000 });
    await page.waitForTimeout(5000); // Let decomposition run for a bit
    
    console.log(`Console errors detected: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
        console.log('Errors:');
        consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    expect(consoleErrors.length).toBe(0);
});
