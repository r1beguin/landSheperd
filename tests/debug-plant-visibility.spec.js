const { test, expect } = require('@playwright/test');

test('Debug plant visibility in isometric mode', async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:8081');
    
    // Wait for game to load
    await page.waitForFunction(() => window.graphicsEngine?.initialized, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('=== GAME LOADED ===');
    
    // Get initial state
    const initialState = await page.evaluate(() => {
        const ge = window.graphicsEngine;
        return {
            projection: window.config.world.rendering.projection,
            cameraPosition: { x: ge.cameraManager.position.x, y: ge.cameraManager.position.y },
            cameraZoom: ge.cameraManager.zoom,
            plantCount: ge.plantManager.plants.length
        };
    });
    
    console.log('Initial state:', initialState);
    
    // Click center of screen to spawn a plant
    const canvasBounds = await page.locator('canvas#gameCanvas').boundingBox();
    const centerX = canvasBounds.x + canvasBounds.width / 2;
    const centerY = canvasBounds.y + canvasBounds.height / 2;
    
    console.log(`\nClicking at screen center: (${centerX}, ${centerY})`);
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(500);
    
    // Get plant information
    const plantInfo = await page.evaluate(() => {
        const ge = window.graphicsEngine;
        const plants = ge.plantManager.plants;
        
        if (plants.length === 0) return { error: 'No plants spawned' };
        
        const plant = plants[0];
        const renderData = plant.getRenderData();
        const cameraBounds = ge.cameraManager.getVisibleBounds();
        const visiblePlants = ge.plantManager.getVisiblePlants(cameraBounds);
        
        return {
            plantCount: plants.length,
            plant: {
                species: plant.species.commonName,
                gridX: plant.gridX,
                gridY: plant.gridY,
                orthoX: plant.x,
                orthoY: plant.y,
                renderX: renderData.x,
                renderY: renderData.y,
                width: renderData.width,
                height: renderData.height,
                hasTexture: plant.hasTexture(),
                webglTexture: plant.webglTexture ? 'exists' : 'null'
            },
            camera: {
                bounds: cameraBounds,
                position: { x: ge.cameraManager.position.x, y: ge.cameraManager.position.y },
                zoom: ge.cameraManager.zoom
            },
            visiblePlantCount: visiblePlants.length,
            isPlantVisible: visiblePlants.includes(plant)
        };
    });
    
    console.log('\n=== PLANT INFO ===');
    console.log(JSON.stringify(plantInfo, null, 2));
    
    // Check if plant is in camera bounds
    if (plantInfo.plant) {
        const p = plantInfo.plant;
        const b = plantInfo.camera.bounds;
        const inBounds = p.renderX >= b.left && p.renderX <= b.right && 
                        p.renderY >= b.top && p.renderY <= b.bottom;
        
        console.log(`\n=== VISIBILITY CHECK ===`);
        console.log(`Plant render position: (${p.renderX}, ${p.renderY})`);
        console.log(`Camera bounds: left=${b.left.toFixed(0)} right=${b.right.toFixed(0)} top=${b.top.toFixed(0)} bottom=${b.bottom.toFixed(0)}`);
        console.log(`In bounds: ${inBounds}`);
        console.log(`Marked as visible: ${plantInfo.isPlantVisible}`);
        console.log(`Has texture: ${p.hasTexture}`);
        console.log(`WebGL texture: ${p.webglTexture}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-plant-visibility.png' });
    
    // Wait a bit to see if it renders
    await page.waitForTimeout(2000);
    
    // Check render metrics
    const renderMetrics = await page.evaluate(() => {
        const ge = window.graphicsEngine;
        return {
            renderCalls: ge.renderSystem.renderCallsThisFrame,
            entitiesRendered: ge.renderSystem.entitiesRendered
        };
    });
    
    console.log('\n=== RENDER METRICS ===');
    console.log(`Render calls: ${renderMetrics.renderCalls}`);
    console.log(`Entities rendered: ${renderMetrics.entitiesRendered}`);
    
    // The test should identify the problem
    expect(plantInfo.plantCount).toBeGreaterThan(0);
});
