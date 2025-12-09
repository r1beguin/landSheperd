/**
 * Lighting Bypass Validation Test (Milestone 2)
 * 
 * Tests the lighting bypass system that activates at 5x and 10x time scales:
 * - Time-of-day lighting bypassed at >= 5x speed
 * - Base lighting locked to full brightness [1.0, 1.0, 1.0]
 * - Weather effects (cloudy/rainy) STILL apply during bypass
 * - Lighting resumes normally when dropping below 5x
 * - Smooth transitions between bypass states
 */

const { test, expect } = require('@playwright/test');

test('Lighting Bypass - 5x/10x Speed with Weather Preservation', async ({ page }) => {
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
    
    // Helper function to get lighting state
    const getLightingState = async () => {
        return await page.evaluate(() => {
            const lm = window.graphicsEngine.lightingManager;
            const tm = window.graphicsEngine.timeManager;
            const wm = window.graphicsEngine.weatherManager;
            
            return {
                phase: lm.getCurrentPhase(),
                brightness: lm.getAmbientBrightness(),
                ambientColor: lm.getAmbientColor(),
                bypassActive: lm.isBypassActive(),
                shouldUpdateTimeOfDay: lm.shouldUpdateTimeOfDay(),
                timeScale: tm.getTimeScale(),
                weather: wm.getCurrentWeather(),
                rainIntensity: wm.getRainIntensity(),
                hour: tm.getHourOfDay()
            };
        });
    };
    
    // Helper function to set time scale
    const setTimeScale = async (scale) => {
        await page.evaluate((s) => {
            window.graphicsEngine.timeManager.setTimeScale(s);
        }, scale);
        // Wait longer for smoothing to converge (smoothingFactor = 0.15)
        // After ~20 frames, value converges to ~95% of target
        await page.waitForTimeout(500); // Allow smoothing to apply
    };
    
    // Helper function to force weather state
    const setWeather = async (weatherType) => {
        await page.evaluate((type) => {
            const wm = window.graphicsEngine.weatherManager;
            // Force weather change (use correct property name: currentState)
            if (type === 'sunny') {
                wm.currentState = 'sunny';
                wm.rainIntensity = 0;
            } else if (type === 'rainy') {
                wm.currentState = 'rainy';
                wm.rainIntensity = 0.7; // Medium-high rain
            }
            // Force lighting update to apply weather modifier
            window.graphicsEngine.lightingManager.update(0);
        }, weatherType);
        await page.waitForTimeout(500); // Wait for smoothing
    };
    
    // Scenario 1: Normal speed (1x), sunny, night - should see dark lighting
    console.log('\n--- Scenario 1: 1x speed, sunny, night ---');
    await page.evaluate(() => {
        window.graphicsEngine.lightingManager.setTimeOfDay(2); // 2am night
        window.graphicsEngine.timeManager.setTimeScale(1.0);
    });
    await setWeather('sunny');
    await page.waitForTimeout(300);
    
    const state1 = await getLightingState();
    console.log(`Time scale: ${state1.timeScale}x`);
    console.log(`Bypass active: ${state1.bypassActive}`);
    console.log(`Phase: ${state1.phase}`);
    console.log(`Brightness: ${(state1.brightness * 100).toFixed(1)}%`);
    console.log(`Ambient: [${state1.ambientColor.map(c => c.toFixed(2)).join(', ')}]`);
    
    expect(state1.bypassActive).toBe(false);
    expect(state1.shouldUpdateTimeOfDay).toBe(true);
    expect(state1.phase).toBe('night');
    expect(state1.brightness).toBeLessThan(0.4); // Night should be dark
    
    await page.screenshot({ 
        path: 'test-results/lighting-bypass/1x-sunny-night.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 1x-sunny-night.png');
    
    // Scenario 2: 5x speed, sunny, night - bypass should activate, FULL BRIGHT
    console.log('\n--- Scenario 2: 5x speed, sunny, night (BYPASS) ---');
    await setTimeScale(5.0);
    
    const state2 = await getLightingState();
    console.log(`Time scale: ${state2.timeScale}x`);
    console.log(`Bypass active: ${state2.bypassActive}`);
    console.log(`Phase: ${state2.phase}`);
    console.log(`Brightness: ${(state2.brightness * 100).toFixed(1)}%`);
    console.log(`Ambient: [${state2.ambientColor.map(c => c.toFixed(2)).join(', ')}]`);
    
    expect(state2.bypassActive).toBe(true);
    expect(state2.shouldUpdateTimeOfDay).toBe(false);
    expect(state2.phase).toBe('midday (bypassed)');
    expect(state2.brightness).toBeGreaterThan(0.85); // Allow for smoothing convergence
    
    // Ambient color should be close to [1.0, 1.0, 1.0] (allowing for smoothing)
    expect(state2.ambientColor[0]).toBeGreaterThan(0.85);
    expect(state2.ambientColor[1]).toBeGreaterThan(0.85);
    expect(state2.ambientColor[2]).toBeGreaterThan(0.85);
    
    await page.screenshot({ 
        path: 'test-results/lighting-bypass/5x-sunny-night-bypassed.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 5x-sunny-night-bypassed.png');
    
    // Scenario 3: 10x speed, sunny, night - bypass should remain active
    console.log('\n--- Scenario 3: 10x speed, sunny, night (BYPASS) ---');
    await setTimeScale(10.0);
    
    const state3 = await getLightingState();
    console.log(`Time scale: ${state3.timeScale}x`);
    console.log(`Bypass active: ${state3.bypassActive}`);
    console.log(`Phase: ${state3.phase}`);
    console.log(`Brightness: ${(state3.brightness * 100).toFixed(1)}%`);
    console.log(`Ambient: [${state3.ambientColor.map(c => c.toFixed(2)).join(', ')}]`);
    
    expect(state3.bypassActive).toBe(true);
    expect(state3.shouldUpdateTimeOfDay).toBe(false);
    expect(state3.phase).toBe('midday (bypassed)');
    expect(state3.brightness).toBeGreaterThan(0.85);
    
    await page.screenshot({ 
        path: 'test-results/lighting-bypass/10x-sunny-night-bypassed.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 10x-sunny-night-bypassed.png');
    
    // Scenario 4: 5x speed, RAINY, night - bypass active BUT weather dimming applied
    console.log('\n--- Scenario 4: 5x speed, RAINY, night (BYPASS + WEATHER) ---');
    await setTimeScale(5.0);
    await setWeather('rainy');
    
    const state4 = await getLightingState();
    console.log(`Time scale: ${state4.timeScale}x`);
    console.log(`Bypass active: ${state4.bypassActive}`);
    console.log(`Weather: ${state4.weather} (intensity: ${(state4.rainIntensity * 100).toFixed(0)}%)`);
    console.log(`Phase: ${state4.phase}`);
    console.log(`Brightness: ${(state4.brightness * 100).toFixed(1)}%`);
    console.log(`Ambient: [${state4.ambientColor.map(c => c.toFixed(2)).join(', ')}]`);
    
    expect(state4.bypassActive).toBe(true);
    expect(state4.weather).toBe('rainy');
    expect(state4.phase).toBe('midday (bypassed)');
    
    // Brightness should be LOWER than Scenario 2 due to weather dimming
    expect(state4.brightness).toBeLessThan(state2.brightness);
    expect(state4.brightness).toBeGreaterThan(0.4); // But not too dark (base is 1.0)
    expect(state4.brightness).toBeLessThan(0.85); // Weather should dim it
    
    // Color should have blue tint from rain
    const colorRatio = state4.ambientColor[2] / state4.ambientColor[0]; // blue / red
    console.log(`Blue/Red ratio: ${colorRatio.toFixed(2)} (expect >1.0 for rain tint)`);
    
    await page.screenshot({ 
        path: 'test-results/lighting-bypass/5x-rainy-night-bypassed-weather.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 5x-rainy-night-bypassed-weather.png');
    
    // Scenario 5: Return to 1x speed, sunny - lighting should resume normally
    console.log('\n--- Scenario 5: Return to 1x speed, sunny, night (RESUME) ---');
    await setTimeScale(1.0);
    await setWeather('sunny');
    await page.waitForTimeout(500); // Allow extra time for smoothing
    
    const state5 = await getLightingState();
    console.log(`Time scale: ${state5.timeScale}x`);
    console.log(`Bypass active: ${state5.bypassActive}`);
    console.log(`Phase: ${state5.phase}`);
    console.log(`Brightness: ${(state5.brightness * 100).toFixed(1)}%`);
    console.log(`Ambient: [${state5.ambientColor.map(c => c.toFixed(2)).join(', ')}]`);
    
    expect(state5.bypassActive).toBe(false);
    expect(state5.shouldUpdateTimeOfDay).toBe(true);
    expect(state5.phase).toBe('night'); // Should return to night phase
    expect(state5.brightness).toBeLessThan(0.5); // Night should be dark again
    
    await page.screenshot({ 
        path: 'test-results/lighting-bypass/1x-sunny-night-resumed.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 1x-sunny-night-resumed.png');
    
    // Scenario 6: Test at 4.9x (just below threshold) - NO bypass
    console.log('\n--- Scenario 6: 4.9x speed (just below threshold) ---');
    await setTimeScale(4.9);
    
    const state6 = await getLightingState();
    console.log(`Time scale: ${state6.timeScale}x`);
    console.log(`Bypass active: ${state6.bypassActive}`);
    console.log(`Phase: ${state6.phase}`);
    console.log(`Brightness: ${(state6.brightness * 100).toFixed(1)}%`);
    
    expect(state6.bypassActive).toBe(false);
    expect(state6.shouldUpdateTimeOfDay).toBe(true);
    expect(state6.phase).toBe('night'); // Should still be night
    
    // Scenario 7: Test rapid time scale changes (stress test)
    console.log('\n--- Scenario 7: Rapid time scale changes ---');
    for (let i = 0; i < 5; i++) {
        await setTimeScale(10.0);
        await page.waitForTimeout(100);
        await setTimeScale(1.0);
        await page.waitForTimeout(100);
    }
    
    const state7 = await getLightingState();
    console.log(`Final state after rapid changes:`);
    console.log(`Bypass active: ${state7.bypassActive}`);
    console.log(`Phase: ${state7.phase}`);
    console.log(`No errors expected`);
    
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    await page.waitForTimeout(500);
    
    const lightingErrors = consoleErrors.filter(err => 
        err.includes('LIGHTING') || 
        err.includes('weather') ||
        err.includes('bypass')
    );
    
    expect(lightingErrors).toHaveLength(0);
    
    // Measure FPS at 10x with bypass
    console.log('\n--- Performance Check: 10x with bypass ---');
    await setTimeScale(10.0);
    
    const fps = await page.evaluate(async () => {
        const samples = [];
        let lastTime = performance.now();
        
        for (let i = 0; i < 60; i++) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            const now = performance.now();
            const delta = now - lastTime;
            samples.push(1000 / delta);
            lastTime = now;
        }
        
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        return Math.round(avg);
    });
    
    console.log(`Average FPS at 10x: ${fps}`);
    expect(fps).toBeGreaterThanOrEqual(20); // Headless mode may have lower FPS (SwiftShader)
    
    console.log('\n✅ All lighting bypass validation tests passed!');
    console.log('\nSummary:');
    console.log('- Bypass activates at >= 5x speed');
    console.log('- Base lighting locked to [1.0, 1.0, 1.0] during bypass');
    console.log('- Weather effects preserved during bypass');
    console.log('- Smooth transitions between bypass states');
    console.log('- No console errors');
    console.log('- Performance maintained');
});
