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
        
        // Weather effects tracking
        this.weatherEffectsConfig = this.config.world.weather?.soilEffects || null;
        
        // OM decomposition tracking (Milestone 2)
        this.decompositionConfig = this.config.world.soil?.decomposition || null;
        this.decompositionLogCounter = 0;
        this.decompositionLogInterval = this.decompositionConfig?.loggingInterval || 5;
        
        // Localized decomposition tracking (Milestone 4 - Phase 2)
        this.activeCells = new Set();  // Set of "x,y" keys for cells with active decomposition
        this.cellLastPlantActivity = new Map();  // "x,y" → timestamp (game day)
        this.decompositionRadius = this.config.world.soil?.decomposition?.radius || 1;  // Radius around plants
        this.decompositionActivityWindow = this.config.world.soil?.decomposition?.activityWindowDays || 30;  // Days after death
        
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
        
        // Generate rivers if enabled (Milestone 3)
        this.generateRivers();
        
        // Generate lakes if enabled (Milestone 4)
        this.generateLakes();
        
        // Apply fertility boosts around water bodies (Milestone 5)
        this.applyFertilityBoostsAroundWater();
    }
    
    /**
     * Generate rivers using procedural generator (Milestone 3)
     */
    generateRivers() {
        const waterConfig = this.config.world?.terrain?.water;
        
        if (!waterConfig || !waterConfig.rivers || !waterConfig.rivers.enabled) {
            console.log('River generation disabled');
            return;
        }
        
        const riverConfig = waterConfig.rivers;
        const startTime = performance.now();
        
        // Generate rivers
        const rivers = this.proceduralGenerator.generateRivers(
            this.gridWidth,
            this.gridHeight,
            riverConfig
        );
        
        let totalWaterCells = 0;
        
        // Apply rivers to soil grid
        rivers.forEach(riverCells => {
            riverCells.forEach(cell => {
                // Convert from map coordinates (0 to gridWidth) to grid coordinates (-gridWidth/2 to +gridWidth/2)
                const gridX = cell.x - this.gridWidth / 2;
                const gridY = cell.y - this.gridHeight / 2;
                
                // Check if within grid bounds
                const minX = -this.gridWidth / 2;
                const maxX = this.gridWidth / 2 - 1;
                const minY = -this.gridHeight / 2;
                const maxY = this.gridHeight / 2 - 1;
                
                if (gridX >= minX && gridX <= maxX && gridY >= minY && gridY <= maxY) {
                    this.setWaterTile(gridX, gridY, cell.depth);
                    totalWaterCells++;
                }
            });
        });
        
        const endTime = performance.now();
        const generationTime = (endTime - startTime).toFixed(0);
        
        console.log(`Rivers generated: ${rivers.length} rivers, ${totalWaterCells} total cells (${generationTime}ms)`);
        
        // Force visible cells refresh to pick up water tiles
        this.needsRefresh = true;
    }
    
    /**
     * Generate lakes using procedural generator (Milestone 4)
     */
    generateLakes() {
        const waterConfig = this.config.world?.terrain?.water;
        
        if (!waterConfig || !waterConfig.lakes || !waterConfig.lakes.enabled) {
            console.log('Lake generation disabled');
            return;
        }
        
        const lakeConfig = waterConfig.lakes;
        const startTime = performance.now();
        
        // Generate lakes
        const lakes = this.proceduralGenerator.generateLakes(
            this.gridWidth,
            this.gridHeight,
            lakeConfig
        );
        
        let totalLakeCells = 0;
        
        // Grid bounds
        const minX = -this.gridWidth / 2;
        const maxX = this.gridWidth / 2 - 1;
        const minY = -this.gridHeight / 2;
        const maxY = this.gridHeight / 2 - 1;
        
        // Apply lakes to soil grid
        lakes.forEach(lakeCells => {
            lakeCells.forEach(cell => {
                // Convert from map coordinates (0 to gridWidth) to grid coordinates (-gridWidth/2 to +gridWidth/2)
                const gridX = cell.x - this.gridWidth / 2;
                const gridY = cell.y - this.gridHeight / 2;
                
                // Check if within grid bounds
                if (gridX >= minX && gridX <= maxX && gridY >= minY && gridY <= maxY) {
                    this.setWaterTile(gridX, gridY, cell.depth);
                    totalLakeCells++;
                }
            });
        });
        
        const endTime = performance.now();
        const generationTime = (endTime - startTime).toFixed(0);
        
        console.log(`Lakes generated: ${lakes.length} lakes, ${totalLakeCells} total cells (${generationTime}ms)`);
        
        // Force visible cells refresh to pick up water tiles
        this.needsRefresh = true;
    }
    
    /**
     * Apply fertility boosts to soil cells around water bodies (Milestone 5)
     * Creates gradients of increased fertility near rivers and lakes
     */
    applyFertilityBoostsAroundWater() {
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
                    
                    const soil = this.getSoilAt(targetX, targetY);
                    
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
        this.needsRefresh = true;
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
        
        // Apply weather effects to soil water
        this.applyWeatherEffects(deltaTime);
        
        // Apply organic matter decomposition (Milestone 2)
        this.applyOrganicMatterDecomposition(deltaTime);
    }
    
    /**
     * Apply weather effects to soil water and nitrogen levels
     * @param {number} deltaTime - Time since last frame (seconds)
     */
    applyWeatherEffects(deltaTime) {
        // Check if weather system is available and configured
        if (!this.weatherEffectsConfig) {
            return;
        }
        
        const weatherManager = window.graphicsEngine?.weatherManager;
        if (!weatherManager || !weatherManager.initialized) {
            return;
        }
        
        const currentWeather = weatherManager.getCurrentWeather();
        if (!currentWeather) {
            return;
        }
        
        // Calculate water change rate based on weather
        let waterChangePerDay = 0;
        let nitrogenChangePerDay = 0;
        
        if (currentWeather === 'rainy') {
            const rainIntensity = weatherManager.getRainIntensity();
            waterChangePerDay = this.weatherEffectsConfig.rainWaterIncreasePerDay * rainIntensity;
            
            // Nitrogen regeneration during rain (atmospheric deposition)
            if (this.weatherEffectsConfig.rainNitrogenRestorePerDay) {
                nitrogenChangePerDay = this.weatherEffectsConfig.rainNitrogenRestorePerDay * rainIntensity;
            }
        } else if (currentWeather === 'sunny') {
            waterChangePerDay = -this.weatherEffectsConfig.sunEvaporationPerDay;
        } else if (currentWeather === 'cloudy') {
            waterChangePerDay = -this.weatherEffectsConfig.cloudyEvaporationPerDay;
        }
        
        // Convert from per-day to per-second
        const timeManager = window.graphicsEngine?.timeManager;
        if (!timeManager) {
            return;
        }
        
        const realSecondsPerGameDay = timeManager.config.realSecondsPerGameDay;
        const waterChangePerSecond = waterChangePerDay / realSecondsPerGameDay;
        const waterChangeThisFrame = waterChangePerSecond * deltaTime;
        
        const nitrogenChangePerSecond = nitrogenChangePerDay / realSecondsPerGameDay;
        const nitrogenChangeThisFrame = nitrogenChangePerSecond * deltaTime;
        
        // Apply to all soil cells
        const hasWaterChange = Math.abs(waterChangeThisFrame) > 0.001;
        const hasNitrogenChange = Math.abs(nitrogenChangeThisFrame) > 0.001;
        
        if (hasWaterChange || hasNitrogenChange) {
            let waterCellsUpdated = 0;
            let nitrogenCellsUpdated = 0;
            
            this.soilGrid.forEach(soil => {
                // Apply water changes
                if (hasWaterChange) {
                    const oldWater = soil.waterRetention;
                    soil.waterRetention = Math.max(0, Math.min(100, soil.waterRetention + waterChangeThisFrame));
                    
                    // If water changed significantly, regenerate water pixels
                    if (Math.abs(soil.waterRetention - oldWater) > 0.1) {
                        soil.waterPixels = soil.generateWaterPixels();
                        soil.needsUpdate = true;
                        waterCellsUpdated++;
                    }
                }
                
                // Apply nitrogen changes
                if (hasNitrogenChange) {
                    const oldNitrogen = soil.nitrogen;
                    soil.nitrogen = Math.max(0, Math.min(100, soil.nitrogen + nitrogenChangeThisFrame));
                    
                    // If nitrogen changed significantly, recalculate fertility
                    if (Math.abs(soil.nitrogen - oldNitrogen) > 0.1) {
                        soil.fertility = soil.calculateFertility();
                        soil.baseColor = soil.calculateBaseColor();
                        soil.needsUpdate = true;
                        nitrogenCellsUpdated++;
                    }
                }
            });
            
            // Invalidate texture cache if cells updated
            if (waterCellsUpdated > 0 || nitrogenCellsUpdated > 0) {
                this.needsRefresh = true;
            }
        }
    }
    
    /**
     * Apply organic matter decomposition into nitrogen and phosphorus (Milestone 2)
     * UPDATED Milestone 4 Phase 2: Localized decomposition only in active plant zones
     * @param {number} deltaTime - Time since last frame (seconds)
     */
    applyOrganicMatterDecomposition(deltaTime) {
        // Check if decomposition is enabled
        if (!this.decompositionConfig || !this.decompositionConfig.enabled) {
            return;
        }
        
        // Get time manager for game day calculations
        const timeManager = window.graphicsEngine?.timeManager;
        if (!timeManager) {
            return;
        }
        
        // Calculate game days elapsed this frame
        const realSecondsPerGameDay = timeManager.config.realSecondsPerGameDay;
        const gameDaysElapsed = deltaTime / realSecondsPerGameDay;
        const currentGameDay = timeManager.getElapsedGameDays();
        
        // Calculate base decay rate
        const baseDecayPerDay = this.decompositionConfig.organicMatterDecayPerDay;
        
        // Apply weather multiplier (Milestone 3)
        let weatherMultiplier = 1.0; // Default (no weather or cloudy baseline)
        
        const weatherManager = window.graphicsEngine?.weatherManager;
        if (weatherManager && weatherManager.initialized && this.decompositionConfig.weatherModifiers) {
            const currentWeather = weatherManager.getCurrentWeather();
            
            if (currentWeather === 'rainy') {
                // Rain accelerates decomposition (moisture + microbes)
                const rainIntensity = weatherManager.getRainIntensity();
                const rainyConfig = this.decompositionConfig.weatherModifiers.rainy;
                weatherMultiplier = rainyConfig.base + (rainIntensity * rainyConfig.intensityScale);
            } else if (currentWeather === 'sunny') {
                // Sun slows decomposition (drier soil, heat stress on microbes)
                weatherMultiplier = this.decompositionConfig.weatherModifiers.sunny;
            } else if (currentWeather === 'cloudy') {
                // Cloudy is baseline
                weatherMultiplier = this.decompositionConfig.weatherModifiers.cloudy;
            }
        }
        
        // Calculate final decay amount with weather modifier
        const decayThisFrame = baseDecayPerDay * weatherMultiplier * gameDaysElapsed;
        
        // Skip if decay amount is negligible
        if (decayThisFrame < 0.001) {
            return;
        }
        
        // Get decomposition ratios
        const nitrogenRatio = this.decompositionConfig.nitrogenReleaseRatio;
        const phosphorusRatio = this.decompositionConfig.phosphorusReleaseRatio;
        const minimumOM = this.decompositionConfig.minimumOMForBreakdown;
        
        // Track cells affected for logging
        let cellsAffected = 0;
        let totalOMDecayed = 0;
        let totalNAdded = 0;
        let totalPAdded = 0;
        let cellsExpired = 0;
        
        // Get plant manager for living plant checks
        const plantManager = window.graphicsEngine?.plantManager;
        
        // PHASE 2: Apply decomposition ONLY to active cells (localized)
        const cellsToCheck = Array.from(this.activeCells);
        
        cellsToCheck.forEach(cellKey => {
            const [x, y] = cellKey.split(',').map(Number);
            const soil = this.getSoilAt(x, y);
            
            if (!soil) {
                this.activeCells.delete(cellKey);
                this.cellLastPlantActivity.delete(cellKey);
                return;
            }
            
            // Check if cell still has active decomposition conditions:
            // 1. Has living plant (root zone activity boosts microbes)
            // 2. OR had recent plant death (within activity window)
            const plants = plantManager && plantManager.getPlantAt(x, y); // Returns array
            const hasLivingPlant = plants && plants.length > 0;
            const lastActivity = this.cellLastPlantActivity.get(cellKey) || 0;
            const daysSinceActivity = currentGameDay - lastActivity;
            
            const isActive = hasLivingPlant || daysSinceActivity < this.decompositionActivityWindow;
            
            if (!isActive) {
                // No recent activity - remove from active set
                this.activeCells.delete(cellKey);
                this.cellLastPlantActivity.delete(cellKey);
                cellsExpired++;
                return;
            }
            
            // Update activity timestamp if living plant present
            if (hasLivingPlant) {
                this.cellLastPlantActivity.set(cellKey, currentGameDay);
            }
            
            // Only decompose if OM is above minimum threshold
            if (soil.organicMatter > minimumOM) {
                // Store old values
                const oldOM = soil.organicMatter;
                const oldN = soil.nitrogen;
                const oldP = soil.phosphorus;
                
                // Calculate actual decay (don't go below minimum)
                const availableOM = soil.organicMatter - minimumOM;
                const actualDecay = Math.min(decayThisFrame, availableOM);
                
                // Apply decay
                soil.organicMatter -= actualDecay;
                soil.nitrogen += actualDecay * nitrogenRatio;
                soil.phosphorus += actualDecay * phosphorusRatio;
                
                // Clamp all values to 0-100 range
                soil.organicMatter = Math.max(0, Math.min(100, soil.organicMatter));
                soil.nitrogen = Math.max(0, Math.min(100, soil.nitrogen));
                soil.phosphorus = Math.max(0, Math.min(100, soil.phosphorus));
                
                // Update derived properties if significant change occurred
                if (actualDecay > 0.01) {
                    soil.fertility = soil.calculateFertility();
                    soil.baseColor = soil.calculateBaseColor();
                    soil.needsUpdate = true;
                    
                    cellsAffected++;
                    totalOMDecayed += actualDecay;
                    totalNAdded += soil.nitrogen - oldN;
                    totalPAdded += soil.phosphorus - oldP;
                }
            }
        });
        
        // Invalidate texture cache if cells updated
        if (cellsAffected > 0) {
            this.needsRefresh = true;
            
            // Optional logging (throttled)
            if (this.decompositionConfig.enableLogging) {
                this.decompositionLogCounter += gameDaysElapsed;
                
                if (this.decompositionLogCounter >= this.decompositionLogInterval) {
                    // Get current weather for logging
                    const weatherManager = window.graphicsEngine?.weatherManager;
                    let weatherInfo = '';
                    if (weatherManager && weatherManager.initialized) {
                        const weather = weatherManager.getCurrentWeather();
                        const multiplier = weatherMultiplier.toFixed(2);
                        weatherInfo = ` [Weather: ${weather}, multiplier: ${multiplier}x]`;
                    }
                    
                    console.log(`[OM DECOMP LOCALIZED] ${cellsAffected}/${this.activeCells.size} active cells decomposed (${cellsExpired} expired) - OM decayed: ${totalOMDecayed.toFixed(2)}, N added: ${totalNAdded.toFixed(2)}, P added: ${totalPAdded.toFixed(2)}${weatherInfo}`);
                    this.decompositionLogCounter = 0;
                }
            }
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
        const timeManager = window.graphicsEngine?.timeManager;
        if (!timeManager) return;
        
        const currentGameDay = timeManager.getElapsedGameDays();
        const radius = this.decompositionRadius;
        
        // Mark this cell and neighbors within radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const key = `${gridX + dx},${gridY + dy}`;
                const soil = this.getSoilAt(gridX + dx, gridY + dy);
                
                if (soil) {
                    this.activeCells.add(key);
                    this.cellLastPlantActivity.set(key, currentGameDay);
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
        return this.activeCells.size;
    }
    
    // Cleanup resources
    cleanup() {
        this.soilGrid.clear();
        this.visibleCells = [];
        this.activeCells.clear();
        this.cellLastPlantActivity.clear();
    }
}