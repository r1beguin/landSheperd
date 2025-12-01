/**
 * Layer Visual Test - Spawns test plants for layer rendering validation
 * Usage: Run in browser console after page load
 */
function testLayerRendering() {
    const plantManager = window.graphicsEngine.plantManager;
    const timeManager = window.graphicsEngine.timeManager;
    const currentDay = timeManager.getCurrentDayPrecise();
    
    console.log('=== Layer Rendering Test ===');
    
    // Clear existing plants
    plantManager.plants.clear();
    
    // Test 1: Side-by-side comparison
    console.log('Test 1: Side-by-side nettle and oak');
    const nettle1 = plantManager.addPlant(20, 20, 'urtica_dioica', currentDay);
    const oak1 = plantManager.addPlant(22, 20, 'quercus_robur', currentDay);
    
    // Test 2: Overlapping (oak should render above nettle)
    console.log('Test 2: Overlapping plants (oak above nettle)');
    const nettle2 = plantManager.addPlant(25, 25, 'urtica_dioica', currentDay);
    const oak2 = plantManager.addPlant(25, 25, 'quercus_robur', currentDay); // Same cell
    
    // Test 3: Multiple oaks and nettles mixed
    console.log('Test 3: Mixed colony');
    for (let i = 28; i < 32; i++) {
        for (let j = 20; j < 24; j++) {
            const species = Math.random() > 0.5 ? 'quercus_robur' : 'urtica_dioica';
            plantManager.addPlant(i, j, species, currentDay);
        }
    }
    
    console.log(`Total plants spawned: ${plantManager.plants.size}`);
    console.log('Visual checks:');
    console.log('- Oak trees should appear taller than nettles');
    console.log('- Oak trees should render ABOVE nettles when overlapping');
    console.log('- No Z-fighting or flickering');
    console.log('- Mixed colony should show clear layer separation');
}

// Auto-run if graphicsEngine is ready
if (window.graphicsEngine && window.graphicsEngine.plantManager) {
    testLayerRendering();
} else {
    console.log('Run testLayerRendering() after page loads');
}
