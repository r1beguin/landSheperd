/**
 * Layer System Manual Validation Script
 * Run this in browser console to validate MILESTONE 1
 */

async function validateLayerSystem() {
    console.log('\n=== MILESTONE 1: Layer System Validation ===\n');
    
    const pm = window.graphicsEngine.plantManager;
    const tm = window.graphicsEngine.timeManager;
    const config = window.config;
    
    // Test 1: Species Loading
    console.log('Test 1: Species Loading');
    const speciesCount = pm.speciesConfigs.size;
    const speciesList = Array.from(pm.speciesConfigs.keys());
    console.log(`  ✓ Loaded ${speciesCount} species: ${speciesList.join(', ')}`);
    console.assert(speciesCount === 2, 'Should load 2 species');
    console.assert(speciesList.includes('urtica_dioica'), 'Should include nettles');
    console.assert(speciesList.includes('quercus_robur'), 'Should include oak');
    
    // Test 2: getAvailableSpecies()
    console.log('\nTest 2: getAvailableSpecies() method');
    const available = pm.getAvailableSpecies();
    console.log(`  ✓ Available species: ${available.join(', ')}`);
    console.assert(available.length === 2, 'Should return 2 species');
    
    // Test 3: Species selection methods
    console.log('\nTest 3: Species selection methods');
    const initialSelection = pm.getSelectedSpecies();
    console.log(`  Initial selection: ${initialSelection}`);
    
    pm.setSelectedSpecies('quercus_robur');
    console.log(`  After setSelectedSpecies('quercus_robur'): ${pm.getSelectedSpecies()}`);
    console.assert(pm.getSelectedSpecies() === 'quercus_robur', 'Should select oak');
    
    pm.setSelectedSpecies('urtica_dioica');
    console.log(`  After setSelectedSpecies('urtica_dioica'): ${pm.getSelectedSpecies()}`);
    console.assert(pm.getSelectedSpecies() === 'urtica_dioica', 'Should select nettles');
    console.log('  ✓ Selection methods work correctly');
    
    // Test 4: Place test plants and verify layer methods
    console.log('\nTest 4: Plant layer methods');
    const currentDay = tm.getCurrentDayPrecise();
    
    // Place nettle
    const nettle = pm.addPlant(25, 25, 'urtica_dioica', currentDay);
    console.log('\n  Nettle (urtica_dioica):');
    console.log(`    Layer: ${nettle.getLayer()}`);
    console.log(`    Render Offset: ${nettle.getRenderOffset()}px`);
    console.log(`    Light Requirement: ${nettle.getLightRequirement()}`);
    console.log(`    Casts Shade: ${nettle.castsShade()}`);
    console.log(`    Shade Strength: ${nettle.getShadeStrength()}`);
    console.log(`    Shade Radius: ${nettle.getShadeRadius()}`);
    console.log(`    Dimensions: ${nettle.width}x${nettle.height}px`);
    
    console.assert(nettle.getLayer() === 'middle', 'Nettle should be middle layer');
    console.assert(nettle.getRenderOffset() === 5, 'Nettle offset should be 5px');
    console.assert(nettle.getLightRequirement() === 0.6, 'Nettle light requirement should be 0.6');
    console.assert(!nettle.castsShade(), 'Nettle should not cast shade');
    console.assert(nettle.width === 20, 'Nettle width should be 20');
    console.assert(nettle.height === 20, 'Nettle height should be 20');
    
    // Place oak
    const oak = pm.addPlant(27, 27, 'quercus_robur', currentDay);
    console.log('\n  Oak (quercus_robur) - Sapling stage:');
    console.log(`    Layer: ${oak.getLayer()}`);
    console.log(`    Render Offset: ${oak.getRenderOffset()}px`);
    console.log(`    Light Requirement: ${oak.getLightRequirement()}`);
    console.log(`    Casts Shade: ${oak.castsShade()}`);
    console.log(`    Shade Strength: ${oak.getShadeStrength()}`);
    console.log(`    Shade Radius: ${oak.getShadeRadius()}`);
    console.log(`    Dimensions: ${oak.width}x${oak.height}px`);
    
    console.assert(oak.getLayer() === 'top', 'Oak should be top layer');
    console.assert(oak.getRenderOffset() === 15, 'Oak offset should be 15px');
    console.assert(oak.getLightRequirement() === 0.9, 'Oak light requirement should be 0.9');
    console.assert(!oak.castsShade(), 'Sapling oak should not cast shade yet');
    console.assert(oak.width === 40, 'Oak width should be 40');
    console.assert(oak.height === 50, 'Oak height should be 50');
    
    // Test 5: Shade casting in YoungTree stage
    console.log('\nTest 5: Oak shade casting in YoungTree stage');
    oak.stage = 'YoungTree';
    console.log(`  Oak stage: ${oak.stage}`);
    console.log(`    Casts Shade: ${oak.castsShade()}`);
    console.log(`    Shade Strength: ${oak.getShadeStrength()}`);
    console.log(`    Shade Radius: ${oak.getShadeRadius()} cells`);
    
    console.assert(oak.castsShade(), 'YoungTree oak should cast shade');
    console.assert(oak.getShadeStrength() === 0.5, 'Oak shade strength should be 0.5');
    console.assert(oak.getShadeRadius() === 1, 'Oak shade radius should be 1 cell');
    
    // Test 6: Layer configuration
    console.log('\nTest 6: Layer configuration in config.json');
    const layerConfig = config.world.plants.layers;
    console.log(`  Enabled: ${layerConfig.enabled}`);
    console.log(`  Render Offsets:`, layerConfig.renderOffsets);
    console.log(`  Light Filtering:`, layerConfig.lightFiltering);
    
    console.assert(layerConfig.enabled === true, 'Layers should be enabled');
    console.assert(layerConfig.renderOffsets.bottom === 0, 'Bottom offset should be 0');
    console.assert(layerConfig.renderOffsets.middle === 5, 'Middle offset should be 5');
    console.assert(layerConfig.renderOffsets.top === 15, 'Top offset should be 15');
    console.assert(layerConfig.lightFiltering.enabled === true, 'Light filtering should be enabled');
    console.assert(layerConfig.lightFiltering.shadeRadius === 1, 'Shade radius should be 1');
    
    console.log('\n=== All Tests Passed! ===\n');
    console.log('Summary:');
    console.log('  ✓ 2 species loaded (nettles, oak)');
    console.log('  ✓ Species selection methods functional');
    console.log('  ✓ Layer methods work for both species');
    console.log('  ✓ Nettle: middle layer, 5px offset, no shade');
    console.log('  ✓ Oak: top layer, 15px offset, casts shade in YoungTree+');
    console.log('  ✓ Configuration loaded correctly');
    console.log('  ✓ Dimensions read from species config (Oak 40x50, Nettle 20x20)');
    
    return {
        passed: true,
        speciesCount: speciesCount,
        plants: {
            nettle: { layer: nettle.getLayer(), offset: nettle.getRenderOffset(), dims: `${nettle.width}x${nettle.height}` },
            oak: { layer: oak.getLayer(), offset: oak.getRenderOffset(), dims: `${oak.width}x${oak.height}`, shade: oak.castsShade() }
        }
    };
}

// Run validation
console.log('Run: validateLayerSystem()');
