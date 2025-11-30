/**
 * Nitrogen Regeneration Tests
 * 
 * Tests that verify weather effects on soil nitrogen levels:
 * - Rain restores nitrogen through atmospheric deposition
 * - Nitrogen regeneration scales with rain intensity
 * - Ecosystem stability improved (prevents collapse)
 */

import { test, expect } from '@playwright/test';
import { waitForRenderFrames } from './test-utils.js';

test.describe('Nitrogen Regeneration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
    });

    test('rain restores nitrogen to soil', async ({ page }) => {
        // Sample multiple cells to get average behavior
        const testCells = [[0, 0], [1, 1], [-1, -1], [5, 5], [-5, -5]];
        
        // Get initial nitrogen levels
        const initialNitrogen = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.nitrogen : null;
            });
        }, testCells);
        
        const avgInitial = initialNitrogen.reduce((sum, n) => sum + (n || 0), 0) / initialNitrogen.length;
        console.log(`[TEST] Initial avg nitrogen: ${avgInitial.toFixed(2)}`);
        
        // Set weather to rainy
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('rainy', timeManager.getCurrentDayPrecise());
            timeManager.setTimeScale(20.0); // Fast forward
        });
        
        // Wait for nitrogen to accumulate (longer than water tests)
        await waitForRenderFrames(page, 180); // ~3 seconds = ~0.6 game days at 20x
        
        // Get final nitrogen levels
        const finalNitrogen = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.nitrogen : null;
            });
        }, testCells);
        
        const avgFinal = finalNitrogen.reduce((sum, n) => sum + (n || 0), 0) / finalNitrogen.length;
        console.log(`[TEST] Final avg nitrogen: ${avgFinal.toFixed(2)}`);
        console.log(`[TEST] Nitrogen change: ${(avgFinal - avgInitial).toFixed(2)}`);
        
        // Verify nitrogen increased
        expect(avgFinal).toBeGreaterThan(avgInitial);
        
        // Verify the increase is reasonable (at 0.8/day, 0.6 days = ~0.48)
        const nitrogenGain = avgFinal - avgInitial;
        expect(nitrogenGain).toBeGreaterThan(0.1);
        expect(nitrogenGain).toBeLessThan(2.0); // Shouldn't be massive
    });

    test('nitrogen regeneration scales with rain intensity', async ({ page }) => {
        const testCells = [[0, 0], [1, 1], [-1, -1]];
        
        // Get initial nitrogen
        const initialNitrogen = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.nitrogen : null;
            });
        }, testCells);
        
        const avgInitial = initialNitrogen.reduce((sum, n) => sum + (n || 0), 0) / initialNitrogen.length;
        console.log(`[TEST] Initial avg nitrogen: ${avgInitial.toFixed(2)}`);
        
        // Set rainy weather and get intensity
        const rainIntensity = await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('rainy', timeManager.getCurrentDayPrecise());
            timeManager.setTimeScale(20.0);
            return weatherManager.getRainIntensity();
        });
        
        console.log(`[TEST] Rain intensity: ${rainIntensity.toFixed(2)}`);
        
        // Wait for nitrogen accumulation
        await waitForRenderFrames(page, 180);
        
        // Get final nitrogen
        const finalNitrogen = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.nitrogen : null;
            });
        }, testCells);
        
        const avgFinal = finalNitrogen.reduce((sum, n) => sum + (n || 0), 0) / finalNitrogen.length;
        const nitrogenGain = avgFinal - avgInitial;
        
        console.log(`[TEST] Final avg nitrogen: ${avgFinal.toFixed(2)}`);
        console.log(`[TEST] Nitrogen gain: ${nitrogenGain.toFixed(2)}`);
        
        // Expected: 0.8 N/day * intensity * 0.6 days = ~0.48 * intensity
        const expectedMin = 0.2 * rainIntensity;
        const expectedMax = 1.5 * rainIntensity;
        
        console.log(`[TEST] Expected range: ${expectedMin.toFixed(2)} - ${expectedMax.toFixed(2)}`);
        
        expect(nitrogenGain).toBeGreaterThan(expectedMin);
        expect(nitrogenGain).toBeLessThan(expectedMax);
    });

    test('sunny weather does not affect nitrogen', async ({ page }) => {
        const testCells = [[0, 0], [1, 1], [-1, -1]];
        
        // Get initial nitrogen
        const initialNitrogen = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.nitrogen : null;
            });
        }, testCells);
        
        const avgInitial = initialNitrogen.reduce((sum, n) => sum + (n || 0), 0) / initialNitrogen.length;
        console.log(`[TEST] Initial avg nitrogen: ${avgInitial.toFixed(2)}`);
        
        // Set sunny weather
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('sunny', timeManager.getCurrentDayPrecise());
            timeManager.setTimeScale(20.0);
        });
        
        // Wait same duration
        await waitForRenderFrames(page, 180);
        
        // Get final nitrogen
        const finalNitrogen = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.nitrogen : null;
            });
        }, testCells);
        
        const avgFinal = finalNitrogen.reduce((sum, n) => sum + (n || 0), 0) / finalNitrogen.length;
        
        console.log(`[TEST] Final avg nitrogen: ${avgFinal.toFixed(2)}`);
        console.log(`[TEST] Nitrogen change: ${(avgFinal - avgInitial).toFixed(2)}`);
        
        // Nitrogen should be unchanged (or within floating point error)
        expect(Math.abs(avgFinal - avgInitial)).toBeLessThan(0.01);
    });

    test('nitrogen regeneration visible across map', async ({ page }) => {
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
        
        // Get initial nitrogen levels
        const initialNitrogen = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.nitrogen : null;
            });
        }, sampleCells);
        
        // Wait for rain
        await waitForRenderFrames(page, 180);
        
        // Get final nitrogen levels
        const finalNitrogen = await page.evaluate((cells) => {
            const soilManager = window.graphicsEngine.soilManager;
            return cells.map(([x, y]) => {
                const soil = soilManager.getSoilAt(x, y);
                return soil ? soil.nitrogen : null;
            });
        }, sampleCells);
        
        // Verify all cells increased
        let allIncreased = true;
        for (let i = 0; i < sampleCells.length; i++) {
            console.log(`[TEST] Cell ${sampleCells[i]}: ${initialNitrogen[i]?.toFixed(2)} → ${finalNitrogen[i]?.toFixed(2)}`);
            
            if (initialNitrogen[i] !== null && finalNitrogen[i] !== null) {
                if (finalNitrogen[i] <= initialNitrogen[i]) {
                    allIncreased = false;
                }
                expect(finalNitrogen[i]).toBeGreaterThan(initialNitrogen[i]);
            }
        }
        
        expect(allIncreased).toBe(true);
    });

    test('fertility increases with nitrogen regeneration', async ({ page }) => {
        const testCell = [0, 0];
        
        // Get initial fertility
        const initialData = await page.evaluate((cell) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(cell[0], cell[1]);
            return soil ? {
                nitrogen: soil.nitrogen,
                fertility: soil.fertility
            } : null;
        }, testCell);
        
        expect(initialData).not.toBeNull();
        console.log(`[TEST] Initial - N: ${initialData.nitrogen.toFixed(2)}, Fertility: ${initialData.fertility.toFixed(2)}`);
        
        // Set rainy weather
        await page.evaluate(() => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            weatherManager.setWeather('rainy', timeManager.getCurrentDayPrecise());
            timeManager.setTimeScale(20.0);
        });
        
        // Wait for regeneration
        await waitForRenderFrames(page, 180);
        
        // Get final data
        const finalData = await page.evaluate((cell) => {
            const soilManager = window.graphicsEngine.soilManager;
            const soil = soilManager.getSoilAt(cell[0], cell[1]);
            return soil ? {
                nitrogen: soil.nitrogen,
                fertility: soil.fertility
            } : null;
        }, testCell);
        
        expect(finalData).not.toBeNull();
        console.log(`[TEST] Final - N: ${finalData.nitrogen.toFixed(2)}, Fertility: ${finalData.fertility.toFixed(2)}`);
        
        // Verify both increased
        expect(finalData.nitrogen).toBeGreaterThan(initialData.nitrogen);
        expect(finalData.fertility).toBeGreaterThan(initialData.fertility);
        
        // Verify fertility change is reasonable (nitrogen is 1/4 of fertility)
        const nitrogenIncrease = finalData.nitrogen - initialData.nitrogen;
        const fertilityIncrease = finalData.fertility - initialData.fertility;
        
        console.log(`[TEST] N increase: ${nitrogenIncrease.toFixed(2)}, Fertility increase: ${fertilityIncrease.toFixed(2)}`);
        
        // Fertility should increase by roughly nitrogenIncrease / 4
        const expectedFertilityIncrease = nitrogenIncrease / 4;
        expect(Math.abs(fertilityIncrease - expectedFertilityIncrease)).toBeLessThan(0.5);
    });
});
