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
    
    addPlant(gridX, gridY, speciesId = 'urtica_dioica') {
        const key = `${gridX},${gridY}`;
        
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
        
        // Place plant exactly at the center of the grid cell
        // This ensures visual alignment with the logical grid
        const cellCenterX = (gridX + 0.5) * this.soilManager.cellSize;
        const cellCenterY = (gridY + 0.5) * this.soilManager.cellSize;
        
        // No random offset - place exactly at cell center for precise alignment
        const worldX = cellCenterX;
        const worldY = cellCenterY;
        
        const plant = new Plant(worldX, worldY, speciesConfig);
        this.plants.set(key, plant);
        
        return plant;
    }

    addPlantAtPosition(gridX, gridY, exactWorldX, exactWorldY, speciesId = 'urtica_dioica') {
        const key = `${gridX},${gridY}`;
        
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
        
        // Place plant at exact click position
        const plant = new Plant(exactWorldX, exactWorldY, speciesConfig);
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
    
    update(deltaTime) {
        for (const plant of this.plants.values()) {
            plant.update(deltaTime);
        }
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
}