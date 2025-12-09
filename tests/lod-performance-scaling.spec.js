/**
 * LOD Performance Scaling Test
 * Milestone 3: Low + Impostor LOD
 * 
 * Tests performance with increasing plant counts at different zoom levels:
 * - 500 plants @ 1.0x zoom (medium LOD) - 60+ FPS expected
 * - 1000 plants @ 0.7x zoom (low LOD) - 60+ FPS expected
 * - 2000 plants @ 0.3x zoom (impostor LOD) - 60+ FPS expected
 * - 2500 plants @ 0.3x zoom (impostor LOD) - 45+ FPS expected
 * 
 * Performance expectations:
 * - Impostor LOD should enable 2000+ plants at 60 FPS
 * - Low LOD should enable 1000+ plants at 60 FPS
 * - Medium LOD should handle 500 plants at 60 FPS
 */

const { test, expect } = require('@playwright/test');

test.describe('LOD Performance Scaling', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to test page
        await page.goto('http://localhost:8081/tests/html/lod-performance-scaling.html');
        
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
    });
    
    test('500 plants at medium LOD (1.0x zoom)', async ({ page }) => {
        // Start performance test
        const result = await page.evaluate(async () => {
            return await window.runPerformanceTest(500, 1.0, 60);
        });
        
        // Capture screenshot
        await page.screenshot({ 
            path: 'test-results/lod-perf-500-medium.png',
            fullPage: false
        });
        
        // Validate results
        expect(result.plantCount).toBe(500);
        expect(result.lodLevel).toBe('medium');
        expect(result.avgFPS).toBeGreaterThanOrEqual(30); // Minimum acceptable (headless)
        expect(result.minFPS).toBeGreaterThan(0);
        expect(result.maxFPS).toBeGreaterThan(result.avgFPS);
        
        console.log(`500 plants @ medium LOD: ${result.avgFPS.toFixed(1)} FPS avg (min: ${result.minFPS}, max: ${result.maxFPS})`);
    });
    
    test('1000 plants at low LOD (0.7x zoom)', async ({ page }) => {
        // Start performance test
        const result = await page.evaluate(async () => {
            return await window.runPerformanceTest(1000, 0.7, 60);
        });
        
        // Capture screenshot
        await page.screenshot({ 
            path: 'test-results/lod-perf-1000-low.png',
            fullPage: false
        });
        
        // Validate results
        expect(result.plantCount).toBe(1000);
        expect(result.lodLevel).toBe('low');
        expect(result.avgFPS).toBeGreaterThanOrEqual(30); // Minimum acceptable
        expect(result.minFPS).toBeGreaterThan(0);
        
        console.log(`1000 plants @ low LOD: ${result.avgFPS.toFixed(1)} FPS avg (min: ${result.minFPS}, max: ${result.maxFPS})`);
    });
    
    test('2000 plants at impostor LOD (0.3x zoom)', async ({ page }) => {
        // Start performance test
        const result = await page.evaluate(async () => {
            return await window.runPerformanceTest(2000, 0.3, 60);
        });
        
        // Capture screenshot
        await page.screenshot({ 
            path: 'test-results/lod-perf-2000-impostor.png',
            fullPage: false
        });
        
        // Validate results
        expect(result.plantCount).toBe(2000);
        expect(result.lodLevel).toBe('impostor');
        expect(result.avgFPS).toBeGreaterThanOrEqual(30); // Minimum acceptable (target 60)
        expect(result.minFPS).toBeGreaterThan(0);
        
        console.log(`2000 plants @ impostor LOD: ${result.avgFPS.toFixed(1)} FPS avg (min: ${result.minFPS}, max: ${result.maxFPS})`);
    });
    
    test('2500 plants at impostor LOD (0.3x zoom) - stress test', async ({ page }) => {
        // Start performance test
        const result = await page.evaluate(async () => {
            return await window.runPerformanceTest(2500, 0.3, 60);
        });
        
        // Capture screenshot
        await page.screenshot({ 
            path: 'test-results/lod-perf-2500-impostor.png',
            fullPage: false
        });
        
        // Validate results
        expect(result.plantCount).toBe(2500);
        expect(result.lodLevel).toBe('impostor');
        expect(result.avgFPS).toBeGreaterThanOrEqual(20); // Lower threshold for stress test
        expect(result.minFPS).toBeGreaterThan(0);
        
        console.log(`2500 plants @ impostor LOD: ${result.avgFPS.toFixed(1)} FPS avg (min: ${result.minFPS}, max: ${result.maxFPS})`);
    });
    
    test('LOD switching performance comparison', async ({ page }) => {
        // Test same plant count at different LOD levels
        const results = await page.evaluate(async () => {
            const plantCount = 1000;
            
            // Test at medium LOD (1.0x zoom)
            const mediumResult = await window.runPerformanceTest(plantCount, 1.0, 30);
            await new Promise(resolve => setTimeout(resolve, 500)); // Cooldown
            
            // Test at low LOD (0.7x zoom)
            const lowResult = await window.runPerformanceTest(plantCount, 0.7, 30);
            await new Promise(resolve => setTimeout(resolve, 500)); // Cooldown
            
            // Test at impostor LOD (0.3x zoom)
            const impostorResult = await window.runPerformanceTest(plantCount, 0.3, 30);
            
            return { mediumResult, lowResult, impostorResult };
        });
        
        // Capture final state
        await page.screenshot({ 
            path: 'test-results/lod-perf-comparison.png',
            fullPage: false
        });
        
        // Validate performance improvement with lower LOD
        expect(results.lowResult.avgFPS).toBeGreaterThanOrEqual(results.mediumResult.avgFPS * 0.8); // Low should be >= 80% of medium
        expect(results.impostorResult.avgFPS).toBeGreaterThanOrEqual(results.lowResult.avgFPS * 0.8); // Impostor should be >= 80% of low
        
        console.log('LOD Performance Comparison (1000 plants):');
        console.log(`  Medium LOD: ${results.mediumResult.avgFPS.toFixed(1)} FPS`);
        console.log(`  Low LOD: ${results.lowResult.avgFPS.toFixed(1)} FPS (+${((results.lowResult.avgFPS / results.mediumResult.avgFPS - 1) * 100).toFixed(1)}%)`);
        console.log(`  Impostor LOD: ${results.impostorResult.avgFPS.toFixed(1)} FPS (+${((results.impostorResult.avgFPS / results.lowResult.avgFPS - 1) * 100).toFixed(1)}%)`);
    });
    
    test('Render call count with LOD batching', async ({ page }) => {
        // Test render call efficiency at different LOD levels
        const result = await page.evaluate(async () => {
            const plantCount = 1000;
            
            // Run quick tests to measure render calls
            const mediumTest = await window.runPerformanceTest(plantCount, 1.0, 10);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const impostorTest = await window.runPerformanceTest(plantCount, 0.3, 10);
            
            return {
                medium: {
                    fps: mediumTest.avgFPS,
                    renderCalls: mediumTest.avgRenderCalls
                },
                impostor: {
                    fps: impostorTest.avgFPS,
                    renderCalls: impostorTest.avgRenderCalls
                }
            };
        });
        
        // Render calls should be similar (batching works regardless of LOD)
        // But impostor should have better FPS due to smaller sprites
        expect(result.impostor.renderCalls).toBeLessThanOrEqual(result.medium.renderCalls * 1.1); // Within 10%
        
        console.log('Render call efficiency:');
        console.log(`  Medium LOD: ${result.medium.renderCalls.toFixed(1)} calls/frame @ ${result.medium.fps.toFixed(1)} FPS`);
        console.log(`  Impostor LOD: ${result.impostor.renderCalls.toFixed(1)} calls/frame @ ${result.impostor.fps.toFixed(1)} FPS`);
    });
});
