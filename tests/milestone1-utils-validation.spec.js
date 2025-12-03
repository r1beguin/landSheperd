/**
 * Milestone 1 Validation Test: Utility Modules
 * Tests ColorUtils, CanvasUtils, and GeneticsUtils
 */
const { test, expect } = require('@playwright/test');

test.describe('Milestone 1: Utility Modules', () => {
    test('should validate ColorUtils.shiftHue', async ({ page }) => {
        await page.goto('http://localhost:8081/tests/html/milestone1-utils-test.html');
        
        // Wait for scripts to load
        await page.waitForTimeout(500);
        
        // Check ColorUtils is defined
        const colorUtilsExists = await page.evaluate(() => typeof window.ColorUtils !== 'undefined');
        expect(colorUtilsExists).toBe(true);
        
        // Test shiftHue function
        const result = await page.evaluate(() => {
            const testColor = '#4a7c3c';
            const shifted = window.ColorUtils.shiftHue(testColor, 20);
            const zeroShift = window.ColorUtils.shiftHue(testColor, 0);
            const negativeShift = window.ColorUtils.shiftHue(testColor, -20);
            
            return {
                original: testColor,
                shifted: shifted,
                zeroShift: zeroShift,
                negativeShift: negativeShift,
                formatValid: /^#[0-9a-f]{6}$/.test(shifted),
                zeroMatches: testColor === zeroShift
            };
        });
        
        console.log('ColorUtils test results:', result);
        expect(result.formatValid).toBe(true);
        expect(result.zeroMatches).toBe(true);
    });
    
    test('should validate CanvasUtils drawing functions', async ({ page }) => {
        await page.goto('http://localhost:8081/tests/html/milestone1-utils-test.html');
        await page.waitForTimeout(500);
        
        const canvasUtilsExists = await page.evaluate(() => typeof window.CanvasUtils !== 'undefined');
        expect(canvasUtilsExists).toBe(true);
        
        // Test drawing functions don't throw errors
        const drawingResults = await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 20;
            canvas.height = 20;
            const ctx = canvas.getContext('2d');
            
            const results = {};
            
            try {
                window.CanvasUtils.drawEllipse(ctx, 10, 10, 5, 3, '#ff0000');
                results.ellipse = 'PASS';
            } catch (e) {
                results.ellipse = 'FAIL: ' + e.message;
            }
            
            try {
                window.CanvasUtils.drawLine(ctx, 0, 0, 10, 10, '#00ff00', 1);
                results.line = 'PASS';
            } catch (e) {
                results.line = 'FAIL: ' + e.message;
            }
            
            try {
                window.CanvasUtils.drawCurvedLine(ctx, 0, 10, 5, 5, 10, 10, '#0000ff', 1);
                results.curvedLine = 'PASS';
            } catch (e) {
                results.curvedLine = 'FAIL: ' + e.message;
            }
            
            return results;
        });
        
        console.log('CanvasUtils test results:', drawingResults);
        expect(drawingResults.ellipse).toBe('PASS');
        expect(drawingResults.line).toBe('PASS');
        expect(drawingResults.curvedLine).toBe('PASS');
    });
    
    test('should validate GeneticsUtils calculations', async ({ page }) => {
        await page.goto('http://localhost:8081/tests/html/milestone1-utils-test.html');
        await page.waitForTimeout(500);
        
        const geneticsUtilsExists = await page.evaluate(() => typeof window.GeneticsUtils !== 'undefined');
        expect(geneticsUtilsExists).toBe(true);
        
        // Test genetic calculations
        const calculations = await page.evaluate(() => {
            const results = {};
            
            // Dimension multiplier tests
            results.dimMult0 = window.GeneticsUtils.getDimensionMultiplier(0);
            results.dimMult127 = window.GeneticsUtils.getDimensionMultiplier(127);
            results.dimMult255 = window.GeneticsUtils.getDimensionMultiplier(255);
            
            // Foliage multiplier tests
            results.foliageMult0 = window.GeneticsUtils.getFoliageMultiplier(0);
            results.foliageMult127 = window.GeneticsUtils.getFoliageMultiplier(127);
            results.foliageMult255 = window.GeneticsUtils.getFoliageMultiplier(255);
            
            // Hue tint tests
            results.hueTint0 = window.GeneticsUtils.getHueTint(0);
            results.hueTint127 = window.GeneticsUtils.getHueTint(127);
            results.hueTint255 = window.GeneticsUtils.getHueTint(255);
            
            // Apply genetic dimensions tests
            const baseDims = { width: 40, height: 50 };
            const genetics = { heightFactor: 127, widthFactor: 127 };
            results.withGenetics = window.GeneticsUtils.applyGeneticDimensions(baseDims, genetics, 1.0);
            results.withoutGenetics = window.GeneticsUtils.applyGeneticDimensions(baseDims, null, 0.5);
            
            return results;
        });
        
        console.log('GeneticsUtils test results:', calculations);
        
        // Validate dimension multipliers (0.7 - 1.3 range)
        expect(calculations.dimMult0).toBeCloseTo(0.7, 1);
        expect(calculations.dimMult127).toBeCloseTo(1.0, 1);
        expect(calculations.dimMult255).toBeCloseTo(1.3, 1);
        
        // Validate foliage multipliers (0.6 - 1.4 range)
        expect(calculations.foliageMult0).toBeCloseTo(0.6, 1);
        expect(calculations.foliageMult127).toBeCloseTo(1.0, 1);
        expect(calculations.foliageMult255).toBeCloseTo(1.4, 1);
        
        // Validate hue tints (-20 to 20 range)
        expect(calculations.hueTint0).toBeCloseTo(-20, 0);
        expect(calculations.hueTint127).toBeCloseTo(0, 1);
        expect(calculations.hueTint255).toBeCloseTo(20, 0);
        
        // Validate dimension application
        expect(calculations.withGenetics.width).toBe(40); // ~1.0 multiplier * 1.0 size
        expect(calculations.withGenetics.height).toBe(50);
        expect(calculations.withoutGenetics.width).toBe(20); // 40 * 0.5
        expect(calculations.withoutGenetics.height).toBe(25); // 50 * 0.5
    });
});
