/**
 * Manual Test Script: LOD Generator Dimension Verification
 * 
 * Purpose: Verify that generators produce sprites with different dimensions at each LOD level
 * 
 * Instructions:
 * 1. Open index.html in browser (or use test-lod-switching.html)
 * 2. Wait for page to fully load
 * 3. Open browser console
 * 4. Copy and paste this entire script into console
 * 5. Press Enter to execute
 * 
 * Expected Results:
 * - High LOD: 80x100px (2x medium)
 * - Medium LOD: 40x50px (baseline)
 * - Low LOD: 20x25px (0.5x medium)
 * - Impostor LOD: 4x4px (tiny billboard)
 */

console.log('=== LOD Generator Dimension Test ===');
console.log('Testing TreeGenerator with oak species config...\n');

// Get oak config
const oakConfig = window.graphicsEngine?.plantManager?.speciesConfigs?.get('quercus_robur');

if (!oakConfig) {
    console.error('ERROR: Oak config not found. Make sure page is fully loaded.');
    console.log('Available species:', window.graphicsEngine?.plantManager?.getAvailableSpecies());
} else {
    console.log('Oak config loaded:', oakConfig.name);
    console.log('Base dimensions:', oakConfig.appearance.dimensions);
    console.log('');
    
    // Test each LOD level
    const lodLevels = ['high', 'medium', 'low', 'impostor'];
    const results = {};
    
    for (const lod of lodLevels) {
        console.log(`Testing LOD: ${lod}`);
        
        try {
            // Generate MatureTree sprite at this LOD level
            const sprite = TreeGenerator.generateMatureTree(oakConfig, null, lod);
            
            results[lod] = {
                width: sprite.width,
                height: sprite.height,
                success: true
            };
            
            console.log(`  Generated sprite: ${sprite.width}x${sprite.height}px`);
            console.log(`  Canvas element:`, sprite);
        } catch (error) {
            results[lod] = {
                success: false,
                error: error.message
            };
            console.error(`  ERROR: ${error.message}`);
        }
        
        console.log('');
    }
    
    // Summary
    console.log('=== RESULTS SUMMARY ===');
    console.log('LOD Level    | Dimensions    | Status');
    console.log('-------------|---------------|--------');
    
    for (const lod of lodLevels) {
        const result = results[lod];
        if (result.success) {
            const dims = `${result.width}x${result.height}px`;
            console.log(`${lod.padEnd(12)} | ${dims.padEnd(13)} | OK`);
        } else {
            console.log(`${lod.padEnd(12)} | N/A           | FAILED: ${result.error}`);
        }
    }
    
    console.log('');
    
    // Validation
    console.log('=== VALIDATION ===');
    
    const expectedDimensions = {
        high: { width: 100, height: 150 }, // 2x medium (50x75 * 2)
        medium: { width: 50, height: 75 }, // Baseline (mature tree is 1.5x height multiplier)
        low: { width: 25, height: 37 },    // 0.5x medium (should be ~37-38px)
        impostor: { width: 4, height: 4 }  // Fixed 4x4
    };
    
    let allPassed = true;
    
    for (const lod of lodLevels) {
        const result = results[lod];
        const expected = expectedDimensions[lod];
        
        if (!result.success) {
            console.log(`${lod}: FAILED (generation error)`);
            allPassed = false;
            continue;
        }
        
        // Allow ±2px tolerance for rounding
        const widthMatch = Math.abs(result.width - expected.width) <= 2;
        const heightMatch = Math.abs(result.height - expected.height) <= 2;
        
        if (widthMatch && heightMatch) {
            console.log(`${lod}: PASS (${result.width}x${result.height} matches expected ${expected.width}x${expected.height})`);
        } else {
            console.log(`${lod}: FAIL (${result.width}x${result.height} does NOT match expected ${expected.width}x${expected.height})`);
            allPassed = false;
        }
    }
    
    console.log('');
    
    if (allPassed) {
        console.log('=== ALL TESTS PASSED ===');
        console.log('Generators are producing correct dimensions for each LOD level.');
    } else {
        console.log('=== SOME TESTS FAILED ===');
        console.log('Generators are NOT producing expected dimensions.');
    }
}

console.log('');
console.log('Next steps:');
console.log('1. If tests pass: Zoom in/out with scroll wheel to check if visual changes occur');
console.log('2. If tests fail: Check BaseGenerator.getLODMultiplier() and applyLODDimensions()');
console.log('3. Open test-lod-switching.html for live LOD monitoring');
