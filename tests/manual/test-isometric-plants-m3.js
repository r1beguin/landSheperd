/**
 * Manual test for Milestone 3 - Isometric Plant Positioning
 * Tests plant positioning on isometric tiles with depth sorting
 * 
 * USAGE:
 * 1. Open http://localhost:8081
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Observe plants rendering on isometric tiles
 * 
 * VALIDATION:
 * - Plants should be positioned on isometric diamond tiles
 * - Back plants should render before front plants (no popping)
 * - Layer system should work (bottom → middle → top)
 * - Overlapping plants at different depths should render correctly
 */

console.log('=== Milestone 3: Isometric Plant Positioning Test ===');

// Test 1: Spawn plants at different grid positions (depth test)
console.log('\n[TEST 1] Spawning plants at different depths...');
const plantManager = window.graphicsEngine.plantManager;
const soilManager = window.graphicsEngine.soilManager;

// Clear existing plants
console.log('Clearing existing plants...');
plantManager.plants.clear();

// Spawn test plants in a diagonal line (back to front)
const testPositions = [
    { x: 5, y: 5, species: 'trifolium_repens', layer: 'bottom', label: 'Clover (back-left)' },
    { x: 6, y: 5, species: 'urtica_dioica', layer: 'middle', label: 'Nettle (back-right)' },
    { x: 5, y: 6, species: 'urtica_dioica', layer: 'middle', label: 'Nettle (front-left)' },
    { x: 6, y: 6, species: 'quercus_robur', layer: 'top', label: 'Oak (front-right)' },
    { x: 10, y: 10, species: 'quercus_robur', layer: 'top', label: 'Oak (far back)' },
    { x: 11, y: 11, species: 'trifolium_repens', layer: 'bottom', label: 'Clover (far front)' }
];

testPositions.forEach(pos => {
    const plant = plantManager.addPlant(pos.x, pos.y, pos.species, 0);
    if (plant) {
        console.log(`✓ Spawned ${pos.label} at grid (${pos.x}, ${pos.y})`);
        console.log(`  - Grid coords: (${plant.gridX}, ${plant.gridY})`);
        console.log(`  - World coords: (${plant.x.toFixed(1)}, ${plant.y.toFixed(1)})`);
        console.log(`  - Z-order: ${IsometricUtils.getZOrder(plant.gridX, plant.gridY)}`);
        console.log(`  - Layer: ${plant.getLayer()}`);
    } else {
        console.error(`✗ Failed to spawn ${pos.label}`);
    }
});

// Test 2: Verify render data uses isometric coordinates
console.log('\n[TEST 2] Verifying isometric coordinate conversion...');
const testPlant = plantManager.getPlantAt(5, 5, 'bottom');
if (testPlant) {
    const renderData = testPlant.getRenderData();
    const isoConfig = window.config.world.rendering.isometric;
    const expectedIso = IsometricUtils.gridToIso(testPlant.gridX, testPlant.gridY, isoConfig.tileWidth, isoConfig.tileHeight);
    
    console.log(`Plant at grid (${testPlant.gridX}, ${testPlant.gridY}):`);
    console.log(`  - Expected isometric X: ${expectedIso.x}`);
    console.log(`  - Actual render X: ${renderData.x.toFixed(1)}`);
    console.log(`  - Expected isometric Y: ${expectedIso.y}`);
    console.log(`  - Actual render Y (before offset): ${(renderData.y + renderData.height).toFixed(1)}`);
    console.log(`  - Layer offset: ${window.config.world.plants.layers.renderOffsets[testPlant.getLayer()]}`);
    console.log(`  - Z-order: ${renderData.zOrder}`);
    
    const xMatch = Math.abs((renderData.x + renderData.width/2) - expectedIso.x) < 1;
    const yMatch = Math.abs((renderData.y + renderData.height) - (expectedIso.y + window.config.world.plants.layers.renderOffsets[testPlant.getLayer()])) < 1;
    
    if (xMatch && yMatch) {
        console.log('✓ Isometric conversion correct!');
    } else {
        console.error('✗ Isometric conversion mismatch!');
    }
}

// Test 3: Verify depth sorting configuration
console.log('\n[TEST 3] Verifying depth sorting configuration...');
const renderingConfig = window.config.world.rendering;
console.log(`Projection mode: ${renderingConfig.projection}`);
console.log(`Isometric tile width: ${renderingConfig.isometric.tileWidth}px`);
console.log(`Isometric tile height: ${renderingConfig.isometric.tileHeight}px`);
console.log(`Depth sorting enabled: ${renderingConfig.isometric.depthSortingEnabled}`);

if (renderingConfig.projection === 'isometric' && renderingConfig.isometric.depthSortingEnabled) {
    console.log('✓ Depth sorting properly configured');
} else {
    console.error('✗ Depth sorting not configured correctly');
}

// Test 4: Verify Z-order calculation
console.log('\n[TEST 4] Verifying Z-order calculations...');
const zOrderTests = [
    { x: 0, y: 0, expected: 0 },
    { x: 5, y: 5, expected: 10 },
    { x: 10, y: 10, expected: 20 },
    { x: 0, y: 10, expected: 10 },
    { x: 10, y: 0, expected: 10 }
];

zOrderTests.forEach(test => {
    const zOrder = IsometricUtils.getZOrder(test.x, test.y);
    const match = zOrder === test.expected;
    console.log(`${match ? '✓' : '✗'} Grid (${test.x}, ${test.y}) → Z-order ${zOrder} (expected ${test.expected})`);
});

// Test 5: Count plants and verify rendering
console.log('\n[TEST 5] Verifying plant count and rendering...');
const allPlants = plantManager.getAllPlants();
console.log(`Total plants spawned: ${allPlants.length}`);

// Group by layer
const byLayer = { bottom: 0, middle: 0, top: 0 };
allPlants.forEach(plant => {
    byLayer[plant.getLayer()]++;
});

console.log(`Plants per layer:`);
console.log(`  - Bottom: ${byLayer.bottom}`);
console.log(`  - Middle: ${byLayer.middle}`);
console.log(`  - Top: ${byLayer.top}`);

console.log('\n=== Test Complete ===');
console.log('VISUAL VALIDATION:');
console.log('1. Plants should be positioned on isometric diamond tiles');
console.log('2. Back plants (lower Z-order) should render first');
console.log('3. Front plants (higher Z-order) should render on top');
console.log('4. Layer system: bottom → middle → top within each depth');
console.log('5. No visual popping or incorrect overlaps');
console.log('\nPan camera around to verify depth sorting works correctly.');
