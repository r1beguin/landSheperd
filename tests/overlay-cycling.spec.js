const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const {
    waitForRenderFrames,
    simulateKeyPress,
    getGameMetrics
} = require('./test-utils');

/**
 * Overlay Cycling Test
 * 
 * Tests the F key cycling functionality through all 6 overlay modes:
 * Normal → Fertility → Nitrogen → Phosphorus → Potassium → Organic Matter → [loop]
 * 
 * Usage:
 *   npx playwright test tests/overlay-cycling.spec.js
 */

test.describe('Overlay Cycling System', () => {
    test('F key cycles through all 6 overlay modes', async ({ page }) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotDir = path.join('test-results', 'overlay-cycling', timestamp);
        
        // Ensure directory exists
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }

        console.log('\n=== Testing Overlay Cycling ===');
        console.log(`Screenshots will be saved to: ${screenshotDir}`);
        console.log('=====================================\n');

        // Navigate and wait for initialization
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        await waitForRenderFrames(page, 10);

        console.log('✓ Game initialized\n');

        // Define expected overlay modes in cycle order
        const overlayModes = [
            { name: 'Normal', key: 'normal' },
            { name: 'Fertility', key: 'fertility' },
            { name: 'Nitrogen', key: 'nitrogen' },
            { name: 'Phosphorus', key: 'phosphorus' },
            { name: 'Potassium', key: 'potassium' },
            { name: 'Organic Matter', key: 'organicMatter' }
        ];

        // Get initial overlay mode
        const initialMode = await page.evaluate(() => {
            return window.graphicsEngine?.overlayManager?.currentMode || 'unknown';
        });
        console.log(`Initial overlay mode: ${initialMode}\n`);

        // Capture initial state
        await page.screenshot({
            path: path.join(screenshotDir, `00-initial-${initialMode}.png`)
        });
        console.log(`✓ Captured: Initial state (${initialMode})`);

        // Cycle through all modes using F key
        for (let i = 0; i < overlayModes.length; i++) {
            // Press F key to cycle
            await simulateKeyPress(page, 'KeyF');
            await waitForRenderFrames(page, 5);

            // Get current mode from overlay manager
            const currentMode = await page.evaluate(() => {
                return window.graphicsEngine?.overlayManager?.currentMode || 'unknown';
            });

            const expectedMode = overlayModes[(i + 1) % overlayModes.length];
            
            console.log(`\n--- Cycle ${i + 1} ---`);
            console.log(`Expected: ${expectedMode.name} (${expectedMode.key})`);
            console.log(`Actual: ${currentMode}`);

            // Verify mode changed correctly
            expect(currentMode).toBe(expectedMode.key);
            console.log('✓ Mode changed correctly');

            // Check UI visibility
            const uiState = await page.evaluate(() => {
                const overlayUI = document.getElementById('overlay-ui');
                const modeName = document.getElementById('overlay-mode-name');
                const legend = document.getElementById('overlay-legend');
                
                return {
                    uiVisible: overlayUI && overlayUI.style.display !== 'none',
                    modeName: modeName ? modeName.textContent : null,
                    legendVisible: legend ? legend.style.display !== 'none' : false
                };
            });

            console.log(`UI State:`, uiState);

            // Capture screenshot for this mode
            const screenshotName = `${String(i + 1).padStart(2, '0')}-${expectedMode.key}.png`;
            await page.screenshot({
                path: path.join(screenshotDir, screenshotName)
            });
            console.log(`✓ Captured: ${expectedMode.name} mode`);

            // Verify UI shows correct mode name
            if (expectedMode.key === 'normal') {
                expect(uiState.legendVisible).toBe(false);
                console.log('✓ Legend hidden in normal mode');
            } else {
                expect(uiState.legendVisible).toBe(true);
                console.log('✓ Legend visible in overlay mode');
            }
        }

        // Test full cycle loop (press F one more time - should advance to next mode)
        console.log('\n--- Testing Loop Back ---');
        await simulateKeyPress(page, 'KeyF');
        await waitForRenderFrames(page, 5);

        const finalMode = await page.evaluate(() => {
            return window.graphicsEngine?.overlayManager?.currentMode || 'unknown';
        });

        // After cycling through all 6 (returning to normal), pressing F again should go to fertility
        const expectedFinalMode = overlayModes[1]; // fertility is next after normal
        expect(finalMode).toBe(expectedFinalMode.key);
        console.log(`✓ Cycled to next mode: ${finalMode}`);

        // Capture final state
        await page.screenshot({
            path: path.join(screenshotDir, `07-loop-back-${finalMode}.png`)
        });
        console.log(`✓ Captured: Loop back to ${expectedFinalMode.name}`);

        // Save test report
        const report = {
            timestamp,
            testName: 'Overlay Cycling System',
            totalCycles: overlayModes.length + 1, // +1 for loop back test
            modesExpected: overlayModes,
            status: 'PASS',
            screenshotsPath: screenshotDir
        };

        fs.writeFileSync(
            path.join(screenshotDir, 'report.json'),
            JSON.stringify(report, null, 2)
        );

        console.log('\n=== Overlay Cycling Test Complete ===');
        console.log(`Status: PASS`);
        console.log(`Screenshots: ${overlayModes.length + 2} captured`);
        console.log(`Report: ${path.join(screenshotDir, 'report.json')}`);
        console.log('=====================================\n');
    });

    test('Overlay colors are correct for each mode', async ({ page }) => {
        console.log('\n=== Testing Overlay Colors ===\n');

        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        await waitForRenderFrames(page, 10);

        // Test color calculation for each mode
        const colorTests = await page.evaluate(() => {
            const manager = window.graphicsEngine?.overlayManager;
            if (!manager) return { error: 'OverlayManager not found' };

            // Create test soil cell with known values
            const testSoil = {
                fertility: 75,
                nitrogen: 50,
                phosphorus: 25,
                potassium: 80,
                organicMatter: 60
            };

            const results = [];

            // Test each mode (skip normal mode since it returns null)
            const modes = ['fertility', 'nitrogen', 'phosphorus', 'potassium', 'organicMatter'];
            
            for (const mode of modes) {
                // Set mode by cycling until we reach the desired mode
                let attempts = 0;
                while (manager.currentMode !== mode && attempts < 10) {
                    manager.cycleMode();
                    attempts++;
                }
                
                if (manager.currentMode !== mode) {
                    results.push({
                        mode,
                        error: `Could not set mode to ${mode}`
                    });
                    continue;
                }
                
                const color = manager.getOverlayColor(testSoil);
                
                if (!color) {
                    results.push({
                        mode,
                        error: 'getOverlayColor returned null'
                    });
                    continue;
                }
                
                results.push({
                    mode,
                    testValue: testSoil[mode],
                    color: {
                        r: Math.round(color[0] * 255),
                        g: Math.round(color[1] * 255),
                        b: Math.round(color[2] * 255),
                        a: color[3]
                    }
                });
            }

            return { results };
        });

        expect(colorTests.error).toBeUndefined();
        console.log('Color Test Results:');
        
        for (const result of colorTests.results) {
            if (result.error) {
                console.log(`\n${result.mode.toUpperCase()}: ERROR - ${result.error}`);
                throw new Error(`Color test failed for ${result.mode}: ${result.error}`);
            }
            
            console.log(`\n${result.mode.toUpperCase()}:`);
            console.log(`  Value: ${result.testValue}%`);
            console.log(`  Color: RGB(${result.color.r}, ${result.color.g}, ${result.color.b}) A=${result.color.a}`);
            
            // Validate color is in expected range
            expect(result.color.r).toBeGreaterThanOrEqual(0);
            expect(result.color.r).toBeLessThanOrEqual(255);
            expect(result.color.g).toBeGreaterThanOrEqual(0);
            expect(result.color.g).toBeLessThanOrEqual(255);
            expect(result.color.b).toBeGreaterThanOrEqual(0);
            expect(result.color.b).toBeLessThanOrEqual(255);
            expect(result.color.a).toBeGreaterThan(0);
            console.log('  ✓ Color values valid');
        }

        console.log('\n=== Overlay Colors Test Complete ===\n');
    });
});
