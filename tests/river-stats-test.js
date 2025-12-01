/**
 * Quick River Stats Test
 * Collects river generation statistics across multiple runs
 */

const { chromium } = require('playwright');

async function testRiverGeneration(seed) {
    const browser = await chromium.launch({ 
        headless: true,
        args: [
            '--use-gl=swiftshader',
            '--disable-gpu-sandbox',
            '--enable-webgl',
            '--enable-accelerated-2d-canvas'
        ]
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    const logs = [];
    page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
    });
    
    await page.goto('http://localhost:8081');
    
    if (seed) {
        await page.evaluate((s) => {
            localStorage.clear();
            localStorage.setItem('landShepherd_seed', s.toString());
        }, seed);
        await page.reload();
    }
    
    await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.soilManager, { timeout: 10000 });
    await page.waitForTimeout(1500);
    
    const stats = await page.evaluate(() => {
        const sm = window.graphicsEngine.soilManager;
        return {
            seed: sm.getSeed(),
            waterTileCount: sm.waterTiles.size,
            gridSize: { width: sm.gridWidth, height: sm.gridHeight }
        };
    });
    
    const riverLog = logs.find(l => l.text.includes('Rivers generated'));
    if (riverLog) {
        stats.riverLog = riverLog.text;
    }
    
    await browser.close();
    
    return stats;
}

(async () => {
    console.log('=== River Statistics Test ===\n');
    
    // Test 3 specific seeds
    const testSeeds = [12345, 67890, 99999];
    
    for (const seed of testSeeds) {
        console.log(`Testing seed ${seed}...`);
        const stats = await testRiverGeneration(seed);
        console.log(`  Seed: ${stats.seed}`);
        console.log(`  Water Tiles: ${stats.waterTileCount}`);
        console.log(`  ${stats.riverLog || 'No river log found'}`);
        console.log('');
    }
    
    console.log('=== Test Complete ===');
})();
