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
        this.riverTiles = new Set(); // Set of "x,y" keys for river tiles
        this.lakeTiles = new Set();  // Set of "x,y" keys for lake tiles
        this.riparianGrid = new Map(); // Cache for riparian zone lookups (P1 optimization)
        this.waterSeepingInfluenceMap = new Map(); // P2: Cache for water seeping influence
    }
    
    /**
     * Generate all terrain features and apply to soil grid
     * @param {SoilManager} soilManager - Soil manager to apply terrain to
     */
    generateTerrain(soilManager) {
        this.generateRivers(soilManager);
        this.generateLakes(soilManager);
        this.applyFertilityBoostsAroundWater(soilManager);
        
        // P1: Generate riparian grid for fast lookups
        const waterConfig = this.config.world?.terrain?.water;
        const riparianRadius = waterConfig?.riparianZone?.radius || 2;
        this.riparianGrid = this.generateRiparianGrid(this.waterTiles, riparianRadius, soilManager.gridWidth, soilManager.gridHeight);
        
        // P2: Generate water seeping influence map for fast daily updates
        const seepingRadius = waterConfig?.waterTable?.radius || 4;
        const seepingRate = waterConfig?.waterTable?.seepingRatePerDay || 0.5;
        this.waterSeepingInfluenceMap = this.generateWaterSeepingInfluenceMap(
            this.waterTiles,
            seepingRadius,
            seepingRate,
            soilManager.gridWidth,
            soilManager.gridHeight
        );
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
                    this.setWaterTile(soilManager, gridX, gridY, cell.depth, 'river');
                    totalWaterCells++;
                }
            });
        });
        
        const endTime = performance.now();
        const generationTime = (endTime - startTime).toFixed(0);
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
                    this.setWaterTile(soilManager, gridX, gridY, cell.depth, 'lake');
                    totalLakeCells++;
                }
            });
        });
        
        const endTime = performance.now();
        const generationTime = (endTime - startTime).toFixed(0);
    }
    
    /**
     * Apply fertility boosts to soil cells around water bodies
     * Creates gradients of increased fertility near rivers and lakes
     * Rivers provide higher fertility (sediment transport, flooding)
     * Lakes provide moderate moisture and stable fertility
     * @param {SoilManager} soilManager - Soil manager to apply boosts to
     */
    applyFertilityBoostsAroundWater(soilManager) {
        const waterConfig = this.config.world?.terrain?.water;
        
        // Apply river fertility boost
        this.applyRiverFertility(soilManager, waterConfig);
        
        // Apply lake fertility boost
        this.applyLakeFertility(soilManager, waterConfig);
    }
    
    /**
     * Apply fertility boost around rivers
     * @param {SoilManager} soilManager - Soil manager to apply boosts to
     * @param {Object} waterConfig - Water configuration
     * @private
     */
    applyRiverFertility(soilManager, waterConfig) {
        const riverConfig = waterConfig?.riverFertility;
        
        if (!riverConfig || !riverConfig.enabled) {
            console.log('River fertility boost disabled');
            return;
        }
        
        // Skip if no river tiles
        if (this.riverTiles.size === 0) {
            console.log('No river tiles found - skipping river fertility boost');
            return;
        }
        
        const startTime = performance.now();
        const radius = riverConfig.radius || 3;
        const nitrogenBonus = riverConfig.nitrogenBonus || 25;
        const waterRetentionBonus = riverConfig.waterRetentionBonus || 30;
        const organicMatterBonus = riverConfig.organicMatterBonus || 5;
        
        // Track cells affected (use Set to avoid duplicate processing)
        const affectedCells = new Set();
        
        // For each river tile, boost surrounding cells
        this.riverTiles.forEach(waterKey => {
            const [waterX, waterY] = waterKey.split(',').map(Number);
            
            // Check cells in radius around this river tile
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
                    const omIncrease = organicMatterBonus * falloff;
                    
                    // Update soil properties (clamped 0-100)
                    soil.nitrogen = Math.min(100, soil.nitrogen + nitrogenIncrease);
                    soil.waterRetention = Math.min(100, soil.waterRetention + waterIncrease);
                    soil.organicMatter = Math.min(100, soil.organicMatter + omIncrease);
                    
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
        
        // Force texture refresh
        soilManager.needsRefresh = true;
    }
    
    /**
     * Apply fertility boost around lakes
     * @param {SoilManager} soilManager - Soil manager to apply boosts to
     * @param {Object} waterConfig - Water configuration
     * @private
     */
    applyLakeFertility(soilManager, waterConfig) {
        const lakeConfig = waterConfig?.lakeFertility;
        
        if (!lakeConfig || !lakeConfig.enabled) {
            console.log('Lake fertility boost disabled');
            return;
        }
        
        // Skip if no lake tiles
        if (this.lakeTiles.size === 0) {
            console.log('No lake tiles found - skipping lake fertility boost');
            return;
        }
        
        const startTime = performance.now();
        const radius = lakeConfig.radius || 2;
        const nitrogenBonus = lakeConfig.nitrogenBonus || 15;
        const waterRetentionBonus = lakeConfig.waterRetentionBonus || 25;
        const organicMatterBonus = lakeConfig.organicMatterBonus || 3;
        
        // Track cells affected (use Set to avoid duplicate processing)
        const affectedCells = new Set();
        
        // For each lake tile, boost surrounding cells
        this.lakeTiles.forEach(waterKey => {
            const [waterX, waterY] = waterKey.split(',').map(Number);
            
            // Check cells in radius around this lake tile
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
                    const omIncrease = organicMatterBonus * falloff;
                    
                    // Update soil properties (clamped 0-100)
                    soil.nitrogen = Math.min(100, soil.nitrogen + nitrogenIncrease);
                    soil.waterRetention = Math.min(100, soil.waterRetention + waterIncrease);
                    soil.organicMatter = Math.min(100, soil.organicMatter + omIncrease);
                    
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
        
        // Force texture refresh
        soilManager.needsRefresh = true;
    }
    
    /**
     * Pre-compute riparian zone spatial grid for fast O(1) lookups.
     * Stores distance to nearest water tile for cells within riparian radius.
     * P1 OPTIMIZATION: Replaces O(N×M) distance calculations with O(1) Map lookups
     * @param {Set<string>} waterTiles - All water tiles (rivers + lakes)
     * @param {number} riparianRadius - Maximum distance for riparian effects (default: 2)
     * @param {number} gridWidth - Grid width for bounds checking
     * @param {number} gridHeight - Grid height for bounds checking
     * @returns {Map<string, {distance: number, waterType: string}>} Riparian grid with distances
     */
    generateRiparianGrid(waterTiles, riparianRadius = 2, gridWidth, gridHeight) {
        const startTime = performance.now();
        const riparianGrid = new Map();
        
        if (!waterTiles || waterTiles.size === 0) {
            console.log('No water tiles - skipping riparian grid generation');
            return riparianGrid;
        }
        
        // Calculate grid bounds
        const minX = -gridWidth / 2;
        const maxX = gridWidth / 2 - 1;
        const minY = -gridHeight / 2;
        const maxY = gridHeight / 2 - 1;
        
        // For each water tile, mark nearby cells as riparian
        waterTiles.forEach((waterKey) => {
            const [waterX, waterY] = waterKey.split(',').map(Number);
            
            // Determine water type from sets
            const waterType = this.riverTiles.has(waterKey) ? 'river' : 
                             this.lakeTiles.has(waterKey) ? 'lake' : 'unknown';
            
            // Check cells in radius around water tile
            for (let dx = -riparianRadius; dx <= riparianRadius; dx++) {
                for (let dy = -riparianRadius; dy <= riparianRadius; dy++) {
                    const cellX = waterX + dx;
                    const cellY = waterY + dy;
                    
                    // Skip if out of bounds
                    if (cellX < minX || cellX > maxX || cellY < minY || cellY > maxY) {
                        continue;
                    }
                    
                    // Calculate distance
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Only include cells within radius
                    if (distance <= riparianRadius) {
                        const cellKey = `${cellX},${cellY}`;
                        
                        // Store closest water tile if multiple water tiles affect this cell
                        const existing = riparianGrid.get(cellKey);
                        if (!existing || distance < existing.distance) {
                            riparianGrid.set(cellKey, {
                                distance: distance,
                                waterType: waterType,
                                nearestWaterX: waterX,
                                nearestWaterY: waterY
                            });
                        }
                    }
                }
            }
        });
        
        const duration = performance.now() - startTime;
        
        return riparianGrid;
    }
    
    /**
     * Pre-compute water table seeping influence map for fast daily updates.
     * Stores seeping rate and water type for each cell affected by water table.
     * P2 OPTIMIZATION: Replaces O(N×M) nested loops with O(1) Map lookups
     * @param {Set<string>} waterTiles - All water tiles (rivers + lakes)
     * @param {number} radius - Water table seeping radius (default: 4)
     * @param {number} seepingRatePerDay - Base seeping rate (default: 0.5)
     * @param {number} gridWidth - Grid width for bounds checking
     * @param {number} gridHeight - Grid height for bounds checking
     * @returns {Map<string, {seepingRate: number, waterType: string, distance: number}>} Influence map
     */
    generateWaterSeepingInfluenceMap(waterTiles, radius = 4, seepingRatePerDay = 0.5, gridWidth, gridHeight) {
        const startTime = performance.now();
        const influenceMap = new Map();
        
        if (!waterTiles || waterTiles.size === 0) {
            console.log('No water tiles - skipping water seeping influence map');
            return influenceMap;
        }
        
        // Calculate grid bounds
        const minX = -gridWidth / 2;
        const maxX = gridWidth / 2 - 1;
        const minY = -gridHeight / 2;
        const maxY = gridHeight / 2 - 1;
        
        // For each water tile, calculate seeping influence on nearby cells
        waterTiles.forEach((waterKey) => {
            const [waterX, waterY] = waterKey.split(',').map(Number);
            
            // Determine water type from sets
            const waterType = this.riverTiles.has(waterKey) ? 'river' : 
                             this.lakeTiles.has(waterKey) ? 'lake' : 'unknown';
            
            // Check cells in radius around water tile
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const cellX = waterX + dx;
                    const cellY = waterY + dy;
                    
                    // Skip if out of bounds
                    if (cellX < minX || cellX > maxX || cellY < minY || cellY > maxY) {
                        continue;
                    }
                    
                    // Calculate distance
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Only include cells within radius
                    if (distance <= radius) {
                        const cellKey = `${cellX},${cellY}`;
                        
                        // Calculate seeping rate with linear falloff
                        const falloff = 1.0 - (distance / radius);
                        const cellSeepingRate = seepingRatePerDay * falloff;
                        
                        // If multiple water tiles affect this cell, use the MAXIMUM seeping rate
                        // (closest water tile has strongest influence)
                        const existing = influenceMap.get(cellKey);
                        if (!existing || cellSeepingRate > existing.seepingRate) {
                            influenceMap.set(cellKey, {
                                seepingRate: cellSeepingRate,
                                waterType: waterType,
                                distance: distance,
                                nearestWaterX: waterX,
                                nearestWaterY: waterY
                            });
                        }
                    }
                }
            }
        });
        
        const duration = performance.now() - startTime;
        
        return influenceMap;
    }
    
    /**
     * Set a tile as water with specified depth
     * @param {SoilManager} soilManager - Soil manager
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {number} depth - Water depth (0-100)
     * @param {string} waterType - Type of water ('river' or 'lake')
     * @private
     */
    setWaterTile(soilManager, gridX, gridY, depth, waterType) {
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
        
        // Track in type-specific set
        if (waterType === 'river') {
            this.riverTiles.add(key);
        } else if (waterType === 'lake') {
            this.lakeTiles.add(key);
        }
        
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
     * Get river tiles set
     * @returns {Set<string>} Set of river tile keys
     */
    getRiverTiles() {
        return this.riverTiles;
    }
    
    /**
     * Get lake tiles set
     * @returns {Set<string>} Set of lake tile keys
     */
    getLakeTiles() {
        return this.lakeTiles;
    }
    
    /**
     * Get water type at a specific location
     * @param {number} x - Grid X coordinate
     * @param {number} y - Grid Y coordinate
     * @returns {string|null} 'river', 'lake', or null if not water
     */
    getWaterType(x, y) {
        const key = `${x},${y}`;
        
        if (this.riverTiles.has(key)) {
            return 'river';
        }
        
        if (this.lakeTiles.has(key)) {
            return 'lake';
        }
        
        return null;
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
