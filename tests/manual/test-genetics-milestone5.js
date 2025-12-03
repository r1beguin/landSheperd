/**
 * Manual console test for Milestone 5: Genetic Inheritance and Mutation
 * Run this in browser console after page load
 */

function testGeneticInheritance() {
    console.log('=== MILESTONE 5: GENETIC INHERITANCE TEST ===\n');
    
    // Test parent genetics
    const parent1 = {
        heightFactor: 100, widthFactor: 100, foliageDensity: 100,
        trunkShape: 100, colorTint: 100,
        nitrogenEfficiency: 100, phosphorusEfficiency: 100,
        potassiumEfficiency: 100, organicMatterEfficiency: 100,
        generation: 0
    };

    const parent2 = {
        heightFactor: 150, widthFactor: 150, foliageDensity: 150,
        trunkShape: 150, colorTint: 150,
        nitrogenEfficiency: 150, phosphorusEfficiency: 150,
        potassiumEfficiency: 150, organicMatterEfficiency: 150,
        generation: 1
    };
    
    console.log('Parent 1 traits (all 100):', parent1);
    console.log('Parent 2 traits (all 150):', parent2);
    console.log('Expected average: 125 for all traits\n');
    
    // Generate 100 offspring and analyze
    const mutations = { standard: 0, outlier: 0, none: 0 };
    const offspring = [];
    const traitMutations = {
        total: 0,
        outliers: 0
    };

    for (let i = 0; i < 100; i++) {
        const child = Plant.crossoverGenetics(parent1, parent2);
        offspring.push(child);
        
        // Count mutations
        let mutationCount = 0;
        let outlierCount = 0;
        
        Object.keys(child).forEach(trait => {
            if (trait === 'generation') return;
            const expected = 125; // Average of 100 and 150
            const diff = Math.abs(child[trait] - expected);
            
            if (diff > 5) {
                mutationCount++;
                traitMutations.total++;
            }
            if (child[trait] < 50 || child[trait] > 200) {
                outlierCount++;
                traitMutations.outliers++;
            }
        });
        
        if (outlierCount > 0) mutations.outlier++;
        else if (mutationCount > 0) mutations.standard++;
        else mutations.none++;
    }

    // Calculate statistics
    console.log('=== RESULTS (100 offspring) ===\n');
    
    console.log('Offspring Distribution:');
    console.log(`- No mutations: ${mutations.none}% (expected: ~40%)`);
    console.log(`- Standard mutations: ${mutations.standard}% (expected: ~55%)`);
    console.log(`- Outlier mutations: ${mutations.outlier}% (expected: ~5%)\n`);
    
    console.log('Trait-Level Statistics:');
    console.log(`- Total trait mutations: ${traitMutations.total} / 900 traits (${(traitMutations.total/900*100).toFixed(1)}%)`);
    console.log(`- Expected: ~90 mutations (~10%)`);
    console.log(`- Outlier trait mutations: ${traitMutations.outliers} / 900 traits (${(traitMutations.outliers/900*100).toFixed(1)}%)`);
    console.log(`- Expected: ~4.5 outliers (~0.5%)\n`);
    
    // Sample offspring analysis
    console.log('=== SAMPLE OFFSPRING ===\n');
    
    // Show first offspring with no mutations
    const noMutation = offspring.find(o => {
        return Object.keys(o).every(trait => {
            if (trait === 'generation') return true;
            return Math.abs(o[trait] - 125) <= 5;
        });
    });
    
    if (noMutation) {
        console.log('Pure Average (no mutations):', noMutation);
    }
    
    // Show first offspring with standard mutations
    const standardMutation = offspring.find(o => {
        let hasMutation = false;
        let hasOutlier = false;
        Object.keys(o).forEach(trait => {
            if (trait === 'generation') return;
            const diff = Math.abs(o[trait] - 125);
            if (diff > 5) hasMutation = true;
            if (o[trait] < 50 || o[trait] > 200) hasOutlier = true;
        });
        return hasMutation && !hasOutlier;
    });
    
    if (standardMutation) {
        console.log('Standard Mutation:', standardMutation);
    }
    
    // Show first offspring with outlier mutations
    const outlierMutation = offspring.find(o => {
        return Object.keys(o).some(trait => {
            if (trait === 'generation') return false;
            return o[trait] < 50 || o[trait] > 200;
        });
    });
    
    if (outlierMutation) {
        console.log('Outlier Mutation:', outlierMutation);
        
        // Highlight outlier traits
        const outliers = [];
        Object.keys(outlierMutation).forEach(trait => {
            if (trait === 'generation') return;
            if (outlierMutation[trait] < 50 || outlierMutation[trait] > 200) {
                outliers.push(`${trait}: ${outlierMutation[trait]}`);
            }
        });
        console.log('  Outlier traits:', outliers.join(', '));
    }
    
    console.log('\n=== VALIDATION ===\n');
    
    // Validation checks
    const checks = {
        noMutations: mutations.none >= 35 && mutations.none <= 45,
        standardMutations: mutations.standard >= 50 && mutations.standard <= 60,
        outlierMutations: mutations.outlier >= 3 && mutations.outlier <= 8,
        traitMutationRate: (traitMutations.total / 900) >= 0.08 && (traitMutations.total / 900) <= 0.12,
        outlierRate: (traitMutations.outliers / 900) >= 0.003 && (traitMutations.outliers / 900) <= 0.01
    };
    
    console.log('Validation Results:');
    console.log(`✓ No mutations (35-45%): ${checks.noMutations ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Standard mutations (50-60%): ${checks.standardMutations ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Outlier mutations (3-8%): ${checks.outlierMutations ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Trait mutation rate (8-12%): ${checks.traitMutationRate ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Outlier rate (0.3-1.0%): ${checks.outlierRate ? 'PASS' : 'FAIL'}\n`);
    
    const allPassed = Object.values(checks).every(v => v);
    console.log(`OVERALL: ${allPassed ? '✓ PASS' : '✗ FAIL'}`);
    
    return {
        mutations,
        traitMutations,
        offspring,
        checks,
        passed: allPassed
    };
}

// Auto-run if Plant class is available
if (typeof Plant !== 'undefined') {
    console.log('Plant class found. Running test...\n');
    window.geneticsTestResults = testGeneticInheritance();
} else {
    console.log('Plant class not found. Load the game first, then run: testGeneticInheritance()');
}
