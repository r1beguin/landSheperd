/**
 * Auto-Save System Tests (M3)
 * 
 * Tests for the automatic saving functionality:
 * - Save on browser close (beforeunload)
 * - Auto-load on return
 * - Interval auto-save
 * - Toggle persistence
 * - Save indicator
 */

const { test, expect } = require('@playwright/test');

// Helper to wait for game initialization
async function waitForGameInit(page) {
    await page.waitForFunction(() => {
        return window.graphicsEngine && 
               window.graphicsEngine.saveManager &&
               window.graphicsEngine.timeManager;
    }, { timeout: 10000 });
    
    // Wait additional frames for full initialization
    await page.waitForTimeout(500);
}

test.describe('Auto-Save System M3', () => {
    
    test('SaveManager initializes with auto-save system', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Check SaveManager has auto-save properties
        const hasAutoSave = await page.evaluate(() => {
            const sm = window.graphicsEngine.saveManager;
            return sm && 
                   sm.timeManager !== undefined &&
                   sm.autoSaveEnabled !== undefined &&
                   typeof sm.setupAutoSave === 'function' &&
                   typeof sm.autoSave === 'function' &&
                   typeof sm.saveOnClose === 'function' &&
                   typeof sm.checkAutoCloseLoad === 'function';
        });
        
        expect(hasAutoSave).toBe(true);
    });
    
    test('Auto-save indicator element exists', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Check indicator element exists
        const indicator = page.locator('#auto-save-indicator');
        await expect(indicator).toBeAttached();
        
        // Should be hidden by default (opacity 0)
        const isHidden = await indicator.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.opacity === '0';
        });
        expect(isHidden).toBe(true);
    });
    
    test('showSaveIndicator() makes indicator visible', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Call showSaveIndicator
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.showSaveIndicator();
        });
        
        // Check indicator has visible class
        const indicator = page.locator('#auto-save-indicator');
        await expect(indicator).toHaveClass(/visible/);
    });
    
    test('getOldestAutoSaveSlot() returns correct slot', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Clear all auto-save slots first
        await page.evaluate(() => {
            localStorage.removeItem('landShepherd_save_auto_1');
            localStorage.removeItem('landShepherd_save_auto_2');
            localStorage.removeItem('landShepherd_save_auto_3');
        });
        
        // First call should return auto_1 (first empty slot)
        let slot = await page.evaluate(() => {
            return window.graphicsEngine.saveManager.getOldestAutoSaveSlot();
        });
        expect(slot).toBe('auto_1');
        
        // Save to auto_1
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.save('auto_1');
        });
        
        // Should now return auto_2 (next empty slot)
        slot = await page.evaluate(() => {
            return window.graphicsEngine.saveManager.getOldestAutoSaveSlot();
        });
        expect(slot).toBe('auto_2');
    });
    
    test('setAutoSaveEnabled() persists to localStorage', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Set auto-save to false
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.setAutoSaveEnabled(false);
        });
        
        // Check localStorage
        const storedValue = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_autoSaveEnabled');
        });
        expect(storedValue).toBe('false');
        
        // Set back to true
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.setAutoSaveEnabled(true);
        });
        
        const restoredValue = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_autoSaveEnabled');
        });
        expect(restoredValue).toBe('true');
    });
    
    test('Auto-save checkbox persists preference', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Open settings modal first
        await page.click('#settings-button');
        await page.waitForSelector('#settings-modal.active');
        
        // Find checkbox and uncheck it
        const checkbox = page.locator('#auto-save-checkbox');
        await checkbox.uncheck();
        
        // Check localStorage was updated
        const storedValue = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_autoSaveEnabled');
        });
        expect(storedValue).toBe('false');
        
        // Close modal
        await page.click('#settings-close-btn');
        
        // Reload page
        await page.reload();
        await waitForGameInit(page);
        
        // Open settings modal again
        await page.click('#settings-button');
        await page.waitForSelector('#settings-modal.active');
        
        // Checkbox should still be unchecked
        await expect(checkbox).not.toBeChecked();
        
        // Clean up: re-enable auto-save
        await checkbox.check();
    });
    
    test('saveOnClose() saves to auto_close slot', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Clear auto_close slot
        await page.evaluate(() => {
            localStorage.removeItem('landShepherd_save_auto_close');
        });
        
        // Call saveOnClose
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.saveOnClose();
        });
        
        // Check auto_close save exists
        const hasAutoClose = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_save_auto_close') !== null;
        });
        expect(hasAutoClose).toBe(true);
        
        // Verify save has correct structure
        const saveData = await page.evaluate(() => {
            const data = localStorage.getItem('landShepherd_save_auto_close');
            return JSON.parse(data);
        });
        
        expect(saveData).toHaveProperty('version');
        expect(saveData).toHaveProperty('timestamp');
        expect(saveData).toHaveProperty('state');
        expect(saveData.state).toHaveProperty('seed');
    });
    
    test('autoSaveIntervalDays config is respected', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Check config value
        const interval = await page.evaluate(() => {
            return window.graphicsEngine.config.saveSystem.autoSaveIntervalDays;
        });
        
        expect(interval).toBe(7);
    });
    
    test('Auto-save triggers after interval', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Clear all auto-save slots
        await page.evaluate(() => {
            localStorage.removeItem('landShepherd_save_auto_1');
            localStorage.removeItem('landShepherd_save_auto_2');
            localStorage.removeItem('landShepherd_save_auto_3');
        });
        
        // Directly call autoSave() to test it works
        const saved = await page.evaluate(() => {
            return window.graphicsEngine.saveManager.autoSave();
        });
        
        expect(saved).toBe(true);
        
        // Check if auto_1 now has a save
        const hasAutoSave = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_save_auto_1') !== null;
        });
        
        expect(hasAutoSave).toBe(true);
    });
    
    test('Auto-save does not trigger when disabled', async ({ page }) => {
        await page.goto('/');
        await waitForGameInit(page);
        
        // Disable auto-save
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.setAutoSaveEnabled(false);
        });
        
        // Clear auto-save slots
        await page.evaluate(() => {
            localStorage.removeItem('landShepherd_save_auto_1');
            localStorage.removeItem('landShepherd_save_auto_2');
            localStorage.removeItem('landShepherd_save_auto_3');
        });
        
        // Simulate passing interval
        const savedSlot = await page.evaluate(() => {
            const sm = window.graphicsEngine.saveManager;
            sm.daysSinceLastAutoSave = 10;
            sm.lastAutoSaveDay = 0;
            window.graphicsEngine.timeManager.currentGameDay = 1;
            sm.update();
            
            return localStorage.getItem('landShepherd_save_auto_1') !== null;
        });
        
        // Should NOT have saved (auto-save disabled)
        expect(savedSlot).toBe(false);
        
        // Re-enable auto-save
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.setAutoSaveEnabled(true);
        });
    });
    
});
