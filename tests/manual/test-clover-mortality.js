/**
 * Manual Test Script for Clover Mortality
 * 
 * Open index.html in browser, then run these commands in the console:
 */

// TEST 1: Spawn clover and fast-forward to maxAge (365 days)
console.log('=== TEST 1: MaxAge Mortality ===');

// Spawn clover field
for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
        window.graphicsEngine.plantManager.spawnPlantAt(25 + dx, 25 + dy, 'trifolium_repens');
    }
}
console.log(`Spawned ${window.graphicsEngine.plantManager.plants.size} clover plants`);

// Check initial state
let soil = window.graphicsEngine.soilManager.getSoilAtWorld(25, 25);
console.log(`Day 0 - Soil: N:${soil.nitrogen.toFixed(1)} P:${soil.phosphorus.toFixed(1)} K:${soil.potassium.toFixed(1)} OM:${soil.organicMatter.toFixed(1)}`);

// Fast-forward to day 360
console.log('Fast-forwarding to day 360...');
window.graphicsEngine.timeManager.advanceGameDays(360);

let plants = Array.from(window.graphicsEngine.plantManager.plants.values());
let centerPlant = plants.find(p => Math.abs(p.x - 25) < 1 && Math.abs(p.y - 25) < 1);
console.log(`Day 360 - Plant count: ${plants.length}, Center plant age: ${centerPlant?.age.toFixed(1)}, stage: ${centerPlant?.stage}`);

soil = window.graphicsEngine.soilManager.getSoilAtWorld(25, 25);
console.log(`Day 360 - Soil: N:${soil.nitrogen.toFixed(1)} P:${soil.phosphorus.toFixed(1)} K:${soil.potassium.toFixed(1)} OM:${soil.organicMatter.toFixed(1)}`);

// Fast-forward to day 370 (past maxAge)
console.log('Fast-forwarding to day 370...');
window.graphicsEngine.timeManager.advanceGameDays(10);

plants = Array.from(window.graphicsEngine.plantManager.plants.values());
let witheredCount = plants.filter(p => p.stage === 'Withered').length;
console.log(`Day 370 - Plant count: ${plants.length}, Withered count: ${witheredCount}`);

soil = window.graphicsEngine.soilManager.getSoilAtWorld(25, 25);
console.log(`Day 370 - Soil: N:${soil.nitrogen.toFixed(1)} P:${soil.phosphorus.toFixed(1)} K:${soil.potassium.toFixed(1)} OM:${soil.organicMatter.toFixed(1)}`);

if (witheredCount > 0) {
    console.log('✅ TEST 1 PASSED - Clover withered after maxAge (365 days)');
} else {
    console.log('❌ TEST 1 FAILED - Clover did not wither');
}

// TEST 2: Zero-fertility death
console.log('\n=== TEST 2: Zero-Fertility Death ===');

// Reload page first, then run:
// Create barren soil
let barrensrc = window.graphicsEngine.soilManager.getSoilAtWorld(30, 30);
if (barrensrc && barrensrc.nutrientLayers) {
    barrensrc.updateNutrientsLayered('surface', 0.5, 0.5, 0.5, 5);
    barrensrc.updateNutrientsLayered('deep', 0.0, 0.0, 0.0, 0);
    console.log(`Created barren soil at (30,30): Surface N:${barrensrc.nutrientLayers.surface.nitrogen.toFixed(1)} P:${barrensrc.nutrientLayers.surface.phosphorus.toFixed(1)} K:${barrensrc.nutrientLayers.surface.potassium.toFixed(1)}`);
}

// Spawn clover on barren soil
window.graphicsEngine.plantManager.spawnPlantAt(30, 30, 'trifolium_repens');
console.log('Spawned clover on barren soil');

// Fast-forward 2 days (should deplete and die)
window.graphicsEngine.timeManager.advanceGameDays(2);

plants = Array.from(window.graphicsEngine.plantManager.plants.values());
let barrenClover = plants.find(p => Math.abs(p.x - 30) < 1 && Math.abs(p.y - 30) < 1);
console.log(`Day 2 - Clover stage: ${barrenClover?.stage || 'despawned'}, age: ${barrenClover?.age.toFixed(1) || 'N/A'}`);

if (barrenClover?.stage === 'Withered' || !barrenClover) {
    console.log('✅ TEST 2 PASSED - Clover died from zero-fertility');
} else {
    console.log('❌ TEST 2 FAILED - Clover survived zero-fertility');
}

// TEST 3: Weathering rates check
console.log('\n=== TEST 3: Weathering Rate Validation ===');

// Check config
const weatheringConfig = window.config.world.soil.weathering;
const consumptionConfig = window.config.world.plants.dailyNutrientConsumption;
console.log(`Weathering rates: P:${weatheringConfig.baseRatePerDay.phosphorus}/day, K:${weatheringConfig.baseRatePerDay.potassium}/day`);
console.log(`Base consumption: P:${consumptionConfig.baseDailyRate.phosphorus}/day, K:${consumptionConfig.baseDailyRate.potassium}/day`);
console.log(`Flowering multiplier: ${consumptionConfig.stageMultipliers.Flowering}x`);

const actualPConsumption = consumptionConfig.baseDailyRate.phosphorus * consumptionConfig.stageMultipliers.Flowering;
const actualKConsumption = consumptionConfig.baseDailyRate.potassium * consumptionConfig.stageMultipliers.Flowering;
console.log(`Actual clover consumption: P:${actualPConsumption.toFixed(2)}/day, K:${actualKConsumption.toFixed(2)}/day`);

const pBalance = weatheringConfig.baseRatePerDay.phosphorus - actualPConsumption;
const kBalance = weatheringConfig.baseRatePerDay.potassium - actualKConsumption;
console.log(`Net balance: P:${pBalance > 0 ? '+' : ''}${pBalance.toFixed(2)}/day, K:${kBalance > 0 ? '+' : ''}${kBalance.toFixed(2)}/day`);

if (pBalance >= 0 && kBalance >= 0) {
    console.log('✅ TEST 3 PASSED - Weathering rates match/exceed consumption');
} else {
    console.log('❌ TEST 3 FAILED - Weathering rates insufficient');
}

console.log('\n=== ALL TESTS COMPLETE ===');
