/**
 * Test: 10x Time Speed Preset Functionality
 * 
 * Validates that the new "veryVeryFast" (10x) time speed preset works correctly:
 * - Config loads without errors
 * - User can reach 10x by pressing '+' multiple times
 * - Time speed display shows correct value
 * - Game time advances 10x faster than real time
 */

import { test, expect } from '@playwright/test';

test('10x Time Speed Preset - Functional Validation', async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:8081');
    
    // Wait for engine initialization
    await page.waitForFunction(() => {
        return window.graphicsEngine && 
               window.graphicsEngine.timeManager &&
               window.graphicsEngine.timeManager.timeScalePresets !== undefined;
    }, { timeout: 10000 });
    
    console.log('✓ Graphics engine and TimeManager initialized');
    
    // CHECKPOINT 1: Verify config loaded with 10x preset
    const presets = await page.evaluate(() => {
        return window.graphicsEngine.timeManager.timeScalePresets;
    });
    
    console.log('Time scale presets loaded:', presets);
    expect(presets.veryVeryFast).toBe(10.0);
    console.log('✓ Config contains veryVeryFast: 10.0');
    
    // CHECKPOINT 2: Get initial time scale
    const initialTimeScale = await page.evaluate(() => {
        return window.graphicsEngine.timeManager.getTimeScale();
    });
    
    console.log(`Initial time scale: ${initialTimeScale}x`);
    
    // CHECKPOINT 3: Press '+' multiple times to reach 10x
    // Current presets: 0, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0
    // Starting from 0.1 (slow), need to press '+' 5 times to reach 10.0
    
    let currentScale = initialTimeScale;
    let pressCount = 0;
    const maxPresses = 10; // Safety limit
    
    while (currentScale < 10.0 && pressCount < maxPresses) {
        // Simulate '+' key press
        await page.keyboard.press('+');
        await page.waitForTimeout(100); // Small delay for processing
        
        currentScale = await page.evaluate(() => {
            return window.graphicsEngine.timeManager.getTimeScale();
        });
        
        pressCount++;
        console.log(`After press ${pressCount}: time scale = ${currentScale}x`);
    }
    
    console.log(`✓ Reached time scale ${currentScale}x after ${pressCount} '+' presses`);
    expect(currentScale).toBe(10.0);
    
    // CHECKPOINT 4: Verify display string shows correct format
    const displayString = await page.evaluate(() => {
        return window.graphicsEngine.timeManager.getTimeScaleDisplayString();
    });
    
    console.log(`Time scale display: "${displayString}"`);
    expect(displayString).toBe('10x (Fast)');
    console.log('✓ Display string matches expected format');
    
    // CHECKPOINT 5: Verify time advances at 10x rate
    // Record starting day
    const startDay = await page.evaluate(() => {
        return window.graphicsEngine.timeManager.getCurrentDayPrecise();
    });
    
    // Wait 1 second of real time
    await page.waitForTimeout(1000);
    
    const endDay = await page.evaluate(() => {
        return window.graphicsEngine.timeManager.getCurrentDayPrecise();
    });
    
    const daysElapsed = endDay - startDay;
    const expectedDays = 1.0; // 1 second real time / 10 seconds per game day * 10x speed = 1.0 game days
    
    console.log(`Game time advanced: ${daysElapsed.toFixed(3)} days (expected ~${expectedDays.toFixed(3)})`);
    
    // Allow 20% tolerance for timing variability
    expect(daysElapsed).toBeGreaterThan(expectedDays * 0.8);
    expect(daysElapsed).toBeLessThan(expectedDays * 1.2);
    console.log('✓ Time advancement matches 10x speed (within tolerance)');
    
    // CHECKPOINT 6: Verify can still decrease time scale
    await page.keyboard.press('-');
    await page.waitForTimeout(100);
    
    const decreasedScale = await page.evaluate(() => {
        return window.graphicsEngine.timeManager.getTimeScale();
    });
    
    console.log(`After '-' press: time scale = ${decreasedScale}x`);
    expect(decreasedScale).toBe(5.0); // Should go to previous preset (veryFast)
    console.log('✓ Can decrease from 10x speed');
    
    console.log('\n=== 10x Time Speed Preset Test: PASSED ===');
});
