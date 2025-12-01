/**
 * Manual validation script for oak sprite generation and context menu species selection
 * Run this in the browser console after loading the game
 * 
 * Usage:
 * 1. Open http://localhost:8081 in browser
 * 2. Open developer console (F12)
 * 3. Copy and paste this entire script
 * 4. Follow the instructions printed in console
 */

console.log('%c=== VALIDATION SCRIPT FOR OAK FIXES ===', 'color: #88cc88; font-size: 16px; font-weight: bold');
console.log('');

// Check 1: Species palette removed from DOM
console.log('%cCheck 1: Species Palette Removal', 'color: #4CAF50; font-weight: bold');
const palette = document.getElementById('species-palette');
if (!palette) {
    console.log('✅ PASS: Species palette element not found in DOM');
} else {
    console.error('❌ FAIL: Species palette still exists in DOM');
}
console.log('');

// Check 2: Verify PlantManager has both species
console.log('%cCheck 2: Species Loading', 'color: #4CAF50; font-weight: bold');
const plantManager = window.graphicsEngine.plantManager;
const species = plantManager.getAvailableSpecies();
console.log('Available species:', species);
if (species.includes('urtica_dioica') && species.includes('quercus_robur')) {
    console.log('✅ PASS: Both nettle and oak species loaded');
} else {
    console.error('❌ FAIL: Missing species');
}
console.log('');

// Check 3: Test oak sprite generation for all stages
console.log('%cCheck 3: Oak Sprite Generation', 'color: #4CAF50; font-weight: bold');
const oakConfig = plantManager.getSpeciesById('quercus_robur');
const stages = ['Sapling', 'YoungTree', 'MatureTree', 'Withered'];
let allStagesPass = true;

stages.forEach(stage => {
    try {
        const sprite = PlantGenerator.generatePlantSprite(oakConfig, stage);
        if (sprite && sprite.width === 40 && sprite.height === 50) {
            console.log(`✅ ${stage}: Generated successfully (${sprite.width}x${sprite.height})`);
        } else {
            console.error(`❌ ${stage}: Invalid dimensions or null sprite`);
            allStagesPass = false;
        }
    } catch (error) {
        console.error(`❌ ${stage}: Error - ${error.message}`);
        allStagesPass = false;
    }
});

if (allStagesPass) {
    console.log('✅ PASS: All oak stages generate sprites without errors');
} else {
    console.error('❌ FAIL: Some oak stages failed to generate');
}
console.log('');

// Check 4: Manual instructions for context menu testing
console.log('%cCheck 4: Context Menu Species Selection', 'color: #4CAF50; font-weight: bold');
console.log('%cMANUAL TEST REQUIRED:', 'color: #FFA500; font-weight: bold');
console.log('1. Right-click on empty soil (any grey/green area)');
console.log('2. Verify context menu appears');
console.log('3. Verify "Plant Species" section is visible');
console.log('4. Verify both "Stinging Nettle" and "Oak Tree" buttons are present');
console.log('5. Click "Oak Tree" button');
console.log('6. Verify oak sapling appears (larger than nettles)');
console.log('7. Right-click the oak tree');
console.log('8. Verify plant info shows "Oak Tree" in title');
console.log('9. Click "Advance Growth" button');
console.log('10. Verify oak changes to YoungTree (larger canopy)');
console.log('11. Advance again → MatureTree (full canopy)');
console.log('12. Advance again → Withered (bare branches)');
console.log('');

// Helper function to plant oak programmatically for testing
console.log('%cHelper Function Available:', 'color: #2196F3; font-weight: bold');
console.log('Call plantOakAt(gridX, gridY) to plant oak at specific coordinates');
console.log('Example: plantOakAt(25, 25) plants oak at center of map');
console.log('');

window.plantOakAt = function(gridX, gridY) {
    const worldX = gridX * 20 + 10;
    const worldY = gridY * 20 + 10;
    const currentDay = window.graphicsEngine.timeManager.getCurrentDayPrecise();
    
    try {
        window.graphicsEngine.plantManager.addPlantAtPosition(
            gridX,
            gridY,
            worldX,
            worldY,
            'quercus_robur',
            currentDay
        );
        console.log(`✅ Oak planted at (${gridX}, ${gridY})`);
        
        // Get the planted oak
        const plants = window.graphicsEngine.plantManager.getPlantAt(gridX, gridY);
        const oak = plants.length > 0 ? plants[0] : null;
        console.log('Oak info:', {
            species: oak.species.commonName,
            stage: oak.stage,
            dimensions: { width: oak.width, height: oak.height },
            hasTexture: oak.texture !== null
        });
        
        return oak;
    } catch (error) {
        console.error('❌ Failed to plant oak:', error);
        return null;
    }
};

// Helper function to advance a plant's growth stage
window.advancePlantAt = function(gridX, gridY) {
    const plants = window.graphicsEngine.plantManager.getPlantAt(gridX, gridY);
    const plant = plants.length > 0 ? plants[0] : null;
    if (!plant) {
        console.error(`❌ No plant at (${gridX}, ${gridY})`);
        return;
    }
    
    const currentDay = window.graphicsEngine.timeManager.getCurrentDayPrecise();
    plant.advanceGrowthStage(currentDay);
    
    console.log(`✅ Plant advanced to: ${plant.stage}`);
    return plant;
};

// Quick test function - plants oak and cycles through all stages
window.testOakLifecycle = function() {
    console.log('%c=== AUTOMATED OAK LIFECYCLE TEST ===', 'color: #88cc88; font-size: 14px; font-weight: bold');
    
    // Clear any existing plants at center
    const centerX = 25, centerY = 25;
    const plants = window.graphicsEngine.plantManager.getPlantAt(centerX, centerY);
    const existing = plants.length > 0 ? plants[0] : null;
    if (existing) {
        window.graphicsEngine.plantManager.removePlant(centerX, centerY);
        console.log('Removed existing plant at center');
    }
    
    // Plant oak
    console.log('Step 1: Planting oak sapling...');
    const oak = window.plantOakAt(centerX, centerY);
    if (!oak) return;
    
    // Wait and advance through stages
    setTimeout(() => {
        console.log('Step 2: Advancing to YoungTree...');
        window.advancePlantAt(centerX, centerY);
        
        setTimeout(() => {
            console.log('Step 3: Advancing to MatureTree...');
            window.advancePlantAt(centerX, centerY);
            
            setTimeout(() => {
                console.log('Step 4: Advancing to Withered...');
                window.advancePlantAt(centerX, centerY);
                
                setTimeout(() => {
                    console.log('%c✅ Oak lifecycle test complete!', 'color: #4CAF50; font-weight: bold');
                    console.log('Check the game canvas to see the withered oak tree');
                }, 500);
            }, 500);
        }, 500);
    }, 500);
};

console.log('%cQuick Test Available:', 'color: #2196F3; font-weight: bold');
console.log('Call testOakLifecycle() to automatically test all oak stages');
console.log('');

console.log('%c=== SUMMARY ===', 'color: #88cc88; font-size: 14px; font-weight: bold');
console.log('Automated checks complete. Run testOakLifecycle() or follow manual test instructions above.');
console.log('Expected Results:');
console.log('  ✅ No species palette on screen');
console.log('  ✅ Both species loaded');
console.log('  ✅ All oak stages generate without errors');
console.log('  ✅ Context menu shows species selection');
console.log('  ✅ Can plant oak from context menu');
console.log('  ✅ Oak renders at 40x50px (larger than 20x20 nettles)');
console.log('');
