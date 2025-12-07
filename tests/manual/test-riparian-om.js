/**
 * Manual Test: Riparian Organic Matter Accumulation (Milestone 4)
 * 
 * Validates that organic matter accumulates in riparian zones near water bodies
 * due to reduced decay rates (0.5x) and continuous aquatic OM input (0.3/day).
 * 
 * Expected behavior:
 * - Riparian zones (≤2 cells from water) accumulate OM over time
 * - Non-riparian zones (>2 cells from water) experience normal decay
 * - After 14+ days: visible darkening of soil near water edges
 * - OM difference increases progressively between riparian and non-riparian zones
 */

// Test configuration
const TEST_CONFIG = {
    RIPARIAN_RADIUS: 2,
    MIN_DAYS_FOR_VALIDATION: 14,
    EXPECTED_RIPARIAN_GAIN: 2.0, // Minimum OM gain in riparian zones after 14 days
    EXPECTED_NON_RIPARIAN_GAIN: 1.0, // Maximum OM gain in non-riparian zones
    SAMPLE_COUNT: 10, // Number of samples to take per zone type
};

// Test state
let testState = {
    startDay: 0,
    baselineSamples: {
        riparian: [],
        nonRiparian: []
    },
    currentSamples: {
        riparian: [],
        nonRiparian: []
    }
};

/**
 * Initialize test
 */
function initTest() {
    console.log('=== RIPARIAN OM ACCUMULATION TEST (MILESTONE 4) ===');
    console.log('Initializing test...');
    
    const engine = window.graphicsEngine;
    if (!engine) {
        console.error('❌ GraphicsEngine not found');
        return false;
    }
    
    // Verify riparian config is enabled
    const riparianConfig = engine.config?.world?.soil?.decomposition?.riparianZone;
    if (!riparianConfig || !riparianConfig.enabled) {
        console.error('❌ Riparian zone configuration not enabled');
        return false;
    }
    
    console.log('✓ Riparian zone configuration:');
    console.log(`  - Enabled: ${riparianConfig.enabled}`);
    console.log(`  - Radius: ${riparianConfig.radius} cells`);
    console.log(`  - Decay multiplier: ${riparianConfig.decayMultiplier}x`);
    console.log(`  - OM input: ${riparianConfig.organicInputPerDay}/day`);
    
    // Verify water tiles exist
    const terrainGen = engine.soilManager?.terrainGenerator;
    const waterTiles = terrainGen?.getWaterTiles();
    
    if (!waterTiles || waterTiles.size === 0) {
        console.error('❌ No water tiles found on map');
        return false;
    }
    
    console.log(`✓ Found ${waterTiles.size} water tiles`);
    
    // Record start day
    testState.startDay = engine.timeManager.getElapsedGameDays();
    console.log(`✓ Test start day: ${testState.startDay.toFixed(1)}`);
    
    return true;
}

/**
 * Sample riparian and non-riparian zones
 */
function sampleZones() {
    const engine = window.graphicsEngine;
    const soilManager = engine.soilManager;
    const terrainGen = soilManager.terrainGenerator;
    const waterTiles = terrainGen.getWaterTiles();
    
    console.log('Sampling riparian and non-riparian zones...');
    
    const riparianSamples = [];
    const nonRiparianSamples = [];
    
    // Get a random water tile as reference point
    const waterArray = Array.from(waterTiles);
    const randomWater = waterArray[Math.floor(Math.random() * waterArray.length)];
    const [waterX, waterY] = randomWater.split(',').map(Number);
    
    console.log(`Reference water tile: (${waterX}, ${waterY})`);
    
    // Sample in a grid around the water tile
    const sampleRadius = 10;
    let riparianCount = 0;
    let nonRiparianCount = 0;
    
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
        for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
            if (dx === 0 && dy === 0) continue; // Skip water tile itself
            
            const sampleX = waterX + dx;
            const sampleY = waterY + dy;
            const soil = soilManager.getSoilAt(sampleX, sampleY);
            
            if (!soil || soil.isWater || !soil.isPlantable) continue;
            
            // Calculate distance from water
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Skip if too far
            if (distance > sampleRadius) continue;
            
            // Determine if riparian zone
            const isRiparian = distance <= TEST_CONFIG.RIPARIAN_RADIUS;
            
            const sample = {
                x: sampleX,
                y: sampleY,
                distance: distance,
                om: soil.organicMatter || 0,
                nitrogen: soil.nitrogen || 0,
                fertility: soil.fertility || 0
            };
            
            if (isRiparian && riparianCount < TEST_CONFIG.SAMPLE_COUNT) {
                riparianSamples.push(sample);
                riparianCount++;
            } else if (!isRiparian && nonRiparianCount < TEST_CONFIG.SAMPLE_COUNT) {
                nonRiparianSamples.push(sample);
                nonRiparianCount++;
            }
            
            // Stop if we have enough samples
            if (riparianCount >= TEST_CONFIG.SAMPLE_COUNT && nonRiparianCount >= TEST_CONFIG.SAMPLE_COUNT) {
                break;
            }
        }
        
        if (riparianCount >= TEST_CONFIG.SAMPLE_COUNT && nonRiparianCount >= TEST_CONFIG.SAMPLE_COUNT) {
            break;
        }
    }
    
    console.log(`✓ Sampled ${riparianCount} riparian cells, ${nonRiparianCount} non-riparian cells`);
    
    return { riparian: riparianSamples, nonRiparian: nonRiparianSamples };
}

/**
 * Calculate average OM for samples
 */
function calculateAverageOM(samples) {
    if (samples.length === 0) return 0;
    const sum = samples.reduce((acc, s) => acc + s.om, 0);
    return sum / samples.length;
}

/**
 * Record baseline samples
 */
function recordBaseline() {
    console.log('Recording baseline samples...');
    
    const samples = sampleZones();
    testState.baselineSamples = samples;
    
    const riparianAvg = calculateAverageOM(samples.riparian);
    const nonRiparianAvg = calculateAverageOM(samples.nonRiparian);
    
    console.log(`✓ Baseline riparian OM avg: ${riparianAvg.toFixed(2)}`);
    console.log(`✓ Baseline non-riparian OM avg: ${nonRiparianAvg.toFixed(2)}`);
    console.log(`✓ Baseline difference: ${(riparianAvg - nonRiparianAvg).toFixed(2)}`);
    
    return true;
}

/**
 * Run validation checks
 */
function validateResults() {
    console.log('\n=== VALIDATION RESULTS ===');
    
    const engine = window.graphicsEngine;
    const currentDay = engine.timeManager.getElapsedGameDays();
    const daysSinceStart = currentDay - testState.startDay;
    
    console.log(`Days elapsed: ${daysSinceStart.toFixed(1)}`);
    
    if (daysSinceStart < TEST_CONFIG.MIN_DAYS_FOR_VALIDATION) {
        console.log(`⚠ Not enough time elapsed (need ${TEST_CONFIG.MIN_DAYS_FOR_VALIDATION}+ days)`);
        return false;
    }
    
    // Sample current state
    console.log('Sampling current state...');
    const currentSamples = sampleZones();
    testState.currentSamples = currentSamples;
    
    // Calculate averages
    const baselineRiparianAvg = calculateAverageOM(testState.baselineSamples.riparian);
    const baselineNonRiparianAvg = calculateAverageOM(testState.baselineSamples.nonRiparian);
    const currentRiparianAvg = calculateAverageOM(currentSamples.riparian);
    const currentNonRiparianAvg = calculateAverageOM(currentSamples.nonRiparian);
    
    // Calculate changes
    const riparianChange = currentRiparianAvg - baselineRiparianAvg;
    const nonRiparianChange = currentNonRiparianAvg - baselineNonRiparianAvg;
    const differenceChange = (currentRiparianAvg - currentNonRiparianAvg) - (baselineRiparianAvg - baselineNonRiparianAvg);
    
    console.log('\nMETRICS:');
    console.log(`Riparian OM change: ${riparianChange >= 0 ? '+' : ''}${riparianChange.toFixed(2)}`);
    console.log(`Non-riparian OM change: ${nonRiparianChange >= 0 ? '+' : ''}${nonRiparianChange.toFixed(2)}`);
    console.log(`Difference change: ${differenceChange >= 0 ? '+' : ''}${differenceChange.toFixed(2)}`);
    
    // Validation checks
    const checks = [
        {
            name: 'Time Elapsed',
            condition: daysSinceStart >= TEST_CONFIG.MIN_DAYS_FOR_VALIDATION,
            result: daysSinceStart >= TEST_CONFIG.MIN_DAYS_FOR_VALIDATION,
            message: `${daysSinceStart.toFixed(1)} days (need ${TEST_CONFIG.MIN_DAYS_FOR_VALIDATION}+)`
        },
        {
            name: 'Riparian OM Accumulation',
            condition: riparianChange >= TEST_CONFIG.EXPECTED_RIPARIAN_GAIN,
            result: riparianChange >= TEST_CONFIG.EXPECTED_RIPARIAN_GAIN,
            message: `${riparianChange >= 0 ? '+' : ''}${riparianChange.toFixed(2)} OM gain (expected ≥${TEST_CONFIG.EXPECTED_RIPARIAN_GAIN})`
        },
        {
            name: 'Non-Riparian Limited Change',
            condition: nonRiparianChange <= TEST_CONFIG.EXPECTED_NON_RIPARIAN_GAIN,
            result: nonRiparianChange <= TEST_CONFIG.EXPECTED_NON_RIPARIAN_GAIN,
            message: `${nonRiparianChange >= 0 ? '+' : ''}${nonRiparianChange.toFixed(2)} OM change (expected ≤${TEST_CONFIG.EXPECTED_NON_RIPARIAN_GAIN})`
        },
        {
            name: 'Riparian > Non-Riparian',
            condition: currentRiparianAvg > currentNonRiparianAvg,
            result: currentRiparianAvg > currentNonRiparianAvg,
            message: `Riparian ${currentRiparianAvg.toFixed(2)} ${currentRiparianAvg > currentNonRiparianAvg ? '>' : '<='} Non-riparian ${currentNonRiparianAvg.toFixed(2)}`
        },
        {
            name: 'Difference Increased',
            condition: differenceChange > 0,
            result: differenceChange > 0,
            message: `Difference increased by ${differenceChange.toFixed(2)} OM`
        }
    ];
    
    console.log('\nVALIDATION CHECKS:');
    let allPassed = true;
    
    checks.forEach(check => {
        const status = check.result ? '✓ PASS' : '✗ FAIL';
        console.log(`${status} - ${check.name}: ${check.message}`);
        if (!check.result) allPassed = false;
    });
    
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
        console.log('✅ ALL VALIDATION CHECKS PASSED');
        console.log('Riparian OM accumulation working as expected!');
    } else {
        console.log('❌ SOME VALIDATION CHECKS FAILED');
        console.log('Review the results above for details.');
    }
    console.log('='.repeat(50) + '\n');
    
    return allPassed;
}

/**
 * Run complete test
 */
async function runCompleteTest() {
    console.log('Starting complete riparian OM test...\n');
    
    // Initialize
    if (!initTest()) {
        console.error('Test initialization failed');
        return false;
    }
    
    // Record baseline
    if (!recordBaseline()) {
        console.error('Failed to record baseline');
        return false;
    }
    
    // Set time scale to veryFast
    const engine = window.graphicsEngine;
    engine.timeManager.setTimeScale(5.0);
    console.log('✓ Time scale set to 5.0x (veryFast)\n');
    
    // Calculate wait time for 14 days
    const realSecondsPerGameDay = engine.timeManager.config.realSecondsPerGameDay;
    const daysToWait = TEST_CONFIG.MIN_DAYS_FOR_VALIDATION;
    const secondsToWait = (daysToWait * realSecondsPerGameDay) / engine.timeManager.timeScale;
    
    console.log(`Waiting ${secondsToWait.toFixed(1)} seconds for ${daysToWait} game days to elapse...`);
    console.log('(You can manually sample progress using sampleZones() in console)\n');
    
    // Wait for time to pass
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Time elapsed. Running validation...\n');
            const passed = validateResults();
            resolve(passed);
        }, secondsToWait * 1000);
    });
}

/**
 * Quick check (use after test is already running)
 */
function quickCheck() {
    if (testState.baselineSamples.riparian.length === 0) {
        console.log('No baseline recorded. Run initTest() and recordBaseline() first.');
        return;
    }
    
    console.log('\n=== QUICK CHECK ===');
    
    const engine = window.graphicsEngine;
    const currentDay = engine.timeManager.getElapsedGameDays();
    const daysSinceStart = currentDay - testState.startDay;
    
    console.log(`Days since start: ${daysSinceStart.toFixed(1)}`);
    
    const currentSamples = sampleZones();
    
    const baselineRiparianAvg = calculateAverageOM(testState.baselineSamples.riparian);
    const baselineNonRiparianAvg = calculateAverageOM(testState.baselineSamples.nonRiparian);
    const currentRiparianAvg = calculateAverageOM(currentSamples.riparian);
    const currentNonRiparianAvg = calculateAverageOM(currentSamples.nonRiparian);
    
    const riparianChange = currentRiparianAvg - baselineRiparianAvg;
    const nonRiparianChange = currentNonRiparianAvg - baselineNonRiparianAvg;
    
    console.log(`Riparian OM: ${baselineRiparianAvg.toFixed(2)} → ${currentRiparianAvg.toFixed(2)} (${riparianChange >= 0 ? '+' : ''}${riparianChange.toFixed(2)})`);
    console.log(`Non-riparian OM: ${baselineNonRiparianAvg.toFixed(2)} → ${currentNonRiparianAvg.toFixed(2)} (${nonRiparianChange >= 0 ? '+' : ''}${nonRiparianChange.toFixed(2)})`);
    console.log(`Difference: ${(currentRiparianAvg - currentNonRiparianAvg).toFixed(2)} OM\n`);
}

// Export functions to global scope for console access
window.riparianTest = {
    init: initTest,
    recordBaseline: recordBaseline,
    sample: sampleZones,
    validate: validateResults,
    runComplete: runCompleteTest,
    quickCheck: quickCheck
};

console.log('Riparian OM test loaded. Available commands:');
console.log('  riparianTest.runComplete() - Run full automated test (waits 14 days)');
console.log('  riparianTest.init() - Initialize test');
console.log('  riparianTest.recordBaseline() - Record baseline samples');
console.log('  riparianTest.quickCheck() - Quick progress check');
console.log('  riparianTest.validate() - Run validation checks');
