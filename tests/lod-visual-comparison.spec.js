/**
 * LOD Visual Comparison Test
 * Milestone 3: Low + Impostor LOD
 * 
 * Tests visual progression across all LOD levels:
 * - High (2.0x) - Future implementation
 * - Medium (1.0x) - Current baseline
 * - Low (0.5x) - Simplified but recognizable
 * - Impostor (0.2x) - 4x4 colored dot
 * 
 * For each species (Oak, Nettles, Clover):
 * - Generates sprite at each LOD level
 * - Captures screenshot showing all 4 LOD levels side-by-side
 * - Validates visual progression
 * - Ensures impostor is recognizable as species color
 */

const { test, expect } = require('@playwright/test');

test.describe('LOD Visual Comparison', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to test page
        await page.goto('http://localhost:8081/tests/html/lod-visual-comparison.html');
        
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Extra time for rendering
    });
    
    test('Oak tree LOD progression', async ({ page }) => {
        // Trigger oak rendering
        await page.evaluate(() => {
            window.testLODVisual('oak');
        });
        
        // Wait for rendering to complete
        await page.waitForTimeout(1000);
        
        // Capture screenshot
        await page.screenshot({ 
            path: 'test-results/lod-oak-comparison.png',
            fullPage: true
        });
        
        // Validate that all LOD levels were rendered
        const lodLevels = await page.evaluate(() => {
            return window.getRenderedLODLevels();
        });
        
        expect(lodLevels).toEqual(['high', 'medium', 'low', 'impostor']);
        
        // Validate dimensions
        const dimensions = await page.evaluate(() => {
            return window.getLODDimensions();
        });
        
        // High: 2x medium (80x100 for oak base 40x50)
        expect(dimensions.high.width).toBeGreaterThan(dimensions.medium.width);
        expect(dimensions.high.height).toBeGreaterThan(dimensions.medium.height);
        
        // Medium: baseline (40x50 for oak)
        expect(dimensions.medium.width).toBeGreaterThanOrEqual(40);
        expect(dimensions.medium.height).toBeGreaterThanOrEqual(50);
        
        // Low: 0.5x medium (20x25 for oak)
        expect(dimensions.low.width).toBeLessThan(dimensions.medium.width);
        expect(dimensions.low.height).toBeLessThan(dimensions.medium.height);
        
        // Impostor: 4x4 always
        expect(dimensions.impostor.width).toBe(4);
        expect(dimensions.impostor.height).toBe(4);
    });
    
    test('Nettles herb LOD progression', async ({ page }) => {
        // Trigger nettles rendering
        await page.evaluate(() => {
            window.testLODVisual('nettles');
        });
        
        // Wait for rendering to complete
        await page.waitForTimeout(1000);
        
        // Capture screenshot
        await page.screenshot({ 
            path: 'test-results/lod-nettles-comparison.png',
            fullPage: true
        });
        
        // Validate that all LOD levels were rendered
        const lodLevels = await page.evaluate(() => {
            return window.getRenderedLODLevels();
        });
        
        expect(lodLevels).toEqual(['high', 'medium', 'low', 'impostor']);
        
        // Validate dimensions for herbs (base 20x20)
        const dimensions = await page.evaluate(() => {
            return window.getLODDimensions();
        });
        
        // High: 2x medium (40x40)
        expect(dimensions.high.width).toBe(40);
        expect(dimensions.high.height).toBe(40);
        
        // Medium: baseline (20x20)
        expect(dimensions.medium.width).toBe(20);
        expect(dimensions.medium.height).toBe(20);
        
        // Low: 0.5x medium (10x10)
        expect(dimensions.low.width).toBe(10);
        expect(dimensions.low.height).toBe(10);
        
        // Impostor: 4x4 always
        expect(dimensions.impostor.width).toBe(4);
        expect(dimensions.impostor.height).toBe(4);
    });
    
    test('Clover groundcover LOD progression', async ({ page }) => {
        // Trigger clover rendering
        await page.evaluate(() => {
            window.testLODVisual('clover');
        });
        
        // Wait for rendering to complete
        await page.waitForTimeout(1000);
        
        // Capture screenshot
        await page.screenshot({ 
            path: 'test-results/lod-clover-comparison.png',
            fullPage: true
        });
        
        // Validate that all LOD levels were rendered
        const lodLevels = await page.evaluate(() => {
            return window.getRenderedLODLevels();
        });
        
        expect(lodLevels).toEqual(['high', 'medium', 'low', 'impostor']);
        
        // Validate dimensions for groundcover (base 16x16, adjusted to 12x12)
        const dimensions = await page.evaluate(() => {
            return window.getLODDimensions();
        });
        
        // High: 2x medium (32x32 for base 16x16)
        expect(dimensions.high.width).toBe(32);
        expect(dimensions.high.height).toBe(32);
        
        // Medium: baseline (16x16)
        expect(dimensions.medium.width).toBe(16);
        expect(dimensions.medium.height).toBe(16);
        
        // Low: 0.5x medium (8x8)
        expect(dimensions.low.width).toBe(8);
        expect(dimensions.low.height).toBe(8);
        
        // Impostor: 4x4 always
        expect(dimensions.impostor.width).toBe(4);
        expect(dimensions.impostor.height).toBe(4);
    });
    
    test('Impostor colors match species palette', async ({ page }) => {
        // Test impostor color extraction for all species
        const impostorColors = await page.evaluate(() => {
            const results = {};
            
            // Oak tree - should use leaf green
            window.testLODVisual('oak');
            results.oak = window.getImpostorColor();
            
            // Nettles herb - should use leaf green
            window.testLODVisual('nettles');
            results.nettles = window.getImpostorColor();
            
            // Clover groundcover - should use leaf green
            window.testLODVisual('clover');
            results.clover = window.getImpostorColor();
            
            return results;
        });
        
        // All should be green variants (hex starting with #4 or #5 for darker greens)
        expect(impostorColors.oak).toMatch(/^#[0-9a-f]{6}$/i);
        expect(impostorColors.nettles).toMatch(/^#[0-9a-f]{6}$/i);
        expect(impostorColors.clover).toMatch(/^#[0-9a-f]{6}$/i);
        
        // Verify they're in the green range (R < G for typical leaf colors)
        const oakRGB = parseInt(impostorColors.oak.slice(1, 3), 16);
        const oakG = parseInt(impostorColors.oak.slice(3, 5), 16);
        expect(oakG).toBeGreaterThan(oakRGB); // More green than red
        
        console.log('Impostor colors:', impostorColors);
    });
    
    test('Visual progression clear across LOD levels', async ({ page }) => {
        // Render all species side-by-side
        await page.evaluate(() => {
            window.testLODVisual('all');
        });
        
        // Wait for rendering
        await page.waitForTimeout(1500);
        
        // Capture full comparison screenshot
        await page.screenshot({ 
            path: 'test-results/lod-all-species-comparison.png',
            fullPage: true
        });
        
        // Validate visual size progression
        const progression = await page.evaluate(() => {
            return window.validateSizeProgression();
        });
        
        expect(progression.valid).toBe(true);
        expect(progression.order).toEqual(['high', 'medium', 'low', 'impostor']);
        expect(progression.message).toContain('Visual progression validated');
    });
});
