/**
 * OcclusionManager - Optimizes rendering by culling plants hidden behind larger plants (trees)
 * 
 * Key Features:
 * - Fast occlusion tests using bounding volumes in isometric space
 * - Trees (top layer) can occlude middle/bottom layer plants
 * - Cache-friendly design with minimal overhead per frame
 * - Configurable occlusion parameters for different plant types
 * 
 * Performance Considerations:
 * - O(n*m) worst case where n=occluders, m=plants, but early rejection and spatial coherence
 *   make typical case much faster
 * - Uses simple AABB overlap tests (very fast, ~10 ops per test)
 * - Only tests plants in visible bounds (view frustum culling already applied)
 * - Caches occluder list per frame (rebuild only when trees change)
 */

class OcclusionManager {
    constructor(config = null) {
        this.config = config;
        
        // Cache of potential occluders (trees) for current frame
        this.occluders = [];
        this.occluderCacheDirty = true;
        
        // Character position for see-through integration
        this.characterPosition = { x: 0, y: 0 };
        
        // Statistics for debugging
        this.stats = {
            plantsTestedThisFrame: 0,
            plantsOccludedThisFrame: 0,
            plantsRevealedBySeeThrough: 0,
            occluderCount: 0,
            lastUpdateTime: 0
        };
        
        // Configuration
        this.enabled = this.getConfigValue('world.plants.occlusion.enabled', true);
        this.minTreeStageForOcclusion = this.getConfigValue('world.plants.occlusion.minTreeStage', 'YoungTree');
        this.occlusionPadding = this.getConfigValue('world.plants.occlusion.padding', 5);
    }
    
    /**
     * Get configuration value with fallback
     * @param {string} path - Dot-separated config path
     * @param {*} defaultValue - Fallback value
     * @returns {*} Config value or default
     */
    getConfigValue(path, defaultValue) {
        if (!this.config) return defaultValue;
        
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    /**
     * Set config reference (called after config is loaded)
     * @param {Object} config - Game configuration object
     */
    setConfig(config) {
        this.config = config;
        this.enabled = this.getConfigValue('world.plants.occlusion.enabled', true);
        this.minTreeStageForOcclusion = this.getConfigValue('world.plants.occlusion.minTreeStage', 'YoungTree');
        this.occlusionPadding = this.getConfigValue('world.plants.occlusion.padding', 5);
    }
    
    /**
     * Update character position for see-through integration
     * Called from render loop to keep character position in sync
     * @param {Object} position - Character position {x, y}
     */
    setCharacterPosition(position) {
        this.characterPosition = position;
    }
    
    /**
     * Check if a tree is within the character's see-through radius
     * @param {Object} treeRenderData - Tree render data with x, y position
     * @returns {boolean} True if tree is transparent (see-through active)
     */
    isTreeTransparent(treeRenderData) {
        // Get transparency config
        const config = this.config?.world?.character?.transparencyCircle;
        if (!config || !config.enabled) {
            return false;
        }
        
        const radius = config.radius || 60;
        const dx = treeRenderData.x - this.characterPosition.x;
        const dy = treeRenderData.y - this.characterPosition.y;
        const distSquared = dx * dx + dy * dy;
        
        // Use squared distance to avoid sqrt (performance optimization)
        return distSquared < (radius * radius);
    }
    
    /**
     * Invalidate occluder cache (call when trees are added/removed/grown)
     */
    invalidateCache() {
        this.occluderCacheDirty = true;
    }
    
    /**
     * Build occluder list from visible plants
     * Only includes trees large enough to occlude (YoungTree, MatureTree)
     * @param {Array<Plant>} plants - All visible plants
     */
    buildOccluderCache(plants) {
        this.occluders = [];
        
        for (const plant of plants) {
            // Only trees in top layer can occlude
            const layer = plant.getLayer ? plant.getLayer() : 'middle';
            if (layer !== 'top') continue;
            
            // Check if tree is large enough to occlude (skip saplings)
            const stage = plant.stage;
            if (stage === 'Sapling' || stage === 'Seedling') continue;
            
            // Get render data for bounding box calculation
            const renderData = plant.getRenderData();
            if (!renderData) continue;
            
            // Calculate AABB in render space (isometric or orthographic)
            const bounds = this.calculatePlantBounds(renderData);
            
            // Store occluder with bounds
            this.occluders.push({
                plant: plant,
                bounds: bounds,
                stage: stage
            });
        }
        
        this.occluderCacheDirty = false;
        this.stats.occluderCount = this.occluders.length;
    }
    
    /**
     * Calculate axis-aligned bounding box for a plant in render space
     * @param {Object} renderData - Plant render data {x, y, width, height}
     * @returns {Object} AABB {minX, minY, maxX, maxY}
     */
    calculatePlantBounds(renderData) {
        // In isometric rendering, plants are rendered from their center-bottom point
        // Width and height define sprite dimensions
        const x = renderData.x;
        const y = renderData.y;
        const width = renderData.width;
        const height = renderData.height;
        
        // Expand bounds slightly to account for foliage overlap
        const padding = this.occlusionPadding;
        
        return {
            minX: x - width / 2 - padding,
            minY: y - height - padding,
            maxX: x + width / 2 + padding,
            maxY: y + padding
        };
    }
    
    /**
     * Test if a plant is occluded by any tree
     * @param {Plant} plant - Plant to test
     * @returns {boolean} True if plant is occluded and should NOT be rendered
     */
    isPlantOccluded(plant) {
        if (!this.enabled) return false;
        
        // Only test occlusion for bottom and middle layers
        const layer = plant.getLayer ? plant.getLayer() : 'middle';
        if (layer === 'top') return false; // Trees don't occlude each other
        
        // Get plant bounds
        const renderData = plant.getRenderData();
        if (!renderData) return false;
        
        const plantBounds = this.calculatePlantBounds(renderData);
        
        this.stats.plantsTestedThisFrame++;
        
        // Test against all occluders
        for (const occluder of this.occluders) {
            if (this.boundsOverlap(plantBounds, occluder.bounds)) {
                // Check if occluder is actually in front (deeper Y in isometric space)
                // In isometric, higher Y coordinate means further back
                // Only occlude if tree is behind the plant (tree.y >= plant.y)
                const treeRenderData = occluder.plant.getRenderData();
                if (treeRenderData.y >= renderData.y - 5) { // Small tolerance for edge cases
                    
                    // PRIORITY CHECK: See-through visibility > occlusion culling
                    // If tree is transparent (character nearby), don't occlude
                    if (this.isTreeTransparent(treeRenderData)) {
                        this.stats.plantsRevealedBySeeThrough++;
                        continue; // Skip this occluder, check next one
                    }
                    
                    // Check occlusion coverage percentage
                    const coverage = this.calculateOcclusionCoverage(plantBounds, occluder.bounds);
                    
                    // If tree covers more than 60% of plant, consider it occluded
                    if (coverage > 0.6) {
                        this.stats.plantsOccludedThisFrame++;
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Test if two AABBs overlap
     * @param {Object} a - First AABB {minX, minY, maxX, maxY}
     * @param {Object} b - Second AABB {minX, minY, maxX, maxY}
     * @returns {boolean} True if boxes overlap
     */
    boundsOverlap(a, b) {
        return !(a.maxX < b.minX || 
                 a.minX > b.maxX || 
                 a.maxY < b.minY || 
                 a.minY > b.maxY);
    }
    
    /**
     * Calculate what percentage of plant A is covered by plant B
     * @param {Object} plantBounds - Plant AABB
     * @param {Object} occluderBounds - Occluder AABB
     * @returns {number} Coverage ratio (0.0 to 1.0)
     */
    calculateOcclusionCoverage(plantBounds, occluderBounds) {
        // Calculate intersection rectangle
        const intersectMinX = Math.max(plantBounds.minX, occluderBounds.minX);
        const intersectMinY = Math.max(plantBounds.minY, occluderBounds.minY);
        const intersectMaxX = Math.min(plantBounds.maxX, occluderBounds.maxX);
        const intersectMaxY = Math.min(plantBounds.maxY, occluderBounds.maxY);
        
        // Check if there's actual overlap
        if (intersectMaxX <= intersectMinX || intersectMaxY <= intersectMinY) {
            return 0.0;
        }
        
        // Calculate areas
        const intersectArea = (intersectMaxX - intersectMinX) * (intersectMaxY - intersectMinY);
        const plantArea = (plantBounds.maxX - plantBounds.minX) * (plantBounds.maxY - plantBounds.minY);
        
        if (plantArea <= 0) return 0.0;
        
        return intersectArea / plantArea;
    }
    
    /**
     * Filter visible plants to remove occluded ones
     * This is the main entry point called from the render loop
     * @param {Array<Plant>} visiblePlants - All plants in view frustum
     * @returns {Array<Plant>} Filtered plants (non-occluded)
     */
    cullOccludedPlants(visiblePlants) {
        if (!this.enabled || visiblePlants.length === 0) {
            return visiblePlants;
        }
        
        const startTime = performance.now();
        
        // Reset stats
        this.stats.plantsTestedThisFrame = 0;
        this.stats.plantsOccludedThisFrame = 0;
        this.stats.plantsRevealedBySeeThrough = 0;
        
        // Rebuild occluder cache if needed
        if (this.occluderCacheDirty) {
            this.buildOccluderCache(visiblePlants);
        }
        
        // If no occluders, return all plants
        if (this.occluders.length === 0) {
            return visiblePlants;
        }
        
        // Filter out occluded plants
        const nonOccludedPlants = visiblePlants.filter(plant => !this.isPlantOccluded(plant));
        
        this.stats.lastUpdateTime = performance.now() - startTime;
        
        return nonOccludedPlants;
    }
    
    /**
     * Get statistics for debugging
     * @returns {Object} Stats object
     */
    getStats() {
        return {
            enabled: this.enabled,
            occluderCount: this.stats.occluderCount,
            plantsTestedThisFrame: this.stats.plantsTestedThisFrame,
            plantsOccludedThisFrame: this.stats.plantsOccludedThisFrame,
            plantsRevealedBySeeThrough: this.stats.plantsRevealedBySeeThrough,
            cullPercentage: this.stats.plantsTestedThisFrame > 0 
                ? (this.stats.plantsOccludedThisFrame / this.stats.plantsTestedThisFrame * 100).toFixed(1) + '%'
                : '0%',
            updateTimeMs: this.stats.lastUpdateTime.toFixed(2)
        };
    }
    
    /**
     * Enable/disable occlusion culling at runtime
     * @param {boolean} enabled - Enable state
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`OcclusionManager ${enabled ? 'enabled' : 'disabled'}`);
    }
}
