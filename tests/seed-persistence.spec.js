/**
 * Seed Persistence Tests - Milestone 7
 * 
 * Tests seed system UI interactions, localStorage persistence, and URL parameters
 */

const { test, expect } = require('@playwright/test');
const { waitForRenderFrames } = require('./test-utils');

test.describe('Seed Persistence System', () => {
    
    test('should persist seed in localStorage after generation', async ({ page }) => {
        await page.goto('http://localhost:8081');
        
        // Wait for initialization
        await waitForRenderFrames(page, 60);
        
        // Get the initial seed
        const initialSeed = await page.locator('#current-seed').textContent();
        expect(initialSeed).toBeTruthy();
        expect(initialSeed).not.toBe('0');
        
        // Check localStorage
        const storedSeed = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_seed');
        });
        
        expect(storedSeed).toBe(initialSeed);
        console.log(`Initial seed: ${initialSeed}`);
    });
    
    test('should load seed from localStorage on page reload', async ({ page }) => {
        // Set a known seed in localStorage
        const testSeed = '12345678';
        
        await page.goto('http://localhost:8081');
        
        // Set localStorage
        await page.evaluate((seed) => {
            localStorage.setItem('landShepherd_seed', seed);
        }, testSeed);
        
        // Reload page
        await page.reload();
        await waitForRenderFrames(page, 60);
        
        // Verify seed was loaded
        const displayedSeed = await page.locator('#current-seed').textContent();
        expect(displayedSeed).toBe(testSeed);
        
        // Check console log
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        
        await page.reload();
        await waitForRenderFrames(page, 30);
        
        const seedLog = logs.find(log => log.includes('Using seed from localStorage'));
        expect(seedLog).toBeTruthy();
    });
    
    test('should regenerate world with manual seed input', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 60);
        
        // Enter a new seed
        const newSeed = '87654321';
        await page.locator('#seed-input').fill(newSeed);
        
        // Click regenerate (will reload page)
        await Promise.all([
            page.waitForNavigation(),
            page.locator('#regenerate-btn').click()
        ]);
        
        await waitForRenderFrames(page, 60);
        
        // Verify new seed is displayed
        const displayedSeed = await page.locator('#current-seed').textContent();
        expect(displayedSeed).toBe(newSeed);
    });
    
    test('should copy seed to clipboard', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 60);
        
        // Get displayed seed
        const displayedSeed = await page.locator('#current-seed').textContent();
        
        // Click copy button
        await page.locator('#copy-seed-btn').click();
        
        // Wait for clipboard write
        await page.waitForTimeout(100);
        
        // Verify clipboard content
        const clipboardText = await page.evaluate(() => {
            return navigator.clipboard.readText();
        });
        
        expect(clipboardText).toBe(displayedSeed);
        
        // Verify visual feedback (button changes to checkmark)
        await page.waitForTimeout(100);
        const buttonText = await page.locator('#copy-seed-btn').textContent();
        expect(buttonText).toBe('✓');
    });
    
    test('should prioritize URL parameter over localStorage', async ({ page }) => {
        const urlSeed = '11111111';
        const localStorageSeed = '22222222';
        
        // Set localStorage first
        await page.goto('http://localhost:8081');
        await page.evaluate((seed) => {
            localStorage.setItem('landShepherd_seed', seed);
        }, localStorageSeed);
        
        // Navigate with URL parameter
        await page.goto(`http://localhost:8081?seed=${urlSeed}`);
        await waitForRenderFrames(page, 60);
        
        // URL seed should take priority
        const displayedSeed = await page.locator('#current-seed').textContent();
        expect(displayedSeed).toBe(urlSeed);
    });
    
    test('should reject invalid seed inputs', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 60);
        
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                consoleLogs.push(msg.text());
            }
        });
        
        // Test negative seed
        await page.locator('#seed-input').fill('-1');
        await page.locator('#regenerate-btn').click();
        await page.waitForTimeout(200);
        
        // Should warn about invalid seed
        expect(consoleLogs.some(log => log.includes('Invalid seed'))).toBeTruthy();
        
        // Test seed too large
        await page.locator('#seed-input').fill('9999999999');
        await page.locator('#regenerate-btn').click();
        await page.waitForTimeout(200);
        
        expect(consoleLogs.filter(log => log.includes('Invalid seed')).length).toBeGreaterThan(0);
    });
    
    test('should generate deterministic terrain with same seed', async ({ page }) => {
        const testSeed = '99999999';
        
        // First generation - count water tiles
        await page.goto(`http://localhost:8081?seed=${testSeed}`);
        await waitForRenderFrames(page, 90);
        
        const waterCount1 = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.waterTiles.size;
        });
        
        // Reload with same seed
        await page.goto(`http://localhost:8081?seed=${testSeed}`);
        await waitForRenderFrames(page, 90);
        
        const waterCount2 = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.waterTiles.size;
        });
        
        // Same seed should generate same number of water tiles (deterministic)
        expect(waterCount1).toBeGreaterThan(0);
        expect(waterCount2).toBe(waterCount1);
        
        // Verify displayed seed matches
        const displayedSeed = await page.locator('#current-seed').textContent();
        expect(displayedSeed).toBe(testSeed);
    });
    
    test('should generate random seed when input is empty', async ({ page }) => {
        // Listen for console logs before navigation
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });
        
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 60);
        
        // Get initial seed
        const initialSeed = await page.locator('#current-seed').textContent();
        
        // Clear input field
        await page.locator('#seed-input').clear();
        
        // Click regenerate with empty input (will trigger reload)
        await Promise.all([
            page.waitForNavigation({ timeout: 10000 }),
            page.locator('#regenerate-btn').click()
        ]);
        
        await waitForRenderFrames(page, 60);
        
        // Should generate new random seed
        const newSeed = await page.locator('#current-seed').textContent();
        expect(newSeed).toBeTruthy();
        expect(newSeed).not.toBe(initialSeed); // Should be different (99.99% chance)
        
        // Check that localStorage was cleared (random generation triggered)
        const hasStoredSeed = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_seed') !== null;
        });
        expect(hasStoredSeed).toBe(true); // Should be re-saved after random generation
    });
});
