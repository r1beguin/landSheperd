// Handles zooming with the mouse scroll wheel
export function setupZoomControls(canvas, onZoom) {
    let zoom = 1;
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        if (e.deltaY < 0) {
            zoom *= 1 + zoomIntensity;
        } else {
            zoom /= 1 + zoomIntensity;
        }
        zoom = Math.max(0.2, Math.min(zoom, 5)); // Clamp zoom
        onZoom(zoom);
    }, { passive: false });
}

// Handles right-click to plant a tree
import { Tree } from '../entities/tree.js';
import { PLANT_TYPES } from '../entities/plants.js';

export function setupPlantTreeControl(canvas, grid, drawStaticBackground, renderGame, pixelSize, zoom) {
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / zoom.value;
        const mouseY = (e.clientY - rect.top) / zoom.value;
        const cellX = Math.floor(mouseX / pixelSize);
        const cellY = Math.floor(mouseY / pixelSize);
        if (grid[cellY] && grid[cellY][cellX] && grid[cellY][cellX].type === 'soil') {
            grid[cellY][cellX] = new Tree('oak', PLANT_TYPES.oak, cellX, cellY, 9);
            drawStaticBackground();
            renderGame();
        }
    });
}

// Handles left-click to move a character
export function setupCharacterMoveControl(canvas, character, pixelSize, zoom) {
    canvas.addEventListener('click', (e) => {
        // Only respond to left-click
        if (e.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / zoom.value;
        const mouseY = (e.clientY - rect.top) / zoom.value;
        const cellX = Math.floor(mouseX / pixelSize);
        const cellY = Math.floor(mouseY / pixelSize);
        character.setTarget(cellX, cellY);
    });
}
