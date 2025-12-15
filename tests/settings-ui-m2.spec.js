/**
 * Settings UI Test - Manual verification test for Milestone 2
 * 
 * Tests:
 * 1. Settings gear button visible in top-right
 * 2. Modal opens/closes correctly
 * 3. All buttons are clickable and log actions
 * 4. Auto-save checkbox toggles correctly
 * 5. Escape key and backdrop click close modal
 */

const { test, expect } = require('@playwright/test');

test.describe('Settings UI - Milestone 2', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        // Wait for page to fully load
        await page.waitForFunction(() => 
            window.graphicsEngine && 
            window.graphicsEngine.settingsUIManager
        );
    });
    
    test('Settings gear button is visible', async ({ page }) => {
        const settingsButton = page.locator('#settings-button');
        await expect(settingsButton).toBeVisible();
        
        // Check button is in top-right area
        const box = await settingsButton.boundingBox();
        expect(box.x).toBeGreaterThan(500); // Right side of screen
        expect(box.y).toBeLessThan(100); // Top of screen
    });
    
    test('Settings modal opens and closes via button', async ({ page }) => {
        const settingsButton = page.locator('#settings-button');
        const settingsModal = page.locator('#settings-modal');
        const settingsBackdrop = page.locator('#settings-backdrop');
        const closeButton = page.locator('#settings-close-btn');
        
        // Modal should be hidden initially
        await expect(settingsModal).not.toHaveClass(/active/);
        await expect(settingsBackdrop).not.toHaveClass(/active/);
        
        // Click gear button to open
        await settingsButton.click();
        await expect(settingsModal).toHaveClass(/active/);
        await expect(settingsBackdrop).toHaveClass(/active/);
        
        // Click close button to close
        await closeButton.click();
        await expect(settingsModal).not.toHaveClass(/active/);
        await expect(settingsBackdrop).not.toHaveClass(/active/);
    });
    
    test('Settings modal closes on Escape key', async ({ page }) => {
        const settingsButton = page.locator('#settings-button');
        const settingsModal = page.locator('#settings-modal');
        
        // Open modal
        await settingsButton.click();
        await expect(settingsModal).toHaveClass(/active/);
        
        // Press Escape to close
        await page.keyboard.press('Escape');
        await expect(settingsModal).not.toHaveClass(/active/);
    });
    
    test('Settings modal closes on backdrop click', async ({ page }) => {
        const settingsButton = page.locator('#settings-button');
        const settingsModal = page.locator('#settings-modal');
        
        // Open modal
        await settingsButton.click();
        await expect(settingsModal).toHaveClass(/active/);
        
        // Click on backdrop using JavaScript evaluation to ensure we hit the backdrop element
        // This simulates clicking on an area of the backdrop not covered by the modal
        await page.evaluate(() => {
            const backdrop = document.getElementById('settings-backdrop');
            // Create and dispatch a click event directly on the backdrop
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            backdrop.dispatchEvent(clickEvent);
        });
        
        await expect(settingsModal).not.toHaveClass(/active/);
    });
    
    test('All menu buttons are clickable and log actions', async ({ page }) => {
        const settingsButton = page.locator('#settings-button');
        
        // Open modal
        await settingsButton.click();
        
        // Track console logs
        const logs = [];
        page.on('console', msg => {
            if (msg.type() === 'log') {
                logs.push(msg.text());
            }
        });
        
        // Click Save Game button
        await page.locator('#save-game-btn').click();
        await page.waitForTimeout(100);
        expect(logs).toContain('Save Game clicked');
        
        // Click Load Game button
        await page.locator('#load-game-btn').click();
        await page.waitForTimeout(100);
        expect(logs).toContain('Load Game clicked');
        
        // Click New Game (Same Map) button
        await page.locator('#new-game-same-map-btn').click();
        await page.waitForTimeout(100);
        expect(logs).toContain('New Game (Same Map) clicked');
        
        // Click New Game (New Map) button
        await page.locator('#new-game-new-map-btn').click();
        await page.waitForTimeout(100);
        expect(logs).toContain('New Game (New Map) clicked');
    });
    
    test('Auto-save checkbox toggles correctly', async ({ page }) => {
        const settingsButton = page.locator('#settings-button');
        const autoSaveCheckbox = page.locator('#auto-save-checkbox');
        
        // Open modal
        await settingsButton.click();
        
        // Track console logs
        const logs = [];
        page.on('console', msg => {
            if (msg.type() === 'log') {
                logs.push(msg.text());
            }
        });
        
        // Checkbox should be checked by default
        await expect(autoSaveCheckbox).toBeChecked();
        
        // Uncheck
        await autoSaveCheckbox.uncheck();
        await page.waitForTimeout(100);
        expect(logs).toContain('Auto-save disabled');
        
        // Check again
        await autoSaveCheckbox.check();
        await page.waitForTimeout(100);
        expect(logs).toContain('Auto-save enabled');
    });
    
    test('Settings UI state via manager API', async ({ page }) => {
        // Test manager API directly
        const isOpenBefore = await page.evaluate(() => 
            window.graphicsEngine.settingsUIManager.isModalOpen()
        );
        expect(isOpenBefore).toBe(false);
        
        // Open via API
        await page.evaluate(() => 
            window.graphicsEngine.settingsUIManager.open()
        );
        
        const isOpenAfter = await page.evaluate(() => 
            window.graphicsEngine.settingsUIManager.isModalOpen()
        );
        expect(isOpenAfter).toBe(true);
        
        // Close via API
        await page.evaluate(() => 
            window.graphicsEngine.settingsUIManager.close()
        );
        
        const isOpenAfterClose = await page.evaluate(() => 
            window.graphicsEngine.settingsUIManager.isModalOpen()
        );
        expect(isOpenAfterClose).toBe(false);
    });
    
    test('Screenshot: Settings modal open', async ({ page }) => {
        const settingsButton = page.locator('#settings-button');
        
        // Open modal
        await settingsButton.click();
        
        // Wait for modal animation
        await page.waitForTimeout(200);
        
        // Take screenshot
        await page.screenshot({
            path: 'screenshots/settings-modal-m2.png',
            fullPage: true
        });
    });
});
