/**
 * SoilManager - Centralized soil system manager
 * 
 * This module manages the global soil grid, optimizes cell rendering,
 * and interacts with the soil system. It provides an efficient interface
 * for accessing soil properties and managing updates.
 * 
 * Main features:
 * - Management of 20x20 soil cell grid
 * - Rendering optimization by culling (only visible cells)
 * - Rendering data cache for performance
 * - Interface for interaction with other systems (plants, animals)
 */

class SoilManager {
    constructor(gl, geometryManager, textureGenerator, config) {
        this.gl = gl;
        this.geometryManager = geometryManager;
        this.textureGenerator = textureGenerator;
        this.config = config;
        
        // Get seed from config or generate random
        const configSeed = this.config.world?.terrain?.seed;
        this.seed = configSeed !== undefined && configSeed !== null ? configSeed : this.generateRandomSeed();
        
        console.log(`Seed initialized: ${this.seed}`);
        
        // Soil grid (Map for efficient access)
        this.soilGrid = new Map();
        
        // Water tiles tracking (Milestone 2)
        this.waterTiles = new Set(); // Set of "x,y" keys for water tiles
        
        // Grid configuration from config.json
        this.cellSize = this.config.world.map.cellSize;
        this.gridWidth = this.config.world.map.gridWidth;
        this.gridHeight = this.config.world.map.gridHeight;
        
        // Procedural generator with seed
        this.proceduralGenerator = new ProceduralGenerator(this.config.world.soil, this.seed);
        
        // Rendering cache for optimization
        this.visibleCells = [];
        this.needsRefresh = true;
        
        // Counters for debugging
        this.totalCells = 0;
        this.visibleCellsCount = 0;
        
        // Initialize specialized managers
        this.terrainGenerator = new TerrainGenerator(this.config, this.proceduralGenerator);
        this.soilEffectsManager = new SoilEffectsManager(this.config.world);
        
        this.initializeSoilGrid();
        this.createSoilGeometry();
    }
    
    /**
     * Generate random seed based on timestamp
     * @returns {number} Random seed (uint32)
     */
    generateRandomSeed() {
        return Date.now() % 4294967296;
    }
    
    /**
     * Get current seed
     * @returns {number} Current seed
     */
    getSeed() {
        return this.seed;
    }
    
    // Initialize soil grid with procedural generation
    initializeSoilGrid() {
        const startTime = performance.now();
        
        // Generate property maps with procedural generator
        const fertilityMap = this.proceduralGenerator.generateCoherentMap(this.gridWidth, this.gridHeight, 'fertility');
        const waterRetentionMap = this.proceduralGenerator.generateCoherentMap(this.gridWidth, this.gridHeight, 'water');
        const pollutionMap = this.proceduralGenerator.generateCoherentMap(this.gridWidth, this.gridHeight, 'pollution');
        
        // Create cells with map values - CREATE ALL SOIL CELLS
        for (let x = -this.gridWidth/2; x < this.gridWidth/2; x++) {
            for (let y = -this.gridHeight/2; y < this.gridHeight/2; y++) {
                // Convert world coordinates to map indices
                const mapX = x + this.gridWidth/2;
                const mapY = y + this.gridHeight/2;
                
                const fertilityConfig = this.config.world.soil.fertility.nutrientVariation;
                
                const soil = new Soil(x, y, {
                    nitrogen: fertilityMap[mapY][mapX] + this.randomVariation(fertilityConfig.nitrogen),
                    phosphorus: fertilityMap[mapY][mapX] + this.randomVariation(fertilityConfig.nitrogen),
                    potassium: fertilityMap[mapY][mapX] + this.randomVariation(fertilityConfig.potassium),
                    organicMatter: fertilityMap[mapY][mapX] + this.randomVariation(fertilityConfig.organicMatter),
                    waterRetention: waterRetentionMap[mapY][mapX],
                    pollution: pollutionMap[mapY][mapX],
                    isPlantable: this.shouldHaveSoil(x, y) // Add plantable flag instead of restricting creation
                });
                
                this.setSoilAt(x, y, soil);
                this.totalCells++;
            }
        }
        
        const endTime = performance.now();
        
        // Generate terrain features using TerrainGenerator
        this.terrainGenerator.generateTerrain(this);
        
        // Get water tiles from terrain generator
        this.waterTiles = this.terrainGenerator.getWaterTiles();
    }

    // Check if this location should allow plant placement (more restrictive than soil existence)
    shouldHaveSoil(gridX, gridY) {
        // Define a much larger plantable area - let's try 80% of grid size
        const plantableRadius = Math.min(this.gridWidth, this.gridHeight) * 0.45; // 45% radius = 90% diameter
        const centerX = 0;
        const centerY = 0;
        
        // Use circular plantable area for more natural boundaries
        const distance = Math.sqrt(
            Math.pow(gridX - centerX, 2) + 
            Math.pow(gridY - centerY, 2)
        );
        
        return distance <= plantableRadius;
    }

    // Generate a 2D map with spatial coherence (zones and gradients)
    generateCoherentMap(width, height, type) {
        const map = [];
        
        // Initialize the map
        for (let y = 0; y < height; y++) {
            map[y] = [];
            for (let x = 0; x < width; x++) {
                map[y][x] = 0;
            }
        }
        
        // Parameters according to the property type
        let config;
        switch (type) {
            case 'fertility':
                config = {
                    hotspots: 8,        // Number of fertile zones
                    baseValue: 30,      // Base value
                    maxIntensity: 85,   // Maximum intensity of hotspots
                    falloffRate: 0.15   // Gradient speed
                };
                break;
            case 'water':
                config = {
                    hotspots: 5,        // Water zones (rivers, swamps)
                    baseValue: 20,
                    maxIntensity: 90,
                    falloffRate: 0.12
                };
                break;
            case 'pollution':
                config = {
                    hotspots: 3,        // Few polluted zones
                    baseValue: 5,
                    maxIntensity: 80,
                    falloffRate: 0.08   // Pollution spreads more slowly
                };
                break;
        }
        
        // Generate hotspots
        const hotspots = [];
        for (let i = 0; i < config.hotspots; i++) {
            hotspots.push({
                x: Math.random() * width,
                y: Math.random() * height,
                intensity: config.baseValue + Math.random() * (config.maxIntensity - config.baseValue),
                radius: 8 + Math.random() * 12 // Variable radius between 8 and 20
            });
        }
        
        // Apply hotspot influence with gradient
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let totalInfluence = config.baseValue;
                
                // Calculate the influence of each hotspot
                hotspots.forEach(hotspot => {
                    const distance = Math.sqrt(
                        Math.pow(x - hotspot.x, 2) + Math.pow(y - hotspot.y, 2)
                    );
                    
                    if (distance < hotspot.radius) {
                        // Exponential gradient function
                        const influence = hotspot.intensity * Math.exp(-distance * config.falloffRate);
                        totalInfluence += influence;
                    }
                });
                
                // Add noise for local variation
                const noise = (Math.random() - 0.5) * 10;
                totalInfluence += noise;
                
                // Clamp between 0 and 100
                map[y][x] = Math.max(0, Math.min(100, totalInfluence));
            }
        }
        
        // Post-processing: smoothing for smoother transitions
        return this.smoothMap(map, width, height);
    }
    
    // Smooth the map for more natural transitions
    smoothMap(map, width, height) {
        const smoothed = [];
        
        for (let y = 0; y < height; y++) {
            smoothed[y] = [];
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                
                // Average with neighbors (3x3 filter)
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            sum += map[ny][nx];
                            count++;
                        }
                    }
                }
                
                smoothed[y][x] = sum / count;
            }
        }
        
        return smoothed;
    }
    
    // Add controlled random variation
    randomVariation(range) {
        return (Math.random() - 0.5) * range;
    }
    
    // Create reusable geometry for soil cells
    createSoilGeometry() {
        // Create base geometry for 20x20 cells
        this.geometryManager.createQuad(this.cellSize, this.cellSize, false);
        
        // Create smaller geometry for individual pixels (1x1)
        this.geometryManager.createQuad(1, 1, false);
    }
    
    // Convert coordinates to cell key
    getCellKey(gridX, gridY) {
        return `${gridX},${gridY}`;
    }
    
    // Get grid coordinates from world position
    worldToGrid(worldX, worldY) {
        // FIXED: Account for centered grid system
        // The grid ranges from -gridWidth/2 to +gridWidth/2 in grid coordinates
        // but the world coordinates are aligned with grid boundaries
        const gridX = Math.floor(worldX / this.cellSize);
        const gridY = Math.floor(worldY / this.cellSize);
        
        return {
            x: gridX,
            y: gridY
        };
    }
    
    // Get soil cell at grid position
    getSoilAt(gridX, gridY) {
        const key = this.getCellKey(gridX, gridY);
        return this.soilGrid.get(key);
    }
    
    // Set soil cell at grid position
    setSoilAt(gridX, gridY, soil) {
        const key = this.getCellKey(gridX, gridY);
        this.soilGrid.set(key, soil);
        this.needsRefresh = true;
    }
    
    // Get soil cell at world position
    getSoilAtWorld(worldX, worldY) {
        const grid = this.worldToGrid(worldX, worldY);
        const soil = this.getSoilAt(grid.x, grid.y);
        
        // Debug: Log failed lookups with grid bounds information
        if (!soil) {
            const minGridX = -this.gridWidth / 2;
            const maxGridX = this.gridWidth / 2 - 1;
            const minGridY = -this.gridHeight / 2;
            const maxGridY = this.gridHeight / 2 - 1;
            console.warn(`[DEBUG] Lookup failed at world (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) → grid (${grid.x}, ${grid.y}). Valid grid range: X[${minGridX} to ${maxGridX}], Y[${minGridY} to ${maxGridY}]`);
        }
        
        return soil;
    }

    // Check if a soil cell is currently being rendered (visible)
    isSoilCurrentlyVisible(gridX, gridY) {
        // Check if this soil cell is in the current visible cells array
        return this.visibleCells.some(soil => 
            soil.gridX === gridX && soil.gridY === gridY
        );
    }
    
    // Calculate visible cells based on the camera
    updateVisibleCells(cameraManager) {
        const bounds = cameraManager.getVisibleBounds();
        
        // Add margin to avoid pop-ins
        const margin = this.cellSize * 2;
        const startX = Math.floor((bounds.left - margin) / this.cellSize);
        const endX = Math.ceil((bounds.right + margin) / this.cellSize);
        const startY = Math.floor((bounds.top - margin) / this.cellSize);
        const endY = Math.ceil((bounds.bottom + margin) / this.cellSize);
        
        this.visibleCells = [];
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const soil = this.getSoilAt(x, y);
                if (soil) {
                    this.visibleCells.push(soil);
                }
            }
        }
        
        this.visibleCellsCount = this.visibleCells.length;
        this.needsRefresh = false;
    }
    
    // Optimized rendering of visible cells
    renderSoil(renderSystem, viewMatrix, cameraManager, lightingManager) {
        // Update visible cells if necessary
        if (this.needsRefresh) {
            this.updateVisibleCells(cameraManager);
        }
        
        // Level of detail system based on zoom
        const zoom = viewMatrix.zoom;
        let renderDetailLevel;
        
        if (zoom < 0.5) {
            renderDetailLevel = 0; // Very few details
        } else if (zoom < 1.0) {
            renderDetailLevel = 1; // Medium details
        } else {
            renderDetailLevel = 2; // All details
        }
        
        // Render cells with appropriate level of detail
        this.visibleCells.forEach(soil => {
            this.renderSoilCellWithLOD(soil, renderSystem, viewMatrix, lightingManager, renderDetailLevel);
        });
    }
    
    // Render a cell with levels of detail
    renderSoilCellWithLOD(soil, renderSystem, viewMatrix, lightingManager, detailLevel) {
        const data = soil.getRenderData();
        
        // Check if overlay is active via OverlayManager
        const overlayManager = window.graphicsEngine && window.graphicsEngine.overlayManager;
        const overlayColor = overlayManager ? overlayManager.getOverlayColor(soil) : null;
        
        if (overlayColor) {
            // Render overlay mode with color gradient
            renderSystem.renderRect(
                data.position.x,
                data.position.y,
                data.size,
                data.size,
                overlayColor,
                viewMatrix,
                lightingManager
            );
        } else if (soil.isWater) {
            // WATER TILES: Render with animated water shader
            const timeManager = window.graphicsEngine?.timeManager;
            const time = timeManager ? timeManager.getCurrentDayPrecise() : 0;
            
            renderSystem.renderWaterRect(
                data.position.x,
                data.position.y,
                data.size,
                data.size,
                soil.baseColor,  // Blue color from calculateBaseColor()
                viewMatrix,
                lightingManager,
                time  // Animation time
            );
        } else {
            // Normal soil rendering with procedural texture
            const texture = this.textureGenerator.getTextureForSoil(soil);
            
            renderSystem.renderTexturedRect(
                data.position.x, 
                data.position.y, 
                data.size, 
                data.size, 
                texture,
                viewMatrix,
                lightingManager
            );
        }
    }
    
    // System update
    update(deltaTime) {
        // Update all cells (for now, just mark as non-dirty)
        this.soilGrid.forEach(soil => {
            soil.update(deltaTime);
        });
        
        // Apply weather effects via SoilEffectsManager
        const weatherUpdated = this.soilEffectsManager.applyWeatherEffects(this.soilGrid, deltaTime);
        if (weatherUpdated) {
            this.needsRefresh = true;
        }
        
        // Apply organic matter decomposition via SoilEffectsManager
        const decompositionUpdated = this.soilEffectsManager.applyOrganicMatterDecomposition(
            this.soilGrid,
            (x, y) => this.getSoilAt(x, y),
            deltaTime
        );
        if (decompositionUpdated) {
            this.needsRefresh = true;
        }
    }
    
    // Utility methods for interaction with other systems
    
    // Get average fertility of an area
    getAverageFertilityInArea(centerX, centerY, radius) {
        const cells = this.getCellsInRadius(centerX, centerY, radius);
        if (cells.length === 0) return 0;
        
        const totalFertility = cells.reduce((sum, cell) => sum + cell.fertility, 0);
        return totalFertility / cells.length;
    }
    
    // Get all cells within a given radius
    getCellsInRadius(centerX, centerY, radius) {
        const cells = [];
        const gridCenter = this.worldToGrid(centerX, centerY);
        const gridRadius = Math.ceil(radius / this.cellSize);
        
        for (let x = gridCenter.x - gridRadius; x <= gridCenter.x + gridRadius; x++) {
            for (let y = gridCenter.y - gridRadius; y <= gridRadius; y++) {
                const soil = this.getSoilAt(x, y);
                if (soil) {
                    const distance = Math.sqrt(
                        Math.pow((soil.worldX + this.cellSize/2) - centerX, 2) + 
                        Math.pow((soil.worldY + this.cellSize/2) - centerY, 2)
                    );
                    if (distance <= radius) {
                        cells.push(soil);
                    }
                }
            }
        }
        
        return cells;
    }
    
    // Modify soil properties in an area
    modifySoilInArea(centerX, centerY, radius, modifications) {
        const cells = this.getCellsInRadius(centerX, centerY, radius);
        
        cells.forEach(soil => {
            if (modifications.nitrogen !== undefined) {
                soil.nitrogen = Math.max(0, Math.min(100, soil.nitrogen + modifications.nitrogen));
            }
            if (modifications.phosphorus !== undefined) {
                soil.phosphorus = Math.max(0, Math.min(100, soil.phosphorus + modifications.phosphorus));
            }
            if (modifications.potassium !== undefined) {
                soil.potassium = Math.max(0, Math.min(100, soil.potassium + modifications.potassium));
            }
            if (modifications.organicMatter !== undefined) {
                soil.organicMatter = Math.max(0, Math.min(100, soil.organicMatter + modifications.organicMatter));
            }
            if (modifications.pollution !== undefined) {
                soil.pollution = Math.max(0, Math.min(100, soil.pollution + modifications.pollution));
            }
            if (modifications.waterRetention !== undefined) {
                soil.waterRetention = Math.max(0, Math.min(100, soil.waterRetention + modifications.waterRetention));
            }
            
            // Recalculate derived properties
            soil.fertility = soil.calculateFertility();
            soil.baseColor = soil.calculateBaseColor();
            soil.waterPixels = soil.generateWaterPixels();
            soil.pollutionPixels = soil.generatePollutionPixels();
            soil.needsUpdate = true;
        });
        
        // Invalidate texture cache when nutrients change
        this.needsRefresh = true;
    }
    
    // Get debug information about a cell
    getSoilInfoAt(worldX, worldY) {
        const soil = this.getSoilAtWorld(worldX, worldY);
        return soil ? soil.getInfo() : null;
    }
    
    /**
     * Water tile helper methods (Milestone 2)
     */
    
    /**
     * Check if a tile is water
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {boolean} True if tile is water
     */
    isWaterAt(gridX, gridY) {
        const soil = this.getSoilAt(gridX, gridY);
        return soil ? soil.isWater : false;
    }
    
    /**
     * Get water depth at a tile
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {number} Water depth (0-100), or 0 if not water
     */
    getWaterDepthAt(gridX, gridY) {
        const soil = this.getSoilAt(gridX, gridY);
        return soil ? soil.waterDepth : 0;
    }
    
    /**
     * Set a tile as water with specified depth
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {number} depth - Water depth (0-100)
     */
    setWaterTile(gridX, gridY, depth) {
        const soil = this.getSoilAt(gridX, gridY);
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
        const key = this.getCellKey(gridX, gridY);
        this.waterTiles.add(key);
        
        // Remove any existing plants on this cell
        const plantManager = window.graphicsEngine?.plantManager;
        if (plantManager) {
            plantManager.removePlant(gridX, gridY);
        }
        
        this.needsRefresh = true;
    }
    
    /**
     * Mark a soil cell and its neighbors for active decomposition (Milestone 4 - Phase 2)
     * Called when plants die or interact with soil
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     */
    markCellForDecomposition(gridX, gridY) {
        // Delegate to SoilEffectsManager
        const radius = this.config.world.soil?.decomposition?.radius || 1;
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const soil = this.getSoilAt(gridX + dx, gridY + dy);
                if (soil) {
                    this.soilEffectsManager.markCellActive(gridX + dx, gridY + dy);
                }
            }
        }
    }
    
    // Getters for debug metrics
    getTotalCells() {
        return this.totalCells;
    }
    
    getVisibleCellsCount() {
        return this.visibleCellsCount;
    }
    
    getActiveCellsCount() {
        return this.soilEffectsManager.getActiveCellCount();
    }
    
    // Cleanup resources
    cleanup() {
        this.soilEffectsManager.clearActiveCells();
        this.soilGrid.clear();
        this.visibleCells = [];
    }
}