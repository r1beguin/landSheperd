/**
 * Context Menu System Tests
 * Tests right-click context menu functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Context Menu System', () => {
  test.beforeEach(async ({ page }) => {
    // Start from clean state
    await page.goto('http://localhost:8081');
    await page.waitForTimeout(2000); // Wait for WebGL initialization
  });

  test('should show context menu on right-click', async ({ page }) => {
    // Right-click on canvas
    const canvas = await page.locator('canvas');
    await canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    
    // Wait a bit for menu to appear
    await page.waitForTimeout(300);
    
    // Check if context menu is visible
    const menu = await page.locator('#context-menu');
    const isVisible = await menu.isVisible();
    
    console.log('Context menu visible:', isVisible);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/context-menu-test.png' });
    
    expect(isVisible).toBe(true);
  });

  test('context menu should have soil info section', async ({ page }) => {
    const canvas = await page.locator('canvas');
    await canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    await page.waitForTimeout(300);
    
    // Check for soil info section
    const soilInfo = await page.locator('#context-menu .soil-info');
    const exists = await soilInfo.count() > 0;
    
    console.log('Soil info section exists:', exists);
    
    expect(exists).toBe(true);
  });

  test('context menu should have action buttons', async ({ page }) => {
    const canvas = await page.locator('canvas');
    await canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    await page.waitForTimeout(300);
    
    // Check for action buttons
    const actions = await page.locator('#context-menu .actions');
    const exists = await actions.count() > 0;
    
    console.log('Actions section exists:', exists);
    
    // Check for close button at minimum
    const closeButton = await page.locator('#context-menu button');
    const hasButtons = await closeButton.count() > 0;
    
    console.log('Has buttons:', hasButtons);
    
    expect(exists).toBe(true);
    expect(hasButtons).toBe(true);
  });

  test('close button should hide context menu', async ({ page }) => {
    const canvas = await page.locator('canvas');
    await canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    await page.waitForTimeout(300);
    
    // Click close button
    const closeButton = await page.locator('#context-menu .btn-secondary');
    if (await closeButton.count() > 0) {
      await closeButton.first().click();
      await page.waitForTimeout(200);
      
      // Menu should be hidden
      const menu = await page.locator('#context-menu');
      const isVisible = await menu.isVisible();
      
      console.log('Menu visible after close:', isVisible);
      
      expect(isVisible).toBe(false);
    }
  });

  test('context menu should close on canvas click', async ({ page }) => {
    const canvas = await page.locator('canvas');
    
    // Open menu
    await canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    await page.waitForTimeout(300);
    
    // Click elsewhere on canvas
    await canvas.click({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(200);
    
    // Menu should be hidden
    const menu = await page.locator('#context-menu');
    const isVisible = await menu.isVisible();
    
    console.log('Menu visible after canvas click:', isVisible);
    
    expect(isVisible).toBe(false);
  });

  test('context menu should show nutrient levels', async ({ page }) => {
    const canvas = await page.locator('canvas');
    await canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    await page.waitForTimeout(300);
    
    // Check for nutrient bars
    const nutrientBars = await page.locator('#context-menu .nutrient-bar');
    const count = await nutrientBars.count();
    
    console.log('Number of nutrient bars:', count);
    
    // Should have N, P, K, OM (4 bars)
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
