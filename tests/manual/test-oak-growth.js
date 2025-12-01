/**
 * Test Oak Growth - Verify oak trees advance through growth stages
 * Usage: Run in browser console after page load
 */

function testOakGrowth() {
    console.log('=== Oak Growth Test ===');
    
    const plantManager = window.graphicsEngine.plantManager;
    const timeManager = window.graphicsEngine.timeManager;
    const soilManager = window.graphicsEngine.soilManager;
    
    // Clear existing plants
    plantManager.plants.clear();
    console.log('✓ Cleared existing plants');
    
    // Plant oak at center with enriched soil
    const testGridX = 25;
    const testGridY = 25;
    
    // Enrich soil to ensure growth isn't stunted
    const soil = soilManager.getSoilAt(testGridX, testGridY);
    if (soil) {
        soil.updateNutrients(80, 60, 60, 60); // High nutrients
        console.log('✓ Enriched soil at test location');
    }
    
    // Plant oak
    const currentDay = timeManager.getCurrentDayPrecise();
    const oak = plantManager.addPlant(testGridX, testGridY, 'quercus_robur', currentDay);
    
    if (!oak) {
        console.error('✗ Failed to plant oak');
        return;
    }
    
    console.log(`✓ Oak planted at (${testGridX}, ${testGridY})`);
    console.log(`  Initial stage: ${oak.stage}`);
    console.log(`  Age: ${oak.age} days`);
    console.log(`  Days to next stage: ${oak.species.growthStages[0].daysToGrow}`);
    
    // Check growth modifiers
    const saplingConfig = oak.species.growthStages.find(s => s.name === 'Sapling');
    if (saplingConfig.growthModifiers) {
        console.log('✓ Sapling has growth modifiers');
    } else {
        console.error('✗ Sapling missing growth modifiers - growth will be stuck!');
        return;
    }
    
    // Calculate current growth rate
    const growthRate = oak.calculateGrowthRate();
    console.log(`  Current growth rate: ${(growthRate * 100).toFixed(1)}%`);
    
    if (growthRate === 0) {
        console.warn('⚠ Growth rate is 0% - plant may be stunted');
        console.log('  Soil nutrients:', {
            N: soil.nitrogen,
            P: soil.phosphorus,
            K: soil.potassium,
            OM: soil.organicMatter
        });
    }
    
    console.log('\n--- Simulating Growth ---');
    console.log('Advancing time by 8 game days...');
    
    // Simulate 8 days of growth
    for (let day = 0; day < 8; day++) {
        oak.update(1, currentDay + day + 1);
        
        if (day === 0 || day === 3 || day === 7) {
            console.log(`Day ${day + 1}: Stage=${oak.stage}, AccumulatedDays=${oak.accumulatedGrowthDays.toFixed(2)}`);
        }
    }
    
    console.log('\n=== Final State ===');
    console.log(`Stage: ${oak.stage}`);
    console.log(`Age: ${oak.age} days`);
    console.log(`Accumulated growth days: ${oak.accumulatedGrowthDays.toFixed(2)}`);
    
    if (oak.stage === 'YoungTree') {
        console.log('✅ SUCCESS: Oak advanced from Sapling to YoungTree');
        console.log('Oak growth is working correctly!');
    } else if (oak.stage === 'Sapling') {
        console.warn('⚠ Oak still in Sapling stage after 8 days');
        console.log('This may be normal if growth rate was slow due to nutrients');
        console.log(`Needs ${(7 - oak.accumulatedGrowthDays).toFixed(2)} more accumulated days to advance`);
    } else {
        console.error('✗ Unexpected stage:', oak.stage);
    }
    
    console.log('\n=== Visual Verification ===');
    console.log('Look at the oak at grid (25, 25):');
    console.log('- Sapling: Small tree (~20px tall, small canopy)');
    console.log('- YoungTree: Medium tree (~30px tall, fuller canopy)');
    console.log('- Check canvas to see if sprite matches stage');
    
    return oak;
}

// Helper: Manually advance oak stage
function advanceOakStage() {
    const plants = window.graphicsEngine.plantManager.getPlantAt(25, 25);
    const oak = plants.length > 0 ? plants[0] : null;
    if (!oak) {
        console.error('No oak found at (25, 25). Run testOakGrowth() first.');
        return;
    }
    
    const currentDay = window.graphicsEngine.timeManager.getCurrentDayPrecise();
    const advanced = oak.advanceGrowthStage(currentDay);
    
    if (advanced) {
        console.log(`✓ Oak advanced to: ${oak.stage}`);
    } else {
        console.log('⚠ Oak could not advance (may be at final stage or missing nutrients)');
    }
    
    return oak;
}

// Auto-run if ready
if (window.graphicsEngine && window.graphicsEngine.plantManager) {
    console.log('Ready to test oak growth!');
    console.log('Run: testOakGrowth()');
    console.log('Or manually advance: advanceOakStage()');
} else {
    console.log('Waiting for game to load...');
    console.log('Run testOakGrowth() after page loads');
}
