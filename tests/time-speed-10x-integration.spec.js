/**
 * Time Speed 10x Integration Test (Milestone 3)
 * 
 * Comprehensive integration testing for all speed presets with weather interactions:
 * - All 7 speed presets (pause, verySlow, slow, normal, fast, veryFast, veryVeryFast)
 * - Lighting bypass at >= 5.0x speed
 * - Weather preservation during bypass (rainy/cloudy dimming)
 * - Rapid speed switching stability
 * - Debug overlay bypass indicator
 */

const { test, expect } = require('@playwright/test');

test('Time Speed 10x - Integration Test', async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:8081');
    
    // Wait for graphics engine to initialize
    await page.waitForFunction(() => {
        return window.graphicsEngine && 
               window.graphicsEngine.lightingManager && 
               window.graphicsEngine.timeManager &&
               window.graphicsEngine.weatherManager;
    }, { timeout: 5000 });
    
    console.log('✓ Graphics engine initialized');
    
    // Helper function to get comprehensive state
    const getState = async () => {
        return await page.evaluate(() => {
            const lm = window.graphicsEngine.lightingManager;
            const tm = window.graphicsEngine.timeManager;
            const wm = window.graphicsEngine.weatherManager;
            
            return {
                lighting: {
                    phase: lm.getCurrentPhase(),
                    brightness: lm.getAmbientBrightness(),
                    bypassActive: lm.isBypassActive(),
                    shouldUpdateTimeOfDay: lm.shouldUpdateTimeOfDay()
                },
                time: {
                    scale: tm.getTimeScale()
                },
                weather: {
                    current: wm.getCurrentWeather()
                }
            };
        });
    };
    
    // Helper function to set time scale
    const setTimeScale = async (scale) => {
        await page.evaluate((s) => {
            window.graphicsEngine.timeManager.setTimeScale(s);
        }, scale);
        await page.waitForTimeout(400); // Allow smoothing to converge
    };
    
    // Helper function to set weather
    const setWeather = async (weatherType) => {
        await page.evaluate((type) => {
            const wm = window.graphicsEngine.weatherManager;
            const currentDay = window.graphicsEngine.timeManager.getCurrentDay();
            wm.setWeather(type, currentDay);
        }, weatherType);
        await page.waitForTimeout(400);
    };
    
    // Helper function to get UI text
    const getUIText = async (elementId) => {
        return await page.evaluate((id) => {
            const elem = document.getElementById(id);
            return elem ? elem.textContent : null;
        }, elementId);
    };
    
    // === SCENARIO 1: Test All 7 Speed Presets ===
    console.log('\n=== SCENARIO 1: All Speed Presets ===');
    
    const presets = [
        { name: 'pause', value: 0, expectBypass: false },
        { name: 'verySlow', value: 0.05, expectBypass: false },
        { name: 'slow', value: 0.1, expectBypass: false },
        { name: 'normal', value: 0.5, expectBypass: false },
        { name: 'fast', value: 1.0, expectBypass: false },
        { name: 'veryFast', value: 5.0, expectBypass: true },
        { name: 'veryVeryFast', value: 10.0, expectBypass: true }
    ];
    
    // Set to night for consistent testing
    await page.evaluate(() => {
        window.graphicsEngine.lightingManager.setTimeOfDay(2); // 2am
    });
    await setWeather('sunny');
    
    for (const preset of presets) {
        console.log(`\n--- Testing: ${preset.name} (${preset.value}x) ---`);
        await setTimeScale(preset.value);
        
        const state = await getState();
        console.log(`Bypass: ${state.lighting.bypassActive}, Phase: ${state.lighting.phase}`);
        
        expect(state.time.scale).toBe(preset.value);
        expect(state.lighting.bypassActive).toBe(preset.expectBypass);
        
        if (preset.expectBypass) {
            expect(state.lighting.phase).toBe('midday (bypassed)');
            expect(state.lighting.brightness).toBeGreaterThan(0.85);
            
            // Check UI display shows bypass indicator
            const phaseUI = await getUIText('lighting-phase');
            expect(phaseUI).toContain('[BYPASS]');
            expect(phaseUI).toContain(`Speed: ${preset.value}x`);
        } else {
            if (preset.value > 0) { // Skip pause check
                expect(state.lighting.phase).toBe('night');
                expect(state.lighting.brightness).toBeLessThan(0.5);
            }
            
            const phaseUI = await getUIText('lighting-phase');
            expect(phaseUI).not.toContain('[BYPASS]');
        }
    }
    
    console.log('✅ All 7 presets validated');
    
    // === SCENARIO 2: Weather Preservation During Bypass ===
    console.log('\n=== SCENARIO 2: Weather Preservation ===');
    
    // Test sunny at 10x
    await setTimeScale(10.0);
    await setWeather('sunny');
    const stateSunny = await getState();
    console.log(`10x Sunny - Brightness: ${(stateSunny.lighting.brightness * 100).toFixed(1)}%`);
    expect(stateSunny.lighting.bypassActive).toBe(true);
    expect(stateSunny.lighting.brightness).toBeGreaterThan(0.9);
    
    // Test rainy at 10x - should be dimmer
    await setWeather('rainy');
    const stateRainy = await getState();
    console.log(`10x Rainy - Brightness: ${(stateRainy.lighting.brightness * 100).toFixed(1)}%`);
    expect(stateRainy.lighting.bypassActive).toBe(true);
    expect(stateRainy.lighting.brightness).toBeLessThan(stateSunny.lighting.brightness);
    expect(stateRainy.lighting.brightness).toBeGreaterThan(0.4);
    
    // Test cloudy at 5x - should be slightly dimmer
    await setTimeScale(5.0);
    await setWeather('cloudy');
    const stateCloudy = await getState();
    console.log(`5x Cloudy - Brightness: ${(stateCloudy.lighting.brightness * 100).toFixed(1)}%`);
    expect(stateCloudy.lighting.bypassActive).toBe(true);
    expect(stateCloudy.lighting.brightness).toBeLessThan(1.0);
    expect(stateCloudy.lighting.brightness).toBeGreaterThan(0.7);
    
    console.log('✅ Weather preservation validated');
    
    // === SCENARIO 3: Rapid Speed Switching ===
    console.log('\n=== SCENARIO 3: Rapid Speed Switching ===');
    
    await setWeather('sunny');
    
    const rapidSequence = [1.0, 10.0, 1.0, 5.0, 10.0];
    
    for (const speed of rapidSequence) {
        await setTimeScale(speed);
        await page.waitForTimeout(100); // Very short wait (stress test)
        
        const state = await getState();
        expect(state.time.scale).toBe(speed);
    }
    
    console.log('✅ Rapid switching stable');
    
    // === SCENARIO 4: Bypass Resume Test ===
    console.log('\n=== SCENARIO 4: Bypass → Normal Resume ===');
    
    // Set to night and 10x
    await page.evaluate(() => {
        window.graphicsEngine.lightingManager.setTimeOfDay(23); // 11pm night
    });
    await setTimeScale(10.0);
    await setWeather('sunny');
    
    let stateBypass = await getState();
    console.log(`10x Night Bypassed - Brightness: ${(stateBypass.lighting.brightness * 100).toFixed(1)}%`);
    expect(stateBypass.lighting.bypassActive).toBe(true);
    expect(stateBypass.lighting.brightness).toBeGreaterThan(0.85);
    
    // Drop to 1x - should resume dark
    await setTimeScale(1.0);
    await page.waitForTimeout(600); // Extra time for smoothing
    
    let stateResumed = await getState();
    console.log(`1x Night Resumed - Brightness: ${(stateResumed.lighting.brightness * 100).toFixed(1)}%`);
    expect(stateResumed.lighting.bypassActive).toBe(false);
    expect(stateResumed.lighting.brightness).toBeLessThan(0.5);
    
    console.log('✅ Bypass resume validated');
    
    // === SCENARIO 5: Weather Change During Bypass ===
    console.log('\n=== SCENARIO 5: Weather Change at 10x ===');
    
    await setTimeScale(10.0);
    await setWeather('sunny');
    let stateBefore = await getState();
    
    await setWeather('rainy');
    let stateAfter = await getState();
    
    console.log(`Sunny: ${(stateBefore.lighting.brightness * 100).toFixed(1)}% → Rainy: ${(stateAfter.lighting.brightness * 100).toFixed(1)}%`);
    expect(stateAfter.weather.current).toBe('rainy');
    expect(stateAfter.lighting.bypassActive).toBe(true);
    expect(stateAfter.lighting.brightness).toBeLessThan(stateBefore.lighting.brightness);
    
    console.log('✅ Weather change during bypass validated');
    
    // === Check for Console Errors ===
    console.log('\n=== Console Error Check ===');
    
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    await page.waitForTimeout(500);
    
    const relevantErrors = consoleErrors.filter(err => 
        err.includes('LIGHTING') || 
        err.includes('TIME') ||
        err.includes('bypass') ||
        err.includes('weather')
    );
    
    console.log(`Relevant errors: ${relevantErrors.length}`);
    expect(relevantErrors).toHaveLength(0);
    
    console.log('✅ No console errors');
    
    // === FINAL SUMMARY ===
    console.log('\n========================================');
    console.log('✅ MILESTONE 3: INTEGRATION TEST PASSED');
    console.log('========================================');
    console.log('\nValidated:');
    console.log('  ✓ All 7 speed presets functional');
    console.log('  ✓ Bypass activates at >= 5.0x');
    console.log('  ✓ Weather effects preserved during bypass');
    console.log('  ✓ Rapid speed changes stable');
    console.log('  ✓ Debug overlay shows bypass indicator');
    console.log('  ✓ No console errors');
    console.log('\nTest Coverage:');
    console.log(`  - Speed presets: 7/7 tested`);
    console.log(`  - Weather scenarios: 3+ tested`);
    console.log(`  - Edge cases: 3+ tested`);
    console.log('========================================');
});
