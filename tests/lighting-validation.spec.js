/**
 * Lighting System Validation Test
 * 
 * Tests the lighting system at different times of day to validate:
 * - Shader compilation succeeds
 * - Ambient light uniforms are correctly applied
 * - Visual changes match expected lighting phases
 * - Performance is maintained with lighting enabled
 */

const { test, expect } = require('@playwright/test');

test('Lighting System - Time of Day Validation', async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:8081');
    
    // Wait for graphics engine to initialize
    await page.waitForFunction(() => {
        return window.graphicsEngine && 
               window.graphicsEngine.lightingManager && 
               window.graphicsEngine.timeManager;
    }, { timeout: 5000 });
    
    console.log('✓ Graphics engine initialized');
    
    // Test different times of day
    const timeStates = [
        { hour: 0, name: 'night_0h', expectedPhase: 'night', expectedBrightnessRange: [0.20, 0.30] },
        { hour: 7, name: 'earlyMorning_7h', expectedPhase: 'earlyMorning', expectedBrightnessRange: [0.60, 0.70] },
        { hour: 12, name: 'midday_12h', expectedPhase: 'midday', expectedBrightnessRange: [0.95, 1.00] },
        { hour: 20, name: 'sunset_20h', expectedPhase: 'sunset', expectedBrightnessRange: [0.45, 0.55] },
        { hour: 23, name: 'night_23h', expectedPhase: 'dusk', expectedBrightnessRange: [0.30, 0.40] }
    ];
    
    for (const timeState of timeStates) {
        console.log(`\n--- Testing: ${timeState.name} ---`);
        
        // Set time of day
        await page.evaluate((hour) => {
            window.graphicsEngine.lightingManager.setTimeOfDay(hour);
            // Force an update
            window.graphicsEngine.lightingManager.update(0);
        }, timeState.hour);
        
        // Wait for a frame to render
        await page.waitForTimeout(100);
        
        // Get lighting state
        const lightingState = await page.evaluate(() => {
            const lm = window.graphicsEngine.lightingManager;
            return {
                phase: lm.getCurrentPhase(),
                brightness: lm.getAmbientBrightness(),
                ambientColor: lm.getAmbientColor(),
                enabled: lm.isEnabled()
            };
        });
        
        console.log(`Phase: ${lightingState.phase}`);
        console.log(`Brightness: ${(lightingState.brightness * 100).toFixed(1)}%`);
        console.log(`Ambient color: [${lightingState.ambientColor.map(c => c.toFixed(2)).join(', ')}]`);
        
        // Validate phase
        expect(lightingState.phase).toBe(timeState.expectedPhase);
        
        // Validate brightness is in expected range
        expect(lightingState.brightness).toBeGreaterThanOrEqual(timeState.expectedBrightnessRange[0]);
        expect(lightingState.brightness).toBeLessThanOrEqual(timeState.expectedBrightnessRange[1]);
        
        // Validate lighting is enabled
        expect(lightingState.enabled).toBe(true);
        
        // Capture screenshot
        await page.screenshot({ 
            path: `test-results/lighting/${timeState.name}.png`,
            fullPage: false 
        });
        
        console.log(`✓ Screenshot saved: ${timeState.name}.png`);
    }
    
    // Check shader compilation (no console errors)
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    // Wait a bit to catch any delayed errors
    await page.waitForTimeout(500);
    
    // Validate no shader compilation errors
    const shaderErrors = consoleErrors.filter(err => 
        err.includes('SHADER') || 
        err.includes('WebGL') || 
        err.includes('u_ambientLight')
    );
    
    expect(shaderErrors).toHaveLength(0);
    
    // Measure FPS with lighting enabled
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
    
    console.log(`\n--- Performance Check ---`);
    console.log(`Average FPS: ${fps}`);
    
    // Validate FPS is acceptable (headless target: 30+)
    expect(fps).toBeGreaterThanOrEqual(30);
    
    console.log('\n✅ All lighting validation tests passed!');
});
