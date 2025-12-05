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
        
        this.loadSpeciesConfigs();
    }
    
    async loadSpeciesConfigs() {
        try {
            // Initialize schema loader
            this.schemaLoader = new SchemaLoader();
            this.speciesSchema = await this.schemaLoader.loadSchema('schemas/species.schema.json');
            
            // Load and validate each species
            await this.loadSpecies('./species/nettles.json', 'urtica_dioica');
            await this.loadSpecies('./species/oak.json', 'quercus_robur');
            await this.loadSpecies('./species/clover.json', 'trifolium_repens');
            
            console.log(`PlantManager loaded ${this.speciesConfigs.size} species: ${Array.from(this.speciesConfigs.keys()).join(', ')}`);
        } catch (error) {
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
                
                // Optional: Log reproduction cost application
                const config = window.config?.world?.plants?.reproduction;
                if (config?.enableLogging) {
                    console.log(`[REPRO COST] ${speciesConfig.commonName} rhizome: -N${event.reproductionCost.nitrogen.toFixed(1)} -P${event.reproductionCost.phosphorus.toFixed(1)} -K${event.reproductionCost.potassium.toFixed(1)} -OM${event.reproductionCost.organicMatter.toFixed(1)}`);
                }
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
                
                // Optional: Log reproduction cost application
                const config = window.config?.world?.plants?.reproduction;
                if (config?.enableLogging) {
                    console.log(`[REPRO COST] ${speciesConfig.commonName} seed: -N${event.reproductionCost.nitrogen.toFixed(1)} -P${event.reproductionCost.phosphorus.toFixed(1)} -K${event.reproductionCost.potassium.toFixed(1)} -OM${event.reproductionCost.organicMatter.toFixed(1)}`);
                }
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
                const config = window.config?.world?.plants?.reproduction;
                if (config?.enableLogging) {
                    console.log(`[REPRO COST] ${speciesConfig.commonName} acorn: -N${event.reproductionCost.nitrogen.toFixed(1)} -P${event.reproductionCost.phosphorus.toFixed(1)} -K${event.reproductionCost.potassium.toFixed(1)} -OM${event.reproductionCost.organicMatter.toFixed(1)}`);
                }
            }
        }
        
        // Spawn offspring with genetics
        const offspring = this.addPlant(spawnLocation.x, spawnLocation.y, event.species, currentDay);
        if (offspring) {
            offspring.genetics = offspringGenetics;
            offspring.generateSprite(); // Regenerate with new genetics
            
            const config = window.config?.world?.plants?.reproduction;
            if (config?.enableLogging) {
                console.log(`Oak reproduction: Gen ${offspringGenetics.generation} sapling at (${spawnLocation.x}, ${spawnLocation.y})`);
            }
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
}