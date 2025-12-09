/**
 * Visual validation test for bypass indicator in debug overlay
 */

const { test } = require('@playwright/test');

test('Visual Validation - Bypass Indicator', async ({ page }) => {
    await page.goto('http://localhost:8081');
    
    await page.waitForFunction(() => {
        return window.graphicsEngine && 
               window.graphicsEngine.lightingManager && 
               window.graphicsEngine.timeManager;
    }, { timeout: 5000 });
    
    console.log('✓ Engine initialized');
    
    // Set time to night
    await page.evaluate(() => {
        window.graphicsEngine.lightingManager.setTimeOfDay(2); // 2am
    });
    
    // Test 1: 1x speed - NO bypass indicator
    await page.evaluate(() => {
        window.graphicsEngine.timeManager.setTimeScale(1.0);
    });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
        path: 'test-results/milestone3/ui-1x-no-bypass.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 1x (no bypass indicator)');
    
    // Test 2: 5x speed - WITH bypass indicator
    await page.evaluate(() => {
        window.graphicsEngine.timeManager.setTimeScale(5.0);
    });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
        path: 'test-results/milestone3/ui-5x-bypass-indicator.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 5x (WITH bypass indicator)');
    
    // Test 3: 10x speed - WITH bypass indicator
    await page.evaluate(() => {
        window.graphicsEngine.timeManager.setTimeScale(10.0);
    });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
        path: 'test-results/milestone3/ui-10x-bypass-indicator.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 10x (WITH bypass indicator)');
    
    // Test 4: 10x with rainy weather - bypass + weather dimming
    await page.evaluate(() => {
        const wm = window.graphicsEngine.weatherManager;
        const currentDay = window.graphicsEngine.timeManager.getCurrentDay();
        wm.setWeather('rainy', currentDay);
    });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
        path: 'test-results/milestone3/ui-10x-bypass-rainy.png',
        fullPage: false 
    });
    console.log('✓ Screenshot: 10x rainy (bypass + weather)');
    
    console.log('\n✅ Visual validation complete');
    console.log('Check test-results/milestone3/ for screenshots showing bypass indicator');
});
