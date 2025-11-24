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
        
        // Starvation tracking - plants die if fertility stays low too long
        this.daysStunted = 0;
        this.isStunted = false;
        
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
        
        // Track how long plant has been stunted (unable to grow due to low fertility)
        if (this.isStunted) {
            this.daysStunted += gameDaysElapsed;
            
            // Get grace period from config or use default
            const config = window.config?.world?.plants || {};
            const gracePeriod = config.stuntGracePeriod || 7;
            
            // After grace period, force plant to wither from nutrient starvation
            if (this.daysStunted >= gracePeriod && this.stage !== 'Withered') {
                this.forceWither(currentDay);
            }
        }
        
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
                    
                    if (!soil) {
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
                                break;
                            }
                        }
                    }
                }
                
                if (soil) {
                    const returns = witheredStage.nutrientReturn;
                    
                    // Get config for starvation multiplier
                    const config = window.config?.world?.plants || {};
                    const starvationMultiplier = config.starvationReturnMultiplier || 0.5;
                    
                    // If plant died from starvation, return less nutrients
                    const wasStarved = this.daysStunted > 0;
                    const returnMultiplier = wasStarved ? starvationMultiplier : 1.0;
                    
                    // Calculate new nutrient levels after decomposition
                    const newNitrogen = soil.nitrogen + returns.nitrogen * returnMultiplier;
                    const newPhosphorus = soil.phosphorus + returns.phosphorus * returnMultiplier;
                    const newPotassium = soil.potassium + returns.potassium * returnMultiplier;
                    const newOrganicMatter = soil.organicMatter + returns.organicMatter * returnMultiplier;
                    
                    // Update soil nutrients
                    soil.updateNutrients(newNitrogen, newPhosphorus, newPotassium, newOrganicMatter);
                    
                    // Invalidate texture cache to reflect visual changes
                    window.graphicsEngine.soilManager.needsRefresh = true;
                } else {
                    console.warn(`WARNING: ${this.species.commonName} at (${Math.round(this.x)}, ${Math.round(this.y)}) couldn't find soil for nutrient return (searched grid and neighbors)`);
                }
            }
            
            this.shouldDespawn = true;
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
            
            // Check if soil fertility is sufficient for growth
            const soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
            if (soil) {
                const minFertility = this.species?.environment?.minimumFertility || 0;
                if (soil.fertility < minFertility) {
                    // Mark plant as stunted - silently prevent growth (no console spam with many plants)
                    this.isStunted = true;
                    return false; // Prevent stage advancement
                } else {
                    // Soil recovered - reset stunted counter
                    this.isStunted = false;
                    this.daysStunted = 0;
                }
            }
            
            // Enhancement #1: Consume nutrients when advancing growth stage
            if (newStage.nutrientConsumption) {
                let soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
                
                // DEFENSIVE FIX: If exact position fails, search nearby cells
                if (!soil) {
                    // Convert to grid coordinates and try direct grid lookup
                    const gridCoords = window.graphicsEngine.soilManager.worldToGrid(this.x, this.y);
                    soil = window.graphicsEngine.soilManager.getSoilAt(gridCoords.x, gridCoords.y);
                    
                    if (!soil) {
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
            
            return true;
        }
        
        return false; // Already at final stage
    }
    
    /**
     * Force plant to wither due to environmental stress (low fertility, etc.)
     * @param {number} currentDay - Current game day
     */
    forceWither(currentDay) {
        // Find the Withered stage
        const witheredStage = this.species.growthStages.find(stage => stage.name === 'Withered');
        
        if (!witheredStage) {
            console.warn(`[DEATH] ${this.species.commonName} has no Withered stage, removing immediately`);
            this.shouldDespawn = true;
            return;
        }
        
        // Set to Withered stage
        this.stage = 'Withered';
        this.stageStartDay = currentDay;
        this.isStunted = false; // No longer stunted, now withering
        
        // Regenerate sprite for withered appearance
        this.generateSprite();
    }
}