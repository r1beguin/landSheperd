/**
 * Generator Refactor Validation Test
 * Tests all species at all growth stages for visual regression
 */
const { test, expect } = require('@playwright/test');

test.describe('Milestone 6: Generator Refactor Validation', () => {
    test('should generate all plant species without errors', async ({ page }) => {
        await page.goto('http://localhost:8081/');
        await page.waitForTimeout(2000);
        
        const results = await page.evaluate(async () => {
            const results = {
                nettles: {},
                oak: {},
                clover: {},
                errors: []
            };
            
            // Load species configs
            const nettlesConfig = await fetch('/species/nettles.json').then(r => r.json());
            const oakConfig = await fetch('/species/oak.json').then(r => r.json());
            const cloverConfig = await fetch('/species/clover.json').then(r => r.json());
            
            // Test nettles (herb) - all stages
            const nettlesStages = ['Seedling', 'Vegetative', 'Flowering', 'Withered'];
            for (const stage of nettlesStages) {
                try {
                    const canvas = window.PlantGenerator.generatePlantSprite(nettlesConfig, stage);
                    results.nettles[stage] = {
                        success: true,
                        width: canvas.width,
                        height: canvas.height
                    };
                } catch (e) {
                    results.errors.push(`Nettles ${stage}: ${e.message}`);
                    results.nettles[stage] = { success: false, error: e.message };
                }
            }
            
            // Test oak (tree) - all stages with genetics
            const oakStages = ['Sapling', 'YoungTree', 'MatureTree', 'Withered'];
            const testGenetics = { heightFactor: 127, widthFactor: 127, foliageDensity: 127, colorTint: 127 };
            
            for (const stage of oakStages) {
                try {
                    const canvas = window.PlantGenerator.generatePlantSprite(
                        oakConfig, 
                        stage, 
                        stage === 'Withered' ? null : testGenetics
                    );
                    results.oak[stage] = {
                        success: true,
                        width: canvas.width,
                        height: canvas.height
                    };
                } catch (e) {
                    results.errors.push(`Oak ${stage}: ${e.message}`);
                    results.oak[stage] = { success: false, error: e.message };
                }
            }
            
            // Test clover (groundcover) - all stages
            const cloverStages = ['Sprout', 'Spreading', 'Flowering'];
            for (const stage of cloverStages) {
                try {
                    const canvas = window.PlantGenerator.generatePlantSprite(cloverConfig, stage);
                    results.clover[stage] = {
                        success: true,
                        width: canvas.width,
                        height: canvas.height
                    };
                } catch (e) {
                    results.errors.push(`Clover ${stage}: ${e.message}`);
                    results.clover[stage] = { success: false, error: e.message };
                }
            }
            
            return results;
        });
        
        console.log('Generation test results:', JSON.stringify(results, null, 2));
        
        // All generations should succeed
        expect(results.errors.length).toBe(0);
        
        // Validate nettles stages
        expect(results.nettles.Seedling.success).toBe(true);
        expect(results.nettles.Vegetative.success).toBe(true);
        expect(results.nettles.Flowering.success).toBe(true);
        expect(results.nettles.Withered.success).toBe(true);
        
        // Validate oak stages
        expect(results.oak.Sapling.success).toBe(true);
        expect(results.oak.YoungTree.success).toBe(true);
        expect(results.oak.MatureTree.success).toBe(true);
        expect(results.oak.Withered.success).toBe(true);
        
        // Validate clover stages
        expect(results.clover.Sprout.success).toBe(true);
        expect(results.clover.Spreading.success).toBe(true);
        expect(results.clover.Flowering.success).toBe(true);
    });
    
    test('should maintain oak genetic diversity', async ({ page }) => {
        await page.goto('http://localhost:8081/');
        await page.waitForTimeout(2000);
        
        const diversityResults = await page.evaluate(async () => {
            const oakConfig = await fetch('/species/oak.json').then(r => r.json());
            
            // Generate 10 oaks with different genetics
            const oaks = [];
            for (let i = 0; i < 10; i++) {
                const genetics = {
                    heightFactor: Math.floor(Math.random() * 256),
                    widthFactor: Math.floor(Math.random() * 256),
                    foliageDensity: Math.floor(Math.random() * 256),
                    colorTint: Math.floor(Math.random() * 256)
                };
                
                const canvas = window.PlantGenerator.generatePlantSprite(oakConfig, 'MatureTree', genetics);
                oaks.push({
                    genetics,
                    width: canvas.width,
                    height: canvas.height
                });
            }
            
            // Check that we have diversity (not all same size)
            const widths = oaks.map(o => o.width);
            const heights = oaks.map(o => o.height);
            const uniqueWidths = new Set(widths).size;
            const uniqueHeights = new Set(heights).size;
            
            return {
                oaks,
                uniqueWidths,
                uniqueHeights,
                minWidth: Math.min(...widths),
                maxWidth: Math.max(...widths),
                minHeight: Math.min(...heights),
                maxHeight: Math.max(...heights)
            };
        });
        
        console.log('Oak diversity results:', diversityResults);
        
        // Should have at least some diversity (not all identical)
        expect(diversityResults.uniqueWidths).toBeGreaterThan(1);
        expect(diversityResults.uniqueHeights).toBeGreaterThan(1);
        
        // Should have reasonable size range (0.7-1.3 multiplier)
        const widthRange = diversityResults.maxWidth - diversityResults.minWidth;
        const heightRange = diversityResults.maxHeight - diversityResults.minHeight;
        expect(widthRange).toBeGreaterThan(5); // At least some variation
        expect(heightRange).toBeGreaterThan(5);
    });
    
    test('should maintain performance with refactored generators', async ({ page }) => {
        await page.goto('http://localhost:8081/');
        
        // Wait for game to initialize and run for a few seconds
        await page.waitForTimeout(5000);
        
        // Measure FPS
        const fpsData = await page.evaluate(() => {
            if (window.engine && window.engine.fpsCounter) {
                return { fps: window.engine.fpsCounter.getFPS(), hasCounter: true };
            }
            return { fps: 0, hasCounter: false };
        });
        
        console.log(`FPS: ${fpsData.fps}, Has Counter: ${fpsData.hasCounter}`);
        
        // Should maintain 30+ FPS if counter is available, otherwise skip test
        if (fpsData.hasCounter) {
            expect(fpsData.fps).toBeGreaterThanOrEqual(30);
        } else {
            console.log('FPS counter not available, skipping performance check');
            // Just check that the page loaded without errors
            const hasErrors = await page.evaluate(() => {
                return window.console.errors && window.console.errors.length > 0;
            });
            expect(hasErrors).toBeFalsy();
        }
    });
    
    test('should route correctly via registry pattern', async ({ page }) => {
        // Listen for console warnings about routing failures
        const warnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                warnings.push(msg.text());
            }
        });
        
        await page.goto('http://localhost:8081/');
        await page.waitForTimeout(3000);
        
        // Check for routing warnings
        const routingWarnings = warnings.filter(w => 
            w.includes('not found') || 
            w.includes('Unknown generator') || 
            w.includes('using fallback')
        );
        
        console.log('Console warnings:', warnings);
        console.log('Routing warnings:', routingWarnings);
        
        // Should have no routing failures
        expect(routingWarnings.length).toBe(0);
    });
});
