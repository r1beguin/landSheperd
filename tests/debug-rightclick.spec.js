/**
 * Debug test for right-click context menu in isometric mode
 */

import { test, expect } from '@playwright/test';

test.describe('Right-Click Debug Test', () => {
    test('should show context menu on right-click', async ({ page }) => {
        // Navigate to the game
        await page.goto('http://localhost:8081');
        
        // Wait for game to load
        await page.waitForTimeout(2000);
        
        // Listen to console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            console.log('[BROWSER]', text);
            logs.push(text);
        });
        
        // Get canvas element
        const canvas = await page.locator('canvas');
        await expect(canvas).toBeVisible();
        
        // Get canvas bounding box
        const box = await canvas.boundingBox();
        console.log('[TEST] Canvas box:', box);
        
        // Right-click in the center of the canvas
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        console.log('[TEST] Right-clicking at:', centerX, centerY);
        
        // Perform right-click
        await page.mouse.click(centerX, centerY, { button: 'right' });
        
        // Wait a bit for the context menu to appear
        await page.waitForTimeout(500);
        
        // Check console logs
        console.log('\n=== CONSOLE LOGS ===');
        logs.forEach(log => console.log(log));
        
        // Check if context menu appeared
        const contextMenu = await page.locator('.context-menu').isVisible().catch(() => false);
        console.log('[TEST] Context menu visible:', contextMenu);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/debug-rightclick.png' });
        
        // Keep browser open for manual inspection
        console.log('\n[TEST] Browser will stay open for 30 seconds for inspection...');
        await page.waitForTimeout(30000);
    });
});
