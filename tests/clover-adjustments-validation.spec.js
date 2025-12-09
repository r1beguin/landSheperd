const { test, expect } = require('@playwright/test');

test.describe('Clover Adjustments Validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081/test-adjustments.html');
        await page.waitForFunction(() => window.engine?.initialized === true, { timeout: 10000 });
        await page.waitForTimeout(2000); // Let initial render settle
    });

    test('Adjustment 1: Weathering rates reduced to 0.02/day', async ({ page }) => {
        console.log('\n🧪 Testing Adjustment 1: Weathering Rates');
        
        // Check config values
        const configRates = await page.evaluate(() => {
            return window.config.world.soil.weathering.baseRatePerDay;
        });
        
        console.log('Config rates:', configRates);
        expect(configRates.phosphorus).toBe(0.02);
        expect(configRates.potassium).toBe(0.02);
        
        // Run functional test
        await page.click('button:has-text("Test Weathering")');
        await page.waitForTimeout(1000);
        
        const result = await page.locator('#weathering-result').textContent();
        console.log('Weathering test result:', result);
        
        // Should show ~0.02/day rates
        expect(result).toContain('EXPECTED: ~0.02/day');
        
        // Take screenshot
        await page.screenshot({ 
            path: 'test-results/clover-adjustment-1-weathering.png',
            fullPage: false
        });
    });

    test('Adjustment 2: Clover dies within 2 days on depleted soil', async ({ page }) => {
        console.log('\n🧪 Testing Adjustment 2: Faster Death');
        
        // Spawn clover on depleted soil
        await page.click('button:has-text("Spawn Clover on Depleted Soil")');
        await page.waitForTimeout(500);
        
        // Get initial state
        const initialResult = await page.locator('#death-result').textContent();
        console.log('Initial state:', initialResult);
        
        // Advance 3 days (grace period is 2 days, so should die)
        await page.click('button:has-text("Advance 3 Days")');
        await page.waitForTimeout(1000);
        
        // Check result
        const finalResult = await page.locator('#death-result').textContent();
        console.log('Final state:', finalResult);
        
        // Should show death
        expect(finalResult).toContain('✅ PASS');
        expect(finalResult).toMatch(/Withered|removed/);
        
        // Take screenshot
        await page.screenshot({ 
            path: 'test-results/clover-adjustment-2-faster-death.png',
            fullPage: false
        });
    });

    test('Adjustment 3: Withered clover sprite looks like brown clover', async ({ page }) => {
        console.log('\n🧪 Testing Adjustment 3: Withered Sprite');
        
        // Spawn and force wither
        await page.click('button:has-text("Spawn & Force Wither")');
        await page.waitForTimeout(1000);
        
        const result = await page.locator('#sprite-result').textContent();
        console.log('Sprite test result:', result);
        
        // Verify it used the right generator
        expect(result).toContain('cloverWitheredGeneration');
        expect(result).toContain('✅');
        
        // Verify the plant is actually withered
        const plantStage = await page.evaluate(() => {
            const plants = window.engine.plantManager.getPlantAt(25, 25);
            return plants.length > 0 ? plants[0].stage : 'none';
        });
        
        expect(plantStage).toBe('Withered');
        
        // Take close-up screenshot
        await page.screenshot({ 
            path: 'test-results/clover-adjustment-3-withered-sprite.png',
            fullPage: false
        });
        
        console.log('✅ Withered sprite visual: test-results/clover-adjustment-3-withered-sprite.png');
    });

    test('Integration: Full lifecycle with new mechanics', async ({ page }) => {
        console.log('\n🧪 Testing Integration: Full Lifecycle');
        
        // 1. Spawn clover on medium fertility soil
        await page.evaluate(() => {
            window.engine.plantManager.plants.clear();
            const soil = window.engine.soilManager.getSoilAt(25, 25);
            soil.updateNutrients(20, 20, 20, 30);
            window.engine.plantManager.spawnPlantAt(25, 25, 'trifolium_repens');
        });
        
        await page.waitForTimeout(500);
        
        // 2. Let it grow and deplete soil
        await page.evaluate(() => {
            window.engine.timeManager.advanceGameDays(10);
        });
        
        await page.waitForTimeout(500);
        
        // 3. Check if it's dying/dead from depletion
        const status = await page.evaluate(() => {
            const plants = window.engine.plantManager.getPlantAt(25, 25);
            if (plants.length === 0) return { status: 'dead', stage: 'removed' };
            
            const plant = plants[0];
            const soil = window.engine.soilManager.getSoilAt(25, 25);
            
            return {
                status: plant.stage === 'Withered' ? 'withered' : 'alive',
                stage: plant.stage,
                daysStunted: plant.daysStunted,
                soil: {
                    n: soil.nutrientLayers.surface.nitrogen.toFixed(1),
                    p: soil.nutrientLayers.surface.phosphorus.toFixed(1),
                    k: soil.nutrientLayers.surface.potassium.toFixed(1)
                }
            };
        });
        
        console.log('Lifecycle status after 10 days:', status);
        
        // Should either be withered or heavily stunted
        expect(['withered', 'dead', 'alive']).toContain(status.status);
        if (status.status === 'alive') {
            // If still alive, should be stunted
            expect(status.daysStunted).toBeGreaterThan(0);
        }
        
        // Take screenshot
        await page.screenshot({ 
            path: 'test-results/clover-adjustment-integration.png',
            fullPage: false
        });
        
        console.log('📊 Integration test complete');
    });
});
