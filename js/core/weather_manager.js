/**
 * WeatherManager - Manages dynamic weather states and transitions
 * 
 * Controls weather patterns (sunny, rainy, cloudy) with automatic transitions,
 * rain intensity calculation, and event system for weather change notifications.
 * Integrates with TimeManager for game time progression.
 * 
 * Features:
 * - Weather state management (sunny, rainy, cloudy)
 * - Automatic weather transitions with configurable durations
 * - Rain intensity calculation (0-1 scale)
 * - Event system for weather change notifications
 * - Manual weather control for testing
 */

class WeatherManager {
    constructor(config) {
        // Configuration from config.json.world.weather
        this.config = config || {};
        
        // Current weather state
        this.currentState = null;  // "sunny", "rainy", "cloudy"
        this.rainIntensity = 0;    // 0-1 scale (0 = no rain, 1 = heavy rain)
        
        // Transition timing
        this.stateStartDay = 0;       // Game day when current state began
        this.stateDuration = 0;       // Duration of current state (game days)
        this.nextTransitionDay = 0;   // Game day when next transition occurs
        
        // Event listeners
        this.listeners = [];
        
        // Particle system
        this.particlePool = [];           // Reusable particle objects
        this.activeParticles = [];        // Currently visible particles
        this.maxParticles = this.config.particles?.maxParticles || 1000;
        this.particleBuffer = null;       // WebGL buffer for particle data
        this.particlesNeedUpdate = false;
        
        // State
        this.initialized = false;
        
        // Initialize particle pool
        this.initParticlePool();
    }
    
    /**
     * Initialize weather system
     * @param {number} currentGameDay - Current game day from TimeManager
     */
    initialize(currentGameDay) {
        if (this.initialized) {
            return;
        }
        
        // Check if weather is enabled
        if (!this.config.enabled) {
            return;
        }
        
        // Set initial state from config
        this.currentState = this.config.initialState || 'sunny';
        this.stateStartDay = currentGameDay;
        
        // Calculate initial rain intensity
        this.rainIntensity = this.calculateRainIntensity();
        
        // Calculate duration for initial state
        this.stateDuration = this.calculateDuration(this.currentState);
        this.nextTransitionDay = this.stateStartDay + this.stateDuration;
        
        this.initialized = true;
    }
    
    /**
     * Update weather based on game time
     * @param {number} currentGameDay - Current game day from TimeManager
     */
    update(currentGameDay) {
        if (!this.initialized || !this.config.enabled) {
            return;
        }
        
        // Check if transition should occur
        if (currentGameDay >= this.nextTransitionDay) {
            this.transitionToNewState(currentGameDay);
        }
    }
    
    /**
     * Transition to a new weather state
     * @param {number} currentGameDay - Current game day
     * @private
     */
    transitionToNewState(currentGameDay) {
        const oldState = this.currentState;
        
        // Choose next state
        const newState = this.chooseNextState(this.currentState);
        
        // Update state
        this.currentState = newState;
        this.stateStartDay = currentGameDay;
        this.stateDuration = this.calculateDuration(newState);
        this.nextTransitionDay = this.stateStartDay + this.stateDuration;
        
        // Calculate new rain intensity
        this.rainIntensity = this.calculateRainIntensity();
        
        // Emit weather change event
        this.emitWeatherChanged(oldState, newState);
    }
    
    /**
     * Manually set weather (for testing/debug)
     * @param {string} newState - New weather state ("sunny", "rainy", "cloudy")
     * @param {number} currentGameDay - Current game day (optional, uses 0 if not provided)
     */
    setWeather(newState, currentGameDay = 0) {
        if (!this.config.enabled) {
            return;
        }
        
        const validStates = ['sunny', 'rainy', 'cloudy'];
        if (!validStates.includes(newState)) {
            console.error(`Invalid weather state: ${newState}`);
            return;
        }
        
        const oldState = this.currentState;
        
        // Change weather immediately
        this.currentState = newState;
        this.stateStartDay = currentGameDay;
        this.stateDuration = this.calculateDuration(newState);
        this.nextTransitionDay = this.stateStartDay + this.stateDuration;
        
        // Calculate new rain intensity
        this.rainIntensity = this.calculateRainIntensity();
        
        // Emit weather change event
        this.emitWeatherChanged(oldState, newState);
    }
    
    /**
     * Get current weather state
     * @returns {string} Current weather state ("sunny", "rainy", "cloudy")
     */
    getCurrentWeather() {
        return this.currentState;
    }
    
    /**
     * Get current rain intensity (0-1)
     * @returns {number} Rain intensity (0 = no rain, 1 = heavy rain)
     */
    getRainIntensity() {
        return this.rainIntensity;
    }
    
    /**
     * Get time until next weather change (game days)
     * @param {number} currentGameDay - Current game day
     * @returns {number} Days until next transition (0 if transition due)
     */
    getTimeUntilTransition(currentGameDay) {
        if (!this.initialized) {
            return 0;
        }
        return Math.max(0, this.nextTransitionDay - currentGameDay);
    }
    
    /**
     * Get current state duration
     * @returns {number} Total duration of current state (game days)
     */
    getStateDuration() {
        return this.stateDuration;
    }
    
    /**
     * Add event listener for weather changes
     * @param {Function} callback - Callback function (receives event object)
     */
    addEventListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }
    
    /**
     * Remove event listener
     * @param {Function} callback - Callback function to remove
     */
    removeEventListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    /**
     * Emit weather change event to all listeners
     * @param {string} oldState - Previous weather state
     * @param {string} newState - New weather state
     * @private
     */
    emitWeatherChanged(oldState, newState) {
        const event = {
            oldState: oldState,
            newState: newState,
            timestamp: Date.now(),
            rainIntensity: this.rainIntensity
        };
        
        // Notify all listeners
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Weather event listener error:', error);
            }
        });
    }
    
    /**
     * Choose next weather state based on current state
     * @param {string} currentState - Current weather state
     * @returns {string} Next weather state
     * @private
     */
    chooseNextState(currentState) {
        // Get valid next states from config
        const stateConfig = this.config.states?.[currentState];
        if (!stateConfig || !stateConfig.nextStates || stateConfig.nextStates.length === 0) {
            return 'sunny';
        }
        
        // Random selection from valid next states
        const nextStates = stateConfig.nextStates;
        const randomIndex = Math.floor(Math.random() * nextStates.length);
        return nextStates[randomIndex];
    }
    
    /**
     * Calculate state duration based on config
     * @param {string} state - Weather state
     * @returns {number} Duration in game days
     * @private
     */
    calculateDuration(state) {
        const stateConfig = this.config.states?.[state];
        if (!stateConfig) {
            return 3;
        }
        
        const minDuration = stateConfig.minDuration || 1;
        const maxDuration = stateConfig.maxDuration || 5;
        
        // Random duration between min and max
        return minDuration + Math.random() * (maxDuration - minDuration);
    }
    
    /**
     * Calculate rain intensity based on current state
     * @returns {number} Rain intensity (0-1)
     * @private
     */
    calculateRainIntensity() {
        if (this.currentState !== 'rainy') {
            return 0;
        }
        
        const stateConfig = this.config.states?.rainy;
        if (!stateConfig) {
            return 0.5;
        }
        
        const minIntensity = stateConfig.rainIntensityMin || 0.3;
        const maxIntensity = stateConfig.rainIntensityMax || 1.0;
        
        // Random intensity between min and max
        return minIntensity + Math.random() * (maxIntensity - minIntensity);
    }
    
    /**
     * Check if weather system is enabled
     * @returns {boolean} True if enabled
     */
    isEnabled() {
        return this.config.enabled === true;
    }
    
    /**
     * Check if weather system is initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Serialize weather state for saving
     * @returns {Object} Serialized weather state
     */
    serialize() {
        return {
            currentState: this.currentState,
            rainIntensity: this.rainIntensity,
            stateStartDay: this.stateStartDay,
            stateDuration: this.stateDuration,
            nextTransitionDay: this.nextTransitionDay,
            initialized: this.initialized
        };
    }
    
    /**
     * Deserialize weather state from saved data
     * @param {Object} data - Saved weather state
     */
    deserialize(data) {
        if (!data) {
            console.warn('[WEATHER] No data to deserialize');
            return;
        }
        
        this.currentState = data.currentState ?? 'sunny';
        this.rainIntensity = data.rainIntensity ?? 0;
        this.stateStartDay = data.stateStartDay ?? 0;
        this.stateDuration = data.stateDuration ?? 3;
        this.nextTransitionDay = data.nextTransitionDay ?? 3;
        this.initialized = data.initialized ?? true;
        
        // Clear particles on load (will rebuild naturally)
        this.activeParticles = [];
        this.particlesNeedUpdate = true;
    }
    
    /**
     * Initialize particle pool for reuse
     * @private
     */
    initParticlePool() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push({
                x: 0,
                y: 0,
                velocityX: 0,      // Horizontal velocity for splashes
                velocityY: 0,      // Vertical velocity (for rain, this is just velocity)
                size: 0,
                alpha: 1.0,
                active: false,
                type: 'rain',      // 'rain' or 'splash'
                lifetime: 0,       // For splash fadeout (seconds)
                maxLifetime: 0.2   // Splash duration (seconds)
            });
        }
    }
    
    /**
     * Update particles based on weather state
     * @param {number} deltaTime - Time since last frame (seconds)
     * @param {Object} cameraManager - Camera manager for visible bounds
     */
    updateParticles(deltaTime, cameraManager) {
        if (!this.initialized || !this.config.enabled) {
            return;
        }
        
        // If not raining, clear active particles
        if (this.currentState !== 'rainy') {
            if (this.activeParticles.length > 0) {
                // Return all particles to pool
                while (this.activeParticles.length > 0) {
                    const particle = this.activeParticles.pop();
                    particle.active = false;
                    this.particlePool.push(particle);
                }
                this.particlesNeedUpdate = true;
            }
            return;
        }
        
        // Spawn new rain particles
        this.spawnParticles(cameraManager);
        
        // Get visible bounds for boundary checks
        const bounds = cameraManager.getVisibleBounds();
        
        // Update existing particles
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            
            if (particle.type === 'rain') {
                // Rain falls downward (and diagonally for isometric)
                particle.x += particle.velocityX * deltaTime; // Apply horizontal velocity
                particle.y += particle.velocityY * deltaTime;
                
                // Check if reached ground level
                if (particle.y > bounds.bottom) {
                    // Spawn splash with configured probability
                    const splashConfig = this.config.splashes || {};
                    const splashEnabled = splashConfig.enabled !== false; // Default to true
                    const spawnProbability = splashConfig.spawnProbability || 0.15;
                    
                    if (splashEnabled && Math.random() < spawnProbability) {
                        this.spawnSplash(particle.x, particle.y);
                    }
                    
                    // Return rain particle to pool
                    particle.active = false;
                    this.activeParticles.splice(i, 1);
                    this.particlePool.push(particle);
                }
            } else if (particle.type === 'splash') {
                // Splash expands horizontally and fades
                particle.x += particle.velocityX * deltaTime;
                particle.y += particle.velocityY * deltaTime;
                particle.lifetime -= deltaTime;
                
                // Fade alpha based on lifetime
                particle.alpha = Math.max(0, particle.lifetime / particle.maxLifetime);
                
                // Remove when lifetime expires
                if (particle.lifetime <= 0) {
                    particle.active = false;
                    this.activeParticles.splice(i, 1);
                    this.particlePool.push(particle);
                }
            }
        }
        
        this.particlesNeedUpdate = this.activeParticles.length > 0 || this.currentState === 'rainy';
    }
    
    /**
     * Spawn particles based on rain intensity and camera bounds
     * @param {Object} cameraManager - Camera manager for visible bounds
     * @private
     */
    spawnParticles(cameraManager) {
        // Calculate target particle count based on intensity
        const targetCount = Math.floor(this.maxParticles * this.rainIntensity);
        const deficit = targetCount - this.activeParticles.length;
        
        if (deficit <= 0) {
            return;
        }
        
        // Spawn rate: spawn more particles per frame to fill screen faster
        // Spawn 10% of deficit or at least 20 particles per frame
        const spawnRate = Math.max(20, Math.floor(deficit * 0.1));
        const spawnCount = Math.min(deficit, spawnRate, this.particlePool.length);
        
        if (spawnCount === 0) {
            return;
        }
        
        // Get visible bounds from camera
        const bounds = cameraManager.getVisibleBounds();
        const spawnHeightOffset = this.config.particles?.spawnHeightOffset || 50;
        const spawnHeight = bounds.top - spawnHeightOffset; // Spawn above visible area
        
        // Get particle config
        const particleConfig = this.config.particles || {};
        const sizeMin = particleConfig.particleSizeMin || 1;
        const sizeMax = particleConfig.particleSizeMax || 3;
        const speedMin = particleConfig.fallSpeedMin || 200;
        const speedMax = particleConfig.fallSpeedMax || 400;
        
        // Check if isometric projection is enabled
        const projection = window.config?.world?.rendering?.projection || 'orthographic';
        const isIsometric = projection === 'isometric';
        
        // Spawn particles
        for (let i = 0; i < spawnCount; i++) {
            const particle = this.particlePool.pop();
            
            // Calculate spawn position
            if (isIsometric) {
                // For isometric: spawn particles more widely to cover diamond-shaped visible area
                // Extend spawn area by ~40% to cover the rotated perspective
                const extraWidth = bounds.width * 0.4;
                particle.x = (bounds.left - extraWidth) + Math.random() * (bounds.width + extraWidth * 2);
                particle.y = spawnHeight + Math.random() * spawnHeightOffset;
            } else {
                // Orthographic: spawn in rectangular area
                particle.x = bounds.left + Math.random() * bounds.width;
                particle.y = spawnHeight + Math.random() * spawnHeightOffset;
            }
            
            // Calculate velocity
            const fallSpeed = speedMin + Math.random() * (speedMax - speedMin);
            if (isIsometric) {
                // Add horizontal drift to simulate isometric perspective
                // Rain appears to fall at ~17 degree angle leftward (matching isometric perspective)
                particle.velocityY = fallSpeed;
                particle.velocityX = -fallSpeed * 0.3; // Leftward drift proportional to fall speed
            } else {
                // Orthographic: no horizontal velocity
                particle.velocityX = 0;
                particle.velocityY = fallSpeed;
            }
            
            particle.size = sizeMin + Math.random() * (sizeMax - sizeMin);
            particle.alpha = 0.7 + Math.random() * 0.3; // Slight alpha variation
            particle.active = true;
            particle.type = 'rain';  // Mark as rain particle
            particle.lifetime = 999;  // Rain doesn't use lifetime
            
            this.activeParticles.push(particle);
        }
    }
    
    /**
     * Spawn splash particles at impact position
     * @param {number} x - World X position of impact
     * @param {number} y - World Y position of impact
     * @private
     */
    spawnSplash(x, y) {
        const splashConfig = this.config.splashes || {};
        const minCount = splashConfig.particleCountMin || 2;
        const maxCount = splashConfig.particleCountMax || 4;
        const splashCount = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
        
        // Check if we have enough particles in pool
        if (this.particlePool.length < splashCount) {
            return; // Not enough particles available
        }
        
        const lifetimeMin = splashConfig.lifetimeMin || 0.1;
        const lifetimeMax = splashConfig.lifetimeMax || 0.3;
        const speedMin = splashConfig.speedMin || 20;
        const speedMax = splashConfig.speedMax || 60;
        
        for (let i = 0; i < splashCount; i++) {
            const splash = this.particlePool.pop();
            
            // Random angle (mostly horizontal, -90° to +90°)
            const angle = (Math.random() - 0.5) * Math.PI;
            const speed = speedMin + Math.random() * (speedMax - speedMin);
            
            splash.x = x;
            splash.y = y;
            splash.velocityX = Math.cos(angle) * speed;
            splash.velocityY = Math.sin(angle) * speed * 0.3; // Less vertical movement
            splash.size = 1 + Math.random() * 2; // Smaller than rain droplets
            splash.alpha = 1.0;
            splash.active = true;
            splash.type = 'splash';
            splash.lifetime = lifetimeMin + Math.random() * (lifetimeMax - lifetimeMin);
            splash.maxLifetime = splash.lifetime;
            
            this.activeParticles.push(splash);
        }
    }
    
    /**
     * Get active particles for rendering
     * @param {string} type - Optional particle type filter ('rain', 'splash', or null for all)
     * @returns {Array} Array of active particle objects
     */
    getActiveParticles(type = null) {
        if (type === null) {
            return this.activeParticles;
        }
        return this.activeParticles.filter(p => p.type === type);
    }
    
    /**
     * Get particle color from config
     * @param {string} type - Particle type ('rain' or 'splash')
     * @returns {Array} RGBA color array [r, g, b, a]
     */
    getParticleColor(type = 'rain') {
        if (type === 'splash') {
            return this.config.splashes?.color || [255, 255, 255, 200]; // White, semi-transparent
        }
        return this.config.particles?.color || [200, 220, 255, 180]; // Blue-ish rain
    }
}
