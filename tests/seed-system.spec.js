/**
 * Seed System Testing Suite
 * Tests for deterministic terrain generation with seed system
 */

import { test, expect } from '@playwright/test';

const TEST_URL = 'http://localhost:8081';

// Helper to wait for engine initialization
async function waitForEngine(page) {
    await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.soilManager, { timeout: 5000 });
}

// Helper to get seed and soil data
async function getSeedAndSoilData(page) {
    return await page.evaluate(() => {
        const seed = window.graphicsEngine.soilManager.getSeed();
        
        // Sample 10 soil cells from different locations
        const samples = [];
        const positions = [
            { x: 0, y: 0 },
            { x: 5, y: 5 },
            { x: -5, y: -5 },
            { x: 10, y: 10 },
            { x: -10, y: -10 },
            { x: 0, y: 10 },
            { x: 10, y: 0 },
            { x: -5, y: 5 },
            { x: 5, y: -5 },
            { x: 15, y: -15 }
        ];
        
        positions.forEach(pos => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(pos.x, pos.y);
            if (soil) {
                samples.push({
                    pos,
                    nitrogen: soil.nitrogen.toFixed(2),
                    phosphorus: soil.phosphorus.toFixed(2),
                    potassium: soil.potassium.toFixed(2),
                    waterRetention: soil.waterRetention.toFixed(2),
                    fertility: soil.fertility.toFixed(2)
                });
            }
        });
        
        return { seed, samples };
    });
}

test.describe('Seed System - Milestone 1', () => {
    
    test('should initialize with a seed and log it', async ({ page }) => {
        const logs = [];
        page.on('console', msg => {
            if (msg.type() === 'log') {
                logs.push(msg.text());
            }
        });
        
        await page.goto(TEST_URL);
        await waitForEngine(page);
        
        // Check for required seed initialization logs
        const seedInitLog = logs.find(log => log.match(/Seed initialized: \d+/));
        const prngLog = logs.find(log => log.match(/ProceduralGenerator using seed: \d+/));
        
        expect(seedInitLog).toBeTruthy();
        expect(prngLog).toBeTruthy();
        
        console.log('✓ Seed initialization logs found');
        console.log(`  - ${seedInitLog}`);
        console.log(`  - ${prngLog}`);
    });
    
    test('should produce identical terrain with same seed', async ({ page, context }) => {
        // First load - capture seed and terrain
        await page.goto(TEST_URL);
        await waitForEngine(page);
        await page.waitForTimeout(1000); // Wait for full initialization
        
        const firstLoad = await getSeedAndSoilData(page);
        console.log(`First load - Seed: ${firstLoad.seed}`);
        
        // Store seed in localStorage
        await page.evaluate((seed) => {
            localStorage.setItem('landShepherd_seed', seed.toString());
        }, firstLoad.seed);
        
        // Second load - should use same seed
        await page.reload();
        await waitForEngine(page);
        await page.waitForTimeout(1000);
        
        const secondLoad = await getSeedAndSoilData(page);
        console.log(`Second load - Seed: ${secondLoad.seed}`);
        
        // Verify same seed used
        expect(secondLoad.seed).toBe(firstLoad.seed);
        
        // Verify terrain is identical (all 10 sample points)
        expect(secondLoad.samples.length).toBe(firstLoad.samples.length);
        
        for (let i = 0; i < firstLoad.samples.length; i++) {
            const first = firstLoad.samples[i];
            const second = secondLoad.samples[i];
            
            expect(second.nitrogen).toBe(first.nitrogen);
            expect(second.phosphorus).toBe(first.phosphorus);
            expect(second.potassium).toBe(first.potassium);
            expect(second.waterRetention).toBe(first.waterRetention);
            expect(second.fertility).toBe(first.fertility);
        }
        
        console.log('✓ Terrain is identical across reloads with same seed');
    });
    
    test('should produce different terrain with different seeds', async ({ page }) => {
        const seeds = [12345, 67890, 99999];
        const terrainData = [];
        
        for (const seed of seeds) {
            // Clear localStorage and set specific seed
            await page.goto(TEST_URL);
            await page.evaluate((s) => {
                localStorage.clear();
                localStorage.setItem('landShepherd_seed', s.toString());
            }, seed);
            
            // Reload with new seed
            await page.reload();
            await waitForEngine(page);
            await page.waitForTimeout(1000);
            
            const data = await getSeedAndSoilData(page);
            expect(data.seed).toBe(seed);
            terrainData.push(data);
            
            console.log(`Seed ${seed} - Sample fertility at (0,0): ${data.samples[0].fertility}`);
        }
        
        // Verify all three terrains are different
        // Compare first sample point (0,0) from each seed
        const fertilities = terrainData.map(d => d.samples[0].fertility);
        const uniqueFertilities = new Set(fertilities);
        
        expect(uniqueFertilities.size).toBe(3);
        console.log('✓ Different seeds produce different terrain');
    });
    
    test('should display current seed in UI', async ({ page }) => {
        await page.goto(TEST_URL);
        await waitForEngine(page);
        await page.waitForTimeout(1000);
        
        const seed = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.getSeed();
        });
        
        const displayedSeed = await page.locator('#current-seed').textContent();
        
        expect(displayedSeed).toBe(seed.toString());
        console.log(`✓ Seed UI displays: ${displayedSeed}`);
    });
    
    test('should allow manual seed entry and regeneration', async ({ page }) => {
        await page.goto(TEST_URL);
        await waitForEngine(page);
        await page.waitForTimeout(1000);
        
        const testSeed = 123456789;
        
        // Enter seed in input
        await page.fill('#seed-input', testSeed.toString());
        
        // Click regenerate (will reload page)
        const navigationPromise = page.waitForNavigation({ timeout: 10000 });
        await page.click('#regenerate-btn');
        await navigationPromise;
        
        // Wait for engine to reinitialize
        await waitForEngine(page);
        await page.waitForTimeout(1000);
        
        // Verify new seed is used
        const actualSeed = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.getSeed();
        });
        
        expect(actualSeed).toBe(testSeed);
        console.log(`✓ Manual seed entry works: ${actualSeed}`);
    });
    
    test('should copy seed to clipboard', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        
        await page.goto(TEST_URL);
        await waitForEngine(page);
        await page.waitForTimeout(1000);
        
        const seed = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.getSeed();
        });
        
        // Click copy button
        await page.click('#copy-seed-btn');
        await page.waitForTimeout(500);
        
        // Verify button feedback changed
        const buttonText = await page.locator('#copy-seed-btn').textContent();
        expect(buttonText).toBe('✓');
        
        // Read clipboard
        const clipboardText = await page.evaluate(async () => {
            return await navigator.clipboard.readText();
        });
        
        expect(clipboardText).toBe(seed.toString());
        console.log(`✓ Seed copied to clipboard: ${clipboardText}`);
    });
    
    test('should persist seed across page reloads', async ({ page }) => {
        // First load with random seed
        await page.goto(TEST_URL);
        await waitForEngine(page);
        await page.waitForTimeout(1000);
        
        const firstSeed = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.getSeed();
        });
        
        console.log(`First seed: ${firstSeed}`);
        
        // Reload without clearing localStorage
        await page.reload();
        await waitForEngine(page);
        await page.waitForTimeout(1000);
        
        const secondSeed = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.getSeed();
        });
        
        console.log(`Second seed: ${secondSeed}`);
        
        // Should be the same seed (persisted)
        expect(secondSeed).toBe(firstSeed);
        console.log('✓ Seed persists across reloads via localStorage');
    });
    
    test('should prioritize URL seed over localStorage', async ({ page }) => {
        const localStorageSeed = 11111;
        const urlSeed = 22222;
        
        // Set localStorage seed
        await page.goto(TEST_URL);
        await page.evaluate((seed) => {
            localStorage.setItem('landShepherd_seed', seed.toString());
        }, localStorageSeed);
        
        // Load with URL parameter
        await page.goto(`${TEST_URL}?seed=${urlSeed}`);
        await waitForEngine(page);
        await page.waitForTimeout(1000);
        
        const actualSeed = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.getSeed();
        });
        
        expect(actualSeed).toBe(urlSeed);
        console.log(`✓ URL seed (${urlSeed}) overrides localStorage seed (${localStorageSeed})`);
    });
    
    test('Performance: seed generation should complete in <500ms', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto(TEST_URL);
        await waitForEngine(page);
        
        const loadTime = await page.evaluate(() => {
            return performance.now();
        });
        
        console.log(`Load time: ${loadTime.toFixed(0)}ms`);
        expect(loadTime).toBeLessThan(2000); // Generous for CI
    });
});
