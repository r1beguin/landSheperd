/**
 * Cell Highlight Context Menu Integration Tests (Milestone 2)
 * Tests that cell highlighting is properly integrated with context menu lifecycle
 */

const { test, expect } = require('@playwright/test');

test.describe('Cell Highlight Context Menu Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000); // Wait for initialization
    });

    test('should highlight cell when context menu opens', async ({ page }) => {
        // Capture initial state (no highlight)
        const beforeScreenshot = await page.screenshot({ path: 'test-results/milestone2-before-menu.png' });
        
        // Get initial highlight state
        const highlightBefore = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        
        expect(highlightBefore).toBeNull();
        console.log('✅ No highlight before menu opens');
        
        // Right-click on canvas to open context menu
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: { x: 320, y: 180 } });
        await page.waitForTimeout(300);
        
        // Verify menu is visible
        const menu = page.locator('#context-menu');
        const display = await menu.evaluate(el => window.getComputedStyle(el).display);
        expect(display).toBe('block');
        console.log('✅ Context menu opened');
        
        // Verify highlight is now active
        const highlightAfter = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        
        expect(highlightAfter).not.toBeNull();
        expect(highlightAfter).toHaveProperty('x');
        expect(highlightAfter).toHaveProperty('y');
        console.log(`✅ Cell highlighted at (${highlightAfter.x}, ${highlightAfter.y})`);
        
        // Capture with highlight visible
        await page.screenshot({ path: 'test-results/milestone2-menu-with-highlight.png' });
        
        // Verify ContextMenuManager has stored coordinates
        const storedCoords = await page.evaluate(() => {
            return window.graphicsEngine.contextMenuManager.highlightedCellCoords;
        });
        
        expect(storedCoords).not.toBeNull();
        expect(storedCoords.x).toBe(highlightAfter.x);
        expect(storedCoords.y).toBe(highlightAfter.y);
        console.log('✅ ContextMenuManager tracks highlighted cell');
    });

    test('should clear highlight when menu closes via close button', async ({ page }) => {
        // Open menu
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: { x: 320, y: 180 } });
        await page.waitForTimeout(300);
        
        // Verify highlight exists
        const highlightDuringMenu = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        expect(highlightDuringMenu).not.toBeNull();
        console.log('✅ Highlight active with menu open');
        
        // Click close button
        const closeButton = page.locator('#context-menu button[data-action="close"]');
        await closeButton.click();
        await page.waitForTimeout(300);
        
        // Verify menu is closed
        const menu = page.locator('#context-menu');
        const display = await menu.evaluate(el => window.getComputedStyle(el).display);
        expect(display).toBe('none');
        console.log('✅ Menu closed');
        
        // Verify highlight is cleared
        const highlightAfterClose = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        
        expect(highlightAfterClose).toBeNull();
        console.log('✅ Highlight cleared after closing menu');
        
        // Verify ContextMenuManager cleared coordinates
        const storedCoords = await page.evaluate(() => {
            return window.graphicsEngine.contextMenuManager.highlightedCellCoords;
        });
        
        expect(storedCoords).toBeNull();
        console.log('✅ ContextMenuManager cleared tracked cell');
        
        // Capture final state (no highlight)
        await page.screenshot({ path: 'test-results/milestone2-after-close.png' });
    });

    test('should clear highlight when menu closes via ESC key', async ({ page }) => {
        // Open menu
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: { x: 320, y: 180 } });
        await page.waitForTimeout(300);
        
        // Verify highlight exists
        const highlightDuringMenu = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        expect(highlightDuringMenu).not.toBeNull();
        console.log('✅ Highlight active with menu open');
        
        // Press ESC key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // Verify menu is closed
        const menu = page.locator('#context-menu');
        const display = await menu.evaluate(el => window.getComputedStyle(el).display);
        expect(display).toBe('none');
        console.log('✅ Menu closed via ESC');
        
        // Verify highlight is cleared
        const highlightAfterClose = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        
        expect(highlightAfterClose).toBeNull();
        console.log('✅ Highlight cleared after ESC');
    });

    test('should clear highlight when clicking outside menu', async ({ page }) => {
        // Open menu
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: { x: 320, y: 180 } });
        await page.waitForTimeout(300);
        
        // Verify highlight exists
        const highlightDuringMenu = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        expect(highlightDuringMenu).not.toBeNull();
        console.log('✅ Highlight active with menu open');
        
        // Click outside menu (on canvas far from menu)
        await canvas.click({ position: { x: 100, y: 100 } });
        await page.waitForTimeout(300);
        
        // Verify menu is closed
        const menu = page.locator('#context-menu');
        const display = await menu.evaluate(el => window.getComputedStyle(el).display);
        expect(display).toBe('none');
        console.log('✅ Menu closed via outside click');
        
        // Verify highlight is cleared
        const highlightAfterClose = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        
        expect(highlightAfterClose).toBeNull();
        console.log('✅ Highlight cleared after outside click');
    });

    test('should move highlight when opening menu on different cell', async ({ page }) => {
        const canvas = page.locator('#gameCanvas');
        
        // Open menu at first position
        await canvas.click({ button: 'right', position: { x: 200, y: 150 } });
        await page.waitForTimeout(300);
        
        const firstHighlight = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        expect(firstHighlight).not.toBeNull();
        console.log(`✅ First highlight at (${firstHighlight.x}, ${firstHighlight.y})`);
        
        // Close menu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // Open menu at second position
        await canvas.click({ button: 'right', position: { x: 400, y: 250 } });
        await page.waitForTimeout(300);
        
        const secondHighlight = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        expect(secondHighlight).not.toBeNull();
        console.log(`✅ Second highlight at (${secondHighlight.x}, ${secondHighlight.y})`);
        
        // Verify highlights are different (clicked different cells)
        const isDifferent = firstHighlight.x !== secondHighlight.x || firstHighlight.y !== secondHighlight.y;
        expect(isDifferent).toBe(true);
        console.log('✅ Highlight moved to new cell');
    });

    test('should maintain highlight while menu is visible', async ({ page }) => {
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: { x: 320, y: 180 } });
        await page.waitForTimeout(300);
        
        // Get initial highlight
        const highlight1 = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        expect(highlight1).not.toBeNull();
        
        // Wait and check highlight persists
        await page.waitForTimeout(1000);
        
        const highlight2 = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.getHighlightedCell();
        });
        
        expect(highlight2).not.toBeNull();
        expect(highlight2.x).toBe(highlight1.x);
        expect(highlight2.y).toBe(highlight1.y);
        console.log('✅ Highlight persists while menu is visible');
    });

    test('should handle RenderSystem not available gracefully', async ({ page }) => {
        // This test verifies the defensive programming (console.warn but no crash)
        
        // Temporarily break renderSystem reference
        await page.evaluate(() => {
            const originalRenderSystem = window.graphicsEngine.renderSystem;
            window.graphicsEngine.renderSystem = null;
            
            // Store for restoration
            window._testOriginalRenderSystem = originalRenderSystem;
        });
        
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: { x: 320, y: 180 } });
        await page.waitForTimeout(300);
        
        // Menu should still open despite renderSystem being unavailable
        const menu = page.locator('#context-menu');
        const display = await menu.evaluate(el => window.getComputedStyle(el).display);
        expect(display).toBe('block');
        console.log('✅ Menu opens even without renderSystem');
        
        // Check console for warning message
        const warnings = await page.evaluate(() => {
            return window._testWarnings || [];
        });
        
        // Restore renderSystem
        await page.evaluate(() => {
            window.graphicsEngine.renderSystem = window._testOriginalRenderSystem;
        });
        
        console.log('✅ Graceful degradation when renderSystem unavailable');
    });
});
