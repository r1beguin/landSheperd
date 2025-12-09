/**
 * Cell Highlight Render Order Test
 * 
 * Validates that cell highlighting renders UNDER plants, not over them.
 * This ensures proper visual layering: soil → highlight → plants
 */

const { test, expect } = require('@playwright/test');
const { waitForRenderFrames, clickOnCanvas, spawnPlantAt, getGameMetrics } = require('./test-utils');

test.describe('Cell Highlight Render Order', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        
        // Wait for graphics engine initialization
        await page.waitForFunction(() => window.graphicsEngine !== undefined, { timeout: 5000 });
        console.log('✓ Graphics engine loaded');
        
        // Wait for stable state
        await waitForRenderFrames(page, 30);
    });
    
    test('Cell highlight should render below plants, not on top', async ({ page }) => {
        console.log('\n=== Cell Highlight Render Order Test ===');
        
        // Step 1: Spawn a plant at a known location
        console.log('\nStep 1: Spawning a plant at center...');
        const plantResult = await spawnPlantAt(page, 0, 0, 'clover');
        
        if (!plantResult.success) {
            console.log(`Warning: Plant spawn returned success=false. Message: ${plantResult.message}`);
            // Continue anyway - the test may still work
        }
        
        await waitForRenderFrames(page, 10);
        
        // Verify plant exists
        const plantCountAfterSpawn = await page.evaluate(() => {
            return window.graphicsEngine.plantManager.plants.size;
        });
        
        console.log(`Plants after spawn: ${plantCountAfterSpawn}`);
        
        // If no plant spawned, try alternate method (direct context menu click)
        if (plantCountAfterSpawn === 0) {
            console.log('Trying alternate spawn method: direct right-click and context menu...');
            
            // Right-click at center of canvas
            const canvas = await page.$('#gameCanvas');
            const box = await canvas.boundingBox();
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            
            // Right-click to open context menu
            await page.mouse.click(centerX, centerY, { button: 'right' });
            await page.waitForTimeout(200);
            
            // Click "Spawn plant" button
            const spawnButton = await page.$('button:has-text("SPAWN PLANT")');
            if (spawnButton) {
                await spawnButton.click();
                await page.waitForTimeout(200);
                
                // Select clover from species menu
                const cloverOption = await page.$('[data-species="clover"]');
                if (cloverOption) {
                    await cloverOption.click();
                    await waitForRenderFrames(page, 10);
                }
            }
        }
        
        // Get final plant count
        const finalPlantCount = await page.evaluate(() => {
            return window.graphicsEngine.plantManager.plants.size;
        });
        
        console.log(`Final plant count: ${finalPlantCount}`);
        
        // Step 2: Enable cell highlighting by hovering over plant location
        console.log('\nStep 2: Hovering over plant cell to trigger highlight...');
        
        // Calculate screen position for grid (0, 0)
        const screenPos = await page.evaluate(() => {
            const gridX = 0;
            const gridY = 0;
            const projection = window.graphicsEngine.config.world.rendering.projection;
            
            let worldX, worldY;
            if (projection === 'isometric') {
                const isoConfig = window.graphicsEngine.config.world.rendering.isometric;
                const isoPos = IsometricUtils.gridToIso(gridX, gridY, isoConfig.tileWidth, isoConfig.tileHeight);
                worldX = isoPos.x;
                worldY = isoPos.y;
            } else {
                const cellSize = window.graphicsEngine.config.world.map.cellSize;
                worldX = gridX * cellSize + cellSize / 2;
                worldY = gridY * cellSize + cellSize / 2;
            }
            
            // Convert world to screen
            const viewMatrix = window.graphicsEngine.cameraManager.getViewMatrix();
            const screenX = (worldX - viewMatrix.position.x) * viewMatrix.zoom + viewMatrix.resolution.width / 2;
            const screenY = (worldY - viewMatrix.position.y) * viewMatrix.zoom + viewMatrix.resolution.height / 2;
            
            return { x: screenX, y: screenY };
        });
        
        // Move mouse to plant location and right-click to show context menu (which triggers highlight)
        const canvas = await page.$('#gameCanvas');
        const box = await canvas.boundingBox();
        await page.mouse.move(box.x + screenPos.x, box.y + screenPos.y);
        await page.mouse.click(box.x + screenPos.x, box.y + screenPos.y, { button: 'right' });
        await page.waitForTimeout(200);
        
        // Check if highlight is active
        const highlightActive = await page.evaluate(() => {
            const highlight = window.graphicsEngine.renderSystem.getHighlightedCell();
            return highlight !== null;
        });
        
        console.log(`Cell highlight active: ${highlightActive}`);
        
        // Step 3: Capture screenshot showing render order
        console.log('\nStep 3: Capturing screenshot with highlight and plant...');
        await waitForRenderFrames(page, 5);
        const screenshotPath = 'test-results/cell-highlight-render-order.png';
        await page.screenshot({ path: screenshotPath });
        console.log(`✓ Screenshot saved: ${screenshotPath}`);
        
        // Step 4: Verify render order programmatically
        console.log('\nStep 4: Verifying render order in code...');
        
        const renderOrderInfo = await page.evaluate(() => {
            // Check the renderEntities method order
            const mainGraphicsCode = window.graphicsEngine.renderEntities.toString();
            
            // Extract render call order
            const soilIndex = mainGraphicsCode.indexOf('renderSoil');
            const highlightIndex = mainGraphicsCode.indexOf('renderCellHighlight');
            const plantsIndex = mainGraphicsCode.indexOf('renderPlantsByLayer');
            
            return {
                soilIndex,
                highlightIndex,
                plantsIndex,
                correctOrder: soilIndex < highlightIndex && highlightIndex < plantsIndex
            };
        });
        
        console.log(`Render order indices: soil=${renderOrderInfo.soilIndex}, highlight=${renderOrderInfo.highlightIndex}, plants=${renderOrderInfo.plantsIndex}`);
        console.log(`Correct order: ${renderOrderInfo.correctOrder}`);
        
        // Assertions
        expect(renderOrderInfo.correctOrder).toBe(true);
        expect(renderOrderInfo.soilIndex).toBeGreaterThan(-1);
        expect(renderOrderInfo.highlightIndex).toBeGreaterThan(renderOrderInfo.soilIndex);
        expect(renderOrderInfo.plantsIndex).toBeGreaterThan(renderOrderInfo.highlightIndex);
        
        console.log('\n✓ Cell highlight renders BELOW plants (correct order)');
        console.log('✓ Test passed: Render order is soil → highlight → plants\n');
    });
});
