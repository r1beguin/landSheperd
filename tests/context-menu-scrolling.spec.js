const { test, expect } = require('@playwright/test');
const { 
    waitForRenderFrames, 
    spawnPlantAt,
    advanceGameTime,
    getGameMetrics,
    rightClickAt
} = require('./test-utils');

/**
 * MILESTONE 3: Context Menu Scrolling Test
 * 
 * Tests that context menus properly handle overflow with scrolling when
 * displaying multiple plants (e.g., Oak tree + multiple other plants).
 * 
 * Validates:
 * - Short menus display without scrollbar
 * - Tall menus show scrollbar when content exceeds 80vh
 * - Scrolling works properly via mouse wheel
 * - All content accessible
 * - Menu closes correctly when clicking outside
 * - No performance degradation
 */

test.describe('Context Menu Scrolling - Milestone 3', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForRenderFrames(page, 10);
        
        // Verify engine initialized
        const engineReady = await page.evaluate(() => {
            return window.graphicsEngine && 
                   window.graphicsEngine.plantManager &&
                   window.graphicsEngine.contextMenuManager;
        });
        expect(engineReady).toBeTruthy();
    });

    test('Short menu: No scrollbar for 1-2 plants', async ({ page }) => {
        console.log('\n=== TEST 1: Short Menu (No Scrollbar) ===');
        
        // Spawn a single plant
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        await waitForRenderFrames(page, 5);
        
        // Right-click on the plant
        await rightClickAt(page, 25, 25);
        await page.waitForTimeout(300); // Wait for menu animation
        
        // Check if context menu is visible
        const menuVisible = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return menu && menu.style.display !== 'none';
        });
        expect(menuVisible).toBeTruthy();
        
        // Check menu height and scrollbar status
        const menuInfo = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            if (!menu) return null;
            
            const rect = menu.getBoundingClientRect();
            const hasVerticalScrollbar = menu.scrollHeight > menu.clientHeight;
            
            return {
                height: rect.height,
                scrollHeight: menu.scrollHeight,
                clientHeight: menu.clientHeight,
                hasVerticalScrollbar,
                maxHeight: window.getComputedStyle(menu).maxHeight
            };
        });
        
        console.log('Short menu info:', menuInfo);
        
        // Menu should NOT have scrollbar for 1 plant
        expect(menuInfo.hasVerticalScrollbar).toBeFalsy();
        expect(menuInfo.maxHeight).toBe('80vh');
        
        // Take screenshot
        await page.screenshot({ 
            path: 'test-results/context-menu-scrolling/menu-short-no-scrollbar.png',
            fullPage: true 
        });
        console.log('✓ Screenshot: menu-short-no-scrollbar.png');
        
        // Close menu by clicking outside
        await page.mouse.click(10, 10);
        await page.waitForTimeout(200);
    });

    test('Tall menu: Scrollbar appears for Oak + multiple plants', async ({ page }) => {
        console.log('\n=== TEST 2: Tall Menu (With Scrollbar) ===');
        
        // Spawn an Oak tree (tall plant) and multiple nettles at same location
        const x = 25, y = 25;
        await spawnPlantAt(page, x, y, 'quercus_robur'); // Oak tree
        await waitForRenderFrames(page, 3);
        
        // Add several nettles nearby (same cell)
        for (let i = 0; i < 5; i++) {
            await spawnPlantAt(page, x, y, 'urtica_dioica');
            await page.waitForTimeout(100);
        }
        await waitForRenderFrames(page, 5);
        
        // Right-click on the location
        await rightClickAt(page, x, y);
        await page.waitForTimeout(500); // Wait for menu render
        
        // Check menu visibility and scrollbar
        const menuInfo = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            if (!menu) return null;
            
            const rect = menu.getBoundingClientRect();
            const hasVerticalScrollbar = menu.scrollHeight > menu.clientHeight;
            const viewportHeight = window.innerHeight;
            const maxHeightVh = viewportHeight * 0.8;
            
            return {
                height: rect.height,
                scrollHeight: menu.scrollHeight,
                clientHeight: menu.clientHeight,
                hasVerticalScrollbar,
                viewportHeight,
                maxHeightVh,
                isConstrainedByMaxHeight: rect.height >= maxHeightVh - 10, // Allow 10px tolerance
                overflowY: window.getComputedStyle(menu).overflowY
            };
        });
        
        console.log('Tall menu info:', menuInfo);
        
        // Validate scrollbar is present
        expect(menuInfo.hasVerticalScrollbar).toBeTruthy();
        expect(menuInfo.overflowY).toBe('auto');
        expect(menuInfo.isConstrainedByMaxHeight).toBeTruthy();
        
        // Take screenshot at top
        await page.screenshot({ 
            path: 'test-results/context-menu-scrolling/menu-tall-scrollbar-top.png',
            fullPage: true 
        });
        console.log('✓ Screenshot: menu-tall-scrollbar-top.png');
    });

    test('Scroll functionality: Mouse wheel scrolls menu content', async ({ page }) => {
        console.log('\n=== TEST 3: Scroll Functionality ===');
        
        // Spawn Oak + multiple plants
        const x = 25, y = 25;
        await spawnPlantAt(page, x, y, 'quercus_robur');
        for (let i = 0; i < 6; i++) {
            await spawnPlantAt(page, x, y, 'urtica_dioica');
            await page.waitForTimeout(80);
        }
        await waitForRenderFrames(page, 5);
        
        // Open context menu
        await rightClickAt(page, x, y);
        await page.waitForTimeout(500);
        
        // Get menu element position
        const menuBox = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            const rect = menu.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        });
        
        // Scroll down within the menu
        await page.mouse.move(menuBox.x, menuBox.y);
        await page.mouse.wheel(0, 200); // Scroll down
        await page.waitForTimeout(300);
        
        // Check scroll position changed
        const scrolledInfo = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return {
                scrollTop: menu.scrollTop,
                scrollHeight: menu.scrollHeight,
                clientHeight: menu.clientHeight
            };
        });
        
        console.log('After scrolling down:', scrolledInfo);
        expect(scrolledInfo.scrollTop).toBeGreaterThan(0);
        
        // Screenshot after scrolling
        await page.screenshot({ 
            path: 'test-results/context-menu-scrolling/menu-tall-scrolled-middle.png',
            fullPage: true 
        });
        console.log('✓ Screenshot: menu-tall-scrolled-middle.png');
        
        // Scroll to bottom
        await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            menu.scrollTop = menu.scrollHeight;
        });
        await page.waitForTimeout(300);
        
        const bottomScrollInfo = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return {
                scrollTop: menu.scrollTop,
                scrollHeight: menu.scrollHeight,
                clientHeight: menu.clientHeight,
                atBottom: Math.abs((menu.scrollTop + menu.clientHeight) - menu.scrollHeight) < 5
            };
        });
        
        console.log('At bottom:', bottomScrollInfo);
        expect(bottomScrollInfo.atBottom).toBeTruthy();
        
        // Screenshot at bottom
        await page.screenshot({ 
            path: 'test-results/context-menu-scrolling/menu-tall-scrolled-bottom.png',
            fullPage: true 
        });
        console.log('✓ Screenshot: menu-tall-scrolled-bottom.png');
    });

    test('Click outside closes menu even with scrollbar', async ({ page }) => {
        console.log('\n=== TEST 4: Click Outside Closes Menu ===');
        
        // Spawn multiple plants
        const x = 25, y = 25;
        await spawnPlantAt(page, x, y, 'quercus_robur');
        for (let i = 0; i < 5; i++) {
            await spawnPlantAt(page, x, y, 'urtica_dioica');
            await page.waitForTimeout(80);
        }
        await waitForRenderFrames(page, 5);
        
        // Open menu
        await rightClickAt(page, x, y);
        await page.waitForTimeout(500);
        
        // Verify menu is open
        let menuVisible = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return menu && menu.style.display !== 'none';
        });
        expect(menuVisible).toBeTruthy();
        
        // Click outside menu (top-left corner)
        await page.mouse.click(10, 10);
        await page.waitForTimeout(300);
        
        // Verify menu is closed
        menuVisible = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            return menu && menu.style.display !== 'none';
        });
        expect(menuVisible).toBeFalsy();
        console.log('✓ Menu closed successfully after clicking outside');
    });

    test('Performance: No FPS degradation with scrollable menu', async ({ page }) => {
        console.log('\n=== TEST 5: Performance Check ===');
        
        // Get baseline FPS
        const baselineFps = await page.evaluate(async () => {
            let frames = 0;
            let lastTime = performance.now();
            
            await new Promise(resolve => {
                const measure = () => {
                    frames++;
                    if (frames < 60) {
                        requestAnimationFrame(measure);
                    } else {
                        const elapsed = performance.now() - lastTime;
                        const fps = (frames / elapsed) * 1000;
                        resolve(fps);
                    }
                };
                requestAnimationFrame(measure);
            });
        });
        
        console.log('Baseline FPS:', baselineFps.toFixed(2));
        
        // Spawn plants and open scrollable menu
        const x = 25, y = 25;
        await spawnPlantAt(page, x, y, 'quercus_robur');
        for (let i = 0; i < 6; i++) {
            await spawnPlantAt(page, x, y, 'urtica_dioica');
            await page.waitForTimeout(80);
        }
        await waitForRenderFrames(page, 5);
        await rightClickAt(page, x, y);
        await page.waitForTimeout(500);
        
        // Measure FPS with menu open and scrolling
        const menuFps = await page.evaluate(async () => {
            let frames = 0;
            let lastTime = performance.now();
            
            // Scroll menu during measurement
            const menu = document.getElementById('context-menu');
            let scrollDir = 1;
            
            await new Promise(resolve => {
                const measure = () => {
                    frames++;
                    // Animate scroll
                    if (menu) {
                        menu.scrollTop += scrollDir * 5;
                        if (menu.scrollTop <= 0 || menu.scrollTop >= menu.scrollHeight - menu.clientHeight) {
                            scrollDir *= -1;
                        }
                    }
                    
                    if (frames < 60) {
                        requestAnimationFrame(measure);
                    } else {
                        const elapsed = performance.now() - lastTime;
                        const fps = (frames / elapsed) * 1000;
                        resolve(fps);
                    }
                };
                requestAnimationFrame(measure);
            });
        });
        
        console.log('FPS with scrollable menu:', menuFps.toFixed(2));
        console.log('FPS difference:', (baselineFps - menuFps).toFixed(2));
        
        // Should not degrade performance significantly (allow 10 FPS tolerance)
        expect(menuFps).toBeGreaterThanOrEqual(baselineFps - 10);
        expect(menuFps).toBeGreaterThanOrEqual(30); // Minimum acceptable FPS
        
        console.log('✓ Performance maintained with scrollable menu');
    });

    test('Responsive: Menu height adjusts to viewport resize', async ({ page }) => {
        console.log('\n=== TEST 6: Responsive Height ===');
        
        // Set initial viewport size
        await page.setViewportSize({ width: 1280, height: 900 });
        await waitForRenderFrames(page, 5);
        
        // Spawn plants
        const x = 25, y = 25;
        await spawnPlantAt(page, x, y, 'quercus_robur');
        for (let i = 0; i < 6; i++) {
            await spawnPlantAt(page, x, y, 'urtica_dioica');
            await page.waitForTimeout(80);
        }
        await waitForRenderFrames(page, 5);
        
        // Open menu at large viewport
        await rightClickAt(page, x, y);
        await page.waitForTimeout(500);
        
        const menuLargeInfo = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            const rect = menu.getBoundingClientRect();
            return {
                height: rect.height,
                viewportHeight: window.innerHeight,
                maxHeightVh: window.innerHeight * 0.8
            };
        });
        
        console.log('Large viewport (900px):', menuLargeInfo);
        
        // Close menu
        await page.mouse.click(10, 10);
        await page.waitForTimeout(300);
        
        // Resize to smaller viewport
        await page.setViewportSize({ width: 1280, height: 600 });
        await waitForRenderFrames(page, 5);
        
        // Re-open menu at small viewport
        await rightClickAt(page, x, y);
        await page.waitForTimeout(500);
        
        const menuSmallInfo = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            const rect = menu.getBoundingClientRect();
            return {
                height: rect.height,
                viewportHeight: window.innerHeight,
                maxHeightVh: window.innerHeight * 0.8
            };
        });
        
        console.log('Small viewport (600px):', menuSmallInfo);
        
        // Menu should be smaller at smaller viewport
        expect(menuSmallInfo.maxHeightVh).toBeLessThan(menuLargeInfo.maxHeightVh);
        expect(menuSmallInfo.height).toBeLessThanOrEqual(menuSmallInfo.maxHeightVh + 5); // Allow tolerance
        
        console.log('✓ Menu height adjusts to viewport size');
    });
});
