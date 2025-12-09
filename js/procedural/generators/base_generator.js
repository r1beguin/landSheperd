/**
 * BaseGenerator - Shared base class for all plant sprite generators
 * Provides common functionality for canvas creation, stem generation, and genetic color application
 */
class BaseGenerator {
    /**
     * Create canvas with specified dimensions
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {object} {canvas, ctx} - Canvas element and 2D context
     */
    static createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        return { canvas, ctx };
    }
    
    /**
     * Generate stem with attachment points for leaves
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Stem x position
     * @param {number} y - Stem y position
     * @param {number} width - Stem width
     * @param {number} height - Stem height
     * @param {Array<string>} colors - Stem colors array
     * @param {number} attachmentPointCount - Number of attachment points to generate
     * @returns {object} {x, y, width, height, centerX, attachmentPoints}
     */
    static generateStem(ctx, x, y, width, height, colors, attachmentPointCount = 3) {
        // Draw main stem
        ctx.fillStyle = colors[0];
        ctx.fillRect(x, y, width, height);
        
        // Add texture variation
        if (colors.length > 1) {
            ctx.fillStyle = colors[1];
            ctx.fillRect(x, y + 2, 1, Math.max(1, height - 4));
        }
        
        // Generate attachment points along stem
        const attachmentPoints = [];
        for (let i = 0; i < attachmentPointCount; i++) {
            const pointY = y + (height / (attachmentPointCount + 1)) * (i + 1);
            attachmentPoints.push({
                x: x + width / 2,
                y: pointY,
                side: i % 2 === 0 ? 'right' : 'left'
            });
        }
        
        return {
            x, y, width, height,
            centerX: x + width / 2,
            attachmentPoints
        };
    }
    
    /**
     * Apply genetic modifiers to colors (hue shift)
     * @param {Array<string>} colors - Array of hex colors
     * @param {object} genetics - Genetics object with colorTint property (0-255)
     * @param {number} hueMultiplier - Multiplier for hue shift intensity (default 1.0)
     * @returns {Array<string>} Array of shifted hex colors
     */
    static applyGeneticColors(colors, genetics, hueMultiplier = 1.0) {
        if (!genetics || !genetics.colorTint) return colors;
        
        const hueTint = GeneticsUtils.getHueTint(genetics.colorTint) * hueMultiplier;
        if (hueTint === 0) return colors;
        
        return colors.map(c => ColorUtils.shiftHue(c, hueTint));
    }
    
    /**
     * Get resolution multiplier for LOD level
     * Medium LOD (1.0x) matches current rendering quality baseline
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {number} Resolution multiplier
     */
    static getLODMultiplier(lodLevel) {
        const multipliers = {
            high: 2.0,      // 2x resolution (future implementation)
            medium: 1.0,    // Current quality (BASELINE - no visual change)
            low: 0.5,       // Half resolution (future implementation)
            impostor: 0.2   // Tiny billboard (future implementation)
        };
        return multipliers[lodLevel] || 1.0;
    }
    
    /**
     * Apply LOD multiplier to base dimensions
     * This scales dimensions before genetics are applied
     * @param {object} baseDimensions - Base dimensions {width, height}
     * @param {string} lodLevel - LOD level
     * @returns {object} LOD-adjusted dimensions {width, height}
     */
    static applyLODDimensions(baseDimensions, lodLevel = 'medium') {
        const multiplier = this.getLODMultiplier(lodLevel);
        return {
            width: Math.round(baseDimensions.width * multiplier),
            height: Math.round(baseDimensions.height * multiplier)
        };
    }
    
    /**
     * Generate impostor sprite (flat color billboard)
     * @param {object} speciesConfig - Species configuration
     * @param {string} stage - Growth stage name
     * @returns {HTMLCanvasElement} Tiny colored sprite
     */
    static generateImpostor(speciesConfig, stage) {
        // Create tiny 4x4 canvas
        const { canvas, ctx } = this.createCanvas(4, 4);
        
        // Get average color for this species/stage
        const color = this.getImpostorColor(speciesConfig, stage);
        
        // Fill entire canvas with average color
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 4, 4);
        
        console.log(`Generated impostor sprite for ${speciesConfig.name} ${stage}`);
        
        return canvas;
    }
    
    /**
     * Get average color for impostor sprite
     * @param {object} speciesConfig - Species configuration
     * @param {string} stage - Growth stage name
     * @returns {string} Hex color
     */
    static getImpostorColor(speciesConfig, stage) {
        const colors = speciesConfig.appearance.colorPalette;
        
        // Choose dominant color based on category and stage
        if (speciesConfig.category === 'tree') {
            // Trees: Use leaf color (dominant visual)
            const leafColors = colors.leaf || colors.sapling || [];
            return leafColors[0] || '#4a7c3c';
        } else if (speciesConfig.category === 'herb') {
            // Herbs: Use leaf color
            const leafColors = colors.leaf || [];
            return leafColors[0] || '#4a7c59';
        } else if (speciesConfig.category === 'groundcover') {
            // Groundcover: Use leaf color
            const leafColors = colors.leaf || [];
            return leafColors[0] || '#4a7c2e';
        }
        
        // Fallback: green
        return '#4a7c3c';
    }
}

// Make available globally
window.BaseGenerator = BaseGenerator;
