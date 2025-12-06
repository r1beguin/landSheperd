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
        this.weatherEffectsConfig = config.weatherEffects || null;
        this.decompositionConfig = config.decomposition || null;
        
        // Decomposition state tracking
        this.decompositionLogCounter = 0;
        this.decompositionLogInterval = 5; // Log every N game days
        this.decompositionActivityWindow = 30; // Days to keep cells active after plant death
        
        // Active cells for localized decomposition (Phase 2 optimization)
        this.activeCells = new Set(); // Set of "x,y" strings
        this.cellLastPlantActivity = new Map(); // Map<"x,y", gameDay>
        
        console.log('[SoilEffectsManager] Initialized', {
            weatherEffectsEnabled: !!this.weatherEffectsConfig,
            decompositionEnabled: this.decompositionConfig?.enabled || false,
            activityWindow: this.decompositionActivityWindow
        });
    }
    
    /**
     * Apply weather effects to soil (rain increases water, sun evaporates)
     * MILESTONE 4: Added nutrient leaching during rain (surface → deep transfer)
     * @param {Map} soilGrid - Map of soil objects keyed by "x,y"
     * @param {number} deltaTime - Time since last frame (seconds)
     */
    applyWeatherEffects(soilGrid, deltaTime) {
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
                    
                    // Calculate leach amounts this frame
                    const nLeach = leachAmountsPerDay.nitrogen * gameDaysElapsed;
                    const pLeach = leachAmountsPerDay.phosphorus * gameDaysElapsed;
                    const kLeach = leachAmountsPerDay.potassium * gameDaysElapsed;
                    const omLeach = leachAmountsPerDay.organicMatter * gameDaysElapsed;
                    
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
                    }
                }
            });
            
            // Return whether cells were updated (for cache invalidation)
            return waterCellsUpdated > 0 || nitrogenCellsUpdated > 0 || leachedCellsCount > 0;
        }
        
        return false;
    }
    
    /**
     * Apply organic matter decomposition into nitrogen and phosphorus
     * Uses localized decomposition only in active plant zones (Phase 2 optimization)
     * @param {Map} soilGrid - Map of soil objects keyed by "x,y"
     * @param {Function} getSoilAt - Function to get soil at (x, y)
     * @param {number} deltaTime - Time since last frame (seconds)
     * @returns {boolean} Whether cells were affected (for cache invalidation)
     */
    applyOrganicMatterDecomposition(soilGrid, getSoilAt, deltaTime) {
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
        
        // Get plant manager for living plant checks
        const plantManager = window.graphicsEngine?.plantManager;
        
        // Apply decomposition ONLY to active cells (localized)
        const cellsToCheck = Array.from(this.activeCells);
        
        cellsToCheck.forEach(cellKey => {
            const [x, y] = cellKey.split(',').map(Number);
            const soil = getSoilAt(x, y);
            
            if (!soil) {
                this.activeCells.delete(cellKey);
                this.cellLastPlantActivity.delete(cellKey);
                return;
            }
            
            // Check if cell still has active decomposition conditions:
            // 1. Has living plant (root zone activity boosts microbes)
            // 2. OR had recent plant death (within activity window)
            const plants = plantManager && plantManager.getPlantAt(x, y); // Returns array
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
            
            // Only decompose if OM is above minimum threshold
            if (soil.organicMatter > minimumOM) {
                // Store old values
                const oldOM = soil.organicMatter;
                const oldN = soil.nitrogen;
                const oldP = soil.phosphorus;
                
                // Calculate actual decay (don't go below minimum)
                const availableOM = soil.organicMatter - minimumOM;
                const actualDecay = Math.min(decayThisFrame, availableOM);
                
                // Apply decay
                soil.organicMatter -= actualDecay;
                soil.nitrogen += actualDecay * nitrogenRatio;
                soil.phosphorus += actualDecay * phosphorusRatio;
                
                // Clamp all values to 0-100 range
                soil.organicMatter = Math.max(0, Math.min(100, soil.organicMatter));
                soil.nitrogen = Math.max(0, Math.min(100, soil.nitrogen));
                soil.phosphorus = Math.max(0, Math.min(100, soil.phosphorus));
                
                // Update derived properties if significant change occurred
                if (actualDecay > 0.01) {
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
                    
                    console.log(`[OM DECOMP LOCALIZED] ${cellsAffected}/${this.activeCells.size} active cells decomposed (${cellsExpired} expired) - OM decayed: ${totalOMDecayed.toFixed(2)}, N added: ${totalNAdded.toFixed(2)}, P added: ${totalPAdded.toFixed(2)}${weatherInfo}`);
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
}
