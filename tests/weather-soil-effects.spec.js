/**
 * Weather-Soil Integration Tests
 * 
 * Tests that verify weather effects on soil water levels:
 * - Rain increases soil water
 * - Sun evaporates soil water
 * - Cloudy weather has minimal evaporation
 */

import { test, expect } from '@playwright/test';
import { waitForRenderFrames, getGameMetrics } from './test-utils.js';

test.describe('Weather-Soil Effects', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
    });

    test('rain increases soil water levels', async ({ page }) => {
        // Sample multiple cells to account for varied initial water
        const testCells = [[0, 0], [1, 1], [-1, -1], [5, 5], [-5, -5]];
        
        // Get initial soil water levels
        const initialWaters = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.waterRetention : null;
            });
        }, testCells);
        
        const avgInitial = initialWaters.reduce((sum, w) => sum + (w || 0), 0) / initialWaters.length;
        console.log(`[TEST] Initial avg water: ${avgInitial.toFixed(2)}`);
        
        // Set weather to rainy with high intensity
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('rainy', timeManager.getCurrentDayPrecise());
        });
        
        // Wait for rain to take effect (advance time significantly)
        await page.evaluate(() => {
            const timeManager = window.graphicsEngine.timeManager;
            timeManager.setTimeScale(20.0); // Fast forward
        });
        
        // Wait for several frames to allow water changes
        await waitForRenderFrames(page, 120); // ~2 seconds at 60fps = ~0.4 game days at 20x speed
        
        // Get final soil water levels
        const finalWaters = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.waterRetention : null;
            });
        }, testCells);
        
        const avgFinal = finalWaters.reduce((sum, w) => sum + (w || 0), 0) / finalWaters.length;
        console.log(`[TEST] Final avg water: ${avgFinal.toFixed(2)}`);
        console.log(`[TEST] Water change: ${(avgFinal - avgInitial).toFixed(2)}`);
        
        // Verify water increased on average
        expect(avgFinal).toBeGreaterThan(avgInitial);
        
        // Verify the increase is reasonable (should be several points at 15/day rate)
        expect(avgFinal - avgInitial).toBeGreaterThan(1.0);
    });

    test('sunny weather evaporates soil water', async ({ page }) => {
        // Sample multiple cells
        const testCells = [[0, 0], [1, 1], [-1, -1], [5, 5], [-5, -5]];
        
        // First, set rainy weather to increase water from current levels
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('rainy', timeManager.getCurrentDayPrecise());
            timeManager.setTimeScale(20.0);
        });
        
        await waitForRenderFrames(page, 120);
        
        // Get water level after rain
        const rainedWaters = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.waterRetention : null;
            });
        }, testCells);
        
        const avgRained = rainedWaters.reduce((sum, w) => sum + (w || 0), 0) / rainedWaters.length;
        console.log(`[TEST] Avg water after rain: ${avgRained.toFixed(2)}`);
        
        // Change to sunny weather
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('sunny', timeManager.getCurrentDayPrecise());
        });
        
        // Wait for evaporation to occur
        await waitForRenderFrames(page, 120);
        
        // Get final water level
        const finalWaters = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.waterRetention : null;
            });
        }, testCells);
        
        const avgFinal = finalWaters.reduce((sum, w) => sum + (w || 0), 0) / finalWaters.length;
        console.log(`[TEST] Avg water after sun: ${avgFinal.toFixed(2)}`);
        console.log(`[TEST] Avg water lost: ${(avgRained - avgFinal).toFixed(2)}`);
        
        // Verify water decreased
        expect(avgFinal).toBeLessThan(avgRained);
        
        // Verify the decrease is reasonable (should be ~1-2 points at 5/day rate)
        expect(avgRained - avgFinal).toBeGreaterThan(0.5);
    });

    test('cloudy weather has minimal evaporation', async ({ page }) => {
        // Sample multiple cells
        const testCells = [[0, 0], [1, 1], [-1, -1], [5, 5], [-5, -5]];
        
        // First, set rainy weather to increase water
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('rainy', timeManager.getCurrentDayPrecise());
            timeManager.setTimeScale(20.0);
        });
        
        await waitForRenderFrames(page, 120);
        
        // Get water level after rain
        const rainedWaters = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.waterRetention : null;
            });
        }, testCells);
        
        const avgRained = rainedWaters.reduce((sum, w) => sum + (w || 0), 0) / rainedWaters.length;
        console.log(`[TEST] Avg water after rain: ${avgRained.toFixed(2)}`);
        
        // Change to cloudy weather
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('cloudy', timeManager.getCurrentDayPrecise());
        });
        
        // Wait for minimal evaporation
        await waitForRenderFrames(page, 120);
        
        // Get final water level
        const finalWaters = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.waterRetention : null;
            });
        }, testCells);
        
        const avgFinal = finalWaters.reduce((sum, w) => sum + (w || 0), 0) / finalWaters.length;
        console.log(`[TEST] Avg water after clouds: ${avgFinal.toFixed(2)}`);
        console.log(`[TEST] Avg water lost: ${(avgRained - avgFinal).toFixed(2)}`);
        
        // Verify water decreased (but only slightly)
        expect(avgFinal).toBeLessThan(avgRained);
        
        // Verify the decrease is small (should be ~0.4-0.8 points at 2/day rate)
        const waterLost = avgRained - avgFinal;
        expect(waterLost).toBeGreaterThan(0.1);
        expect(waterLost).toBeLessThan(2.0); // Should be less than sunny
    });

    test('rain intensity affects water increase rate', async ({ page }) => {
        // Sample multiple soil cells to get average behavior
        const testCells = [[0, 0], [1, 1], [-1, -1], [2, -2]];
        
        // Get initial average water
        const initialAvg = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            let sum = 0;
            cells.forEach(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                if (soil) sum += soil.waterRetention;
            });
            return sum / cells.length;
        }, testCells);
        
        console.log(`[TEST] Initial avg water: ${initialAvg.toFixed(2)}`);
        
        // Set rainy weather (random intensity)
        const rainIntensity = await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('rainy', timeManager.getCurrentDayPrecise());
            timeManager.setTimeScale(20.0);
            return weatherManager.getRainIntensity();
        });
        
        console.log(`[TEST] Rain intensity: ${rainIntensity.toFixed(2)}`);
        
        // Wait for water to accumulate
        await waitForRenderFrames(page, 120);
        
        // Get final average water
        const finalAvg = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            let sum = 0;
            cells.forEach(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                if (soil) sum += soil.waterRetention;
            });
            return sum / cells.length;
        }, testCells);
        
        console.log(`[TEST] Final avg water: ${finalAvg.toFixed(2)}`);
        const waterIncrease = finalAvg - initialAvg;
        console.log(`[TEST] Water increase: ${waterIncrease.toFixed(2)}`);
        
        // Verify water increased proportional to intensity
        expect(waterIncrease).toBeGreaterThan(0);
        
        // Expected increase: ~15/day * intensity * 0.4 days = ~6 * intensity
        const expectedMin = 2.0 * rainIntensity;
        const expectedMax = 10.0 * rainIntensity;
        
        console.log(`[TEST] Expected range: ${expectedMin.toFixed(2)} - ${expectedMax.toFixed(2)}`);
        expect(waterIncrease).toBeGreaterThan(expectedMin);
        expect(waterIncrease).toBeLessThan(expectedMax);
    });

    test('weather effects are visible across entire map', async ({ page }) => {
        // Set to rainy
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('rainy', timeManager.getCurrentDayPrecise());
            timeManager.setTimeScale(20.0);
        });
        
        // Sample cells from different regions
        const sampleCells = [
            [0, 0],      // Center
            [10, 10],    // Top-right
            [-10, -10],  // Bottom-left
            [10, -10],   // Top-left
            [-10, 10]    // Bottom-right
        ];
        
        // Get initial water levels
        const initialWaters = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.waterRetention : null;
            });
        }, sampleCells);
        
        // Wait for rain
        await waitForRenderFrames(page, 120);
        
        // Get final water levels
        const finalWaters = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.waterRetention : null;
            });
        }, sampleCells);
        
        // Verify all cells increased
        for (let i = 0; i < sampleCells.length; i++) {
            console.log(`[TEST] Cell ${sampleCells[i]}: ${initialWaters[i]?.toFixed(2)} → ${finalWaters[i]?.toFixed(2)}`);
            
            if (initialWaters[i] !== null && finalWaters[i] !== null) {
                expect(finalWaters[i]).toBeGreaterThan(initialWaters[i]);
            }
        }
    });
});
