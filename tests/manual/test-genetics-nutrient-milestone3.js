/**
 * Manual Test Script: Milestone 3 - Genetic Nutrient Expression
 * 
 * Run in browser console to validate genetic nutrient efficiency mechanics.
 * 
 * USAGE:
 * 1. Load game in browser (http://localhost:8081)
 * 2. Open console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Review logged results
 */

(async function testGeneticsNutrientExpression() {
    console.log('===== MILESTONE 3: GENETIC NUTRIENT EXPRESSION TEST =====\n');
    
    const engine = window.graphicsEngine;
    if (!engine || !engine.plantManager || !engine.soilManager || !engine.timeManager) {
        console.error('FAILED: Required managers not available');
        return;
    }
    
    const plantManager = engine.plantManager;
    const soilManager = engine.soilManager;
    const timeManager = engine.timeManager;
    const currentDay = timeManager.getCurrentDayPrecise();
    
    // Clear existing plants
    plantManager.plants.clear();
    console.log('✓ Cleared existing plants\n');
    
    // ===== TEST 1: NUTRIENT CONSUMPTION =====
    console.log('TEST 1: Genetic Efficiency Modifies Nutrient Consumption\n');
    
    // Setup 3 oaks in uniform soil
    const testPositions = [
        { gridX: 25, gridY: 25, label: 'High Efficiency (200)', geneValue: 200 },
        { gridX: 25, gridY: 26, label: 'Baseline (128)', geneValue: 128 },
        { gridX: 25, gridY: 27, label: 'Low Efficiency (60)', geneValue: 60 }
    ];
    
    // Set uniform soil nutrients
    for (const pos of testPositions) {
        const soil = soilManager.getSoilAt(pos.gridX, pos.gridY);
        if (soil) {
            soil.updateNutrients(50, 50, 50, 50); // N, P, K, OM
        }
    }
    console.log('✓ Set uniform soil nutrients (N:50, P:50, K:50, OM:50)\n');
    
    // Spawn oaks with different genetics
    const speciesConfig = window.SPECIES_REGISTRY?.get('quercus_robur');
    if (!speciesConfig) {
        console.error('FAILED: Oak species not found in registry');
        return;
    }
    
    const oaks = [];
    for (const pos of testPositions) {
        const worldPos = soilManager.gridToWorld(pos.gridX, pos.gridY);
        const oak = plantManager.addPlant(worldPos.x, worldPos.y, 'quercus_robur', currentDay);
        
        if (oak && oak.genetics) {
            // Set genetics
            oak.genetics.nitrogenEfficiency = pos.geneValue;
            oak.genetics.phosphorusEfficiency = pos.geneValue;
            oak.genetics.potassiumEfficiency = pos.geneValue;
            oak.genetics.organicMatterEfficiency = pos.geneValue;
            
            // Set to Seedling and make ready to advance
            oak.stage = 'Seedling';
            oak.accumulatedGrowthDays = speciesConfig.growthStages[0].daysToGrow;
            
            oaks.push({ plant: oak, ...pos });
        }
    }
    console.log(`✓ Spawned ${oaks.length} oaks with varying genetics\n`);
    
    // Record nutrients BEFORE growth stage advancement
    console.log('BEFORE advanceGrowthStage():');
    const nutrientsBefore = oaks.map(oak => {
        const soil = soilManager.getSoilAt(oak.gridX, oak.gridY);
        console.log(`  ${oak.label}:`);
        console.log(`    Genetics: N=${oak.plant.genetics.nitrogenEfficiency}, P=${oak.plant.genetics.phosphorusEfficiency}`);
        console.log(`    Soil: N=${soil.nitrogen.toFixed(1)}, P=${soil.phosphorus.toFixed(1)}, K=${soil.potassium.toFixed(1)}, OM=${soil.organicMatter.toFixed(1)}`);
        return {
            label: oak.label,
            nitrogen: soil.nitrogen,
            phosphorus: soil.phosphorus,
            potassium: soil.potassium,
            organicMatter: soil.organicMatter
        };
    });
    console.log('');
    
    // TRIGGER: Advance growth stage (this should consume nutrients with genetic modifiers)
    for (const oak of oaks) {
        oak.plant.advanceGrowthStage(currentDay);
    }
    console.log('✓ Called advanceGrowthStage() on all oaks\n');
    
    // Record nutrients AFTER growth stage advancement
    console.log('AFTER advanceGrowthStage():');
    const nutrientsAfter = oaks.map((oak, idx) => {
        const soil = soilManager.getSoilAt(oak.gridX, oak.gridY);
        const consumed = {
            nitrogen: nutrientsBefore[idx].nitrogen - soil.nitrogen,
            phosphorus: nutrientsBefore[idx].phosphorus - soil.phosphorus,
            potassium: nutrientsBefore[idx].potassium - soil.potassium,
            organicMatter: nutrientsBefore[idx].organicMatter - soil.organicMatter
        };
        
        console.log(`  ${oak.label}:`);
        console.log(`    New Stage: ${oak.plant.stage}`);
        console.log(`    Soil: N=${soil.nitrogen.toFixed(1)}, P=${soil.phosphorus.toFixed(1)}, K=${soil.potassium.toFixed(1)}, OM=${soil.organicMatter.toFixed(1)}`);
        console.log(`    CONSUMED: N=${consumed.nitrogen.toFixed(1)}, P=${consumed.phosphorus.toFixed(1)}, K=${consumed.potassium.toFixed(1)}, OM=${consumed.organicMatter.toFixed(1)}`);
        
        return { label: oak.label, consumed, newStage: oak.plant.stage };
    });
    console.log('');
    
    // VALIDATION
    console.log('VALIDATION RESULTS:');
    const high = nutrientsAfter[0].consumed;
    const baseline = nutrientsAfter[1].consumed;
    const low = nutrientsAfter[2].consumed;
    
    const test1a = high.nitrogen < baseline.nitrogen;
    const test1b = low.nitrogen > baseline.nitrogen;
    const test1c = nutrientsAfter.every(oak => oak.newStage === 'Sapling');
    
    console.log(`  ✓ High efficiency consumes LESS than baseline: ${test1a ? 'PASS' : 'FAIL'}`);
    console.log(`    High: ${high.nitrogen.toFixed(1)}N, Baseline: ${baseline.nitrogen.toFixed(1)}N`);
    console.log(`  ✓ Low efficiency consumes MORE than baseline: ${test1b ? 'PASS' : 'FAIL'}`);
    console.log(`    Low: ${low.nitrogen.toFixed(1)}N, Baseline: ${baseline.nitrogen.toFixed(1)}N`);
    console.log(`  ✓ All advanced to Sapling: ${test1c ? 'PASS' : 'FAIL'}`);
    console.log('');
    
    // ===== TEST 2: NUTRIENT RESISTANCE =====
    console.log('TEST 2: Genetic Efficiency Modifies Nutrient Requirements\n');
    
    // Clear plants
    plantManager.plants.clear();
    
    // Setup 3 oaks in MARGINAL soil (below minimum requirements)
    const marginalPositions = [
        { gridX: 30, gridY: 25, label: 'High Efficiency (200)', geneValue: 200 },
        { gridX: 30, gridY: 26, label: 'Baseline (128)', geneValue: 128 },
        { gridX: 30, gridY: 27, label: 'Low Efficiency (60)', geneValue: 60 }
    ];
    
    // Set marginal soil (Oak minimum: N=20, P=15, K=10, OM=5)
    // Use 18N (below minimum for baseline)
    for (const pos of marginalPositions) {
        const soil = soilManager.getSoilAt(pos.gridX, pos.gridY);
        if (soil) {
            soil.updateNutrients(18, 14, 9, 4); // Slightly below minimum
        }
    }
    console.log('✓ Set marginal soil nutrients (N:18, P:14, K:9, OM:4) - BELOW oak minimum\n');
    
    // Spawn oaks at Sapling stage
    const marginalOaks = [];
    for (const pos of marginalPositions) {
        const worldPos = soilManager.gridToWorld(pos.gridX, pos.gridY);
        const oak = plantManager.addPlant(worldPos.x, worldPos.y, 'quercus_robur', currentDay);
        
        if (oak && oak.genetics) {
            oak.genetics.nitrogenEfficiency = pos.geneValue;
            oak.genetics.phosphorusEfficiency = pos.geneValue;
            oak.genetics.potassiumEfficiency = pos.geneValue;
            oak.genetics.organicMatterEfficiency = pos.geneValue;
            oak.stage = 'Sapling';
            marginalOaks.push({ plant: oak, ...pos });
        }
    }
    console.log(`✓ Spawned ${marginalOaks.length} oaks in marginal soil\n`);
    
    // Calculate growth rates (uses nutrientScore with genetic modifiers)
    console.log('GROWTH RATES IN MARGINAL SOIL:');
    marginalOaks.forEach(oak => {
        const growthRate = oak.plant.calculateGrowthRate();
        const soil = soilManager.getSoilAt(oak.gridX, oak.gridY);
        console.log(`  ${oak.label}:`);
        console.log(`    Genetics: N=${oak.plant.genetics.nitrogenEfficiency}`);
        console.log(`    Soil: N=${soil.nitrogen.toFixed(1)}`);
        console.log(`    Growth Rate: ${(growthRate * 100).toFixed(1)}%`);
    });
    console.log('');
    
    // VALIDATION
    console.log('VALIDATION RESULTS:');
    const highRate = marginalOaks[0].plant.calculateGrowthRate();
    const baselineRate = marginalOaks[1].plant.calculateGrowthRate();
    const lowRate = marginalOaks[2].plant.calculateGrowthRate();
    
    const test2a = highRate > baselineRate;
    const test2b = baselineRate > lowRate;
    const test2c = lowRate === 0.0;
    const test2d = highRate > 0.0;
    
    console.log(`  ✓ High efficiency has HIGHER growth rate than baseline: ${test2a ? 'PASS' : 'FAIL'}`);
    console.log(`    High: ${(highRate * 100).toFixed(1)}%, Baseline: ${(baselineRate * 100).toFixed(1)}%`);
    console.log(`  ✓ Baseline has HIGHER growth rate than low efficiency: ${test2b ? 'PASS' : 'FAIL'}`);
    console.log(`    Baseline: ${(baselineRate * 100).toFixed(1)}%, Low: ${(lowRate * 100).toFixed(1)}%`);
    console.log(`  ✓ Low efficiency is severely stunted (0.0): ${test2c ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ High efficiency survives (>0.0): ${test2d ? 'PASS' : 'FAIL'}`);
    console.log('');
    
    // SUMMARY
    console.log('===== TEST SUMMARY =====');
    const allTestsPassed = test1a && test1b && test1c && test2a && test2b && test2c && test2d;
    console.log(`Overall: ${allTestsPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
    console.log('');
    console.log('Milestone 3 Implementation: Genetic nutrient efficiency affects:');
    console.log('  1. Nutrient consumption during growth (advanceGrowthStage)');
    console.log('  2. Nutrient requirement thresholds (nutrientScore)');
    console.log('  3. Growth rates in marginal soil conditions');
    console.log('');
    console.log('Ready for Milestone 4: ' + (allTestsPassed ? 'YES' : 'NO - Fix failures first'));
})();
