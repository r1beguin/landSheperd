/**
 * SoilEffectsManager - Handles weather effects and organic matter decomposition on soil
 * 
 * Extracted from SoilManager to improve modularity and maintainability.
 * Manages:
 * - Weather effects on soil water and nitrogen (rain, sun, cloudy)
 * - Organic matter decomposition into nitrogen and phosphorus
 * - Active cell tracking for localized decomposition
 * 
 * Dependencies:
 * - WeatherManager (optional) for weather state
 * - TimeManager for game day calculations
 */
class SoilEffectsManager {
    /**
     * @param {Object} config - Configuration from config.json
     */
    constructor(config) {
        this.weatherEffectsConfig = config.weather?.soilEffects || null;
        this.decompositionConfig = config.soil?.decomposition || null;
        this.nitrogenRegenConfig = config.soil?.nitrogenRegeneration || null;
        this.weatheringConfig = config.soil?.weathering || null;
        
        // Decomposition state tracking
        this.decompositionLogCounter = 0;
        this.decompositionLogInterval = 5; // Log every N game days
        this.decompositionActivityWindow = 30; // Days to keep cells active after plant death
        
        // Active cells for localized decomposition (Phase 2 optimization)
        this.activeCells = new Set(); // Set of "x,y" strings
        this.cellLastPlantActivity = new Map(); // Map<"x,y", gameDay>
    }
    
    /**
     * Apply weather effects to soil (rain increases water, sun evaporates)
     * MILESTONE 4: Added nutrient leaching during rain (surface → deep transfer)
     * P1: Added riparianGrid parameter for O(1) riparian zone lookups
     * @param {Map} soilGrid - Map of soil objects keyed by "x,y"
     * @param {number} deltaTime - Time since last frame (seconds)
     * @param {Map<string, Object>} riparianGrid - Pre-computed riparian grid (P1 optimization)
     */
    applyWeatherEffects(soilGrid, deltaTime, riparianGrid = null) {
        // Check if weather system is available and configured
        if (!this.weatherEffectsConfig) {
            return;
        }
        
        const weatherManager = window.graphicsEngine?.weatherManager;
        if (!weatherManager || !weatherManager.initialized) {
            return;
        }
        
        const currentWeather = weatherManager.getCurrentWeather();
        if (!currentWeather) {
            return;
        }
        
        // Calculate water change rate based on weather
        let waterChangePerDay = 0;
        let nitrogenChangePerDay = 0;
        
        if (currentWeather === 'rainy') {
            const rainIntensity = weatherManager.getRainIntensity();
            waterChangePerDay = this.weatherEffectsConfig.rainWaterIncreasePerDay * rainIntensity;
            
            // Nitrogen regeneration during rain (atmospheric deposition)
            if (this.weatherEffectsConfig.rainNitrogenRestorePerDay) {
                nitrogenChangePerDay = this.weatherEffectsConfig.rainNitrogenRestorePerDay * rainIntensity;
            }
        } else if (currentWeather === 'sunny') {
            waterChangePerDay = -this.weatherEffectsConfig.sunEvaporationPerDay;
        } else if (currentWeather === 'cloudy') {
            waterChangePerDay = -this.weatherEffectsConfig.cloudyEvaporationPerDay;
        }
        
        // Convert from per-day to per-second
        const timeManager = window.graphicsEngine?.timeManager;
        if (!timeManager) {
            return;
        }
        
        const realSecondsPerGameDay = timeManager.config.realSecondsPerGameDay;
        const waterChangePerSecond = waterChangePerDay / realSecondsPerGameDay;
        const waterChangeThisFrame = waterChangePerSecond * deltaTime;
        
        const nitrogenChangePerSecond = nitrogenChangePerDay / realSecondsPerGameDay;
        const nitrogenChangeThisFrame = nitrogenChangePerSecond * deltaTime;
        
        // MILESTONE 4: Check if leaching is enabled and calculate leach amounts
        const leachingConfig = this.weatherEffectsConfig.leaching;
        const isRainy = currentWeather === 'rainy';
        const shouldLeach = isRainy && leachingConfig && leachingConfig.enabled;
        
        let leachAmountsPerDay = null;
        if (shouldLeach) {
            const rainIntensity = weatherManager.getRainIntensity();
            const intensityMult = rainIntensity < 0.6 ? leachingConfig.intensityMultiplier.light : 
                                 rainIntensity > 0.9 ? leachingConfig.intensityMultiplier.heavy : 1.0;
            
            // Calculate leach amounts per day
            leachAmountsPerDay = {
                nitrogen: leachingConfig.nitrogenLeachRate * intensityMult,
                phosphorus: leachingConfig.phosphorusLeachRate * intensityMult,
                potassium: leachingConfig.potassiumLeachRate * intensityMult,
                organicMatter: leachingConfig.organicMatterLeachRate * intensityMult,
                efficiency: leachingConfig.transferEfficiency || 0.7
            };
        }
        
        // Apply to all soil cells
        const hasWaterChange = Math.abs(waterChangeThisFrame) > 0.001;
        const hasNitrogenChange = Math.abs(nitrogenChangeThisFrame) > 0.001;
        const hasLeaching = shouldLeach && leachAmountsPerDay !== null;
        
        if (hasWaterChange || hasNitrogenChange || hasLeaching) {
            let waterCellsUpdated = 0;
            let nitrogenCellsUpdated = 0;
            let leachedCellsCount = 0;
            let riparianCellsProtected = 0; // Track riparian protection
            
            soilGrid.forEach(soil => {
                // Apply water changes
                if (hasWaterChange) {
                    const oldWater = soil.waterRetention;
                    soil.waterRetention = Math.max(0, Math.min(100, soil.waterRetention + waterChangeThisFrame));
                    
                    // If water changed significantly, regenerate water pixels
                    if (Math.abs(soil.waterRetention - oldWater) > 0.1) {
                        soil.waterPixels = soil.generateWaterPixels();
                        soil.needsUpdate = true;
                        waterCellsUpdated++;
                    }
                }
                
                // Apply nitrogen changes
                if (hasNitrogenChange) {
                    const oldNitrogen = soil.nitrogen;
                    soil.nitrogen = Math.max(0, Math.min(100, soil.nitrogen + nitrogenChangeThisFrame));
                    
                    // If nitrogen changed significantly, recalculate fertility
                    if (Math.abs(soil.nitrogen - oldNitrogen) > 0.1) {
                        soil.fertility = soil.calculateFertility();
                        soil.baseColor = soil.calculateBaseColor();
                        soil.needsUpdate = true;
                        nitrogenCellsUpdated++;
                    }
                }
                
                // MILESTONE 4: Apply leaching (surface → deep nutrient transfer)
                if (hasLeaching && soil.nutrientLayers) {
                    const gameDaysElapsed = deltaTime / realSecondsPerGameDay;
                    
                    // P1: Check if cell is in riparian zone using pre-computed grid (O(1) lookup)
                    let leachingMultiplier = 1.0; // Default: normal leaching
                    let isRiparianZone = false; // Track for logging
                    
                    const riparianConfig = leachingConfig.riparianResistance;
                    if (riparianConfig?.enabled && riparianGrid) {
                        const cellKey = `${soil.gridX},${soil.gridY}`;
                        isRiparianZone = riparianGrid.has(cellKey);
                        
                        if (isRiparianZone) {
                            // Riparian zone: Clay-rich floodplain soil resists leaching
                            leachingMultiplier = riparianConfig.leachingMultiplier || 0.3;
                        }
                    }
                    
                    // Calculate leach amounts this frame (with riparian multiplier)
                    const nLeach = leachAmountsPerDay.nitrogen * gameDaysElapsed * leachingMultiplier;
                    const pLeach = leachAmountsPerDay.phosphorus * gameDaysElapsed * leachingMultiplier;
                    const kLeach = leachAmountsPerDay.potassium * gameDaysElapsed * leachingMultiplier;
                    const omLeach = leachAmountsPerDay.organicMatter * gameDaysElapsed * leachingMultiplier;
                    
                    // Transfer from surface to deep (with efficiency loss)
                    const efficiency = leachAmountsPerDay.efficiency;
                    const runoffLoss = 1.0 - efficiency; // 30% runoff loss by default
                    
                    // Reduce surface nutrients
                    const surfaceN = Math.max(0, soil.nutrientLayers.surface.nitrogen - nLeach);
                    const surfaceP = Math.max(0, soil.nutrientLayers.surface.phosphorus - pLeach);
                    const surfaceK = Math.max(0, soil.nutrientLayers.surface.potassium - kLeach);
                    const surfaceOM = Math.max(0, soil.nutrientLayers.surface.organicMatter - omLeach);
                    
                    // Increase deep nutrients (with efficiency applied)
                    const deepN = Math.min(100, soil.nutrientLayers.deep.nitrogen + (nLeach * efficiency));
                    const deepP = Math.min(100, soil.nutrientLayers.deep.phosphorus + (pLeach * efficiency));
                    const deepK = Math.min(100, soil.nutrientLayers.deep.potassium + (kLeach * efficiency));
                    const deepOM = Math.min(100, soil.nutrientLayers.deep.organicMatter + (omLeach * efficiency));
                    
                    // Only update if significant leaching occurred
                    if (nLeach > 0.01 || pLeach > 0.01 || kLeach > 0.01 || omLeach > 0.01) {
                        soil.updateNutrientsLayered('surface', surfaceN, surfaceP, surfaceK, surfaceOM);
                        soil.updateNutrientsLayered('deep', deepN, deepP, deepK, deepOM);
                        leachedCellsCount++;
                        
                        // Track riparian protection
                        if (isRiparianZone) {
                            riparianCellsProtected++;
                        }
                    }
                }
            });
            
            // Log riparian protection stats (throttled)
            if (riparianCellsProtected > 0 && leachedCellsCount > 0) {
                console.log(`[LEACHING] ${leachedCellsCount} cells leached, ${riparianCellsProtected} riparian protected (${(riparianCellsProtected/leachedCellsCount*100).toFixed(1)}%)`);
            }
            
            // Return whether cells were updated (for cache invalidation)
            return waterCellsUpdated > 0 || nitrogenCellsUpdated > 0 || leachedCellsCount > 0;
        }
        
        return false;
    }
    
    /**
     * Apply organic matter decomposition into nitrogen and phosphorus
     * Uses localized decomposition only in active plant zones (Phase 2 optimization)
     * P1: Added riparianGrid parameter for O(1) riparian zone lookups
     * @param {Map} soilGrid - Map of soil objects keyed by "x,y"
     * @param {Function} getSoilAt - Function to get soil at (x, y)
     * @param {number} deltaTime - Time since last frame (seconds)
     * @param {Map<string, Object>} riparianGrid - Pre-computed riparian grid (P1 optimization)
     * @returns {boolean} Whether cells were affected (for cache invalidation)
     */
    applyOrganicMatterDecomposition(soilGrid, getSoilAt, deltaTime, riparianGrid = null) {
        // Check if decomposition is enabled
        if (!this.decompositionConfig || !this.decompositionConfig.enabled) {
            return false;
        }
        
        // Get time manager for game day calculations
        const timeManager = window.graphicsEngine?.timeManager;
        if (!timeManager) {
            return false;
        }
        
        // Calculate game days elapsed this frame
        const realSecondsPerGameDay = timeManager.config.realSecondsPerGameDay;
        const gameDaysElapsed = deltaTime / realSecondsPerGameDay;
        const currentGameDay = timeManager.getElapsedGameDays();
        
        // Calculate base decay rate
        const baseDecayPerDay = this.decompositionConfig.organicMatterDecayPerDay;
        
        // Apply weather multiplier
        let weatherMultiplier = 1.0; // Default (no weather or cloudy baseline)
        
        const weatherManager = window.graphicsEngine?.weatherManager;
        if (weatherManager && weatherManager.initialized && this.decompositionConfig.weatherModifiers) {
            const currentWeather = weatherManager.getCurrentWeather();
            
            if (currentWeather === 'rainy') {
                // Rain accelerates decomposition (moisture + microbes)
                const rainIntensity = weatherManager.getRainIntensity();
                const rainyConfig = this.decompositionConfig.weatherModifiers.rainy;
                weatherMultiplier = rainyConfig.base + (rainIntensity * rainyConfig.intensityScale);
            } else if (currentWeather === 'sunny') {
                // Sun slows decomposition (drier soil, heat stress on microbes)
                weatherMultiplier = this.decompositionConfig.weatherModifiers.sunny;
            } else if (currentWeather === 'cloudy') {
                // Cloudy is baseline
                weatherMultiplier = this.decompositionConfig.weatherModifiers.cloudy;
            }
        }
        
        // Get riparian zone configuration (Milestone 4) - P1: Now using pre-computed grid
        const riparianConfig = this.decompositionConfig.riparianZone;
        
        // Calculate final decay amount with weather modifier
        const decayThisFrame = baseDecayPerDay * weatherMultiplier * gameDaysElapsed;
        
        // Skip if decay amount is negligible
        if (decayThisFrame < 0.001) {
            return false;
        }
        
        // Get decomposition ratios
        const nitrogenRatio = this.decompositionConfig.nitrogenReleaseRatio;
        const phosphorusRatio = this.decompositionConfig.phosphorusReleaseRatio;
        const minimumOM = this.decompositionConfig.minimumOMForBreakdown;
        
        // Track cells affected for logging
        let cellsAffected = 0;
        let totalOMDecayed = 0;
        let totalNAdded = 0;
        let totalPAdded = 0;
        let cellsExpired = 0;
        let riparianCellsProcessed = 0;
        let totalRiparianOMAdded = 0;
        
        // Get plant manager for living plant checks
        const plantManager = window.graphicsEngine?.plantManager;
        
        // Apply decomposition ONLY to active cells (localized)
        const cellsToCheck = Array.from(this.activeCells);
        
        cellsToCheck.forEach(cellKey => {
            const [gridX, gridY] = cellKey.split(',').map(Number);
            const soil = getSoilAt(gridX, gridY);
            
            if (!soil) {
                this.activeCells.delete(cellKey);
                this.cellLastPlantActivity.delete(cellKey);
                return;
            }
            
            // Check if cell still has active decomposition conditions:
            // 1. Has living plant (root zone activity boosts microbes)
            // 2. OR had recent plant death (within activity window)
            const plants = plantManager && plantManager.getPlantAt(gridX, gridY); // Returns array
            const hasLivingPlant = plants && plants.length > 0;
            const lastActivity = this.cellLastPlantActivity.get(cellKey) || 0;
            const daysSinceActivity = currentGameDay - lastActivity;
            
            const isActive = hasLivingPlant || daysSinceActivity < this.decompositionActivityWindow;
            
            if (!isActive) {
                // No recent activity - remove from active set
                this.activeCells.delete(cellKey);
                this.cellLastPlantActivity.delete(cellKey);
                cellsExpired++;
                return;
            }
            
            // Update activity timestamp if living plant present
            if (hasLivingPlant) {
                this.cellLastPlantActivity.set(cellKey, currentGameDay);
            }
            
            // P1: Check if cell is in riparian zone using pre-computed grid (O(1) lookup)
            let isRiparianZone = false;
            let riparianDecayMultiplier = 1.0; // Default: normal decay
            let riparianOMInput = 0; // Default: no extra OM input
            
            const riparianConfig = this.decompositionConfig.riparianZone;
            if (riparianConfig?.enabled && riparianGrid) {
                const cellKey = `${gridX},${gridY}`;
                isRiparianZone = riparianGrid.has(cellKey);
                
                if (isRiparianZone) {
                    riparianDecayMultiplier = riparianConfig.decayMultiplier || 0.5;
                    riparianOMInput = riparianConfig.organicInputPerDay || 0.3;
                    riparianCellsProcessed++;
                }
            }
            
            // Only decompose if OM is above minimum threshold
            if (soil.organicMatter > minimumOM) {
                // Store old values
                const oldOM = soil.organicMatter;
                const oldN = soil.nitrogen;
                const oldP = soil.phosphorus;
                
                // Calculate actual decay (don't go below minimum)
                const availableOM = soil.organicMatter - minimumOM;
                
                // Apply decay (with riparian modifier)
                const decayAmount = decayThisFrame * riparianDecayMultiplier;
                const actualDecay = Math.min(decayAmount, availableOM);
                
                // Apply decay
                soil.organicMatter -= actualDecay;
                soil.nitrogen += actualDecay * nitrogenRatio;
                soil.phosphorus += actualDecay * phosphorusRatio;
                
                // Add riparian organic input (Milestone 4)
                if (riparianOMInput > 0) {
                    const inputAmount = riparianOMInput * gameDaysElapsed;
                    soil.organicMatter = Math.min(100, soil.organicMatter + inputAmount);
                    totalRiparianOMAdded += inputAmount;
                }
                
                // Clamp all values to 0-100 range
                soil.organicMatter = Math.max(0, Math.min(100, soil.organicMatter));
                soil.nitrogen = Math.max(0, Math.min(100, soil.nitrogen));
                soil.phosphorus = Math.max(0, Math.min(100, soil.phosphorus));
                
                // Update derived properties if significant change occurred
                if (actualDecay > 0.01 || riparianOMInput > 0) {
                    soil.fertility = soil.calculateFertility();
                    soil.baseColor = soil.calculateBaseColor();
                    soil.needsUpdate = true;
                    
                    cellsAffected++;
                    totalOMDecayed += actualDecay;
                    totalNAdded += soil.nitrogen - oldN;
                    totalPAdded += soil.phosphorus - oldP;
                }
            }
        });
        
        // Log if cells updated (throttled)
        if (cellsAffected > 0) {
            if (this.decompositionConfig.enableLogging) {
                this.decompositionLogCounter += gameDaysElapsed;
                
                if (this.decompositionLogCounter >= this.decompositionLogInterval) {
                    // Get current weather for logging
                    let weatherInfo = '';
                    if (weatherManager && weatherManager.initialized) {
                        const weather = weatherManager.getCurrentWeather();
                        const multiplier = weatherMultiplier.toFixed(2);
                        weatherInfo = ` [Weather: ${weather}, multiplier: ${multiplier}x]`;
                    }
                    
                    let riparianInfo = '';
                    if (riparianCellsProcessed > 0) {
                        riparianInfo = ` [Riparian: ${riparianCellsProcessed} cells, +${totalRiparianOMAdded.toFixed(2)} OM added]`;
                    }
                    
                    console.log(`[OM DECOMP LOCALIZED] ${cellsAffected}/${this.activeCells.size} active cells decomposed (${cellsExpired} expired) - OM decayed: ${totalOMDecayed.toFixed(2)}, N added: ${totalNAdded.toFixed(2)}, P added: ${totalPAdded.toFixed(2)}${weatherInfo}${riparianInfo}`);
                    this.decompositionLogCounter = 0;
                }
            }
        }
        
        return cellsAffected > 0;
    }
    
    /**
     * Mark a cell as active for decomposition (called when plant grows or dies)
     * @param {number} x - Grid x coordinate
     * @param {number} y - Grid y coordinate
     */
    markCellActive(x, y) {
        const cellKey = `${x},${y}`;
        this.activeCells.add(cellKey);
        
        // Update last activity timestamp
        const timeManager = window.graphicsEngine?.timeManager;
        if (timeManager) {
            const currentGameDay = timeManager.getElapsedGameDays();
            this.cellLastPlantActivity.set(cellKey, currentGameDay);
        }
    }
    
    /**
     * Get the number of active decomposition cells
     * @returns {number}
     */
    getActiveCellCount() {
        return this.activeCells.size;
    }
    
    /**
     * Clear all active cell tracking (useful for reset)
     */
    clearActiveCells() {
        this.activeCells.clear();
        this.cellLastPlantActivity.clear();
    }
    
    /**
     * Apply nitrogen regeneration (nitrogen fixation and atmospheric deposition)
     * Simulates natural nitrogen inputs that maintain ecosystem fertility
     * P1: Added riparianGrid parameter for O(1) riparian zone lookups
     * @param {Map} soilGrid - Map of soil objects keyed by "x,y"
     * @param {number} deltaTime - Time since last frame (seconds)
     * @param {Map<string, Object>} riparianGrid - Pre-computed riparian grid (P1 optimization)
     * @returns {boolean} Whether cells were affected
     */
    applyNitrogenRegeneration(soilGrid, deltaTime, riparianGrid = null) {
        if (!this.nitrogenRegenConfig || !this.nitrogenRegenConfig.enabled) {
            return false;
        }
        
        const timeManager = window.graphicsEngine?.timeManager;
        if (!timeManager) {
            return false;
        }
        
        const realSecondsPerGameDay = timeManager.config.realSecondsPerGameDay;
        const gameDaysElapsed = deltaTime / realSecondsPerGameDay;
        const baseRatePerDay = this.nitrogenRegenConfig.baseRatePerDay || 0.15;
        
        // Get riparian multiplier from config
        const riparianMultiplier = this.nitrogenRegenConfig.riparianMultiplier || 2.0;
        
        let cellsUpdated = 0;
        let totalNAdded = 0;
        let riparianCellsUpdated = 0;
        
        soilGrid.forEach(soil => {
            if (!soil.isPlantable || soil.isWater) return;
            
            // P1: Check if in riparian zone using pre-computed grid (O(1) lookup)
            let isRiparian = false;
            if (riparianGrid) {
                const cellKey = `${soil.gridX},${soil.gridY}`;
                isRiparian = riparianGrid.has(cellKey);
            }
            
            // Calculate regeneration amount (with riparian bonus)
            const multiplier = isRiparian ? riparianMultiplier : 1.0;
            const regenAmount = baseRatePerDay * multiplier * gameDaysElapsed;
            
            // Only regenerate if below 100 (capped)
            if (soil.nitrogen < 100) {
                const oldN = soil.nitrogen;
                soil.nitrogen = Math.min(100, soil.nitrogen + regenAmount);
                
                // Update derived properties
                soil.fertility = soil.calculateFertility();
                soil.baseColor = soil.calculateBaseColor();
                soil.needsUpdate = true;
                
                cellsUpdated++;
                totalNAdded += (soil.nitrogen - oldN);
                
                if (isRiparian) {
                    riparianCellsUpdated++;
                }
            }
        });
        
        return cellsUpdated > 0;
    }
    
    /**
     * Apply P/K weathering from parent rock material (universal regeneration)
     * Simulates slow mineral weathering that prevents total P/K depletion
     * @param {Map} soilGrid - Map of soil objects keyed by "x,y"
     * @param {number} deltaTime - Time since last frame (seconds)
     * @returns {boolean} Whether cells were affected
     */
    applyWeathering(soilGrid, deltaTime) {
        if (!this.weatheringConfig || !this.weatheringConfig.enabled) {
            return false;
        }
        
        const timeManager = window.graphicsEngine?.timeManager;
        if (!timeManager) {
            return false;
        }
        
        const realSecondsPerGameDay = timeManager.config.realSecondsPerGameDay;
        const gameDaysElapsed = deltaTime / realSecondsPerGameDay;
        const pRatePerDay = this.weatheringConfig.baseRatePerDay?.phosphorus || 0.02;
        const kRatePerDay = this.weatheringConfig.baseRatePerDay?.potassium || 0.02;
        
        let cellsUpdated = 0;
        let totalPAdded = 0;
        let totalKAdded = 0;
        
        soilGrid.forEach(soil => {
            if (!soil.isPlantable || soil.isWater) return;
            
            // Calculate regeneration amounts
            const pRegenAmount = pRatePerDay * gameDaysElapsed;
            const kRegenAmount = kRatePerDay * gameDaysElapsed;
            
            // Only regenerate if below 100 (capped)
            const needsP = soil.phosphorus < 100;
            const needsK = soil.potassium < 100;
            
            if (needsP || needsK) {
                const oldP = soil.phosphorus;
                const oldK = soil.potassium;
                
                if (needsP) {
                    soil.phosphorus = Math.min(100, soil.phosphorus + pRegenAmount);
                }
                
                if (needsK) {
                    soil.potassium = Math.min(100, soil.potassium + kRegenAmount);
                }
                
                // Update derived properties
                soil.fertility = soil.calculateFertility();
                soil.baseColor = soil.calculateBaseColor();
                soil.needsUpdate = true;
                
                cellsUpdated++;
                totalPAdded += (soil.phosphorus - oldP);
                totalKAdded += (soil.potassium - oldK);
            }
        });
        
        return cellsUpdated > 0;
    }
    
    /**
     * Apply water table seeping effects to increase moisture retention near water.
     * Uses pre-computed influence map for O(N) performance instead of O(N×M).
     * @param {Map} soilGrid - Soil grid to apply effects to
     * @param {Set} allWaterTiles - Set of all water tile keys (for fallback)
     * @param {number} deltaTime - Time elapsed since last update (in game days)
     * @param {Object} config - Water table configuration
     * @param {Map<string, {seepingRate, waterType, distance}>} influenceMap - Pre-computed influence (P2 optimization)
     * @returns {number} Number of cells updated
     */
    applyWaterTableEffects(soilGrid, allWaterTiles, deltaTime, config, influenceMap = null) {
        if (!config || !config.enabled) {
            return 0;
        }
        
        const radius = config.radius || 4;
        const seepingRatePerDay = config.seepingRatePerDay || 0.5;
        const maxWaterRetention = config.maxWaterRetention || 90;
        
        let cellsUpdated = 0;
        
        // P2 OPTIMIZATION: Use pre-computed influence map if available
        if (influenceMap && influenceMap.size > 0) {
            // Fast path: O(N) iteration over affected cells only
            influenceMap.forEach((influence, cellKey) => {
                const [cellX, cellY] = cellKey.split(',').map(Number);
                const soil = soilGrid.get(cellKey);
                
                if (!soil) return; // Cell not in grid (shouldn't happen)
                
                // Skip if water tile, not plantable, or already at max
                if (soil.isWater || !soil.isPlantable || soil.waterRetention >= maxWaterRetention) {
                    return;
                }
                
                // Apply pre-computed seeping rate (already includes falloff)
                const seepingAmount = influence.seepingRate * deltaTime;
                
                // Only apply if significant seeping
                if (seepingAmount < 0.001) return;
                
                // Update water retention (clamped to max)
                const oldWater = soil.waterRetention;
                soil.waterRetention = Math.min(maxWaterRetention, soil.waterRetention + seepingAmount);
                
                // If water changed significantly, regenerate water pixels
                if (Math.abs(soil.waterRetention - oldWater) > 0.1) {
                    soil.waterPixels = soil.generateWaterPixels();
                    soil.needsUpdate = true;
                    cellsUpdated++;
                }
            });
            
            return cellsUpdated;
        }
        
        // FALLBACK: Original O(N×M) nested loop implementation (for backwards compatibility)
        if (!allWaterTiles || allWaterTiles.size === 0) {
            return 0;
        }
        
        allWaterTiles.forEach(waterKey => {
            const [waterX, waterY] = waterKey.split(',').map(Number);
            
            // Check cells in radius around water tile
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const targetX = waterX + dx;
                    const targetY = waterY + dy;
                    const targetKey = `${targetX},${targetY}`;
                    
                    // Get soil cell
                    const soil = soilGrid.get(targetKey);
                    
                    // Skip if no soil, is water, or not plantable
                    if (!soil || soil.isWater || !soil.isPlantable) continue;
                    
                    // Skip if already at max water retention
                    if (soil.waterRetention >= maxWaterRetention) continue;
                    
                    // Calculate distance from water tile
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Skip if outside radius
                    if (distance > radius) continue;
                    
                    // Calculate linear falloff: 1.0 at water edge, 0.0 at radius
                    const falloff = 1.0 - (distance / radius);
                    
                    // Calculate seeping amount this frame
                    const seepingAmount = seepingRatePerDay * deltaTime * falloff;
                    
                    // Only apply if significant seeping
                    if (seepingAmount < 0.001) continue;
                    
                    // Update water retention (clamped to max)
                    const oldWater = soil.waterRetention;
                    soil.waterRetention = Math.min(maxWaterRetention, soil.waterRetention + seepingAmount);
                    
                    // If water changed significantly, regenerate water pixels
                    if (Math.abs(soil.waterRetention - oldWater) > 0.1) {
                        soil.waterPixels = soil.generateWaterPixels();
                        soil.needsUpdate = true;
                        cellsUpdated++;
                    }
                }
            }
        });
        
        return cellsUpdated;
    }
    
    /**
     * Apply flood effects to soil near rivers
     * Simulates seasonal flooding with nutrient deposition
     * @param {Map} soilGrid - Soil grid to apply effects to
     * @param {Set} riverTiles - Set of river tile keys
     * @param {Object} config - Flood event configuration
     * @returns {boolean} Whether texture refresh is needed
     */
    applyFloodEffects(soilGrid, riverTiles, config) {
        if (!config || !config.enabled) {
            return false;
        }
        
        if (!riverTiles || riverTiles.size === 0) {
            if (config.enableLogging) {
                console.log('[FLOOD] No river tiles found - skipping flood event');
            }
            return false;
        }
        
        const startTime = performance.now();
        const radius = config.radius || 3;
        const nitrogenBonus = config.nitrogenBonus || 10;
        const phosphorusBonus = config.phosphorusBonus || 5;
        const potassiumBonus = config.potassiumBonus || 3;
        const organicMatterBonus = config.organicMatterBonus || 8;
        
        // Track affected cells (use Set to avoid duplicate processing)
        const affectedCells = new Set();
        
        // For each river tile, apply flood effects to surrounding cells
        riverTiles.forEach(riverKey => {
            const [riverX, riverY] = riverKey.split(',').map(Number);
            
            // Check cells in radius around river tile
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const targetX = riverX + dx;
                    const targetY = riverY + dy;
                    const targetKey = `${targetX},${targetY}`;
                    
                    // Skip if already processed
                    if (affectedCells.has(targetKey)) continue;
                    
                    // Get soil cell
                    const soil = soilGrid.get(targetKey);
                    
                    // Skip if no soil, is water, or not plantable
                    if (!soil || soil.isWater || !soil.isPlantable) continue;
                    
                    // Calculate distance from river tile
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Skip if outside radius (for circular falloff)
                    if (distance > radius) continue;
                    
                    // Calculate linear falloff: 1.0 at river edge, 0.0 at radius
                    const falloff = 1.0 - (distance / radius);
                    
                    // Apply nutrient bonuses with falloff
                    const nIncrease = nitrogenBonus * falloff;
                    const pIncrease = phosphorusBonus * falloff;
                    const kIncrease = potassiumBonus * falloff;
                    const omIncrease = organicMatterBonus * falloff;
                    
                    // Update soil properties (clamped 0-100)
                    soil.nitrogen = Math.min(100, soil.nitrogen + nIncrease);
                    soil.phosphorus = Math.min(100, soil.phosphorus + pIncrease);
                    soil.potassium = Math.min(100, soil.potassium + kIncrease);
                    soil.organicMatter = Math.min(100, soil.organicMatter + omIncrease);
                    
                    // Recalculate derived properties
                    soil.fertility = soil.calculateFertility();
                    soil.baseColor = soil.calculateBaseColor();
                    soil.waterPixels = soil.generateWaterPixels();
                    soil.needsUpdate = true;
                    
                    // Mark as affected
                    affectedCells.add(targetKey);
                }
            }
        });
        
        const endTime = performance.now();
        const processingTime = (endTime - startTime).toFixed(1);
        
        // Return true to signal texture refresh needed
        return affectedCells.size > 0;
    }
}
