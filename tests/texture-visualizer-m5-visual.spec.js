/**
 * Visual validation test for Texture Visualizer Milestone 5
 * Captures screenshots of all new UI features
 */

const { test, expect } = require('@playwright/test');

test.describe('Texture Visualizer M5 - Visual Validation', () => {
    test('Capture cache statistics panel', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Generate some sprites to populate cache stats
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '2');
        
        // First generation (cache MISS)
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Second generation (cache HIT)
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Capture cache statistics panel
        await page.screenshot({ 
            path: 'test-results/m5-cache-statistics-panel.png',
            fullPage: false
        });
        
        console.log('✓ Screenshot saved: m5-cache-statistics-panel.png');
    });

    test('Capture single sprite with generation time and cache status', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Generate sprite
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '2'); // Flowering
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Capture sprite with metadata showing generation time
        await page.screenshot({ 
            path: 'test-results/m5-single-sprite-with-time.png',
            fullPage: false
        });
        
        console.log('✓ Screenshot saved: m5-single-sprite-with-time.png');
    });

    test('Capture batch generation - Oak all stages', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Generate all Oak stages
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        // Capture full batch view with performance summary
        await page.screenshot({ 
            path: 'test-results/m5-batch-generation-oak.png',
            fullPage: true
        });
        
        console.log('✓ Screenshot saved: m5-batch-generation-oak.png (4 stages)');
    });

    test('Capture batch generation - Nettles all stages', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Generate all Nettles stages
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        // Capture full batch view
        await page.screenshot({ 
            path: 'test-results/m5-batch-generation-nettles.png',
            fullPage: true
        });
        
        console.log('✓ Screenshot saved: m5-batch-generation-nettles.png (4 stages)');
    });

    test('Capture batch generation - Clover all stages', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Generate all Clover stages
        await page.selectOption('#species-select', 'trifolium_repens');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        // Capture full batch view
        await page.screenshot({ 
            path: 'test-results/m5-batch-generation-clover.png',
            fullPage: true
        });
        
        console.log('✓ Screenshot saved: m5-batch-generation-clover.png (3+ stages)');
    });

    test('Capture performance summary detail', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Generate all stages
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-all-stages-btn');
        await page.waitForTimeout(5000);
        
        // Scroll to performance summary
        await page.locator('.metadata-panel').last().scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        // Capture performance summary panel
        const summaryPanel = page.locator('.metadata-panel').last();
        await summaryPanel.screenshot({ 
            path: 'test-results/m5-performance-summary-detail.png'
        });
        
        console.log('✓ Screenshot saved: m5-performance-summary-detail.png');
    });

    test('Capture cache cleared confirmation', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Generate a sprite to populate cache
        await page.selectOption('#species-select', 'urtica_dioica');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Clear cache
        await page.click('#clear-cache-btn');
        await page.waitForTimeout(1000);
        
        // Capture status bar with clear confirmation
        await page.screenshot({ 
            path: 'test-results/m5-cache-cleared-confirmation.png',
            fullPage: false
        });
        
        console.log('✓ Screenshot saved: m5-cache-cleared-confirmation.png');
    });

    test('Capture cache HIT vs MISS comparison', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Clear cache first
        await page.click('#clear-cache-btn');
        await page.waitForTimeout(500);
        
        // Select species
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '2');
        
        // First generation (MISS)
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Capture MISS
        await page.screenshot({ 
            path: 'test-results/m5-cache-miss.png',
            fullPage: false
        });
        console.log('✓ Screenshot saved: m5-cache-miss.png');
        
        // Second generation (HIT)
        await page.click('#generate-btn');
        await page.waitForTimeout(2000);
        
        // Capture HIT
        await page.screenshot({ 
            path: 'test-results/m5-cache-hit.png',
            fullPage: false
        });
        console.log('✓ Screenshot saved: m5-cache-hit.png');
    });

    test('Capture controls panel with new buttons', async ({ page }) => {
        await page.goto('http://localhost:8081/texture_visualizer.html');
        await page.waitForTimeout(2000);
        
        // Select species to enable buttons
        await page.selectOption('#species-select', 'quercus_robur');
        await page.waitForTimeout(500);
        await page.selectOption('#stage-select', '0');
        
        // Capture left controls panel
        const controlsPanel = page.locator('.controls-panel');
        await controlsPanel.screenshot({ 
            path: 'test-results/m5-controls-panel.png'
        });
        
        console.log('✓ Screenshot saved: m5-controls-panel.png');
    });
});
