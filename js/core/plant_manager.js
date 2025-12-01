/**
 * PlantManager - Manages plant entities and their placement in the game world
 * Handles species loading, plant creation, and interaction with the soil grid
 */
class PlantManager {
    constructor(soilManager) {
        this.soilManager = soilManager;
        this.plants = new Map(); // key: "x,y", value: Map<layer, Plant>
        this.speciesConfigs = new Map();
        this.selectedSpecies = 'urtica_dioica'; // Default selection
        
        this.loadSpeciesConfigs();
    }
    
    async loadSpeciesConfigs() {
        try {
            // Load nettles
            const nettleResponse = await fetch('./species/nettles.json');
            const nettleConfig = await nettleResponse.json();
            this.speciesConfigs.set('urtica_dioica', nettleConfig);
            
            // Load oak
            const oakResponse = await fetch('./species/oak.json');
            const oakConfig = await oakResponse.json();
            this.speciesConfigs.set('quercus_robur', oakConfig);
            
            console.log(`PlantManager loaded ${this.speciesConfigs.size} species: ${Array.from(this.speciesConfigs.keys()).join(', ')}`);
        } catch (error) {
            console.error('Failed to load species configs:', error);
        }
    }
    
    /**
     * Get array of all available species IDs
     * @returns {Array<string>} Species IDs
     */
    getAvailableSpecies() {
        return Array.from(this.speciesConfigs.keys());
    }

    /**
     * Get species config by ID
     * @param {string} speciesId - Species identifier
     * @returns {Object|null} Species config or null
     */
    getSpeciesById(speciesId) {
        return this.speciesConfigs.get(speciesId) || null;
    }

    /**
     * Set currently selected species for placement
     * @param {string} speciesId - Species identifier
     */
    setSelectedSpecies(speciesId) {
        if (this.speciesConfigs.has(speciesId)) {
            this.selectedSpecies = speciesId;
            console.log(`Selected species: ${speciesId}`);
        } else {
            console.warn(`Species ${speciesId} not found`);
        }
    }

    /**
     * Get currently selected species ID
     * @returns {string} Current species ID
     */
    getSelectedSpecies() {
        return this.selectedSpecies;
    }
    
    addPlant(gridX, gridY, speciesId = null, currentDay = 0) {
        const key = `${gridX},${gridY}`;
        
        // Check if location is water tile (Milestone 2)
        const soil = this.soilManager.getSoilAt(gridX, gridY);
        if (soil && soil.isWater) {
            console.warn(`Cannot place plant at (${gridX}, ${gridY}) - water tile`);
            return null;
        }
        
        // Use provided speciesId or fall back to selected species
        const actualSpeciesId = speciesId || this.selectedSpecies;
        
        const speciesConfig = this.speciesConfigs.get(actualSpeciesId);
        if (!speciesConfig) {
            console.warn(`Species ${actualSpeciesId} not found in loaded configs`);
            return null;
        }
        
        // Manual placement always allowed - plant will be stunted if nutrients insufficient
        
        // FIXED: Calculate world position to ensure it stays within the cell bounds
        // Grid cell starts at gridX * cellSize, gridY * cellSize
        const cellLeft = gridX * this.soilManager.cellSize;
        const cellTop = gridY * this.soilManager.cellSize;
        
        // Add random offset within cell with 2px margin from edges
        // This ensures the plant position will always map back to the same grid cell
        const margin = 2;
        const maxOffset = this.soilManager.cellSize - 2 * margin;
        const randomOffsetX = margin + Math.random() * maxOffset;
        const randomOffsetY = margin + Math.random() * maxOffset;
        
        const worldX = cellLeft + randomOffsetX;
        const worldY = cellTop + randomOffsetY;
        
        // Verify: world position should map back to the same grid cell
        const verifyGrid = this.soilManager.worldToGrid(worldX, worldY);
        
        // Get first growth stage from species config (Seedling for herbs, Sapling for trees)
        const firstStage = speciesConfig.growthStages && speciesConfig.growthStages.length > 0 
            ? speciesConfig.growthStages[0].name 
            : 'Seedling';
        
        let plant;
        if (verifyGrid.x !== gridX || verifyGrid.y !== gridY) {
            console.warn(`[PLANT] Position mismatch! Intended grid (${gridX}, ${gridY}) but world (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) maps to grid (${verifyGrid.x}, ${verifyGrid.y}). Using cell center instead.`);
            // Fallback: use cell center
            const worldXSafe = cellLeft + this.soilManager.cellSize / 2;
            const worldYSafe = cellTop + this.soilManager.cellSize / 2;
            plant = new Plant(worldXSafe, worldYSafe, speciesConfig, firstStage, currentDay);
        } else {
            plant = new Plant(worldX, worldY, speciesConfig, firstStage, currentDay);
        }
        
        // Get layer from plant's species config
        const layer = plant.getLayer();
        
        // Initialize nested Map if cell key doesn't exist
        if (!this.plants.has(key)) {
            this.plants.set(key, new Map());
        }
        const layerMap = this.plants.get(key);
        
        // Check if layer already occupied - replace old plant in this layer
        if (layerMap.has(layer)) {
            console.warn(`Layer ${layer} already occupied at (${gridX}, ${gridY}), replacing`);
        }
        
        // Store plant in nested structure
        layerMap.set(layer, plant);
        
        return plant;
    }

    addPlantAtPosition(gridX, gridY, exactWorldX, exactWorldY, speciesId = null, currentDay = 0) {
        const key = `${gridX},${gridY}`;
        
        // Check if location is water tile (Milestone 2)
        const soil = this.soilManager.getSoilAt(gridX, gridY);
        if (soil && soil.isWater) {
            console.warn(`Cannot place plant at (${gridX}, ${gridY}) - water tile`);
            return null;
        }
        
        // Use provided speciesId or fall back to selected species
        const actualSpeciesId = speciesId || this.selectedSpecies;
        
        const speciesConfig = this.speciesConfigs.get(actualSpeciesId);
        if (!speciesConfig) {
            console.warn(`Species ${actualSpeciesId} not found in loaded configs`);
            return null;
        }
        
        // Manual placement always allowed - plant will be stunted if nutrients insufficient
        
        // FIXED: Verify that the exact click position maps back to the intended grid cell
        // This prevents plants from being created at positions that don't resolve correctly
        const verifyGrid = this.soilManager.worldToGrid(exactWorldX, exactWorldY);
        let finalWorldX = exactWorldX;
        let finalWorldY = exactWorldY;
        
        if (verifyGrid.x !== gridX || verifyGrid.y !== gridY) {
            console.warn(`[PLANT] Click position (${exactWorldX.toFixed(1)}, ${exactWorldY.toFixed(1)}) maps to grid (${verifyGrid.x}, ${verifyGrid.y}) but expected (${gridX}, ${gridY}). Using cell center instead.`);
            // Fallback: use cell center to ensure correct grid mapping
            const cellLeft = gridX * this.soilManager.cellSize;
            const cellTop = gridY * this.soilManager.cellSize;
            finalWorldX = cellLeft + this.soilManager.cellSize / 2;
            finalWorldY = cellTop + this.soilManager.cellSize / 2;
        }
        
        // Get first growth stage from species config (Seedling for herbs, Sapling for trees)
        const firstStage = speciesConfig.growthStages && speciesConfig.growthStages.length > 0 
            ? speciesConfig.growthStages[0].name 
            : 'Seedling';
        
        // Place plant at verified position
        const plant = new Plant(finalWorldX, finalWorldY, speciesConfig, firstStage, currentDay);
        
        // Get layer from plant's species config
        const layer = plant.getLayer();
        
        // Initialize nested Map if cell key doesn't exist
        if (!this.plants.has(key)) {
            this.plants.set(key, new Map());
        }
        const layerMap = this.plants.get(key);
        
        // Check if layer already occupied - replace old plant in this layer
        if (layerMap.has(layer)) {
            console.warn(`Layer ${layer} already occupied at (${gridX}, ${gridY}), replacing`);
        }
        
        // Store plant in nested structure
        layerMap.set(layer, plant);
        
        return plant;
    }
    
    /**
     * Remove plant at grid position
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {string} layer - Optional layer to remove (if not specified, removes all plants at cell)
     * @returns {boolean} True if plant(s) removed
     */
    removePlant(gridX, gridY, layer = null) {
        const key = `${gridX},${gridY}`;
        const layerMap = this.plants.get(key);
        
        if (!layerMap) {
            return false;
        }
        
        if (layer !== null) {
            // Remove specific layer only
            const removed = layerMap.delete(layer);
            
            // Clean up empty layer map
            if (layerMap.size === 0) {
                this.plants.delete(key);
            }
            
            return removed;
        } else {
            // Remove all plants at this cell
            return this.plants.delete(key);
        }
    }
    
    /**
     * Get plant(s) at grid position
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {string} layer - Optional layer to query (if not specified, returns all plants as array)
     * @returns {Plant|Array<Plant>|null} Plant(s) or null/empty array
     */
    getPlantAt(gridX, gridY, layer = null) {
        const key = `${gridX},${gridY}`;
        const layerMap = this.plants.get(key);
        
        if (!layerMap) {
            return layer !== null ? null : [];
        }
        
        if (layer !== null) {
            // Return specific layer plant
            return layerMap.get(layer) || null;
        } else {
            // Return array of all plants at this cell
            return Array.from(layerMap.values());
        }
    }
    
    update(gameDaysElapsed, currentDay) {
        const reproductionEvents = [];
        const plantsToRemove = [];
        
        // Update all plants and collect reproduction events and despawn flags
        for (const [key, layerMap] of this.plants.entries()) {
            for (const [layer, plant] of layerMap.entries()) {
                plant.update(gameDaysElapsed, currentDay);
                
                // Check for reproduction event
                const reproEvent = plant.checkReproduction(currentDay);
                if (reproEvent) {
                    reproductionEvents.push(reproEvent);
                }
                
                // Check if plant should be removed
                if (plant.shouldDespawn) {
                    plantsToRemove.push({ key, layer });
                }
            }
        }
        
        // Handle reproduction events
        reproductionEvents.forEach(event => {
            this.handleReproduction(event, currentDay);
        });
        
        // Remove despawned plants
        plantsToRemove.forEach(({ key, layer }) => {
            const layerMap = this.plants.get(key);
            if (layerMap) {
                layerMap.delete(layer);
                
                // Clean up empty layer map
                if (layerMap.size === 0) {
                    this.plants.delete(key);
                }
            }
        });
        
    }
    
    /**
     * Get all plants as a flat array
     * @returns {Array<Plant>} All plants
     */
    getAllPlants() {
        const allPlants = [];
        for (const layerMap of this.plants.values()) {
            allPlants.push(...layerMap.values());
        }
        return allPlants;
    }
    
    /**
     * Get all available (unoccupied) layers at a cell
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {Array<string>} Available layers ['bottom', 'middle', 'top']
     */
    getAvailableLayersAt(gridX, gridY) {
        const allLayers = ['bottom', 'middle', 'top'];
        const key = `${gridX},${gridY}`;
        const layerMap = this.plants.get(key);
        
        if (!layerMap) {
            return allLayers; // All layers available
        }
        
        // Filter out occupied layers
        return allLayers.filter(layer => !layerMap.has(layer));
    }

    /**
     * Check if a specific layer is available for planting
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {string} layer - Layer to check ('bottom', 'middle', 'top')
     * @returns {boolean} True if layer is available
     */
    canPlantAt(gridX, gridY, layer) {
        // Check water tile
        const soil = this.soilManager.getSoilAt(gridX, gridY);
        if (soil && soil.isWater) {
            return false;
        }
        
        // Check layer occupancy
        const key = `${gridX},${gridY}`;
        const layerMap = this.plants.get(key);
        
        if (!layerMap) {
            return true; // No plants, layer available
        }
        
        return !layerMap.has(layer);
    }

    /**
     * Get which species can be planted at a cell
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {Array<{speciesId: string, layer: string, config: Object}>} Plantable species
     */
    getPlantableSpeciesAt(gridX, gridY) {
        const result = [];
        const availableLayers = this.getAvailableLayersAt(gridX, gridY);
        
        for (const [speciesId, config] of this.speciesConfigs.entries()) {
            const speciesLayer = config.layer || 'middle'; // Default to middle
            
            if (availableLayers.includes(speciesLayer)) {
                result.push({ speciesId, layer: speciesLayer, config });
            }
        }
        
        return result;
    }
    
    getVisiblePlants(bounds) {
        return this.getAllPlants().filter(plant => {
            return plant.x >= bounds.left && plant.x <= bounds.right &&
                   plant.y >= bounds.top && plant.y <= bounds.bottom;
        });
    }
    
    /**
     * Handle reproduction event from a plant
     * @param {Object} event - Reproduction event data
     * @param {number} currentDay - Current game day
     */
    handleReproduction(event, currentDay) {
        if (event.type !== 'rhizomeCloning') {
            return;
        }
        
        // Convert world position to grid
        const parentGrid = this.soilManager.worldToGrid(event.parentX, event.parentY);
        
        // Get neighboring cells within maxDistance
        const neighbors = this.getNeighborCells(parentGrid.x, parentGrid.y, event.maxDistance);
        
        // Get species config for nutrient requirements check
        const speciesConfig = this.speciesConfigs.get(event.species);
        
        // Get parent plant's layer so offspring goes in same layer
        const parentLayer = speciesConfig?.layer || 'middle';
        
        // Filter to only empty, plantable cells with sufficient nutrients
        const validNeighbors = neighbors.filter(cell => {
            const soil = this.soilManager.getSoilAt(cell.x, cell.y);
            if (!soil || !soil.isPlantable || soil.isWater) return false;
            
            // Check if this LAYER is occupied (allow reproduction if layer is empty)
            const existingPlant = this.getPlantAt(cell.x, cell.y, parentLayer);
            if (existingPlant) return false;
            
            // Check nutrient-specific requirements for reproduction
            if (speciesConfig?.environment?.nutrientRequirements) {
                const reqs = speciesConfig.environment.nutrientRequirements;
                
                // ALL nutrients must meet minimum for reproduction
                if (soil.nitrogen < reqs.nitrogen.minimum) return false;
                if (soil.phosphorus < reqs.phosphorus.minimum) return false;
                if (soil.potassium < reqs.potassium.minimum) return false;
                if (soil.organicMatter < reqs.organicMatter.minimum) return false;
            }
            
            return true;
        });
        
        if (validNeighbors.length === 0) {
            return;
        }
        
        // Pick a random valid neighbor
        const targetCell = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        
        // Spawn new plant at seedling stage
        const newPlant = this.addPlant(targetCell.x, targetCell.y, event.species, currentDay);
        
    }
    
    /**
     * Get neighboring grid cells within a given distance
     * @param {number} gridX - Center grid X
     * @param {number} gridY - Center grid Y
     * @param {number} maxDistance - Maximum distance in grid cells
     * @returns {Array} Array of {x, y} grid coordinates
     */
    getNeighborCells(gridX, gridY, maxDistance) {
        const neighbors = [];
        
        for (let dx = -maxDistance; dx <= maxDistance; dx++) {
            for (let dy = -maxDistance; dy <= maxDistance; dy++) {
                // Skip the center cell
                if (dx === 0 && dy === 0) continue;
                
                neighbors.push({
                    x: gridX + dx,
                    y: gridY + dy
                });
            }
        }
        
        return neighbors;
    }
}