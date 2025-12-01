/**
 * PlantManager - Manages plant entities and their placement in the game world
 * Handles species loading, plant creation, and interaction with the soil grid
 */
class PlantManager {
    constructor(soilManager) {
        this.soilManager = soilManager;
        this.plants = new Map(); // key: "x,y", value: Plant
        this.speciesConfigs = new Map();
        
        this.loadSpeciesConfigs();
    }
    
    async loadSpeciesConfigs() {
        try {
            const response = await fetch('./species/nettles.json');
            const nettleConfig = await response.json();
            this.speciesConfigs.set('urtica_dioica', nettleConfig);
        } catch (error) {
            console.error('Failed to load species configs:', error);
        }
    }
    
    addPlant(gridX, gridY, speciesId = 'urtica_dioica', currentDay = 0) {
        const key = `${gridX},${gridY}`;
        
        // Check if location is water tile (Milestone 2)
        const soil = this.soilManager.getSoilAt(gridX, gridY);
        if (soil && soil.isWater) {
            console.warn(`Cannot place plant at (${gridX}, ${gridY}) - water tile`);
            return null;
        }
        
        // Remove existing plant if any
        if (this.plants.has(key)) {
            this.plants.delete(key);
            return null;
        }
        
        const speciesConfig = this.speciesConfigs.get(speciesId);
        if (!speciesConfig) {
            console.warn(`Species ${speciesId} not found in loaded configs`);
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
        if (verifyGrid.x !== gridX || verifyGrid.y !== gridY) {
            console.warn(`[PLANT] Position mismatch! Intended grid (${gridX}, ${gridY}) but world (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) maps to grid (${verifyGrid.x}, ${verifyGrid.y}). Using cell center instead.`);
            // Fallback: use cell center
            const worldXSafe = cellLeft + this.soilManager.cellSize / 2;
            const worldYSafe = cellTop + this.soilManager.cellSize / 2;
            const plant = new Plant(worldXSafe, worldYSafe, speciesConfig, 'Seedling', currentDay);
            this.plants.set(key, plant);
            return plant;
        }
        
        const plant = new Plant(worldX, worldY, speciesConfig, 'Seedling', currentDay);
        this.plants.set(key, plant);
        
        return plant;
    }

    addPlantAtPosition(gridX, gridY, exactWorldX, exactWorldY, speciesId = 'urtica_dioica', currentDay = 0) {
        const key = `${gridX},${gridY}`;
        
        // Check if location is water tile (Milestone 2)
        const soil = this.soilManager.getSoilAt(gridX, gridY);
        if (soil && soil.isWater) {
            console.warn(`Cannot place plant at (${gridX}, ${gridY}) - water tile`);
            return null;
        }
        
        // Remove existing plant if any
        if (this.plants.has(key)) {
            this.plants.delete(key);
            return null;
        }
        
        const speciesConfig = this.speciesConfigs.get(speciesId);
        if (!speciesConfig) {
            console.warn(`Species ${speciesId} not found in loaded configs`);
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
        
        // Place plant at verified position
        const plant = new Plant(finalWorldX, finalWorldY, speciesConfig, 'Seedling', currentDay);
        this.plants.set(key, plant);
        
        return plant;
    }
    
    removePlant(gridX, gridY) {
        const key = `${gridX},${gridY}`;
        return this.plants.delete(key);
    }
    
    getPlantAt(gridX, gridY) {
        const key = `${gridX},${gridY}`;
        return this.plants.get(key);
    }
    
    update(gameDaysElapsed, currentDay) {
        const reproductionEvents = [];
        const plantsToRemove = [];
        
        // Update all plants and collect reproduction events and despawn flags
        for (const [key, plant] of this.plants.entries()) {
            plant.update(gameDaysElapsed, currentDay);
            
            // Check for reproduction event
            const reproEvent = plant.checkReproduction(currentDay);
            if (reproEvent) {
                reproductionEvents.push(reproEvent);
            }
            
            // Check if plant should be removed
            if (plant.shouldDespawn) {
                plantsToRemove.push(key);
            }
        }
        
        // Handle reproduction events
        reproductionEvents.forEach(event => {
            this.handleReproduction(event, currentDay);
        });
        
        // Remove despawned plants
        plantsToRemove.forEach(key => {
            this.plants.delete(key);
        });
        
    }
    
    getAllPlants() {
        return Array.from(this.plants.values());
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
        
        // Filter to only empty, plantable cells with sufficient nutrients
        const validNeighbors = neighbors.filter(cell => {
            const soil = this.soilManager.getSoilAt(cell.x, cell.y);
            if (!soil || !soil.isPlantable || soil.isWater) return false; // Skip water tiles
            if (this.getPlantAt(cell.x, cell.y)) return false;
            
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