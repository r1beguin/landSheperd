/**
 * PlantGenerator - Coordinates plant sprite generation via species-specific generators
 * Registry pattern that routes generation requests to appropriate specialized generators
 */
class PlantGenerator {
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
        cloverFloweringGeneration: 'generateFlowering'
    };
    
    /**
     * Generate plant sprite for specified species and growth stage
     * @param {object} speciesConfig - Species configuration from JSON
     * @param {string} stage - Growth stage name (e.g., 'Seedling', 'Sapling')
     * @param {object} genetics - Optional genetics object for genetic diversity
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generatePlantSprite(speciesConfig, stage = 'Seedling', genetics = null) {
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
        
        // Route to appropriate generator with genetics if applicable
        return generator[methodName](speciesConfig, genetics);
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
