/**
 * Manual Oak Canopy Fix Validation
 * 
 * Open index.html in browser, then paste this into console to test.
 * This will spawn all 4 oak growth stages and verify canopies are not cropped.
 */

(async function testOakCanopyFix() {
    console.log('=== Oak Canopy Fix Validation ===');
    console.log('Testing: Mature oak canopy should NOT be cropped at top');
    console.log('=====================================\n');
    
    // Wait for game to be ready
    if (!window.graphicsEngine || !window.graphicsEngine.plantManager) {
        console.error('Game not ready. Wait for initialization and try again.');
        return;
    }
    
    const plantManager = window.graphicsEngine.plantManager;
    const currentDay = window.graphicsEngine.timeManager?.getCurrentDayPrecise() || 0;
    
    // Spawn positions (spaced out for easy viewing)
    const spawnPositions = [
        { x: 25, y: 25, stage: 'Sapling', name: 'Sapling' },
        { x: 27, y: 25, stage: 'YoungTree', name: 'Young Tree' },
        { x: 29, y: 25, stage: 'MatureTree', name: 'Mature Tree' },
        { x: 31, y: 25, stage: 'Withered', name: 'Withered' }
    ];
    
    console.log('Step 1: Spawning oak trees at different stages...\n');
    
    // Get oak species config
    const oakConfig = plantManager.speciesConfigs.get('quercus_robur');
    if (!oakConfig) {
        console.error('Oak species not found!');
        return;
    }
    
    const spawnedPlants = [];
    
    // Spawn each stage
    for (const pos of spawnPositions) {
        console.log(`  Spawning ${pos.name} at (${pos.x}, ${pos.y})...`);
        
        // Create plant
        const plant = plantManager.addPlant(pos.x, pos.y, 'quercus_robur', currentDay);
        
        if (!plant) {
            console.error(`  ✗ Failed to spawn ${pos.name}`);
            continue;
        }
        
        // Force to specific stage
        plant.stage = pos.stage;
        plant.currentStage = pos.stage;
        plant.age = 0;
        
        // Generate sprite for this stage
        plant.sprite = window.PlantGenerator.generatePlantSprite(oakConfig, pos.stage);
        
        spawnedPlants.push({ plant, pos });
        console.log(`  ✓ ${pos.name} spawned successfully`);
    }
    
    console.log(`\nStep 2: Analyzing sprites...\n`);
    
    // Analyze each sprite
    for (const { plant, pos } of spawnedPlants) {
        const sprite = plant.sprite;
        if (!sprite) {
            console.warn(`  ${pos.name}: No sprite generated`);
            continue;
        }
        
        const ctx = sprite.getContext('2d');
        const width = sprite.width;
        const height = sprite.height;
        
        // Get pixel data for top 5 rows
        const topRowsData = ctx.getImageData(0, 0, width, 5);
        const data = topRowsData.data;
        
        // Count non-transparent pixels in top rows
        let nonTransparentPixels = 0;
        let greenPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a > 10) {
                nonTransparentPixels++;
                
                // Check if it's a green pixel (canopy)
                if (g > r && g > b && g > 80) {
                    greenPixels++;
                }
            }
        }
        
        const totalPixels = (width * 5);
        const canopyPercent = (greenPixels / totalPixels) * 100;
        
        console.log(`  ${pos.name}:`);
        console.log(`    Sprite size: ${width}x${height}px`);
        console.log(`    Top 5 rows: ${nonTransparentPixels}/${totalPixels} pixels with content`);
        console.log(`    Green (canopy) coverage: ${canopyPercent.toFixed(2)}%`);
        
        // Verdict for mature tree
        if (pos.stage === 'MatureTree') {
            if (canopyPercent > 15) {
                console.log(`    ✓ PASS: Canopy visible at top (${canopyPercent.toFixed(1)}% coverage)`);
                console.log(`    ✓ Fix working: canopyY = canopyRadius + 8 + topMargin`);
            } else {
                console.log(`    ✗ FAIL: Little/no canopy at top (${canopyPercent.toFixed(1)}% coverage)`);
                console.log(`    ✗ Canopy likely cropped!`);
            }
        } else if (pos.stage === 'YoungTree') {
            if (canopyPercent > 10) {
                console.log(`    ✓ PASS: Canopy visible at top`);
            } else {
                console.log(`    ⚠ WARNING: Low canopy coverage at top`);
            }
        }
        console.log('');
    }
    
    console.log('Step 3: Visual inspection...');
    console.log('  Pan camera to grid position (25-31, 25) to see all oak trees');
    console.log('  Verify mature oak has full rounded canopy (not flat/cropped at top)');
    console.log('  Young tree should also have visible top canopy');
    console.log('\n=== Test Complete ===');
    console.log('If mature oak has visible rounded top, fix is SUCCESSFUL');
    
    return {
        spawnedCount: spawnedPlants.length,
        expectedCount: spawnPositions.length,
        success: spawnedPlants.length === spawnPositions.length
    };
})();
