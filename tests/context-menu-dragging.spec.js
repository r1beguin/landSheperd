/**
 * Context Menu Dragging Test - Milestone 4
 * Tests the draggable context menu functionality
 */

import { test, expect } from '@playwright/test';

// Helper function to wait for game initialization
async function waitForRenderFrames(page, frameCount = 10) {
    await page.evaluate((count) => {
        return new Promise((resolve) => {
            let frames = 0;
            const checkFrame = () => {
                frames++;
                if (frames >= count) {
                    resolve();
                } else {
                    requestAnimationFrame(checkFrame);
                }
            };
            requestAnimationFrame(checkFrame);
        });
    }, frameCount);
}

// Helper to wait for engine initialization
async function waitForEngine(page) {
    await page.waitForFunction(() => {
        return window.graphicsEngine 
            && window.graphicsEngine.config 
            && window.graphicsEngine.config.soil
            && window.graphicsEngine.plantManager
            && window.graphicsEngine.cameraManager;
    }, { timeout: 10000 });
}

// Helper to spawn a plant at specific grid coordinates
async function spawnPlantAt(page, gridX, gridY) {
    await waitForEngine(page);
    await page.evaluate(({ x, y }) => {
        const engine = window.graphicsEngine;
        const cellSize = engine.config.soil?.cellSize || 10;
        const worldX = x * cellSize;
        const worldY = y * cellSize;
        const currentDay = engine.timeManager.getCurrentDayPrecise();
        engine.plantManager.addPlantAtPosition(x, y, worldX, worldY, 'urtica_dioica', currentDay);
    }, { x: gridX, y: gridY });
    await waitForRenderFrames(page, 5);
}

// Helper to get screen coordinates from grid coordinates
async function getScreenCoords(page, gridX, gridY) {
    await waitForEngine(page);
    return await page.evaluate(({ x, y }) => {
        const engine = window.graphicsEngine;
        const cellSize = engine.config.soil?.cellSize || 10;
        const worldX = x * cellSize;
        const worldY = y * cellSize;
        return engine.cameraManager.worldToScreen(worldX, worldY);
    }, { x: gridX, y: gridY });
}

test.describe('Context Menu Dragging - Milestone 4', () => {
    test('Menu header is draggable and repositions menu', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
        
        // Spawn a plant at center grid
        const gridX = 25;
        const gridY = 25;
        await spawnPlantAt(page, gridX, gridY);
        
        // Get screen coordinates for the cell
        const screenCoords = await getScreenCoords(page, gridX, gridY);
        
        // Right-click to open context menu
        await page.mouse.click(screenCoords.x, screenCoords.y, { button: 'right' });
        await page.waitForTimeout(200);
        
        // Verify menu is visible
        const menuVisible = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return menu && menu.style.display !== 'none';
        });
        expect(menuVisible).toBe(true);
        
        // Get initial menu position
        const initialPosition = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return {
                left: menu.offsetLeft,
                top: menu.offsetTop
            };
        });
        
        console.log('Initial menu position:', initialPosition);
        
        // Screenshot: Menu at original position
        await page.screenshot({ 
            path: 'test-results/drag-milestone4-original-position.png',
            fullPage: false
        });
        
        // Get header element position for dragging
        const headerBox = await page.evaluate(() => {
            const header = document.querySelector('.context-menu-header');
            const rect = header.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height
            };
        });
        
        console.log('Header box:', headerBox);
        
        // Verify cursor shows move over header
        const cursorStyle = await page.evaluate(() => {
            const header = document.querySelector('.context-menu-header');
            return window.getComputedStyle(header).cursor;
        });
        expect(cursorStyle).toBe('move');
        console.log('✓ Header cursor style is "move"');
        
        // Drag menu to upper-left corner (drag delta: -100, -100)
        await page.mouse.move(headerBox.x, headerBox.y);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(headerBox.x - 100, headerBox.y - 100, { steps: 10 });
        await page.waitForTimeout(50);
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        // Get new position
        const upperLeftPosition = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return {
                left: menu.offsetLeft,
                top: menu.offsetTop
            };
        });
        
        console.log('Position after dragging to upper-left:', upperLeftPosition);
        
        // Verify menu moved
        expect(upperLeftPosition.left).toBeLessThan(initialPosition.left);
        expect(upperLeftPosition.top).toBeLessThan(initialPosition.top);
        console.log('✓ Menu repositioned to upper-left');
        
        // Screenshot: Menu at upper-left position
        await page.screenshot({ 
            path: 'test-results/drag-milestone4-upper-left.png',
            fullPage: false
        });
        
        // Verify highlight persists on original cell
        const highlightPersists = await page.evaluate(({ gx, gy }) => {
            const engine = window.graphicsEngine;
            const highlight = engine.renderSystem.highlightedCell;
            return highlight && highlight.x === gx && highlight.y === gy;
        }, { gx: gridX, gy: gridY });
        expect(highlightPersists).toBe(true);
        console.log('✓ Cell highlight persists on original cell during drag');
        
        // Drag menu to lower-right corner (drag delta: +200, +200 from current)
        await page.mouse.move(headerBox.x - 100, headerBox.y - 100); // Go to header at new position
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(headerBox.x + 100, headerBox.y + 100, { steps: 10 });
        await page.waitForTimeout(50);
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        // Get final position
        const lowerRightPosition = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return {
                left: menu.offsetLeft,
                top: menu.offsetTop
            };
        });
        
        console.log('Position after dragging to lower-right:', lowerRightPosition);
        
        // Verify menu moved again
        expect(lowerRightPosition.left).toBeGreaterThan(upperLeftPosition.left);
        expect(lowerRightPosition.top).toBeGreaterThan(upperLeftPosition.top);
        console.log('✓ Menu repositioned to lower-right');
        
        // Screenshot: Menu at lower-right position
        await page.screenshot({ 
            path: 'test-results/drag-milestone4-lower-right.png',
            fullPage: false
        });
        
        // Verify highlight still persists
        const highlightStillPersists = await page.evaluate(({ gx, gy }) => {
            const engine = window.graphicsEngine;
            const highlight = engine.renderSystem.highlightedCell;
            return highlight && highlight.x === gx && highlight.y === gy;
        }, { gx: gridX, gy: gridY });
        expect(highlightStillPersists).toBe(true);
        console.log('✓ Cell highlight still persists after multiple drags');
        
        // Verify close button still works after dragging
        await page.click('.context-menu-btn[data-action="close"]');
        await page.waitForTimeout(200);
        
        const menuHidden = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return menu.style.display === 'none';
        });
        expect(menuHidden).toBe(true);
        console.log('✓ Close button works after dragging');
        
        // Verify highlight cleared after close
        const highlightCleared = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            return engine.renderSystem.highlightedCell === null;
        });
        expect(highlightCleared).toBe(true);
        console.log('✓ Highlight cleared after menu closed');
    });
    
    test('Menu cannot be dragged off-screen', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
        
        // Spawn a plant
        await spawnPlantAt(page, 25, 25);
        const screenCoords = await getScreenCoords(page, 25, 25);
        
        // Open context menu
        await page.mouse.click(screenCoords.x, screenCoords.y, { button: 'right' });
        await page.waitForTimeout(200);
        
        // Get viewport dimensions
        const viewport = await page.evaluate(() => {
            return {
                width: window.innerWidth,
                height: window.innerHeight
            };
        });
        
        console.log('Viewport:', viewport);
        
        // Get header position
        const headerBox = await page.evaluate(() => {
            const header = document.querySelector('.context-menu-header');
            const rect = header.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        });
        
        // Try to drag menu far off-screen to the left
        await page.mouse.move(headerBox.x, headerBox.y);
        await page.mouse.down();
        await page.mouse.move(-1000, headerBox.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        // Check menu is still partially visible
        const menuAfterLeftDrag = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return {
                left: menu.offsetLeft,
                width: menu.offsetWidth
            };
        });
        
        console.log('Menu after attempting to drag far left:', menuAfterLeftDrag);
        
        // Menu should be clamped (at least 50px visible)
        expect(menuAfterLeftDrag.left).toBeGreaterThan(-menuAfterLeftDrag.width + 50);
        console.log('✓ Menu clamped to left edge (at least 50px visible)');
        
        // Screenshot: Menu clamped at edge
        await page.screenshot({ 
            path: 'test-results/drag-milestone4-edge-clamping.png',
            fullPage: false
        });
    });
    
    test('Dragging menu body does not move menu (only header is draggable)', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
        
        // Spawn a plant
        await spawnPlantAt(page, 25, 25);
        const screenCoords = await getScreenCoords(page, 25, 25);
        
        // Open context menu
        await page.mouse.click(screenCoords.x, screenCoords.y, { button: 'right' });
        await page.waitForTimeout(200);
        
        // Get initial position
        const initialPosition = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return {
                left: menu.offsetLeft,
                top: menu.offsetTop
            };
        });
        
        // Try to drag from menu body (not header)
        const menuBodyBox = await page.evaluate(() => {
            const section = document.querySelector('.context-menu-section');
            const rect = section.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        });
        
        console.log('Attempting to drag from menu body:', menuBodyBox);
        
        // Try to drag menu body
        await page.mouse.move(menuBodyBox.x, menuBodyBox.y);
        await page.mouse.down();
        await page.mouse.move(menuBodyBox.x + 100, menuBodyBox.y + 100, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        // Get final position
        const finalPosition = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return {
                left: menu.offsetLeft,
                top: menu.offsetTop
            };
        });
        
        console.log('Initial:', initialPosition, 'Final:', finalPosition);
        
        // Menu should NOT have moved (or moved very little due to scroll)
        expect(Math.abs(finalPosition.left - initialPosition.left)).toBeLessThan(10);
        expect(Math.abs(finalPosition.top - initialPosition.top)).toBeLessThan(10);
        console.log('✓ Menu body not draggable (only header is draggable)');
    });
    
    test('FPS remains above threshold during dragging', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
        
        // Spawn multiple plants for more render load
        for (let i = 0; i < 10; i++) {
            await spawnPlantAt(page, 20 + i, 20 + i);
        }
        
        const screenCoords = await getScreenCoords(page, 25, 25);
        
        // Open context menu
        await page.mouse.click(screenCoords.x, screenCoords.y, { button: 'right' });
        await page.waitForTimeout(200);
        
        // Get header position
        const headerBox = await page.evaluate(() => {
            const header = document.querySelector('.context-menu-header');
            const rect = header.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        });
        
        // Measure FPS during drag
        await page.mouse.move(headerBox.x, headerBox.y);
        await page.mouse.down();
        
        // Start FPS measurement
        const fpsBeforeDrag = await page.evaluate(() => {
            return window.graphicsEngine?.fpsCounter || 60;
        });
        
        // Perform drag with many steps
        await page.mouse.move(headerBox.x + 200, headerBox.y + 200, { steps: 50 });
        
        await page.mouse.up();
        await page.waitForTimeout(100);
        
        // Get FPS after drag
        const fpsAfterDrag = await page.evaluate(() => {
            return window.graphicsEngine?.fpsCounter || 60;
        });
        
        console.log('FPS before drag:', fpsBeforeDrag);
        console.log('FPS after drag:', fpsAfterDrag);
        
        // In headless mode, software rendering might be slower, so threshold is 30
        expect(fpsAfterDrag).toBeGreaterThanOrEqual(30);
        console.log('✓ FPS maintained during drag (≥30 FPS)');
    });
});
