/**
 * LODManager - Level of Detail management system
 * 
 * Manages LOD level assignment based on camera zoom and caches LOD-specific geometry.
 * Optimizes rendering performance by adjusting detail level based on camera distance.
 * 
 * Features:
 * - Dynamic LOD level calculation based on zoom thresholds
 * - Hysteresis to prevent rapid LOD switching (thrashing)
 * - LOD distribution tracking for debugging
 * - Resolution multiplier management for sprite generation
 */

class LODManager {
    /**
     * Create a new LODManager
     * @param {Object} config - LOD configuration from config.json
     * @param {CameraManager} cameraManager - Reference to camera manager for zoom access
     * @param {GeometryManager} geometryManager - Reference to geometry manager for caching
     */
    constructor(config, cameraManager, geometryManager) {
        this.config = config;
        this.cameraManager = cameraManager;
        this.geometryManager = geometryManager;
        
        // Cache structures
        this.entityLODs = new Map(); // Map<entity, {currentLOD: string, lastUpdate: number}>
        this.lodGeometryCache = new Map(); // Map<cacheKey, geometry>
        
        // LOD distribution tracking for debug overlay
        this.lodCounts = {
            high: 0,
            medium: 0,
            low: 0,
            impostor: 0
        };
        
        // Extract thresholds from config
        this.thresholds = {
            high: config.highThreshold,
            medium: config.mediumThreshold,
            low: config.lowThreshold
        };
        
        // Hysteresis buffer to prevent rapid switching
        this.hysteresis = config.transitionHysteresis;
        
        // Resolution multipliers for sprite generation
        this.resolutionMultipliers = config.resolutionMultipliers;
    }
    
    /**
     * Calculate LOD level for entity based on camera zoom
     * @param {Object} entity - Plant entity to evaluate
     * @returns {string} LOD level ('high', 'medium', 'low', 'impostor')
     */
    calculateLODLevel(entity) {
        const zoom = this.cameraManager.zoom;
        
        // Get current LOD state if exists
        const entityState = this.entityLODs.get(entity);
        const currentLOD = entityState ? entityState.currentLOD : entity.currentLOD; // Fall back to entity's property
        
        // Apply hysteresis - use different thresholds when switching up vs down
        // This creates a "buffer zone" that prevents rapid switching at threshold boundaries
        let newLOD;
        
        // Debug logging (can be enabled via config)
        const debug = this.config.debugOverlay && this.config.debugOverlay.showTransitions;
        
        if (zoom >= this.thresholds.high) {
            newLOD = 'high';
        } else if (zoom >= this.thresholds.medium) {
            // Apply hysteresis when at medium/high boundary
            if (currentLOD === 'high' && zoom >= this.thresholds.high * (1 - this.hysteresis)) {
                newLOD = 'high'; // Stay high if within hysteresis buffer
            } else {
                newLOD = 'medium';
            }
        } else if (zoom >= this.thresholds.low) {
            // Apply hysteresis when at low/medium boundary
            if (currentLOD === 'medium' && zoom >= this.thresholds.medium * (1 - this.hysteresis)) {
                newLOD = 'medium'; // Stay medium if within hysteresis buffer
            } else {
                newLOD = 'low';
            }
        } else {
            // Below low threshold - impostor or stay low with hysteresis
            if (currentLOD === 'low' && zoom >= this.thresholds.low * (1 - this.hysteresis)) {
                newLOD = 'low'; // Stay low if within hysteresis buffer
            } else {
                newLOD = 'impostor';
            }
        }
        
        if (debug && newLOD !== currentLOD) {
            console.log(`LOD calc: zoom=${zoom.toFixed(2)}, current=${currentLOD}, new=${newLOD}`);
        }
        
        return newLOD;
    }
    
    /**
     * Batch assign LOD levels to all entities
     * @param {Array} entities - Array of entities to process
     */
    updateLODLevels(entities) {
        // Reset LOD counts
        this.lodCounts.high = 0;
        this.lodCounts.medium = 0;
        this.lodCounts.low = 0;
        this.lodCounts.impostor = 0;
        
        // Process each entity
        for (const entity of entities) {
            const lodLevel = this.calculateLODLevel(entity);
            
            // Set entity LOD property
            entity.currentLOD = lodLevel;
            
            // Update entity state cache
            this.entityLODs.set(entity, {
                currentLOD: lodLevel,
                lastUpdate: Date.now()
            });
            
            // Increment count for this LOD level
            this.lodCounts[lodLevel]++;
        }
    }
    
    /**
     * Get current LOD distribution for debug overlay
     * @returns {Object} LOD counts {high, medium, low, impostor}
     */
    getLODDistribution() {
        return { ...this.lodCounts };
    }
    
    /**
     * Get LOD resolution multiplier for sprite generation
     * @param {string} lodLevel - LOD level ('high', 'medium', 'low', 'impostor')
     * @returns {number} Resolution multiplier
     */
    getResolutionMultiplier(lodLevel) {
        return this.resolutionMultipliers[lodLevel] || 1.0;
    }
    
    /**
     * Clear LOD cache (for testing/resets)
     */
    clearCache() {
        this.lodGeometryCache.clear();
        this.entityLODs.clear();
        
        // Reset counts
        this.lodCounts.high = 0;
        this.lodCounts.medium = 0;
        this.lodCounts.low = 0;
        this.lodCounts.impostor = 0;
    }
    
    /**
     * Check if LOD system is enabled
     * @returns {boolean} True if enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
    
    /**
     * Get debug overlay state
     * @returns {Object} Debug overlay configuration
     */
    getDebugOverlayConfig() {
        return this.config.debugOverlay;
    }
}
