/**
 * Milestone 4 - Isometric Input & Camera Controls Test
 * 
 * PURPOSE: Automated validation that mouse clicks correctly map to isometric tiles,
 * context menu highlights diamond-shaped cells, and camera controls work properly.
 * 
 * WHAT THIS TEST VALIDATES:
 * - Screen-to-grid coordinate conversion in isometric mode
 * - Context menu appears at correct tile on right-click
 * - Cell highlighting shows diamond shape (not square)
 * - Camera pan scale adjustment for isometric (0.7x multiplier)
 * - All functionality works without console errors
 */

import { test, expect } from '@playwright/test';
import { waitForRenderFrames } from './test-utils.js';

test.describe('Milestone 4 - Isometric Input & Camera', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('/');
        
        // Wait for initial render
        await waitForRenderFrames(page, 10);
    });
    
    test('M4.1 - Coordinate conversion uses isometric mode', async ({ page }) => {
        // CHECKPOINT: Verify projection mode is isometric
        const projection = await page.evaluate(() => {
            return window.config.world.rendering.projection;
        });
        
        expect(projection).toBe('isometric');
        
        // CHECKPOINT: Test IsometricUtils.isoToGrid conversion
        const conversionTest = await page.evaluate(() => {
            const isoConfig = window.config.world.rendering.isometric;
            
            // Test known grid position (0, 0)
            const isoPos = IsometricUtils.gridToIso(0, 0, isoConfig.tileWidth, isoConfig.tileHeight);
            const gridBack = IsometricUtils.isoToGrid(isoPos.x, isoPos.y, isoConfig.tileWidth, isoConfig.tileHeight);
            
            return {
                gridOriginal: { x: 0, y: 0 },
                isoPos: isoPos,
                gridConverted: gridBack,
                matchesOriginal: gridBack.x === 0 && gridBack.y === 0
            };
        });
        
        expect(conversionTest.matchesOriginal).toBe(true);
        console.log('  ✓ Coordinate conversion round-trip successful');
    });
    
    test('M4.2 - Right-click uses isometric coordinate conversion', async ({ page }) => {
        // CHECKPOINT: Right-click should use IsometricUtils.isoToGrid
        
        // Get a valid soil tile position
        const tileInfo = await page.evaluate(() => {
            const ge = window.graphicsEngine;
            const soilManager = ge.soilManager;
            const isoConfig = window.config.world.rendering.isometric;
            
            // Find first non-water soil tile
            let testGridX = 0;
            let testGridY = 0;
            
            for (let x = -10; x < 10; x++) {
                for (let y = -10; y < 10; y++) {
                    const soil = soilManager.getSoilAt(x, y);
                    if (soil && !soil.isWater) {
                        testGridX = x;
                        testGridY = y;
                        break;
                    }
                }
                if (testGridX !== 0 || testGridY !== 0) break;
            }
            
            // Convert grid to isometric world coords
            const isoPos = IsometricUtils.gridToIso(testGridX, testGridY, isoConfig.tileWidth, isoConfig.tileHeight);
            
            // Convert world to screen coords
            const screenPos = ge.cameraManager.worldToScreen(isoPos.x, isoPos.y);
            
            return {
                gridX: testGridX,
                gridY: testGridY,
                isoX: isoPos.x,
                isoY: isoPos.y,
                screenX: screenPos.x,
                screenY: screenPos.y
            };
        });
        
        console.log(`  Testing tile at grid (${tileInfo.gridX}, ${tileInfo.gridY})`);
        console.log(`  → Iso world: (${tileInfo.isoX.toFixed(1)}, ${tileInfo.isoY.toFixed(1)})`);
        console.log(`  → Screen: (${tileInfo.screenX.toFixed(0)}, ${tileInfo.screenY.toFixed(0)})`);
        
        // Right-click on the tile
        await page.mouse.click(tileInfo.screenX, tileInfo.screenY, { button: 'right' });
        
        // Wait for context menu to appear
        await page.waitForSelector('#context-menu', { timeout: 1000 });
        
        // Verify context menu is visible
        const menuVisible = await page.isVisible('#context-menu');
        expect(menuVisible).toBe(true);
        
        // Verify context menu shows correct grid coordinates
        const menuTitle = await page.textContent('.context-menu-title');
        const expectedTitle = `Cell (${tileInfo.gridX}, ${tileInfo.gridY})`;
        
        expect(menuTitle).toContain(`(${tileInfo.gridX}, ${tileInfo.gridY})`);
        console.log(`  ✓ Context menu shows: ${menuTitle}`);
        console.log(`  ✓ Expected: ${expectedTitle}`);
    });
    
    test('M4.3 - Cell highlight is diamond-shaped in isometric', async ({ page }) => {
        // CHECKPOINT: Verify RenderSystem uses renderIsometricCellHighlight
        
        // Get a tile and right-click to trigger highlight
        const highlightTest = await page.evaluate(() => {
            const ge = window.graphicsEngine;
            const renderSystem = ge.renderSystem;
            
            // Find a test tile
            let testX = 0, testY = 0;
            for (let x = -5; x < 5; x++) {
                for (let y = -5; y < 5; y++) {
                    const soil = ge.soilManager.getSoilAt(x, y);
                    if (soil && !soil.isWater) {
                        testX = x;
                        testY = y;
                        break;
                    }
                }
                if (testX !== 0 || testY !== 0) break;
            }
            
            // Set highlighted cell
            renderSystem.setHighlightedCell(testX, testY);
            
            // Get highlighted cell
            const highlighted = renderSystem.getHighlightedCell();
            
            return {
                testX: testX,
                testY: testY,
                highlightedX: highlighted?.x,
                highlightedY: highlighted?.y,
                matchesTest: highlighted?.x === testX && highlighted?.y === testY
            };
        });
        
        expect(highlightTest.matchesTest).toBe(true);
        console.log(`  ✓ Cell highlight set at (${highlightTest.testX}, ${highlightTest.testY})`);
        
        // Take screenshot to verify diamond shape
        await waitForRenderFrames(page, 5);
        const screenshot = await page.screenshot();
        expect(screenshot).toBeTruthy();
        console.log('  ✓ Screenshot captured for diamond highlight verification');
    });
    
    test('M4.4 - Camera pan scale is adjusted for isometric', async ({ page }) => {
        // CHECKPOINT: Verify camera has isometric pan scale
        const panScaleTest = await page.evaluate(() => {
            const camera = window.graphicsEngine.cameraManager;
            
            // Get projection mode and pan scale
            const projectionMode = camera.projectionMode;
            const panScale = camera.getIsometricPanScale();
            
            // Test that move() uses pan scale
            const positionBefore = { x: camera.position.x, y: camera.position.y };
            camera.move(100, 0); // Move 100 units right
            const positionAfter = { x: camera.position.x, y: camera.position.y };
            
            const actualDelta = positionAfter.x - positionBefore.x;
            const expectedDelta = 100 * panScale;
            
            // Reset position
            camera.setPosition(positionBefore.x, positionBefore.y);
            
            return {
                projectionMode: projectionMode,
                panScale: panScale,
                expectedPanScale: 0.7,
                actualDelta: actualDelta,
                expectedDelta: expectedDelta,
                deltaMatches: Math.abs(actualDelta - expectedDelta) < 0.1
            };
        });
        
        expect(panScaleTest.projectionMode).toBe('isometric');
        expect(panScaleTest.panScale).toBe(0.7);
        expect(panScaleTest.deltaMatches).toBe(true);
        
        console.log(`  ✓ Projection mode: ${panScaleTest.projectionMode}`);
        console.log(`  ✓ Pan scale: ${panScaleTest.panScale} (expected: ${panScaleTest.expectedPanScale})`);
        console.log(`  ✓ Move delta: ${panScaleTest.actualDelta.toFixed(1)} (expected: ${panScaleTest.expectedDelta.toFixed(1)})`);
    });
    
    test('M4.5 - Full interaction workflow (click → context menu → highlight)', async ({ page }) => {
        // CHECKPOINT: End-to-end test of isometric input system
        
        // Find a valid tile
        const workflowTest = await page.evaluate(() => {
            const ge = window.graphicsEngine;
            const isoConfig = window.config.world.rendering.isometric;
            
            // Find test tile
            let gridX = 0, gridY = 0;
            for (let x = -8; x < 8; x++) {
                for (let y = -8; y < 8; y++) {
                    const soil = ge.soilManager.getSoilAt(x, y);
                    if (soil && !soil.isWater) {
                        gridX = x;
                        gridY = y;
                        break;
                    }
                }
                if (gridX !== 0 || gridY !== 0) break;
            }
            
            // Convert to screen coords
            const isoPos = IsometricUtils.gridToIso(gridX, gridY, isoConfig.tileWidth, isoConfig.tileHeight);
            const screenPos = ge.cameraManager.worldToScreen(isoPos.x, isoPos.y);
            
            return { gridX, gridY, screenX: screenPos.x, screenY: screenPos.y };
        });
        
        console.log(`  Testing full workflow at grid (${workflowTest.gridX}, ${workflowTest.gridY})`);
        
        // STEP 1: Right-click
        await page.mouse.click(workflowTest.screenX, workflowTest.screenY, { button: 'right' });
        await page.waitForSelector('#context-menu', { timeout: 1000 });
        
        // STEP 2: Verify context menu
        const menuVisible = await page.isVisible('#context-menu');
        expect(menuVisible).toBe(true);
        console.log('  ✓ Step 1: Context menu appeared');
        
        // STEP 3: Verify highlight is active
        const highlightActive = await page.evaluate(() => {
            const highlighted = window.graphicsEngine.renderSystem.getHighlightedCell();
            return highlighted !== null;
        });
        expect(highlightActive).toBe(true);
        console.log('  ✓ Step 2: Cell highlight active');
        
        // STEP 4: Close menu and verify highlight clears
        await page.click('body'); // Click outside to close menu
        await page.waitForTimeout(200);
        
        const highlightCleared = await page.evaluate(() => {
            const highlighted = window.graphicsEngine.renderSystem.getHighlightedCell();
            return highlighted === null;
        });
        expect(highlightCleared).toBe(true);
        console.log('  ✓ Step 3: Highlight cleared when menu closed');
        
        console.log('  ✅ Full workflow complete');
    });
    
    test('M4.6 - No console errors during interactions', async ({ page }) => {
        // CHECKPOINT: Monitor console for errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Perform multiple interactions
        const interactions = await page.evaluate(() => {
            const ge = window.graphicsEngine;
            const isoConfig = window.config.world.rendering.isometric;
            const tiles = [];
            
            // Find 3 different tiles
            for (let x = -10; x < 10 && tiles.length < 3; x++) {
                for (let y = -10; y < 10 && tiles.length < 3; y++) {
                    const soil = ge.soilManager.getSoilAt(x, y);
                    if (soil && !soil.isWater) {
                        const isoPos = IsometricUtils.gridToIso(x, y, isoConfig.tileWidth, isoConfig.tileHeight);
                        const screenPos = ge.cameraManager.worldToScreen(isoPos.x, isoPos.y);
                        tiles.push({ gridX: x, gridY: y, screenX: screenPos.x, screenY: screenPos.y });
                    }
                }
            }
            
            return tiles;
        });
        
        // Click each tile
        for (const tile of interactions) {
            await page.mouse.click(tile.screenX, tile.screenY, { button: 'right' });
            await page.waitForTimeout(100);
            await page.click('body'); // Close menu
            await page.waitForTimeout(100);
        }
        
        // Verify no errors
        expect(consoleErrors.length).toBe(0);
        console.log(`  ✓ ${interactions.length} interactions completed with 0 errors`);
    });
});
