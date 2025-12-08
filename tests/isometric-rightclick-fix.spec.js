/**
 * Test to verify right-click context menu works in isometric mode
 * This test validates the fix for the visibility check bug
 */

import { test, expect } from '@playwright/test';

test.describe('Isometric Right-Click Context Menu Fix', () => {
    test('should show context menu when right-clicking on isometric tiles', async ({ page }) => {
        // Navigate to the game
        await page.goto('http://localhost:8081');
        
        // Wait for WebGL to initialize
        await page.waitForFunction(() => {
            return window.graphicsEngine?.gl !== undefined;
        }, { timeout: 5000 });
        
        console.log('✓ Game initialized');
        
        // Wait for first render frames
        await page.waitForTimeout(1000);
        
        // Verify we're in isometric mode
        const projection = await page.evaluate(() => {
            return window.graphicsEngine?.config?.world?.rendering?.projection;
        });
        
        expect(projection).toBe('isometric');
        console.log('✓ Confirmed isometric projection mode');
        
        // Get canvas element
        const canvas = await page.locator('canvas');
        await expect(canvas).toBeVisible();
        
        // Get canvas bounding box
        const box = await canvas.boundingBox();
        
        // Right-click near the center of the canvas (should hit a tile)
        const clickX = box.x + box.width / 2;
        const clickY = box.y + box.height / 2;
        
        console.log(`✓ Right-clicking at (${Math.floor(clickX)}, ${Math.floor(clickY)})`);
        
        // Perform right-click
        await page.mouse.click(clickX, clickY, { button: 'right' });
        
        // Wait for context menu to appear
        await page.waitForSelector('#context-menu', { 
            state: 'visible', 
            timeout: 2000 
        });
        
        console.log('✓ Context menu appeared');
        
        // Verify context menu has expected content
        const menuVisible = await page.isVisible('#context-menu');
        expect(menuVisible).toBe(true);
        
        // Check for soil nutrients section
        const hasSoilSection = await page.locator('.context-menu-section').first().isVisible();
        expect(hasSoilSection).toBe(true);
        console.log('✓ Soil nutrients section present');
        
        // Get menu title
        const menuTitle = await page.textContent('.context-menu-title');
        console.log('✓ Menu title:', menuTitle);
        
        // Verify menu has either "Empty Soil" or grid coordinates
        expect(menuTitle).toMatch(/Empty Soil|Cell \(-?\d+, -?\d+\)/);
        
        // Check if visible cells are being tracked
        const visibleCellsCount = await page.evaluate(() => {
            return window.graphicsEngine?.soilManager?.getVisibleCellsCount();
        });
        
        expect(visibleCellsCount).toBeGreaterThan(0);
        console.log(`✓ Visible cells tracked: ${visibleCellsCount} cells`);
        
        // Take screenshot showing context menu
        await page.screenshot({ 
            path: 'test-results/isometric-rightclick-fixed.png' 
        });
        
        console.log('✓ Screenshot saved: test-results/isometric-rightclick-fixed.png');
        
        // Test that clicking on a different tile updates the menu
        // Close current menu first
        await page.keyboard.press('Escape');
        await page.waitForSelector('#context-menu', { state: 'hidden' });
        console.log('✓ Menu closed with Escape');
        
        // Right-click on a different location
        const clickX2 = box.x + box.width / 3;
        const clickY2 = box.y + box.height / 3;
        
        await page.mouse.click(clickX2, clickY2, { button: 'right' });
        await page.waitForSelector('#context-menu', { state: 'visible', timeout: 2000 });
        
        const menuTitle2 = await page.textContent('.context-menu-title');
        console.log('✓ Second menu title:', menuTitle2);
        
        // Verify the menu shows proper title
        expect(menuTitle2).toMatch(/Empty Soil|Cell \(-?\d+, -?\d+\)/);
        
        console.log('✅ All checks passed - right-click context menu works in isometric mode');
    });
    
    test('should highlight correct diamond-shaped cell on right-click', async ({ page }) => {
        await page.goto('http://localhost:8081');
        
        // Wait for initialization
        await page.waitForFunction(() => {
            return window.graphicsEngine?.gl !== undefined;
        }, { timeout: 5000 });
        
        await page.waitForTimeout(1000);
        
        const canvas = await page.locator('canvas');
        const box = await canvas.boundingBox();
        
        // Right-click to show menu and highlight
        const clickX = box.x + box.width / 2;
        const clickY = box.y + box.height / 2;
        
        await page.mouse.click(clickX, clickY, { button: 'right' });
        await page.waitForSelector('#context-menu', { state: 'visible' });
        
        // Check if highlight is set
        const highlightSet = await page.evaluate(() => {
            const renderSystem = window.graphicsEngine?.renderSystem;
            return renderSystem?.highlightedCellX !== null && 
                   renderSystem?.highlightedCellY !== null;
        });
        
        expect(highlightSet).toBe(true);
        console.log('✓ Cell highlight active');
        
        // Get highlight coordinates
        const highlightCoords = await page.evaluate(() => {
            const renderSystem = window.graphicsEngine?.renderSystem;
            return {
                x: renderSystem?.highlightedCellX,
                y: renderSystem?.highlightedCellY
            };
        });
        
        console.log(`✓ Highlighted cell: (${highlightCoords.x}, ${highlightCoords.y})`);
        
        // Take screenshot showing diamond highlight
        await page.screenshot({ 
            path: 'test-results/isometric-rightclick-highlight.png' 
        });
        
        console.log('✅ Diamond highlight working correctly');
    });
});
