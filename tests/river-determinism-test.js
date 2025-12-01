/**
 * River Determinism Test
 * Tests that rivers generate consistently with same seed
 */

const { chromium } = require('playwright');

(async () => {
    console.log('=== River Determinism Test ===\n');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: [
            '--use-gl=swiftshader',
            '--disable-gpu-sandbox',
            '--enable-webgl',
            '--enable-accelerated-2d-canvas'
        ]
    });
    
    const testSeeds = [12345, 67890, 99999];
    
    for (const seed of testSeeds) {
        console.log(`\n--- Testing Seed: ${seed} ---`);
        
        // Clear localStorage and set seed
        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();
        
        await page.goto('http://localhost:8081');
        await page.evaluate((s) => {
            localStorage.clear();
            localStorage.setItem('landShepherd_seed', s.toString());
        }, seed);
        
        // Reload with seed
        await page.reload();
        await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.soilManager, { timeout: 10000 });
        await page.waitForTimeout(1500);
        
        // Get first load data
        const firstLoad = await page.evaluate(() => {
            const waterTiles = [];
            const soilManager = window.graphicsEngine.soilManager;
            
            // Sample water tiles
            for (let x = -25; x <= 25; x++) {
                for (let y = -25; y <= 25; y++) {
                    if (soilManager.isWaterAt(x, y)) {
                        waterTiles.push({
                            x, y,
                            depth: soilManager.getWaterDepthAt(x, y)
                        });
                    }
                }
            }
            
            return {
                seed: soilManager.getSeed(),
                waterTileCount: waterTiles.length,
                sampleTiles: waterTiles.slice(0, 10) // First 10 for comparison
            };
        });
        
        console.log(`  Load 1: Seed=${firstLoad.seed}, WaterTiles=${firstLoad.waterTileCount}`);
        
        // Reload same seed
        await page.reload();
        await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.soilManager, { timeout: 10000 });
        await page.waitForTimeout(1500);
        
        const secondLoad = await page.evaluate(() => {
            const waterTiles = [];
            const soilManager = window.graphicsEngine.soilManager;
            
            for (let x = -25; x <= 25; x++) {
                for (let y = -25; y <= 25; y++) {
                    if (soilManager.isWaterAt(x, y)) {
                        waterTiles.push({
                            x, y,
                            depth: soilManager.getWaterDepthAt(x, y)
                        });
                    }
                }
            }
            
            return {
                seed: soilManager.getSeed(),
                waterTileCount: waterTiles.length,
                sampleTiles: waterTiles.slice(0, 10)
            };
        });
        
        console.log(`  Load 2: Seed=${secondLoad.seed}, WaterTiles=${secondLoad.waterTileCount}`);
        
        // Verify determinism
        const seedMatch = firstLoad.seed === secondLoad.seed;
        const countMatch = firstLoad.waterTileCount === secondLoad.waterTileCount;
        
        let tilesMatch = true;
        for (let i = 0; i < firstLoad.sampleTiles.length; i++) {
            const t1 = firstLoad.sampleTiles[i];
            const t2 = secondLoad.sampleTiles[i];
            if (t1.x !== t2.x || t1.y !== t2.y || t1.depth !== t2.depth) {
                tilesMatch = false;
                break;
            }
        }
        
        console.log(`  ${seedMatch ? '✓' : '✗'} Seed matches: ${firstLoad.seed}`);
        console.log(`  ${countMatch ? '✓' : '✗'} Water tile count matches: ${firstLoad.waterTileCount}`);
        console.log(`  ${tilesMatch ? '✓' : '✗'} Water tile positions/depths match`);
        console.log(`  ${seedMatch && countMatch && tilesMatch ? '✓ PASS' : '✗ FAIL'}: Deterministic generation`);
        
        await context.close();
    }
    
    console.log('\n=== Test Complete ===');
    await browser.close();
})();
