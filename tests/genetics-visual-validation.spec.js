/**
 * Genetics Visual Validation Test
 * Milestone 2 Part 2 - Verify PlantGenerator uses genetics for visual variation
 */

const { test, expect } = require('@playwright/test');

test.describe('Genetics Visual Expression', () => {
    test('PlantGenerator applies genetic variation to oak trees', async ({ page }) => {
        // Navigate to game
        await page.goto('http://localhost:8081/');
        
        // Wait for initialization
        await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.plantManager);
        await page.waitForTimeout(1000);
        
        // Create 6 oak trees with extreme genetic profiles
        const results = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const speciesConfig = plantManager.speciesConfigs['quercus_robur'];
            
            if (!speciesConfig) {
                return { error: 'Oak species not found' };
            }
            
            // Define extreme genetic profiles for maximum visual variance
            const geneticProfiles = [
                { name: 'Tall & Narrow', heightFactor: 255, widthFactor: 0, foliageDensity: 128, colorTint: 128 },
                { name: 'Short & Wide', heightFactor: 0, widthFactor: 255, foliageDensity: 128, colorTint: 128 },
                { name: 'Sparse Foliage', heightFactor: 128, widthFactor: 128, foliageDensity: 0, colorTint: 128 },
                { name: 'Dense Foliage', heightFactor: 128, widthFactor: 128, foliageDensity: 255, colorTint: 128 },
                { name: 'Cool Tint', heightFactor: 128, widthFactor: 128, foliageDensity: 128, colorTint: 0 },
                { name: 'Warm Tint', heightFactor: 128, widthFactor: 128, foliageDensity: 128, colorTint: 255 }
            ];
            
            const trees = [];
            
            for (let i = 0; i < geneticProfiles.length; i++) {
                const profile = geneticProfiles[i];
                const x = 5 + (i * 4);
                const y = 5;
                
                // Plant tree
                const tree = plantManager.addPlant(x, y, 'quercus_robur', 'MatureTree');
                
                if (tree) {
                    // Override genetics
                    tree.genetics = profile;
                    
                    // Force regenerate sprite with new genetics
                    const stage = tree.growthStage;
                    tree.sprite = window.PlantGenerator.generatePlantSprite(speciesConfig, stage, profile);
                    
                    trees.push({
                        name: profile.name,
                        genetics: profile,
                        width: tree.sprite.width,
                        height: tree.sprite.height
                    });
                }
            }
            
            return { trees };
        });
        
        // Validate results
        if (results.error) {
            throw new Error(results.error);
        }
        
        expect(results.trees).toHaveLength(6);
        
        // Extract dimensions
        const widths = results.trees.map(t => t.width);
        const heights = results.trees.map(t => t.height);
        
        const minWidth = Math.min(...widths);
        const maxWidth = Math.max(...widths);
        const minHeight = Math.min(...heights);
        const maxHeight = Math.max(...heights);
        
        // Calculate variance
        const widthVariance = ((maxWidth - minWidth) / minWidth) * 100;
        const heightVariance = ((maxHeight - minHeight) / minHeight) * 100;
        
        console.log('\n=== Genetic Expression Results ===');
        console.log(`Width range: ${minWidth}px - ${maxWidth}px (${widthVariance.toFixed(1)}% variance)`);
        console.log(`Height range: ${minHeight}px - ${maxHeight}px (${heightVariance.toFixed(1)}% variance)`);
        
        results.trees.forEach(tree => {
            console.log(`${tree.name}: ${tree.width}x${tree.height}px`);
        });
        
        // Validation criteria:
        // With 0.7-1.3x multiplier, expect ~85% variance (1.3/0.7 = 1.857)
        // But accounting for rounding and canvas sizing, accept >40% as minimum
        const minExpectedVariance = 40;
        
        expect(widthVariance).toBeGreaterThan(minExpectedVariance);
        expect(heightVariance).toBeGreaterThan(minExpectedVariance);
        
        // Verify specific trees have expected characteristics
        const tallNarrow = results.trees.find(t => t.name === 'Tall & Narrow');
        const shortWide = results.trees.find(t => t.name === 'Short & Wide');
        
        expect(tallNarrow.height).toBeGreaterThan(shortWide.height);
        expect(shortWide.width).toBeGreaterThan(tallNarrow.width);
        
        console.log('\n✓ All genetic expression tests passed');
        console.log(`✓ Width diversity: ${widthVariance.toFixed(1)}%`);
        console.log(`✓ Height diversity: ${heightVariance.toFixed(1)}%`);
        console.log('✓ Tall/narrow vs. short/wide confirmed');
        
        // Take screenshot for visual validation
        await page.screenshot({ path: 'test-results/genetics-expression.png', fullPage: false });
    });
    
    test('Genetics backward compatible - non-oak species work without genetics', async ({ page }) => {
        await page.goto('http://localhost:8081/');
        await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.plantManager);
        await page.waitForTimeout(1000);
        
        const results = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const errors = [];
            
            try {
                // Plant nettles (should work without genetics)
                const nettle = plantManager.addPlant(10, 10, 'urtica_dioica', 'Vegetative');
                if (!nettle) {
                    errors.push('Failed to plant nettles without genetics');
                }
                
                // Plant clover (should work without genetics)
                const clover = plantManager.addPlant(12, 10, 'trifolium_repens', 'Spreading');
                if (!clover) {
                    errors.push('Failed to plant clover without genetics');
                }
                
                return { success: errors.length === 0, errors };
            } catch (e) {
                return { success: false, errors: [e.message] };
            }
        });
        
        expect(results.success).toBe(true);
        if (results.errors.length > 0) {
            console.error('Backward compatibility errors:', results.errors);
        }
        
        console.log('✓ Non-oak species work without genetics (backward compatible)');
    });
});
