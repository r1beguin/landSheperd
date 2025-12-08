/**
 * Manual test to debug isometric plant spawning coordinates
 * Open index.html, then run this in browser console
 */

async function debugIsometricCoords() {
    console.log('=== ISOMETRIC COORDINATE DEBUG ===\n');
    
    // Get config
    const config = window.config;
    const projection = config.world.rendering.projection;
    const isoConfig = config.world.rendering.isometric;
    const cellSize = config.world.map.cellSize;
    
    console.log(`Projection: ${projection}`);
    console.log(`Tile dimensions: ${isoConfig.tileWidth}x${isoConfig.tileHeight}`);
    console.log(`Cell size: ${cellSize}\n`);
    
    // Test case: Grid cell (25, 25)
    const testGridX = 25;
    const testGridY = 25;
    
    console.log(`--- TEST: Spawning at grid (${testGridX}, ${testGridY}) ---\n`);
    
    // Step 1: What the right-click handler does
    console.log('STEP 1: Right-click handler converts grid to isometric world coords');
    const isoPos = IsometricUtils.gridToIso(testGridX, testGridY, isoConfig.tileWidth, isoConfig.tileHeight);
    console.log(`  IsometricUtils.gridToIso(${testGridX}, ${testGridY})`);
    console.log(`  Result: isoX=${isoPos.x}, isoY=${isoPos.y}\n`);
    
    // Step 2: What PlantManager does
    console.log('STEP 2: PlantManager.addPlantAtPosition() calculates ortho world coords');
    const orthoWorldX = testGridX * cellSize + cellSize / 2;
    const orthoWorldY = testGridY * cellSize + cellSize / 2;
    console.log(`  orthoWorldX = ${testGridX} * ${cellSize} + ${cellSize/2} = ${orthoWorldX}`);
    console.log(`  orthoWorldY = ${testGridY} * ${cellSize} + ${cellSize/2} = ${orthoWorldY}\n`);
    
    // Step 3: What Plant constructor does
    console.log('STEP 3: Plant constructor calculates gridX/gridY from ortho coords');
    const plantGridX = Math.floor(orthoWorldX / cellSize);
    const plantGridY = Math.floor(orthoWorldY / cellSize);
    console.log(`  Plant.gridX = Math.floor(${orthoWorldX} / ${cellSize}) = ${plantGridX}`);
    console.log(`  Plant.gridY = Math.floor(${orthoWorldY} / ${cellSize}) = ${plantGridY}\n`);
    
    // Step 4: What getRenderData() does
    console.log('STEP 4: Plant.getRenderData() converts back to isometric');
    const renderIsoPos = IsometricUtils.gridToIso(plantGridX, plantGridY, isoConfig.tileWidth, isoConfig.tileHeight);
    console.log(`  IsometricUtils.gridToIso(${plantGridX}, ${plantGridY})`);
    console.log(`  Result: renderX=${renderIsoPos.x}, renderY=${renderIsoPos.y}\n`);
    
    // Verification
    console.log('VERIFICATION:');
    console.log(`  Expected grid: (${testGridX}, ${testGridY})`);
    console.log(`  Plant internal grid: (${plantGridX}, ${plantGridY})`);
    console.log(`  Grid match: ${plantGridX === testGridX && plantGridY === testGridY ? '✓ CORRECT' : '✗ MISMATCH'}\n`);
    
    // Now test with actual spawning
    console.log('--- ACTUAL SPAWN TEST ---\n');
    
    const plantCountBefore = window.graphicsEngine.plantManager.plants.size;
    console.log(`Plants before: ${plantCountBefore}`);
    
    // Spawn Oak at test grid location
    const currentDay = window.graphicsEngine.timeManager.getCurrentDayPrecise();
    const plant = window.graphicsEngine.plantManager.addPlantAtPosition(
        testGridX,
        testGridY,
        isoPos.x,
        isoPos.y,
        'oak',
        currentDay
    );
    
    const plantCountAfter = window.graphicsEngine.plantManager.plants.size;
    console.log(`Plants after: ${plantCountAfter}`);
    
    if (plant) {
        console.log(`\nPlant created successfully!`);
        console.log(`  Plant.x: ${plant.x}`);
        console.log(`  Plant.y: ${plant.y}`);
        console.log(`  Plant.gridX: ${plant.gridX}`);
        console.log(`  Plant.gridY: ${plant.gridY}`);
        
        const renderData = plant.getRenderData();
        console.log(`  getRenderData().x: ${renderData.x}`);
        console.log(`  getRenderData().y: ${renderData.y}`);
        
        // Check where plant was actually stored
        console.log(`\nStorage location check:`);
        const plantsAtExpected = window.graphicsEngine.plantManager.getPlantAt(testGridX, testGridY);
        const plantsBelow = window.graphicsEngine.plantManager.getPlantAt(testGridX, testGridY + 1);
        const plantsAbove = window.graphicsEngine.plantManager.getPlantAt(testGridX, testGridY - 1);
        
        console.log(`  At expected (${testGridX}, ${testGridY}): ${plantsAtExpected.length > 0 ? '✓ FOUND' : '✗ NOT FOUND'}`);
        console.log(`  At below (${testGridX}, ${testGridY + 1}): ${plantsBelow.length > 0 ? '✓ FOUND' : '✗ NOT FOUND'}`);
        console.log(`  At above (${testGridX}, ${testGridY - 1}): ${plantsAbove.length > 0 ? '✓ FOUND' : '✗ NOT FOUND'}`);
        
        if (plantsAtExpected.length === 0 && plantsBelow.length > 0) {
            console.log(`\n✗ BUG CONFIRMED: Plant spawned ONE CELL BELOW expected location!`);
        } else if (plantsAtExpected.length > 0) {
            console.log(`\n✓ Plant spawned at correct location!`);
        }
    } else {
        console.log(`\n✗ Plant creation failed!`);
    }
    
    console.log('\n=== END DEBUG ===');
}

// Run the test
debugIsometricCoords();
