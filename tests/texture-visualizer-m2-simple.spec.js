const { test, expect } = require('@playwright/test');

test.describe('Texture Visualizer M2', () => {
    test('basic sprite generation', async ({ page }) => {
        // Navigate
        await page.goto('http://localhost:8081/texture_visualizer.html');
        
        // Wait for species to load
        await page.waitForTimeout(2000);
        
        // Select Nettles
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(500);
        
        // Select Seedling stage
        await page.selectOption('#stage-select', '0');
        await page.waitForTimeout(500);
        
        // Click generate
        await page.click('#generate-btn');
        
        // Wait for canvas to appear
        await page.waitForSelector('.sprite-canvas', { timeout: 5000 });
        
        // Screenshot
        await page.screenshot({ 
            path: 'test-results/texture-visualizer-m2-test.png',
            fullPage: true
        });
        
        // Check canvas exists
        const canvas = await page.$('.sprite-canvas');
        expect(canvas).not.toBeNull();
        
        console.log('Test complete - screenshot saved');
    });
});
