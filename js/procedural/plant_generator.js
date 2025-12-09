/**
 * PlantGenerator - Coordinates plant sprite generation via species-specific generators
 * Registry pattern that routes generation requests to appropriate specialized generators
 * 
 * Includes canvas-level sprite caching (Milestone 6) to prevent redundant generation:
 * - Cache key: species + stage + genetics hash + LOD level
 * - Cache stores HTMLCanvasElement sprites for reuse
 * - Clears cache when species definitions change
 */
class PlantGenerator {
    // Sprite cache for generated canvases (Milestone 6)
    static spriteCache = new Map();
    static cacheHits = 0;
    static cacheMisses = 0;
    
    // Generator registry by category
    static generators = {
        herb: HerbGenerator,
        tree: TreeGenerator,
        groundcover: GroundcoverGenerator
    };
    
    // Map growth stage generator names to generator methods
    static stageMethodMap = {
        seedlingGeneration: 'generateSeedling',
        vegetativeGeneration: 'generateVegetative',
        floweringGeneration: 'generateFlowering',
        witheredGeneration: 'generateWithered',
        saplingGeneration: 'generateSapling',
        youngTreeGeneration: 'generateYoungTree',
        matureTreeGeneration: 'generateMatureTree',
        cloverSproutGeneration: 'generateSprout',
        cloverSpreadingGeneration: 'generateSpreading',
        cloverFloweringGeneration: 'generateFlowering',
        cloverWitheredGeneration: 'generateWithered'
    };
    
    /**
     * Generate plant sprite for specified species and growth stage
     * @param {object} speciesConfig - Species configuration from JSON
     * @param {string} stage - Growth stage name (e.g., 'Seedling', 'Sapling')
     * @param {object} genetics - Optional genetics object for genetic diversity
     * @param {string} lodLevel - LOD level ('high', 'medium', 'low', 'impostor') - Milestone 4
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generatePlantSprite(speciesConfig, stage = 'Seedling', genetics = null, lodLevel = 'medium') {
        // Milestone 6: Check sprite cache first
        const cacheKey = this._getCacheKey(speciesConfig, stage, genetics, lodLevel);
        if (this.spriteCache.has(cacheKey)) {
            this.cacheHits++;
            return this.spriteCache.get(cacheKey);
        }
        this.cacheMisses++;
        
        // Find the growth stage configuration
        const growthStage = speciesConfig.growthStages.find(gs => gs.name === stage);
        
        if (!growthStage) {
            console.warn(`Growth stage ${stage} not found for ${speciesConfig.name}, using fallback`);
            return this._generateFallbackSprite(speciesConfig);
        }
        
        // Get generator method name from growth stage
        const generatorName = growthStage.generator;
        const methodName = this.stageMethodMap[generatorName];
        
        if (!methodName) {
            console.warn(`Unknown generator ${generatorName} for ${speciesConfig.name}, using fallback`);
            return this._generateFallbackSprite(speciesConfig);
        }
        
        // Determine species category (herb, tree, groundcover)
        const category = speciesConfig.category || this._inferCategory(speciesConfig);
        const generator = this.generators[category];
        
        if (!generator) {
            console.warn(`No generator for category ${category} (${speciesConfig.name}), using fallback`);
            return this._generateFallbackSprite(speciesConfig);
        }
        
        // Validate generator has the required method
        if (typeof generator[methodName] !== 'function') {
            console.warn(`Generator ${category} missing method ${methodName} for ${speciesConfig.name}, using fallback`);
            return this._generateFallbackSprite(speciesConfig);
        }
        
        // Route to appropriate generator with genetics and LOD level
        // NOTE: Individual generators need to be updated to accept lodLevel parameter (Milestone 4+)
        // For now, pass it as optional 3rd/4th parameter - generators will ignore if not implemented
        const sprite = generator[methodName](speciesConfig, genetics, lodLevel);
        
        // Milestone 6: Cache the generated sprite
        this.spriteCache.set(cacheKey, sprite);
        
        return sprite;
    }
    
    /**
     * Generate cache key for sprite caching (Milestone 6)
     * @param {object} speciesConfig - Species configuration
     * @param {string} stage - Growth stage name
     * @param {object} genetics - Optional genetics object
     * @param {string} lodLevel - LOD level
     * @returns {string} Unique cache key
     * @private
     */
    static _getCacheKey(speciesConfig, stage, genetics, lodLevel) {
        const speciesId = speciesConfig.id || speciesConfig.name;
        const geneticsHash = genetics ? this._hashGenetics(genetics) : 'none';
        return `${speciesId}_${stage}_${geneticsHash}_${lodLevel}`;
    }
    
    /**
     * Generate hash from genetics object for cache key
     * @param {object} genetics - Genetics object with numeric factors
     * @returns {string} Short hash representing genetics
     * @private
     */
    static _hashGenetics(genetics) {
        if (!genetics) return 'none';
        
        // Round to 2 decimal places and concatenate
        const w = Math.round(genetics.widthFactor * 100);
        const h = Math.round(genetics.heightFactor * 100);
        const f = Math.round(genetics.foliageDensity * 100);
        const c = Math.round(genetics.colorTint * 100);
        
        return `w${w}h${h}f${f}c${c}`;
    }
    
    /**
     * Clear sprite cache (useful when reloading species definitions)
     */
    static clearCache() {
        this.spriteCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        console.log('[PlantGenerator] Sprite cache cleared');
    }
    
    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    static getCacheStats() {
        const total = this.cacheHits + this.cacheMisses;
        const hitRate = total > 0 ? (this.cacheHits / total * 100).toFixed(1) : 0;
        return {
            size: this.spriteCache.size,
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate: hitRate + '%'
        };
    }
    
    /**
     * Infer species category from growth stages if not explicitly set
     * @param {object} speciesConfig - Species configuration
     * @returns {string} Category: 'herb', 'tree', or 'groundcover'
     * @private
     */
    static _inferCategory(speciesConfig) {
        // Check for tree-specific stages
        const hasTreeStages = speciesConfig.growthStages.some(gs => 
            gs.name === 'Sapling' || gs.name === 'MatureTree' || gs.name === 'YoungTree'
        );
        if (hasTreeStages) return 'tree';
        
        // Check for groundcover-specific stages
        const hasGroundcoverStages = speciesConfig.growthStages.some(gs =>
            gs.generator?.includes('clover') || gs.generator?.includes('grass') ||
            gs.name === 'Sprout' || gs.name === 'Spreading'
        );
        if (hasGroundcoverStages) return 'groundcover';
        
        // Default to herb (most common)
        return 'herb';
    }
    
    /**
     * Generate fallback sprite when generation fails
     * @param {object} speciesConfig - Species configuration
     * @returns {HTMLCanvasElement} Simple fallback sprite
     * @private
     */
    static _generateFallbackSprite(speciesConfig) {
        const { canvas, ctx } = BaseGenerator.createCanvas(20, 20);
        const colors = speciesConfig.appearance?.colorPalette || {};
        ctx.fillStyle = (colors.leaf && colors.leaf[0]) || '#4a7c3c';
        ctx.fillRect(8, 8, 4, 12);
        return canvas;
    }
    
    // ===== LEGACY COMPATIBILITY METHODS =====
    // Keep old method names for backward compatibility during transition
    
    static generateSeedlingSprite(speciesConfig) {
        return HerbGenerator.generateSeedling(speciesConfig);
    }
    
    static generateVegetativeSprite(speciesConfig) {
        return HerbGenerator.generateVegetative(speciesConfig);
    }
    
    static generateFloweringSprite(speciesConfig) {
        return HerbGenerator.generateFlowering(speciesConfig);
    }
    
    static generateWitheredSprite(speciesConfig) {
        return HerbGenerator.generateWithered(speciesConfig);
    }
    
    static generateSaplingSprite(speciesConfig, genetics = null) {
        return TreeGenerator.generateSapling(speciesConfig, genetics);
    }
    
    static generateYoungTreeSprite(speciesConfig, genetics = null) {
        return TreeGenerator.generateYoungTree(speciesConfig, genetics);
    }
    
    static generateMatureTreeSprite(speciesConfig, genetics = null) {
        return TreeGenerator.generateMatureTree(speciesConfig, genetics);
    }
    
    static generateOakWitheredSprite(speciesConfig) {
        return TreeGenerator.generateWithered(speciesConfig);
    }
    
    static generateCloverSproutSprite(speciesConfig) {
        return GroundcoverGenerator.generateSprout(speciesConfig);
    }
    
    static generateCloverSpreadingSprite(speciesConfig) {
        return GroundcoverGenerator.generateSpreading(speciesConfig);
    }
    
    static generateCloverFloweringSprite(speciesConfig) {
        return GroundcoverGenerator.generateFlowering(speciesConfig);
    }
    
    // Legacy compatibility: keep shiftHue for any external references
    static shiftHue(hexColor, hueDegrees) {
        return ColorUtils.shiftHue(hexColor, hueDegrees);
    }
}

// Make available globally
window.PlantGenerator = PlantGenerator;
