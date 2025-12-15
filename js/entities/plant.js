/**
 * Plant entity - Represents a plant instance in the game world
 * Handles plant state, sprite generation, and growth lifecycle
 */
class Plant {
    constructor(x, y, speciesConfig, stage = 'Seedling', currentDay = 0) {
        // Store grid coordinates for isometric conversion
        // x and y are world coordinates, convert to grid
        const cellSize = window.config?.world?.map?.cellSize || 20;
        this.gridX = Math.floor(x / cellSize);
        this.gridY = Math.floor(y / cellSize);
        
        // Keep world coordinates for legacy compatibility
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
        
        // Set base dimensions from species config (world-space size, LOD-independent)
        const dimensions = speciesConfig.appearance?.dimensions;
        this.baseWidth = dimensions?.width || 20;
        this.baseHeight = dimensions?.height || 20;
        
        // Render dimensions (used by RenderSystem, always equals base dimensions)
        this.width = this.baseWidth;
        this.height = this.baseHeight;
        
        // Reproduction tracking
        this.lastReproductionDay = currentDay;
        this.shouldDespawn = false; // Flag for removal by manager
        
        // Starvation tracking - plants die if fertility stays low too long
        this.daysStunted = 0;
        this.isStunted = false;
        
        // LOD tracking (Milestone 4)
        this.currentLOD = 'medium'; // Default LOD level
        this.lastRenderedLOD = 'medium'; // Track last LOD we generated sprite for
        
        // Initialize genetics for species that support it
        if (speciesConfig.genetics?.enabled) {
            this.genetics = Plant.generateRandomGenetics();
        } else {
            this.genetics = null;
        }
        
        // Generate initial sprite at medium LOD
        this.generateSprite('medium');
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

    generateSprite(lodLevel = 'medium') {
        // Clear the WebGL texture cache when regenerating sprite
        if (this.webglTexture) {
            this.webglTexture = null; // Clear cache to force texture recreation
        }
        
        // Use the global PlantGenerator to create the sprite with current growth stage
        if (window.PlantGenerator) {
            // Pass genetics and LOD level to generator
            this.texture = window.PlantGenerator.generatePlantSprite(
                this.species, 
                this.stage,
                this.genetics,  // Pass genetics (null for non-genetic species)
                lodLevel        // Pass LOD level
            );
            
            // Calculate render dimensions based on growth stage
            // This ensures saplings appear smaller than mature trees
            const stageSizeModifier = this._getGrowthStageSizeModifier();
            
            // LOD IMPORTANT: Adjust render size based on LOD level
            // For impostor LOD, scale down world-space size to match tiny texture
            // For other LODs, apply growth stage size modifier
            if (lodLevel === 'impostor') {
                // Impostor billboards should be tiny (4x4 texture, 4x4 world space)
                this.width = 4;
                this.height = 4;
            } else {
                // Apply growth stage size modifier to base dimensions
                // Saplings render at 40% size, young trees at 70%, mature at 100%
                this.width = Math.round(this.baseWidth * stageSizeModifier.width);
                this.height = Math.round(this.baseHeight * stageSizeModifier.height);
            }
        }
        
        // Track the LOD level this sprite was generated at
        this.lastRenderedLOD = lodLevel;
    }
    
    /**
     * Get size modifier for current growth stage
     * Matches the size modifiers used in TreeGenerator/HerbGenerator
     * @returns {Object} {width, height} multipliers
     * @private
     */
    _getGrowthStageSizeModifier() {
        // Default size modifier (full size)
        let widthMod = 1.0;
        let heightMod = 1.0;
        
        // Tree growth stages have specific size modifiers
        if (this.species.category === 'tree') {
            switch (this.stage) {
                case 'Sapling':
                    widthMod = 0.4;
                    heightMod = 0.4;
                    break;
                case 'YoungTree':
                    widthMod = 0.7;
                    heightMod = 0.7;
                    break;
                case 'MatureTree':
                    widthMod = 1.0;
                    heightMod = 1.5; // Mature trees are 50% taller
                    break;
                case 'Withered':
                    widthMod = 1.0;
                    heightMod = 1.0;
                    break;
            }
        }
        // Herb growth stages
        else if (this.species.category === 'herb') {
            switch (this.stage) {
                case 'Seedling':
                    widthMod = 0.4;
                    heightMod = 0.4;
                    break;
                case 'Vegetative':
                    widthMod = 0.7;
                    heightMod = 0.7;
                    break;
                case 'Flowering':
                    widthMod = 1.0;
                    heightMod = 1.0;
                    break;
                case 'Withered':
                    widthMod = 0.9;
                    heightMod = 0.8;
                    break;
            }
        }
        // Groundcover (clover) growth stages
        else if (this.species.category === 'groundcover') {
            switch (this.stage) {
                case 'Sprout':
                    widthMod = 0.5;
                    heightMod = 0.5;
                    break;
                case 'Spreading':
                    widthMod = 0.8;
                    heightMod = 0.8;
                    break;
                case 'Flowering':
                    widthMod = 1.0;
                    heightMod = 1.0;
                    break;
                case 'Withered':
                    widthMod = 0.7;
                    heightMod = 0.6;
                    break;
            }
        }
        
        // Apply genetic modifiers if present
        if (this.genetics) {
            widthMod *= GeneticsUtils.getDimensionMultiplier(this.genetics.widthFactor);
            heightMod *= GeneticsUtils.getDimensionMultiplier(this.genetics.heightFactor);
        }
        
        return { width: widthMod, height: heightMod };
    }
    
    /**
     * Update sprite for new LOD level (Milestone 4)
     * Called when LOD changes due to camera zoom
     * Checks if currentLOD (set by LODManager) differs from lastRenderedLOD
     */
    updateLODSprite() {
        // Only regenerate if LOD actually changed since last render
        if (this.currentLOD === this.lastRenderedLOD) return;
        
        const oldLOD = this.lastRenderedLOD;
        const newLOD = this.currentLOD;
        
        // Regenerate sprite at new LOD level
        this.generateSprite(newLOD);
        
        // Log LOD transition (can be disabled via config)
        const config = window.config && window.config.world && window.config.world.rendering && window.config.world.rendering.lod;
        if (config && config.debugOverlay && config.debugOverlay.showTransitions) {
            console.log(`Plant at (${Math.round(this.x)}, ${Math.round(this.y)}) LOD: ${oldLOD} -> ${newLOD}`);
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
            const stages = this.species.growthStages;
            const currentStageIndex = stages.findIndex(stage => stage.name === this.stage);
            const currentStageConfig = currentStageIndex !== -1 ? stages[currentStageIndex] : null;
            
            // Check for stage-specific grace period, then global config default
            const gracePeriod = currentStageConfig?.starvation?.gracePeriod || 
                              config.stuntGracePeriod || 7;
            
            // After grace period, force plant to wither from nutrient starvation
            if (this.daysStunted >= gracePeriod && this.stage !== 'Withered') {
                this.forceWither(currentDay);
            }
        } else {
            // Apply growth rate modifier if plant is not stunted
            const growthRate = this.calculateGrowthRate();
            this.accumulatedGrowthDays += gameDaysElapsed * growthRate;
        }
        
        // NEW: Consume nutrients daily (Milestone 1)
        this.consumeNutrientsDaily(gameDaysElapsed);
        
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
        
        // NEW: Check for age-based death (maxAge in stage config)
        if (currentStageConfig.maxAge && this.age >= currentStageConfig.maxAge) {
            console.log(`${this.species.commonName} died of old age (${this.age.toFixed(1)} days, max ${currentStageConfig.maxAge})`);
            this.forceWither(currentDay);
            return; // Skip further updates
        }
        
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
        
        // NEW: Check if parent soil can afford reproduction cost (Milestone 2)
        if (rhizomeConfig.reproductionCost) {
            if (!this.canAffordReproduction(rhizomeConfig.reproductionCost)) {
                return null; // Not enough nutrients in parent soil
            }
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
            species: this.species.id,
            reproductionCost: rhizomeConfig.reproductionCost // NEW: Pass cost to handler
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
        
        // NEW: Check if parent soil can afford reproduction cost (Milestone 2)
        if (seedConfig.reproductionCost) {
            if (!this.canAffordReproduction(seedConfig.reproductionCost)) {
                return null; // Not enough nutrients in parent soil
            }
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
            species: this.species.id,
            reproductionCost: seedConfig.reproductionCost // NEW: Pass cost to handler
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
        
        // NEW: Check if parent soil can afford reproduction cost (Milestone 2)
        if (proximityConfig.reproductionCost) {
            if (!this.canAffordReproduction(proximityConfig.reproductionCost)) {
                // Log nutrient failure if logging enabled
                return null; // Not enough nutrients in parent soil
            }
        }
        
        // Roll for success chance
        if (Math.random() > proximityConfig.successChance) {
            return null;
        }
        
        // SUCCESS: Update last reproduction day AFTER all checks pass
        this.lastReproductionDay = currentDay;
        
        // Return event for PlantManager to find partner
        return {
            type: 'proximityReproduction',
            parentX: this.x,
            parentY: this.y,
            parentGenetics: this.genetics,
            proximityDistance: proximityConfig.proximityDistance,
            maxOffspringDistance: proximityConfig.maxOffspringDistance,
            species: this.species.id,
            reproductionCost: proximityConfig.reproductionCost // NEW: Pass cost to handler
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
     * MILESTONE 2: Get root access profile for this plant
     * @returns {Object} {surface: number, deep: number} access multipliers (0.0-1.0)
     */
    getRootAccessProfile() {
        const config = window.config?.world?.plants?.rootDepthProfiles;
        const rootDepth = this.species.environment?.rootDepth || 'medium';
        
        if (config && config[rootDepth]) {
            return config[rootDepth];
        }
        
        // Default fallback if config missing
        const defaults = {
            shallow: { surface: 1.0, deep: 0.2 },
            medium: { surface: 0.8, deep: 0.6 },
            deep: { surface: 0.5, deep: 1.0 }
        };
        
        return defaults[rootDepth] || defaults.medium;
    }
    
    /**
     * MILESTONE 2: Get effective nutrients based on root depth access
     * Calculates weighted average of surface + deep layers based on root profile
     * @param {Object} soil - Soil cell object
     * @returns {Object} {nitrogen, phosphorus, potassium, organicMatter} effective values
     */
    getEffectiveNutrients(soil) {
        if (!soil || !soil.nutrientLayers) {
            // Fallback to legacy surface properties if layers not available
            return {
                nitrogen: soil?.nitrogen || 0,
                phosphorus: soil?.phosphorus || 0,
                potassium: soil?.potassium || 0,
                organicMatter: soil?.organicMatter || 0
            };
        }
        
        const rootProfile = this.getRootAccessProfile();
        const surface = soil.nutrientLayers.surface;
        const deep = soil.nutrientLayers.deep;
        
        return {
            nitrogen: (surface.nitrogen * rootProfile.surface) + (deep.nitrogen * rootProfile.deep),
            phosphorus: (surface.phosphorus * rootProfile.surface) + (deep.phosphorus * rootProfile.deep),
            potassium: (surface.potassium * rootProfile.surface) + (deep.potassium * rootProfile.deep),
            organicMatter: (surface.organicMatter * rootProfile.surface) + (deep.organicMatter * rootProfile.deep)
        };
    }
    
    /**
     * Calculate growth rate based on current nutrient availability
     * MILESTONE 2: Updated to use effective nutrients from root depth system
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
        
        // MILESTONE 2: Use effective nutrients based on root depth
        const effectiveNutrients = this.getEffectiveNutrients(soil);
        
        // Calculate weighted growth rate using effective nutrients
        let totalScore = 0;
        totalScore += this.nutrientScore(effectiveNutrients.nitrogen, reqs.nitrogen, 'nitrogen') * modifiers.nitrogen.weight;
        totalScore += this.nutrientScore(effectiveNutrients.phosphorus, reqs.phosphorus, 'phosphorus') * modifiers.phosphorus.weight;
        totalScore += this.nutrientScore(effectiveNutrients.potassium, reqs.potassium, 'potassium') * modifiers.potassium.weight;
        totalScore += this.nutrientScore(effectiveNutrients.organicMatter, reqs.organicMatter, 'organicMatter') * modifiers.organicMatter.weight;
        
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
     * Consume nutrients daily based on stage and genetics (Milestone 1)
     * MILESTONE 2: Updated to consume from both soil layers proportionally
     * Called every frame, scales consumption by game days elapsed
     * @param {number} gameDaysElapsed - Game days elapsed this frame
     */
    consumeNutrientsDaily(gameDaysElapsed) {
        // Check if daily consumption is enabled
        const config = window.config?.world?.plants?.dailyNutrientConsumption;
        if (!config || !config.enabled) {
            return;
        }
        
        // Withered plants don't consume nutrients
        if (this.stage === 'Withered') {
            return;
        }
        
        // Get soil at plant position
        let soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
        
        // DEFENSIVE: Try grid lookup if world lookup fails
        if (!soil) {
            const gridCoords = window.graphicsEngine.soilManager.worldToGrid(this.x, this.y);
            soil = window.graphicsEngine.soilManager.getSoilAt(gridCoords.x, gridCoords.y);
        }
        
        if (!soil) {
            // Silently fail - don't spam console for every plant every frame
            return;
        }
        
        // NEW: Check for zero-fertility instant death (all nutrients depleted)
        // If ALL major nutrients are at 0, force immediate death (no grace period)
        if (soil.nutrientLayers) {
            // Check both layers for shallow-rooted plants like clover
            const surfaceN = soil.nutrientLayers.surface.nitrogen;
            const surfaceP = soil.nutrientLayers.surface.phosphorus;
            const surfaceK = soil.nutrientLayers.surface.potassium;
            const deepN = soil.nutrientLayers.deep.nitrogen;
            const deepP = soil.nutrientLayers.deep.phosphorus;
            const deepK = soil.nutrientLayers.deep.potassium;
            
            // Get root access profile to determine which layers matter
            const rootProfile = this.getRootAccessProfile();
            
            // Calculate effective nutrient availability
            const effectiveN = (surfaceN * rootProfile.surface) + (deepN * rootProfile.deep);
            const effectiveP = (surfaceP * rootProfile.surface) + (deepP * rootProfile.deep);
            const effectiveK = (surfaceK * rootProfile.surface) + (deepK * rootProfile.deep);
            
            // If all nutrients are critically low (< 1.0), force immediate death
            if (effectiveN < 1.0 && effectiveP < 1.0 && effectiveK < 1.0) {
                console.log(`${this.species.commonName} died from complete nutrient depletion (N:${effectiveN.toFixed(1)} P:${effectiveP.toFixed(1)} K:${effectiveK.toFixed(1)})`);
                this.forceWither(window.graphicsEngine?.timeManager?.getCurrentDay() || 0);
                return;
            }
        } else if (soil.nitrogen < 1.0 && soil.phosphorus < 1.0 && soil.potassium < 1.0) {
            // Fallback for legacy single-layer soil
            console.log(`${this.species.commonName} died from complete nutrient depletion (legacy soil)`);
            this.forceWither(window.graphicsEngine?.timeManager?.getCurrentGameDay() || 0);
            return;
        }
        
        // Get base daily consumption rates
        const baseRates = config.baseDailyRate;
        
        // Get category multiplier (tree/herb/groundcover) - NEW
        const category = this.species.category || 'herb';
        const categoryMultiplier = config.categoryMultipliers?.[category] || 1.0;
        
        // Get stage multiplier (default to 1.0 if stage not in config)
        const stageMultiplier = config.stageMultipliers[this.stage] || 1.0;
        
        // Calculate consumption amounts with multipliers
        let nConsumption = baseRates.nitrogen * categoryMultiplier * stageMultiplier * gameDaysElapsed;
        let pConsumption = baseRates.phosphorus * categoryMultiplier * stageMultiplier * gameDaysElapsed;
        let kConsumption = baseRates.potassium * categoryMultiplier * stageMultiplier * gameDaysElapsed;
        let omConsumption = baseRates.organicMatter * categoryMultiplier * stageMultiplier * gameDaysElapsed;
        
        // Apply genetic efficiency modifiers (if plant has genetics)
        if (this.genetics) {
            // Efficiency: 0.8-1.2 range
            // Higher genetic value (200+) = more efficient = consumes less (0.8x)
            // Lower genetic value (60-) = less efficient = consumes more (1.2x)
            const nEff = 2.0 - this.geneticToMultiplier(this.genetics.nitrogenEfficiency);
            const pEff = 2.0 - this.geneticToMultiplier(this.genetics.phosphorusEfficiency);
            const kEff = 2.0 - this.geneticToMultiplier(this.genetics.potassiumEfficiency);
            const omEff = 2.0 - this.geneticToMultiplier(this.genetics.organicMatterEfficiency);
            
            nConsumption *= nEff;
            pConsumption *= pEff;
            kConsumption *= kEff;
            omConsumption *= omEff;
        }
        
        // MILESTONE 2: Get root access profile and consume from both layers
        const rootProfile = this.getRootAccessProfile();
        
        // Calculate consumption share per layer based on root access
        // Higher access = more consumption from that layer
        const totalAccess = rootProfile.surface + rootProfile.deep;
        const surfaceShare = rootProfile.surface / totalAccess;
        const deepShare = rootProfile.deep / totalAccess;
        
        // Consume from surface layer
        if (soil.nutrientLayers) {
            const surfaceN = soil.nutrientLayers.surface.nitrogen - (nConsumption * surfaceShare);
            const surfaceP = soil.nutrientLayers.surface.phosphorus - (pConsumption * surfaceShare);
            const surfaceK = soil.nutrientLayers.surface.potassium - (kConsumption * surfaceShare);
            const surfaceOM = soil.nutrientLayers.surface.organicMatter - (omConsumption * surfaceShare);
            
            soil.updateNutrientsLayered('surface', surfaceN, surfaceP, surfaceK, surfaceOM);
            
            // Consume from deep layer
            const deepN = soil.nutrientLayers.deep.nitrogen - (nConsumption * deepShare);
            const deepP = soil.nutrientLayers.deep.phosphorus - (pConsumption * deepShare);
            const deepK = soil.nutrientLayers.deep.potassium - (kConsumption * deepShare);
            const deepOM = soil.nutrientLayers.deep.organicMatter - (omConsumption * deepShare);
            
            soil.updateNutrientsLayered('deep', deepN, deepP, deepK, deepOM);
        } else {
            // Fallback to legacy single-layer consumption if layers not available
            const newNitrogen = Math.max(0, soil.nitrogen - nConsumption);
            const newPhosphorus = Math.max(0, soil.phosphorus - pConsumption);
            const newPotassium = Math.max(0, soil.potassium - kConsumption);
            const newOrganicMatter = Math.max(0, soil.organicMatter - omConsumption);
            
            soil.updateNutrients(newNitrogen, newPhosphorus, newPotassium, newOrganicMatter);
        }
        
        // Note: Don't set needsRefresh here - batched soil updates happen elsewhere
        // Setting it per-plant would cause massive performance hit
        
        // MILESTONE 3: Call leaf litter deposition after consumption
        this.depositLeafLitter(soil, gameDaysElapsed);
        
        // MILESTONE 5: Call root lift after leaf litter
        this.performRootLift(soil, gameDaysElapsed);
        
        // MILESTONE 6: Call nitrogen-fixing after other nutrient cycling
        this.performNitrogenFixing(soil, gameDaysElapsed);
    }
    
    /**
     * MILESTONE 3: Deposit leaf litter on soil surface (MatureTree returns OM to surface)
     * Called at end of consumeNutrientsDaily()
     * @param {Object} soil - Soil cell object
     * @param {number} gameDaysElapsed - Game days elapsed this frame
     */
    depositLeafLitter(soil, gameDaysElapsed) {
        // Get current stage config
        const stages = this.species.growthStages;
        const currentStageIndex = stages.findIndex(stage => stage.name === this.stage);
        if (currentStageIndex === -1) return;
        
        const currentStageConfig = stages[currentStageIndex];
        const leafLitterConfig = currentStageConfig.leafLitter;
        
        // Check if leaf litter is enabled for this stage
        if (!leafLitterConfig || !leafLitterConfig.enabled) {
            return;
        }
        
        if (!soil || !soil.nutrientLayers) {
            return; // No soil or layers available
        }
        
        // Calculate deposition amounts
        const omDeposit = leafLitterConfig.depositPerDay.organicMatter * gameDaysElapsed;
        const nDeposit = leafLitterConfig.depositPerDay.nitrogen * gameDaysElapsed;
        const pDeposit = (leafLitterConfig.depositPerDay.phosphorus || 0) * gameDaysElapsed;
        const kDeposit = (leafLitterConfig.depositPerDay.potassium || 0) * gameDaysElapsed;
        
        // Get grid coordinates for this plant
        const soilManager = window.graphicsEngine?.soilManager;
        if (!soilManager) return;
        
        const gridCoords = soilManager.worldToGrid(this.x, this.y);
        
        // Deposit to tree's cell (always)
        const treeSoil = soilManager.getSoilAt(gridCoords.x, gridCoords.y);
        if (treeSoil && treeSoil.nutrientLayers) {
            const newOM = treeSoil.nutrientLayers.surface.organicMatter + omDeposit;
            const newN = treeSoil.nutrientLayers.surface.nitrogen + nDeposit;
            const newP = treeSoil.nutrientLayers.surface.phosphorus + pDeposit;
            const newK = treeSoil.nutrientLayers.surface.potassium + kDeposit;
            
            treeSoil.updateNutrientsLayered('surface', newN, newP, newK, newOM);
        }
        
        // Spread to neighbors if enabled
        if (leafLitterConfig.spreadToNeighbors && leafLitterConfig.radius > 0) {
            const radius = leafLitterConfig.radius;
            const neighborCount = (radius * 2 + 1) * (radius * 2 + 1) - 1; // Exclude center cell
            const neighborShare = omDeposit / neighborCount;
            const neighborNShare = nDeposit / neighborCount;
            const neighborPShare = pDeposit / neighborCount;
            const neighborKShare = kDeposit / neighborCount;
            
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Skip center cell (already deposited to tree's cell)
                    if (dx === 0 && dy === 0) continue;
                    
                    const neighborSoil = soilManager.getSoilAt(gridCoords.x + dx, gridCoords.y + dy);
                    if (neighborSoil && neighborSoil.nutrientLayers) {
                        const newOM = neighborSoil.nutrientLayers.surface.organicMatter + neighborShare;
                        const newN = neighborSoil.nutrientLayers.surface.nitrogen + neighborNShare;
                        const newP = neighborSoil.nutrientLayers.surface.phosphorus + neighborPShare;
                        const newK = neighborSoil.nutrientLayers.surface.potassium + neighborKShare;
                        
                        neighborSoil.updateNutrientsLayered('surface', newN, newP, newK, newOM);
                    }
                }
            }
        }
    }
    
    /**
     * MILESTONE 5: Perform root lift (deep-rooted plants bring nutrients from deep → surface)
     * Called at end of consumeNutrientsDaily() after leaf litter deposition
     * @param {Object} soil - Soil cell object
     * @param {number} gameDaysElapsed - Game days elapsed this frame
     */
    performRootLift(soil, gameDaysElapsed) {
        // Only deep-rooted plants can perform root lift
        const rootDepth = this.species.environment?.rootDepth;
        if (rootDepth !== 'deep') {
            return; // Only deep-rooted plants (e.g., trees)
        }
        
        // Get current stage config
        const stages = this.species.growthStages;
        const currentStageIndex = stages.findIndex(stage => stage.name === this.stage);
        if (currentStageIndex === -1) return;
        
        const currentStageConfig = stages[currentStageIndex];
        const rootLiftConfig = currentStageConfig.rootLift;
        
        // Check if root lift is enabled for this stage
        if (!rootLiftConfig || !rootLiftConfig.enabled) {
            return;
        }
        
        if (!soil || !soil.nutrientLayers) {
            return; // No soil or layers available
        }
        
        // Check if deep layer has sufficient nutrients to lift
        const deepLayer = soil.nutrientLayers.deep;
        const thresholds = rootLiftConfig.activeWhenDeepExceeds;
        
        const canLiftN = deepLayer.nitrogen > thresholds.nitrogen;
        const canLiftP = deepLayer.phosphorus > thresholds.phosphorus;
        const canLiftK = deepLayer.potassium > thresholds.potassium;
        
        // If none of the nutrients can be lifted, return early
        if (!canLiftN && !canLiftP && !canLiftK) {
            return;
        }
        
        // Calculate lift amounts
        const nLift = canLiftN ? rootLiftConfig.liftPerDay.nitrogen * gameDaysElapsed : 0;
        const pLift = canLiftP ? rootLiftConfig.liftPerDay.phosphorus * gameDaysElapsed : 0;
        const kLift = canLiftK ? rootLiftConfig.liftPerDay.potassium * gameDaysElapsed : 0;
        
        // Transfer from deep → surface
        const surfaceN = soil.nutrientLayers.surface.nitrogen + nLift;
        const surfaceP = soil.nutrientLayers.surface.phosphorus + pLift;
        const surfaceK = soil.nutrientLayers.surface.potassium + kLift;
        const surfaceOM = soil.nutrientLayers.surface.organicMatter;
        
        const deepN = Math.max(0, deepLayer.nitrogen - nLift);
        const deepP = Math.max(0, deepLayer.phosphorus - pLift);
        const deepK = Math.max(0, deepLayer.potassium - kLift);
        const deepOM = deepLayer.organicMatter;
        
        // Update both layers
        soil.updateNutrientsLayered('surface', surfaceN, surfaceP, surfaceK, surfaceOM);
        soil.updateNutrientsLayered('deep', deepN, deepP, deepK, deepOM);
    }
    
    /**
     * MILESTONE 6: Perform nitrogen-fixing (legumes fix atmospheric N2 into soil)
     * Called at end of consumeNutrientsDaily() after root lift
     * Makes clover nitrogen-positive (enriches soil nitrogen over time)
     * @param {Object} soil - Soil cell object
     * @param {number} gameDaysElapsed - Game days elapsed this frame
     */
    performNitrogenFixing(soil, gameDaysElapsed) {
        // Get current stage config
        const stages = this.species.growthStages;
        const currentStageIndex = stages.findIndex(stage => stage.name === this.stage);
        if (currentStageIndex === -1) return;
        
        const currentStageConfig = stages[currentStageIndex];
        const nFixingConfig = currentStageConfig.nitrogenFixing;
        
        // Check if N-fixing is enabled for this stage
        if (!nFixingConfig || !nFixingConfig.enabled) {
            return;
        }
        
        if (!soil || !soil.nutrientLayers) {
            return;
        }
        
        // Calculate fixation amount (atmospheric N2 → soil NH4+/NO3-)
        const nFixation = nFixingConfig.fixationRatePerDay * gameDaysElapsed;
        
        // Add to DEEP layer (root nodules with Rhizobium bacteria are deep in soil)
        const newN = Math.min(100, soil.nutrientLayers.deep.nitrogen + nFixation);
        soil.updateNutrientsLayered('deep', newN, soil.nutrientLayers.deep.phosphorus, soil.nutrientLayers.deep.potassium, soil.nutrientLayers.deep.organicMatter);
    }

    /**
     * Check if parent soil has sufficient nutrients for reproduction (Milestone 2)
     * Called before reproduction attempt to ensure parent can afford the cost
     * @param {Object} reproductionCost - Cost object {nitrogen, phosphorus, potassium, organicMatter}
     * @returns {boolean} True if parent soil can afford the cost
     */
    canAffordReproduction(reproductionCost) {
        if (!reproductionCost) return true; // No cost defined = free reproduction
        
        // Get soil at parent position
        let soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
        
        // DEFENSIVE: Try grid lookup if world lookup fails
        if (!soil) {
            const gridCoords = window.graphicsEngine.soilManager.worldToGrid(this.x, this.y);
            soil = window.graphicsEngine.soilManager.getSoilAt(gridCoords.x, gridCoords.y);
        }
        
        if (!soil) {
            return false; // Can't reproduce without soil
        }
        
        // MILESTONE ROOT DEPTH: Use effective nutrients based on root depth
        // This ensures deep-rooted plants (oaks) can access deep layer nutrients for reproduction
        const effectiveNutrients = this.getEffectiveNutrients(soil);
        
        // Check if soil has enough of EACH nutrient
        // Use a small buffer (cost + 5) to ensure soil doesn't hit absolute zero
        const buffer = 5;
        if (effectiveNutrients.nitrogen < reproductionCost.nitrogen + buffer) return false;
        if (effectiveNutrients.phosphorus < reproductionCost.phosphorus + buffer) return false;
        if (effectiveNutrients.potassium < reproductionCost.potassium + buffer) return false;
        if (effectiveNutrients.organicMatter < reproductionCost.organicMatter + buffer) return false;
        
        return true; // Parent soil can afford reproduction
    }

    /**
     * Calculate visual tint color based on nutrient status (Milestone 3: Enhanced)
     * MILESTONE 2: Updated to use effective nutrients from root depth system
     * Returns RGB tint multiplier with enhanced intensity and starvation stages
     * @returns {Array} [r, g, b, a] color multiplier (0.0-1.0 each)
     */
    calculateNutrientTint() {
        // Get current soil nutrients
        const soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
        if (!soil) return [1, 1, 1, 1]; // Default - no tint
        
        // Get nutrient requirements
        const reqs = this.species?.environment?.nutrientRequirements;
        if (!reqs) return [1, 1, 1, 1]; // No requirements - no tint
        
        // MILESTONE 2: Use effective nutrients based on root depth
        const effectiveNutrients = this.getEffectiveNutrients(soil);
        
        // Calculate individual nutrient scores using effective values
        const nScore = this.nutrientScore(effectiveNutrients.nitrogen, reqs.nitrogen, 'nitrogen');
        const pScore = this.nutrientScore(effectiveNutrients.phosphorus, reqs.phosphorus, 'phosphorus');
        const kScore = this.nutrientScore(effectiveNutrients.potassium, reqs.potassium, 'potassium');
        const omScore = this.nutrientScore(effectiveNutrients.organicMatter, reqs.organicMatter, 'organicMatter');
        
        // Find most limiting nutrient (Liebig's Law - visual edition)
        const minScore = Math.min(nScore, pScore, kScore, omScore);
        
        // NEW: Determine starvation stage (Milestone 3)
        const starvationStage = this.getStarvationStage(minScore);
        
        // Determine which nutrient is most limiting
        let limitingNutrient = 'none';
        if (minScore < 1.0) {
            if (nScore === minScore) limitingNutrient = 'nitrogen';
            else if (pScore === minScore) limitingNutrient = 'phosphorus';
            else if (kScore === minScore) limitingNutrient = 'potassium';
            else if (omScore === minScore) limitingNutrient = 'organicMatter';
        }
        
        // Calculate base tint based on limiting nutrient
        let r = 1.0, g = 1.0, b = 1.0, a = 1.0;
        
        // Deficiency intensity (0.0 = optimal, 1.0 = at minimum)
        const deficiency = 1.0 - minScore;
        
        // NEW: Get enhanced color intensity from config (Milestone 3)
        const config = window.config?.world?.plants?.starvationVisualization;
        const enhancedIntensity = config?.enhancedColorIntensity || {
            nitrogen: 0.6,
            phosphorus: 0.7,
            potassium: 0.8,
            organicMatter: 0.5
        };
        
        switch (limitingNutrient) {
            case 'nitrogen':
                // Nitrogen deficiency: pale/yellow leaves (ENHANCED)
                r = 1.0;
                g = 1.0 - (deficiency * enhancedIntensity.nitrogen); // Enhanced: up to 60%
                b = 1.0 - (deficiency * enhancedIntensity.nitrogen); // Enhanced: up to 60%
                break;
                
            case 'phosphorus':
                // Phosphorus deficiency: purple/reddish tint (ENHANCED)
                r = 1.0;
                g = 1.0 - (deficiency * enhancedIntensity.phosphorus); // Enhanced: up to 70%
                b = 1.0 - (deficiency * 0.2); // Slight blue reduction for purple
                break;
                
            case 'potassium':
                // Potassium deficiency: brown/yellow edges (ENHANCED)
                r = 1.0;
                g = 1.0 - (deficiency * enhancedIntensity.potassium * 0.7); // Enhanced: up to 56%
                b = 1.0 - (deficiency * enhancedIntensity.potassium); // Enhanced: up to 80%
                break;
                
            case 'organicMatter':
                // Organic matter deficiency: dull, desaturated (ENHANCED)
                const desaturation = 1.0 - (deficiency * enhancedIntensity.organicMatter); // Enhanced: up to 50%
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
        
        // NEW: Apply starvation stage color intensity (Milestone 3)
        // This further reduces color for stressed/starving/critical stages
        const colorMultiplier = starvationStage.colorIntensity;
        r = r * colorMultiplier + (1.0 - colorMultiplier); // Blend toward white/gray
        g = g * colorMultiplier + (1.0 - colorMultiplier);
        b = b * colorMultiplier + (1.0 - colorMultiplier);
        
        // NEW: Apply alpha multiplier for wilting effect (Milestone 3)
        a = starvationStage.alphaMultiplier;
        
        return [r, g, b, a];
    }

    /**
     * Determine starvation stage based on nutrient score and days stunted (Milestone 3)
     * @param {number} minNutrientScore - Minimum nutrient score (0.0-1.0)
     * @returns {Object} Starvation stage config
     */
    getStarvationStage(minNutrientScore) {
        const config = window.config?.world?.plants?.starvationVisualization;
        
        // If feature disabled, return healthy stage
        if (!config || !config.enabled) {
            return {
                name: 'Healthy',
                colorIntensity: 1.0,
                alphaMultiplier: 1.0,
                sizeMultiplier: 1.0
            };
        }
        
        const stages = config.stages;
        const daysStunted = this.daysStunted || 0;
        
        // Determine stage based on BOTH nutrient score AND days stunted
        // This creates progression: healthy → stressed → starving → critical
        
        if (minNutrientScore >= stages.healthy.nutrientThreshold && daysStunted === 0) {
            return stages.healthy;
        }
        else if (minNutrientScore >= stages.stressed.nutrientThreshold || daysStunted <= stages.stressed.daysStuntedMax) {
            return stages.stressed;
        }
        else if (minNutrientScore >= stages.starving.nutrientThreshold || daysStunted <= stages.starving.daysStuntedMax) {
            return stages.starving;
        }
        else {
            // Critical: very low nutrients OR 6+ days stunted
            return stages.critical;
        }
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
        const config = window.config.world.rendering;
        const isIsometric = config.projection === 'isometric';
        
        let x, y;
        
        if (isIsometric) {
            // Isometric projection
            // Convert orthographic position (with random offset) to isometric
            const isoConfig = config.isometric;
            const cellSize = config.cellSize || window.config.world.map.cellSize;
            
            // Calculate the fractional offset from cell center
            // this.x is orthographic world coord, this.gridX is the integer grid cell
            const cellCenterX = this.gridX * cellSize + cellSize / 2;
            const cellCenterY = this.gridY * cellSize + cellSize / 2;
            const offsetX = this.x - cellCenterX;
            const offsetY = this.y - cellCenterY;
            
            // Convert base grid position to isometric
            const isoBase = IsometricUtils.gridToIso(this.gridX, this.gridY, isoConfig.tileWidth, isoConfig.tileHeight);
            
            // Apply the offset in isometric space
            // In isometric, X offset affects both iso-x and iso-y, same with Y offset
            const isoOffsetX = (offsetX - offsetY) * (isoConfig.tileWidth / cellSize) * 0.5;
            const isoOffsetY = (offsetX + offsetY) * (isoConfig.tileHeight / cellSize) * 0.5;
            
            x = isoBase.x + isoOffsetX;
            y = isoBase.y + isoOffsetY;
            
            // NOTE: Layer offset is NOT applied in isometric mode
            // The isometric tile shape provides natural visual layering
            
        } else {
            // Orthographic projection (original)
            const yOffset = this.getRenderOffset();
            x = this.x;
            y = this.y - yOffset;
        }
        
        // NEW: Calculate starvation stage for size multiplier (Milestone 3)
        // MILESTONE 2: Updated to use effective nutrients
        const soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(this.x, this.y);
        let sizeMultiplier = 1.0;
        
        if (soil) {
            const reqs = this.species?.environment?.nutrientRequirements;
            if (reqs) {
                const effectiveNutrients = this.getEffectiveNutrients(soil);
                const nScore = this.nutrientScore(effectiveNutrients.nitrogen, reqs.nitrogen, 'nitrogen');
                const pScore = this.nutrientScore(effectiveNutrients.phosphorus, reqs.phosphorus, 'phosphorus');
                const kScore = this.nutrientScore(effectiveNutrients.potassium, reqs.potassium, 'potassium');
                const omScore = this.nutrientScore(effectiveNutrients.organicMatter, reqs.organicMatter, 'organicMatter');
                const minScore = Math.min(nScore, pScore, kScore, omScore);
                
                const starvationStage = this.getStarvationStage(minScore);
                sizeMultiplier = starvationStage.sizeMultiplier;
            }
        }
        
        // Apply wilting size effect
        const wiltedWidth = this.width * sizeMultiplier;
        const wiltedHeight = this.height * sizeMultiplier;
        
        return {
            x: x - wiltedWidth / 2,
            y: y - wiltedHeight,
            width: wiltedWidth,
            height: wiltedHeight,
            texture: this.texture,
            tint: this.calculateNutrientTint(),
            layer: this.getLayer(), // Add layer info for rendering system
            zOrder: IsometricUtils.getZOrder(this.gridX, this.gridY) // For depth sorting
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
                
                // MILESTONE 2: Use effective nutrients based on root depth
                const effectiveNutrients = this.getEffectiveNutrients(soil);
                
                // Check each nutrient individually using effective values
                const insufficientNutrients = [];
                if (effectiveNutrients.nitrogen < reqs.nitrogen.minimum) insufficientNutrients.push('N');
                if (effectiveNutrients.phosphorus < reqs.phosphorus.minimum) insufficientNutrients.push('P');
                if (effectiveNutrients.potassium < reqs.potassium.minimum) insufficientNutrients.push('K');
                if (effectiveNutrients.organicMatter < reqs.organicMatter.minimum) insufficientNutrients.push('OM');
                
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
            
            // Regenerate sprite for new stage at current LOD level
            this.generateSprite(this.currentLOD);
            
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
        
        // Regenerate sprite for withered appearance at current LOD level
        this.generateSprite(this.currentLOD);
    }
    
    /**
     * Serialize plant state for saving
     * @returns {Object} Serialized plant data
     */
    serialize() {
        return {
            // Position - use grid coordinates for deterministic restoration
            gridX: this.gridX,
            gridY: this.gridY,
            x: this.x,
            y: this.y,
            
            // Identity
            speciesId: this.species.id,
            
            // Growth state
            stage: this.stage,
            age: this.age,
            stageStartDay: this.stageStartDay,
            accumulatedGrowthDays: this.accumulatedGrowthDays,
            health: this.health,
            
            // Reproduction
            lastReproductionDay: this.lastReproductionDay,
            
            // Stress tracking
            daysStunted: this.daysStunted,
            isStunted: this.isStunted,
            
            // Genetics (if enabled)
            genetics: this.genetics
        };
    }
}