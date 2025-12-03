/**
 * Manual Test: Oak Proximity Reproduction (Milestone 4)
 * 
 * Run this via: node tests/manual/test-oak-proximity-milestone4.js
 * 
 * Tests:
 * 1. Two mature oaks within 3 cells spawn offspring
 * 2. Isolated oak does NOT reproduce
 * 3. Poor soil prevents reproduction
 * 4. Young oaks do NOT reproduce
 * 5. Generation counter increments correctly
 */

console.log('='.repeat(60));
console.log('OAK PROXIMITY REPRODUCTION TEST (Milestone 4)');
console.log('='.repeat(60));
console.log('\nTo test proximity reproduction:');
console.log('\n1. Start the application:');
console.log('   npm start (or open index.html via Live Server)');
console.log('\n2. Open browser console (F12)');
console.log('\n3. Run test scenarios below in console');
console.log('\n' + '='.repeat(60));

console.log('\n\n--- TEST SCENARIO 1: Successful Reproduction ---');
console.log('Copy and paste into browser console:\n');
console.log(`
// Enable reproduction logging
window.config.world.plants.reproduction.enableLogging = true;

// Get managers
const pm = window.graphicsEngine.plantManager;
const tm = window.graphicsEngine.timeManager;
const currentDay = tm.getCurrentDayPrecise();

// Clear existing plants
pm.plants.clear();

// Spawn 2 mature oaks within 3 cells
const oak1 = pm.addPlant(0, 0, 'quercus_robur', currentDay);
oak1.stage = 'MatureTree';
oak1.age = 50;
oak1.lastReproductionDay = currentDay - 15;
oak1.generateSprite();

const oak2 = pm.addPlant(2, 0, 'quercus_robur', currentDay);
oak2.stage = 'MatureTree';
oak2.age = 50;
oak2.lastReproductionDay = currentDay - 15;
oak2.generateSprite();

console.log('✓ Spawned 2 mature oaks 2 cells apart');
console.log('Oak 1 position:', oak1.x, oak1.y, 'Gen', oak1.genetics.generation);
console.log('Oak 2 position:', oak2.x, oak2.y, 'Gen', oak2.genetics.generation);

// Speed up time and wait for reproduction
tm.setTimeScale(20);
console.log('⏱ Time accelerated (20x). Wait for reproduction...');
console.log('Expected: "Oak reproduction: Gen X sapling at (...)" within 30-60 seconds');
`);

console.log('\n--- TEST SCENARIO 2: Isolation (No Reproduction) ---');
console.log('Copy and paste into browser console:\n');
console.log(`
// Clear and spawn single oak
pm.plants.clear();

const oak = pm.addPlant(0, 0, 'quercus_robur', tm.getCurrentDayPrecise());
oak.stage = 'MatureTree';
oak.age = 50;
oak.lastReproductionDay = tm.getCurrentDayPrecise() - 15;
oak.generateSprite();

console.log('✓ Spawned 1 isolated mature oak');
tm.setTimeScale(20);
console.log('⏱ Time accelerated. Wait 60 seconds...');
console.log('Expected: NO reproduction (no partner within 3 cells)');
`);

console.log('\n--- TEST SCENARIO 3: Poor Soil Prevents Reproduction ---');
console.log('Copy and paste into browser console:\n');
console.log(`
// Clear and spawn 2 oaks
pm.plants.clear();
const sm = window.graphicsEngine.soilManager;
const currentDay2 = tm.getCurrentDayPrecise();

const oak3 = pm.addPlant(0, 0, 'quercus_robur', currentDay2);
oak3.stage = 'MatureTree';
oak3.age = 50;
oak3.lastReproductionDay = currentDay2 - 15;
oak3.generateSprite();

const oak4 = pm.addPlant(2, 0, 'quercus_robur', currentDay2);
oak4.stage = 'MatureTree';
oak4.age = 50;
oak4.lastReproductionDay = currentDay2 - 15;
oak4.generateSprite();

// Deplete soil nutrients (oak minimums: N=30, P=20, K=20, OM=15)
for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
        const soil = sm.getSoilAt(dx, dy);
        if (soil) {
            soil.nitrogen = 10;
            soil.phosphorus = 10;
            soil.potassium = 10;
            soil.organicMatter = 5;
            sm.recalculateFertility(soil);
        }
    }
}

console.log('✓ Spawned 2 mature oaks in depleted soil');
console.log('Soil N: 10 (min: 30), P: 10 (min: 20), K: 10 (min: 20), OM: 5 (min: 15)');
tm.setTimeScale(20);
console.log('⏱ Time accelerated. Wait 60 seconds...');
console.log('Expected: NO reproduction (soil below minimums)');
`);

console.log('\n--- TEST SCENARIO 4: Young Oaks Cannot Reproduce ---');
console.log('Copy and paste into browser console:\n');
console.log(`
// Clear and spawn 2 young oaks
pm.plants.clear();

const oak5 = pm.addPlant(0, 0, 'quercus_robur', tm.getCurrentDayPrecise());
oak5.stage = 'YoungTree';
oak5.age = 15;
oak5.lastReproductionDay = tm.getCurrentDayPrecise() - 15;
oak5.generateSprite();

const oak6 = pm.addPlant(2, 0, 'quercus_robur', tm.getCurrentDayPrecise());
oak6.stage = 'YoungTree';
oak6.age = 15;
oak6.lastReproductionDay = tm.getCurrentDayPrecise() - 15;
oak6.generateSprite();

console.log('✓ Spawned 2 young oaks (not mature)');
console.log('Stage:', oak5.stage, '(reproduction requires: MatureTree)');
tm.setTimeScale(20);
console.log('⏱ Time accelerated. Wait 60 seconds...');
console.log('Expected: NO reproduction (not in MatureTree stage)');
`);

console.log('\n--- TEST SCENARIO 5: Generation Counter Increments ---');
console.log('Copy and paste into browser console:\n');
console.log(`
// Clear and spawn 2 mature oaks with different generations
pm.plants.clear();

const oak7 = pm.addPlant(0, 0, 'quercus_robur', tm.getCurrentDayPrecise());
oak7.stage = 'MatureTree';
oak7.age = 50;
oak7.lastReproductionDay = tm.getCurrentDayPrecise() - 15;
oak7.genetics.generation = 0;
oak7.generateSprite();

const oak8 = pm.addPlant(2, 0, 'quercus_robur', tm.getCurrentDayPrecise());
oak8.stage = 'MatureTree';
oak8.age = 50;
oak8.lastReproductionDay = tm.getCurrentDayPrecise() - 15;
oak8.genetics.generation = 1;
oak8.generateSprite();

console.log('✓ Spawned oak (Gen 0) and oak (Gen 1)');
console.log('Oak 1 Gen:', oak7.genetics.generation);
console.log('Oak 2 Gen:', oak8.genetics.generation);
console.log('Expected offspring Gen: max(0, 1) + 1 = 2');
tm.setTimeScale(20);
console.log('⏱ Time accelerated. Wait for reproduction...');
console.log('Expected: "Oak reproduction: Gen 2 sapling at (...)"');
`);

console.log('\n' + '='.repeat(60));
console.log('VALIDATION CHECKLIST');
console.log('='.repeat(60));
console.log('✓ Scenario 1: Two mature oaks produce offspring');
console.log('✓ Scenario 2: Isolated oak does NOT reproduce');
console.log('✓ Scenario 3: Poor soil prevents reproduction');
console.log('✓ Scenario 4: Young oaks do NOT reproduce');
console.log('✓ Scenario 5: Generation counter increments correctly');
console.log('='.repeat(60));
