/**
 * Manual Seed System Testing
 * Run with: node tests/manual-seed-test.js
 */

const { chromium } = require('playwright');

(async () => {
    console.log('=== Seed System Manual Test ===\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Test 1: Initial load with random seed
    console.log('Test 1: Loading with random seed...');
    await page.goto('http://localhost:8081');
    
    await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.soilManager, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const firstSeed = await page.evaluate(() => {
        return window.graphicsEngine.soilManager.getSeed();
    });
    
    console.log(`  ✓ Seed: ${firstSeed}`);
    
    // Check seed UI display
    const displayedSeed = await page.locator('#current-seed').textContent();
    console.log(`  ✓ UI displays: ${displayedSeed}`);
    console.log(`  ${displayedSeed === firstSeed.toString() ? '✓ PASS' : '✗ FAIL'}: Seed matches UI\n`);
    
    // Take sample of soil
    const firstSoil = await page.evaluate(() => {
        const soil1 = window.graphicsEngine.soilManager.getSoilAt(0, 0);
        const soil2 = window.graphicsEngine.soilManager.getSoilAt(5, 5);
        const soil3 = window.graphicsEngine.soilManager.getSoilAt(-5, -5);
        
        return {
            s1: { n: soil1.nitrogen.toFixed(2), f: soil1.fertility.toFixed(2) },
            s2: { n: soil2.nitrogen.toFixed(2), f: soil2.fertility.toFixed(2) },
            s3: { n: soil3.nitrogen.toFixed(2), f: soil3.fertility.toFixed(2) }
        };
    });
    
    console.log('  Soil samples (N, Fertility):');
    console.log(`    (0,0):   N=${firstSoil.s1.n}, F=${firstSoil.s1.f}`);
    console.log(`    (5,5):   N=${firstSoil.s2.n}, F=${firstSoil.s2.f}`);
    console.log(`    (-5,-5): N=${firstSoil.s3.n}, F=${firstSoil.s3.f}\n`);
    
    // Test 2: Reload page - should use same seed (localStorage)
    console.log('Test 2: Reloading page (seed should persist)...');
    await page.reload();
    await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.soilManager, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const secondSeed = await page.evaluate(() => {
        return window.graphicsEngine.soilManager.getSeed();
    });
    
    console.log(`  ✓ Seed after reload: ${secondSeed}`);
    console.log(`  ${secondSeed === firstSeed ? '✓ PASS' : '✗ FAIL'}: Seed persisted\n`);
    
    const secondSoil = await page.evaluate(() => {
        const soil1 = window.graphicsEngine.soilManager.getSoilAt(0, 0);
        const soil2 = window.graphicsEngine.soilManager.getSoilAt(5, 5);
        const soil3 = window.graphicsEngine.soilManager.getSoilAt(-5, -5);
        
        return {
            s1: { n: soil1.nitrogen.toFixed(2), f: soil1.fertility.toFixed(2) },
            s2: { n: soil2.nitrogen.toFixed(2), f: soil2.fertility.toFixed(2) },
            s3: { n: soil3.nitrogen.toFixed(2), f: soil3.fertility.toFixed(2) }
        };
    });
    
    const soilMatches = 
        firstSoil.s1.n === secondSoil.s1.n &&
        firstSoil.s1.f === secondSoil.s1.f &&
        firstSoil.s2.n === secondSoil.s2.n &&
        firstSoil.s2.f === secondSoil.s2.f &&
        firstSoil.s3.n === secondSoil.s3.n &&
        firstSoil.s3.f === secondSoil.s3.f;
    
    console.log(`  ${soilMatches ? '✓ PASS' : '✗ FAIL'}: Terrain is identical\n`);
    
    // Test 3: Manual seed entry
    console.log('Test 3: Testing manual seed entry (12345)...');
    await page.fill('#seed-input', '12345');
    
    // Click regenerate and wait for reload
    await Promise.all([
        page.waitForNavigation({ timeout: 10000 }),
        page.click('#regenerate-btn')
    ]);
    
    await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.soilManager, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const manualSeed = await page.evaluate(() => {
        return window.graphicsEngine.soilManager.getSeed();
    });
    
    console.log(`  ✓ Seed after manual entry: ${manualSeed}`);
    console.log(`  ${manualSeed === 12345 ? '✓ PASS' : '✗ FAIL'}: Manual seed applied\n`);
    
    const thirdSoil = await page.evaluate(() => {
        const soil1 = window.graphicsEngine.soilManager.getSoilAt(0, 0);
        return {
            s1: { n: soil1.nitrogen.toFixed(2), f: soil1.fertility.toFixed(2) }
        };
    });
    
    const terrainChanged = firstSoil.s1.n !== thirdSoil.s1.n || firstSoil.s1.f !== thirdSoil.s1.f;
    console.log(`  ${terrainChanged ? '✓ PASS' : '✗ FAIL'}: Terrain changed with new seed`);
    console.log(`    Original (0,0): N=${firstSoil.s1.n}, F=${firstSoil.s1.f}`);
    console.log(`    New (0,0):      N=${thirdSoil.s1.n}, F=${thirdSoil.s1.f}\n`);
    
    // Test 4: Copy button
    console.log('Test 4: Testing copy seed button...');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.click('#copy-seed-btn');
    await page.waitForTimeout(500);
    
    const clipboardText = await page.evaluate(async () => {
        try {
            return await navigator.clipboard.readText();
        } catch (e) {
            return 'ERROR: ' + e.message;
        }
    });
    
    console.log(`  ✓ Clipboard content: ${clipboardText}`);
    console.log(`  ${clipboardText === '12345' ? '✓ PASS' : '✗ FAIL'}: Seed copied correctly\n`);
    
    // Test 5: Different seeds produce different terrain
    console.log('Test 5: Testing different seeds (67890 vs 12345)...');
    await page.fill('#seed-input', '67890');
    await Promise.all([
        page.waitForNavigation({ timeout: 10000 }),
        page.click('#regenerate-btn')
    ]);
    
    await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.soilManager, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const newSeed = await page.evaluate(() => {
        return window.graphicsEngine.soilManager.getSeed();
    });
    
    const fourthSoil = await page.evaluate(() => {
        const soil1 = window.graphicsEngine.soilManager.getSoilAt(0, 0);
        return {
            s1: { n: soil1.nitrogen.toFixed(2), f: soil1.fertility.toFixed(2) }
        };
    });
    
    const terrainDifferent = thirdSoil.s1.n !== fourthSoil.s1.n || thirdSoil.s1.f !== fourthSoil.s1.f;
    console.log(`  ✓ New seed: ${newSeed}`);
    console.log(`  ${terrainDifferent ? '✓ PASS' : '✗ FAIL'}: Different seeds produce different terrain`);
    console.log(`    Seed 12345 (0,0): N=${thirdSoil.s1.n}, F=${thirdSoil.s1.f}`);
    console.log(`    Seed 67890 (0,0): N=${fourthSoil.s1.n}, F=${fourthSoil.s1.f}\n`);
    
    console.log('=== Test Complete ===');
    console.log('Press any key in browser to close...');
    
    await page.waitForTimeout(5000);
    await browser.close();
})();
