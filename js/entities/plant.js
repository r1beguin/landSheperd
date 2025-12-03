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
        
        // Initialize genetics for species that support it
        if (speciesConfig.genetics?.enabled) {
            this.genetics = Plant.generateRandomGenetics();
        } else {
            this.genetics = null;
        }
        
        // Log genetics initialization
        if (this.genetics && speciesConfig.commonName) {
            console.log(`${speciesConfig.commonName} genetics initialized: Gen ${this.genetics.generation}`);
        }
        
        // Generate initial sprite
        this.generateSprite();
    }

    /**
     * Generate random genetics for manually planted tree
     * @returns {Object} Genetics object with 9 traits (0-255) + generation
     */
    static generateRandomGenetics() {
        const config = window.config?.world?.plants?.genetics;
        const genetics = {};
        
        // Visual traits: baseline 128 ± 20% variation (102-154)
        const visualTraits = ['heightFactor', 'widthFactor', 'foliageDensity', 'trunkShape', 'colorTint'];
        for (const trait of visualTraits) {
            const variation = 128 * 0.2; // 25.6
            const min = 128 - variation; // 102.4
            const max = 128 + variation; // 153.6
            genetics[trait] = Math.round(min + Math.random() * (max - min));
        }
        
        // Nutrient traits: baseline 128 ± 15% variation (108-148)
        const nutrientTraits = ['nitrogenEfficiency', 'phosphorusEfficiency', 'potassiumEfficiency', 'organicMatterEfficiency'];
        for (const trait of nutrientTraits) {
            const variation = 128 * 0.15; // 19.2
            const min = 128 - variation; // 108.8
            const max = 128 + variation; // 147.2
            genetics[trait] = Math.round(min + Math.random() * (max - min));
        }
        
        genetics.generation = 0;
        
        return genetics;
    }

    /**
     * Create offspring genetics from two parents with mutation
     * Uses Mendelian inheritance (simple average) with random mutations
     * @param {Object} parent1Genetics - First parent's genetics
     * @param {Object} parent2Genetics - Second parent's genetics
     * @returns {Object} Offspring genetics with inherited and mutated traits
     */
    static crossoverGenetics(parent1Genetics, parent2Genetics) {
        const config = window.config?.world?.plants?.genetics;
        const mutationChance = config?.inheritance?.mutationChance || 0.1;
        const mutationStrength = config?.inheritance?.mutationStrength || 0.15;
        
        const offspring = {};
        
        // All genetic traits (9 total)
        const traits = [
            'heightFactor', 'widthFactor', 'foliageDensity', 'trunkShape', 'colorTint',
            'nitrogenEfficiency', 'phosphorusEfficiency', 'potassiumEfficiency', 'organicMatterEfficiency'
        ];
        
        for (const trait of traits) {
            // Step 1: Mendelian inheritance - average parents
            let value = (parent1Genetics[trait] + parent2Genetics[trait]) / 2;
            
            // Step 2: Mutation - chance to shift value by ±mutationStrength
            if (Math.random() < mutationChance) {
                const maxDelta = 255 * mutationStrength; // ±15% of full range
                const delta = (Math.random() * 2 - 1) * maxDelta; // -38 to +38
                value += delta;
                
                // Step 3: Outlier mutation - rare chance for extreme shifts
                if (Math.random() < 0.05) { // 5% of mutations are outliers
                    value += delta * 2; // Total 3x mutation strength
                }
            }
            
            // Clamp to 0-255 range
            offspring[trait] = Math.max(0, Math.min(255, Math.round(value)));
        }
        
        // Metadata handled by caller
        offspring.generation = 0; // Placeholder, set by caller
        
        return offspring;
    }

    /**
     * Convert genetic value (0-255) to trait multiplier
     * @param {number} geneticValue - 0-255
     * @returns {number} Multiplier (0.5-1.5)
     */
    geneticToMultiplier(geneticValue) {
        return 0.5 + (geneticValue / 255) * 1.0;
    }

    /**
     * Get visual multiplier for procedural generation
     * @param {string} trait - Trait name
     * @returns {number} Multiplier or hue shift value
     */
    getVisualMultiplier(trait) {
        if (!this.genetics) return trait === 'colorTint' ? 0 : 1.0;
        
        const config = window.config?.world?.plants?.genetics?.visualVariation;
        const ranges = {
            heightFactor: config?.heightRange || [0.7, 1.3],
            widthFactor: config?.widthRange || [0.7, 1.3],
            foliageDensity: config?.foliageRange || [0.6, 1.4],
            trunkShape: [0.7, 1.3],
            colorTint: config?.colorTintRange || [-20, 20]
        };
        
        const range = ranges[trait];
        if (!range) return trait === 'colorTint' ? 0 : 1.0;
        
        const normalized = this.genetics[trait] / 255; // 0.0-1.0
        
        // Color tint is additive (hue shift in degrees), not multiplicative
        if (trait === 'colorTint') {
            return range[0] + normalized * (range[1] - range[0]);
        }
        
        return range[0] + normalized * (range[1] - range[0]);
    }

    generateSprite() {
        // Clear the WebGL texture cache when regenerating sprite
        if (this.webglTexture) {
            this.webglTexture = null; // Clear cache to force texture recreation
        }
        
        // Use the global PlantGenerator to create the sprite with current growth stage
        if (window.PlantGenerator) {
            // Pass genetics to generator if species supports it
            this.texture = window.PlantGenerator.generatePlantSprite(
                this.species, 
                this.stage,
                this.genetics  // NEW: Pass genetics (null for non-genetic species)
            );
            
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
     * Check if plant should attempt reproduction (rhizome cloning or seed production)
     * @param {number} currentDay - Current game day
     * @returns {Object|null} Reproduction event data or null
     */
    checkReproduction(currentDay) {
        if (!this.species.reproduction) {
            return null;
        }
        
        // Check for rhizome cloning (e.g., nettles)
        if (this.species.reproduction.rhizomeCloning) {
            return this._checkRhizomeCloning(currentDay);
        }
        
        // Check for seed production (e.g., clover)
        if (this.species.reproduction.seedProduction) {
            return this._checkSeedProduction(currentDay);
        }
        
        // Check for proximity reproduction (NEW - oak)
        if (this.species.reproduction.proximityReproduction) {
            return this._checkProximityReproduction(currentDay);
        }
        
        return null;
    }
    
    /**
     * Check rhizome cloning reproduction (spreads via underground runners)
     * @param {number} currentDay - Current game day
     * @returns {Object|null} Reproduction event data or null
     * @private
     */
    _checkRhizomeCloning(currentDay) {
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
     * Check seed production reproduction (spreads via seeds/dispersal)
     * @param {number} currentDay - Current game day
     * @returns {Object|null} Reproduction event data or null
     * @private
     */
    _checkSeedProduction(currentDay) {
        const seedConfig = this.species.reproduction.seedProduction;
        
        // Check if reproduction is enabled
        if (!seedConfig.enabled) {
            return null;
        }
        
        // Check if current stage is active for reproduction
        if (!seedConfig.activeStages.includes(this.stage)) {
            return null;
        }
        
        // Check if enough time has passed since last reproduction attempt
        const daysSinceLastReproduction = currentDay - this.lastReproductionDay;
        if (daysSinceLastReproduction < seedConfig.checkIntervalDays) {
            return null;
        }
        
        // Update last reproduction day BEFORE rolling for success
        this.lastReproductionDay = currentDay;
        
        // Roll for success (plant produces seeds)
        if (Math.random() > seedConfig.successChance) {
            return null;
        }
        
        // Success! Return reproduction event data for PlantManager to handle
        return {
            type: 'seedProduction',
            parentX: this.x,
            parentY: this.y,
            maxDistance: seedConfig.maxDistance,
            germinationChance: seedConfig.germinationChance || 1.0, // Chance seed germinates after dispersal
            species: this.species.id
        };
    }
    
    /**
     * Check proximity reproduction (requires partner within distance)
     * @param {number} currentDay - Current game day
     * @returns {Object|null} Reproduction event data or null
     * @private
     */
    _checkProximityReproduction(currentDay) {
        const proximityConfig = this.species.reproduction.proximityReproduction;
        
        if (!proximityConfig.enabled) return null;
        if (!proximityConfig.activeStages.includes(this.stage)) return null;
        
        const daysSinceLast = currentDay - this.lastReproductionDay;
        if (daysSinceLast < proximityConfig.checkIntervalDays) return null;
        
        // Update last reproduction day BEFORE rolling for success
        this.lastReproductionDay = currentDay;
        
        if (Math.random() > proximityConfig.successChance) return null;
        
        // Return event for PlantManager to find partner
        return {
            type: 'proximityReproduction',
            parentX: this.x,
            parentY: this.y,
            parentGenetics: this.genetics,
            proximityDistance: proximityConfig.proximityDistance,
            maxOffspringDistance: proximityConfig.maxOffspringDistance,
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
        totalScore += this.nutrientScore(soil.nitrogen, reqs.nitrogen, 'nitrogen') * modifiers.nitrogen.weight;
        totalScore += this.nutrientScore(soil.phosphorus, reqs.phosphorus, 'phosphorus') * modifiers.phosphorus.weight;
        totalScore += this.nutrientScore(soil.potassium, reqs.potassium, 'potassium') * modifiers.potassium.weight;
        totalScore += this.nutrientScore(soil.organicMatter, reqs.organicMatter, 'organicMatter') * modifiers.organicMatter.weight;
        
        return totalScore;
    }
    
    /**
     * Calculate individual nutrient score (0.0 to 1.0)
     * @param {number} currentValue - Current nutrient level in soil
     * @param {Object} requirement - Requirement object with minimum and optimal
     * @param {string} nutrientType - Nutrient type for genetic modifiers (optional)
     * @returns {number} Score from 0.0 (below minimum) to 1.0 (optimal or above)
     */
    nutrientScore(currentValue, requirement, nutrientType = null) {
        let effectiveMinimum = requirement.minimum;
        let effectiveOptimal = requirement.optimal;
        
        // Trees with better genetics tolerate lower nutrient levels
        if (this.genetics && nutrientType) {
            const geneticMap = {
                'nitrogen': this.genetics.nitrogenEfficiency,
                'phosphorus': this.genetics.phosphorusEfficiency,
                'potassium': this.genetics.potassiumEfficiency,
                'organicMatter': this.genetics.organicMatterEfficiency
            };
            
            const geneticValue = geneticMap[nutrientType];
            if (geneticValue !== undefined) {
                // Efficiency: 0.8-1.2 range
                // Higher genetic value = more efficient = lower requirements (0.8x)
                // Lower genetic value = less efficient = higher requirements (1.2x)
                const efficiencyMultiplier = 2.0 - this.geneticToMultiplier(geneticValue);
                effectiveMinimum *= efficiencyMultiplier;
                effectiveOptimal *= efficiencyMultiplier;
            }
        }
        
        if (currentValue < effectiveMinimum) return 0.0;
        if (currentValue >= effectiveOptimal) return 1.0;
        
        const range = effectiveOptimal - effectiveMinimum;
        const progress = (currentValue - effectiveMinimum) / range;
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
                    
                    // Apply genetic efficiency modifiers (better genes = less consumption)
                    let nConsumption = consumption.nitrogen;
                    let pConsumption = consumption.phosphorus;
                    let kConsumption = consumption.potassium;
                    let omConsumption = consumption.organicMatter;
                    
                    if (this.genetics) {
                        // Efficiency: 0.8-1.2 range
                        // Higher genetic value (200+) = more efficient = consumes less (0.8x)
                        // Lower genetic value (60-) = less efficient = consumes more (1.2x)
                        // Formula: 2.0 - geneticToMultiplier gives inverse (high gene = low multiplier)
                        const nEff = 2.0 - this.geneticToMultiplier(this.genetics.nitrogenEfficiency);
                        const pEff = 2.0 - this.geneticToMultiplier(this.genetics.phosphorusEfficiency);
                        const kEff = 2.0 - this.geneticToMultiplier(this.genetics.potassiumEfficiency);
                        const omEff = 2.0 - this.geneticToMultiplier(this.genetics.organicMatterEfficiency);
                        
                        nConsumption *= nEff;
                        pConsumption *= pEff;
                        kConsumption *= kEff;
                        omConsumption *= omEff;
                    }
                    
                    // Calculate new nutrient levels after modified consumption
                    const newNitrogen = soil.nitrogen - nConsumption;
                    const newPhosphorus = soil.phosphorus - pConsumption;
                    const newPotassium = soil.potassium - kConsumption;
                    const newOrganicMatter = soil.organicMatter - omConsumption;
                    
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