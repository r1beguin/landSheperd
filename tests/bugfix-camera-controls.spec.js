/**
 * Bug Fix Verification: Camera Controls & Click Precision
 * 
 * Tests the fixes for:
 * 1. Mouse click precision (Math.round vs Math.floor in isoToGrid)
 * 2. WASD/Arrow key camera controls
 * 3. Weather cycling changed from W to M key
 */

const { test, expect } = require('@playwright/test');
const { waitForRenderFrames, getGameMetrics, clickOnCanvas } = require('./test-utils');

test.describe('Bug Fixes: Camera & Input', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 10);
    });

    test('should initialize without errors', async ({ page }) => {
        const errors = await page.evaluate(() => {
            return window.__testErrors || [];
        });
        
        expect(errors.length).toBe(0);
        
        const metrics = await getGameMetrics(page);
        expect(metrics.webgl).toBe('ok');
        expect(metrics.fps).toBeGreaterThan(20);
    });

    test('WASD keys should move camera', async ({ page }) => {
        // Get initial camera position
        const initialPos = await page.evaluate(() => {
            return {
                x: window.graphicsEngine.cameraManager.position.x,
                y: window.graphicsEngine.cameraManager.position.y
            };
        });

        // Press W key (up) for a bit
        await page.keyboard.down('KeyW');
        await waitForRenderFrames(page, 5);
        await page.keyboard.up('KeyW');

        const afterW = await page.evaluate(() => {
            return {
                x: window.graphicsEngine.cameraManager.position.x,
                y: window.graphicsEngine.cameraManager.position.y
            };
        });

        // Y should decrease (moving up/north)
        expect(afterW.y).toBeLessThan(initialPos.y);

        // Press D key (right) for a bit
        await page.keyboard.down('KeyD');
        await waitForRenderFrames(page, 5);
        await page.keyboard.up('KeyD');

        const afterD = await page.evaluate(() => {
            return {
                x: window.graphicsEngine.cameraManager.position.x,
                y: window.graphicsEngine.cameraManager.position.y
            };
        });

        // X should increase (moving right/east)
        expect(afterD.x).toBeGreaterThan(afterW.x);

        console.log('✓ Camera moved with WASD keys');
    });

    test('Arrow keys should move camera', async ({ page }) => {
        const initialPos = await page.evaluate(() => {
            return {
                x: window.graphicsEngine.cameraManager.position.x,
                y: window.graphicsEngine.cameraManager.position.y
            };
        });

        // Press ArrowLeft
        await page.keyboard.down('ArrowLeft');
        await waitForRenderFrames(page, 5);
        await page.keyboard.up('ArrowLeft');

        const afterLeft = await page.evaluate(() => {
            return {
                x: window.graphicsEngine.cameraManager.position.x,
                y: window.graphicsEngine.cameraManager.position.y
            };
        });

        // X should decrease
        expect(afterLeft.x).toBeLessThan(initialPos.x);

        console.log('✓ Camera moved with Arrow keys');
    });

    test('M key should cycle weather (not W)', async ({ page }) => {
        // Get initial weather
        const initialWeather = await page.evaluate(() => {
            return window.graphicsEngine.weatherManager.getCurrentWeather();
        });

        // Press M key to cycle weather
        await page.keyboard.press('KeyM');
        await waitForRenderFrames(page, 3);

        const newWeather = await page.evaluate(() => {
            return window.graphicsEngine.weatherManager.getCurrentWeather();
        });

        // Weather should have changed
        expect(newWeather).not.toBe(initialWeather);

        console.log(`✓ Weather cycled from ${initialWeather} to ${newWeather} with M key`);
    });

    test('click precision should use Math.round', async ({ page }) => {
        // Verify the fix is in place
        const usesRound = await page.evaluate(() => {
            // Check if isoToGrid uses Math.round
            const funcStr = window.IsometricUtils.isoToGrid.toString();
            return funcStr.includes('Math.round');
        });

        expect(usesRound).toBe(true);
        console.log('✓ isoToGrid uses Math.round for better click precision');
    });

    test('camera pan speed should be reasonable', async ({ page }) => {
        const initialPos = await page.evaluate(() => {
            return {
                x: window.graphicsEngine.cameraManager.position.x,
                y: window.graphicsEngine.cameraManager.position.y
            };
        });

        // Hold W for exactly 100ms (5-6 frames at 60fps)
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(100);
        await page.keyboard.up('KeyW');
        await waitForRenderFrames(page, 2);

        const afterPan = await page.evaluate(() => {
            return {
                x: window.graphicsEngine.cameraManager.position.x,
                y: window.graphicsEngine.cameraManager.position.y
            };
        });

        // Calculate distance moved
        const distY = Math.abs(afterPan.y - initialPos.y);
        
        // Pan speed is 0.3 px/ms * 0.7 (iso scale) = 0.21 px/ms
        // In 100ms should move ~21 pixels
        expect(distY).toBeGreaterThan(10);
        expect(distY).toBeLessThan(50);

        console.log(`✓ Camera panned ${distY.toFixed(1)} pixels in 100ms (reasonable speed)`);
    });
});
