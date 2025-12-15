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
        
        // Initialize schema loader and cache for species validation
        this.schemaLoader = null;
        this.speciesSchema = null;
        
        // Occlusion manager reference (set externally)
        this.occlusionManager = null;
        
        // LOD manager reference (set externally) - Milestone 4
        this.lodManager = null;
        
        // Promise that resolves when species are loaded
        this.speciesLoaded = this.loadSpeciesConfigs();
    }
    
    /**
     * Set occlusion manager reference for cache invalidation
     * @param {OcclusionManager} occlusionManager - Occlusion manager instance
     */
    setOcclusionManager(occlusionManager) {
        this.occlusionManager = occlusionManager;
    }
    
    /**
     * Set LODManager reference for LOD-aware sprite generation (Milestone 4)
     * @param {LODManager} lodManager - LODManager instance
     */
    setLODManager(lodManager) {
        this.lodManager = lodManager;
    }
    
    /**
     * Update LOD levels for all plants based on current camera zoom (Milestone 4)
     * Called once per frame from render loop
     */
    updateLOD() {
        if (!this.lodManager) return;
        
        // Get all plants as flat array
        const allPlants = this.getAllPlants();
        
        // Batch update LOD levels
        this.lodManager.updateLODLevels(allPlants);
    }
    
    async loadSpeciesConfigs() {
        try {
            // Initialize schema loader
            this.schemaLoader = new SchemaLoader();
            this.speciesSchema = await this.schemaLoader.loadSchema('schemas/species.schema.json');
            
            // If schema load was cancelled (page navigation), exit silently
            if (!this.speciesSchema) {
                return;
            }
            
            // Load and validate each species
            await this.loadSpecies('./species/nettles.json', 'urtica_dioica');
            await this.loadSpecies('./species/oak.json', 'quercus_robur');
            await this.loadSpecies('./species/clover.json', 'trifolium_repens');
        } catch (error) {
            // Suppress errors during page navigation
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return; // Page is navigating away, silently exit
            }
            console.error('Failed to load species configs:', error);
            throw error; // Re-throw to halt initialization
        }
    }
    
    /**
     * Load and validate a species file
     * @param {string} speciesPath - Path to species JSON file
     * @param {string} expectedId - Expected species ID for validation
     * @throws {Error} If species fails validation
     * @private
     */
    async loadSpecies(speciesPath, expectedId) {
        try {
            // Fetch species file
            const response = await fetch(speciesPath);
            if (!response.ok) {
                throw new Error(`Failed to load species: ${speciesPath} (status ${response.status})`);
            }
            const speciesData = await response.json();
            
            // Validate species against schema
            const validator = new ConfigValidator();
            const result = validator.validateSpecies(speciesData, this.speciesSchema);
            
            if (!result.valid) {
                const errorMsg = validator.formatErrorMessage(result.errors);
                console.error(`Species validation failed (${speciesPath}):`, errorMsg);
                throw new Error(`Invalid species file ${speciesPath}:\n${errorMsg}`);
            }
            
            // Verify species ID matches expected
            if (speciesData.id !== expectedId) {
                console.warn(`Species ID mismatch: expected '${expectedId}', got '${speciesData.id}' in ${speciesPath}`);
            }
            
            // Store validated species config
            this.speciesConfigs.set(speciesData.id, speciesData);
            
        } catch (error) {
            // Suppress errors during page navigation
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return; // Page is navigating away, silently exit
            }
            console.error(`Error loading species from ${speciesPath}:`, error);
            throw error;
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
        
        // Invalidate occlusion cache when tree is added
        if (layer === 'top' && this.occlusionManager) {
            this.occlusionManager.invalidateCache();
        }
        
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
        
        // FIXED: Plant constructor expects orthographic world coordinates
        // Calculate orthographic world position from grid coordinates
        // The Plant class internally stores gridX/gridY and handles isometric conversion in getRenderData()
        const cellSize = this.soilManager.cellSize;
        
        // Add random offset within cell for natural variation
        // Use ±80% of cell size to create visible scatter (±8 pixels for cellSize=20)
        // This makes plants appear naturally distributed instead of perfectly centered
        const maxOffset = cellSize * 0.8;
        const randomOffsetX = (Math.random() - 0.5) * maxOffset;
        const randomOffsetY = (Math.random() - 0.5) * maxOffset;
        
        const orthoWorldX = gridX * cellSize + cellSize / 2 + randomOffsetX;
        const orthoWorldY = gridY * cellSize + cellSize / 2 + randomOffsetY;
        
        // Get first growth stage from species config (Seedling for herbs, Sapling for trees)
        const firstStage = speciesConfig.growthStages && speciesConfig.growthStages.length > 0 
            ? speciesConfig.growthStages[0].name 
            : 'Seedling';
        
        // Place plant with orthographic world coordinates
        // Plant constructor will calculate gridX/gridY from these using Math.floor(x / cellSize)
        const plant = new Plant(orthoWorldX, orthoWorldY, speciesConfig, firstStage, currentDay);
        
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
        
        // Invalidate occlusion cache when tree is added
        if (layer === 'top' && this.occlusionManager) {
            this.occlusionManager.invalidateCache();
        }
        
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
            // Check if we're removing a tree (top layer)
            const wasTree = layer === 'top';
            
            // Remove specific layer only
            const removed = layerMap.delete(layer);
            
            // Clean up empty layer map
            if (layerMap.size === 0) {
                this.plants.delete(key);
            }
            
            // Invalidate occlusion cache when tree is removed
            if (wasTree && removed && this.occlusionManager) {
                this.occlusionManager.invalidateCache();
            }
            
            return removed;
        } else {
            // Check if any top layer plants exist before removal
            const hadTree = layerMap.has('top');
            
            // Remove all plants at this cell
            const removed = this.plants.delete(key);
            
            // Invalidate occlusion cache if we removed a tree
            if (hadTree && removed && this.occlusionManager) {
                this.occlusionManager.invalidateCache();
            }
            
            return removed;
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
        
        // MILESTONE 6: Perform mycorrhizal network sharing (once per frame)
        this.performMycorrhizalSharing(currentDay);
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
        const isIsometric = window.config?.world?.rendering?.projection === 'isometric';
        
        return this.getAllPlants().filter(plant => {
            if (isIsometric) {
                // In isometric mode, getRenderData() returns isometric coordinates
                // which match the isometric camera bounds
                const renderData = plant.getRenderData();
                return renderData.x >= bounds.left && renderData.x <= bounds.right &&
                       renderData.y >= bounds.top && renderData.y <= bounds.bottom;
            } else {
                // In orthographic mode, plant.x/y are world coordinates
                return plant.x >= bounds.left && plant.x <= bounds.right &&
                       plant.y >= bounds.top && plant.y <= bounds.bottom;
            }
        });
    }
    
    /**
     * Handle reproduction event from a plant
     * @param {Object} event - Reproduction event data
     * @param {number} currentDay - Current game day
     */
    handleReproduction(event, currentDay) {
        if (event.type === 'rhizomeCloning') {
            this._handleRhizomeCloning(event, currentDay);
        } else if (event.type === 'seedProduction') {
            this._handleSeedProduction(event, currentDay);
        } else if (event.type === 'proximityReproduction') {
            this._handleProximityReproduction(event, currentDay);
        }
    }
    
    /**
     * Handle rhizome cloning reproduction (underground runners)
     * @param {Object} event - Reproduction event data
     * @param {number} currentDay - Current game day
     * @private
     */
    _handleRhizomeCloning(event, currentDay) {
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
        
        // NEW: Apply reproduction cost to parent soil BEFORE spawning (Milestone 2)
        if (event.reproductionCost) {
            const parentSoil = this.soilManager.getSoilAt(parentGrid.x, parentGrid.y);
            if (parentSoil) {
                const newN = Math.max(0, parentSoil.nitrogen - event.reproductionCost.nitrogen);
                const newP = Math.max(0, parentSoil.phosphorus - event.reproductionCost.phosphorus);
                const newK = Math.max(0, parentSoil.potassium - event.reproductionCost.potassium);
                const newOM = Math.max(0, parentSoil.organicMatter - event.reproductionCost.organicMatter);
                
                parentSoil.updateNutrients(newN, newP, newK, newOM);
                this.soilManager.needsRefresh = true;
                

            }
        }
        
        // Spawn new plant at first growth stage
        const newPlant = this.addPlant(targetCell.x, targetCell.y, event.species, currentDay);
    }
    
    /**
     * Handle seed production reproduction (seed dispersal)
     * @param {Object} event - Reproduction event data
     * @param {number} currentDay - Current game day
     * @private
     */
    _handleSeedProduction(event, currentDay) {
        // Roll for germination (some seeds don't germinate)
        if (Math.random() > event.germinationChance) {
            return; // Seed didn't germinate
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
            return; // No valid locations for seed to germinate
        }
        
        // Pick a random valid neighbor
        const targetCell = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        
        // NEW: Apply reproduction cost to parent soil BEFORE spawning (Milestone 2)
        if (event.reproductionCost) {
            const parentSoil = this.soilManager.getSoilAt(parentGrid.x, parentGrid.y);
            if (parentSoil) {
                const newN = Math.max(0, parentSoil.nitrogen - event.reproductionCost.nitrogen);
                const newP = Math.max(0, parentSoil.phosphorus - event.reproductionCost.phosphorus);
                const newK = Math.max(0, parentSoil.potassium - event.reproductionCost.potassium);
                const newOM = Math.max(0, parentSoil.organicMatter - event.reproductionCost.organicMatter);
                
                parentSoil.updateNutrients(newN, newP, newK, newOM);
                this.soilManager.needsRefresh = true;
                

            }
        }
        
        // Spawn new plant at first growth stage (seedling/sprout)
        const newPlant = this.addPlant(targetCell.x, targetCell.y, event.species, currentDay);
    }
    
    /**
     * Handle proximity reproduction (requires partner within distance)
     * @param {Object} event - Reproduction event data
     * @param {number} currentDay - Current game day
     * @private
     */
    _handleProximityReproduction(event, currentDay) {
        const parentGrid = this.soilManager.worldToGrid(event.parentX, event.parentY);
        const speciesConfig = this.speciesConfigs.get(event.species);
        const parentLayer = speciesConfig?.layer || 'top';
        
        // Find any mature partner within proximity (unisex - any partner works)
        const partner = this._findProximityPartner(
            parentGrid.x, 
            parentGrid.y, 
            event.proximityDistance,
            event.species,
            parentLayer
        );
        
        if (!partner) {
            // Log partner search failure if logging enabled
            return; // No valid partner found
        }
        
        // Both parents found - create offspring genetics
        const offspringGenetics = Plant.crossoverGenetics(
            event.parentGenetics,
            partner.genetics
        );
        
        offspringGenetics.generation = Math.max(
            event.parentGenetics.generation, 
            partner.genetics.generation
        ) + 1;
        
        // Find valid spawn location within maxOffspringDistance of either parent
        const partnerGrid = this.soilManager.worldToGrid(partner.x, partner.y);
        const spawnLocation = this._findOffspringSpawnLocation(
            parentGrid,
            partnerGrid,
            event.maxOffspringDistance,
            speciesConfig,
            parentLayer
        );
        
        if (!spawnLocation) {
            // Log spawn location failure if logging enabled
            return; // No valid spawn location
        }
        
        // NEW: Apply reproduction cost to parent soil BEFORE spawning (Milestone 2)
        if (event.reproductionCost) {
            const parentSoil = this.soilManager.getSoilAt(parentGrid.x, parentGrid.y);
            if (parentSoil) {
                const newN = Math.max(0, parentSoil.nitrogen - event.reproductionCost.nitrogen);
                const newP = Math.max(0, parentSoil.phosphorus - event.reproductionCost.phosphorus);
                const newK = Math.max(0, parentSoil.potassium - event.reproductionCost.potassium);
                const newOM = Math.max(0, parentSoil.organicMatter - event.reproductionCost.organicMatter);
                
                parentSoil.updateNutrients(newN, newP, newK, newOM);
                this.soilManager.needsRefresh = true;
                
                // Optional: Log reproduction cost application

            }
        }
        
        // Spawn offspring with genetics
        const offspring = this.addPlant(spawnLocation.x, spawnLocation.y, event.species, currentDay);
        if (offspring) {
            offspring.genetics = offspringGenetics;
            offspring.generateSprite(); // Regenerate with new genetics
        }
    }
    
    /**
     * Find reproduction partner within proximity (any mature oak)
     * @param {number} gridX - Origin grid X
     * @param {number} gridY - Origin grid Y
     * @param {number} distance - Search radius in cells
     * @param {string} speciesId - Species to match
     * @param {string} layer - Layer to search
     * @returns {Plant|null} Partner plant or null
     * @private
     */
    _findProximityPartner(gridX, gridY, distance, speciesId, layer) {
        const neighbors = this.getNeighborCells(gridX, gridY, distance);
        
        // Exclude center cell (can't reproduce with self)
        for (const cell of neighbors) {
            const plant = this.getPlantAt(cell.x, cell.y, layer);
            if (!plant) continue;
            if (plant.species.id !== speciesId) continue;
            
            // Check if partner is in active reproduction stage
            const reproConfig = plant.species.reproduction?.proximityReproduction;
            if (!reproConfig) continue;
            if (!reproConfig.activeStages.includes(plant.stage)) continue;
            
            return plant; // Found valid partner
        }
        
        return null;
    }
    
    /**
     * Find valid spawn location for offspring within distance of either parent
     * @param {Object} parent1Grid - First parent grid coords {x, y}
     * @param {Object} parent2Grid - Second parent grid coords {x, y}
     * @param {number} maxDistance - Maximum distance from either parent
     * @param {Object} speciesConfig - Species configuration
     * @param {string} layer - Layer to spawn in
     * @returns {Object|null} Grid location {x, y} or null
     * @private
     */
    _findOffspringSpawnLocation(parent1Grid, parent2Grid, maxDistance, speciesConfig, layer) {
        // Combine neighbors from both parents
        const neighbors1 = this.getNeighborCells(parent1Grid.x, parent1Grid.y, maxDistance);
        const neighbors2 = this.getNeighborCells(parent2Grid.x, parent2Grid.y, maxDistance);
        
        // Union of both sets (remove duplicates)
        const candidateMap = new Map();
        for (const cell of [...neighbors1, ...neighbors2]) {
            const key = `${cell.x},${cell.y}`;
            candidateMap.set(key, cell);
        }
        
        // Filter to valid locations
        const validCandidates = Array.from(candidateMap.values()).filter(cell => {
            const soil = this.soilManager.getSoilAt(cell.x, cell.y);
            if (!soil || !soil.isPlantable || soil.isWater) return false;
            
            // Check layer availability
            const existingPlant = this.getPlantAt(cell.x, cell.y, layer);
            if (existingPlant) return false;
            
            // Check nutrient minimums for sapling
            if (speciesConfig?.environment?.nutrientRequirements) {
                const reqs = speciesConfig.environment.nutrientRequirements;
                if (soil.nitrogen < reqs.nitrogen.minimum) return false;
                if (soil.phosphorus < reqs.phosphorus.minimum) return false;
                if (soil.potassium < reqs.potassium.minimum) return false;
                if (soil.organicMatter < reqs.organicMatter.minimum) return false;
            }
            
            return true;
        });
        
        if (validCandidates.length === 0) return null;
        
        // Pick random valid location
        return validCandidates[Math.floor(Math.random() * validCandidates.length)];
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
    
    /**
     * MILESTONE 6: Perform mycorrhizal network sharing between mature trees
     * Called once per frame from update() method
     * @param {number} currentDay - Current game day
     */
    performMycorrhizalSharing(currentDay) {
        // Find all MatureTree plants with mycorrhizalNetwork enabled
        const allPlants = this.getAllPlants();
        const eligibleTrees = allPlants.filter(plant => {
            if (plant.stage !== 'MatureTree') return false;
            
            const stages = plant.species.growthStages;
            const matureStage = stages.find(s => s.name === 'MatureTree');
            return matureStage?.mycorrhizalNetwork?.enabled === true;
        });
        
        if (eligibleTrees.length < 2) {
            return; // Need at least 2 trees for sharing
        }
        
        // For each tree, check if it can share with neighbors
        eligibleTrees.forEach(tree => {
            const stages = tree.species.growthStages;
            const matureStage = stages.find(s => s.name === 'MatureTree');
            const networkConfig = matureStage.mycorrhizalNetwork;
            
            if (!networkConfig) return;
            
            // Get tree's soil
            const treeSoil = this.soilManager.getSoilAtWorld(tree.x, tree.y);
            if (!treeSoil || !treeSoil.nutrientLayers) return;
            
            // Check if tree has excess nutrients (above threshold)
            const deepLayer = treeSoil.nutrientLayers.deep;
            const thresholds = networkConfig.minimumThreshold;
            
            const hasExcessN = deepLayer.nitrogen > thresholds.nitrogen;
            const hasExcessP = deepLayer.phosphorus > thresholds.phosphorus;
            const hasExcessK = deepLayer.potassium > thresholds.potassium;
            
            if (!hasExcessN && !hasExcessP && !hasExcessK) {
                return; // Tree doesn't have excess nutrients to share
            }
            
            // Find neighboring trees within shareRadius
            const treeGrid = this.soilManager.worldToGrid(tree.x, tree.y);
            const shareRadius = networkConfig.shareRadius;
            const neighbors = [];
            
            for (let dx = -shareRadius; dx <= shareRadius; dx++) {
                for (let dy = -shareRadius; dy <= shareRadius; dy++) {
                    if (dx === 0 && dy === 0) continue; // Skip self
                    
                    const neighborPlants = this.getPlantAt(treeGrid.x + dx, treeGrid.y + dy);
                    if (neighborPlants) {
                        // Check if any plant at this location is an eligible tree
                        const neighbor = Array.isArray(neighborPlants) ? 
                            neighborPlants.find(p => p.stage === 'MatureTree') : 
                            (neighborPlants.stage === 'MatureTree' ? neighborPlants : null);
                        
                        if (neighbor) {
                            neighbors.push(neighbor);
                        }
                    }
                }
            }
            
            if (neighbors.length === 0) {
                return; // No neighbors to share with
            }
            
            // Calculate share amount and distribute to neighbors
            const sharePercentage = networkConfig.sharePercentage;
            const sharePerNeighbor = sharePercentage / neighbors.length;
            
            neighbors.forEach(neighbor => {
                const neighborSoil = this.soilManager.getSoilAtWorld(neighbor.x, neighbor.y);
                if (!neighborSoil || !neighborSoil.nutrientLayers) return;
                
                // Transfer nutrients from tree's deep layer to neighbor's deep layer
                const nShare = hasExcessN ? (deepLayer.nitrogen - thresholds.nitrogen) * sharePerNeighbor : 0;
                const pShare = hasExcessP ? (deepLayer.phosphorus - thresholds.phosphorus) * sharePerNeighbor : 0;
                const kShare = hasExcessK ? (deepLayer.potassium - thresholds.potassium) * sharePerNeighbor : 0;
                
                // Update tree's soil (reduce)
                const treeDeepN = Math.max(thresholds.nitrogen, deepLayer.nitrogen - nShare);
                const treeDeepP = Math.max(thresholds.phosphorus, deepLayer.phosphorus - pShare);
                const treeDeepK = Math.max(thresholds.potassium, deepLayer.potassium - kShare);
                const treeDeepOM = deepLayer.organicMatter;
                
                treeSoil.updateNutrientsLayered('deep', treeDeepN, treeDeepP, treeDeepK, treeDeepOM);
                
                // Update neighbor's soil (increase)
                const neighborDeep = neighborSoil.nutrientLayers.deep;
                const neighborDeepN = Math.min(100, neighborDeep.nitrogen + nShare);
                const neighborDeepP = Math.min(100, neighborDeep.phosphorus + pShare);
                const neighborDeepK = Math.min(100, neighborDeep.potassium + kShare);
                const neighborDeepOM = neighborDeep.organicMatter;
                
                neighborSoil.updateNutrientsLayered('deep', neighborDeepN, neighborDeepP, neighborDeepK, neighborDeepOM);
            });
        });
    }
    
    /**
     * Serialize all plants for saving
     * @returns {Object} Serialized plant data
     */
    serialize() {
        const plantData = [];
        
        for (const [key, layerMap] of this.plants.entries()) {
            for (const [layer, plant] of layerMap.entries()) {
                plantData.push({
                    key: key,
                    layer: layer,
                    plant: plant.serialize()
                });
            }
        }
        
        return {
            plants: plantData,
            selectedSpecies: this.selectedSpecies
        };
    }
    
    /**
     * Deserialize and restore plants from saved data
     * @param {Object} data - Saved plant data
     */
    deserialize(data) {
        if (!data) {
            console.warn('[PLANTS] No data to deserialize');
            return;
        }
        
        // Clear existing plants
        this.plants.clear();
        
        // Restore selected species
        if (data.selectedSpecies) {
            this.selectedSpecies = data.selectedSpecies;
        }
        
        // Restore plants
        let restoredCount = 0;
        
        if (data.plants && Array.isArray(data.plants)) {
            for (const entry of data.plants) {
                const plantData = entry.plant;
                
                // Get species config
                const speciesConfig = this.speciesConfigs.get(plantData.speciesId);
                if (!speciesConfig) {
                    console.warn(`[PLANTS] Unknown species: ${plantData.speciesId}, skipping`);
                    continue;
                }
                
                // Create plant with saved state
                const plant = new Plant(
                    plantData.x,
                    plantData.y,
                    speciesConfig,
                    plantData.stage,
                    plantData.stageStartDay
                );
                
                // Restore additional state
                plant.age = plantData.age ?? 0;
                plant.accumulatedGrowthDays = plantData.accumulatedGrowthDays ?? 0;
                plant.health = plantData.health ?? 1.0;
                plant.lastReproductionDay = plantData.lastReproductionDay ?? 0;
                plant.daysStunted = plantData.daysStunted ?? 0;
                plant.isStunted = plantData.isStunted ?? false;
                
                // Restore genetics if present
                if (plantData.genetics) {
                    plant.genetics = plantData.genetics;
                }
                
                // Regenerate sprite with restored state
                plant.generateSprite(plant.currentLOD);
                
                // Store in plants map using key and layer from save data
                const key = entry.key;
                const layer = entry.layer;
                
                if (!this.plants.has(key)) {
                    this.plants.set(key, new Map());
                }
                this.plants.get(key).set(layer, plant);
                
                restoredCount++;
            }
        }
        
        // Invalidate occlusion cache
        if (this.occlusionManager) {
            this.occlusionManager.invalidateCache();
        }
    }
}