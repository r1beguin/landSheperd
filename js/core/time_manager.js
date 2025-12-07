/**
 * TimeManager - Manages game time and time scale for plant growth simulation
 * 
 * Converts real-time deltaTime into game days, allowing players to speed up,
 * slow down, or pause time. Essential for visualizing plant growth over time.
 * 
 * Features:
 * - Adjustable time scale (pause, slow, normal, fast, very fast)
 * - Game day tracking
 * - Real seconds to game days conversion
 */

class TimeManager {
    constructor(config) {
        this.config = config || {};
        
        // Time tracking
        this.currentDay = 0; // Total elapsed game days (fractional)
        this.timeScale = this.config.initialTimeScale || 1.0;
        
        // Configuration
        this.realSecondsPerGameDay = this.config.realSecondsPerGameDay || 10;
        this.timeScalePresets = this.config.timeScalePresets || {
            pause: 0,
            slow: 0.5,
            normal: 1.0,
            fast: 5.0,
            veryFast: 20.0
        };
        
        // State
        this.isPaused = false;
        this.previousTimeScale = this.timeScale;
        
        // Flood event tracking
        this.daysSinceLastFlood = 0;
        this.floodConfig = null; // Will be set in initialize()
    }
    
    /**
     * Initialize flood event configuration
     * Called after GraphicsEngine is fully initialized
     * @param {Object} engineConfig - Full config from GraphicsEngine
     */
    initialize(engineConfig) {
        this.floodConfig = engineConfig?.world?.terrain?.water?.floodEvents;
        if (this.floodConfig && this.floodConfig.enabled) {
            console.log(`[TIME] Flood events enabled: every ${this.floodConfig.intervalDays} days`);
        }
    }
    
    /**
     * Update time based on real deltaTime
     * @param {number} deltaTime - Time elapsed in milliseconds since last frame
     * @returns {number} Game days elapsed this frame
     */
    update(deltaTime) {
        if (this.isPaused || this.timeScale === 0) {
            return 0;
        }
        
        // Convert milliseconds to seconds
        const deltaSeconds = deltaTime / 1000;
        
        // Convert real seconds to game days
        const gameDaysElapsed = (deltaSeconds / this.realSecondsPerGameDay) * this.timeScale;
        
        // Update current day
        this.currentDay += gameDaysElapsed;
        
        // Check for flood events (after day changes)
        if (this.floodConfig && this.floodConfig.enabled) {
            this.daysSinceLastFlood += gameDaysElapsed;
            
            if (this.daysSinceLastFlood >= this.floodConfig.intervalDays) {
                this.triggerFloodEvent();
                this.daysSinceLastFlood = 0;
            }
        }
        
        return gameDaysElapsed;
    }
    
    /**
     * Get current game day (integer)
     */
    getCurrentDay() {
        return Math.floor(this.currentDay);
    }
    
    /**
     * Get precise current day (fractional)
     */
    getCurrentDayPrecise() {
        return this.currentDay;
    }
    
    /**
     * Get elapsed game days (alias for getCurrentDayPrecise)
     * Used by localized decomposition system
     */
    getElapsedGameDays() {
        return this.currentDay;
    }
    
    /**
     * Get current time scale multiplier
     */
    getTimeScale() {
        return this.timeScale;
    }
    
    /**
     * Set time scale to a specific value
     * @param {number} scale - Time scale multiplier (0 = paused, 1 = normal, >1 = faster)
     */
    setTimeScale(scale) {
        if (scale < 0) {
            console.warn('Time scale cannot be negative, setting to 0');
            scale = 0;
        }
        
        this.timeScale = scale;
        this.isPaused = (scale === 0);
    }
    
    /**
     * Set time scale using preset name
     * @param {string} presetName - Name of preset (pause, slow, normal, fast, veryFast)
     */
    setTimeScalePreset(presetName) {
        if (this.timeScalePresets[presetName] !== undefined) {
            this.setTimeScale(this.timeScalePresets[presetName]);
        } else {
            console.warn(`[TIME] Unknown time scale preset: ${presetName}`);
        }
    }
    
    /**
     * Increase time scale to next preset level
     */
    increaseTimeScale() {
        const presets = Object.values(this.timeScalePresets).sort((a, b) => a - b);
        const currentIndex = presets.findIndex(preset => preset >= this.timeScale);
        
        if (currentIndex < presets.length - 1) {
            this.setTimeScale(presets[currentIndex + 1]);
        }
    }
    
    /**
     * Decrease time scale to previous preset level
     */
    decreaseTimeScale() {
        const presets = Object.values(this.timeScalePresets).sort((a, b) => a - b);
        const currentIndex = presets.findIndex(preset => preset >= this.timeScale);
        
        if (currentIndex > 0) {
            this.setTimeScale(presets[currentIndex - 1]);
        }
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }
    
    /**
     * Pause time
     */
    pause() {
        if (!this.isPaused) {
            this.previousTimeScale = this.timeScale;
            this.isPaused = true;
            this.timeScale = 0;
        }
    }
    
    /**
     * Resume time
     */
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.timeScale = this.previousTimeScale || this.config.initialTimeScale || 1.0;
        }
    }
    
    /**
     * Check if time is paused
     */
    isPausedState() {
        return this.isPaused;
    }
    
    /**
     * Get time scale display string
     */
    getTimeScaleDisplayString() {
        if (this.isPaused || this.timeScale === 0) {
            return 'PAUSED';
        } else if (this.timeScale === 1.0) {
            return '1x (Normal)';
        } else if (this.timeScale < 1.0) {
            return `${this.timeScale}x (Slow)`;
        } else {
            return `${this.timeScale}x (Fast)`;
        }
    }
    
    /**
     * Reset time to day 0
     */
    reset() {
        this.currentDay = 0;
        this.timeScale = this.config.initialTimeScale || 1.0;
        this.isPaused = false;
    }
    
    /**
     * Get hour of day (0-24)
     * Converts fractional game day to hour within 24-hour cycle
     * @returns {number} Hour of day (0-24, fractional)
     */
    getHourOfDay() {
        // 1 game day = 24 hours
        const fractionalDay = this.currentDay - Math.floor(this.currentDay);
        return fractionalDay * 24; // 0-24 hours
    }
    
    /**
     * Get time of day as formatted string (HH:MM)
     * @returns {string} Time string in 24-hour format
     */
    getTimeOfDayString() {
        const hour = Math.floor(this.getHourOfDay());
        const minute = Math.floor((this.getHourOfDay() % 1) * 60);
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
    
    /**
     * Trigger a flood event
     * Applies nutrient deposition to soil near rivers
     */
    triggerFloodEvent() {
        if (this.floodConfig.enableLogging) {
            console.log(`[FLOOD] Flood event triggered (Day ${Math.floor(this.currentDay)})`);
        }
        
        // Get required managers
        const soilManager = window.graphicsEngine?.soilManager;
        const terrainGen = soilManager?.terrainGenerator;
        
        if (!soilManager || !terrainGen) {
            console.warn('[FLOOD] Cannot trigger flood - managers not available');
            return;
        }
        
        // Get river tiles from terrain generator
        const riverTiles = terrainGen.getRiverTiles();
        
        if (!riverTiles || riverTiles.size === 0) {
            if (this.floodConfig.enableLogging) {
                console.log('[FLOOD] No river tiles found - skipping flood event');
            }
            return;
        }
        
        // Apply flood effects via SoilEffectsManager
        const updated = soilManager.soilEffectsManager.applyFloodEffects(
            soilManager.soilGrid,
            riverTiles,
            this.floodConfig
        );
        
        // Force texture refresh if cells were updated
        if (updated) {
            soilManager.needsRefresh = true;
        }
    }
}
