/**
 * Lighting Manager API Test
 * Tests MILESTONE 1 - LightingManager Foundation
 * 
 * Validates all public API methods and time-of-day transitions
 */

const { test, expect } = require('@playwright/test');

test('LightingManager API - All Methods Functional', async ({ page }) => {
  // Navigate to the game
  await page.goto('http://localhost:8081');
  
  // Wait for engine to initialize
  await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.lightingManager);
  
  // Wait a bit for first frame
  await page.waitForTimeout(500);
  
  console.log('✓ LightingManager loaded');
  
  // TEST 1: Manager exists and is accessible
  const managerExists = await page.evaluate(() => {
    return window.graphicsEngine.lightingManager !== null;
  });
  expect(managerExists).toBe(true);
  console.log('✓ LightingManager accessible via graphicsEngine.lightingManager');
  
  // TEST 2: isEnabled() returns true
  const isEnabled = await page.evaluate(() => {
    return window.graphicsEngine.lightingManager.isEnabled();
  });
  expect(isEnabled).toBe(true);
  console.log('✓ isEnabled() returns true');
  
  // TEST 3: getAmbientColor() returns RGBA array with values 0-1
  const ambientColor = await page.evaluate(() => {
    return window.graphicsEngine.lightingManager.getAmbientColor();
  });
  expect(Array.isArray(ambientColor)).toBe(true);
  expect(ambientColor.length).toBe(4); // RGBA
  ambientColor.forEach(value => {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });
  console.log(`✓ getAmbientColor() returns valid RGBA: [${ambientColor.map(v => v.toFixed(2)).join(', ')}]`);
  
  // TEST 4: getAmbientBrightness() returns 0-1 value
  const brightness = await page.evaluate(() => {
    return window.graphicsEngine.lightingManager.getAmbientBrightness();
  });
  expect(brightness).toBeGreaterThanOrEqual(0);
  expect(brightness).toBeLessThanOrEqual(1);
  console.log(`✓ getAmbientBrightness() returns valid value: ${brightness.toFixed(2)}`);
  
  // TEST 5: getCurrentPhase() returns phase name string
  const currentPhase = await page.evaluate(() => {
    return window.graphicsEngine.lightingManager.getCurrentPhase();
  });
  expect(typeof currentPhase).toBe('string');
  expect(currentPhase.length).toBeGreaterThan(0);
  console.log(`✓ getCurrentPhase() returns phase name: "${currentPhase}"`);
  
  // TEST 6: TimeManager.getHourOfDay() returns 0-24 hour value
  const hourOfDay = await page.evaluate(() => {
    return window.graphicsEngine.timeManager.getHourOfDay();
  });
  expect(hourOfDay).toBeGreaterThanOrEqual(0);
  expect(hourOfDay).toBeLessThan(24);
  console.log(`✓ TimeManager.getHourOfDay() returns: ${hourOfDay.toFixed(2)} hours`);
  
  // TEST 7: TimeManager.getTimeOfDayString() returns HH:MM format
  const timeString = await page.evaluate(() => {
    return window.graphicsEngine.timeManager.getTimeOfDayString();
  });
  expect(timeString).toMatch(/^\d{2}:\d{2}$/);
  console.log(`✓ TimeManager.getTimeOfDayString() returns: "${timeString}"`);
  
  // TEST 8: Manual override - setTimeOfDay(20) should set sunset lighting
  const sunsetTest = await page.evaluate(() => {
    const lm = window.graphicsEngine.lightingManager;
    lm.setTimeOfDay(20); // Sunset hour
    lm.update(0); // Force update
    return {
      phase: lm.getCurrentPhase(),
      brightness: lm.getAmbientBrightness(),
      color: lm.getAmbientColor()
    };
  });
  expect(sunsetTest.phase).toBe('sunset');
  expect(sunsetTest.brightness).toBeCloseTo(0.5, 1); // sunset brightness = 0.5
  console.log(`✓ setTimeOfDay(20) correctly sets phase: "${sunsetTest.phase}", brightness: ${sunsetTest.brightness.toFixed(2)}`);
  
  // TEST 9: Test different phases throughout the day
  const phaseTests = [
    { hour: 0, expectedPhase: 'night', expectedBrightness: 0.25 },
    { hour: 6, expectedPhase: 'earlyMorning', expectedBrightness: 0.65 },
    { hour: 10, expectedPhase: 'morning', expectedBrightness: 0.95 },
    { hour: 13, expectedPhase: 'midday', expectedBrightness: 1.0 },
    { hour: 16, expectedPhase: 'afternoon', expectedBrightness: 0.95 },
    { hour: 19, expectedPhase: 'evening', expectedBrightness: 0.75 },
    { hour: 20.5, expectedPhase: 'sunset', expectedBrightness: 0.5 },
    { hour: 22, expectedPhase: 'dusk', expectedBrightness: 0.35 }
  ];
  
  for (const test of phaseTests) {
    const result = await page.evaluate((hour) => {
      const lm = window.graphicsEngine.lightingManager;
      lm.setTimeOfDay(hour);
      lm.update(0);
      return {
        phase: lm.getCurrentPhase(),
        brightness: lm.getAmbientBrightness()
      };
    }, test.hour);
    
    expect(result.phase).toBe(test.expectedPhase);
    // Allow 10% tolerance for brightness (due to interpolation)
    expect(result.brightness).toBeCloseTo(test.expectedBrightness, 1);
    console.log(`✓ Hour ${test.hour}: phase="${result.phase}", brightness=${result.brightness.toFixed(2)}`);
  }
  
  // TEST 10: Reset time override
  await page.evaluate(() => {
    window.graphicsEngine.lightingManager.resetTimeOverride();
  });
  console.log('✓ resetTimeOverride() executed');
  
  // TEST 11: Verify smooth transitions between phases
  const transitionTest = await page.evaluate(() => {
    const lm = window.graphicsEngine.lightingManager;
    const results = [];
    
    // Test transition from night to earlyMorning (5h to 7h)
    for (let hour = 5.5; hour <= 6.5; hour += 0.25) {
      lm.setTimeOfDay(hour);
      lm.update(0);
      results.push({
        hour: hour,
        phase: lm.getCurrentPhase(),
        brightness: lm.getAmbientBrightness()
      });
    }
    
    return results;
  });
  
  // Verify brightness increases smoothly during transition
  for (let i = 1; i < transitionTest.length; i++) {
    expect(transitionTest[i].brightness).toBeGreaterThanOrEqual(transitionTest[i - 1].brightness);
  }
  console.log('✓ Smooth transitions verified - brightness increases monotonically');
  
  console.log('\n============================================================');
  console.log('✅ ALL LIGHTING MANAGER API TESTS PASSED');
  console.log('============================================================');
});
