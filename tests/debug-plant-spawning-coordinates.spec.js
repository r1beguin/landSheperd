/**
 * Debug test for plant spawning coordinate issues in isometric mode
 * Tracks exact coordinate flow from click to plant render position
 */

const { test, expect } = require('@playwright/test');
const {
    waitForRenderFrames,
    getGameMetrics,
    clickOnCanvas
} = require('./test-utils');

test('Debug plant spawning coordinates in isometric mode', async ({ page }) => {
    // Navigate to page
    await page.goto('http://localhost:8081');
    
    // Wait for initialization
    await page.waitForFunction(() => {
        return window.graphicsEngine && 
               window.graphicsEngine.initialized &&
               window.config;
    }, { timeout: 10000 });
    
    await waitForRenderFrames(page, 10);
    
    console.log('\n=== ISOMETRIC PLANT SPAWNING COORDINATE DEBUG ===\n');
    
    // Get projection mode
    const projection = await page.evaluate(() => {
        return window.config.world.rendering.projection;
    });
    console.log(`Projection mode: ${projection}`);
    expect(projection).toBe('isometric');
    
    // Get isometric config
    const isoConfig = await page.evaluate(() => {
        return window.config.world.rendering.isometric;
    });
    console.log(`Isometric config: tileWidth=${isoConfig.tileWidth}, tileHeight=${isoConfig.tileHeight}`);
    
    // Get canvas dimensions
    const canvas = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return { width: c.width, height: c.height };
    });
    console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
    
    // Click at center of canvas to open context menu
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    console.log(`\n--- STEP 1: Right-click at screen position (${centerX}, ${centerY}) ---`);
    
    // Set up console listener to capture coordinate logs
    const coordinateLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Grid') || text.includes('Iso') || text.includes('DEBUG') || text.includes('Plant')) {
            coordinateLogs.push(text);
            console.log(`[BROWSER] ${text}`);
        }
    });
    
    // Right-click on canvas
    await clickOnCanvas(page, centerX, centerY, { button: 'right' });
    await waitForRenderFrames(page, 3);
    
    // Check if context menu appeared
    const menuVisible = await page.evaluate(() => {
        const menu = document.getElementById('context-menu');
        return menu && menu.style.display === 'block';
    });
    
    console.log(`Context menu visible: ${menuVisible}`);
    
    if (!menuVisible) {
        console.error('Context menu did not appear! Cannot proceed with test.');
        throw new Error('Context menu did not appear');
    }
    
    // Get the grid coordinates and world coordinates from the context menu manager
    const contextMenuState = await page.evaluate(() => {
        const mgr = window.graphicsEngine.contextMenuManager;
        return {
            gridX: mgr.currentGridX,
            gridY: mgr.currentGridY,
            worldX: mgr.currentWorldX,
            worldY: mgr.currentWorldY
        };
    });
    
    console.log(`\n--- STEP 2: Context menu state ---`);
    console.log(`Grid coordinates: (${contextMenuState.gridX}, ${contextMenuState.gridY})`);
    console.log(`World coordinates: (${contextMenuState.worldX.toFixed(2)}, ${contextMenuState.worldY.toFixed(2)})`);
    
    // Get plant count before spawning
    const plantsBefore = await getGameMetrics(page);
    console.log(`\n--- STEP 3: Before spawning ---`);
    console.log(`Plants: ${plantsBefore.entities.plantCount}`);
    
    // Click on "Spawn Oak" button in context menu
    console.log(`\n--- STEP 4: Clicking "Spawn Oak" button ---`);
    
    const spawnResult = await page.evaluate(() => {
        // Find and click the Oak button
        const buttons = document.querySelectorAll('.context-menu-button');
        let oakButton = null;
        for (const btn of buttons) {
            if (btn.textContent.includes('Oak')) {
                oakButton = btn;
                break;
            }
        }
        
        if (!oakButton) {
            return { success: false, error: 'Oak button not found' };
        }
        
        oakButton.click();
        return { success: true };
    });
    
    if (!spawnResult.success) {
        console.error(`Failed to click Oak button: ${spawnResult.error}`);
        throw new Error(spawnResult.error);
    }
    
    // Wait for plant to be created
    await waitForRenderFrames(page, 10);
    
    // Get plant count after spawning
    const plantsAfter = await getGameMetrics(page);
    console.log(`\n--- STEP 5: After spawning ---`);
    console.log(`Plants: ${plantsAfter.entities.plantCount}`);
    console.log(`Plants created: ${plantsAfter.entities.plantCount - plantsBefore.entities.plantCount}`);
    
    // Validate plant was created
    expect(plantsAfter.entities.plantCount).toBeGreaterThan(plantsBefore.entities.plantCount);
    
    // Get detailed information about the newly created plant
    const plantDetails = await page.evaluate((expectedGridX, expectedGridY) => {
        const plantManager = window.graphicsEngine.plantManager;
        const soilManager = window.graphicsEngine.soilManager;
        const cellSize = soilManager.cellSize;
        
        // Try to find plant at expected grid coordinates
        const plantsAtExpected = plantManager.getPlantAt(expectedGridX, expectedGridY);
        
        // Also check neighboring cells (one cell below)
        const plantsBelow = plantManager.getPlantAt(expectedGridX, expectedGridY + 1);
        const plantsAbove = plantManager.getPlantAt(expectedGridX, expectedGridY - 1);
        const plantsLeft = plantManager.getPlantAt(expectedGridX - 1, expectedGridY);
        const plantsRight = plantManager.getPlantAt(expectedGridX + 1, expectedGridY);
        
        // Get all plants and find the newest Oak
        let newestOak = null;
        plantManager.plants.forEach((layerMap, key) => {
            layerMap.forEach((plant) => {
                if (plant.species.commonName === 'Oak') {
                    if (!newestOak || plant.age < newestOak.age) {
                        newestOak = plant;
                    }
                }
            });
        });
        
        if (!newestOak) {
            return { success: false, error: 'No Oak plant found' };
        }
        
        // Get render data to see where it actually renders
        const renderData = newestOak.getRenderData();
        
        return {
            success: true,
            expectedGrid: { x: expectedGridX, y: expectedGridY },
            plantInternalData: {
                x: newestOak.x,
                y: newestOak.y,
                gridX: newestOak.gridX,
                gridY: newestOak.gridY
            },
            renderData: {
                x: renderData.x,
                y: renderData.y,
                renderType: renderData.renderType
            },
            foundAt: {
                expected: plantsAtExpected.length > 0,
                below: plantsBelow.length > 0,
                above: plantsAbove.length > 0,
                left: plantsLeft.length > 0,
                right: plantsRight.length > 0
            },
            cellSize: cellSize
        };
    }, contextMenuState.gridX, contextMenuState.gridY);
    
    console.log(`\n--- STEP 6: Plant internal data ---`);
    if (plantDetails.success) {
        console.log(`Expected grid: (${plantDetails.expectedGrid.x}, ${plantDetails.expectedGrid.y})`);
        console.log(`Plant.x: ${plantDetails.plantInternalData.x}`);
        console.log(`Plant.y: ${plantDetails.plantInternalData.y}`);
        console.log(`Plant.gridX: ${plantDetails.plantInternalData.gridX}`);
        console.log(`Plant.gridY: ${plantDetails.plantInternalData.gridY}`);
        console.log(`Plant getRenderData().x: ${plantDetails.renderData.x}`);
        console.log(`Plant getRenderData().y: ${plantDetails.renderData.y}`);
        console.log(`Plant renderType: ${plantDetails.renderData.renderType}`);
        console.log(`Cell size: ${plantDetails.cellSize}`);
        
        console.log(`\n--- STEP 7: Plant location check ---`);
        console.log(`Found at expected grid (${plantDetails.expectedGrid.x}, ${plantDetails.expectedGrid.y}): ${plantDetails.foundAt.expected}`);
        console.log(`Found at grid below (${plantDetails.expectedGrid.x}, ${plantDetails.expectedGrid.y + 1}): ${plantDetails.foundAt.below}`);
        console.log(`Found at grid above (${plantDetails.expectedGrid.x}, ${plantDetails.expectedGrid.y - 1}): ${plantDetails.foundAt.above}`);
        console.log(`Found at grid left (${plantDetails.expectedGrid.x - 1}, ${plantDetails.expectedGrid.y}): ${plantDetails.foundAt.left}`);
        console.log(`Found at grid right (${plantDetails.expectedGrid.x + 1}, ${plantDetails.expectedGrid.y}): ${plantDetails.foundAt.right}`);
        
        // Calculate what grid coordinates the Plant constructor calculated
        const calculatedGridX = Math.floor(plantDetails.plantInternalData.x / plantDetails.cellSize);
        const calculatedGridY = Math.floor(plantDetails.plantInternalData.y / plantDetails.cellSize);
        
        console.log(`\n--- STEP 8: Coordinate transformation analysis ---`);
        console.log(`Plant constructor received world coords: (${plantDetails.plantInternalData.x}, ${plantDetails.plantInternalData.y})`);
        console.log(`Plant constructor calculated grid coords: (${calculatedGridX}, ${calculatedGridY})`);
        console.log(`Expected grid coords: (${plantDetails.expectedGrid.x}, ${plantDetails.expectedGrid.y})`);
        console.log(`Offset: X=${calculatedGridX - plantDetails.expectedGrid.x}, Y=${calculatedGridY - plantDetails.expectedGrid.y}`);
        
        // Determine where the issue is
        if (calculatedGridX !== plantDetails.expectedGrid.x || calculatedGridY !== plantDetails.expectedGrid.y) {
            console.log(`\n!!! COORDINATE MISMATCH DETECTED !!!`);
            console.log(`The Plant constructor calculated different grid coordinates than expected.`);
            console.log(`This means the world coordinates passed to Plant() are incorrect.`);
            
            // Check if it's the PlantManager that's passing wrong coords
            console.log(`\nRoot cause: PlantManager.addPlantAtPosition() is likely passing incorrect world coordinates to Plant constructor.`);
        } else {
            console.log(`\n✓ Plant constructor calculated correct grid coordinates.`);
            console.log(`Issue may be in getRenderData() or rendering logic.`);
        }
    } else {
        console.error(`Failed to get plant details: ${plantDetails.error}`);
    }
    
    // Print all captured coordinate logs
    console.log(`\n--- STEP 9: All coordinate logs ---`);
    coordinateLogs.forEach(log => console.log(log));
    
    console.log(`\n=== END COORDINATE DEBUG ===\n`);
    
    // Take screenshot of final state
    await page.screenshot({ 
        path: 'test-results/debug-plant-spawning-coordinates.png',
        fullPage: false
    });
});
