/**
 * LightingManager - Manages dynamic lighting based on time-of-day and weather conditions
 * 
 * Features:
 * - 24-hour day/night cycle with 9 distinct lighting phases
 * - Smooth lerp-based transitions between phases
 * - Time-of-day ambient color and brightness
 * - Weather-based lighting modulation (integration in Milestone 3)
 * - Manual time override for testing
 * 
 * Lighting Phases (0-24 hours):
 * - night (0-6h): Dark blue, low brightness
 * - earlyMorning (6-8h): Warm orange sunrise
 * - morning (8-12h): Bright daylight
 * - midday (12-14h): Maximum brightness
 * - afternoon (14-18h): Soft warm light
 * - evening (18-20h): Golden hour
 * - sunset (20-21h): Deep orange sunset
 * - dusk (21-23h): Twilight purple
 * - night (23-24h): Dark blue, low brightness
 */

class LightingManager {
    /**
     * Initialize lighting manager
     * @param {Object} config - Lighting configuration from config.json
     * @param {TimeManager} timeManager - Reference to time manager
     * @param {WeatherManager} weatherManager - Reference to weather manager (for Milestone 3)
     */
    constructor(config, timeManager, weatherManager) {
        this.config = config || {};
        this.timeManager = timeManager;
        this.weatherManager = weatherManager;
        
        // Feature flag
        this.enabled = this.config.enabled !== false;
        
        // Configuration
        this.phases = this.config.timeOfDay || this._getDefaultPhases();
        this.transitionSpeed = this.config.transitionSpeed || 1.0;
        
        // Current lighting state
        this.currentAmbientColor = [1, 1, 1, 1]; // RGBA (0-1 range)
        this.currentBrightness = 1.0; // 0-1 range
        this.currentPhase = 'midday';
        
        // Manual override for testing
        this.timeOverride = null;
        
        // Convert phases object to sorted array for easier iteration
        this.phasesArray = this._buildPhasesArray();
        
        console.log('[LIGHTING] LightingManager initialized');
        console.log(`[LIGHTING] Enabled: ${this.enabled}`);
        console.log(`[LIGHTING] Phases configured: ${this.phasesArray.length}`);
    }
    
    /**
     * Default lighting phases if config is missing
     * @private
     */
    _getDefaultPhases() {
        return {
            night: {
                hours: [0, 6],
                color: [0.15, 0.18, 0.35],
                brightness: 0.25
            },
            earlyMorning: {
                hours: [6, 8],
                color: [0.95, 0.75, 0.55],
                brightness: 0.65
            },
            morning: {
                hours: [8, 12],
                color: [1.0, 0.98, 0.92],
                brightness: 0.95
            },
            midday: {
                hours: [12, 14],
                color: [1.0, 1.0, 1.0],
                brightness: 1.0
            },
            afternoon: {
                hours: [14, 18],
                color: [1.0, 0.95, 0.85],
                brightness: 0.95
            },
            evening: {
                hours: [18, 20],
                color: [0.98, 0.85, 0.70],
                brightness: 0.75
            },
            sunset: {
                hours: [20, 21],
                color: [1.0, 0.60, 0.35],
                brightness: 0.50
            },
            dusk: {
                hours: [21, 23],
                color: [0.45, 0.40, 0.60],
                brightness: 0.35
            }
        };
    }
    
    /**
     * Build sorted array of phases for easier iteration
     * @private
     */
    _buildPhasesArray() {
        const phasesArray = [];
        
        for (const [name, phaseData] of Object.entries(this.phases)) {
            phasesArray.push({
                name: name,
                startHour: phaseData.hours[0],
                endHour: phaseData.hours[1],
                color: phaseData.color,
                brightness: phaseData.brightness
            });
        }
        
        // Sort by start hour
        phasesArray.sort((a, b) => a.startHour - b.startHour);
        
        return phasesArray;
    }
    
    /**
     * Update lighting based on current time
     * @param {number} deltaTime - Time elapsed in milliseconds (unused for now, for future smooth transitions)
     */
    update(deltaTime) {
        if (!this.enabled) return;
        
        // Get hour of day (0-24)
        const hour = this.timeOverride !== null 
            ? this.timeOverride 
            : this.timeManager.getHourOfDay();
        
        // Find current phase and next phase with transition progress
        const { currentPhase, nextPhase, transitionProgress } = this._findPhases(hour);
        
        // Interpolate between phases (base time-of-day color)
        const baseColor = this._lerpColors(
            currentPhase.color,
            nextPhase.color,
            transitionProgress
        );
        
        const baseBrightness = this._lerp(
            currentPhase.brightness,
            nextPhase.brightness,
            transitionProgress
        );
        
        // Apply weather modifier
        const weatherMod = this._calculateWeatherModifier();
        
        // Combine time-of-day + weather
        this.currentAmbientColor = this._applyWeatherModifier(baseColor, weatherMod);
        
        // Add alpha channel (always 1.0)
        this.currentAmbientColor.push(1.0);
        
        // Combine brightness
        this.currentBrightness = baseBrightness * weatherMod.brightnessMultiplier;
        
        this.currentPhase = currentPhase.name;
    }
    
    /**
     * Find which phase we're in and calculate transition progress
     * @param {number} hour - Current hour (0-24)
     * @returns {Object} Current phase, next phase, and transition progress (0-1)
     * @private
     */
    _findPhases(hour) {
        // Handle wrapping (23-24 wraps to 0-6 night phase)
        const normalizedHour = hour % 24;
        
        let currentPhaseIndex = 0;
        let nextPhaseIndex = 1;
        let transitionProgress = 0;
        
        // Find which phase we're in
        for (let i = 0; i < this.phasesArray.length; i++) {
            const phase = this.phasesArray[i];
            
            if (normalizedHour >= phase.startHour && normalizedHour < phase.endHour) {
                currentPhaseIndex = i;
                nextPhaseIndex = (i + 1) % this.phasesArray.length;
                
                // Calculate transition progress within this phase
                const phaseDuration = phase.endHour - phase.startHour;
                const timeIntoPhase = normalizedHour - phase.startHour;
                transitionProgress = timeIntoPhase / phaseDuration;
                
                break;
            }
        }
        
        // Handle wrap-around for last phase (dusk 21-23 to night 0-6)
        if (normalizedHour >= 23) {
            // We're past the last defined phase, wrap to first phase (night)
            currentPhaseIndex = this.phasesArray.length - 1; // Last phase (dusk)
            nextPhaseIndex = 0; // First phase (night)
            
            const lastPhase = this.phasesArray[currentPhaseIndex];
            const phaseDuration = 24 - lastPhase.endHour + this.phasesArray[0].startHour;
            const timeIntoPhase = normalizedHour - lastPhase.endHour;
            transitionProgress = timeIntoPhase / phaseDuration;
        }
        
        return {
            currentPhase: this.phasesArray[currentPhaseIndex],
            nextPhase: this.phasesArray[nextPhaseIndex],
            transitionProgress: transitionProgress
        };
    }
    
    /**
     * Linear interpolation between two RGB colors
     * @param {Array} colorA - RGB color [r, g, b] (0-1 range)
     * @param {Array} colorB - RGB color [r, g, b] (0-1 range)
     * @param {number} t - Interpolation factor (0-1)
     * @returns {Array} Interpolated RGB color
     * @private
     */
    _lerpColors(colorA, colorB, t) {
        return [
            this._lerp(colorA[0], colorB[0], t),
            this._lerp(colorA[1], colorB[1], t),
            this._lerp(colorA[2], colorB[2], t)
        ];
    }
    
    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     * @private
     */
    _lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * Get current ambient color (RGBA)
     * @returns {Array} RGBA color [r, g, b, a] (0-1 range)
     */
    getAmbientColor() {
        return [...this.currentAmbientColor];
    }
    
    /**
     * Get current ambient brightness
     * @returns {number} Brightness value (0-1)
     */
    getAmbientBrightness() {
        return this.currentBrightness;
    }
    
    /**
     * Get current phase name
     * @returns {string} Phase name (e.g., "midday", "sunset")
     */
    getCurrentPhase() {
        return this.currentPhase;
    }
    
    /**
     * Manually set time of day for testing
     * @param {number} hour - Hour to set (0-24)
     */
    setTimeOfDay(hour) {
        if (hour < 0 || hour > 24) {
            console.warn(`[LIGHTING] Invalid hour: ${hour}, clamping to 0-24`);
            hour = Math.max(0, Math.min(24, hour));
        }
        
        this.timeOverride = hour;
        console.log(`[LIGHTING] Time override set to ${hour} hours`);
    }
    
    /**
     * Reset manual time override
     */
    resetTimeOverride() {
        this.timeOverride = null;
        console.log('[LIGHTING] Time override reset');
    }
    
    /**
     * Check if lighting is enabled
     * @returns {boolean} True if enabled
     */
    isEnabled() {
        return this.enabled;
    }
    
    /**
     * Calculate weather-based lighting modifier
     * @returns {Object} { brightnessMultiplier: number, colorTint: [r,g,b] }
     * @private
     */
    _calculateWeatherModifier() {
        if (!this.weatherManager || !this.weatherManager.isEnabled()) {
            // No weather system: return neutral modifier
            return {
                brightnessMultiplier: 1.0,
                colorTint: [1.0, 1.0, 1.0]
            };
        }
        
        const weather = this.weatherManager.getCurrentWeather();
        const config = this.config.weatherModifiers || {};
        
        switch (weather) {
            case 'sunny':
                const sunnyConfig = config.sunny || {};
                return {
                    brightnessMultiplier: sunnyConfig.brightnessMultiplier || 1.0,
                    colorTint: sunnyConfig.colorTint || [1.0, 1.0, 1.0]
                };
            
            case 'cloudy':
                const cloudyConfig = config.cloudy || {};
                return {
                    brightnessMultiplier: cloudyConfig.brightnessMultiplier || 0.85,
                    colorTint: cloudyConfig.colorTint || [0.95, 0.95, 1.0]
                };
            
            case 'rainy':
                const rainyConfig = config.rainy || {};
                const intensity = this.weatherManager.getRainIntensity();
                
                // Base brightness reduction
                const baseBrightness = rainyConfig.brightnessMultiplier || 0.70;
                
                // Additional darkening based on rain intensity
                const intensityScale = rainyConfig.brightnessIntensityScale || 0.15;
                const brightnessMultiplier = baseBrightness - (intensity * intensityScale);
                
                return {
                    brightnessMultiplier: Math.max(0.4, brightnessMultiplier), // Clamp minimum
                    colorTint: rainyConfig.colorTint || [0.85, 0.90, 1.10]
                };
            
            default:
                // Unknown weather: return neutral
                return {
                    brightnessMultiplier: 1.0,
                    colorTint: [1.0, 1.0, 1.0]
                };
        }
    }
    
    /**
     * Apply weather modifier to time-of-day color
     * @param {Array} timeColor - Base RGB color from time of day [r,g,b]
     * @param {Object} weatherMod - Weather modifier { brightnessMultiplier, colorTint }
     * @returns {Array} Final RGB color [r,g,b]
     * @private
     */
    _applyWeatherModifier(timeColor, weatherMod) {
        return [
            timeColor[0] * weatherMod.colorTint[0] * weatherMod.brightnessMultiplier,
            timeColor[1] * weatherMod.colorTint[1] * weatherMod.brightnessMultiplier,
            timeColor[2] * weatherMod.colorTint[2] * weatherMod.brightnessMultiplier
        ];
    }
    
    /**
     * Get formatted debug string for current lighting state
     * @returns {string} Debug info
     */
    getDebugString() {
        const hour = this.timeOverride !== null 
            ? this.timeOverride 
            : this.timeManager.getHourOfDay();
        
        const weather = this.weatherManager?.getCurrentWeather() || 'none';
        const intensity = this.weatherManager?.getRainIntensity() || 0;
        
        // Include ambient color for debugging
        const ambientStr = `Ambient light: [${this.currentAmbientColor[0].toFixed(2)}, ${this.currentAmbientColor[1].toFixed(2)}, ${this.currentAmbientColor[2].toFixed(2)}]`;
        const weatherStr = weather === 'rainy' ? `${weather} (${(intensity * 100).toFixed(0)}%)` : weather;
        
        return `Time: ${hour.toFixed(2)}h | Phase: ${this.currentPhase} | Weather: ${weatherStr} | Brightness: ${(this.currentBrightness * 100).toFixed(0)}% | ${ambientStr}`;
    }
}
