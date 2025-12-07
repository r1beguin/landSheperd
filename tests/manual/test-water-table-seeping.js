/**
 * Manual Water Table Seeping Test
 * 
 * Run this in the browser console to manually validate water table seeping.
 * 
 * Usage:
 * 1. Open index.html in browser
 * 2. Open browser console (F12)
 * 3. Copy-paste this entire file into console
 * 4. Run: testWaterTableSeeping()
 */

async function testWaterTableSeeping() {
    console.log('=== WATER TABLE SEEPING TEST ===\n');
    
    const engine = window.graphicsEngine;
    if (!engine) {
        console.error('GraphicsEngine not found!');
        return;
    }
    
    const soilManager = engine.soilManager;
    const timeManager = engine.timeManager;
    const terrainGenerator = soilManager.terrainGenerator;
    
    // Check config
    const waterTableConfig = engine.config.world.terrain.water.waterTable;
    console.log('Water Table Config:', waterTableConfig);
    
    if (!waterTableConfig.enabled) {
        console.error('Water table seeping is disabled in config!');
        return;
    }
    
    // Find water tiles
    const waterTiles = terrainGenerator.getWaterTiles();
    console.log(`Found ${waterTiles.size} water tiles\n`);
    
    if (waterTiles.size === 0) {
        console.error('No water tiles found!');
        return;
    }
    
    // Pick first water tile
    const firstWaterTile = Array.from(waterTiles)[0];
    const [waterX, waterY] = firstWaterTile.split(',').map(Number);
    console.log(`Testing near water tile at (${waterX}, ${waterY})\n`);
    
    // Test cells at various distances
    const testCells = [
        { x: waterX + 1, y: waterY, expectedDist: 1 },
        { x: waterX + 2, y: waterY, expectedDist: 2 },
        { x: waterX + 3, y: waterY, expectedDist: 3 },
        { x: waterX + 4, y: waterY, expectedDist: 4 },
        { x: waterX + 5, y: waterY, expectedDist: 5 } // Should be outside radius
    ];
    
    // Record initial states
    const initialStates = [];
    console.log('INITIAL STATES:');
    for (const cell of testCells) {
        const soil = soilManager.getSoilAt(cell.x, cell.y);
        if (!soil || soil.isWater || !soil.isPlantable) {
            console.log(`  (${cell.x}, ${cell.y}) - Not plantable/is water - SKIP`);
            initialStates.push(null);
            continue;
        }
        
        const state = {
            x: cell.x,
            y: cell.y,
            distance: cell.expectedDist,
            waterRetention: soil.waterRetention
        };
        initialStates.push(state);
        console.log(`  (${cell.x}, ${cell.y}) dist ${cell.expectedDist}: WaterRetention = ${state.waterRetention.toFixed(2)}`);
    }
    
    console.log('\n--- ADVANCING TIME BY 20 GAME DAYS ---\n');
    
    // Set fast time scale
    const originalTimeScale = timeManager.getTimeScale();
    timeManager.setTimeScale(5.0); // veryFast
    
    // Fast-forward 20 game days
    const currentDay = timeManager.getElapsedGameDays();
    const targetDay = currentDay + 20;
    
    while (timeManager.getElapsedGameDays() < targetDay) {
        const deltaTime = 0.1; // 0.1 seconds
        timeManager.update(deltaTime);
        soilManager.update(deltaTime); // Update soil effects
        
        // Wait a frame
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
    
    // Restore original time scale
    timeManager.setTimeScale(originalTimeScale);
    
    console.log('FINAL STATES:');
    console.log('');
    
    // Check final states and calculate increases
    let allPassed = true;
    for (let i = 0; i < initialStates.length; i++) {
        const initial = initialStates[i];
        if (!initial) continue;
        
        const soil = soilManager.getSoilAt(initial.x, initial.y);
        const finalWater = soil.waterRetention;
        const increase = finalWater - initial.waterRetention;
        
        // Calculate expected increase with falloff
        const radius = waterTableConfig.radius;
        const distance = initial.distance;
        const falloff = distance <= radius ? (1.0 - (distance / radius)) : 0;
        const expectedIncrease = waterTableConfig.seepingRatePerDay * 20 * falloff;
        
        console.log(`  (${initial.x}, ${initial.y}) dist ${distance}:`);
        console.log(`    Initial: ${initial.waterRetention.toFixed(2)}`);
        console.log(`    Final: ${finalWater.toFixed(2)}`);
        console.log(`    Increase: ${increase.toFixed(2)}`);
        console.log(`    Expected: ~${expectedIncrease.toFixed(2)} (with falloff ${falloff.toFixed(2)})`);
        
        // Validate
        if (distance <= radius) {
            // Should have increase
            if (increase > 0) {
                console.log(`    ✓ PASS - Increase detected within radius`);
            } else {
                console.log(`    ✗ FAIL - No increase within radius`);
                allPassed = false;
            }
            
            // Check if capped at max
            if (finalWater > waterTableConfig.maxWaterRetention) {
                console.log(`    ✗ FAIL - Exceeded max water retention (${waterTableConfig.maxWaterRetention})`);
                allPassed = false;
            }
        } else {
            // Outside radius - should have minimal/no increase
            if (Math.abs(increase) < 0.1) {
                console.log(`    ✓ PASS - Minimal change outside radius`);
            } else {
                console.log(`    ⚠ WARNING - Unexpected change outside radius`);
            }
        }
        console.log('');
    }
    
    console.log('=== TEST SUMMARY ===');
    console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
    console.log(`Water tiles: ${waterTiles.size}`);
    console.log(`Seeping rate: ${waterTableConfig.seepingRatePerDay}/day`);
    console.log(`Radius: ${waterTableConfig.radius} cells`);
    console.log(`Max water retention: ${waterTableConfig.maxWaterRetention}`);
    
    return allPassed;
}

// Auto-run if not already running
if (typeof window !== 'undefined' && window.graphicsEngine) {
    console.log('Water Table Seeping Test loaded. Run: testWaterTableSeeping()');
}
