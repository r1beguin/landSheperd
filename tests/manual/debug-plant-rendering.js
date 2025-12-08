/**
 * Debug script to trace plant rendering coordinates
 * Run in browser console after spawning plants
 */

(function debugPlantRendering() {
    console.log('=== PLANT RENDERING DEBUG ===');
    
    const ge = window.graphicsEngine;
    if (!ge) {
        console.error('GraphicsEngine not found');
        return;
    }
    
    const plants = ge.plantManager?.plants || [];
    console.log(`Total plants: ${plants.length}`);
    
    if (plants.length === 0) {
        console.warn('No plants to debug - spawn some plants first');
        return;
    }
    
    const config = window.config.world.rendering;
    const cellSize = config.cellSize;
    const isIsometric = config.projection === 'isometric';
    
    console.log(`\nProjection: ${config.projection}`);
    console.log(`Cell size: ${cellSize}`);
    
    if (isIsometric) {
        console.log(`Tile dimensions: ${config.isometric.tileWidth} x ${config.isometric.tileHeight}`);
    }
    
    plants.slice(0, 5).forEach((plant, i) => {
        console.log(`\n--- Plant ${i}: ${plant.species.commonName} ---`);
        console.log(`Stored coords (orthographic world):`);
        console.log(`  this.x = ${plant.x.toFixed(2)}`);
        console.log(`  this.y = ${plant.y.toFixed(2)}`);
        console.log(`Grid position:`);
        console.log(`  this.gridX = ${plant.gridX}`);
        console.log(`  this.gridY = ${plant.gridY}`);
        
        // Calculate what cell center should be
        const cellCenterX = plant.gridX * cellSize + cellSize / 2;
        const cellCenterY = plant.gridY * cellSize + cellSize / 2;
        console.log(`Expected cell center (ortho):`);
        console.log(`  centerX = ${cellCenterX}`);
        console.log(`  centerY = ${cellCenterY}`);
        
        // Calculate offset
        const offsetX = plant.x - cellCenterX;
        const offsetY = plant.y - cellCenterY;
        console.log(`Offset from center:`);
        console.log(`  offsetX = ${offsetX.toFixed(2)}`);
        console.log(`  offsetY = ${offsetY.toFixed(2)}`);
        
        // Get render data
        const renderData = plant.getRenderData();
        console.log(`Render position (${config.projection}):`);
        console.log(`  x = ${renderData.x.toFixed(2)}`);
        console.log(`  y = ${renderData.y.toFixed(2)}`);
        console.log(`  width = ${renderData.width}`);
        console.log(`  height = ${renderData.height}`);
        console.log(`  visible = ${renderData.visible}`);
        
        if (isIsometric) {
            // Calculate what it should be
            const IsometricUtils = window.IsometricUtils;
            const isoBase = IsometricUtils.gridToIso(
                plant.gridX, 
                plant.gridY, 
                config.isometric.tileWidth, 
                config.isometric.tileHeight
            );
            console.log(`Expected base isometric position:`);
            console.log(`  isoBase.x = ${isoBase.x.toFixed(2)}`);
            console.log(`  isoBase.y = ${isoBase.y.toFixed(2)}`);
            
            // Calculate isometric offset
            const isoOffsetX = (offsetX - offsetY) * (config.isometric.tileWidth / cellSize) * 0.5;
            const isoOffsetY = (offsetX + offsetY) * (config.isometric.tileHeight / cellSize) * 0.5;
            console.log(`Calculated isometric offset:`);
            console.log(`  isoOffsetX = ${isoOffsetX.toFixed(2)}`);
            console.log(`  isoOffsetY = ${isoOffsetY.toFixed(2)}`);
            console.log(`Final position should be:`);
            console.log(`  x = ${(isoBase.x + isoOffsetX).toFixed(2)}`);
            console.log(`  y = ${(isoBase.y + isoOffsetY).toFixed(2)}`);
        }
        
        // Check if position is on screen
        const camera = ge.cameraManager;
        const screenBounds = camera.getViewBounds();
        const onScreen = renderData.x >= screenBounds.left && 
                        renderData.x <= screenBounds.right &&
                        renderData.y >= screenBounds.top &&
                        renderData.y <= screenBounds.bottom;
        console.log(`On screen: ${onScreen}`);
        if (!onScreen) {
            console.log(`  (Screen bounds: ${screenBounds.left.toFixed(0)} to ${screenBounds.right.toFixed(0)}, ${screenBounds.top.toFixed(0)} to ${screenBounds.bottom.toFixed(0)})`);
        }
    });
    
    console.log('\n=== END DEBUG ===');
})();
