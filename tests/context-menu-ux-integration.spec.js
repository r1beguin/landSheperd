/**
 * Context Menu UX Integration Test Suite - Milestone 5
 * 
 * Comprehensive integration tests validating ALL context menu UX features:
 * - M1: Cell highlight rendering system
 * - M2: Highlight integrated with menu lifecycle
 * - M3: Menu scrolling for tall content
 * - M4: Menu dragging with persistent highlight
 * 
 * Tests feature integration, edge cases, cross-feature interactions, and performance.
 */

const { test, expect } = require('@playwright/test');
const { 
    waitForRenderFrames, 
    spawnPlantAt,
    rightClickAt,
    getGameMetrics
} = require('./test-utils');

// Helper to wait for engine initialization
async function waitForEngine(page) {
    await page.waitForFunction(() => {
        return window.graphicsEngine 
            && window.graphicsEngine.config 
            && window.graphicsEngine.plantManager
            && window.graphicsEngine.cameraManager
            && window.graphicsEngine.renderSystem;
    }, { timeout: 10000 });
}

// Helper to get menu state
async function getMenuState(page) {
    return await page.evaluate(() => {
        const menu = document.getElementById('context-menu');
        if (!menu) return null;
        
        const rect = menu.getBoundingClientRect();
        const hasVerticalScrollbar = menu.scrollHeight > menu.clientHeight;
        
        return {
            visible: menu.style.display !== 'none',
            left: menu.offsetLeft,
            top: menu.offsetTop,
            width: rect.width,
            height: rect.height,
            scrollHeight: menu.scrollHeight,
            clientHeight: menu.clientHeight,
            hasVerticalScrollbar,
            scrollTop: menu.scrollTop
        };
    });
}

// Helper to get cell highlight state
async function getHighlightState(page) {
    return await page.evaluate(() => {
        const engine = window.graphicsEngine;
        const highlight = engine.renderSystem.getHighlightedCell();
        const managerCoords = engine.contextMenuManager.highlightedCellCoords;
        
        return {
            renderSystemHighlight: highlight,
            managerCoords: managerCoords
        };
    });
}

// Helper to get menu header position
async function getHeaderPosition(page) {
    return await page.evaluate(() => {
        const header = document.querySelector('.context-menu-header');
        if (!header) return null;
        const rect = header.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    });
}

test.describe('Context Menu UX Integration - Milestone 5', () => {
    test.beforeEach(async ({ page }) => {
        // Monitor console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser console error:', msg.text());
            }
        });
        
        await page.goto('http://localhost:8081');
        await waitForEngine(page);
        await waitForRenderFrames(page, 10);
    });
    
    // ========================================================================
    // A. BASIC FEATURE INTEGRATION
    // ========================================================================
    
    test('A1: Right-click cell shows highlight AND menu', async ({ page }) => {
        console.log('\n=== TEST A1: Basic Integration ===');
        
        const gridX = 25, gridY = 25;
        await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
        await waitForRenderFrames(page, 5);
        
        // Right-click on cell
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(300);
        
        // Verify menu is visible
        const menuState = await getMenuState(page);
        expect(menuState).not.toBeNull();
        expect(menuState.visible).toBe(true);
        console.log('✓ Menu opened');
        
        // Verify highlight is active
        const highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).not.toBeNull();
        expect(highlightState.renderSystemHighlight.x).toBe(gridX);
        expect(highlightState.renderSystemHighlight.y).toBe(gridY);
        expect(highlightState.managerCoords).not.toBeNull();
        console.log('✓ Cell highlight active');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/a1-menu-with-highlight.png' 
        });
        console.log('✓ Screenshot: a1-menu-with-highlight.png');
    });
    
    test('A2: Tall menu shows scrollbar AND highlight', async ({ page }) => {
        console.log('\n=== TEST A2: Scrollbar + Highlight ===');
        
        const gridX = 25, gridY = 25;
        
        // Spawn multiple plants to make tall menu
        await spawnPlantAt(page, gridX, gridY, 'quercus_robur');
        for (let i = 0; i < 6; i++) {
            await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
            await page.waitForTimeout(50);
        }
        await waitForRenderFrames(page, 5);
        
        // Open menu
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(500);
        
        const menuState = await getMenuState(page);
        expect(menuState.visible).toBe(true);
        expect(menuState.hasVerticalScrollbar).toBe(true);
        console.log('✓ Scrollbar present');
        
        const highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).not.toBeNull();
        console.log('✓ Highlight visible with scrollbar');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/a2-tall-menu-scrollbar-highlight.png' 
        });
        console.log('✓ Screenshot: a2-tall-menu-scrollbar-highlight.png');
    });
    
    test('A3: Drag menu repositions correctly', async ({ page }) => {
        console.log('\n=== TEST A3: Menu Dragging ===');
        
        const gridX = 25, gridY = 25;
        await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(300);
        
        const initialMenu = await getMenuState(page);
        const headerPos = await getHeaderPosition(page);
        
        // Drag menu
        await page.mouse.move(headerPos.x, headerPos.y);
        await page.mouse.down();
        await page.mouse.move(headerPos.x + 150, headerPos.y + 100, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        const finalMenu = await getMenuState(page);
        expect(finalMenu.left).toBeGreaterThan(initialMenu.left);
        expect(finalMenu.top).toBeGreaterThan(initialMenu.top);
        console.log('✓ Menu repositioned');
        
        const highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).not.toBeNull();
        console.log('✓ Highlight persists after drag');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/a3-menu-dragged.png' 
        });
        console.log('✓ Screenshot: a3-menu-dragged.png');
    });
    
    test('A4: ESC closes menu AND clears highlight', async ({ page }) => {
        console.log('\n=== TEST A4: ESC Key Close ===');
        
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        await rightClickAt(page, 25, 25);
        await page.waitForTimeout(300);
        
        let menuState = await getMenuState(page);
        expect(menuState.visible).toBe(true);
        
        let highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).not.toBeNull();
        console.log('✓ Menu and highlight active');
        
        // Press ESC
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        menuState = await getMenuState(page);
        expect(menuState.visible).toBe(false);
        console.log('✓ Menu closed');
        
        highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).toBeNull();
        expect(highlightState.managerCoords).toBeNull();
        console.log('✓ Highlight cleared');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/a4-esc-cleared.png' 
        });
        console.log('✓ Screenshot: a4-esc-cleared.png');
    });
    
    test('A5: Click outside closes menu AND clears highlight', async ({ page }) => {
        console.log('\n=== TEST A5: Outside Click Close ===');
        
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        await rightClickAt(page, 25, 25);
        await page.waitForTimeout(300);
        
        let menuState = await getMenuState(page);
        expect(menuState.visible).toBe(true);
        
        let highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).not.toBeNull();
        console.log('✓ Menu and highlight active');
        
        // Click outside
        await page.mouse.click(10, 10);
        await page.waitForTimeout(300);
        
        menuState = await getMenuState(page);
        expect(menuState.visible).toBe(false);
        console.log('✓ Menu closed');
        
        highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).toBeNull();
        console.log('✓ Highlight cleared');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/a5-outside-click-cleared.png' 
        });
        console.log('✓ Screenshot: a5-outside-click-cleared.png');
    });
    
    // ========================================================================
    // B. CROSS-FEATURE INTERACTIONS
    // ========================================================================
    
    test('B6: Scroll then drag maintains scroll position', async ({ page }) => {
        console.log('\n=== TEST B6: Scroll + Drag Interaction ===');
        
        const gridX = 25, gridY = 25;
        await spawnPlantAt(page, gridX, gridY, 'quercus_robur');
        for (let i = 0; i < 7; i++) {
            await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
            await page.waitForTimeout(50);
        }
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(500);
        
        // Scroll to middle
        await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            menu.scrollTop = menu.scrollHeight / 2;
        });
        await page.waitForTimeout(200);
        
        const scrolledState = await getMenuState(page);
        const scrollBeforeDrag = scrolledState.scrollTop;
        expect(scrollBeforeDrag).toBeGreaterThan(0);
        console.log('✓ Menu scrolled to middle');
        
        // Drag menu
        const headerPos = await getHeaderPosition(page);
        await page.mouse.move(headerPos.x, headerPos.y);
        await page.mouse.down();
        await page.mouse.move(headerPos.x + 100, headerPos.y + 80, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        // Verify scroll position maintained
        const finalState = await getMenuState(page);
        expect(Math.abs(finalState.scrollTop - scrollBeforeDrag)).toBeLessThan(5);
        console.log('✓ Scroll position maintained during drag');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/b6-scroll-drag-interaction.png' 
        });
        console.log('✓ Screenshot: b6-scroll-drag-interaction.png');
    });
    
    test('B7: Drag to edge then scroll still works', async ({ page }) => {
        console.log('\n=== TEST B7: Drag to Edge + Scroll ===');
        
        const gridX = 25, gridY = 25;
        await spawnPlantAt(page, gridX, gridY, 'quercus_robur');
        for (let i = 0; i < 6; i++) {
            await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
            await page.waitForTimeout(50);
        }
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(500);
        
        // Drag to edge
        const headerPos = await getHeaderPosition(page);
        await page.mouse.move(headerPos.x, headerPos.y);
        await page.mouse.down();
        await page.mouse.move(10, 10, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        const draggedMenu = await getMenuState(page);
        console.log('✓ Menu dragged to edge');
        
        // Try scrolling
        await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            menu.scrollTop = menu.scrollHeight - menu.clientHeight;
        });
        await page.waitForTimeout(200);
        
        const scrolledMenu = await getMenuState(page);
        expect(scrolledMenu.scrollTop).toBeGreaterThan(0);
        console.log('✓ Scrolling works after edge drag');
        
        // Verify clamping still works
        expect(scrolledMenu.left).toBeGreaterThan(-scrolledMenu.width + 50);
        console.log('✓ Menu clamping still active');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/b7-edge-drag-scroll.png' 
        });
        console.log('✓ Screenshot: b7-edge-drag-scroll.png');
    });
    
    test('B8: Open at cell A, drag, open at cell B moves highlight', async ({ page }) => {
        console.log('\n=== TEST B8: Sequential Opens with Drag ===');
        
        // Open at cell A
        const cellA = { x: 20, y: 20 };
        await spawnPlantAt(page, cellA.x, cellA.y, 'urtica_dioica');
        await rightClickAt(page, cellA.x, cellA.y);
        await page.waitForTimeout(300);
        
        let highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight.x).toBe(cellA.x);
        expect(highlightState.renderSystemHighlight.y).toBe(cellA.y);
        console.log('✓ Highlight at cell A');
        
        // Drag menu
        const headerPos = await getHeaderPosition(page);
        await page.mouse.move(headerPos.x, headerPos.y);
        await page.mouse.down();
        await page.mouse.move(headerPos.x + 100, headerPos.y + 100, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        console.log('✓ Menu dragged');
        
        // Close menu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // Open at cell B
        const cellB = { x: 30, y: 30 };
        await spawnPlantAt(page, cellB.x, cellB.y, 'urtica_dioica');
        await rightClickAt(page, cellB.x, cellB.y);
        await page.waitForTimeout(300);
        
        highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight.x).toBe(cellB.x);
        expect(highlightState.renderSystemHighlight.y).toBe(cellB.y);
        console.log('✓ Highlight moved to cell B');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/b8-highlight-moved-cell-b.png' 
        });
        console.log('✓ Screenshot: b8-highlight-moved-cell-b.png');
    });
    
    test('B9: Rapid dragging maintains stable state', async ({ page }) => {
        console.log('\n=== TEST B9: Rapid Dragging Stress Test ===');
        
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        await rightClickAt(page, 25, 25);
        await page.waitForTimeout(300);
        
        const headerPos = await getHeaderPosition(page);
        
        // Perform rapid drag movements
        for (let i = 0; i < 5; i++) {
            await page.mouse.move(headerPos.x, headerPos.y);
            await page.mouse.down();
            await page.mouse.move(headerPos.x + 50 * (i % 2 ? 1 : -1), headerPos.y + 50, { steps: 3 });
            await page.mouse.up();
            await page.waitForTimeout(50);
        }
        
        // Verify menu still responsive
        const menuState = await getMenuState(page);
        expect(menuState.visible).toBe(true);
        console.log('✓ Menu still visible after rapid drags');
        
        // Verify highlight persists
        const highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).not.toBeNull();
        console.log('✓ Highlight persists after rapid drags');
        
        // Verify close still works
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        const finalMenu = await getMenuState(page);
        expect(finalMenu.visible).toBe(false);
        console.log('✓ Menu closes correctly after rapid drags');
    });
    
    test('B10: Resize viewport maintains menu accessibility and highlight', async ({ page }) => {
        console.log('\n=== TEST B10: Viewport Resize ===');
        
        await page.setViewportSize({ width: 1280, height: 800 });
        await waitForRenderFrames(page, 5);
        
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        await rightClickAt(page, 25, 25);
        await page.waitForTimeout(300);
        
        let menuState = await getMenuState(page);
        expect(menuState.visible).toBe(true);
        console.log('✓ Menu open at 1280x800');
        
        // Resize to smaller viewport
        await page.setViewportSize({ width: 800, height: 600 });
        await page.waitForTimeout(300);
        
        menuState = await getMenuState(page);
        expect(menuState.visible).toBe(true);
        console.log('✓ Menu still visible at 800x600');
        
        // Verify highlight still visible
        const highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).not.toBeNull();
        console.log('✓ Highlight visible after resize');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/b10-viewport-resized.png' 
        });
        console.log('✓ Screenshot: b10-viewport-resized.png');
    });
    
    // ========================================================================
    // C. EDGE CASES
    // ========================================================================
    
    test('C11: Menu on edge cell positions correctly', async ({ page }) => {
        console.log('\n=== TEST C11: Edge Cell Menu ===');
        
        // Spawn plant near edge
        await spawnPlantAt(page, 2, 2, 'urtica_dioica');
        await rightClickAt(page, 2, 2);
        await page.waitForTimeout(300);
        
        const menuState = await getMenuState(page);
        expect(menuState.visible).toBe(true);
        
        // Verify menu is within viewport
        const viewport = await page.evaluate(() => ({
            width: window.innerWidth,
            height: window.innerHeight
        }));
        
        expect(menuState.left).toBeGreaterThanOrEqual(5);
        expect(menuState.top).toBeGreaterThanOrEqual(5);
        expect(menuState.left + menuState.width).toBeLessThanOrEqual(viewport.width - 5);
        console.log('✓ Menu positioned within viewport bounds');
        
        const highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).not.toBeNull();
        console.log('✓ Highlight visible for edge cell');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/c11-edge-cell-menu.png' 
        });
        console.log('✓ Screenshot: c11-edge-cell-menu.png');
    });
    
    test('C12: Very tall menu (10+ plants) scrolls smoothly', async ({ page }) => {
        console.log('\n=== TEST C12: Very Tall Menu ===');
        
        const gridX = 25, gridY = 25;
        await spawnPlantAt(page, gridX, gridY, 'quercus_robur');
        for (let i = 0; i < 12; i++) {
            await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
            await page.waitForTimeout(40);
        }
        await waitForRenderFrames(page, 5);
        
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(500);
        
        const menuState = await getMenuState(page);
        expect(menuState.hasVerticalScrollbar).toBe(true);
        console.log('✓ Scrollbar present for very tall menu');
        
        // Smooth scroll through entire menu
        await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            const scrollHeight = menu.scrollHeight;
            const steps = 10;
            const increment = scrollHeight / steps;
            
            let currentScroll = 0;
            return new Promise(resolve => {
                const scrollStep = () => {
                    menu.scrollTop = currentScroll;
                    currentScroll += increment;
                    if (currentScroll <= scrollHeight) {
                        requestAnimationFrame(scrollStep);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(scrollStep);
            });
        });
        await page.waitForTimeout(300);
        
        const finalScrollState = await getMenuState(page);
        expect(finalScrollState.scrollTop).toBeGreaterThan(0);
        console.log('✓ Smooth scrolling through very tall menu');
        
        // Try dragging menu while scrolled
        const headerPos = await getHeaderPosition(page);
        await page.mouse.move(headerPos.x, headerPos.y);
        await page.mouse.down();
        await page.mouse.move(headerPos.x + 100, headerPos.y + 50, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        const afterDrag = await getMenuState(page);
        expect(afterDrag.visible).toBe(true);
        console.log('✓ Dragging works with very tall menu');
        
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/c12-very-tall-menu.png' 
        });
        console.log('✓ Screenshot: c12-very-tall-menu.png');
    });
    
    test('C13: Rapid open/close cycles maintain consistent state', async ({ page }) => {
        console.log('\n=== TEST C13: Rapid Open/Close Stress Test ===');
        
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        
        // Perform 10 rapid open/close cycles
        for (let i = 0; i < 10; i++) {
            await rightClickAt(page, 25, 25);
            await page.waitForTimeout(100);
            
            let menuState = await getMenuState(page);
            expect(menuState.visible).toBe(true);
            
            let highlightState = await getHighlightState(page);
            expect(highlightState.renderSystemHighlight).not.toBeNull();
            
            await page.keyboard.press('Escape');
            await page.waitForTimeout(100);
            
            menuState = await getMenuState(page);
            expect(menuState.visible).toBe(false);
            
            highlightState = await getHighlightState(page);
            expect(highlightState.renderSystemHighlight).toBeNull();
        }
        
        console.log('✓ 10 open/close cycles completed successfully');
        console.log('✓ State consistent across all cycles');
    });
    
    test('C14: Drag, scroll, close cleans up all state', async ({ page }) => {
        console.log('\n=== TEST C14: State Cleanup After Complex Interaction ===');
        
        const gridX = 25, gridY = 25;
        await spawnPlantAt(page, gridX, gridY, 'quercus_robur');
        for (let i = 0; i < 6; i++) {
            await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
            await page.waitForTimeout(50);
        }
        
        // Open menu
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(500);
        
        // Drag
        const headerPos = await getHeaderPosition(page);
        await page.mouse.move(headerPos.x, headerPos.y);
        await page.mouse.down();
        await page.mouse.move(headerPos.x + 100, headerPos.y + 80, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        
        // Scroll
        await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            menu.scrollTop = menu.scrollHeight / 2;
        });
        await page.waitForTimeout(200);
        
        // Close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // Verify complete cleanup
        const menuState = await getMenuState(page);
        expect(menuState.visible).toBe(false);
        
        const highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight).toBeNull();
        expect(highlightState.managerCoords).toBeNull();
        
        // Verify no drag listeners remain
        const dragState = await page.evaluate(() => {
            return window.graphicsEngine.contextMenuManager.isDragging;
        });
        expect(dragState).toBe(false);
        
        console.log('✓ All state cleaned up after complex interaction');
    });
    
    test('C15: Multiple cells with independent highlights', async ({ page }) => {
        console.log('\n=== TEST C15: Independent Cell Highlights ===');
        
        // Spawn plants at different cells
        await spawnPlantAt(page, 20, 20, 'urtica_dioica');
        await spawnPlantAt(page, 30, 30, 'urtica_dioica');
        await spawnPlantAt(page, 25, 35, 'urtica_dioica');
        
        // Open menu at cell 1
        await rightClickAt(page, 20, 20);
        await page.waitForTimeout(300);
        
        let highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight.x).toBe(20);
        expect(highlightState.renderSystemHighlight.y).toBe(20);
        console.log('✓ Highlight at cell (20, 20)');
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        
        // Open menu at cell 2
        await rightClickAt(page, 30, 30);
        await page.waitForTimeout(300);
        
        highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight.x).toBe(30);
        expect(highlightState.renderSystemHighlight.y).toBe(30);
        console.log('✓ Highlight moved to cell (30, 30)');
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        
        // Open menu at cell 3
        await rightClickAt(page, 25, 35);
        await page.waitForTimeout(300);
        
        highlightState = await getHighlightState(page);
        expect(highlightState.renderSystemHighlight.x).toBe(25);
        expect(highlightState.renderSystemHighlight.y).toBe(35);
        console.log('✓ Highlight moved to cell (25, 35)');
        
        console.log('✓ Independent highlights for each cell confirmed');
    });
    
    // ========================================================================
    // D. PERFORMANCE VALIDATION
    // ========================================================================
    
    test('D16: FPS >= 30 with menu open, scrolling, and dragging', async ({ page }) => {
        console.log('\n=== TEST D16: Performance Validation ===');
        
        // Get baseline FPS
        await waitForRenderFrames(page, 30);
        const baselineMetrics = await getGameMetrics(page);
        console.log('Baseline:', baselineMetrics);
        
        // Spawn plants
        const gridX = 25, gridY = 25;
        await spawnPlantAt(page, gridX, gridY, 'quercus_robur');
        for (let i = 0; i < 6; i++) {
            await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
            await page.waitForTimeout(50);
        }
        
        // Open menu
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(500);
        await waitForRenderFrames(page, 30);
        
        // Measure FPS with menu open
        const menuOpenFPS = await page.evaluate(() => {
            return new Promise(resolve => {
                let frames = 0;
                let lastTime = performance.now();
                const measure = () => {
                    frames++;
                    if (frames >= 60) {
                        const elapsed = performance.now() - lastTime;
                        resolve((frames / elapsed) * 1000);
                    } else {
                        requestAnimationFrame(measure);
                    }
                };
                requestAnimationFrame(measure);
            });
        });
        
        console.log('FPS with menu open:', menuOpenFPS.toFixed(2));
        expect(menuOpenFPS).toBeGreaterThanOrEqual(30);
        
        // Measure FPS while scrolling
        const scrollingFPS = await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            let scrollDir = 1;
            
            return new Promise(resolve => {
                let frames = 0;
                let lastTime = performance.now();
                const measure = () => {
                    frames++;
                    menu.scrollTop += scrollDir * 5;
                    if (menu.scrollTop <= 0 || menu.scrollTop >= menu.scrollHeight - menu.clientHeight) {
                        scrollDir *= -1;
                    }
                    
                    if (frames >= 60) {
                        const elapsed = performance.now() - lastTime;
                        resolve((frames / elapsed) * 1000);
                    } else {
                        requestAnimationFrame(measure);
                    }
                };
                requestAnimationFrame(measure);
            });
        });
        
        console.log('FPS while scrolling:', scrollingFPS.toFixed(2));
        expect(scrollingFPS).toBeGreaterThanOrEqual(30);
        
        // Measure FPS while dragging
        const headerPos = await getHeaderPosition(page);
        await page.mouse.move(headerPos.x, headerPos.y);
        await page.mouse.down();
        
        const draggingFPS = await page.evaluate((start) => {
            return new Promise(resolve => {
                let frames = 0;
                let lastTime = performance.now();
                const measure = () => {
                    frames++;
                    if (frames >= 30) {
                        const elapsed = performance.now() - lastTime;
                        resolve((frames / elapsed) * 1000);
                    } else {
                        requestAnimationFrame(measure);
                    }
                };
                requestAnimationFrame(measure);
            });
        }, { x: headerPos.x, y: headerPos.y });
        
        await page.mouse.move(headerPos.x + 100, headerPos.y + 100, { steps: 10 });
        await page.mouse.up();
        
        console.log('FPS while dragging:', draggingFPS.toFixed(2));
        expect(draggingFPS).toBeGreaterThanOrEqual(30);
        
        console.log('✓ All performance targets met (FPS >= 30)');
    });
    
    test('D17: No memory leaks after 20 open/close cycles', async ({ page }) => {
        console.log('\n=== TEST D17: Memory Leak Detection ===');
        
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        
        // Get initial memory
        const initialMemory = await page.evaluate(() => {
            if (performance.memory) {
                return performance.memory.usedJSHeapSize;
            }
            return null;
        });
        
        if (initialMemory === null) {
            console.log('⚠ Memory API not available, skipping memory test');
            return;
        }
        
        console.log('Initial memory:', (initialMemory / 1024 / 1024).toFixed(2), 'MB');
        
        // Perform 20 open/close cycles
        for (let i = 0; i < 20; i++) {
            await rightClickAt(page, 25, 25);
            await page.waitForTimeout(100);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(100);
        }
        
        // Force garbage collection if available
        await page.evaluate(() => {
            if (window.gc) {
                window.gc();
            }
        });
        await page.waitForTimeout(500);
        
        // Get final memory
        const finalMemory = await page.evaluate(() => {
            return performance.memory.usedJSHeapSize;
        });
        
        console.log('Final memory:', (finalMemory / 1024 / 1024).toFixed(2), 'MB');
        
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
        console.log('Memory increase:', memoryIncreaseMB.toFixed(2), 'MB');
        
        // Allow up to 5MB increase for 20 cycles (250KB per cycle)
        expect(memoryIncreaseMB).toBeLessThan(5);
        console.log('✓ No significant memory leak detected');
    });
    
    test('D18: Render calls increase by +4 with highlight', async ({ page }) => {
        console.log('\n=== TEST D18: Render Call Validation ===');
        
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        await waitForRenderFrames(page, 10);
        
        // Get baseline render calls
        const baselineMetrics = await getGameMetrics(page);
        const baselineRenderCalls = baselineMetrics.rendering.renderCalls;
        console.log('Baseline render calls:', baselineRenderCalls);
        
        // Open menu with highlight
        await rightClickAt(page, 25, 25);
        await page.waitForTimeout(300);
        await waitForRenderFrames(page, 10);
        
        // Get render calls with highlight
        const highlightMetrics = await getGameMetrics(page);
        const highlightRenderCalls = highlightMetrics.rendering.renderCalls;
        console.log('Render calls with highlight:', highlightRenderCalls);
        
        // Should be +4 calls (4 borders of highlight)
        const increase = highlightRenderCalls - baselineRenderCalls;
        console.log('Render call increase:', increase);
        expect(increase).toBe(4);
        console.log('✓ Render calls increased by exactly +4 for highlight');
    });
    
    // ========================================================================
    // E. VISUAL REGRESSION
    // ========================================================================
    
    test('E19: Capture key visual states', async ({ page }) => {
        console.log('\n=== TEST E19: Visual Regression Capture ===');
        
        // State 1: No menu
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/e19-state-no-menu.png',
            fullPage: false
        });
        console.log('✓ Screenshot: e19-state-no-menu.png');
        
        // State 2: Menu with highlight (short)
        await spawnPlantAt(page, 25, 25, 'urtica_dioica');
        await rightClickAt(page, 25, 25);
        await page.waitForTimeout(300);
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/e19-state-menu-with-highlight.png',
            fullPage: false
        });
        console.log('✓ Screenshot: e19-state-menu-with-highlight.png');
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // State 3: Menu dragged
        await rightClickAt(page, 25, 25);
        await page.waitForTimeout(300);
        const headerPos = await getHeaderPosition(page);
        await page.mouse.move(headerPos.x, headerPos.y);
        await page.mouse.down();
        await page.mouse.move(headerPos.x + 150, headerPos.y + 120, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/e19-state-menu-dragged.png',
            fullPage: false
        });
        console.log('✓ Screenshot: e19-state-menu-dragged.png');
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // State 4: Menu scrolled
        const gridX = 25, gridY = 26;
        await spawnPlantAt(page, gridX, gridY, 'quercus_robur');
        for (let i = 0; i < 6; i++) {
            await spawnPlantAt(page, gridX, gridY, 'urtica_dioica');
            await page.waitForTimeout(50);
        }
        await rightClickAt(page, gridX, gridY);
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            const menu = document.getElementById('context-menu');
            menu.scrollTop = menu.scrollHeight / 2;
        });
        await page.waitForTimeout(200);
        await page.screenshot({ 
            path: 'test-results/context-menu-ux/e19-state-menu-scrolled.png',
            fullPage: false
        });
        console.log('✓ Screenshot: e19-state-menu-scrolled.png');
        
        console.log('✓ All visual states captured');
    });
});
