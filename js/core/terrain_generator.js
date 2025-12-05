/**
 * TerrainGenerator - Handles terrain feature generation (rivers, lakes, fertility zones)
 * 
 * Extracted from SoilManager to separate terrain generation concerns.
 * This module generates water bodies and applies environmental effects to soil.
 * 
 * Main features:
 * - Procedural river generation with meandering
 * - Irregular lake generation with noise perturbation
 * - Fertility boosts around water bodies
 * - Deterministic generation based on seed
 */

class TerrainGenerator {
    constructor(config, proceduralGenerator) {
        this.config = config;
        this.proceduralGenerator = proceduralGenerator;
        
        // Track generated water tiles
        this.waterTiles = new Set(); // Set of "x,y" keys for water tiles
    }
    
    /**
     * Generate all terrain features and apply to soil grid
     * @param {SoilManager} soilManager - Soil manager to apply terrain to
     */
    generateTerrain(soilManager) {
        this.generateRivers(soilManager);
        this.generateLakes(soilManager);
        this.applyFertilityBoostsAroundWater(soilManager);
    }
    
    /**
     * Generate rivers using procedural generator
     * @param {SoilManager} soilManager - Soil manager to apply rivers to
     */
    generateRivers(soilManager) {
        const waterConfig = this.config.world?.terrain?.water;
        
        if (!waterConfig || !waterConfig.rivers || !waterConfig.rivers.enabled) {
            console.log('River generation disabled');
            return;
        }
        
        const riverConfig = waterConfig.rivers;
        const startTime = performance.now();
        
        // Generate rivers
        const rivers = this.proceduralGenerator.generateRivers(
            soilManager.gridWidth,
            soilManager.gridHeight,
            riverConfig
        );
        
        let totalWaterCells = 0;
        
        // Apply rivers to soil grid
        rivers.forEach(riverCells => {
            riverCells.forEach(cell => {
                // Convert from map coordinates (0 to gridWidth) to grid coordinates (-gridWidth/2 to +gridWidth/2)
                const gridX = cell.x - soilManager.gridWidth / 2;
                const gridY = cell.y - soilManager.gridHeight / 2;
                
                // Check if within grid bounds
                const minX = -soilManager.gridWidth / 2;
                const maxX = soilManager.gridWidth / 2 - 1;
                const minY = -soilManager.gridHeight / 2;
                const maxY = soilManager.gridHeight / 2 - 1;
                
                if (gridX >= minX && gridX <= maxX && gridY >= minY && gridY <= maxY) {
                    this.setWaterTile(soilManager, gridX, gridY, cell.depth);
                    totalWaterCells++;
                }
            });
        });
        
        const endTime = performance.now();
        const generationTime = (endTime - startTime).toFixed(0);
        
        console.log(`Rivers generated: ${rivers.length} rivers, ${totalWaterCells} total cells (${generationTime}ms)`);
    }
    
    /**
     * Generate lakes using procedural generator
     * @param {SoilManager} soilManager - Soil manager to apply lakes to
     */
    generateLakes(soilManager) {
        const waterConfig = this.config.world?.terrain?.water;
        
        if (!waterConfig || !waterConfig.lakes || !waterConfig.lakes.enabled) {
            console.log('Lake generation disabled');
            return;
        }
        
        const lakeConfig = waterConfig.lakes;
        const startTime = performance.now();
        
        // Generate lakes
        const lakes = this.proceduralGenerator.generateLakes(
            soilManager.gridWidth,
            soilManager.gridHeight,
            lakeConfig
        );
        
        let totalLakeCells = 0;
        
        // Grid bounds
        const minX = -soilManager.gridWidth / 2;
        const maxX = soilManager.gridWidth / 2 - 1;
        const minY = -soilManager.gridHeight / 2;
        const maxY = soilManager.gridHeight / 2 - 1;
        
        // Apply lakes to soil grid
        lakes.forEach(lakeCells => {
            lakeCells.forEach(cell => {
                // Convert from map coordinates (0 to gridWidth) to grid coordinates (-gridWidth/2 to +gridWidth/2)
                const gridX = cell.x - soilManager.gridWidth / 2;
                const gridY = cell.y - soilManager.gridHeight / 2;
                
                // Check if within grid bounds
                if (gridX >= minX && gridX <= maxX && gridY >= minY && gridY <= maxY) {
                    this.setWaterTile(soilManager, gridX, gridY, cell.depth);
                    totalLakeCells++;
                }
            });
        });
        
        const endTime = performance.now();
        const generationTime = (endTime - startTime).toFixed(0);
        
        console.log(`Lakes generated: ${lakes.length} lakes, ${totalLakeCells} total cells (${generationTime}ms)`);
    }
    
    /**
     * Apply fertility boosts to soil cells around water bodies
     * Creates gradients of increased fertility near rivers and lakes
     * @param {SoilManager} soilManager - Soil manager to apply boosts to
     */
    applyFertilityBoostsAroundWater(soilManager) {
        const waterConfig = this.config.world?.terrain?.water;
        const boostConfig = waterConfig?.fertilityBoost;
        
        if (!boostConfig || !boostConfig.enabled) {
            console.log('Fertility boost around water disabled');
            return;
        }
        
        // Skip if no water tiles
        if (this.waterTiles.size === 0) {
            console.log('No water tiles found - skipping fertility boost');
            return;
        }
        
        const startTime = performance.now();
        const radius = boostConfig.radius || 3;
        const nitrogenBonus = boostConfig.nitrogenBonus || 20;
        const waterRetentionBonus = boostConfig.waterRetentionBonus || 30;
        
        // Track cells affected (use Set to avoid duplicate processing)
        const affectedCells = new Set();
        
        // For each water tile, boost surrounding cells
        this.waterTiles.forEach(waterKey => {
            const [waterX, waterY] = waterKey.split(',').map(Number);
            
            // Check cells in radius around this water tile
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Skip the water tile itself
                    if (dx === 0 && dy === 0) continue;
                    
                    const targetX = waterX + dx;
                    const targetY = waterY + dy;
                    const targetKey = `${targetX},${targetY}`;
                    
                    // Skip if already processed
                    if (affectedCells.has(targetKey)) continue;
                    
                    const soil = soilManager.getSoilAt(targetX, targetY);
                    
                    // Skip if no soil, is water, or not plantable
                    if (!soil || soil.isWater || !soil.isPlantable) continue;
                    
                    // Calculate distance from water
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Skip if outside radius (for circular falloff)
                    if (distance > radius) continue;
                    
                    // Calculate linear falloff: 1.0 at water edge, 0.0 at radius
                    const falloff = 1.0 - (distance / radius);
                    
                    // Apply bonuses with falloff
                    const nitrogenIncrease = nitrogenBonus * falloff;
                    const waterIncrease = waterRetentionBonus * falloff;
                    
                    // Update soil properties (clamped 0-100)
                    soil.nitrogen = Math.min(100, soil.nitrogen + nitrogenIncrease);
                    soil.waterRetention = Math.min(100, soil.waterRetention + waterIncrease);
                    
                    // Recalculate derived properties
                    soil.fertility = soil.calculateFertility();
                    soil.baseColor = soil.calculateBaseColor();
                    soil.waterPixels = soil.generateWaterPixels();
                    soil.needsUpdate = true;
                    
                    // Mark as affected
                    affectedCells.add(targetKey);
                }
            }
        });
        
        const endTime = performance.now();
        const boostTime = (endTime - startTime).toFixed(0);
        
        console.log(`Fertility boost applied to ${affectedCells.size} cells near ${this.waterTiles.size} water tiles (${boostTime}ms)`);
        
        // Force texture refresh
        soilManager.needsRefresh = true;
    }
    
    /**
     * Set a tile as water with specified depth
     * @param {SoilManager} soilManager - Soil manager
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {number} depth - Water depth (0-100)
     * @private
     */
    setWaterTile(soilManager, gridX, gridY, depth) {
        const soil = soilManager.getSoilAt(gridX, gridY);
        if (!soil) {
            console.warn(`Cannot set water tile at (${gridX}, ${gridY}) - soil not found`);
            return;
        }
        
        // Mark as water
        soil.isWater = true;
        soil.waterDepth = Math.max(0, Math.min(100, depth));
        soil.isPlantable = false; // Water tiles are never plantable
        
        // Update visual appearance
        soil.baseColor = soil.calculateBaseColor();
        soil.needsUpdate = true;
        
        // Track in water tiles set
        const key = soilManager.getCellKey(gridX, gridY);
        this.waterTiles.add(key);
        
        // Remove any existing plants on this cell
        const plantManager = window.graphicsEngine?.plantManager;
        if (plantManager) {
            plantManager.removePlant(gridX, gridY);
        }
        
        soilManager.needsRefresh = true;
    }
    
    /**
     * Get water tiles set (for external access)
     * @returns {Set<string>} Set of water tile keys
     */
    getWaterTiles() {
        return this.waterTiles;
    }
    
    /**
     * Check if a tile is water
     * @param {SoilManager} soilManager - Soil manager
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {boolean} True if tile is water
     */
    isWaterAt(soilManager, gridX, gridY) {
        const soil = soilManager.getSoilAt(gridX, gridY);
        return soil ? soil.isWater : false;
    }
    
    /**
     * Get water depth at a tile
     * @param {SoilManager} soilManager - Soil manager
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {number} Water depth (0-100), or 0 if not water
     */
    getWaterDepthAt(soilManager, gridX, gridY) {
        const soil = soilManager.getSoilAt(gridX, gridY);
        return soil ? soil.waterDepth : 0;
    }
}
