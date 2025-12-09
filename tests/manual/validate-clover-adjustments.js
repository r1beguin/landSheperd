// Manual validation script for clover adjustments
// Run in browser console after loading Land Shepherd

console.log('🧪 CLOVER ADJUSTMENTS VALIDATION\n');

// ADJUSTMENT 1: Weathering Rates
console.log('═══ Adjustment 1: Weathering Rates ═══');
const weathering = window.config.world.soil.weathering.baseRatePerDay;
console.log('Phosphorus rate:', weathering.phosphorus, '(expected: 0.02)');
console.log('Potassium rate:', weathering.potassium, '(expected: 0.02)');
console.log('Status:', weathering.phosphorus === 0.02 && weathering.potassium === 0.02 ? '✅ PASS' : '❌ FAIL');

// ADJUSTMENT 2: Faster Death (Grace Period)
console.log('\n═══ Adjustment 2: Faster Death ═══');
const cloverConfig = window.graphicsEngine.plantManager.speciesConfigs.get('trifolium_repens');
const floweringStage = cloverConfig.growthStages.find(s => s.name === 'Flowering');
const gracePeriod = floweringStage.starvation?.gracePeriod;
console.log('Flowering stage grace period:', gracePeriod, '(expected: 2)');
console.log('Status:', gracePeriod === 2 ? '✅ PASS' : '❌ FAIL');

// Functional test
console.log('\nFunctional test: Spawning clover on depleted soil...');
window.graphicsEngine.plantManager.plants.clear();
const testSoil = window.graphicsEngine.soilManager.getSoilAt(25, 25);
testSoil.updateNutrients(0, 0, 0, 10);
window.graphicsEngine.plantManager.spawnPlantAt(25, 25, 'trifolium_repens');
console.log('Clover spawned. Advancing 3 game days...');
window.graphicsEngine.timeManager.advanceGameDays(3);
const testPlants = window.graphicsEngine.plantManager.getPlantAt(25, 25);
const deathResult = testPlants.length === 0 ? 'dead (removed)' : testPlants[0].stage;
console.log('Result after 3 days:', deathResult);
console.log('Status:', ['dead (removed)', 'Withered'].includes(deathResult) ? '✅ PASS - Died within grace period' : '❌ FAIL - Still alive');

// ADJUSTMENT 3: Withered Sprite
console.log('\n═══ Adjustment 3: Withered Sprite ═══');
const witheredStage = cloverConfig.growthStages.find(s => s.name === 'Withered');
const generator = witheredStage.generator;
console.log('Withered stage generator:', generator, '(expected: cloverWitheredGeneration)');
console.log('Status:', generator === 'cloverWitheredGeneration' ? '✅ PASS' : '❌ FAIL');

// Visual test
console.log('\nVisual test: Spawning withered clover...');
window.graphicsEngine.plantManager.plants.clear();
const visualSoil = window.graphicsEngine.soilManager.getSoilAt(25, 25);
visualSoil.updateNutrients(50, 50, 50, 50);
window.graphicsEngine.plantManager.spawnPlantAt(25, 25, 'trifolium_repens');
const visualPlants = window.graphicsEngine.plantManager.getPlantAt(25, 25);
if (visualPlants.length > 0) {
    visualPlants[0].forceWither(window.graphicsEngine.timeManager.getCurrentGameDay());
    console.log('Clover forced to withered stage');
    console.log('Look at center of screen - should see brown 3-leaf clover pattern');
    window.graphicsEngine.cameraManager.setZoom(3.0);
    window.graphicsEngine.cameraManager.centerOn(25 * 20, 25 * 20);
}

console.log('\n📊 VALIDATION COMPLETE - Check visual sprite manually');
