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
        this.accumulatedGrowthDays = 0; // Tracks growth progress with rate modifiers
        this.health = 1.0;
        this.texture = null;
        this.webglTexture = null; // Cache for WebGL texture
        
        // Set dimensions from species config if available
        const dimensions = speciesConfig.appearance?.dimensions;
        this.width = dimensions?.width || 20;
        this.height = dimensions?.height || 20;
        
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
            
            // Update dimensions from generated sprite
            if (this.texture) {
                this.width = this.texture.width;
                this.height = this.texture.height;
            }
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
        } else {
            // Apply growth rate modifier if plant is not stunted
            const growthRate = this.calculateGrowthRate();
            this.accumulatedGrowthDays += gameDaysElapsed * growthRate;
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
            // Use accumulated growth days (modified by nutrient quality)
            if (currentStageConfig.daysToGrow !== null && 
                currentStageConfig.daysToGrow !== undefined &&
                this.accumulatedGrowthDays >= currentStageConfig.daysToGrow) {
                
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
                    
                    // Calculate actual returns after multiplier
                    const actualReturns = {
                        nitrogen: returns.nitrogen * returnMultiplier,
                        phosphorus: returns.phosphorus * returnMultiplier,
                        potassium: returns.potassium * returnMultiplier,
                        organicMatter: returns.organicMatter * returnMultiplier
                    };
                    
                    // Calculate new nutrient levels after decomposition
                    const newNitrogen = soil.nitrogen + actualReturns.nitrogen;
                    const newPhosphorus = soil.phosphorus + actualReturns.phosphorus;
                    const newPotassium = soil.potassium + actualReturns.potassium;
                    const newOrganicMatter = soil.organicMatter + actualReturns.organicMatter;
                    
                    // Update soil nutrients
                    soil.updateNutrients(newNitrogen, newPhosphorus, newPotassium, newOrganicMatter);
                    
                    // PHASE 2: Mark this area for localized decomposition
                    const soilManager = window.graphicsEngine?.soilManager;
                    if (soilManager && soilManager.markCellForDecomposition) {
                        soilManager.markCellForDecomposition(Math.round(soil.gridX), Math.round(soil.gridY));
                    }
                    
                    // Invalidate texture cache to reflect visual changes
                    window.graphicsEngine.soilManager.needsRefresh = true;
                } else {
                    console.warn(`WARNING: ${this.species.commonName} at (${Math.round(this.x)}, ${Math.round(this.y)}) couldn't find soil for nutrient return (searched grid and neighbors)`);
                }
            }
            
            this.shouldDespawn = true;
        }
    }

    /**
     * Calculate growth rate based on current nutrient availability
     * @returns {number} Growth rate multiplier (0.0 to 1.0)
     */
    calculateGrowthRate() {
        // Get current soil nutrients
        const soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
        if (!soil) return 1.0; // Default rate if soil not found
        
        // Get current stage config
        const stages = this.species.growthStages;
        const currentStageIndex = stages.findIndex(stage => stage.name === this.stage);
        if (currentStageIndex === -1) return 1.0;
        
        const currentStageConfig = stages[currentStageIndex];
        const modifiers = currentStageConfig.growthModifiers;
        
        // If no modifiers, use full speed
        if (!modifiers) return 1.0;
        
        const reqs = this.species.environment.nutrientRequirements;
        if (!reqs) return 1.0;
        
        // Calculate weighted growth rate
        let totalScore = 0;
        totalScore += this.nutrientScore(soil.nitrogen, reqs.nitrogen) * modifiers.nitrogen.weight;
        totalScore += this.nutrientScore(soil.phosphorus, reqs.phosphorus) * modifiers.phosphorus.weight;
        totalScore += this.nutrientScore(soil.potassium, reqs.potassium) * modifiers.potassium.weight;
        totalScore += this.nutrientScore(soil.organicMatter, reqs.organicMatter) * modifiers.organicMatter.weight;
        
        return totalScore;
    }
    
    /**
     * Calculate individual nutrient score (0.0 to 1.0)
     * @param {number} currentValue - Current nutrient level in soil
     * @param {Object} requirement - Requirement object with minimum and optimal
     * @returns {number} Score from 0.0 (below minimum) to 1.0 (optimal or above)
     */
    nutrientScore(currentValue, requirement) {
        if (currentValue < requirement.minimum) return 0.0; // Below minimum
        if (currentValue >= requirement.optimal) return 1.0; // At or above optimal
        
        // Linear interpolation between minimum and optimal
        const range = requirement.optimal - requirement.minimum;
        const progress = (currentValue - requirement.minimum) / range;
        return progress;
    }

    /**
     * Calculate visual tint color based on nutrient status
     * Returns RGB tint multiplier based on most limiting nutrient
     * @returns {Array} [r, g, b, a] color multiplier (0.0-1.0 each)
     */
    calculateNutrientTint() {
        // Get current soil nutrients
        const soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
        if (!soil) return [1, 1, 1, 1]; // Default - no tint
        
        // Get nutrient requirements
        const reqs = this.species?.environment?.nutrientRequirements;
        if (!reqs) return [1, 1, 1, 1]; // No requirements - no tint
        
        // Calculate individual nutrient scores
        const nScore = this.nutrientScore(soil.nitrogen, reqs.nitrogen);
        const pScore = this.nutrientScore(soil.phosphorus, reqs.phosphorus);
        const kScore = this.nutrientScore(soil.potassium, reqs.potassium);
        const omScore = this.nutrientScore(soil.organicMatter, reqs.organicMatter);
        
        // Find most limiting nutrient (Liebig's Law - visual edition)
        const minScore = Math.min(nScore, pScore, kScore, omScore);
        
        // Determine which nutrient is most limiting
        let limitingNutrient = 'none';
        if (minScore < 1.0) {
            if (nScore === minScore) limitingNutrient = 'nitrogen';
            else if (pScore === minScore) limitingNutrient = 'phosphorus';
            else if (kScore === minScore) limitingNutrient = 'potassium';
            else if (omScore === minScore) limitingNutrient = 'organicMatter';
        }
        
        // Calculate base tint based on limiting nutrient
        let r = 1.0, g = 1.0, b = 1.0;
        
        // Deficiency intensity (0.0 = optimal, 1.0 = at minimum)
        const deficiency = 1.0 - minScore;
        
        switch (limitingNutrient) {
            case 'nitrogen':
                // Nitrogen deficiency: pale/yellow leaves
                // Reduce green slightly, increase red/yellow tint
                r = 1.0;
                g = 1.0 - (deficiency * 0.3); // Reduce green by up to 30%
                b = 1.0 - (deficiency * 0.4); // Reduce blue by up to 40%
                break;
                
            case 'phosphorus':
                // Phosphorus deficiency: purple/reddish tint
                // Increase red and blue, reduce green
                r = 1.0;
                g = 1.0 - (deficiency * 0.4); // Reduce green by up to 40%
                b = 1.0 - (deficiency * 0.1); // Slight blue reduction for purple
                break;
                
            case 'potassium':
                // Potassium deficiency: brown/yellow edges
                // Add red, reduce green and blue
                r = 1.0;
                g = 1.0 - (deficiency * 0.35); // Reduce green by up to 35%
                b = 1.0 - (deficiency * 0.5); // Reduce blue by up to 50%
                break;
                
            case 'organicMatter':
                // Organic matter deficiency: dull, desaturated
                // Reduce overall saturation/brightness
                const desaturation = 1.0 - (deficiency * 0.25); // Up to 25% darker
                r = desaturation;
                g = desaturation;
                b = desaturation;
                break;
                
            default:
                // Optimal - full vibrant color
                r = 1.0;
                g = 1.0;
                b = 1.0;
                break;
        }
        
        return [r, g, b, 1.0];
    }

    /**
     * Get the layer this plant occupies
     * @returns {string} Layer name: "bottom", "middle", or "top"
     */
    getLayer() {
        return this.species.layer || "middle";
    }

    /**
     * Calculate render Y offset based on layer for visual stacking
     * @returns {number} Y offset in pixels
     */
    getRenderOffset() {
        const config = window.config?.world?.plants?.layers;
        if (!config || !config.enabled) return 0;
        
        const offsets = config.renderOffsets || {bottom: 0, middle: 5, top: 15};
        const layer = this.getLayer();
        return offsets[layer] || 0;
    }

    /**
     * Check if this plant casts shade on lower layers
     * @returns {boolean} True if plant casts shade
     */
    castsShade() {
        const lightCasting = this.species.environment?.lightCasting;
        if (!lightCasting || !lightCasting.enabled) return false;
        
        // Only cast shade in specific growth stages
        if (lightCasting.activeStages && !lightCasting.activeStages.includes(this.stage)) {
            return false;
        }
        
        return true;
    }

    /**
     * Get light requirement for this species (0.0 to 1.0)
     * @returns {number} Light requirement
     */
    getLightRequirement() {
        return this.species.environment?.lightRequirement || 0.5;
    }

    /**
     * Get shade strength this plant casts (0.0 to 1.0)
     * @returns {number} Shade strength, 0 if doesn't cast shade
     */
    getShadeStrength() {
        if (!this.castsShade()) return 0;
        return this.species.environment?.lightCasting?.shadeStrength || 0;
    }

    /**
     * Get shade radius in grid cells
     * @returns {number} Radius in cells
     */
    getShadeRadius() {
        if (!this.castsShade()) return 0;
        return this.species.environment?.lightCasting?.radius || 0;
    }

    getRenderData() {
        const yOffset = this.getRenderOffset();
        return {
            x: this.x - this.width / 2,  // Center horizontally
            y: this.y - this.height - yOffset, // Anchor at bottom (plant "stands" on ground)
            width: this.width,
            height: this.height,
            texture: this.texture,
            tint: this.calculateNutrientTint(),
            layer: this.getLayer() // Add layer info for rendering system
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
            
            // Check if soil nutrients are sufficient for growth
            const soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
            if (soil && this.species?.environment?.nutrientRequirements) {
                const reqs = this.species.environment.nutrientRequirements;
                
                // Check each nutrient individually
                const insufficientNutrients = [];
                if (soil.nitrogen < reqs.nitrogen.minimum) insufficientNutrients.push('N');
                if (soil.phosphorus < reqs.phosphorus.minimum) insufficientNutrients.push('P');
                if (soil.potassium < reqs.potassium.minimum) insufficientNutrients.push('K');
                if (soil.organicMatter < reqs.organicMatter.minimum) insufficientNutrients.push('OM');
                
                if (insufficientNutrients.length > 0) {
                    // Mark plant as stunted - prevent growth due to specific nutrient deficiencies
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
            
            // Reset accumulated growth days for new stage
            this.accumulatedGrowthDays = 0;
            
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