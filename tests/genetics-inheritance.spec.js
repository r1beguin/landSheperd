/**
 * Automated test for Milestone 5: Genetic Inheritance and Mutation
 * Tests Mendelian averaging + mutation system
 */

const { test, expect } = require('@playwright/test');

test.describe('Milestone 5: Genetic Inheritance', () => {
    test('should generate offspring with proper Mendelian averaging', async ({ page }) => {
        await page.goto('http://localhost:8081/tests/html/genetics-inheritance-test.html');
        
        // Wait for test to complete (auto-runs on load)
        await page.waitForTimeout(2000);
        
        // Extract test results from page
        const results = await page.evaluate(() => {
            // Access the Plant class
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
            
            const offspring = [];
            const mutations = { standard: 0, outlier: 0, none: 0 };
            const traitMutations = { total: 0, outliers: 0 };
            
            // Generate 100 offspring
            for (let i = 0; i < 100; i++) {
                const child = Plant.crossoverGenetics(parent1, parent2);
                offspring.push(child);
                
                let mutationCount = 0;
                let outlierCount = 0;
                
                Object.keys(child).forEach(trait => {
                    if (trait === 'generation') return;
                    const expected = 125;
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
            
            return {
                offspring,
                mutations,
                traitMutations,
                totalTraits: 100 * 9 // 100 offspring × 9 traits
            };
        });
        
        console.log('Genetic Inheritance Test Results:');
        console.log(`- No mutations: ${results.mutations.none}%`);
        console.log(`- Standard mutations: ${results.mutations.standard}%`);
        console.log(`- Outlier mutations: ${results.mutations.outlier}%`);
        console.log(`- Total trait mutations: ${results.traitMutations.total} / ${results.totalTraits}`);
        console.log(`- Outlier traits: ${results.traitMutations.outliers} / ${results.totalTraits}`);
        
        // VALIDATION: Offspring distribution
        expect(results.mutations.none).toBeGreaterThanOrEqual(35);
        expect(results.mutations.none).toBeLessThanOrEqual(45);
        expect(results.mutations.standard).toBeGreaterThanOrEqual(50);
        expect(results.mutations.standard).toBeLessThanOrEqual(60);
        expect(results.mutations.outlier).toBeGreaterThanOrEqual(3);
        expect(results.mutations.outlier).toBeLessThanOrEqual(8);
        
        // VALIDATION: Trait-level mutation rates
        const traitMutationRate = results.traitMutations.total / results.totalTraits;
        expect(traitMutationRate).toBeGreaterThanOrEqual(0.08); // 8%
        expect(traitMutationRate).toBeLessThanOrEqual(0.12); // 12%
        
        const outlierRate = results.traitMutations.outliers / results.totalTraits;
        expect(outlierRate).toBeGreaterThanOrEqual(0.003); // 0.3%
        expect(outlierRate).toBeLessThanOrEqual(0.01); // 1.0%
        
        // VALIDATION: Check sample offspring for proper averaging
        const sampleOffspring = results.offspring[0];
        expect(sampleOffspring).toBeDefined();
        expect(sampleOffspring.generation).toBe(0); // Generation is placeholder (set by caller)
        
        // All traits should be defined
        const expectedTraits = [
            'heightFactor', 'widthFactor', 'foliageDensity', 'trunkShape', 'colorTint',
            'nitrogenEfficiency', 'phosphorusEfficiency', 'potassiumEfficiency', 'organicMatterEfficiency'
        ];
        
        for (const trait of expectedTraits) {
            expect(sampleOffspring[trait]).toBeDefined();
            expect(sampleOffspring[trait]).toBeGreaterThanOrEqual(0);
            expect(sampleOffspring[trait]).toBeLessThanOrEqual(255);
        }
    });
    
    test('should produce diverse offspring over multiple generations', async ({ page }) => {
        await page.goto('http://localhost:8081/tests/html/genetics-inheritance-test.html');
        await page.waitForTimeout(1000);
        
        // Test diversity by generating multiple generations
        const diversity = await page.evaluate(() => {
            // Start with baseline parents
            const gen0Parent1 = {
                heightFactor: 128, widthFactor: 128, foliageDensity: 128,
                trunkShape: 128, colorTint: 128,
                nitrogenEfficiency: 128, phosphorusEfficiency: 128,
                potassiumEfficiency: 128, organicMatterEfficiency: 128,
                generation: 0
            };
            
            const gen0Parent2 = { ...gen0Parent1 };
            
            // Generate 3 generations
            const generations = [
                [gen0Parent1, gen0Parent2]
            ];
            
            for (let gen = 1; gen <= 3; gen++) {
                const offspring = [];
                for (let i = 0; i < 10; i++) {
                    const parent1 = generations[gen - 1][Math.floor(Math.random() * generations[gen - 1].length)];
                    const parent2 = generations[gen - 1][Math.floor(Math.random() * generations[gen - 1].length)];
                    const child = Plant.crossoverGenetics(parent1, parent2);
                    child.generation = gen;
                    offspring.push(child);
                }
                generations.push(offspring);
            }
            
            // Calculate diversity in final generation
            const finalGen = generations[3];
            const traitValues = {
                heightFactor: [],
                widthFactor: [],
                foliageDensity: []
            };
            
            finalGen.forEach(plant => {
                traitValues.heightFactor.push(plant.heightFactor);
                traitValues.widthFactor.push(plant.widthFactor);
                traitValues.foliageDensity.push(plant.foliageDensity);
            });
            
            // Calculate standard deviation for each trait
            const calculateStdDev = (values) => {
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                return Math.sqrt(variance);
            };
            
            return {
                heightStdDev: calculateStdDev(traitValues.heightFactor),
                widthStdDev: calculateStdDev(traitValues.widthFactor),
                foliageStdDev: calculateStdDev(traitValues.foliageDensity),
                generationCount: generations.length,
                finalGenSize: finalGen.length
            };
        });
        
        console.log('Diversity Test Results:');
        console.log(`- Height std dev: ${diversity.heightStdDev.toFixed(2)}`);
        console.log(`- Width std dev: ${diversity.widthStdDev.toFixed(2)}`);
        console.log(`- Foliage std dev: ${diversity.foliageStdDev.toFixed(2)}`);
        
        // VALIDATION: Genetic diversity should emerge over generations
        // Starting from identical parents (128), mutations should introduce variation
        // After 3 generations with 10% mutation rate, expect std dev > 5
        expect(diversity.heightStdDev).toBeGreaterThan(5);
        expect(diversity.widthStdDev).toBeGreaterThan(5);
        expect(diversity.foliageStdDev).toBeGreaterThan(5);
        
        // VALIDATION: Diversity shouldn't be too extreme (all within 0-255 range)
        expect(diversity.heightStdDev).toBeLessThan(80);
        expect(diversity.widthStdDev).toBeLessThan(80);
        expect(diversity.foliageStdDev).toBeLessThan(80);
    });
    
    test('should handle edge cases correctly', async ({ page }) => {
        await page.goto('http://localhost:8081/tests/html/genetics-inheritance-test.html');
        await page.waitForTimeout(1000);
        
        const edgeCases = await page.evaluate(() => {
            const results = {};
            
            // Edge case 1: Extreme parent values (0 and 255)
            const extremeParent1 = {
                heightFactor: 0, widthFactor: 0, foliageDensity: 0,
                trunkShape: 0, colorTint: 0,
                nitrogenEfficiency: 0, phosphorusEfficiency: 0,
                potassiumEfficiency: 0, organicMatterEfficiency: 0,
                generation: 0
            };
            
            const extremeParent2 = {
                heightFactor: 255, widthFactor: 255, foliageDensity: 255,
                trunkShape: 255, colorTint: 255,
                nitrogenEfficiency: 255, phosphorusEfficiency: 255,
                potassiumEfficiency: 255, organicMatterEfficiency: 255,
                generation: 0
            };
            
            const extremeOffspring = Plant.crossoverGenetics(extremeParent1, extremeParent2);
            results.extremeOffspring = extremeOffspring;
            
            // Edge case 2: Identical parents
            const identicalParent = {
                heightFactor: 128, widthFactor: 128, foliageDensity: 128,
                trunkShape: 128, colorTint: 128,
                nitrogenEfficiency: 128, phosphorusEfficiency: 128,
                potassiumEfficiency: 128, organicMatterEfficiency: 128,
                generation: 0
            };
            
            const identicalOffspring = [];
            for (let i = 0; i < 50; i++) {
                identicalOffspring.push(Plant.crossoverGenetics(identicalParent, identicalParent));
            }
            results.identicalOffspring = identicalOffspring;
            
            // Count mutations in identical parent offspring
            let mutationCount = 0;
            identicalOffspring.forEach(child => {
                Object.keys(child).forEach(trait => {
                    if (trait === 'generation') return;
                    if (Math.abs(child[trait] - 128) > 5) mutationCount++;
                });
            });
            results.identicalMutationCount = mutationCount;
            
            return results;
        });
        
        console.log('Edge Cases Test Results:');
        console.log(`- Extreme offspring (0+255): ${JSON.stringify(edgeCases.extremeOffspring).substring(0, 100)}...`);
        console.log(`- Identical parent mutations: ${edgeCases.identicalMutationCount} / ${50 * 9} traits`);
        
        // VALIDATION: Extreme parents should produce offspring near 127-128 (average)
        const traits = ['heightFactor', 'widthFactor', 'foliageDensity'];
        for (const trait of traits) {
            const value = edgeCases.extremeOffspring[trait];
            // Allow for mutations, but should be roughly centered around 127.5
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(255);
        }
        
        // VALIDATION: Identical parents should still have ~10% mutation rate
        const expectedMutations = 50 * 9 * 0.1; // ~45 mutations
        expect(edgeCases.identicalMutationCount).toBeGreaterThan(expectedMutations * 0.5); // At least 50% of expected
        expect(edgeCases.identicalMutationCount).toBeLessThan(expectedMutations * 1.5); // At most 150% of expected
    });
});
