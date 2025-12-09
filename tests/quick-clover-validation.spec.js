const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

let server;

test.describe('Clover Adjustments - Quick Validation', () => {
    test.beforeAll(async () => {
        // Start local server
        server = spawn('npx', ['http-server', '-p', '8082', '-c-1'], {
            cwd: path.resolve(__dirname, '..'),
            shell: true
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Server started on port 8082');
    });

    test.afterAll(async () => {
        if (server) {
            server.kill();
        }
    });

    test('Verify all three adjustments are applied', async ({ page }) => {
        await page.goto('http://localhost:8082');
        await page.waitForFunction(() => window.graphicsEngine?.initialized === true, { timeout: 10000 });
        await page.waitForTimeout(2000);

        // ADJUSTMENT 1: Check weathering rates
        const weatheringRates = await page.evaluate(() => {
            return window.config.world.soil.weathering.baseRatePerDay;
        });
        
        console.log('✅ Adjustment 1 - Weathering rates:', weatheringRates);
        expect(weatheringRates.phosphorus).toBe(0.02);
        expect(weatheringRates.potassium).toBe(0.02);

        // ADJUSTMENT 2: Check clover grace period
        const gracePeriod = await page.evaluate(() => {
            const speciesData = window.graphicsEngine.plantManager.speciesConfigs.get('trifolium_repens');
            const flowering = speciesData.growthStages.find(s => s.name === 'Flowering');
            return flowering?.starvation?.gracePeriod || null;
        });
        
        console.log('✅ Adjustment 2 - Clover grace period:', gracePeriod);
        expect(gracePeriod).toBe(2);

        // ADJUSTMENT 3: Check withered generator
        const witheredGenerator = await page.evaluate(() => {
            const speciesData = window.graphicsEngine.plantManager.speciesConfigs.get('trifolium_repens');
            const withered = speciesData.growthStages.find(s => s.name === 'Withered');
            return withered?.generator || null;
        });
        
        console.log('✅ Adjustment 3 - Withered generator:', witheredGenerator);
        expect(witheredGenerator).toBe('cloverWitheredGeneration');

        // FUNCTIONAL TEST: Spawn clover on depleted soil and verify faster death
        const deathTest = await page.evaluate(() => {
            // Clear existing
            window.graphicsEngine.plantManager.plants.clear();
            
            // Deplete soil
            const soil = window.graphicsEngine.soilManager.getSoilAt(25, 25);
            soil.updateNutrients(0, 0, 0, 10);
            
            // Spawn clover
            window.graphicsEngine.plantManager.spawnPlantAt(25, 25, 'trifolium_repens');
            
            // Advance 3 days (beyond 2-day grace period)
            window.graphicsEngine.timeManager.advanceGameDays(3);
            
            // Check if dead or withered
            const plants = window.graphicsEngine.plantManager.getPlantAt(25, 25);
            if (plants.length === 0) return { status: 'dead', stage: 'removed' };
            
            return {
                status: plants[0].stage === 'Withered' ? 'withered' : 'alive',
                stage: plants[0].stage,
                daysStunted: plants[0].daysStunted
            };
        });
        
        console.log('✅ Death test result:', deathTest);
        expect(['dead', 'withered']).toContain(deathTest.status);

        // VISUAL TEST: Spawn withered clover and capture sprite
        await page.evaluate(() => {
            window.graphicsEngine.plantManager.plants.clear();
            const soil = window.graphicsEngine.soilManager.getSoilAt(25, 25);
            soil.updateNutrients(50, 50, 50, 50);
            window.graphicsEngine.plantManager.spawnPlantAt(25, 25, 'trifolium_repens');
            
            const plants = window.graphicsEngine.plantManager.getPlantAt(25, 25);
            if (plants.length > 0) {
                plants[0].forceWither(window.graphicsEngine.timeManager.getCurrentGameDay());
            }
            
            // Center camera on withered clover
            window.graphicsEngine.cameraManager.setZoom(4.0);
            window.graphicsEngine.cameraManager.centerOn(25 * 20, 25 * 20);
        });
        
        await page.waitForTimeout(500);
        
        await page.screenshot({
            path: 'test-results/clover-withered-sprite.png',
            clip: { x: 0, y: 0, width: 800, height: 600 }
        });
        
        console.log('✅ Withered sprite screenshot: test-results/clover-withered-sprite.png');
        
        console.log('\n📊 ALL ADJUSTMENTS VERIFIED SUCCESSFULLY');
    });
});
