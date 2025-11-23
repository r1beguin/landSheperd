/**
 * Plant entity - Represents a plant instance in the game world
 * Handles plant state, sprite generation, and growth lifecycle
 */
class Plant {
    constructor(x, y, speciesConfig, stage = 'Seedling', currentDay = 0) {
        this.x = x;
        this.y = y;
        this.species = speciesConfig;
        this.stage = stage;
        this.age = 0; // Age in game days
        this.stageStartDay = currentDay; // Game day when this stage started
        this.health = 1.0;
        this.texture = null;
        this.webglTexture = null; // Cache for WebGL texture
        this.width = 20;
        this.height = 20;
        
        // Reproduction tracking
        this.lastReproductionDay = currentDay;
        this.shouldDespawn = false; // Flag for removal by manager
        
        // Generate initial sprite
        this.generateSprite();
    }

    generateSprite() {
        // Clear the WebGL texture cache when regenerating sprite
        if (this.webglTexture) {
            this.webglTexture = null; // Clear cache to force texture recreation
        }
        
        // Use the global PlantGenerator to create the sprite with current growth stage
        if (window.PlantGenerator) {
            this.texture = window.PlantGenerator.generatePlantSprite(this.species, this.stage);
        }
    }

    update(gameDaysElapsed, currentDay) {
        // Update age based on game days elapsed
        this.age += gameDaysElapsed;
        
        // Check if we should advance to next growth stage
        this.checkGrowthAdvancement(currentDay);
        
        // Note: checkReproduction is called by PlantManager, not here
        // to avoid double-calling and state issues
        
        // Check if withered plant should despawn
        this.checkDespawn(currentDay);
    }
    
    /**
     * Check if plant should advance to next growth stage
     * @param {number} currentDay - Current game day
     */
    checkGrowthAdvancement(currentDay) {
        const stages = this.species.growthStages;
        const currentStageIndex = stages.findIndex(stage => stage.name === this.stage);
        
        if (currentStageIndex === -1) {
            console.warn(`Unknown growth stage: ${this.stage}`);
            return;
        }
        
        const currentStageConfig = stages[currentStageIndex];
        
        // Check if there's a next stage
        if (currentStageIndex < stages.length - 1) {
            const daysInCurrentStage = currentDay - this.stageStartDay;
            
            // If daysToGrow is defined and enough days have passed, advance
            if (currentStageConfig.daysToGrow !== null && 
                currentStageConfig.daysToGrow !== undefined &&
                daysInCurrentStage >= currentStageConfig.daysToGrow) {
                
                // Advance to next growth stage
                this.advanceGrowthStage(currentDay);
            }
        }
    }
    
    /**
     * Check if plant should attempt reproduction (rhizome cloning)
     * @param {number} currentDay - Current game day
     * @returns {Object|null} Reproduction event data or null
     */
    checkReproduction(currentDay) {
        // Check if species supports rhizome cloning
        if (!this.species.reproduction || !this.species.reproduction.rhizomeCloning) {
            return null;
        }
        
        const rhizomeConfig = this.species.reproduction.rhizomeCloning;
        
        // Check if reproduction is enabled
        if (!rhizomeConfig.enabled) {
            return null;
        }
        
        // Check if current stage is active for reproduction
        if (!rhizomeConfig.activeStages.includes(this.stage)) {
            return null;
        }
        
        // Check if enough time has passed since last reproduction attempt
        const daysSinceLastReproduction = currentDay - this.lastReproductionDay;
        if (daysSinceLastReproduction < rhizomeConfig.checkIntervalDays) {
            return null;
        }
        
        // Update last reproduction day BEFORE rolling for success
        // This prevents multiple attempts in the same frame
        this.lastReproductionDay = currentDay;
        
        // Roll for success
        if (Math.random() > rhizomeConfig.successChance) {
            return null;
        }
        
        // Success! Return reproduction event data for PlantManager to handle
        return {
            type: 'rhizomeCloning',
            parentX: this.x,
            parentY: this.y,
            maxDistance: rhizomeConfig.maxDistance,
            species: this.species.id
        };
    }
    
    /**
     * Check if withered plant should despawn
     * @param {number} currentDay - Current game day
     */
    checkDespawn(currentDay) {
        // Only check if in Withered stage
        if (this.stage !== 'Withered') {
            return;
        }
        
        const stages = this.species.growthStages;
        const witheredStage = stages.find(stage => stage.name === 'Withered');
        
        if (!witheredStage || witheredStage.daysToGrow === null) {
            return;
        }
        
        const daysInWithered = currentDay - this.stageStartDay;
        
        if (daysInWithered >= witheredStage.daysToGrow) {
            // Enhancement #4: Return nutrients to soil before despawning
            if (witheredStage.nutrientReturn && !this.shouldDespawn) {
                let soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
                
                // DEFENSIVE FIX: If exact position fails, search nearby cells
                if (!soil) {
                    // Convert to grid coordinates and try direct grid lookup
                    const gridCoords = window.graphicsEngine.soilManager.worldToGrid(this.x, this.y);
                    soil = window.graphicsEngine.soilManager.getSoilAt(gridCoords.x, gridCoords.y);
                    
                    if (soil) {
                        console.log(`[DECOMP] Found soil using direct grid lookup at (${gridCoords.x}, ${gridCoords.y}) for plant at world (${Math.round(this.x)}, ${Math.round(this.y)})`);
                    } else {
                        // Last resort: check immediate neighbors
                        const neighbors = [
                            [gridCoords.x - 1, gridCoords.y],
                            [gridCoords.x + 1, gridCoords.y],
                            [gridCoords.x, gridCoords.y - 1],
                            [gridCoords.x, gridCoords.y + 1]
                        ];
                        
                        for (const [nx, ny] of neighbors) {
                            soil = window.graphicsEngine.soilManager.getSoilAt(nx, ny);
                            if (soil) {
                                console.log(`[DECOMP] Found soil at neighbor (${nx}, ${ny}) for plant at world (${Math.round(this.x)}, ${Math.round(this.y)})`);
                                break;
                            }
                        }
                    }
                }
                
                if (soil) {
                    const returns = witheredStage.nutrientReturn;
                    
                    // Calculate new nutrient levels after decomposition
                    const newNitrogen = soil.nitrogen + returns.nitrogen;
                    const newPhosphorus = soil.phosphorus + returns.phosphorus;
                    const newPotassium = soil.potassium + returns.potassium;
                    const newOrganicMatter = soil.organicMatter + returns.organicMatter;
                    
                    // Update soil nutrients
                    soil.updateNutrients(newNitrogen, newPhosphorus, newPotassium, newOrganicMatter);
                    
                    // Invalidate texture cache to reflect visual changes
                    window.graphicsEngine.soilManager.needsRefresh = true;
                    
                    console.log(`[DECOMP] ${this.species.commonName} at (${Math.round(this.x)}, ${Math.round(this.y)}) decomposed, returning nutrients: N:${returns.nitrogen}, P:${returns.phosphorus}, K:${returns.potassium}, OM:${returns.organicMatter}`);
                } else {
                    console.warn(`WARNING: ${this.species.commonName} at (${Math.round(this.x)}, ${Math.round(this.y)}) couldn't find soil for nutrient return (searched grid and neighbors)`);
                }
            }
            
            this.shouldDespawn = true;
            console.log(`[DECOMP] ${this.species.commonName} has fully decomposed and will despawn`);
        }
    }

    getRenderData() {
        return {
            x: this.x - this.width / 2,  // Center the plant sprite on its position
            y: this.y - this.height / 2, // Center the plant sprite on its position
            width: this.width,
            height: this.height,
            texture: this.texture,
            color: [1, 1, 1, 1]
        };
    }

    // Method to check if this plant can be rendered with texture shader
    hasTexture() {
        return this.texture !== null;
    }

    // Return render type for batching system
    getRenderType() {
        return 'plant';
    }

    // Method to advance to next growth stage
    advanceGrowthStage(currentDay = null) {
        const stages = this.species.growthStages;
        const currentIndex = stages.findIndex(stage => stage.name === this.stage);
        
        if (currentIndex < stages.length - 1) {
            const newStage = stages[currentIndex + 1];
            
            // Enhancement #1: Consume nutrients when advancing growth stage
            if (newStage.nutrientConsumption) {
                let soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
                
                // DEFENSIVE FIX: If exact position fails, search nearby cells
                if (!soil) {
                    // Convert to grid coordinates and try direct grid lookup
                    const gridCoords = window.graphicsEngine.soilManager.worldToGrid(this.x, this.y);
                    soil = window.graphicsEngine.soilManager.getSoilAt(gridCoords.x, gridCoords.y);
                    
                    if (soil) {
                        console.log(`[NUTRIENT] Found soil using direct grid lookup at (${gridCoords.x}, ${gridCoords.y}) for plant at world (${Math.round(this.x)}, ${Math.round(this.y)})`);
                    } else {
                        // Last resort: check immediate neighbors
                        const neighbors = [
                            [gridCoords.x - 1, gridCoords.y],
                            [gridCoords.x + 1, gridCoords.y],
                            [gridCoords.x, gridCoords.y - 1],
                            [gridCoords.x, gridCoords.y + 1]
                        ];
                        
                        for (const [nx, ny] of neighbors) {
                            soil = window.graphicsEngine.soilManager.getSoilAt(nx, ny);
                            if (soil) {
                                console.log(`[NUTRIENT] Found soil at neighbor (${nx}, ${ny}) for plant at world (${Math.round(this.x)}, ${Math.round(this.y)})`);
                                break;
                            }
                        }
                    }
                }
                
                if (soil) {
                    const consumption = newStage.nutrientConsumption;
                    
                    // Calculate new nutrient levels after consumption
                    const newNitrogen = soil.nitrogen - consumption.nitrogen;
                    const newPhosphorus = soil.phosphorus - consumption.phosphorus;
                    const newPotassium = soil.potassium - consumption.potassium;
                    const newOrganicMatter = soil.organicMatter - consumption.organicMatter;
                    
                    // Update soil nutrients
                    soil.updateNutrients(newNitrogen, newPhosphorus, newPotassium, newOrganicMatter);
                    
                    // Invalidate texture cache to reflect visual changes
                    window.graphicsEngine.soilManager.needsRefresh = true;
                    
                    console.log(`[NUTRIENT] ${this.species.commonName} at (${Math.round(this.x)}, ${Math.round(this.y)}) consumed nutrients: N:${consumption.nitrogen}, P:${consumption.phosphorus}, K:${consumption.potassium}, OM:${consumption.organicMatter}`);
                } else {
                    console.warn(`WARNING: ${this.species.commonName} at (${Math.round(this.x)}, ${Math.round(this.y)}) couldn't find soil for nutrient consumption (searched grid and neighbors)`);
                }
            }
            
            this.stage = newStage.name;
            
            // Update stage start day if provided
            if (currentDay !== null) {
                this.stageStartDay = currentDay;
            }
            
            this.generateSprite(); // Regenerate sprite for new stage
            
            const daysToNext = newStage.daysToGrow;
            if (daysToNext !== null) {
                console.log(`[GROWTH] ${this.species.commonName} grew to ${this.stage}! Next stage in ${daysToNext} game days (${daysToNext * 10}s at 1x speed)`);
            } else {
                console.log(`[GROWTH] ${this.species.commonName} reached final stage: ${this.stage}`);
            }
            return true;
        }
        
        return false; // Already at final stage
    }
}