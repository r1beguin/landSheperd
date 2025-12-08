/**
 * Manual Debug Script: Plant Spawning Coordinates
 * 
 * PURPOSE: Track coordinate transformations from click to plant spawn
 * 
 * INSTRUCTIONS:
 * 1. Open http://localhost:8081 in browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script into console
 * 4. Click on a cell to highlight it
 * 5. Right-click and spawn a plant
 * 6. Check console output for coordinate trace
 */

console.log('=== PLANT SPAWNING DEBUG MODE ACTIVATED ===');
console.log('Instructions:');
console.log('1. Click on a cell (note the highlight)');
console.log('2. Right-click on the SAME cell');
console.log('3. Spawn an Oak tree');
console.log('4. Check the debug output below');
console.log('============================================\n');

// Intercept the right-click handler to log coordinates
const originalInputManager = window.graphicsEngine.inputManager;
const originalEmit = originalInputManager.emit.bind(originalInputManager);

let lastClickedGridCoords = null;
let lastHighlightedCell = null;

// Track cell highlights
if (window.graphicsEngine.renderSystem) {
    const originalSetHighlight = window.graphicsEngine.renderSystem.setHighlightedCell.bind(window.graphicsEngine.renderSystem);
    window.graphicsEngine.renderSystem.setHighlightedCell = function(gridX, gridY) {
        lastHighlightedCell = { x: gridX, y: gridY };
        console.log(`🎯 [HIGHLIGHT] Cell (${gridX}, ${gridY}) highlighted`);
        return originalSetHighlight(gridX, gridY);
    };
}

// Intercept mousedown to capture right-click coordinates
originalInputManager.emit = function(eventName, event) {
    if (eventName === 'mousedown' && event.button === 2) {
        console.log('\n🖱️  [RIGHT-CLICK] Processing...');
        console.log(`   Screen coords: (${event.x}, ${event.y})`);
        
        const worldCoords = window.graphicsEngine.cameraManager.screenToWorld(event.x, event.y);
        console.log(`   World coords (camera): (${worldCoords.x.toFixed(2)}, ${worldCoords.y.toFixed(2)})`);
        
        const projection = window.config.world.rendering.projection;
        console.log(`   Projection mode: ${projection}`);
        
        if (projection === 'isometric') {
            const isoConfig = window.config.world.rendering.isometric;
            const gridCoords = IsometricUtils.isoToGrid(
                worldCoords.x, 
                worldCoords.y, 
                isoConfig.tileWidth, 
                isoConfig.tileHeight
            );
            lastClickedGridCoords = { x: gridCoords.x, y: gridCoords.y };
            console.log(`   Grid coords (from iso): (${gridCoords.x}, ${gridCoords.y})`);
            
            // Calculate what will be passed to context menu
            const isoPos = IsometricUtils.gridToIso(gridCoords.x, gridCoords.y, isoConfig.tileWidth, isoConfig.tileHeight);
            console.log(`   Cell center (iso): (${isoPos.x.toFixed(2)}, ${isoPos.y.toFixed(2)})`);
        } else {
            const gridCoords = window.graphicsEngine.soilManager.worldToGrid(worldCoords.x, worldCoords.y);
            lastClickedGridCoords = { x: gridCoords.x, y: gridCoords.y };
            console.log(`   Grid coords (ortho): (${gridCoords.x}, ${gridCoords.y})`);
        }
        
        if (lastHighlightedCell) {
            const match = lastClickedGridCoords.x === lastHighlightedCell.x && 
                         lastClickedGridCoords.y === lastHighlightedCell.y;
            console.log(`   ✓ Click matches highlight: ${match ? 'YES ✅' : 'NO ❌'}`);
            if (!match) {
                console.log(`   ⚠️  MISMATCH: Highlighted (${lastHighlightedCell.x}, ${lastHighlightedCell.y}) but clicked (${lastClickedGridCoords.x}, ${lastClickedGridCoords.y})`);
            }
        }
    }
    
    return originalEmit(eventName, event);
};

// Intercept PlantManager.addPlantAtPosition
const originalAddPlant = window.graphicsEngine.plantManager.addPlantAtPosition.bind(window.graphicsEngine.plantManager);
window.graphicsEngine.plantManager.addPlantAtPosition = function(gridX, gridY, exactWorldX, exactWorldY, speciesId, currentDay) {
    console.log(`\n🌱 [PLANT_MANAGER] addPlantAtPosition called:`);
    console.log(`   Grid coords: (${gridX}, ${gridY})`);
    console.log(`   World coords passed: (${exactWorldX.toFixed(2)}, ${exactWorldY.toFixed(2)})`);
    
    // Calculate what will be passed to Plant constructor
    const cellSize = this.soilManager.cellSize;
    const orthoWorldX = gridX * cellSize + cellSize / 2;
    const orthoWorldY = gridY * cellSize + cellSize / 2;
    console.log(`   Ortho world coords (calculated): (${orthoWorldX.toFixed(2)}, ${orthoWorldY.toFixed(2)})`);
    
    // Show what Plant will calculate
    const plantGridX = Math.floor(orthoWorldX / cellSize);
    const plantGridY = Math.floor(orthoWorldY / cellSize);
    console.log(`   Plant will calculate grid: (${plantGridX}, ${plantGridY})`);
    
    const result = originalAddPlant(gridX, gridY, exactWorldX, exactWorldY, speciesId, currentDay);
    
    if (result) {
        console.log(`   Plant created successfully!`);
        console.log(`   Plant.x: ${result.x.toFixed(2)}, Plant.y: ${result.y.toFixed(2)}`);
        console.log(`   Plant.gridX: ${result.gridX}, Plant.gridY: ${result.gridY}`);
        
        // Check if plant's grid coords match expected
        const gridMatch = result.gridX === gridX && result.gridY === gridY;
        console.log(`   ✓ Plant grid matches target: ${gridMatch ? 'YES ✅' : 'NO ❌'}`);
        
        if (!gridMatch) {
            console.log(`   ⚠️  MISMATCH: Target (${gridX}, ${gridY}) but Plant has (${result.gridX}, ${result.gridY})`);
            console.log(`   ⚠️  Difference: X${result.gridX - gridX > 0 ? '+' : ''}${result.gridX - gridX}, Y${result.gridY - gridY > 0 ? '+' : ''}${result.gridY - gridY}`);
        }
        
        // Check render data
        const renderData = result.getRenderData();
        console.log(`   Render position: (${renderData.x.toFixed(2)}, ${renderData.y.toFixed(2)})`);
        
        // In isometric, convert grid to iso for comparison
        if (window.config.world.rendering.projection === 'isometric') {
            const isoConfig = window.config.world.rendering.isometric;
            const expectedIsoPos = IsometricUtils.gridToIso(gridX, gridY, isoConfig.tileWidth, isoConfig.tileHeight);
            console.log(`   Expected render center: (${expectedIsoPos.x.toFixed(2)}, ${expectedIsoPos.y.toFixed(2)})`);
        }
    } else {
        console.log(`   ❌ Plant creation FAILED!`);
    }
    
    return result;
};

console.log('\n✅ Debug hooks installed!');
console.log('Now: Click on a cell, right-click, and spawn a plant.');
console.log('Watch this console for detailed coordinate trace.\n');
