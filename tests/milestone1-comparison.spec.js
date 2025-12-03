/**
 * Milestone 1 Validation: Direct Comparison Test
 * Compare original PlantGenerator.shiftHue vs ColorUtils.shiftHue
 */
const { test, expect } = require('@playwright/test');

test.describe('Milestone 1: Utility Module Validation', () => {
    test('ColorUtils.shiftHue produces identical output to PlantGenerator.shiftHue', async ({ page }) => {
        await page.goto('http://localhost:8081/');
        await page.waitForTimeout(1000);
        
        const comparison = await page.evaluate(() => {
            // Test colors
            const testColors = ['#4a7c3c', '#8b4513', '#9966cc', '#ff6347'];
            const testShifts = [-20, -10, 0, 10, 20];
            
            const results = [];
            for (const color of testColors) {
                for (const shift of testShifts) {
                    const original = window.PlantGenerator.shiftHue(color, shift);
                    const utility = window.ColorUtils.shiftHue(color, shift);
                    results.push({
                        color,
                        shift,
                        original,
                        utility,
                        match: original === utility
                    });
                }
            }
            
            return results;
        });
        
        console.log('Color shift comparison:', comparison);
        
        // All results should match
        const allMatch = comparison.every(r => r.match);
        expect(allMatch).toBe(true);
        
        // Log any mismatches
        const mismatches = comparison.filter(r => !r.match);
        if (mismatches.length > 0) {
            console.log('Mismatches found:', mismatches);
        }
    });
    
    test('GeneticsUtils calculations match original oak genetics logic', async ({ page }) => {
        await page.goto('http://localhost:8081/');
        await page.waitForTimeout(1000);
        
        const geneticsComparison = await page.evaluate(() => {
            // Test genetics values
            const testGenetics = [
                { heightFactor: 0, widthFactor: 0, foliageDensity: 0, colorTint: 0 },
                { heightFactor: 127, widthFactor: 127, foliageDensity: 127, colorTint: 127 },
                { heightFactor: 255, widthFactor: 255, foliageDensity: 255, colorTint: 255 }
            ];
            
            const results = [];
            for (const g of testGenetics) {
                // Original calculations (from PlantGenerator oak generators)
                const origHeightMult = 0.7 + (g.heightFactor / 255) * 0.6;
                const origWidthMult = 0.7 + (g.widthFactor / 255) * 0.6;
                const origFoliageMult = 0.6 + (g.foliageDensity / 255) * 0.8;
                const origHueTint = -20 + (g.colorTint / 255) * 40;
                
                // GeneticsUtils calculations
                const utilHeightMult = window.GeneticsUtils.getDimensionMultiplier(g.heightFactor);
                const utilWidthMult = window.GeneticsUtils.getDimensionMultiplier(g.widthFactor);
                const utilFoliageMult = window.GeneticsUtils.getFoliageMultiplier(g.foliageDensity);
                const utilHueTint = window.GeneticsUtils.getHueTint(g.colorTint);
                
                results.push({
                    genetics: g,
                    heightMatch: Math.abs(origHeightMult - utilHeightMult) < 0.001,
                    widthMatch: Math.abs(origWidthMult - utilWidthMult) < 0.001,
                    foliageMatch: Math.abs(origFoliageMult - utilFoliageMult) < 0.001,
                    hueTintMatch: Math.abs(origHueTint - utilHueTint) < 0.001
                });
            }
            
            return results;
        });
        
        console.log('Genetics calculation comparison:', geneticsComparison);
        
        // All calculations should match
        const allMatch = geneticsComparison.every(r => 
            r.heightMatch && r.widthMatch && r.foliageMatch && r.hueTintMatch
        );
        expect(allMatch).toBe(true);
    });
});
