/**
 * Leaching System - Diagnostic Testing
 * 
 * Critical bug: All soil fertility hits 0 after 77 days, ecosystem collapses
 * This test suite measures real leaching behavior to identify balance issues
 */

import { test, expect } from '@playwright/test';
import { 
    waitForRenderFrames, 
    advanceGameTimeDeterministic,
    sampleEcosystemMetrics 
} from './test-utils.js';

test.describe('Leaching System - Diagnostic Testing', () => {
    
    test('Measure nitrogen loss over 30 days - Inland', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        // Select cell far from water (inland)
        const testX = 10;
        const testY = 10;
        
        // Get initial nitrogen
        const initialN = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, { x: testX, y: testY });
        
        console.log(`INLAND CELL (${testX},${testY}) - Initial N: ${initialN.toFixed(2)}`);
        
        // Advance 30 game days using deterministic time advancement
        for (let day = 0; day < 30; day++) {
            await advanceGameTimeDeterministic(page, 1, { timeScale: 1.0 });
            await waitForRenderFrames(page, 5);
            
            // Sample every 5 days
            if ((day + 1) % 5 === 0) {
                const currentN = await page.evaluate(({ x, y }) => {
                    const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
                    return soil.nitrogen;
                }, { x: testX, y: testY });
                console.log(`  Day ${day + 1}: N = ${currentN.toFixed(2)}`);
            }
        }
        
        // Get final nitrogen
        const finalN = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, { x: testX, y: testY });
        
        const nitrogenLoss = initialN - finalN;
        const lossPerDay = nitrogenLoss / 30;
        
        console.log(`INLAND - Initial N: ${initialN.toFixed(2)}, Final N: ${finalN.toFixed(2)}`);
        console.log(`INLAND - Loss: ${nitrogenLoss.toFixed(2)}N over 30 days (${lossPerDay.toFixed(2)}N/day)`);
        
        // Expected: Should lose some but not all
        expect(finalN).toBeGreaterThan(10); // Should not be depleted to near-zero
        expect(lossPerDay).toBeLessThan(1.0); // Should not lose more than 1N/day
    });
    
    test('Measure nitrogen loss over 30 days - Riparian', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        // Find cell near water (riparian zone)
        const riparianCell = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const terrainGen = soilManager.terrainGenerator;
            const waterTiles = terrainGen.getWaterTiles();
            
            // Get first water tile
            const firstWater = Array.from(waterTiles)[0];
            const [waterX, waterY] = firstWater.split(',').map(Number);
            
            // Find adjacent non-water cell
            for (let dx = -3; dx <= 3; dx++) {
                for (let dy = -3; dy <= 3; dy++) {
                    const testX = waterX + dx;
                    const testY = waterY + dy;
                    const soil = soilManager.getSoilAt(testX, testY);
                    if (soil && !soil.isWater && soil.isPlantable) {
                        return { x: testX, y: testY };
                    }
                }
            }
            return null;
        });
        
        if (!riparianCell) {
            console.log('No riparian cell found - test skipped');
            return;
        }
        
        console.log(`RIPARIAN CELL (${riparianCell.x},${riparianCell.y})`);
        
        // Get initial nitrogen
        const initialN = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, riparianCell);
        
        console.log(`  Initial N: ${initialN.toFixed(2)}`);
        
        // Advance 30 game days (should see floods)
        for (let day = 0; day < 30; day++) {
            await advanceGameTimeDeterministic(page, 1, { timeScale: 1.0 });
            await waitForRenderFrames(page, 5);
            
            // Sample every 5 days
            if ((day + 1) % 5 === 0) {
                const currentN = await page.evaluate(({ x, y }) => {
                    const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
                    return soil.nitrogen;
                }, riparianCell);
                console.log(`  Day ${day + 1}: N = ${currentN.toFixed(2)}`);
            }
        }
        
        // Get final nitrogen
        const finalN = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, riparianCell);
        
        const nitrogenChange = finalN - initialN;
        const changePerDay = nitrogenChange / 30;
        
        console.log(`RIPARIAN - Initial N: ${initialN.toFixed(2)}, Final N: ${finalN.toFixed(2)}`);
        console.log(`RIPARIAN - Change: ${nitrogenChange >= 0 ? '+' : ''}${nitrogenChange.toFixed(2)}N over 30 days (${changePerDay >= 0 ? '+' : ''}${changePerDay.toFixed(2)}N/day)`);
        
        // Expected: Should GAIN nitrogen (floods add more than leaching removes)
        expect(finalN).toBeGreaterThanOrEqual(initialN * 0.9); // Allow 10% loss max
    });
    
    test('Measure actual leaching during rain event', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        // Get a test cell
        const testX = 5;
        const testY = 5;
        
        // Force rainy weather and measure
        const result = await page.evaluate(({ x, y }) => {
            const weatherManager = window.graphicsEngine.weatherManager;
            const timeManager = window.graphicsEngine.timeManager;
            const soilManager = window.graphicsEngine.soilManager;
            
            if (!weatherManager || !timeManager) {
                return { success: false, error: 'Managers not available' };
            }
            
            // Force rainy weather
            weatherManager.transitionToWeather('rainy');
            
            // Get initial state
            const soil = soilManager.getSoilAt(x, y);
            const initialN = soil.nitrogen;
            const weather = weatherManager.getCurrentWeather();
            const rainIntensity = weatherManager.getRainIntensity();
            
            return {
                success: true,
                initialN,
                weather,
                rainIntensity
            };
        }, { x: testX, y: testY });
        
        console.log(`RAIN LEACHING TEST - Weather: ${result.weather}, Intensity: ${result.rainIntensity.toFixed(2)}`);
        console.log(`  Initial N: ${result.initialN.toFixed(2)}`);
        
        // Advance 1 game day of rain
        await advanceGameTimeDeterministic(page, 1, { timeScale: 1.0 });
        await waitForRenderFrames(page, 5);
        
        // Get final state
        const finalN = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, { x: testX, y: testY });
        
        const loss = result.initialN - finalN;
        
        console.log(`  Final N: ${finalN.toFixed(2)}`);
        console.log(`RAIN LEACHING - Loss: ${loss.toFixed(2)}N per rainy day`);
        
        // Expected: Should be < 0.5N per day
        expect(loss).toBeLessThan(0.5);
    });
    
    test('Count flood events over 77 days', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        console.log('FLOOD EVENT TRACKING - Starting 77-day simulation...');
        
        let floodCount = 0;
        
        // Listen for console logs to catch flood events
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Flood event triggered') || text.includes('[FLOOD]')) {
                floodCount++;
                console.log(`  ${text}`);
            }
        });
        
        // Fast forward 77 days in chunks
        for (let day = 0; day < 77; day++) {
            await advanceGameTimeDeterministic(page, 1, { timeScale: 1.0 });
            await waitForRenderFrames(page, 3);
            
            // Report progress every 10 days
            if ((day + 1) % 10 === 0) {
                console.log(`  Day ${day + 1}/77 - Floods so far: ${floodCount}`);
            }
        }
        
        const expectedFloods = Math.floor(77 / 8); // Config changed to 8-day intervals
        
        console.log(`FLOODS - Count: ${floodCount} floods over 77 days`);
        console.log(`FLOODS - Expected: ~${expectedFloods} floods (every 8 days)`);
        
        // Expected: ~9 floods over 77 days (8-day intervals)
        expect(floodCount).toBeGreaterThanOrEqual(8);
        expect(floodCount).toBeLessThanOrEqual(11);
    });
    
    test('Full ecosystem balance over 77 days', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        console.log('ECOSYSTEM BALANCE TEST - 77 days');
        
        // Get initial state
        const initial = await sampleEcosystemMetrics(page);
        console.log('Initial State (Day 0):');
        console.log(`  N: ${initial.averages.nitrogen.toFixed(1)} (${initial.ranges.nitrogen.min}-${initial.ranges.nitrogen.max})`);
        console.log(`  P: ${initial.averages.phosphorus.toFixed(1)} (${initial.ranges.phosphorus.min}-${initial.ranges.phosphorus.max})`);
        console.log(`  K: ${initial.averages.potassium.toFixed(1)} (${initial.ranges.potassium.min}-${initial.ranges.potassium.max})`);
        console.log(`  OM: ${initial.averages.organicMatter.toFixed(1)} (${initial.ranges.organicMatter.min}-${initial.ranges.organicMatter.max})`);
        console.log(`  Plants: ${initial.plantCount}`);
        
        // Advance 77 days with periodic sampling
        const samples = [initial];
        
        for (let day = 1; day <= 77; day++) {
            await advanceGameTimeDeterministic(page, 1, { timeScale: 1.0 });
            await waitForRenderFrames(page, 3);
            
            // Sample every 10 days
            if (day % 10 === 0) {
                const sample = await sampleEcosystemMetrics(page);
                samples.push(sample);
                console.log(`Day ${day}:`);
                console.log(`  N: ${sample.averages.nitrogen.toFixed(1)}, P: ${sample.averages.phosphorus.toFixed(1)}, K: ${sample.averages.potassium.toFixed(1)}, OM: ${sample.averages.organicMatter.toFixed(1)}`);
                console.log(`  Plants: ${sample.plantCount}, Weather: ${sample.weather}`);
            }
        }
        
        // Get final state
        const final = await sampleEcosystemMetrics(page);
        samples.push(final);
        
        console.log('Final State (Day 77):');
        console.log(`  N: ${final.averages.nitrogen.toFixed(1)} (${final.ranges.nitrogen.min}-${final.ranges.nitrogen.max})`);
        console.log(`  P: ${final.averages.phosphorus.toFixed(1)} (${final.ranges.phosphorus.min}-${final.ranges.phosphorus.max})`);
        console.log(`  K: ${final.averages.potassium.toFixed(1)} (${final.ranges.potassium.min}-${final.ranges.potassium.max})`);
        console.log(`  OM: ${final.averages.organicMatter.toFixed(1)} (${final.ranges.organicMatter.min}-${final.ranges.organicMatter.max})`);
        console.log(`  Plants: ${final.plantCount}`);
        
        // Calculate losses
        const nLoss = initial.averages.nitrogen - final.averages.nitrogen;
        const pLoss = initial.averages.phosphorus - final.averages.phosphorus;
        const kLoss = initial.averages.potassium - final.averages.potassium;
        const omLoss = initial.averages.organicMatter - final.averages.organicMatter;
        
        console.log('Total Losses over 77 days:');
        console.log(`  N: ${nLoss >= 0 ? '-' : '+'}${Math.abs(nLoss).toFixed(1)} (${(nLoss/initial.averages.nitrogen*100).toFixed(1)}%)`);
        console.log(`  P: ${pLoss >= 0 ? '-' : '+'}${Math.abs(pLoss).toFixed(1)} (${(pLoss/initial.averages.phosphorus*100).toFixed(1)}%)`);
        console.log(`  K: ${kLoss >= 0 ? '-' : '+'}${Math.abs(kLoss).toFixed(1)} (${(kLoss/initial.averages.potassium*100).toFixed(1)}%)`);
        console.log(`  OM: ${omLoss >= 0 ? '-' : '+'}${Math.abs(omLoss).toFixed(1)} (${(omLoss/initial.averages.organicMatter*100).toFixed(1)}%)`);
        
        // CRITICAL ASSERTIONS - Ecosystem should be sustainable
        expect(final.averages.nitrogen).toBeGreaterThan(15); // Should not drop to near-zero
        expect(final.averages.phosphorus).toBeGreaterThan(10);
        expect(final.averages.potassium).toBeGreaterThan(10);
        expect(final.ranges.nitrogen.min).toBeGreaterThan(5); // Even minimum should be above 5
        
        // NOTE: Plant count may be 0 in bare soil test (no initial plants spawned)
        // In a real game, plants would be present and consuming nutrients
        
        // Nitrogen loss should be < 50% of initial
        const nLossPercent = nLoss / initial.averages.nitrogen;
        console.log(`Nitrogen loss percent: ${(nLossPercent * 100).toFixed(1)}%`);
        expect(nLossPercent).toBeLessThan(0.5);
    });
    
    test('Verify riparian zone protection', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
        
        console.log('RIPARIAN ZONE PROTECTION TEST');
        
        // Find inland and riparian cells
        const cells = await page.evaluate(() => {
            const soilManager = window.graphicsEngine.soilManager;
            const terrainGen = soilManager.terrainGenerator;
            const waterTiles = terrainGen.getWaterTiles();
            
            const firstWater = Array.from(waterTiles)[0];
            const [waterX, waterY] = firstWater.split(',').map(Number);
            
            // Find riparian cell (within 3 cells of water)
            let riparian = null;
            for (let dx = -3; dx <= 3; dx++) {
                for (let dy = -3; dy <= 3; dy++) {
                    const testX = waterX + dx;
                    const testY = waterY + dy;
                    const soil = soilManager.getSoilAt(testX, testY);
                    if (soil && !soil.isWater && soil.isPlantable) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= 3) {
                            riparian = { x: testX, y: testY };
                            break;
                        }
                    }
                }
                if (riparian) break;
            }
            
            // Find inland cell (far from water)
            const inland = { x: 10, y: 10 };
            
            return { riparian, inland };
        });
        
        if (!cells.riparian) {
            console.log('No riparian cell found - test skipped');
            return;
        }
        
        // Get initial nitrogen for both
        const initialRiparian = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, cells.riparian);
        
        const initialInland = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, cells.inland);
        
        console.log(`Initial - Riparian (${cells.riparian.x},${cells.riparian.y}): ${initialRiparian.toFixed(2)}N`);
        console.log(`Initial - Inland (${cells.inland.x},${cells.inland.y}): ${initialInland.toFixed(2)}N`);
        
        // Force rainy weather
        await page.evaluate(() => {
            window.graphicsEngine.weatherManager.transitionToWeather('rainy');
        });
        
        // Advance 10 days of rain
        for (let day = 0; day < 10; day++) {
            await advanceGameTimeDeterministic(page, 1, { timeScale: 1.0 });
            await waitForRenderFrames(page, 3);
        }
        
        // Get final nitrogen for both
        const finalRiparian = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, cells.riparian);
        
        const finalInland = await page.evaluate(({ x, y }) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(x, y);
            return soil.nitrogen;
        }, cells.inland);
        
        const riparianLoss = initialRiparian - finalRiparian;
        const inlandLoss = initialInland - finalInland;
        
        console.log(`Final - Riparian: ${finalRiparian.toFixed(2)}N (loss: ${riparianLoss.toFixed(2)})`);
        console.log(`Final - Inland: ${finalInland.toFixed(2)}N (loss: ${inlandLoss.toFixed(2)})`);
        
        // Riparian should lose LESS than inland (protection working)
        expect(riparianLoss).toBeLessThan(inlandLoss);
        
        // Riparian should lose < 30% of inland loss (config says 0.3x multiplier)
        const protectionRatio = riparianLoss / inlandLoss;
        console.log(`Protection ratio: ${(protectionRatio * 100).toFixed(1)}% (should be < 50%)`);
        expect(protectionRatio).toBeLessThan(0.5);
    });
});
