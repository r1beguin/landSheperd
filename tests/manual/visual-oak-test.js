/**
 * Visual Oak Tree Test
 * Tests that oak tree canopies are not cropped at different growth stages
 */

const testOakVisuals = async () => {
    console.log('=== OAK VISUAL TEST ===');
    
    // Wait for game to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!window.graphicsEngine) {
        console.error('GraphicsEngine not initialized');
        return;
    }
    
    const plantManager = window.graphicsEngine.plantManager;
    const timeManager = window.graphicsEngine.timeManager;
    
    if (!plantManager) {
        console.error('PlantManager not initialized');
        return;
    }
    
    console.log('PlantManager found, species loaded:', Object.keys(plantManager.speciesConfigs));
    
    // Find a good location near center
    const testX = 10;
    const testY = 5;
    
    // Test 1: Plant Sapling
    console.log('\n--- Test 1: Planting Oak Sapling ---');
    const sapling = plantManager.addPlant(testX, testY, 'quercus_robur', 'Sapling');
    if (sapling) {
        console.log('✓ Sapling planted at', testX, testY);
        console.log('  Stage:', sapling.stage);
        console.log('  Dimensions:', sapling.width, 'x', sapling.height);
    } else {
        console.error('✗ Failed to plant sapling');
    }
    
    // Test 2: Plant Young Tree nearby
    console.log('\n--- Test 2: Planting Young Oak Tree ---');
    const youngTree = plantManager.addPlant(testX + 3, testY, 'quercus_robur', 'YoungTree');
    if (youngTree) {
        console.log('✓ Young Tree planted at', testX + 3, testY);
        console.log('  Stage:', youngTree.stage);
        console.log('  Dimensions:', youngTree.width, 'x', youngTree.height);
    } else {
        console.error('✗ Failed to plant young tree');
    }
    
    // Test 3: Plant Mature Tree nearby
    console.log('\n--- Test 3: Planting Mature Oak Tree ---');
    const matureTree = plantManager.addPlant(testX + 6, testY, 'quercus_robur', 'MatureTree');
    if (matureTree) {
        console.log('✓ Mature Tree planted at', testX + 6, testY);
        console.log('  Stage:', matureTree.stage);
        console.log('  Dimensions:', matureTree.width, 'x', matureTree.height);
    } else {
        console.error('✗ Failed to plant mature tree');
    }
    
    // Test 4: Plant Withered Tree nearby
    console.log('\n--- Test 4: Planting Withered Oak Tree ---');
    const witheredTree = plantManager.addPlant(testX + 9, testY, 'quercus_robur', 'Withered');
    if (witheredTree) {
        console.log('✓ Withered Tree planted at', testX + 9, testY);
        console.log('  Stage:', witheredTree.stage);
        console.log('  Dimensions:', witheredTree.width, 'x', witheredTree.height);
    } else {
        console.error('✗ Failed to plant withered tree');
    }
    
    console.log('\n=== VISUAL INSPECTION ===');
    console.log('Look at the oak trees and verify:');
    console.log('1. Sapling: Small tree with 3 canopy circles (should fit fully)');
    console.log('2. Young Tree: Medium tree with 5 canopy circles (canopy should NOT be cropped at top)');
    console.log('3. Mature Tree: Large tree with 7 canopy circles (canopy should NOT be cropped at top)');
    console.log('4. Withered Tree: Bare trunk with branch sticks (no leaves)');
    console.log('\n✓ All 4 stages planted. Inspect visually for cropping issues.');
    
    // Get total plant count
    const totalPlants = plantManager.getAllPlants().length;
    console.log('\nTotal plants:', totalPlants);
};

// Auto-run when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testOakVisuals);
} else {
    testOakVisuals();
}
