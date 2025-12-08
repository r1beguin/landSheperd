/**
 * IsometricUtils - Coordinate conversion utilities for isometric rendering
 * Standard isometric: 2:1 ratio, 26.565 degree angle
 */
class IsometricUtils {
    /**
     * Convert grid coordinates to isometric screen coordinates
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {number} tileWidth - Tile width in pixels (e.g., 40)
     * @param {number} tileHeight - Tile height in pixels (e.g., 20)
     * @returns {Object} {x, y} screen coordinates
     */
    static gridToIso(gridX, gridY, tileWidth, tileHeight) {
        const isoX = (gridX - gridY) * (tileWidth / 2);
        const isoY = (gridX + gridY) * (tileHeight / 2);
        return { x: isoX, y: isoY };
    }
    
    /**
     * Convert screen coordinates to grid coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {number} tileWidth - Tile width in pixels
     * @param {number} tileHeight - Tile height in pixels
     * @returns {Object} {x, y} grid coordinates (rounded to nearest integers)
     */
    static isoToGrid(screenX, screenY, tileWidth, tileHeight) {
        const gridX = (screenX / (tileWidth / 2) + screenY / (tileHeight / 2)) / 2;
        const gridY = (screenY / (tileHeight / 2) - screenX / (tileWidth / 2)) / 2;
        // Use Math.round() for center-based selection (more accurate than floor)
        return { x: Math.round(gridX), y: Math.round(gridY) };
    }
    
    /**
     * Get Z-order value for depth sorting
     * Entities with higher Z-order are rendered later (on top)
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {number} Z-order value
     */
    static getZOrder(gridX, gridY) {
        return gridX + gridY;
    }
}

// Log initialization
console.log('IsometricUtils initialized');
