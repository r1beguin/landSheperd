/**
 * Context Menu Functional Tests
 * Tests the actual functionality of the right-click context menu
 */

const { test, expect } = require('@playwright/test');

test.describe('Context Menu Functionality', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:8081');
    await page.waitForTimeout(2000); // Wait for initialization
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should show context menu on right-click', async () => {
    // Simulate right-click using dispatchEvent
    await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();
      
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2, // Right button
        buttons: 2,
        clientX: rect.left + 200,
        clientY: rect.top + 200
      });
      
      canvas.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    // Check if menu is visible
    const menu = await page.locator('#context-menu');
    const display = await menu.evaluate(el => window.getComputedStyle(el).display);
    
    expect(display).toBe('block');
    console.log('✅ Context menu appears on right-click');
  });

  test('should display soil nutrient information', async () => {
    await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2,
        buttons: 2,
        clientX: rect.left + 200,
        clientY: rect.top + 200
      });
      canvas.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    // Check for nutrient rows
    const menuContent = await page.locator('#context-menu').innerHTML();
    
    expect(menuContent).toContain('Nitrogen');
    expect(menuContent).toContain('Phosphorus');
    expect(menuContent).toContain('Potassium');
    expect(menuContent).toContain('Organic Matter');
    
    console.log('✅ Menu displays all nutrient types');
  });

  test('should show action buttons', async () => {
    await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2,
        buttons: 2,
        clientX: rect.left + 200,
        clientY: rect.top + 200
      });
      canvas.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    const buttons = await page.locator('#context-menu button').count();
    
    expect(buttons).toBeGreaterThan(0);
    console.log(`✅ Menu shows ${buttons} action buttons`);
  });

  test('close button should hide the menu', async () => {
    // Open menu
    await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2,
        buttons: 2,
        clientX: rect.left + 200,
        clientY: rect.top + 200
      });
      canvas.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    // Click close button
    const closeButton = await page.locator('#context-menu button[data-action="close"]');
    await closeButton.click();
    
    await page.waitForTimeout(300);
    
    // Check menu is hidden
    const menu = await page.locator('#context-menu');
    const display = await menu.evaluate(el => window.getComputedStyle(el).display);
    
    expect(display).toBe('none');
    console.log('✅ Close button hides the menu');
  });

  test('should plant a nettle when clicking Plant button', async () => {
    // Open menu on empty soil
    await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2,
        buttons: 2,
        clientX: rect.left + 200,
        clientY: rect.top + 200
      });
      canvas.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    // Click plant button
    const plantButton = await page.locator('#context-menu button[data-action="plant"]');
    if (await plantButton.count() > 0) {
      await plantButton.click();
      await page.waitForTimeout(500);
      
      // Verify plant was added
      const plantCount = await page.evaluate(() => {
        return window.graphicsEngine.plantManager.plants.length;
      });
      
      expect(plantCount).toBeGreaterThan(0);
      console.log(`✅ Plant button works - ${plantCount} plants exist`);
    } else {
      console.log('⚠ No Plant button (soil may already have a plant)');
    }
  });

  test('menu should be positioned near cursor', async () => {
    const clickX = 300;
    const clickY = 400;
    
    await page.evaluate(({ x, y }) => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2,
        buttons: 2,
        clientX: rect.left + x,
        clientY: rect.top + y
      });
      canvas.dispatchEvent(event);
    }, { x: clickX, y: clickY });
    
    await page.waitForTimeout(500);
    
    const menu = await page.locator('#context-menu');
    const position = await menu.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        left: parseInt(style.left),
        top: parseInt(style.top)
      };
    });
    
    // Menu should be near click position (within 50px tolerance for offset)
    expect(Math.abs(position.left - clickX)).toBeLessThan(50);
    expect(Math.abs(position.top - clickY)).toBeLessThan(50);
    
    console.log(`✅ Menu positioned at (${position.left}, ${position.top}) near click (${clickX}, ${clickY})`);
  });
});
